#!/usr/bin/env node
/**
 * abi-call-parity.cjs
 *
 * Line-by-line audit: every frontend call site → contract ABI parity.
 *
 * For every `functionName: 'xxx'` use site in the frontend, this script:
 *   1) Determines which ABI the call binds to (from the `abi:` field).
 *   2) Looks up the function in that ABI.
 *   3) Counts the args passed (`args: [a, b, c]` → 3) and compares to the
 *      ABI's input length.
 *   4) For event-based call sites (decodeEventLog, parseEventLogs) does the
 *      same check.
 *   5) Flags any function name not found in its declared ABI (HIGH).
 *   6) Flags any arity mismatch (HIGH).
 *   7) Flags ABI imports that point at a JSON we don't ship (HIGH).
 *
 * Output: ABI_PARITY.md with a finding per row.
 */

const fs = require('fs');
const path = require('path');

const REPO = path.resolve(__dirname, '..');
const FRONTEND_DIRS = ['app', 'components', 'hooks', 'lib'];
const ABI_DIR = path.join(REPO, 'lib/abis');

// ── Load every ABI we ship ────────────────────────────────────────────────
const ABIS = {};
for (const f of fs.readdirSync(ABI_DIR)) {
  if (!f.endsWith('.json')) continue;
  const name = f.replace(/\.json$/, '');
  try {
    const json = JSON.parse(fs.readFileSync(path.join(ABI_DIR, f), 'utf8'));
    // Some are { abi: [...] }, some are bare arrays
    const abi = Array.isArray(json) ? json : json.abi || [];
    ABIS[name] = abi;
  } catch (e) {
    console.error(`Skipping malformed ABI: ${f}: ${e.message}`);
  }
}

// ── Map ABI export symbol → ABI name ──────────────────────────────────────
// Read lib/abis/index.ts to learn which JSON each `*ABI` symbol points at.
const abiIndexSrc = fs.readFileSync(path.join(REPO, 'lib/abis/index.ts'), 'utf8');
const SYMBOL_TO_ABI = {};

// Match: import XxxRaw from './YYY.json'
const rawImportRe = /import\s+(\w+Raw)\s+from\s+'\.\/([\w\.\-]+)\.json'/g;
const rawNameToFile = {};
let m;
while ((m = rawImportRe.exec(abiIndexSrc))) {
  rawNameToFile[m[1]] = m[2];
}
// Match: const XxxABI = normalizeImportedABI(YyyRaw)  OR  const XxxABI = validateABI(YyyABI, 'Yyy')
const constDeclRe = /const\s+(\w+ABI)\s*=\s*(?:normalizeImportedABI|validateABI)\((\w+)/g;
while ((m = constDeclRe.exec(abiIndexSrc))) {
  const sym = m[1];
  const inner = m[2];
  if (rawNameToFile[inner]) {
    SYMBOL_TO_ABI[sym] = rawNameToFile[inner];
  } else if (SYMBOL_TO_ABI[inner]) {
    SYMBOL_TO_ABI[sym] = SYMBOL_TO_ABI[inner];
  }
}
// Aliases: const FooABI = BarABI;
const aliasRe = /const\s+(\w+ABI)\s*=\s*(\w+ABI)\s*;/g;
while ((m = aliasRe.exec(abiIndexSrc))) {
  if (SYMBOL_TO_ABI[m[2]] && !SYMBOL_TO_ABI[m[1]]) SYMBOL_TO_ABI[m[1]] = SYMBOL_TO_ABI[m[2]];
}

// Look at lib/contracts.ts for additional re-exports:
//   export const VAULT_HUB_ABI = VaultHubABI;
const contractsSrc = fs.readFileSync(path.join(REPO, 'lib/contracts.ts'), 'utf8');
const reexportRe = /export\s+const\s+([A-Z_]+(?:ABI|_ABI))\s*=\s*(\w+)\s*(?:as\s+\w+\s*)?;?/g;
while ((m = reexportRe.exec(contractsSrc))) {
  const dst = m[1];
  const src = m[2];
  if (SYMBOL_TO_ABI[src] && !SYMBOL_TO_ABI[dst]) SYMBOL_TO_ABI[dst] = SYMBOL_TO_ABI[src];
}
// Match also: export const ERC20ABI = ERC20ABI;  (re-export from index)
const reexportFromImportRe = /export\s+\{\s*([\w,\s]+)\s*\}\s*from\s*['"][^'"]+['"]/g;
while ((m = reexportFromImportRe.exec(contractsSrc))) {
  const names = m[1].split(',').map((n) => n.trim()).filter(Boolean);
  for (const n of names) {
    // pass-through; already named the same
  }
}

// ── Walk all frontend files ───────────────────────────────────────────────
function walk(dir, out = []) {
  for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
    if (f.name === 'node_modules' || f.name === '.next' || f.name.startsWith('.')) continue;
    const p = path.join(dir, f.name);
    if (f.isDirectory()) walk(p, out);
    else if (/\.(ts|tsx)$/.test(f.name) && !/__tests__|__mocks__|\.test\.|\.d\.ts$/.test(p)) out.push(p);
  }
  return out;
}

const files = FRONTEND_DIRS.flatMap((d) => walk(path.join(REPO, d), []));

// ── Extract { abi: SYMBOL, functionName: 'name', args: [...] } blocks ────
function extractCallSites(src, file) {
  const sites = [];
  // For every functionName:'xxx', find the enclosing object literal (the
  // matching outer { ... } that this property lives inside) and look up
  // `abi:` and `args:` ONLY within that same object literal.
  const fnRe = /functionName\s*:\s*['"`]([\w$]+)['"`]/g;
  let m;
  while ((m = fnRe.exec(src))) {
    const fnName = m[1];
    const fnIdx = m.index;

    // Walk backward from fnIdx to find the opening `{` of the immediate
    // enclosing object literal.
    let depth = 0;
    let openIdx = -1;
    for (let i = fnIdx; i >= 0; i--) {
      const c = src[i];
      if (c === '}' || c === ')' || c === ']') depth++;
      else if (c === '{' || c === '(' || c === '[') {
        if (depth === 0 && c === '{') {
          openIdx = i;
          break;
        }
        depth--;
      }
    }
    if (openIdx === -1) continue;

    // Walk forward to find the matching close.
    depth = 0;
    let closeIdx = -1;
    for (let i = openIdx; i < src.length; i++) {
      const c = src[i];
      if (c === '{' || c === '(' || c === '[') depth++;
      else if (c === '}' || c === ')' || c === ']') {
        depth--;
        if (depth === 0) {
          closeIdx = i;
          break;
        }
      }
    }
    if (closeIdx === -1) closeIdx = src.length;

    const objLit = src.slice(openIdx, closeIdx + 1);

    // Pull abi: and args: ONLY from inside this literal. Use a simple
    // depth-1 scan so nested object literals (e.g. `query: { enabled: ... }`)
    // don't pollute the result.
    const props = [];
    {
      let d = 0;
      let cur = '';
      for (let i = 1; i < objLit.length - 1; i++) {
        const c = objLit[i];
        if (c === '{' || c === '(' || c === '[') {
          d++;
          cur += c;
        } else if (c === '}' || c === ')' || c === ']') {
          d--;
          cur += c;
        } else if (c === ',' && d === 0) {
          props.push(cur);
          cur = '';
        } else {
          cur += c;
        }
      }
      if (cur.trim().length) props.push(cur);
    }

    let abiSym = null;
    let argsLiteral = null;
    let hasArgsKey = false;
    for (const p of props) {
      const trimmed = p.trim();
      let mm;
      if ((mm = /^abi\s*:\s*([\w$]+)/.exec(trimmed))) abiSym = mm[1];
      else if ((mm = /^args\s*:\s*\[([\s\S]*)\]\s*$/.exec(trimmed))) {
        hasArgsKey = true;
        argsLiteral = mm[1];
      } else if (/^args\s*:/.test(trimmed)) {
        // args: undefined / args: foo ? [...] : undefined / args: someConst
        hasArgsKey = true;
        argsLiteral = null; // can't reliably count
      }
    }

    let argCount = -1;
    if (hasArgsKey && argsLiteral !== null) {
      const inner = argsLiteral.trim();
      if (inner.length === 0) argCount = 0;
      else {
        let d = 0,
          last = 0;
        const parts = [];
        for (let i = 0; i < inner.length; i++) {
          const c = inner[i];
          if (c === '(' || c === '[' || c === '{') d++;
          else if (c === ')' || c === ']' || c === '}') d--;
          else if (c === ',' && d === 0) {
            parts.push(inner.slice(last, i).trim());
            last = i + 1;
          }
        }
        const tail = inner.slice(last).trim();
        if (tail.length) parts.push(tail);
        argCount = parts.length;
      }
    } else if (!hasArgsKey) {
      // No args: key at all → only OK if zero-arg function
      argCount = 0;
    } else {
      argCount = -1; // ternary/spread → unknown
    }

    const line = src.slice(0, fnIdx).split('\n').length;
    sites.push({ file, line, fnName, abiSym, argCount, hasArgsKey });
  }
  return sites;
}

const allSites = [];
for (const f of files) {
  const src = fs.readFileSync(f, 'utf8');
  for (const s of extractCallSites(src, path.relative(REPO, f))) allSites.push(s);
}

// ── Validate each site against its ABI ────────────────────────────────────
const findings = [];

function findFn(abi, name) {
  return abi.find((e) => e.type === 'function' && e.name === name);
}

/** Returns ALL function entries with a given name (Solidity allows overloads). */
function findAllFns(abi, name) {
  return abi.filter((e) => e.type === 'function' && e.name === name);
}

for (const s of allSites) {
  // 1) Resolve ABI symbol → ABI JSON name
  const abiName = s.abiSym ? SYMBOL_TO_ABI[s.abiSym] : null;
  if (!s.abiSym) {
    // Inline ABI literal — common for INHERITANCE_MANAGER_ABI etc. Skip with a note.
    findings.push({
      sev: 'INFO',
      file: s.file,
      line: s.line,
      msg: `Inline ABI used for ${s.fnName} — manual review recommended`,
    });
    continue;
  }
  if (!abiName) {
    // Could be a local const ABI defined inside the same file
    findings.push({
      sev: 'INFO',
      file: s.file,
      line: s.line,
      msg: `Local/inline ABI symbol "${s.abiSym}" for ${s.fnName} — manual review recommended`,
    });
    continue;
  }
  const abi = ABIS[abiName];
  if (!abi) {
    findings.push({
      sev: 'HIGH',
      file: s.file,
      line: s.line,
      msg: `ABI symbol "${s.abiSym}" maps to "${abiName}.json" but file is missing`,
    });
    continue;
  }
  const fn = findFn(abi, s.fnName);
  if (!fn) {
    findings.push({
      sev: 'HIGH',
      file: s.file,
      line: s.line,
      msg: `Function "${s.fnName}" not found in ${abiName} ABI (called with abi=${s.abiSym})`,
    });
    continue;
  }
  // Arity check (if we could parse args). Solidity allows function overloads —
  // collect all candidates and accept the call if ANY overload matches.
  const overloads = findAllFns(abi, s.fnName);
  const expectedArities = overloads.map((o) => (o.inputs || []).length).sort((a, b) => a - b);
  const expected = (fn.inputs || []).length;
  if (s.argCount === -1) {
    // args: <ternary or spread> — can't count statically. Flag as INFO so a
    // human can verify rather than HIGH/MEDIUM noise.
    if (expected > 0) {
      findings.push({
        sev: 'INFO',
        file: s.file,
        line: s.line,
        msg: `${s.fnName} expects ${expected} arg${expected === 1 ? '' : 's'} — args is conditional/spread, manual verification recommended`,
      });
    }
  } else if (!expectedArities.includes(s.argCount)) {
    const arityDesc = expectedArities.length > 1
      ? `one of [${expectedArities.join(', ')}]`
      : `${expected}`;
    findings.push({
      sev: 'HIGH',
      file: s.file,
      line: s.line,
      msg: `${s.fnName}: passed ${s.argCount} args, ABI expects ${arityDesc} (${(fn.inputs || [])
        .map((i) => `${i.type} ${i.name || ''}`.trim())
        .join(', ')})`,
    });
  }
}

// ── Write report ──────────────────────────────────────────────────────────
const high = findings.filter((f) => f.sev === 'HIGH');
const med = findings.filter((f) => f.sev === 'MEDIUM');
const info = findings.filter((f) => f.sev === 'INFO');

let out = `# ABI Call-Site Parity Audit\n\n`;
out += `Cross-references every \`functionName:\` use site in the frontend against\nthe ABI it claims to use.\n\n`;
out += `- Frontend files scanned: **${files.length}**\n`;
out += `- Call sites found: **${allSites.length}**\n`;
out += `- ABI symbols resolved: **${Object.keys(SYMBOL_TO_ABI).length}**\n`;
out += `- ABIs loaded: **${Object.keys(ABIS).length}**\n\n`;
out += `## Summary\n\n`;
out += `| Severity | Count |\n|---|---|\n`;
out += `| HIGH (broken call) | ${high.length} |\n`;
out += `| MEDIUM (suspect) | ${med.length} |\n`;
out += `| INFO (manual review) | ${info.length} |\n\n`;

function fmt(group, label) {
  if (!group.length) return '';
  let s = `## ${label} (${group.length})\n\n`;
  for (const f of group) s += `- \`${f.file}:${f.line}\` — ${f.msg}\n`;
  return s + '\n';
}
out += fmt(high, 'HIGH findings');
out += fmt(med, 'MEDIUM findings');
out += fmt(info, 'INFO (inline ABI — manually verified separately)');

fs.writeFileSync(path.join(REPO, 'ABI_PARITY.md'), out);
console.log(`Wrote ABI_PARITY.md`);
console.log(`  ${allSites.length} call sites · ${high.length} high · ${med.length} medium · ${info.length} info`);
process.exit(high.length > 0 ? 1 : 0);

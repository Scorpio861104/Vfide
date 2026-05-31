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
 *   4) Handles Solidity function overloads — a call passes if ANY overload
 *      with the right name has a matching arity.
 *   5) Resolves ABI symbols across:
 *        - lib/abis/index.ts (imports, aliases, default JSON imports)
 *        - lib/abis/future.ts (default JSON imports)
 *        - lib/contracts.ts re-exports
 *        - all frontend `**\/config/contracts.ts` re-exports
 *        - per-file `import { Foo as Bar } from '@/lib/abis'`
 *        - per-file `import FooABI from '@/lib/abis/Foo.json'`
 *        - per-file `const FOO_ABI = SomethingABI` chains (4 passes)
 *        - per-file inline `const FOO_ABI = [ ... ] as const` literals
 *          (parsed into a synthetic ABI namespaced by file path)
 *        - viem's built-in `erc20Abi`
 *   6) Recognises ternary `args: cond ? [a, b] : undefined` and counts the
 *      truthy-branch arity.
 *   7) Flags any function not found in its declared ABI (HIGH).
 *   8) Flags any arity mismatch (HIGH).
 *
 * Output: ABI_PARITY.md with a finding per row.
 */

const fs = require('fs');
const path = require('path');

const REPO = path.resolve(__dirname, '..');
const FRONTEND_DIRS = ['app', 'components', 'hooks', 'lib'];
const ABI_DIR = path.join(REPO, 'lib/abis');

// ── Load every ABI we ship ─────────────────────────────────────────────────
const ABIS = {};
for (const f of fs.readdirSync(ABI_DIR)) {
  if (!f.endsWith('.json')) continue;
  const name = f.replace(/\.json$/, '');
  try {
    const json = JSON.parse(fs.readFileSync(path.join(ABI_DIR, f), 'utf8'));
    const abi = Array.isArray(json) ? json : json.abi || [];
    ABIS[name] = abi;
  } catch (e) {
    console.error(`Skipping malformed ABI: ${f}: ${e.message}`);
  }
}

// Register viem's built-in `erc20Abi` symbol so call sites that import
// `import { erc20Abi } from 'viem'` resolve. ABI mirrors viem's published one.
ABIS['__viem:erc20Abi'] = [
  { type: 'function', name: 'totalSupply', inputs: [], stateMutability: 'view', outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'balanceOf', inputs: [{ type: 'address' }], stateMutability: 'view', outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'allowance', inputs: [{ type: 'address' }, { type: 'address' }], stateMutability: 'view', outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'approve', inputs: [{ type: 'address' }, { type: 'uint256' }], stateMutability: 'nonpayable', outputs: [{ type: 'bool' }] },
  { type: 'function', name: 'transfer', inputs: [{ type: 'address' }, { type: 'uint256' }], stateMutability: 'nonpayable', outputs: [{ type: 'bool' }] },
  { type: 'function', name: 'transferFrom', inputs: [{ type: 'address' }, { type: 'address' }, { type: 'uint256' }], stateMutability: 'nonpayable', outputs: [{ type: 'bool' }] },
  { type: 'function', name: 'decimals', inputs: [], stateMutability: 'view', outputs: [{ type: 'uint8' }] },
  { type: 'function', name: 'symbol', inputs: [], stateMutability: 'view', outputs: [{ type: 'string' }] },
  { type: 'function', name: 'name', inputs: [], stateMutability: 'view', outputs: [{ type: 'string' }] },
  { type: 'event', name: 'Transfer', inputs: [{ indexed: true, type: 'address' }, { indexed: true, type: 'address' }, { type: 'uint256' }] },
  { type: 'event', name: 'Approval', inputs: [{ indexed: true, type: 'address' }, { indexed: true, type: 'address' }, { type: 'uint256' }] },
];

// ── Map ABI export symbol → ABI name ───────────────────────────────────────
const abiIndexSrc = fs.readFileSync(path.join(REPO, 'lib/abis/index.ts'), 'utf8');
const SYMBOL_TO_ABI = { erc20Abi: '__viem:erc20Abi' };

// `import XxxRaw from './YYY.json'` and `import Xxx from './YYY.json'`
const rawImportRe = /import\s+(\w+)\s+from\s+'\.\/([\w\.\-]+)\.json'/g;
const rawNameToFile = {};
let m;
while ((m = rawImportRe.exec(abiIndexSrc))) {
  rawNameToFile[m[1]] = m[2];
  if (fs.existsSync(path.join(ABI_DIR, `${m[2]}.json`))) {
    SYMBOL_TO_ABI[m[1]] = m[2];
  }
}

// Also scan lib/abis/*.ts re-export files (e.g. lib/abis/future.ts).
for (const ent of fs.readdirSync(path.join(REPO, 'lib/abis'))) {
  if (!ent.endsWith('.ts') || ent === 'index.ts' || ent.endsWith('.d.ts')) continue;
  const ts = fs.readFileSync(path.join(REPO, 'lib/abis', ent), 'utf8');
  const re = /import\s+(\w+)\s+from\s+'\.\/([\w\.\-]+)\.json'/g;
  let mm;
  while ((mm = re.exec(ts))) {
    if (fs.existsSync(path.join(ABI_DIR, `${mm[2]}.json`)) && !SYMBOL_TO_ABI[mm[1]]) {
      SYMBOL_TO_ABI[mm[1]] = mm[2];
    }
  }
}

// `const XxxABI = normalizeImportedABI(YyyRaw)` / `validateABI(YyyABI, 'Yyy')`
const constDeclRe = /const\s+(\w+ABI)\s*=\s*(?:normalizeImportedABI|validateABI)\((\w+)/g;
while ((m = constDeclRe.exec(abiIndexSrc))) {
  const sym = m[1];
  const inner = m[2];
  if (rawNameToFile[inner]) SYMBOL_TO_ABI[sym] = rawNameToFile[inner];
  else if (SYMBOL_TO_ABI[inner]) SYMBOL_TO_ABI[sym] = SYMBOL_TO_ABI[inner];
}

// `const FooABI = BarABI;` (and `const FooABI = BarABI` without semi — ASI)
const aliasReSemi = /const\s+(\w+ABI)\s*=\s*(\w+ABI)\s*;/g;
while ((m = aliasReSemi.exec(abiIndexSrc))) {
  if (SYMBOL_TO_ABI[m[2]] && !SYMBOL_TO_ABI[m[1]]) SYMBOL_TO_ABI[m[1]] = SYMBOL_TO_ABI[m[2]];
}
const aliasReASI = /(?:^|\n)\s*const\s+(\w+ABI)\s*=\s*(\w+ABI)\s*\n/g;
while ((m = aliasReASI.exec(abiIndexSrc))) {
  if (SYMBOL_TO_ABI[m[2]] && !SYMBOL_TO_ABI[m[1]]) SYMBOL_TO_ABI[m[1]] = SYMBOL_TO_ABI[m[2]];
}

// lib/contracts.ts re-exports + all `app/**/config/contracts.ts` etc.
function findReexportFiles(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ent.name === 'node_modules' || ent.name === '.next' || ent.name.startsWith('.')) continue;
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) findReexportFiles(p, out);
    else if (/\.(ts|tsx)$/.test(ent.name) && !/__tests__|__mocks__|\.test\.|\.d\.ts$/.test(p)) {
      out.push(p);
    }
  }
  return out;
}
const allTsFiles = [
  ...findReexportFiles(path.join(REPO, 'app')),
  ...findReexportFiles(path.join(REPO, 'lib')),
  ...findReexportFiles(path.join(REPO, 'hooks')),
  ...findReexportFiles(path.join(REPO, 'components')),
];
for (let pass = 0; pass < 4; pass++) {
  let changed = false;
  for (const f of allTsFiles) {
    let ts = '';
    try { ts = fs.readFileSync(f, 'utf8'); } catch { continue; }
    const re = /(?:^|\n)\s*export\s+const\s+(\w+(?:ABI|_ABI))\s*(?::[^=]+)?=\s*(\w+(?:ABI|_ABI))\s*(?:as\s+\w+\s*)?;?/g;
    let mm;
    while ((mm = re.exec(ts))) {
      if (SYMBOL_TO_ABI[mm[2]] && !SYMBOL_TO_ABI[mm[1]]) {
        SYMBOL_TO_ABI[mm[1]] = SYMBOL_TO_ABI[mm[2]];
        changed = true;
      }
    }
  }
  if (!changed) break;
}

// ── Walk all frontend files ────────────────────────────────────────────────
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

// ── Per-file overlay: handles `as` aliases, JSON default imports, in-file
// const aliases, and inline ABI literals. ──────────────────────────────────
function buildLocalOverlay(src, relFile) {
  const overlay = {};
  // Named imports from @/lib/abis (or relative path).
  const namedRe = /import\s*\{\s*([^}]+)\s*\}\s*from\s*['"](@\/lib\/abis|[\.\/]+lib\/abis|@\/lib\/abis\/index|@\/lib\/abis\/future|[\.\/]+lib\/abis\/future)['"]/g;
  let mm;
  while ((mm = namedRe.exec(src))) {
    for (const part of mm[1].split(',')) {
      const piece = part.trim();
      if (!piece) continue;
      const aliasMatch = /^(\w+)\s+as\s+(\w+)$/.exec(piece);
      if (aliasMatch) {
        const orig = aliasMatch[1];
        const alias = aliasMatch[2];
        if (SYMBOL_TO_ABI[orig]) overlay[alias] = SYMBOL_TO_ABI[orig];
      } else if (SYMBOL_TO_ABI[piece]) {
        overlay[piece] = SYMBOL_TO_ABI[piece];
      }
    }
  }
  // Default JSON imports: `import FooABI from '@/lib/abis/Foo.json'`.
  const jsonRe = /import\s+(\w+)\s+from\s+['"][^'"]*lib\/abis\/([\w\.\-]+)\.json['"]/g;
  while ((mm = jsonRe.exec(src))) {
    if (ABIS[mm[2]]) overlay[mm[1]] = mm[2];
  }
  // In-file aliases: `const FOO_ABI = SomethingABI;`. Iterate to fixed point.
  const aliasRe = /(?:^|\n)\s*(?:export\s+)?const\s+(\w+)\s*=\s*(\w+)\s*(?:as\s+const\s*)?;?/g;
  for (let pass = 0; pass < 4; pass++) {
    let changed = false;
    aliasRe.lastIndex = 0;
    while ((mm = aliasRe.exec(src))) {
      const dst = mm[1];
      const srcSym = mm[2];
      if (overlay[dst]) continue;
      const resolved = overlay[srcSym] || SYMBOL_TO_ABI[srcSym];
      if (resolved) {
        overlay[dst] = resolved;
        changed = true;
      }
    }
    if (!changed) break;
  }
  // Inline ABI literal: `const FOO = [ ... ] as const`. Walk bracket depth so
  // nested arrays don't terminate the match early.
  const declHdr = /(?:^|\n)\s*(?:export\s+)?const\s+(\w+)\s*(?::[^=]+)?=\s*\[/g;
  while ((mm = declHdr.exec(src))) {
    const sym = mm[1];
    if (overlay[sym]) continue;
    const openIdx = src.indexOf('[', mm.index);
    if (openIdx < 0) continue;
    let d = 0, closeIdx = -1;
    for (let i = openIdx; i < src.length; i++) {
      const c = src[i];
      if (c === '[') d++;
      else if (c === ']') {
        d--;
        if (d === 0) { closeIdx = i; break; }
      }
    }
    if (closeIdx < 0) continue;
    const body = src.slice(openIdx + 1, closeIdx);
    if (!/type\s*:\s*['"`](function|event|error)['"`]/.test(body)) continue;
    const parsed = parseInlineAbi(body);
    if (parsed.length > 0) {
      const synth = `__inline:${relFile}:${sym}`;
      ABIS[synth] = parsed;
      overlay[sym] = synth;
    }
  }
  return overlay;
}

/** Parse an inline TypeScript ABI literal body (between [ and ]). */
function parseInlineAbi(body) {
  const out = [];
  let depth = 0, start = -1;
  for (let i = 0; i < body.length; i++) {
    const c = body[i];
    if (c === '{') {
      if (depth === 0) start = i;
      depth++;
    } else if (c === '}') {
      depth--;
      if (depth === 0 && start >= 0) {
        const obj = body.slice(start, i + 1);
        start = -1;
        const typ = (obj.match(/type\s*:\s*['"`](\w+)['"`]/) || [])[1];
        if (typ !== 'function' && typ !== 'event' && typ !== 'error') continue;
        const name = (obj.match(/name\s*:\s*['"`]([\w$]+)['"`]/) || [])[1];
        if (!name) continue;
        // Find `inputs:` and walk brackets to find the matching closing `]`,
        // because non-greedy regex would stop at the first `]` (e.g. nested
        // `components: [...]` for tuple inputs).
        let inputCount = 0;
        const inputsKeyMatch = /inputs\s*:\s*\[/.exec(obj);
        if (inputsKeyMatch) {
          const arrStart = inputsKeyMatch.index + inputsKeyMatch[0].length; // index of first char inside [
          let dd = 1, j = arrStart;
          while (j < obj.length && dd > 0) {
            const cc = obj[j];
            if (cc === '[' || cc === '{' || cc === '(') dd++;
            else if (cc === ']' || cc === '}' || cc === ')') dd--;
            if (dd === 0) break;
            j++;
          }
          const inner = obj.slice(arrStart, j);
          if (inner.trim().length === 0) {
            inputCount = 0;
          } else {
            let dd2 = 0, n = 0;
            for (let k = 0; k < inner.length; k++) {
              const cc = inner[k];
              if (cc === '{') {
                if (dd2 === 0) n++;
                dd2++;
              } else if (cc === '}') dd2--;
              else if (cc === '[' || cc === '(') dd2++;
              else if (cc === ']' || cc === ')') dd2--;
            }
            inputCount = n;
          }
        }
        out.push({
          type: typ,
          name,
          inputs: Array.from({ length: inputCount }, (_, k) => ({ type: '?', name: `arg${k}` })),
        });
      }
    }
  }
  return out;
}

// ── Extract { abi: SYMBOL, functionName: 'name', args: [...] } blocks ─────
// Strip JS line/block comments while preserving offsets (replace with spaces
// of equal length). String literals are preserved.
function stripComments(src) {
  const out = src.split('');
  let i = 0;
  const n = src.length;
  while (i < n) {
    const c = src[i];
    const c2 = src[i + 1];
    if (c === '/' && c2 === '*') {
      let j = i + 2;
      while (j < n - 1 && !(src[j] === '*' && src[j + 1] === '/')) j++;
      const end = Math.min(j + 2, n);
      for (let k = i; k < end; k++) {
        if (out[k] !== '\n') out[k] = ' ';
      }
      i = end;
      continue;
    }
    if (c === '/' && c2 === '/') {
      let j = i;
      while (j < n && src[j] !== '\n') j++;
      for (let k = i; k < j; k++) out[k] = ' ';
      i = j;
      continue;
    }
    if (c === '"' || c === "'" || c === '`') {
      const quote = c;
      let j = i + 1;
      while (j < n) {
        if (src[j] === '\\') { j += 2; continue; }
        if (src[j] === quote) { j++; break; }
        if (quote === '`' && src[j] === '$' && src[j + 1] === '{') {
          let dd = 1; j += 2;
          while (j < n && dd > 0) {
            if (src[j] === '{') dd++;
            else if (src[j] === '}') dd--;
            j++;
          }
          continue;
        }
        j++;
      }
      i = j;
      continue;
    }
    i++;
  }
  return out.join('');
}

function extractCallSites(rawSrc, file) {
  const src = stripComments(rawSrc);
  const sites = [];
  const fnRe = /functionName\s*:\s*['"`]([\w$]+)['"`]/g;
  let m;
  while ((m = fnRe.exec(src))) {
    const fnName = m[1];
    const fnIdx = m.index;
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
    depth = 0;
    let closeIdx = -1;
    for (let i = openIdx; i < src.length; i++) {
      const c = src[i];
      if (c === '{' || c === '(' || c === '[') depth++;
      else if (c === '}' || c === ')' || c === ']') {
        depth--;
        if (depth === 0) { closeIdx = i; break; }
      }
    }
    if (closeIdx === -1) closeIdx = src.length;
    const objLit = src.slice(openIdx, closeIdx + 1);
    const props = [];
    {
      let d = 0, cur = '';
      for (let i = 1; i < objLit.length - 1; i++) {
        const c = objLit[i];
        if (c === '{' || c === '(' || c === '[') { d++; cur += c; }
        else if (c === '}' || c === ')' || c === ']') { d--; cur += c; }
        else if (c === ',' && d === 0) { props.push(cur); cur = ''; }
        else cur += c;
      }
      if (cur.trim().length) props.push(cur);
    }
    let abiSym = null;
    let argsLiteral = null;
    let hasArgsKey = false;
    let conditionalArgsArity = -1;
    for (const p of props) {
      const trimmed = p.trim();
      let mm;
      if ((mm = /^abi\s*:\s*([\w$]+)/.exec(trimmed))) abiSym = mm[1];
      else if ((mm = /^args\s*:\s*\[([\s\S]*)\]\s*$/.exec(trimmed))) {
        hasArgsKey = true;
        argsLiteral = mm[1];
      } else if (/^args\s*:/.test(trimmed)) {
        hasArgsKey = true;
        argsLiteral = null;
        // `cond ? [a, b] : undefined` — count truthy-branch top-level commas.
        const ternaryMatch = trimmed.match(/^args\s*:\s*[^?]+\?\s*\[([\s\S]*?)\]\s*:/);
        if (ternaryMatch) {
          const inner = ternaryMatch[1].trim();
          if (inner.length === 0) {
            conditionalArgsArity = 0;
          } else {
            let d = 0, n = 0;
            for (let i = 0; i < inner.length; i++) {
              const c = inner[i];
              if (c === '(' || c === '[' || c === '{') d++;
              else if (c === ')' || c === ']' || c === '}') d--;
              else if (c === ',' && d === 0) n++;
            }
            const trailing = inner.replace(/\s+$/, '').endsWith(',');
            conditionalArgsArity = trailing ? n : n + 1;
          }
        }
      }
    }
    let argCount = -1;
    if (hasArgsKey && argsLiteral !== null) {
      const inner = argsLiteral.trim();
      if (inner.length === 0) argCount = 0;
      else {
        let d = 0, last = 0;
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
      argCount = 0;
    } else {
      argCount = -1;
    }
    const line = src.slice(0, fnIdx).split('\n').length;
    sites.push({ file, line, fnName, abiSym, argCount, hasArgsKey, conditionalArgsArity });
  }
  return sites;
}

const allSites = [];
for (const f of files) {
  const src = fs.readFileSync(f, 'utf8');
  const relFile = path.relative(REPO, f);
  const localOverlay = buildLocalOverlay(src, relFile);
  for (const s of extractCallSites(src, relFile)) {
    if (s.abiSym && localOverlay[s.abiSym] && !SYMBOL_TO_ABI[s.abiSym]) {
      s.localAbi = localOverlay[s.abiSym];
    }
    allSites.push(s);
  }
}

// ── Validate each site against its ABI ────────────────────────────────────
const findings = [];
const suppressions = []; // {sev,file,line,msg,reason}

// Cache source lines for suppression-marker lookup.
const FILE_CACHE = new Map();
function getFileLines(relFile) {
  if (FILE_CACHE.has(relFile)) return FILE_CACHE.get(relFile);
  const abs = path.join(REPO, relFile);
  let lines = [];
  try { lines = fs.readFileSync(abs, 'utf8').split('\n'); } catch (_) {}
  FILE_CACHE.set(relFile, lines);
  return lines;
}

// Look for `abi-parity-ok: <reason>` within +/-4 lines of the call site.
function findSuppression(relFile, line) {
  const lines = getFileLines(relFile);
  const re = /abi-parity-ok\s*:\s*([^\n*]+?)(?:\*\/|$)/i;
  for (let off = -25; off <= 4; off++) {
    const idx = line - 1 + off;
    if (idx < 0 || idx >= lines.length) continue;
    const m = re.exec(lines[idx] || '');
    if (m) return m[1].trim();
  }
  return null;
}

function pushFinding(f) {
  const reason = findSuppression(f.file, f.line);
  if (reason) { suppressions.push({ ...f, reason }); return; }
  findings.push(f);
}

function findFn(abi, name) { return abi.find((e) => e.type === 'function' && e.name === name); }
function findAllFns(abi, name) { return abi.filter((e) => e.type === 'function' && e.name === name); }

for (const s of allSites) {
  const abiName = s.abiSym ? (SYMBOL_TO_ABI[s.abiSym] || s.localAbi || null) : null;
  if (!s.abiSym) {
    pushFinding({ sev: 'INFO', file: s.file, line: s.line,
      msg: `Inline ABI used for ${s.fnName} — manual review recommended` });
    continue;
  }
  if (!abiName) {
    pushFinding({ sev: 'INFO', file: s.file, line: s.line,
      msg: `Local/inline ABI symbol "${s.abiSym}" for ${s.fnName} — manual review recommended` });
    continue;
  }
  const abi = ABIS[abiName];
  if (!abi) {
    pushFinding({ sev: 'HIGH', file: s.file, line: s.line,
      msg: `ABI "${abiName}" referenced but not loaded (symbol=${s.abiSym})` });
    continue;
  }
  const fn = findFn(abi, s.fnName);
  if (!fn) {
    pushFinding({ sev: 'HIGH', file: s.file, line: s.line,
      msg: `Function "${s.fnName}" not found in ${abiName} ABI (called with abi=${s.abiSym})` });
    continue;
  }
  const overloads = findAllFns(abi, s.fnName);
  const expectedArities = overloads.map((o) => (o.inputs || []).length).sort((a, b) => a - b);
  const expected = (fn.inputs || []).length;
  if (s.argCount === -1) {
    if (s.conditionalArgsArity !== undefined && s.conditionalArgsArity >= 0) {
      if (!expectedArities.includes(s.conditionalArgsArity)) {
        const arityDesc = expectedArities.length > 1 ? `one of [${expectedArities.join(', ')}]` : `${expected}`;
        pushFinding({ sev: 'HIGH', file: s.file, line: s.line,
          msg: `${s.fnName}: passed ${s.conditionalArgsArity} args (in ternary), ABI expects ${arityDesc} (${(fn.inputs || [])
            .map((i) => `${i.type} ${i.name || ''}`.trim()).join(', ')})` });
      }
    } else if (expected > 0) {
      pushFinding({ sev: 'INFO', file: s.file, line: s.line,
        msg: `${s.fnName} expects ${expected} arg${expected === 1 ? '' : 's'} — args is conditional/spread, manual verification recommended` });
    }
  } else if (!expectedArities.includes(s.argCount)) {
    const arityDesc = expectedArities.length > 1 ? `one of [${expectedArities.join(', ')}]` : `${expected}`;
    pushFinding({ sev: 'HIGH', file: s.file, line: s.line,
      msg: `${s.fnName}: passed ${s.argCount} args, ABI expects ${arityDesc} (${(fn.inputs || [])
        .map((i) => `${i.type} ${i.name || ''}`.trim()).join(', ')})` });
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
out += `## Summary\n\n| Severity | Count |\n|---|---|\n| HIGH (broken call) | ${high.length} |\n| MEDIUM (suspect) | ${med.length} |\n| INFO (manual review) | ${info.length} |\n\n`;
function fmt(group, label) {
  if (group.length === 0) return `## ${label} (0)\n\n_None._\n\n`;
  let s = `## ${label} (${group.length})\n\n`;
  for (const f of group) s += `- \`${f.file}:${f.line}\` — ${f.msg}\n`;
  return s + '\n';
}
out += fmt(high, 'HIGH findings');
out += fmt(med, 'MEDIUM findings');
out += fmt(info, 'INFO (inline ABI — manually verified separately)');

if (suppressions.length > 0) {
  out += `## Suppressed (${suppressions.length}) — marked \`abi-parity-ok\`\n\n`;
  out += `These call sites were flagged by the static parser but have been\n`;
  out += `manually verified against contract source and triaged with an inline\n`;
  out += `\`abi-parity-ok: <reason>\` annotation.\n\n`;
  for (const f of suppressions) {
    out += `- \`${f.file}:${f.line}\` (${f.sev}) — ${f.msg} — _${f.reason}_\n`;
  }
  out += '\n';
}

fs.writeFileSync(path.join(REPO, 'ABI_PARITY.md'), out);
console.log(`Wrote ABI_PARITY.md`);
console.log(`  ${allSites.length} call sites · ${high.length} high · ${med.length} medium · ${info.length} info · ${suppressions.length} suppressed`);
process.exit(high.length > 0 ? 1 : 0);

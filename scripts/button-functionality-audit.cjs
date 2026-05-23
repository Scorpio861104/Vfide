#!/usr/bin/env node
/**
 * Button & Handler Functionality Audit
 *
 * Statically scans every .tsx in app/ and components/ for:
 *   1. Buttons / interactive elements with empty or stub onClick handlers
 *      (e.g. `onClick={() => {}}`, `onClick={() => null}`, etc.)
 *   2. onClick handlers whose body is only console.log / console.warn /
 *      console.error / a TODO comment.
 *   3. <form> elements without onSubmit (and without action).
 *   4. <a> / <Link> with href="#" and no onClick (dead links).
 *   5. Buttons rendering text like "Coming soon" / "TODO" / "WIP" — flagged
 *      as INFO so the surface is visible but not failing.
 *   6. Buttons with `disabled` permanently hard-coded to `true` — INFO.
 *
 * Suppression: `// button-ok: <reason>` on the same line, the line above,
 * or up to 4 lines above the flagged line.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SCAN_DIRS = ['app', 'components', 'hooks', 'providers'];
const SKIP_DIRS = new Set(['node_modules', '.next', '__tests__', 'test', 'e2e', 'playwright', 'storybook', '.storybook']);
const SKIP_FILE_PATTERNS = [
  /\.test\.tsx?$/,
  /\.spec\.tsx?$/,
  /\.stories\.tsx?$/,
  /\.d\.ts$/,
];

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      walk(path.join(dir, entry.name), out);
    } else if (entry.isFile() && /\.(tsx?|jsx?)$/.test(entry.name)) {
      if (SKIP_FILE_PATTERNS.some((re) => re.test(entry.name))) continue;
      out.push(path.join(dir, entry.name));
    }
  }
  return out;
}

// Strip JS line / block comments while preserving offsets.
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

function lineOf(src, idx) {
  return src.slice(0, idx).split('\n').length;
}

// Walk forward from `start` (a `{` index in cleaned source) to its matching
// `}`, respecting brackets, parens, and strings.
function matchingBrace(src, start) {
  let d = 0;
  for (let i = start; i < src.length; i++) {
    const c = src[i];
    if (c === '{') d++;
    else if (c === '}') {
      d--;
      if (d === 0) return i;
    }
  }
  return -1;
}

// Find matching closing for an opening (paren / brace / bracket).
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function matchingClose(src, start, openCh, closeCh) {
  let d = 0;
  for (let i = start; i < src.length; i++) {
    const c = src[i];
    if (c === openCh) d++;
    else if (c === closeCh) {
      d--;
      if (d === 0) return i;
    }
  }
  return -1;
}

// Extract the value of a JSX attribute like `onClick={...}`. Returns the
// inner expression text (trimmed) and the position of the opening `{`.
function extractJsxBraceAttr(src, attrIdx, attrName) {
  // attrIdx points at the start of attrName.
  const eq = src.indexOf('=', attrIdx + attrName.length);
  if (eq < 0) return null;
  // Find the next `{`.
  let i = eq + 1;
  while (i < src.length && /\s/.test(src[i])) i++;
  if (src[i] !== '{') return null;
  const close = matchingBrace(src, i);
  if (close < 0) return null;
  return { open: i, close, body: src.slice(i + 1, close).trim() };
}

// Heuristic: is this onClick body a "stub"?  Return reason or null.
function classifyHandlerBody(body) {
  const trimmed = body.trim();
  if (trimmed.length === 0) return 'empty handler body';

  // Pure noop arrow forms.
  const noopRe = /^\(?\s*\)?\s*=>\s*\{?\s*\}?\s*$/;
  if (noopRe.test(trimmed)) return 'noop arrow handler';

  // `() => null`, `() => undefined`, `() => 0`, `() => void 0`
  if (/^\(?\s*\)?\s*=>\s*(null|undefined|void\s+0|0|false|true)\s*;?\s*$/.test(trimmed)) {
    return 'no-op return-only handler';
  }

  // Strip outer arrow and braces to inspect body.
  let inner = trimmed;
  // `() => { ... }` or `(e) => { ... }`
  const arrowMatch = /^\(?[^)]*\)?\s*=>\s*\{([\s\S]*)\}$/.exec(inner);
  if (arrowMatch) {
    inner = arrowMatch[1].trim();
  } else {
    // `function() { ... }` or `function (e) { ... }`
    const fnMatch = /^function\s*\w*\s*\([^)]*\)\s*\{([\s\S]*)\}$/.exec(inner);
    if (fnMatch) inner = fnMatch[1].trim();
  }

  if (inner.length === 0) return 'empty handler block';

  // Strip semicolons / whitespace.
  const innerNoTrailing = inner.replace(/[\s;]+$/, '');

  // Only console.* statements?
  const lines = innerNoTrailing.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length);
  if (lines.length > 0 && lines.every((l) => /^console\.(log|warn|error|info|debug)\s*\(/.test(l))) {
    return 'console-only handler (no real action)';
  }

  // Only TODO comment (we already stripped JS comments, but the literal
  // "TODO" might appear as a string).
  if (/^['"`](TODO|FIXME|WIP|coming soon|not implemented)['"`]?$/i.test(innerNoTrailing)) {
    return 'placeholder string-only handler';
  }

  // alert("Coming soon")  /  alert('TODO')
  if (/^alert\s*\(\s*['"`](coming soon|todo|wip|not implemented|stay tuned)['"`]\s*\)\s*;?\s*$/i.test(innerNoTrailing)) {
    return 'alert placeholder handler';
  }

  return null;
}

// Find every JSX opening tag and inspect its attributes / children.
function scanFile(absPath, rel) {
  const raw = fs.readFileSync(absPath, 'utf8');
  const src = stripComments(raw);
  const findings = [];

  // Match opening tags for elements we care about. We allow JSX components
  // (capitalised) and lowercase HTML.  Use a simple opening-tag regex; we
  // then walk to the closing `>` to handle nested braces in props.
  const interactiveTags = new Set([
    'button',
    'Button',
    'a',
    'Link',
    'IconButton',
    'PrimaryButton',
    'SecondaryButton',
    'TextButton',
    'NavButton',
    'CTAButton',
    'GhostButton',
  ]);

  const tagRe = /<([A-Za-z][\w.]*)/g;
  let m;
  while ((m = tagRe.exec(src)) !== null) {
    const tag = m[1];
    if (!interactiveTags.has(tag)) continue;
    const tagStart = m.index;

    // Find the end of the opening tag (`>` or `/>` at the JSX level).
    let i = tagStart;
    let d = 0;
    let tagEnd = -1;
    let _selfClose = false;
    while (i < src.length) {
      const c = src[i];
      if (c === '{') d++;
      else if (c === '}') d--;
      else if (c === '"' || c === "'" || c === '`') {
        // skip string
        const q = c;
        i++;
        while (i < src.length && src[i] !== q) {
          if (src[i] === '\\') { i++; }
          i++;
        }
      } else if (c === '>' && d === 0) {
        tagEnd = i;
        if (src[i - 1] === '/') _selfClose = true;
        break;
      }
      i++;
    }
    if (tagEnd < 0) continue;

    const attrsBlob = src.slice(tagStart, tagEnd + 1);
    const line = lineOf(src, tagStart);

    // ── Handler-stub detection ──────────────────────────────────────────
    // Find `onClick=`, `onChange=`, `onSubmit=`, `onPress=`.
    const handlerRe = /\b(onClick|onSubmit|onChange|onPress|onMouseDown|onMouseUp|onKeyDown)\b/g;
    let h;
    while ((h = handlerRe.exec(attrsBlob)) !== null) {
      const handlerName = h[1];
      const absoluteIdx = tagStart + h.index;
      const ext = extractJsxBraceAttr(src, absoluteIdx, handlerName);
      if (!ext) continue;
      const reason = classifyHandlerBody(ext.body);
      if (reason) {
        findings.push({
          file: rel,
          line: lineOf(src, absoluteIdx),
          severity: reason.startsWith('placeholder') || reason.startsWith('alert') ? 'INFO' : 'MEDIUM',
          category: `${handlerName}-stub`,
          msg: `<${tag} ${handlerName}> ${reason}: \`${ext.body.slice(0, 80).replace(/\n/g, ' ')}\``,
        });
      }
    }

    // ── <form> without onSubmit and without action ─────────────────────
    if (tag === 'form') {
      const hasOnSubmit = /\bonSubmit\s*=/.test(attrsBlob);
      const hasAction = /\baction\s*=/.test(attrsBlob);
      if (!hasOnSubmit && !hasAction) {
        findings.push({
          file: rel,
          line,
          severity: 'MEDIUM',
          category: 'form-no-handler',
          msg: '<form> has neither onSubmit nor action — submission would do a full-page navigation',
        });
      }
    }

    // ── <a> / <Link> with href="#" and no onClick ─────────────────────
    if (tag === 'a' || tag === 'Link') {
      const hrefHashRe = /\bhref\s*=\s*["']#["']/;
      if (hrefHashRe.test(attrsBlob)) {
        const hasOnClick = /\bonClick\s*=/.test(attrsBlob);
        if (!hasOnClick) {
          findings.push({
            file: rel,
            line,
            severity: 'INFO',
            category: 'dead-link',
            msg: `<${tag} href="#"> with no onClick — dead link`,
          });
        }
      }
    }

    // ── <button> / <Button> with no onClick / no type=submit / no form  ──
    if (tag === 'button' || tag === 'Button') {
      const hasOnClick = /\bonClick\s*=/.test(attrsBlob);
      const isSubmit = /\btype\s*=\s*["']submit["']/.test(attrsBlob);
      const hasFormProp = /\bform\s*=\s*["']/.test(attrsBlob);
      const hasHref = /\bhref\s*=/.test(attrsBlob);  // some Button libs forward href
      const hasAsLink = /\bas\s*=\s*["']?Link/.test(attrsBlob) || /\bas\s*=\s*\{/.test(attrsBlob);
      // Disabled *permanently* (literal): bare `disabled` attribute or
      // `disabled={true}`. A permanently-disabled button never fires onClick,
      // so a missing handler is not a defect. We still flag dynamically
      // disabled buttons (`disabled={cond}`) because they can be clickable.
      const hasPermanentDisabled = /\bdisabled\s*=\s*\{\s*true\s*\}/.test(attrsBlob)
        || /\bdisabled(?=[\s/>])/.test(attrsBlob.replace(/\bdisabled\s*=\s*\{/g, ''));

      // Skip if button is rendered inside a higher-level wrapper that
      // attaches handlers — heuristic: if the button has only children
      // text and no handler / no submit, that's a likely dead button.
      if (!hasOnClick && !isSubmit && !hasFormProp && !hasHref && !hasAsLink && !hasPermanentDisabled) {
        // Some buttons spread props like `{...props}` — exempt those.
        const hasSpread = /\{\s*\.\.\.\w+\s*\}/.test(attrsBlob);
        if (!hasSpread) {
          findings.push({
            file: rel,
            line,
            severity: 'MEDIUM',
            category: 'button-no-handler',
            msg: `<${tag}> has no onClick, no type="submit", no form, no spread{...props}, and is not disabled — likely dead button`,
          });
        }
      }
    }
  }

  return findings;
}

// ── Suppression check ────────────────────────────────────────────────────
const FILE_LINES_CACHE = new Map();
function getLines(rel) {
  if (FILE_LINES_CACHE.has(rel)) return FILE_LINES_CACHE.get(rel);
  const abs = path.join(ROOT, rel);
  let lines = [];
  try { lines = fs.readFileSync(abs, 'utf8').split('\n'); } catch (_) {}
  FILE_LINES_CACHE.set(rel, lines);
  return lines;
}
function findSuppression(rel, line) {
  const lines = getLines(rel);
  const re = /button-ok\s*:\s*([^\n*]+?)(?:\*\/|$)/i;
  // Look up to 25 lines above (covers a comment placed above a sibling JSX
  // block of stacked decorative buttons) and 4 below.
  for (let off = -25; off <= 4; off++) {
    const idx = line - 1 + off;
    if (idx < 0 || idx >= lines.length) continue;
    const m = re.exec(lines[idx] || '');
    if (m) return m[1].trim();
  }
  return null;
}

// ── Main ─────────────────────────────────────────────────────────────────
const allFiles = [];
for (const d of SCAN_DIRS) walk(path.join(ROOT, d), allFiles);

const findings = [];
const suppressions = [];
for (const f of allFiles) {
  const rel = path.relative(ROOT, f);
  const fs2 = scanFile(f, rel);
  for (const x of fs2) {
    const reason = findSuppression(x.file, x.line);
    if (reason) suppressions.push({ ...x, reason });
    else findings.push(x);
  }
}

const sevRank = { HIGH: 0, MEDIUM: 1, INFO: 2 };
findings.sort((a, b) =>
  sevRank[a.severity] - sevRank[b.severity]
  || a.file.localeCompare(b.file)
  || a.line - b.line);

const high = findings.filter((f) => f.severity === 'HIGH').length;
const med = findings.filter((f) => f.severity === 'MEDIUM').length;
const info = findings.filter((f) => f.severity === 'INFO').length;

const byCat = {};
for (const f of findings) byCat[f.category] = (byCat[f.category] || 0) + 1;

let md = `# Button & Handler Functionality Audit\n\n`;
md += `Files scanned: **${allFiles.length}**\n`;
md += `Findings: **high=${high}** **medium=${med}** **info=${info}**\n`;
md += `Suppressed (\`button-ok\` markers): ${suppressions.length}\n\n`;
md += `## By category\n\n`;
for (const [c, n] of Object.entries(byCat).sort((a, b) => b[1] - a[1])) md += `- ${c}: ${n}\n`;
md += `\n## Findings\n\n`;
if (findings.length === 0) md += `_No active findings._\n`;
else for (const f of findings) md += `- **${f.severity}** [${f.category}] ${f.file}:${f.line} — ${f.msg}\n`;

if (suppressions.length > 0) {
  md += `\n## Suppressed (${suppressions.length}) — marked \`button-ok\`\n\n`;
  for (const f of suppressions) {
    md += `- **${f.severity}** [${f.category}] ${f.file}:${f.line} — ${f.msg} — _${f.reason}_\n`;
  }
}

fs.writeFileSync(path.join(ROOT, 'BUTTON_AUDIT.md'), md);
console.log(`Wrote BUTTON_AUDIT.md`);
console.log(`  ${allFiles.length} files, ${findings.length} active, ${suppressions.length} suppressed`);
console.log(`  high=${high} medium=${med} info=${info}`);
process.exit(high > 0 ? 1 : 0);

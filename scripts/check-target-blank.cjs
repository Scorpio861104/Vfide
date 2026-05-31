#!/usr/bin/env node
// Multi-line aware target="_blank" without rel="noopener noreferrer" finder.
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (['node_modules', '.next', '.git', 'dist', 'build', 'coverage'].includes(ent.name)) continue;
      walk(p, out);
    } else if (/\.(tsx?|jsx?)$/.test(p) && !/\.test\.|\.spec\./.test(p)) {
      out.push(p);
    }
  }
  return out;
}

const files = [
  ...walk(path.join(ROOT, 'app')),
  ...walk(path.join(ROOT, 'components')),
];

const findings = [];
for (const f of files) {
  const src = fs.readFileSync(f, 'utf8');
  // Find <a/Link ...> and <a ... target="_blank" ...>; inspect each tag's full attribute set
  const tagRe = /<(a|Link)\b([\s\S]*?)>/g;
  let m;
  while ((m = tagRe.exec(src)) !== null) {
    const attrs = m[2];
    if (/target\s*=\s*["']_blank["']/.test(attrs)) {
      if (!/rel\s*=\s*["'][^"']*noopener[^"']*["']/.test(attrs)) {
        // compute line number
        const lineNo = src.slice(0, m.index).split('\n').length;
        findings.push(`${path.relative(ROOT, f)}:${lineNo}`);
      }
    }
  }
}

console.log(`target="_blank" without noopener: ${findings.length} findings`);
findings.forEach(f => console.log('  ' + f));
process.exit(findings.length > 0 ? 1 : 0);

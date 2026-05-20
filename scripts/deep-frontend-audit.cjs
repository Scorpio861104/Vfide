#!/usr/bin/env node
/**
 * Deep frontend audit (v2) — finds every class of issue users will exploit:
 *   1. Dead/broken internal links
 *   2. Hardcoded EOA-shaped addresses (0x... in JSX, not in tests)
 *   3. TODO / FIXME / XXX / HACK / TBD comments in user-visible code
 *   4. console.log / console.error left in production paths
 *   5. Lorem ipsum / placeholder copy
 *   6. localhost / 127.0.0.1 / example.com URLs in source (not validators)
 *   7. process.env.NEXT_PUBLIC_* references not declared in env.ts
 *   8. ts-ignore / ts-nocheck
 *   9. href="#" empty anchors
 *  10. alert()/confirm()/prompt() (blocking dialogs)
 *  11. dangerouslySetInnerHTML (XSS surface)
 *  12. target="_blank" without rel="noopener noreferrer"
 *  13. Hardcoded chain IDs not in supported set
 *  14. Sentinel addresses (0x...0001-0009)
 *
 * v2 improvements over v1:
 *   - Strips block comments and line comments before scanning
 *   - Whitelists validation logic (lib/security, lib/validateProduction, etc.)
 *   - Whitelists JSON-LD documentation comments
 *   - Whitelists Council/security-center "coming soon" copy that's accompanied
 *     by an explanation paragraph (verified manually)
 *   - Multi-line aware target="_blank" check
 *   - Skips storybook/test files
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const APP_DIR = path.join(ROOT, 'app');
const COMPONENTS_DIR = path.join(ROOT, 'components');
const HOOKS_DIR = path.join(ROOT, 'hooks');
const LIB_DIR = path.join(ROOT, 'lib');

const SUPPORTED_CHAIN_IDS = new Set([
  1, 8453, 137, 324,
  84532, 11155111, 80002, 300,
  31337, 1337,
]);

// Files where localhost / 127.0.0.1 / example.com is the correct, intentional
// thing to write (validation logic, security checks, dev fallbacks gated by
// a separate production-env validator).
const PLACEHOLDER_URL_WHITELIST = [
  'lib/security/urlValidation.ts',
  'lib/security/siweChallenge.ts',
  'lib/security/csp.ts',
  'lib/profile/validate.ts',
  'lib/validateProduction.ts',
  'lib/webhooks/merchantWebhookDispatcher.ts',
  'lib/websocket.ts',
  'lib/env.ts',
  'lib/db.ts',
  'app/api/merchant/webhooks/route.ts',
  'app/api/security/logs/route.ts',
  'app/api/csrf/route.ts',
  // SEO meta-tag baseUrl with localhost fallback. Production builds set
  // NEXT_PUBLIC_APP_URL via env validator (see lib/validateProduction.ts:319),
  // so a localhost canonical can never reach a real deploy.
  'app/(commerce)/embed/[slug]/page.tsx',
  'app/(marketing)/s/[slug]/page.tsx',
  'app/store/[slug]/page.tsx',
];

// Pages that gate contract calls dynamically (e.g. via on-chain manager
// address resolution + isValidVault / managerAddress != ZERO checks)
// rather than via the static isConfiguredContractAddress() helper.
const DYNAMIC_CONTRACT_GUARD_WHITELIST = [
  'app/inheritance/memorial/page.tsx',
  'app/inheritance/override/page.tsx',
  'app/vault/pending-changes/page.tsx',
  'app/vault/recover/status/page.tsx',
  'app/vault/safety/window/page.tsx',
];

// Components/pages that intentionally render "Coming soon" copy as a
// product roadmap signal, with accompanying explanatory paragraphs.
const COMING_SOON_WHITELIST = [
  'app/governance/components/CouncilTab.tsx',
  'app/security-center/page.tsx',
  'components/feedback/ComingSoonPage.tsx',
  'components/navigation/HubGrid.tsx',
];

// "TBD" copy that is intentional pending on-chain parameter resolution.
const TBD_WHITELIST = [
  'app/council/components/OverviewTab.tsx',
  'app/governance/components/ElectionsTabContent.tsx',
];

const findings = [];
function add(severity, category, file, line, message) {
  findings.push({ severity, category, file: path.relative(ROOT, file), line, message });
}

function walk(dir, predicate, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (['node_modules', '.next', '.git', 'dist', 'build', 'coverage', '__tests__', 'test', 'tests', 'storybook'].includes(ent.name)) continue;
      walk(p, predicate, out);
    } else if (predicate(p)) {
      out.push(p);
    }
  }
  return out;
}

const isCode = (p) =>
  /\.(tsx?|jsx?|mjs|cjs)$/.test(p) &&
  !/\.d\.ts$/.test(p) &&
  !/\.test\.|\.spec\.|\.stories\./.test(p);

const allFiles = [
  ...walk(APP_DIR, isCode),
  ...walk(COMPONENTS_DIR, isCode),
  ...walk(HOOKS_DIR, isCode),
  ...walk(LIB_DIR, isCode),
];

// Build a "code-only" map by stripping comments per file (line-aware so we
// keep accurate line numbers). For each line we produce:
//   - rawLine: original
//   - codeLine: line with line-comments removed and block-comment slices replaced with spaces
function stripComments(src) {
  const lines = src.split('\n');
  let inBlock = false;
  const out = [];
  for (let raw of lines) {
    let s = raw;
    let r = '';
    let i = 0;
    while (i < s.length) {
      if (inBlock) {
        const e = s.indexOf('*/', i);
        if (e === -1) { r += ' '.repeat(s.length - i); i = s.length; }
        else { r += ' '.repeat(e + 2 - i); i = e + 2; inBlock = false; }
        continue;
      }
      // Detect string starts to skip them
      const ch = s[i];
      if (ch === '/' && s[i+1] === '/') {
        // line comment — replace rest with spaces
        r += ' '.repeat(s.length - i);
        i = s.length;
        continue;
      }
      if (ch === '/' && s[i+1] === '*') {
        const e = s.indexOf('*/', i + 2);
        if (e === -1) { r += ' '.repeat(s.length - i); i = s.length; inBlock = true; }
        else { r += ' '.repeat(e + 2 - i); i = e + 2; }
        continue;
      }
      if (ch === '"' || ch === "'" || ch === '`') {
        // walk until matching quote (handles backslash escapes)
        const quote = ch;
        let j = i + 1;
        while (j < s.length) {
          if (s[j] === '\\') { j += 2; continue; }
          if (s[j] === quote) { j++; break; }
          j++;
        }
        r += s.slice(i, j);
        i = j;
        continue;
      }
      r += ch;
      i++;
    }
    out.push({ raw, code: r });
  }
  return out;
}

// Routes
const routeSet = new Set();
const dynamicRoutes = [];
function registerRoute(p) {
  let rel = path.relative(APP_DIR, path.dirname(p));
  if (rel === '') rel = '/';
  else rel = '/' + rel.split(path.sep).join('/');
  rel = rel.replace(/\/\([^)]+\)/g, '');
  if (rel === '') rel = '/';
  if (rel.includes('[')) {
    const pat = '^' + rel.replace(/\[\.\.\..+?\]/g, '.+').replace(/\[.+?\]/g, '[^/]+') + '$';
    dynamicRoutes.push({ pattern: new RegExp(pat) });
  } else {
    routeSet.add(rel);
  }
}
walk(APP_DIR, (p) => /\/page\.(tsx|ts|jsx|js)$/.test(p)).forEach(registerRoute);

function isKnownRoute(href) {
  const clean = href.split('?')[0].split('#')[0];
  if (clean === '' || clean === '/') return true;
  if (routeSet.has(clean)) return true;
  for (const dr of dynamicRoutes) if (dr.pattern.test(clean)) return true;
  return false;
}

// env.ts
const envFile = path.join(ROOT, 'lib', 'env.ts');
const envDef = fs.existsSync(envFile) ? fs.readFileSync(envFile, 'utf8') : '';

for (const file of allFiles) {
  let src;
  try { src = fs.readFileSync(file, 'utf8'); } catch { continue; }
  const rel = path.relative(ROOT, file);
  const stripped = stripComments(src);
  const isPage = /\/(page|layout|template|loading|error|not-found)\.(tsx|ts)$/.test(file);
  const isComponent = file.includes(`${path.sep}components${path.sep}`);
  const isUserVisible = isPage || isComponent;

  for (let i = 0; i < stripped.length; i++) {
    const { raw, code } = stripped[i];
    const lineNo = i + 1;

    // 3. TODO / FIXME — only in code (not comments)
    if (isUserVisible && /\b(TODO|FIXME|XXX|HACK|TBD)\b/.test(code) && !TBD_WHITELIST.includes(rel)) {
      // skip if it's purely a placeholder attribute on an input (UX hint)
      if (!/placeholder\s*=/.test(code)) {
        add('LOW', 'todo', file, lineNo, raw.trim().slice(0, 120));
      }
    }

    // 4. console.* in user-visible production code
    if (isUserVisible && /\bconsole\.(log|warn|error|debug|info)\s*\(/.test(code)) {
      add('LOW', 'console', file, lineNo, raw.trim().slice(0, 120));
    }

    // 5/6. Placeholder copy (only when NOT in whitelist + is in JSX text)
    if (/\b(lorem ipsum|coming soon|placeholder text|sample text|mock data|fake data|dummy)\b/i.test(code)) {
      if (!COMING_SOON_WHITELIST.includes(rel)) {
        add('MEDIUM', 'placeholder-copy', file, lineNo, raw.trim().slice(0, 120));
      }
    }

    // 6b. localhost/127.0.0.1/example.com — flag only outside the whitelist
    if (/(https?:\/\/)?(localhost|127\.0\.0\.1|example\.com|example\.org|test\.com)(:[0-9]+)?\b/i.test(code)) {
      if (!PLACEHOLDER_URL_WHITELIST.includes(rel)) {
        // also allow placeholder="you@example.com" on email inputs (UX standard)
        if (!/placeholder\s*=\s*["'][^"']*example\.(com|org)/.test(code)) {
          add('MEDIUM', 'placeholder-url', file, lineNo, raw.trim().slice(0, 120));
        }
      }
    }

    // 8. ts-ignore / ts-nocheck
    if (/@ts-(ignore|nocheck|expect-error)/.test(raw)) {
      add('LOW', 'ts-suppress', file, lineNo, raw.trim().slice(0, 120));
    }

    // 9. href="#"
    if (/href\s*=\s*["']#["']/.test(code)) {
      add('MEDIUM', 'empty-href', file, lineNo, raw.trim().slice(0, 120));
    }

    // 10. alert/confirm/prompt — only in code, only at the start (not foo.confirm)
    if (/(?:^|[^.\w])(alert|confirm|prompt)\s*\(/.test(code)) {
      // exclude window.confirm-style references that are clearly false positives
      // by ensuring the call is followed by an open paren and then *something*
      const m = code.match(/(?:^|[^.\w])(alert|confirm|prompt)\s*\(/);
      if (m) {
        // Don't flag confirmText="..." prop, onConfirm=, isConfirmOpen, etc.
        // Already excluded by the (^|[^.\w]) prefix.
        // Also skip showConfirm(...) / setConfirm(...) — these have a word char before
        const idx = m.index;
        const before = idx > 0 ? code[idx] : '';
        if (!/[a-zA-Z0-9_]/.test(before)) {
          add('MEDIUM', 'native-dialog', file, lineNo, raw.trim().slice(0, 120));
        }
      }
    }

    // 13. unknown chain IDs in comparisons
    const chainMatches = code.matchAll(/chainId\s*[=!<>]==?\s*(\d+)/g);
    for (const m of chainMatches) {
      const id = parseInt(m[1], 10);
      if (id && id > 100 && !SUPPORTED_CHAIN_IDS.has(id)) {
        add('HIGH', 'unknown-chain-id', file, lineNo, `chainId ${id}: ${raw.trim().slice(0, 80)}`);
      }
    }

    // 14. sentinel + 2. hardcoded address
    const addrMatches = raw.matchAll(/0x[a-fA-F0-9]{40}\b/g);
    for (const m of addrMatches) {
      const addr = m[0].toLowerCase();
      if (addr === '0x0000000000000000000000000000000000000000') continue;
      if (addr === '0x000000000000000000000000000000000000dead') continue;
      if (addr === '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee') continue;
      if (/example|test|mock|placeholder|TODO/i.test(raw)) continue;
      if (/0x0+0001$/i.test(addr)) {
        add('HIGH', 'sentinel-address', file, lineNo, `${addr}: ${raw.trim().slice(0, 80)}`);
        continue;
      }
      if (isUserVisible) {
        add('MEDIUM', 'hardcoded-address', file, lineNo, `${addr}: ${raw.trim().slice(0, 80)}`);
      }
    }

    // 1. dead links — Link href / router.push / redirect — literal strings only
    const linkMatches = [
      ...code.matchAll(/href\s*=\s*["'](\/[^"'?#]*)["']/g),
      ...code.matchAll(/router\.(push|replace)\s*\(\s*["'](\/[^"'?#]*)["']/g),
      ...code.matchAll(/redirect\s*\(\s*["'](\/[^"'?#]*)["']/g),
    ];
    for (const m of linkMatches) {
      const href = m[1] && m[1].startsWith('/') ? m[1] : m[2];
      if (!href) continue;
      if (href.startsWith('/api/')) continue;
      if (!isKnownRoute(href)) {
        add('HIGH', 'dead-link', file, lineNo, `href=${href}`);
      }
    }
  }

  // Multi-line: target="_blank" without rel
  const tagRe = /<(a|Link)\b([\s\S]*?)>/g;
  let m;
  while ((m = tagRe.exec(src)) !== null) {
    const attrs = m[2];
    if (/target\s*=\s*["']_blank["']/.test(attrs)) {
      if (!/rel\s*=\s*["'][^"']*noopener[^"']*["']/.test(attrs)) {
        const lineNo = src.slice(0, m.index).split('\n').length;
        add('MEDIUM', 'target-blank-no-rel', file, lineNo, `<${m[1]} target="_blank"> missing rel`);
      }
    }
  }

  // Multi-line dangerouslySetInnerHTML — only in actual JSX (not in comments)
  const dangerRe = /dangerouslySetInnerHTML/g;
  while ((m = dangerRe.exec(src)) !== null) {
    const lineNo = src.slice(0, m.index).split('\n').length;
    const codeLine = stripped[lineNo - 1]?.code ?? '';
    if (codeLine.includes('dangerouslySetInnerHTML')) {
      add('MEDIUM', 'dangerous-html', file, lineNo, src.split('\n')[lineNo - 1].trim().slice(0, 120));
    }
  }

  // Page-level contract guard — exclude dynamic-guard whitelist
  if (/\/page\.(tsx|ts)$/.test(file)) {
    const usesContract = /useReadContract|useWriteContract|readContract|writeContract|useContract/.test(src);
    const hasGuard = /isConfiguredContractAddress|isConfiguredAddress|CONTRACT_NOT_CONFIGURED|isPlaceholderAddress|managerAddress\s*&&|isValidVault/.test(src);
    if (usesContract && !hasGuard && !DYNAMIC_CONTRACT_GUARD_WHITELIST.includes(rel)) {
      add('LOW', 'unguarded-contract-page', file, 1, 'page calls contract hooks without visible address guard');
    }
  }
}

// 7. NEXT_PUBLIC_* references not declared in env.ts (excluding inline comments)
const allEnvRefs = new Set();
for (const file of allFiles) {
  const src = fs.readFileSync(file, 'utf8');
  const stripped = stripComments(src);
  for (const { code } of stripped) {
    for (const m of code.matchAll(/process\.env\.(NEXT_PUBLIC_[A-Z0-9_]+)/g)) {
      // Skip the meta comment-style placeholder NEXT_PUBLIC_FOO
      if (m[1] === 'NEXT_PUBLIC_FOO') continue;
      allEnvRefs.add(m[1]);
    }
  }
}
for (const e of allEnvRefs) {
  if (!envDef.includes(e)) {
    add('MEDIUM', 'undeclared-env', envFile, 1, `${e} referenced in code but not declared in lib/env.ts`);
  }
}

// Sort + summarize
const sevRank = { HIGH: 0, MEDIUM: 1, LOW: 2 };
findings.sort((a, b) => sevRank[a.severity] - sevRank[b.severity] || a.file.localeCompare(b.file) || a.line - b.line);

const high = findings.filter(f => f.severity === 'HIGH').length;
const medium = findings.filter(f => f.severity === 'MEDIUM').length;
const low = findings.filter(f => f.severity === 'LOW').length;

const byCategory = {};
for (const f of findings) byCategory[f.category] = (byCategory[f.category] || 0) + 1;

let md = `# Deep Frontend Audit (v2)\n\n`;
md += `Files scanned: ${allFiles.length}\n`;
md += `Routes registered: ${routeSet.size} static + ${dynamicRoutes.length} dynamic\n`;
md += `Findings: high=${high} medium=${medium} low=${low}\n\n`;
md += `## By category\n\n`;
for (const [cat, n] of Object.entries(byCategory).sort((a, b) => b[1] - a[1])) {
  md += `- ${cat}: ${n}\n`;
}
md += `\n## Whitelists (intentional choices documented in code)\n\n`;
md += `### Localhost/IP-address as validation logic\n`;
PLACEHOLDER_URL_WHITELIST.forEach(f => { md += `- ${f}\n`; });
md += `\n### Dynamic contract guards (managerAddress / isValidVault patterns)\n`;
DYNAMIC_CONTRACT_GUARD_WHITELIST.forEach(f => { md += `- ${f}\n`; });
md += `\n### "Coming soon" / "TBD" placeholders for not-yet-deployed features\n`;
[...COMING_SOON_WHITELIST, ...TBD_WHITELIST].forEach(f => { md += `- ${f}\n`; });

md += `\n## Findings\n\n`;
for (const f of findings) {
  md += `- **${f.severity}** [${f.category}] ${f.file}:${f.line} — ${f.message}\n`;
}
if (findings.length === 0) md += `_No findings — frontend is clean._\n`;

fs.writeFileSync(path.join(ROOT, 'DEEP_FRONTEND_AUDIT.md'), md);
console.log(`Wrote DEEP_FRONTEND_AUDIT.md`);
console.log(`  ${allFiles.length} files, ${findings.length} findings`);
console.log(`  high=${high} medium=${medium} low=${low}`);

if (high > 0) process.exit(1);
process.exit(0);

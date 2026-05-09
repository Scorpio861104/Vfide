#!/usr/bin/env node
/**
 * v19.10 I18N-2 FIX: extract user-facing strings from the codebase
 * and report which ones are NOT yet covered by
 * `lib/locale/translations/en.json`.
 *
 * Why this exists:
 *   - VFIDE has 8 locale files (ar/en/es/fr/ha/hi/pt/sw) with 173 keys each
 *   - All non-English locales were fully translated in v19.11
 *   - But translation key COVERAGE in components is incomplete: many
 *     React components still hardcode English strings instead of
 *     calling t('some.key')
 *   - There's no signal anywhere that says "this string needs a key"
 *   - Translators have no idea what's missing
 *
 * What this does:
 *   - Walks app/ and components/ for .tsx files
 *   - Finds JSX text nodes and string-literal attribute values (placeholder,
 *     aria-label, alt, title) that look like user-facing copy
 *   - Filters out things that are obviously not copy: classNames, IDs,
 *     URLs, event-name strings, log messages
 *   - Compares against keys already present in en.json
 *   - Outputs a report of: candidate strings without keys, suggested key
 *     names, files where they appear
 *
 * What this does NOT do:
 *   - It does not modify any .tsx file. It is read-only.
 *   - It does not invent translations. It only reports candidates.
 *   - It does not catch dynamic strings (template literals with expressions).
 *   - It does not catch toast/alert/throw messages buried in handlers; those
 *     need a separate audit.
 *
 * Usage:
 *   node scripts/extract-i18n-keys.mjs                 # report to stdout
 *   node scripts/extract-i18n-keys.mjs --json out.json # write JSON report
 *   node scripts/extract-i18n-keys.mjs --check         # exit 1 if missing
 *
 * The --check mode is suitable for CI: it prints a summary count and
 * exits non-zero if there are user-facing strings without translation
 * keys. Wire into a non-blocking CI step initially (informational), then
 * promote to blocking once coverage rises above some threshold.
 *
 * Heuristics this uses to decide if a string is "user-facing":
 *   - Inside JSX text content: > Some Text < (yes)
 *   - Inside JSX attribute placeholder/title/alt/aria-label (yes)
 *   - Inside JSX attribute className/id/data-XYZ/key/href (no)
 *   - Inside console.* or logger.* calls (no)
 *   - Pure punctuation, single character, or numeric (no)
 *   - URLs starting with http(s):// (no)
 *   - All-caps with underscores (likely an env var) (no)
 *
 * These heuristics are intentionally conservative. False negatives
 * (missing a string that should have been translated) are recoverable
 * in a later pass; false positives (suggesting a translation key for
 * something that's not user-facing) waste translator time.
 */

import { readdir, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, relative, extname } from 'node:path';
import { argv, exit, cwd } from 'node:process';

const ROOT = cwd();
const SCAN_DIRS = ['app', 'components'];
const EN_JSON_PATH = join(ROOT, 'lib/locale/translations/en.json');

const MIN_LENGTH = 3;
const MAX_LENGTH = 200;

const SKIP_PATTERNS = [
  /^[\d\s\W_]+$/,                     // pure punctuation, whitespace, digits
  /^https?:\/\//,                     // URLs
  /^\/[\w/-]*$/,                      // route paths
  /^[A-Z_][A-Z0-9_]*$/,               // SCREAMING_SNAKE constants
  /^[a-z][a-zA-Z0-9]*$/,              // single camelCase identifier
  /^[a-z0-9-]+$/,                     // kebab-case
  /^[\w-]+\.[\w.]+$/,                 // file paths or namespaced ids
  /^0x[a-fA-F0-9]{4,}$/,              // hex addresses or hashes
  /^#[a-fA-F0-9]{3,8}$/,              // CSS colors
  /^\$\{/,                            // template-literal expression
  /^[A-Z]{2,}$/,                      // 2+ all-caps acronym alone
  /^\s*$/,                            // empty/whitespace-only
];

const USER_FACING_ATTRS = new Set([
  'placeholder', 'title', 'alt', 'aria-label', 'aria-description',
  'aria-roledescription', 'label',
]);

const SKIP_ATTRS = new Set([
  'className', 'class', 'id', 'key', 'href', 'src', 'name', 'type',
  'role', 'data-testid', 'rel', 'target', 'method', 'action',
  'onClick', 'onChange', 'onSubmit', 'onBlur', 'onFocus',
  'autoComplete', 'autoCapitalize', 'autoCorrect', 'inputMode',
  'spellCheck', 'tabIndex',
]);

async function loadEnglishKeys() {
  if (!existsSync(EN_JSON_PATH)) {
    console.error(`[extract-i18n] English locale file not found at ${EN_JSON_PATH}`);
    exit(2);
  }
  try {
    const raw = await readFile(EN_JSON_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    return new Set(Object.values(parsed));
  } catch (e) {
    console.error(`[extract-i18n] Could not parse ${EN_JSON_PATH}: ${e.message}`);
    exit(2);
  }
}

async function* walkTsx(dir) {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules') continue;
      if (entry.name === '__tests__') continue;
      if (entry.name === '.next') continue;
      yield* walkTsx(path);
    } else if (extname(entry.name) === '.tsx') {
      yield path;
    }
  }
}

function shouldSkipString(s) {
  if (s.length < MIN_LENGTH) return true;
  if (s.length > MAX_LENGTH) return true;
  return SKIP_PATTERNS.some((re) => re.test(s));
}

function extractFromContent(content) {
  const candidates = [];
  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNo = i + 1;

    const stripped = line.trim();
    if (stripped.startsWith('//')) continue;
    if (stripped.startsWith('*')) continue;
    if (stripped.startsWith('import ')) continue;
    if (/console\.(log|warn|error|info|debug)\(/.test(stripped)) continue;
    if (/logger\.(info|warn|error|debug|trace)\(/.test(stripped)) continue;

    // JSX text nodes: > some text <
    const textMatches = line.matchAll(/>([^<>{}\n]+?)</g);
    for (const m of textMatches) {
      const txt = m[1].trim();
      if (txt && !shouldSkipString(txt)) {
        candidates.push({ text: txt, line: lineNo, kind: 'jsx-text' });
      }
    }

    // JSX attribute values: name="text" or name='text'
    const attrMatches = line.matchAll(/(\w[\w-]*)=["']([^"']{3,})["']/g);
    for (const m of attrMatches) {
      const attr = m[1];
      const val = m[2];
      if (SKIP_ATTRS.has(attr)) continue;
      if (USER_FACING_ATTRS.has(attr) && !shouldSkipString(val)) {
        candidates.push({ text: val, line: lineNo, kind: `attr:${attr}` });
      }
    }
  }

  return candidates;
}

function suggestKey(text, file) {
  const slugSource = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 4)
    .join('_');
  const fileScope = file
    .replace(/\\/g, '/')
    .replace(/^app\/|^components\//, '')
    .replace(/\/page\.tsx$|\/route\.tsx$|\.tsx$/, '')
    .split('/')
    .slice(-2)
    .join('.')
    .toLowerCase()
    .replace(/[^a-z0-9.]/g, '_');
  return `${fileScope}.${slugSource || 'text'}`;
}

async function run() {
  const enValues = await loadEnglishKeys();
  const wantJson = argv.includes('--json');
  const checkMode = argv.includes('--check');
  const jsonPath = wantJson ? argv[argv.indexOf('--json') + 1] : null;

  const findings = [];
  const byText = new Map();

  for (const dir of SCAN_DIRS) {
    const fullDir = join(ROOT, dir);
    if (!existsSync(fullDir)) continue;
    for await (const path of walkTsx(fullDir)) {
      const content = await readFile(path, 'utf8').catch(() => '');
      if (!content) continue;
      const candidates = extractFromContent(content);
      for (const c of candidates) {
        if (enValues.has(c.text)) continue; // already translated
        const rel = relative(ROOT, path);
        if (!byText.has(c.text)) {
          byText.set(c.text, {
            text: c.text,
            suggestedKey: suggestKey(c.text, rel),
            files: [],
          });
        }
        byText.get(c.text).files.push({ path: rel, line: c.line, kind: c.kind });
      }
    }
  }

  for (const f of byText.values()) findings.push(f);
  findings.sort((a, b) => b.files.length - a.files.length);

  if (jsonPath) {
    const fs = await import('node:fs/promises');
    await fs.writeFile(
      jsonPath,
      JSON.stringify({ generated: new Date().toISOString(), count: findings.length, findings }, null, 2),
    );
    console.log(`[extract-i18n] Wrote ${findings.length} candidates to ${jsonPath}`);
  } else {
    console.log(`[extract-i18n] Found ${findings.length} candidate strings without translation keys.`);
    console.log('[extract-i18n] Top 30 by usage:');
    console.log();
    for (const f of findings.slice(0, 30)) {
      console.log(`  "${f.text}"`);
      console.log(`    -> suggested key: ${f.suggestedKey}`);
      console.log(`    -> ${f.files.length} occurrence(s); first: ${f.files[0].path}:${f.files[0].line}`);
      console.log();
    }
    if (findings.length > 30) {
      console.log(`  ... and ${findings.length - 30} more (use --json to dump everything)`);
    }
  }

  if (checkMode && findings.length > 0) {
    console.error(`[extract-i18n] FAIL: ${findings.length} candidate strings need translation keys.`);
    exit(1);
  }
}

run().catch((e) => {
  console.error('[extract-i18n] Error:', e);
  exit(2);
});

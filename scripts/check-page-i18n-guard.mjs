#!/usr/bin/env node

import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const PAGE_GLOB = /^app\/.*\/page\.tsx$|^app\/page\.tsx$/;
const I18N_MARKERS = [
  "from '@/lib/i18n'",
  "from '@/lib/locale/LocaleProvider'",
  "from '@/lib/locale/useTranslation'",
  'pickLocaleCopy(',
  'useLocale(',
  'useTranslation(',
];

// Transitional allowlist for pages changed before this guard was introduced.
const ALLOWED_UNLOCALIZED_CHANGED_PAGES = new Set([
  'app/vault/safety/page.tsx',
]);

function sh(cmd) {
  return execSync(cmd, { encoding: 'utf8' }).trim();
}

function getChangedFiles() {
  let base;
  try {
    base = sh('git merge-base HEAD main');
  } catch {
    try {
      base = sh('git merge-base HEAD origin/main');
    } catch {
      base = null;
    }
  }

  if (!base) {
    console.log('[i18n-guard] Could not determine merge-base with main/origin/main. Skipping.');
    process.exit(0);
  }

  const committedOut = sh(`git diff --name-only ${base}...HEAD`);
  const stagedOut = sh('git diff --name-only --cached');
  const unstagedOut = sh('git diff --name-only');

  const combined = [committedOut, stagedOut, unstagedOut]
    .flatMap((chunk) => chunk.split('\n'))
    .map((s) => s.trim())
    .filter(Boolean);

  return [...new Set(combined)];
}

function hasI18nMarker(content) {
  return I18N_MARKERS.some((marker) => content.includes(marker));
}

const changed = getChangedFiles();
const changedPages = changed.filter((f) => PAGE_GLOB.test(f));

if (changedPages.length === 0) {
  console.log('[i18n-guard] No changed page.tsx files.');
  process.exit(0);
}

const violations = [];

for (const file of changedPages) {
  let content = '';
  try {
    content = readFileSync(file, 'utf8');
  } catch {
    continue;
  }

  if (!hasI18nMarker(content)) {
    if (ALLOWED_UNLOCALIZED_CHANGED_PAGES.has(file)) continue;
    violations.push(file);
  }
}

if (violations.length > 0) {
  console.error('[i18n-guard] Page files changed without i18n usage markers:');
  for (const file of violations) {
    console.error(` - ${file}`);
  }
  console.error('[i18n-guard] Add useLocale/useTranslation or i18n copy mapping before merging.');
  process.exit(1);
}

console.log(`[i18n-guard] OK: ${changedPages.length} changed page file(s) include i18n markers.`);

#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const repoRoot = process.cwd();
const appRoot = path.join(repoRoot, 'app');
const testsRoot = path.join(repoRoot, '__tests__', 'app');

function walk(dir) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...walk(full));
    } else {
      out.push(full);
    }
  }
  return out;
}

function normalizeRoute(pagePath) {
  const rel = path.relative(appRoot, pagePath).replaceAll(path.sep, '/');
  const route = rel.replace(/(^|\/)page\.tsx$/, '');
  if (route === '') return '/';
  return '/' + route;
}

function routeFromImport(importPath) {
  const cleaned = importPath
    .replace(/^\.\.\/\.\.\/app\//, '')
    .replace(/^\.\.\/app\//, '')
    .replace(/(^|\/)page$/, '');

  if (cleaned === '') return '/';
  return '/' + cleaned;
}

const pageFiles = walk(appRoot)
  .filter((f) => f.endsWith('/page.tsx'))
  .filter((f) => !f.includes('/app/api/'));

const routes = pageFiles
  .map((f) => ({ file: path.relative(repoRoot, f).replaceAll(path.sep, '/'), route: normalizeRoute(f) }))
  .sort((a, b) => a.route.localeCompare(b.route));

const testFiles = walk(testsRoot).filter((f) => f.endsWith('.test.tsx'));

const directCoverage = new Map();
for (const t of testFiles) {
  const src = fs.readFileSync(t, 'utf8');
  const relTest = path.relative(repoRoot, t).replaceAll(path.sep, '/');

  const rx = /require\(['\"](\.\.\/\.\.\/app(?:\/[^'\"]+)?\/page)['\"]\)/g;
  let match;
  while ((match = rx.exec(src)) !== null) {
    const route = routeFromImport(match[1]);
    if (!directCoverage.has(route)) directCoverage.set(route, []);
    directCoverage.get(route).push(relTest);
  }
}

const covered = [];
const missing = [];
for (const item of routes) {
  const tests = directCoverage.get(item.route) || [];
  if (tests.length > 0) {
    covered.push({ ...item, tests: [...new Set(tests)].sort() });
  } else {
    missing.push(item);
  }
}

const reportPath = path.join(repoRoot, 'FRONTEND_PAGE_COVERAGE_AUDIT.md');
const lines = [];
lines.push('# Frontend Page Coverage Audit');
lines.push('');
lines.push(`Generated: ${new Date().toISOString()}`);
lines.push('');
lines.push(`Total routes: ${routes.length}`);
lines.push(`Directly covered routes: ${covered.length}`);
lines.push(`Missing direct route tests: ${missing.length}`);
lines.push('');
lines.push('## Covered Routes');
lines.push('');
for (const item of covered) {
  lines.push(`- ${item.route} -> ${item.tests.join(', ')}`);
}
lines.push('');
lines.push('## Missing Routes');
lines.push('');
for (const item of missing) {
  lines.push(`- ${item.route} (${item.file})`);
}

fs.writeFileSync(reportPath, lines.join('\n') + '\n', 'utf8');

console.log(`Coverage audit written to ${path.relative(repoRoot, reportPath)}`);
console.log(`Covered ${covered.length}/${routes.length}; missing ${missing.length}`);

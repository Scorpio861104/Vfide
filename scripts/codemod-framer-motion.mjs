#!/usr/bin/env node
/**
 * PERF-6 FIX: framer-motion eager-import code-mod.
 *
 * Background:
 *   355 files in the codebase eagerly import `motion` from
 *   `framer-motion`. Each of those is a route-tree leaf that pulls
 *   the entire framer-motion runtime (~50KB gzipped) into the
 *   client bundle, even when only `<motion.div>` is used.
 *
 *   framer-motion ships a tree-shakeable surface called `m` that
 *   pairs with `LazyMotion` + `domAnimation` (loaded on-demand). The
 *   bundle savings are substantial: ~30–40 KB per route, multiplied
 *   across 355 leaves.
 *
 * What this script does:
 *   - Walks the codebase for files that import `motion` (and/or
 *     `AnimatePresence`, `useReducedMotion`, `useAnimation`, etc.)
 *     from `framer-motion`
 *   - Reports each call site
 *   - In `--apply` mode: rewrites imports to use `m` and `LazyMotion`
 *     wrappers (one per file)
 *   - In `--report` mode (default): just prints the plan; touches
 *     nothing
 *
 * Why it doesn't apply automatically by default:
 *   The transformation is mechanical, but the LazyMotion wrapper
 *   needs a parent boundary to avoid wrapping on every render. For
 *   a careful migration, the recommended path is:
 *
 *   1. Run with `--report` to see the impact surface.
 *   2. Add a single root-level <LazyMotion features={domAnimation}>
 *      wrapper in app/layout.tsx (or app/providers.tsx).
 *   3. Run with `--apply` to rewrite all `motion.X` to `m.X`.
 *   4. Spot-check a few high-traffic routes; rebuild; verify bundle.
 *
 *   Step 2 is a manual one-line edit that should NOT be done by the
 *   code-mod (the file structure varies and a wrong placement breaks
 *   every animation).
 *
 * Usage:
 *   node scripts/codemod-framer-motion.mjs                 # report only
 *   node scripts/codemod-framer-motion.mjs --apply         # rewrite imports
 *   node scripts/codemod-framer-motion.mjs --apply --diff  # also dump diffs
 */

import { readdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, relative, extname } from 'node:path';
import { argv, exit, cwd } from 'node:process';

const ROOT = cwd();
const SCAN_DIRS = ['app', 'components', 'lib'];
const APPLY = argv.includes('--apply');
const SHOW_DIFF = argv.includes('--diff');

// Only the named exports we know are safe to rewrite from `motion` to
// `m` (or to leave untouched). `AnimatePresence`, hooks, etc. don't
// have an `m`-equivalent — they're already lazy-friendly.
const _REWRITE_NAMED = new Set(['motion']);
const _KEEP_AS_IS = new Set([
  'AnimatePresence',
  'useReducedMotion',
  'useAnimation',
  'useMotionValue',
  'useTransform',
  'useScroll',
  'useSpring',
  'useInView',
  'useViewportScroll',
  'usePresence',
  'LazyMotion',
  'domAnimation',
  'domMax',
  'm',
]);

async function* walkSource(dir) {
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
      yield* walkSource(path);
    } else {
      const ext = extname(entry.name);
      if (ext === '.tsx' || ext === '.ts' || ext === '.jsx' || ext === '.js') {
        yield path;
      }
    }
  }
}

/**
 * Find the framer-motion import line(s). Returns null if none.
 *
 * Recognized shapes:
 *   import { motion } from 'framer-motion'
 *   import { motion, AnimatePresence } from 'framer-motion'
 *   import { motion as M, AnimatePresence } from 'framer-motion'
 *
 * Does NOT handle:
 *   import * as fm from 'framer-motion'        // namespace import
 *   require('framer-motion')                    // CJS
 *   dynamic-import patterns                     // already lazy
 *
 * Files using namespace or CJS imports are skipped with a notice;
 * they need manual review.
 */
function analyzeFile(content) {
  const lines = content.split('\n');
  const findings = [];

  // Match named import lines from 'framer-motion'
  const namedImportRe = /^\s*import\s*\{([^}]+)\}\s*from\s*['"]framer-motion['"]\s*;?\s*$/;
  // Match namespace import (we skip these but want to flag them)
  const nsImportRe = /^\s*import\s*\*\s*as\s*\w+\s*from\s*['"]framer-motion['"]\s*;?\s*$/;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const ns = nsImportRe.exec(line);
    if (ns) {
      findings.push({ line: i + 1, kind: 'namespace', text: line, skip: true });
      continue;
    }
    const m = namedImportRe.exec(line);
    if (!m) continue;
    const namedList = m[1].split(',').map((s) => s.trim()).filter(Boolean);
    const named = namedList.map((entry) => {
      // Handle "motion as M" rename
      const aliasMatch = /^(\w+)\s+as\s+(\w+)$/.exec(entry);
      if (aliasMatch) return { local: aliasMatch[2], imported: aliasMatch[1] };
      return { local: entry, imported: entry };
    });
    const hasMotion = named.some((n) => n.imported === 'motion');
    findings.push({ line: i + 1, kind: 'named', text: line, named, hasMotion, skip: false });
  }

  return findings;
}

/**
 * Rewrite the file content, replacing `motion.X` (JSX or method) with
 * `m.X` and updating the import line. Conservative: only rewrites if
 * the local name was `motion` (no aliases — those need manual review
 * to avoid clashing with another local `motion` somewhere).
 */
function rewriteContent(content, finding) {
  if (finding.skip || !finding.hasMotion) return content;
  // Confirm the local name is exactly "motion" (no alias)
  const motionEntry = finding.named.find((n) => n.imported === 'motion');
  if (!motionEntry || motionEntry.local !== 'motion') return content;

  const newNamed = finding.named.map((n) => {
    if (n.imported === 'motion') return 'm';
    if (n.imported === n.local) return n.imported;
    return `${n.imported} as ${n.local}`;
  });
  const newImportLine = `import { ${newNamed.join(', ')} } from 'framer-motion';`;

  // Replace the import line
  const lines = content.split('\n');
  lines[finding.line - 1] = newImportLine;
  let newContent = lines.join('\n');

  // Rewrite usages: `motion.X` → `m.X`. Use word boundary so we
  // don't touch e.g. `myMotion`.
  // The lookbehind `(?<!\.)` prevents rewriting `obj.motion.div` (rare).
  newContent = newContent.replace(/(?<!\.)\bmotion\.(\w+)/g, 'm.$1');

  // Also rewrite bare `motion` references inside generics or JSX
  // attributes (rare but real, e.g. `<motion.custom as={motion.div}>`).
  // Conservative pattern: only inside JSX expression containers.
  // Skipped here because the regex required to do it safely would
  // be too brittle. The named-rewrite above catches the vast
  // majority of cases.

  return newContent;
}

async function main() {
  const filesScanned = [];
  const filesToRewrite = [];
  const filesNamespace = [];
  let motionUsageTotal = 0;

  for (const dir of SCAN_DIRS) {
    const fullDir = join(ROOT, dir);
    if (!existsSync(fullDir)) continue;
    for await (const path of walkSource(fullDir)) {
      const content = await readFile(path, 'utf8').catch(() => '');
      if (!content) continue;
      filesScanned.push(path);
      const findings = analyzeFile(content);
      if (findings.length === 0) continue;
      const motionUsage = (content.match(/(?<!\.)\bmotion\.\w+/g) || []).length;
      motionUsageTotal += motionUsage;
      const hasMotion = findings.some((f) => f.hasMotion && !f.skip);
      const hasNs = findings.some((f) => f.kind === 'namespace');
      if (hasNs) filesNamespace.push(path);
      if (hasMotion) {
        filesToRewrite.push({ path, findings, motionUsage });
      }
    }
  }

  console.log(`[codemod-framer-motion] scanned ${filesScanned.length} files`);
  console.log(`[codemod-framer-motion] ${filesToRewrite.length} files import \`motion\` and would be rewritten`);
  console.log(`[codemod-framer-motion] ~${motionUsageTotal} \`motion.X\` usages to convert to \`m.X\``);
  if (filesNamespace.length > 0) {
    console.log(`[codemod-framer-motion] ${filesNamespace.length} files use \`import * as\` from framer-motion (manual review):`);
    for (const p of filesNamespace) console.log(`    ${relative(ROOT, p)}`);
  }

  if (!APPLY) {
    console.log();
    console.log('[codemod-framer-motion] Top 20 files by motion-usage count:');
    filesToRewrite
      .slice()
      .sort((a, b) => b.motionUsage - a.motionUsage)
      .slice(0, 20)
      .forEach(({ path, motionUsage }) => {
        console.log(`    ${motionUsage.toString().padStart(4)} usages  ${relative(ROOT, path)}`);
      });
    console.log();
    console.log('[codemod-framer-motion] Run with --apply to rewrite. BEFORE applying:');
    console.log('  1. Add <LazyMotion features={domAnimation}> at the app root (app/layout.tsx');
    console.log('     or app/providers.tsx). Without this wrapper, `m.X` will not animate.');
    console.log('  2. Commit any pending changes first; --apply mutates files in place.');
    console.log('  3. After applying: run typecheck and visual smoke tests.');
    return;
  }

  // Apply mode
  console.log();
  console.log('[codemod-framer-motion] APPLY mode — rewriting files in place...');
  let written = 0;
  for (const { path, findings } of filesToRewrite) {
    const original = await readFile(path, 'utf8');
    let content = original;
    // Apply each named-import finding (typically only one per file,
    // but loop in case a file has multiple framer-motion imports).
    for (const f of findings) {
      content = rewriteContent(content, f);
    }
    if (content !== original) {
      await writeFile(path, content, 'utf8');
      written++;
      if (SHOW_DIFF) {
        console.log(`--- ${relative(ROOT, path)}`);
        // Mini-diff: show only changed lines for quick review
        const oldLines = original.split('\n');
        const newLines = content.split('\n');
        for (let i = 0; i < Math.max(oldLines.length, newLines.length); i++) {
          if (oldLines[i] !== newLines[i]) {
            if (oldLines[i] !== undefined) console.log(`-  ${oldLines[i]}`);
            if (newLines[i] !== undefined) console.log(`+  ${newLines[i]}`);
          }
        }
      }
    }
  }
  console.log(`[codemod-framer-motion] rewrote ${written} files`);
  console.log();
  console.log('Next steps:');
  console.log('  1. Run npm run typecheck — should pass without errors.');
  console.log('  2. Run npm run build — verify bundle size dropped.');
  console.log('  3. Smoke-test high-traffic routes: /, /pay, /merchant/dashboard.');
  console.log('  4. If ANY animation looks broken, revert with git checkout and investigate.');
}

main().catch((e) => {
  console.error('[codemod-framer-motion] error:', e);
  exit(1);
});

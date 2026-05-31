#!/usr/bin/env node
// Lists files modified during the button-functionality sweep
// (Round 2). Used to generate the manifest and tarball for the user.

const fs = require('fs');
const path = require('path');

const round2Files = [
  'AUDIT_SWEEP_FINAL.md',
  'BUTTON_AUDIT.md',
  'scripts/button-functionality-audit.cjs',
  'scripts/list-modified-files.cjs',

  // Real defects fixed
  'app/live-demo/page.tsx',
  'app/buy/components/SwapTab.tsx',
  'app/sanctum/components/DonateTab.tsx',
  'app/vesting/components/ClaimTab.tsx',
  'app/vesting/page.tsx',

  // Decorative button annotations
  'app/theme-manager/page.tsx',
  'app/theme/components/PreviewTab.tsx',
];

const repoRoot = path.resolve(__dirname, '..');
let ok = 0, missing = 0;
for (const f of round2Files) {
  const p = path.join(repoRoot, f);
  if (fs.existsSync(p)) {
    const st = fs.statSync(p);
    console.log(`  ${f}  (${st.size} bytes)`);
    ok++;
  } else {
    console.log(`  MISSING: ${f}`);
    missing++;
  }
}
console.log(`\n  ${ok} present, ${missing} missing`);

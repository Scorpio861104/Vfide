#!/usr/bin/env node

const { spawnSync } = require('node:child_process');

const isCi = process.env.CI === 'true' || process.env.GITHUB_ACTIONS === 'true' || process.env.VERCEL === '1';

if (isCi) {
  console.log('[postinstall] CI/deployment environment detected; skipping validate:env');
  process.exit(0);
}

console.log('[postinstall] Running validate:env for local/developer install');
const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const result = spawnSync(npmCmd, ['run', 'validate:env'], {
  stdio: 'inherit',
  env: process.env,
});

process.exit(result.status ?? 1);

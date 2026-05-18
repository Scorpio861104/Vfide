import os from 'node:os';
import { spawn } from 'node:child_process';

const args = process.argv.slice(2);
const command = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const heartbeatMs = 15000;

const child = spawn(command, ['tsc', ...args], {
  env: process.env,
  stdio: ['ignore', 'pipe', 'pipe'],
});

let lastOutputAt = Date.now();

const heartbeat = setInterval(() => {
  if (Date.now() - lastOutputAt < heartbeatMs) {
    return;
  }

  process.stdout.write('[typecheck] still running...\n');
  lastOutputAt = Date.now();
}, heartbeatMs);

heartbeat.unref?.();

const forward = (stream, target) => {
  stream.on('data', (chunk) => {
    lastOutputAt = Date.now();
    target.write(chunk);
  });
};

forward(child.stdout, process.stdout);
forward(child.stderr, process.stderr);

child.on('error', (error) => {
  clearInterval(heartbeat);
  console.error('[typecheck] failed to start:', error.message);
  process.exit(1);
});

child.on('exit', (code, signal) => {
  clearInterval(heartbeat);

  if (signal) {
    const signalCode = os.constants.signals[signal] ?? 0;
    console.error(`[typecheck] terminated by ${signal}`);
    process.exit(signalCode > 0 ? 128 + signalCode : 1);
  }

  process.exit(code ?? 1);
});
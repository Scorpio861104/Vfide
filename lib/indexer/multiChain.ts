/**
 * XCHAIN-2 FIX: multi-chain indexer wrapper.
 *
 * The existing indexer (`service.ts`) is hardcoded to a single chain
 * via the `NEXT_PUBLIC_CHAIN_ID` envvar. For multi-chain deploys
 * (Base + Polygon + zkSync, for example), this wrapper spawns the
 * indexer once per chain in `NEXT_PUBLIC_SUPPORTED_CHAIN_IDS` and
 * isolates each chain's state via:
 *   - Chain-scoped envvars (NEXT_PUBLIC_*_ADDRESS_<chainId> via XCHAIN-1)
 *   - Chain-scoped indexer state in DB (column: chain_id)
 *   - Chain-scoped RPC URLs (NEXT_PUBLIC_RPC_URL_<chainId>)
 *
 * This is the option-1 approach documented in DEPLOYMENT.md ("one
 * indexer process per chain"). It's lower-risk than trying to merge
 * all chains into a single event loop because:
 *   - Each chain's tip moves at a different rate; one indexer per chain
 *     means one chain's lag doesn't block another
 *   - Different chains have different reorg behaviors (Polygon needs
 *     deeper confirmation than Base); per-chain config is cleaner
 *   - Failure of one chain's RPC doesn't take the others down
 *   - Easier to observe (one log stream per chain) and debug
 *
 * Usage from operations:
 *   # Run as a single supervised process spawning N child indexers:
 *   node lib/indexer/multiChain.js
 *
 *   # Or spawn each indexer manually (cleaner for systemd/k8s):
 *   NEXT_PUBLIC_CHAIN_ID=8453 npm run indexer:start
 *   NEXT_PUBLIC_CHAIN_ID=137  npm run indexer:start
 *   NEXT_PUBLIC_CHAIN_ID=324  npm run indexer:start
 *
 * The wrapper handles supervision: if a chain's indexer crashes, it
 * restarts after a backoff. Crashes are logged but don't take other
 * chains down.
 */

import { spawn, type ChildProcess } from 'node:child_process';
import { logger } from '@/lib/logger';

interface ChildState {
  chainId: number;
  process: ChildProcess | null;
  restartCount: number;
  lastRestartAt: number;
}

const RESTART_BACKOFF_MS = 5_000;
const MAX_RESTART_BACKOFF_MS = 5 * 60_000; // 5 minutes
const RESTART_BURST_WINDOW_MS = 60_000; // 1 minute
const MAX_RESTARTS_IN_WINDOW = 5;

const childStates = new Map<number, ChildState>();

function getSupportedChainIds(): number[] {
  const raw = process.env.NEXT_PUBLIC_SUPPORTED_CHAIN_IDS;
  if (!raw) {
    // Fall back to single-chain mode (the current legacy behavior)
    const single = process.env.NEXT_PUBLIC_CHAIN_ID;
    if (single) return [Number.parseInt(single, 10)];
    throw new Error(
      'multiChain indexer: neither NEXT_PUBLIC_SUPPORTED_CHAIN_IDS nor NEXT_PUBLIC_CHAIN_ID is set. ' +
        'For multi-chain deploys, set the comma-separated list. For single-chain, set the legacy single id.',
    );
  }
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => Number.parseInt(s, 10))
    .filter((n) => Number.isFinite(n));
}

function startChildIndexer(chainId: number): void {
  const state = childStates.get(chainId);
  if (!state) {
    childStates.set(chainId, { chainId, process: null, restartCount: 0, lastRestartAt: 0 });
  }

  const current = childStates.get(chainId)!;

  // Burst-rate-limit: if a chain has restarted N times in the last
  // minute, give up and stop trying. This prevents tight crash loops
  // from a chain that's misconfigured (e.g. wrong RPC URL).
  const sinceLastRestart = Date.now() - current.lastRestartAt;
  if (sinceLastRestart < RESTART_BURST_WINDOW_MS && current.restartCount >= MAX_RESTARTS_IN_WINDOW) {
    logger.error(
      `[multiChain-indexer] chain ${chainId}: ${current.restartCount} crashes in ${RESTART_BURST_WINDOW_MS / 1000}s. Halting auto-restart. Investigate config and restart manually.`,
    );
    return;
  }

  // Backoff scales with restart count, capped.
  const backoff = Math.min(RESTART_BACKOFF_MS * 2 ** current.restartCount, MAX_RESTART_BACKOFF_MS);

  logger.info(
    `[multiChain-indexer] starting indexer for chain ${chainId} (restart #${current.restartCount}, backoff ${backoff}ms)`,
  );

  setTimeout(() => {
    const child = spawn(
      'node',
      ['--require=tsx/cjs', 'lib/indexer/service.ts'],
      {
        env: {
          ...process.env,
          // Pin this child to a specific chain. The existing service.ts
          // already reads NEXT_PUBLIC_CHAIN_ID, so we just set it per
          // child. The chain-scoped envvars (NEXT_PUBLIC_*_ADDRESS_<chainId>)
          // are resolved by lib/contracts.ts when the child reads them.
          NEXT_PUBLIC_CHAIN_ID: String(chainId),
          // Chain-specific RPC URL if set, fall back to generic
          NEXT_PUBLIC_RPC_URL:
            process.env[`NEXT_PUBLIC_RPC_URL_${chainId}`] ||
            process.env.NEXT_PUBLIC_RPC_URL ||
            '',
          // Chain-specific tuning. Polygon needs deeper confirmation
          // depth due to reorg behavior; Base/zkSync are fine with
          // the default. Operators can override via env if needed.
          INDEXER_CONFIRMATION_DEPTH:
            process.env[`INDEXER_CONFIRMATION_DEPTH_${chainId}`] ||
            process.env.INDEXER_CONFIRMATION_DEPTH ||
            (chainId === 137 || chainId === 80002 ? '20' : '2'),
        },
        stdio: ['ignore', 'pipe', 'pipe'],
      },
    );

    current.process = child;
    current.lastRestartAt = Date.now();
    current.restartCount++;

    child.stdout?.on('data', (chunk: Buffer) => {
      // Tag every log line with the chain so a multi-chain log stream
      // is sortable.
      const lines = chunk.toString('utf8').split('\n').filter(Boolean);
      for (const line of lines) {
        process.stdout.write(`[chain:${chainId}] ${line}\n`);
      }
    });
    child.stderr?.on('data', (chunk: Buffer) => {
      const lines = chunk.toString('utf8').split('\n').filter(Boolean);
      for (const line of lines) {
        process.stderr.write(`[chain:${chainId}] ${line}\n`);
      }
    });

    child.on('exit', (code, signal) => {
      logger.warn(
        `[multiChain-indexer] chain ${chainId} indexer exited (code=${code}, signal=${signal})`,
      );
      current.process = null;
      // Auto-restart unless the parent is shutting down.
      if (!shuttingDown) startChildIndexer(chainId);
    });
  }, backoff);
}

let shuttingDown = false;

function gracefulShutdown(signal: string): void {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info(`[multiChain-indexer] received ${signal}, stopping all chain indexers...`);
  for (const state of childStates.values()) {
    if (state.process) {
      state.process.kill('SIGTERM');
    }
  }
  // Give children up to 30s to shut down cleanly, then exit.
  setTimeout(() => process.exit(0), 30_000);
}

export function startMultiChainIndexer(): void {
  const chainIds = getSupportedChainIds();
  if (chainIds.length === 0) {
    throw new Error('multiChain indexer: no chain IDs to index');
  }
  logger.info(`[multiChain-indexer] starting indexer for ${chainIds.length} chain(s): ${chainIds.join(', ')}`);

  for (const chainId of chainIds) {
    startChildIndexer(chainId);
  }

  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
}

// Run if invoked directly
if (typeof require !== 'undefined' && require.main === module) {
  startMultiChainIndexer();
}

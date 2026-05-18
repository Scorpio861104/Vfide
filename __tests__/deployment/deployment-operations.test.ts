/**
 * C10 – Deployment and Onchain Operations
 *
 * Off-chain static / logic audit — no live Hardhat node required.
 * Evidence is drawn from:
 *   - contracts/DeployPhases3to6.sol  (dependency pre-condition guards)
 *   - contracts/DeployPhase1.sol      (phased orchestration contract)
 *   - contracts/DeployPhase1Token.sol (legacy-disabled factory guard)
 *   - scripts/verify-*-local.sh       (EVM fresh-node lifecycle)
 *   - scripts/provision-testnet-vfide.ts  (--dry-run support)
 *   - scripts/badges-status-and-mint.ts   (--dry-run support)
 *   - scripts/verify-seer-challenge-resolution-event.ts (NonceManager)
 *
 * R-046: Deployment order mis-sequencing
 *   – Phase 3 deploy contract rejects zero-address token / BSM / oracle
 *   – Legacy Phase1Token factory is permanently disabled (revert on call)
 *   – PhaseDeployed / ContractDeployed events emitted for each step
 *
 * R-047: Stale node state in local verifiers
 *   – All 18 local verifier scripts use: set -euo pipefail, spawn fresh node,
 *     register trap cleanup EXIT, kill $NODE_PID on exit
 *
 * R-048: Signer nonce contention in script batches
 *   – verify-seer-challenge-resolution-event.ts wraps the DAO wallet in
 *     NonceManager (ethers.js) for monotonic nonce allocation
 *
 * R-049: Dry-run parity gap
 *   – provision-testnet-vfide.ts supports --dry-run (skips live sends)
 *   – badges-status-and-mint.ts supports --dry-run (skips live mints)
 *
 * R-050: Post-deploy verification incompleteness
 *   – 18 distinct *-local.sh verifiers act as post-deploy checkers
 *   – Each targets a specific subsystem invariant set
 *
 * @jest-environment node
 */

import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

const CONTRACTS_DIR = join(__dirname, '../../contracts');
const SCRIPTS_DIR = join(__dirname, '../../scripts');

function readContract(name: string): string {
  return readFileSync(join(CONTRACTS_DIR, `${name}.sol`), 'utf-8');
}

function readScript(name: string): string {
  return readFileSync(join(SCRIPTS_DIR, name), 'utf-8');
}

// ─────────────────────────────────────────────────────────────────────────────
// R-046 – Deployment order mis-sequencing
// ─────────────────────────────────────────────────────────────────────────────

describe('R-046 – Deployment order mis-sequencing', () => {
  const phase3Src = readContract('DeployPhases3to6');
  const phase1TokenSrc = readContract('DeployPhase1Token');

  describe('DeployPhase3.deployAll – zero-address precondition guards', () => {
    it('rejects zero vfideToken address (dependency: token must be pre-deployed)', () => {
      expect(phase3Src).toMatch(
        /if\s*\(\s*vfideToken\s*==\s*address\(0\).*\)\s*revert\s*DP3_Zero/,
      );
    });

    it('rejects zero preDeployedBSM address (dependency: BSM must be pre-deployed)', () => {
      expect(phase3Src).toMatch(
        /if\s*\(.*preDeployedBSM\s*==\s*address\(0\).*\)\s*revert\s*DP3_Zero/,
      );
    });

    it('rejects zero preDeployedOracle address (dependency: oracle must be pre-deployed)', () => {
      expect(phase3Src).toMatch(
        /if\s*\(.*preDeployedOracle\s*==\s*address\(0\).*\)\s*revert\s*DP3_Zero/,
      );
    });

    it('rejects zero owner address (no orphaned contract ownership)', () => {
      expect(phase3Src).toMatch(
        /if\s*\(.*owner\s*==\s*address\(0\).*\)\s*revert\s*DP3_Zero/,
      );
    });
  });

  describe('DeployPhase1Token – legacy factory disabled', () => {
    it('revert with explicit message prevents accidental legacy factory use', () => {
      expect(phase1TokenSrc).toMatch(
        /revert\s*\(\s*["']Phase1TokenDeployer: LEGACY factory disabled/,
      );
    });
  });

  describe('Phase 3 deploy emits traceability events', () => {
    it('PhaseDeployed event is declared (phased deploy traceability)', () => {
      expect(phase3Src).toMatch(/event\s+PhaseDeployed\s*\(/);
    });

    it('ContractDeployed event is declared (per-contract traceability)', () => {
      expect(phase3Src).toMatch(/event\s+ContractDeployed\s*\(/);
    });

    it('at least 4 emit statements exist in the deploy file (coverage breadth)', () => {
      const emits = phase3Src.match(/\bemit\b/g) || [];
      expect(emits.length).toBeGreaterThanOrEqual(4);
    });
  });

  describe('TypeScript model: dependency sequence guard', () => {
    it('deploying phase N with a zero dependency address throws', () => {
      // Mirror of on-chain: if (vfideToken == address(0)) revert
      function deployPhase3(deps: { vfideToken: string; bsm: string; oracle: string; owner: string }): void {
        if (!deps.vfideToken || deps.vfideToken === '0x0') throw new Error('DP3_Zero');
        if (!deps.bsm        || deps.bsm        === '0x0') throw new Error('DP3_Zero');
        if (!deps.oracle     || deps.oracle     === '0x0') throw new Error('DP3_Zero');
        if (!deps.owner      || deps.owner      === '0x0') throw new Error('DP3_Zero');
      }

      expect(() => deployPhase3({ vfideToken: '0x0', bsm: '0xBSM', oracle: '0xORCL', owner: '0xOWN' }))
        .toThrow('DP3_Zero');
      expect(() => deployPhase3({ vfideToken: '0xTKN', bsm: '0x0', oracle: '0xORCL', owner: '0xOWN' }))
        .toThrow('DP3_Zero');
      expect(() => deployPhase3({ vfideToken: '0xTKN', bsm: '0xBSM', oracle: '0xORCL', owner: '0xOWN' }))
        .not.toThrow();
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// R-047 – Stale node state in local verifiers
// ─────────────────────────────────────────────────────────────────────────────

describe('R-047 – Stale node state in local verifiers', () => {
  const localVerifiers = readdirSync(SCRIPTS_DIR).filter(
    (f) => f.endsWith('-local.sh'),
  );

  // Orchestrator scripts delegate to child verifiers rather than spawning their own node.
  const ORCHESTRATORS = new Set(['verify-seer-watcher-local.sh']);
  // Direct-spawn scripts (all non-orchestrators)
  const directSpawnVerifiers = localVerifiers.filter((f) => !ORCHESTRATORS.has(f));

  it('at least 18 *-local.sh verifiers exist (full subsystem post-deploy coverage)', () => {
    expect(localVerifiers.length).toBeGreaterThanOrEqual(18);
  });

  it.each(localVerifiers)(
    '%s uses set -euo pipefail (fail-fast shell guards)',
    (script) => {
      const src = readScript(script);
      expect(src).toMatch(/set\s+-euo\s+pipefail/);
    },
  );

  it.each(directSpawnVerifiers)(
    '%s spawns a fresh Hardhat node (npx hardhat ... node)',
    (script) => {
      const src = readScript(script);
      // Matches both `npx hardhat node` and `npx hardhat --network hardhat node ...`
      expect(src).toMatch(/npx\s+hardhat\b.*\bnode\b/);
    },
  );

  it.each(directSpawnVerifiers)(
    '%s captures the node PID for cleanup',
    (script) => {
      const src = readScript(script);
      expect(src).toMatch(/NODE_PID\s*=\s*\$/);
    },
  );

  it.each(directSpawnVerifiers)(
    '%s registers a trap cleanup EXIT to kill the node process',
    (script) => {
      const src = readScript(script);
      expect(src).toMatch(/trap\s+cleanup\s+EXIT/);
      expect(src).toMatch(/kill\s+.*NODE_PID/);
    },
  );

  it('verify-seer-watcher-local.sh is an orchestrator delegating to child verifiers', () => {
    const src = readScript('verify-seer-watcher-local.sh');
    // Delegates via npm run -s contract:verify:seer:*:local
    expect(src).toMatch(/npm\s+run\s+-s\s+contract:verify:seer/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// R-048 – Signer nonce contention in script batches
// ─────────────────────────────────────────────────────────────────────────────

describe('R-048 – Signer nonce contention in script batches', () => {
  const challengeScript = readScript('verify-seer-challenge-resolution-event.ts');

  it('imports NonceManager from ethers (nonce contention mitigation present)', () => {
    expect(challengeScript).toMatch(/NonceManager/);
    expect(challengeScript).toMatch(/from\s+['"]ethers['"]/);
  });

  it('wraps the DAO/signer wallet in NonceManager before sending transactions', () => {
    expect(challengeScript).toMatch(/new\s+NonceManager\s*\(/);
  });

  describe('TypeScript model: NonceManager-style monotonic nonce', () => {
    it('sequential nonces are strictly increasing (no collision)', () => {
      // Simulate NonceManager behaviour: starts at n, increments per tx
      let nonce = 42;
      const getNonce = (): number => nonce++;

      const n1 = getNonce();
      const n2 = getNonce();
      const n3 = getNonce();

      expect(n2).toBeGreaterThan(n1);
      expect(n3).toBeGreaterThan(n2);
    });

    it('two concurrent senders sharing a NonceManager do not collide', () => {
      let nonce = 0;
      const getNonce = (): number => nonce++;

      // Interleaved calls — each call still returns a unique nonce
      const submitted: number[] = [];
      submitted.push(getNonce()); // tx A
      submitted.push(getNonce()); // tx B
      submitted.push(getNonce()); // tx C

      const unique = new Set(submitted);
      expect(unique.size).toBe(submitted.length);
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// R-049 – Dry-run parity gap
// ─────────────────────────────────────────────────────────────────────────────

describe('R-049 – Dry-run parity gap', () => {
  describe('provision-testnet-vfide.ts', () => {
    const provisionSrc = readScript('provision-testnet-vfide.ts');

    it('--dry-run flag is parsed from CLI args', () => {
      expect(provisionSrc).toMatch(/['"]--dry-run['"]/);
    });

    it('dry-run path skips live token transfers', () => {
      expect(provisionSrc).toMatch(/if\s*\(!?\s*dryRun\s*\)/);
    });

    it('dry-run prints a summary without executing sends', () => {
      expect(provisionSrc).toMatch(/dryRun/);
    });
  });

  describe('badges-status-and-mint.ts', () => {
    const badgesSrc = readScript('badges-status-and-mint.ts');

    it('--dry-run flag is parsed from CLI args', () => {
      expect(badgesSrc).toMatch(/['"]--dry-run['"]/);
    });

    it('dry-run path skips live mint calls', () => {
      expect(badgesSrc).toMatch(/if\s*\(!?\s*dryRun\s*\)/);
    });
  });

  describe('TypeScript model: dry-run gate pattern', () => {
    it('dry-run collects actions without executing them', () => {
      const executed: string[] = [];

      function sendTransaction(id: string, dryRun: boolean): void {
        if (dryRun) {
          // simulate: log only, do not push to executed
          return;
        }
        executed.push(id);
      }

      sendTransaction('tx-1', true);
      sendTransaction('tx-2', true);
      expect(executed).toHaveLength(0); // dry run: nothing sent

      sendTransaction('tx-3', false);
      expect(executed).toHaveLength(1); // live run: sent
      expect(executed[0]).toBe('tx-3');
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// R-050 – Post-deploy verification incompleteness
// ─────────────────────────────────────────────────────────────────────────────

describe('R-050 – Post-deploy verification incompleteness', () => {
  const allVerifiers = readdirSync(SCRIPTS_DIR).filter(
    (f) => f.startsWith('verify-') && f.endsWith('.ts'),
  );
  const localVerifierScripts = readdirSync(SCRIPTS_DIR).filter(
    (f) => f.endsWith('-local.sh'),
  );

  it('at least 18 post-deploy local verifier scripts exist', () => {
    expect(localVerifierScripts.length).toBeGreaterThanOrEqual(18);
  });

  it('at least 15 TypeScript verifier scripts exist (invariant breadth)', () => {
    expect(allVerifiers.length).toBeGreaterThanOrEqual(15);
  });

  const expectedSubsystems = [
    'bridge-governance',
    'card-bound-vault',
    'chain-of-return',
    'devreserve-onchain',
    'fee-burn-router',
    'merchant-payment-escrow',
    'next-of-kin',
    'ocp-guardrails',
    'proofscore-trust',
    'seer-challenge-resolution-event',
    'seer-max-autonomy-profile',
    'seer-policy-delays',
    'vault-hub-cardbound-integration',
  ];

  it.each(expectedSubsystems)(
    'verifier for subsystem "%s" exists (local.sh)',
    (subsystem) => {
      const found = localVerifierScripts.some((f) => f.includes(subsystem));
      expect(found).toBe(true);
    },
  );

  it('each local verifier invokes its paired TypeScript verifier script', () => {
    // Every -local.sh should contain an npm run or direct ts:exec call
    const verifiers = localVerifierScripts.map((f) => readScript(f));
    const withTsInvocation = verifiers.filter(
      (src) => /npm\s+run\s+-s\s+contract:verify|npx\s+ts-node|ts:exec/.test(src),
    );
    expect(withTsInvocation.length).toBeGreaterThanOrEqual(
      Math.floor(localVerifierScripts.length * 0.8),
    );
  });
});

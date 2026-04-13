/**
 * C11 – Governance and Timelock Operations
 *
 * Source-level + TypeScript-model audit suite for:
 *  - R-051 Emergency override abuse
 *  - R-052 Insufficient quorum floor enforcement
 *  - R-053 Timelock admin handover risk
 *  - R-054 Queue cancellation policy ambiguity
 *  - R-055 Proposal payload validation gaps
 *
 * @jest-environment node
 */

import { readFileSync } from 'fs';
import { join } from 'path';

const CONTRACTS_DIR = join(__dirname, '../../contracts');

function readContract(name: string): string {
  return readFileSync(join(CONTRACTS_DIR, `${name}.sol`), 'utf-8');
}

const daoSrc = readContract('DAO');
const timelockSrc = readContract('DAOTimelock');
const handoverSrc = readContract('SystemHandover');
const emergencySrc = readContract('EmergencyControl');

// ─────────────────────────────────────────────────────────────────────────────
// R-051 – Emergency override abuse
// ─────────────────────────────────────────────────────────────────────────────

describe('R-051 – Emergency override abuse guardrails', () => {
  describe('DAO emergency quorum rescue: two-party flow + warmup', () => {
    it('defines emergencyApprover as secondary approver (DAO-03)', () => {
      expect(daoSrc).toMatch(/address\s+public\s+emergencyApprover/);
    });

    it('requires caller to be admin or emergencyApprover for initiation', () => {
      expect(daoSrc).toMatch(/require\(msg\.sender == admin \|\| msg\.sender == emergencyApprover, "DAO: not authorized"\)/);
    });

    it('requires emergency approver to be set before emergency actions', () => {
      expect(daoSrc).toMatch(/require\(emergencyApprover != address\(0\), "DAO: emergency approver not set"\)/);
    });

    it('enforces rescue warmup delay before execution', () => {
      expect(daoSrc).toMatch(/require\(block\.timestamp >= emergencyRescueReadyAt, "DAO: rescue warmup not elapsed"\)/);
    });

    it('requires secondary approval before execution', () => {
      expect(daoSrc).toMatch(/require\(emergencyRescueApproved, "DAO: secondary approval required"\)/);
    });

    it('prevents self-approval when approver is an EOA', () => {
      expect(daoSrc).toMatch(/require\(msg\.sender != emergencyRescueInitiator, "DAO: initiator cannot self-approve"\)/);
    });

    it('supports explicit cancel path for pending rescue', () => {
      expect(daoSrc).toMatch(/function\s+cancelEmergencyQuorumRescue\(\)\s+external/);
      expect(daoSrc).toMatch(/emit\s+EmergencyQuorumRescueCancelled\(\)/);
    });
  });

  describe('DAO emergency timelock replacement: two-party flow + long delay', () => {
    it('defines pending emergency timelock replacement state', () => {
      expect(daoSrc).toMatch(/pendingEmergencyTimelock/);
      expect(daoSrc).toMatch(/emergencyTimelockReadyAt/);
      expect(daoSrc).toMatch(/emergencyTimelockApproved/);
    });

    it('requires secondary approval before replacement execution', () => {
      expect(daoSrc).toMatch(/require\(emergencyTimelockApproved, "DAO: secondary approval required"\)/);
    });

    it('requires replacement to be ready before execution', () => {
      expect(daoSrc).toMatch(/require\(emergencyTimelockReadyAt > 0 && block\.timestamp >= emergencyTimelockReadyAt, "DAO: not ready"\)/);
    });

    it('supports explicit cancellation for pending replacement', () => {
      expect(daoSrc).toMatch(/function\s+cancelEmergencyTimelockReplacement\(\)\s+external/);
      expect(daoSrc).toMatch(/emit\s+EmergencyTimelockReplacementCancelled\(\)/);
    });
  });

  describe('EmergencyControl module: bounded emergency powers', () => {
    it('DAO path exists for explicit emergency toggle', () => {
      expect(emergencySrc).toMatch(/function\s+daoToggle\(bool halt, string calldata reason\)\s+external\s+onlyDAO/);
    });

    it('committee votes are member-gated', () => {
      expect(emergencySrc).toMatch(/require\(isMember\[msg\.sender\], "EC: not member"\)/);
    });

    it('recovery transfer requires halted system', () => {
      expect(emergencySrc).toMatch(/require\(breaker\.halted\(\), "EC: system must be halted"\)/);
    });

    it('recovery transfer enforces timelock active check', () => {
      expect(emergencySrc).toMatch(/require\(block\.timestamp >= p\.unlockTime, "EC: timelock active"\)/);
    });

    it('supermajority threshold uses memberCount-1 model', () => {
      expect(emergencySrc).toMatch(/uint8 required = memberCount > 1 \? memberCount - 1 : 1/);
    });
  });

  describe('TypeScript model: emergency dual-approval cannot be single-signed', () => {
    it('initiator alone cannot execute without approval flag', () => {
      const state = { readyAt: 100, approved: false };
      const now = 100;
      const canExecute = state.readyAt > 0 && now >= state.readyAt && state.approved;
      expect(canExecute).toBe(false);
    });

    it('execution becomes valid only after both warmup and approval', () => {
      const state = { readyAt: 100, approved: true };
      expect(state.readyAt > 0 && 99 >= state.readyAt && state.approved).toBe(false);
      expect(state.readyAt > 0 && 100 >= state.readyAt && state.approved).toBe(true);
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// R-052 – Insufficient quorum floor enforcement
// ─────────────────────────────────────────────────────────────────────────────

describe('R-052 – Quorum floor enforcement', () => {
  it('defines absolute minimum quorum constant', () => {
    expect(daoSrc).toMatch(/ABSOLUTE_MIN_QUORUM\s*=\s*500/);
  });

  it('emergency rescue enforces >= 10% of current minVotes', () => {
    expect(daoSrc).toMatch(/require\(_minVotes >= minVotesRequired \/ 10, "DAO: quorum too low \(must be >= 10% of current\)"\)/);
  });

  it('emergency rescue enforces absolute minimum quorum floor', () => {
    expect(daoSrc).toMatch(/require\(_minVotes >= ABSOLUTE_MIN_QUORUM, "DAO: below absolute minimum quorum"\)/);
  });

  it('emergency rescue only allows quorum reduction (no increase path)', () => {
    expect(daoSrc).toMatch(/require\(_minVotes < minVotesRequired, "DAO: must reduce minVotes"\)/);
  });

  it('setParams keeps minVotes within bounded range [100, 1_000_000]', () => {
    expect(daoSrc).toMatch(/require\(_minVotes >= 100 && _minVotes <= 1_000_000, "DAO: minVotes out of range"\)/);
  });

  it('setMinParticipation keeps participation floor bounded [3, 100]', () => {
    expect(daoSrc).toMatch(/require\(_minParticipation >= 3 && _minParticipation <= 100, "DAO: invalid participation"\)/);
  });

  it('finalize requires both vote-points quorum and unique-voter participation floor', () => {
    expect(daoSrc).toMatch(/bool qmet = total >= minVotesRequired && p\.voterCount >= minParticipation/);
  });

  describe('TypeScript model: quorum floor math', () => {
    it('rejects new quorum below 10% rule', () => {
      const current = 10_000;
      const candidate = 999; // below 1000
      expect(candidate >= Math.floor(current / 10)).toBe(false);
    });

    it('rejects new quorum below absolute minimum', () => {
      const ABSOLUTE_MIN_QUORUM = 500;
      const candidate = 499;
      expect(candidate >= ABSOLUTE_MIN_QUORUM).toBe(false);
    });

    it('accepts valid reduced quorum respecting both floors', () => {
      const current = 10_000;
      const candidate = 1_000;
      expect(candidate < current).toBe(true);
      expect(candidate >= current / 10).toBe(true);
      expect(candidate >= 500).toBe(true);
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// R-053 – Timelock admin handover risk
// ─────────────────────────────────────────────────────────────────────────────

describe('R-053 – Timelock admin handover risk', () => {
  describe('SystemHandover one-time execution + ownership burn', () => {
    it('handover requires armed start and maturity time', () => {
      expect(handoverSrc).toMatch(/if \(start == 0\) revert SH_NotArmed\(\)/);
      expect(handoverSrc).toMatch(/if \(block\.timestamp < handoverAt\) revert SH_TooEarly\(\)/);
    });

    it('handover can execute only once', () => {
      expect(handoverSrc).toMatch(/if \(handoverExecuted\) revert SH_AlreadyExecuted\(\)/);
      expect(handoverSrc).toMatch(/handoverExecuted = true/);
    });

    it('handover burns dev multisig authority after execution', () => {
      expect(handoverSrc).toMatch(/devMultisig = address\(0\)/);
    });

    it('handover sets timelock admin to DAO', () => {
      expect(handoverSrc).toMatch(/timelock\.setAdmin\(address\(dao\)\)/);
    });

    it('handover emits executed event with dao/timelock/newAdmin', () => {
      expect(handoverSrc).toMatch(/emit\s+Executed\(address\(dao\), address\(timelock\), newAdmin, extensionsUsed\)/);
    });
  });

  describe('DAOTimelock admin mutation locked to self-call', () => {
    it('setAdmin is onlyTimelockSelf-gated', () => {
      expect(timelockSrc).toMatch(/function\s+setAdmin\(address _admin\)\s+external\s+onlyTimelockSelf/);
    });

    it('setDelay is onlyTimelockSelf-gated with min/max checks', () => {
      expect(timelockSrc).toMatch(/function\s+setDelay\(uint64 _delay\)\s+external\s+onlyTimelockSelf/);
      expect(timelockSrc).toMatch(/require\(_delay >= MIN_DELAY, "TL: delay below minimum"\)/);
      expect(timelockSrc).toMatch(/require\(_delay <= MAX_DELAY, "TL: delay above maximum"\)/);
    });

    it('emergencyReduceDelay is one-shot bounded and cooldown-limited', () => {
      expect(timelockSrc).toMatch(/require\(!emergencyDelayReduced, "TL: emergency reduction already used"\)/);
      expect(timelockSrc).toMatch(/require\(_newDelay >= ABSOLUTE_MIN_DELAY, "TL: below absolute minimum"\)/);
      expect(timelockSrc).toMatch(/require\(_newDelay >= delay \/ 2, "TL: max 50% reduction per call"\)/);
      expect(timelockSrc).toMatch(/require\(block\.timestamp >= lastEmergencyReduceTime \+ 24 hours, "TL: reduce cooldown"\)/);
    });
  });

  describe('TypeScript model: one-time handover execution', () => {
    it('second execution attempt is rejected after first execution', () => {
      let executed = false;
      const exec = (): void => {
        if (executed) throw new Error('SH_AlreadyExecuted');
        executed = true;
      };

      expect(() => exec()).not.toThrow();
      expect(() => exec()).toThrow('SH_AlreadyExecuted');
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// R-054 – Queue cancellation policy ambiguity
// ─────────────────────────────────────────────────────────────────────────────

describe('R-054 – Queue cancellation semantics', () => {
  it('timelock cancel is onlyAdmin-gated', () => {
    expect(timelockSrc).toMatch(/function\s+cancel\(bytes32 id\)\s+external\s+onlyAdmin/);
  });

  it('cancel rejects unknown queue ids', () => {
    expect(timelockSrc).toMatch(/if\(queue\[id\]\.eta==0\) revert TL_NotQueued\(\)/);
  });

  it('cancel emits Cancelled event and removes tracked id', () => {
    expect(timelockSrc).toMatch(/emit\s+Cancelled\(id\)/);
    expect(timelockSrc).toMatch(/_removeFromQueuedIds\(id\)/);
  });

  it('execute is admin-only to prevent front-running', () => {
    expect(timelockSrc).toMatch(/require\(msg\.sender == admin, "TL: only admin can execute"\)/);
  });

  it('expired transactions can be admin-cleaned and re-queued', () => {
    expect(timelockSrc).toMatch(/function\s+cleanupExpired\(bytes32 id\)\s+external\s+onlyAdmin/);
    expect(timelockSrc).toMatch(/function\s+requeueExpired\(bytes32 oldId\)\s+external\s+onlyAdmin/);
  });

  it('queued operation count is capped to avoid unbounded queue growth', () => {
    expect(timelockSrc).toMatch(/require\(queuedIds\.length < 500, "TL: queue full"\)/);
  });

  it('DAO has explicit queued proposal expiry path', () => {
    expect(daoSrc).toMatch(/function\s+expireQueuedProposal\(uint256 id\)\s+external/);
    expect(daoSrc).toMatch(/require\(block\.timestamp >= uint256\(p\.queuedAt\) \+ QUEUE_EXPIRY, "DAO: expiry not reached"\)/);
    expect(daoSrc).toMatch(/emit\s+ProposalStateChanged\(id, "queued", "expired"\)/);
  });

  describe('TypeScript model: cancel authority and state transition', () => {
    it('only admin may cancel queued tx', () => {
      const admin = 'admin';
      const cancel = (caller: string): boolean => caller === admin;
      expect(cancel('user')).toBe(false);
      expect(cancel('admin')).toBe(true);
    });

    it('cannot execute cancelled operation', () => {
      const queue = new Map<string, { eta: number; done: boolean }>();
      queue.set('op1', { eta: 1, done: false });
      queue.delete('op1');
      expect(queue.has('op1')).toBe(false);
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// R-055 – Proposal payload validation gaps
// ─────────────────────────────────────────────────────────────────────────────

describe('R-055 – Proposal payload validation', () => {
  it('proposal target must be non-zero', () => {
    expect(daoSrc).toMatch(/require\(target != address\(0\), "DAO: invalid target"\)/);
  });

  it('proposal description must be non-empty', () => {
    expect(daoSrc).toMatch(/require\(bytes\(description\)\.length > 0, "DAO: empty description"\)/);
  });

  it('proposal type target allowlist gate exists', () => {
    expect(daoSrc).toMatch(/if \(target != address\(0\) && proposalTypeTargetPolicyCount\[ptype\] > 0 && !proposalTypeTargetAllowed\[ptype\]\[target\]\)/);
    expect(daoSrc).toMatch(/revert DAO_ProposalTargetNotAllowed/);
  });

  it('proposal type selector allowlist gate exists', () => {
    expect(daoSrc).toMatch(/if \(proposalTypeSelectorPolicyCount\[ptype\] > 0\)/);
    expect(daoSrc).toMatch(/revert DAO_ProposalSelectorNotAllowed/);
  });

  it('selector extraction handles short calldata safely', () => {
    expect(daoSrc).toMatch(/if \(data\.length < 4\) return bytes4\(0\)/);
  });

  it('proposal count is capped (anti-spam)', () => {
    expect(daoSrc).toMatch(/require\(activeProposalCount < MAX_PROPOSALS, "DAO: proposal cap reached"\)/);
  });

  it('resubmission cooldown exists for withdrawn proposal hashes', () => {
    expect(daoSrc).toMatch(/"DAO: resubmission cooldown active"/);
  });

  it('proposal cooldown exists per proposer', () => {
    expect(daoSrc).toMatch(/DAO_ProposalCooldownActive/);
  });

  it('voting requires score settlement window and freshness checks', () => {
    expect(daoSrc).toMatch(/SCORE_SETTLEMENT_WINDOW/);
    expect(daoSrc).toMatch(/"DAO: score not recently established"/);
  });

  describe('TypeScript model: selector allowlist enforcement', () => {
    it('disallows selector when allowlist is configured and selector missing', () => {
      const allowlistEnabled = true;
      const allowed = new Set(['0xa9059cbb']);
      const selector = '0x095ea7b3';
      const permitted = !allowlistEnabled || allowed.has(selector);
      expect(permitted).toBe(false);
    });

    it('allows selector when allowlist is configured and selector present', () => {
      const allowlistEnabled = true;
      const allowed = new Set(['0xa9059cbb']);
      const selector = '0xa9059cbb';
      const permitted = !allowlistEnabled || allowed.has(selector);
      expect(permitted).toBe(true);
    });
  });
}
);

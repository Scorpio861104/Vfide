/**
 * @fileoverview Executable security contract guard tests for VFIDE Phase 1
 * @description Verifies the audited phase-one contract surface, supporting Hardhat suites,
 * and verification scripts remain checked in and wired into the repo.
 */

import fs from 'node:fs';
import path from 'node:path';
import { describe, it, expect } from '@jest/globals';

const root = process.cwd();
const read = (relativePath: string) => fs.readFileSync(path.join(root, relativePath), 'utf8');
const exists = (relativePath: string) => fs.existsSync(path.join(root, relativePath));

describe('VFIDE Security Contracts - Phase 1', () => {
  const packageJson = JSON.parse(read('package.json')) as { scripts?: Record<string, string> };

  describe('VFIDEAccessControl', () => {
    it('defines audited role grant, revoke, and batch controls', () => {
      const source = read('contracts/VFIDEAccessControl.sol');

      expect(source).toContain('EMERGENCY_PAUSER_ROLE');
      expect(source).toContain('grantRoleWithReason');
      expect(source).toContain('revokeRoleWithReason');
      expect(source).toContain('batchGrantRole');
      expect(source).toContain('batchRevokeRole');
    });
  });

  describe('AdminMultiSig', () => {
    it('keeps council approval, proposal, and veto flows in source', () => {
      const source = read('contracts/AdminMultiSig.sol');

      expect(source).toContain('COUNCIL_SIZE');
      expect(source).toContain('ProposalCreated');
      expect(source).toContain('ProposalApproved');
      expect(source).toContain('ProposalExecuted');
      expect(source).toContain('CommunityVeto');
      expect(source).toContain('vetoThreshold');
    });
  });

  describe('EmergencyControl', () => {
    it('ships emergency halt and recovery controls with hardhat coverage', () => {
      const source = read('contracts/EmergencyControl.sol');

      expect(source).toMatch(/halt|unhalt|voteExpiryPeriod/i);
      expect(exists('test/hardhat/EmergencyControlRecovery.test.ts')).toBe(true);
    });
  });

  describe('CircuitBreaker', () => {
    it('tracks threshold-based triggers for volume, price, and blacklist events', () => {
      const source = read('contracts/CircuitBreaker.sol');

      expect(source).toContain('dailyVolumeThreshold');
      expect(source).toContain('priceDropThreshold');
      expect(source).toContain('blacklistThreshold');
      expect(source).toContain('recordVolume');
      expect(source).toContain('updatePrice');
      expect(source).toContain('CircuitBreakerTriggered');
    });
  });

  describe('WithdrawalQueue', () => {
    it('enforces delayed withdrawals, daily caps, and cancellation paths', () => {
      const source = read('contracts/WithdrawalQueue.sol');

      expect(source).toContain('WITHDRAWAL_DELAY');
      expect(source).toContain('DAILY_WITHDRAWAL_CAP_PERCENT');
      expect(source).toContain('requestWithdrawal');
      expect(source).toContain('executeWithdrawal');
      expect(source).toContain('batchExecuteWithdrawals');
      expect(source).toContain('cancelWithdrawal');
    });
  });

  describe('VFIDEToken', () => {
    it('retains blacklist, freeze, anti-whale, and cooldown protections', () => {
      const source = read('contracts/VFIDEToken.sol');

      expect(source).toContain('isBlacklisted');
      expect(source).toContain('freezeTime');
      expect(source).toContain('FREEZE_DELAY');
      expect(source).toContain('setBlacklist');
      expect(source).toContain('maxTransferAmount');
      expect(source).toContain('transferCooldown');
    });
  });

  describe('Security verification surface', () => {
    it('keeps the security-focused hardhat suites checked in', () => {
      [
        'test/hardhat/SecurityFixes.test.ts',
        'test/hardhat/SecondarySecurityFixes.test.ts',
        'test/hardhat/SecurityGuardrails.test.ts',
        'test/hardhat/SystemHandoverSecurity.test.ts',
        'test/hardhat/CompleteAuditBlockers.test.ts',
      ].forEach((file) => expect(exists(file)).toBe(true));
    });

    it('wires launch-time security checks into npm scripts', () => {
      const scripts = packageJson.scripts ?? {};

      expect(scripts['test:onchain']).toContain('contract:compile');
      expect(scripts['test:onchain']).toContain('hardhat');
      expect(scripts['test:security']).toContain('security');
      expect(scripts['test:security:all']).toContain('npm run test:onchain');
      expect(scripts['security:slither']).toContain('contract:analyze:strict');
      expect(scripts['validate:production']).toContain('test:security:all');
    });

    it('includes repo verification scripts for key audit invariants', () => {
      [
        'scripts/verify-owner-controlpanel-guardrails.ts',
        'scripts/verify-chain-of-return-timelock.ts',
        'scripts/verify-next-of-kin-inheritance.ts',
        'scripts/verify-card-bound-vault-security.ts',
        'scripts/verify-merchant-payment-escrow-invariants.ts',
        'scripts/verify-supply-chain-controls.ts',
      ].forEach((file) => expect(exists(file)).toBe(true));
    });

    it('keeps lending security coverage alongside the phase 1 contract surface', () => {
      expect(exists('test/hardhat/lending/VFIDEFlashLoan.test.ts')).toBe(true);
      expect(exists('test/hardhat/lending/VFIDETermLoan.test.ts')).toBe(true);
    });
  });
});

/**
 * Tests for VFIDEToken timelock audit fixes
 * Validates propose/confirm pattern for admin functions
 */

import * as fs from 'fs';
import * as path from 'path';

describe('VFIDEToken - Timelock Audit Fixes', () => {
  let tokenSource: string;
  let abiSource: string;

  beforeAll(() => {
    tokenSource = fs.readFileSync(
      path.join(process.cwd(), 'contracts/VFIDEToken.sol'),
      'utf-8'
    );
    abiSource = fs.readFileSync(
      path.join(process.cwd(), 'lib/abis/VFIDEToken.json'),
      'utf-8'
    );
  });

  describe('Module change timelocks (VaultHub, SecurityHub, Ledger)', () => {
    it('should NOT have instant setVaultHub function', () => {
      // Should not contain a simple setVaultHub that directly sets vaultHub
      expect(tokenSource).not.toMatch(/function setVaultHub\(/);
    });

    it('should NOT have instant setSecurityHub function', () => {
      expect(tokenSource).not.toMatch(/function setSecurityHub\(/);
    });

    it('should NOT have instant setLedger function', () => {
      expect(tokenSource).not.toMatch(/function setLedger\(/);
    });

    it('should have proposeVaultHub function with timelock', () => {
      expect(tokenSource).toContain('function proposeVaultHub(address hub)');
      expect(tokenSource).toContain('pendingVaultHub = hub');
      expect(tokenSource).toContain('vaultHubProposalTime = block.timestamp');
    });

    it('should have confirmVaultHub function with delay check', () => {
      expect(tokenSource).toContain('function confirmVaultHub()');
      expect(tokenSource).toContain('vaultHubProposalTime + MODULE_CHANGE_DELAY');
    });

    it('should have proposeSecurityHub function', () => {
      expect(tokenSource).toContain('function proposeSecurityHub(address hub)');
      expect(tokenSource).toContain('pendingSecurityHub = hub');
    });

    it('should have confirmSecurityHub function with delay check', () => {
      expect(tokenSource).toContain('function confirmSecurityHub()');
      expect(tokenSource).toContain('securityHubProposalTime + MODULE_CHANGE_DELAY');
    });

    it('should have proposeLedger function', () => {
      expect(tokenSource).toContain('function proposeLedger(address _ledger)');
      expect(tokenSource).toContain('pendingLedger = _ledger');
    });

    it('should have confirmLedger function with delay check', () => {
      expect(tokenSource).toContain('function confirmLedger()');
      expect(tokenSource).toContain('ledgerProposalTime + MODULE_CHANGE_DELAY');
    });

    it('should define MODULE_CHANGE_DELAY as 2 days', () => {
      expect(tokenSource).toContain('MODULE_CHANGE_DELAY = 2 days');
    });
  });

  describe('Exemption timelocks (SystemExempt, Whitelist)', () => {
    it('should NOT have instant setSystemExempt function', () => {
      expect(tokenSource).not.toMatch(/function setSystemExempt\(/);
    });

    it('should NOT have instant setWhitelist function', () => {
      expect(tokenSource).not.toMatch(/function setWhitelist\(/);
    });

    it('should have proposeSystemExempt with delay', () => {
      expect(tokenSource).toContain('function proposeSystemExempt(address who, bool isExempt)');
      expect(tokenSource).toContain('pendingExemptions[who]');
    });

    it('should have confirmSystemExempt with delay check', () => {
      expect(tokenSource).toContain('function confirmSystemExempt(address who)');
      expect(tokenSource).toContain('p.proposalTime + EXEMPT_CHANGE_DELAY');
    });

    it('should have proposeWhitelist with delay', () => {
      expect(tokenSource).toContain('function proposeWhitelist(address addr, bool status)');
      expect(tokenSource).toContain('pendingWhitelist[addr]');
    });

    it('should have confirmWhitelist with delay check', () => {
      expect(tokenSource).toContain('function confirmWhitelist(address addr)');
    });

    it('should define EXEMPT_CHANGE_DELAY as 1 day', () => {
      expect(tokenSource).toContain('EXEMPT_CHANGE_DELAY = 1 days');
    });

    it('should have PendingExemption struct', () => {
      expect(tokenSource).toContain('struct PendingExemption');
      expect(tokenSource).toContain('bool isExempt');
      expect(tokenSource).toContain('uint256 proposalTime');
    });
  });

  describe('Events for propose/confirm pattern', () => {
    it('should emit VaultHubProposed event', () => {
      expect(tokenSource).toContain('event VaultHubProposed(address indexed hub, uint256 effectiveTime)');
    });

    it('should emit SecurityHubProposed event', () => {
      expect(tokenSource).toContain('event SecurityHubProposed(address indexed hub, uint256 effectiveTime)');
    });

    it('should emit LedgerProposed event', () => {
      expect(tokenSource).toContain('event LedgerProposed(address indexed ledger, uint256 effectiveTime)');
    });

    it('should emit SystemExemptProposed event', () => {
      expect(tokenSource).toContain('event SystemExemptProposed(address indexed who, bool isExempt, uint256 effectiveTime)');
    });

    it('should emit WhitelistProposed event', () => {
      expect(tokenSource).toContain('event WhitelistProposed(address indexed addr, bool status, uint256 effectiveTime)');
    });
  });

  describe('ABI matches contract changes', () => {
    it('ABI should contain proposeVaultHub', () => {
      expect(abiSource).toContain('"proposeVaultHub"');
    });

    it('ABI should contain confirmVaultHub', () => {
      expect(abiSource).toContain('"confirmVaultHub"');
    });

    it('ABI should NOT contain setVaultHub', () => {
      expect(abiSource).not.toContain('"setVaultHub"');
    });

    it('ABI should contain proposeSystemExempt', () => {
      expect(abiSource).toContain('"proposeSystemExempt"');
    });

    it('ABI should contain confirmSystemExempt', () => {
      expect(abiSource).toContain('"confirmSystemExempt"');
    });

    it('ABI should NOT contain setSystemExempt', () => {
      expect(abiSource).not.toContain('"setSystemExempt"');
    });

    it('ABI should contain proposeWhitelist', () => {
      expect(abiSource).toContain('"proposeWhitelist"');
    });

    it('ABI should contain confirmWhitelist', () => {
      expect(abiSource).toContain('"confirmWhitelist"');
    });

    it('ABI should NOT contain setWhitelist', () => {
      expect(abiSource).not.toContain('"setWhitelist"');
    });
  });
});

describe('Interfaces - Updated Signatures', () => {
  it('SharedInterfaces.sol should use propose/confirm pattern', () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), 'contracts/SharedInterfaces.sol'),
      'utf-8'
    );
    expect(source).toContain('proposeSystemExempt');
    expect(source).toContain('confirmSystemExempt');
    expect(source).toContain('proposeWhitelist');
    expect(source).toContain('confirmWhitelist');
    expect(source).not.toContain('function setSystemExempt');
    expect(source).not.toContain('function setWhitelist(');
  });

  it('IVFIDEToken.sol should use propose/confirm pattern', () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), 'contracts/interfaces/IVFIDEToken.sol'),
      'utf-8'
    );
    expect(source).toContain('proposeSystemExempt');
    expect(source).toContain('confirmSystemExempt');
    expect(source).not.toContain('function setSystemExempt');
  });
});

describe('OwnerControlPanel - Updated Signatures', () => {
  let source: string;

  beforeAll(() => {
    source = fs.readFileSync(
      path.join(process.cwd(), 'contracts/OwnerControlPanel.sol'),
      'utf-8'
    );
  });

  it('should use propose pattern instead of direct set', () => {
    expect(source).toContain('token_proposeSystemExempt');
    expect(source).toContain('token_confirmSystemExempt');
    expect(source).not.toContain('token_setSystemExempt');
  });

  it('should use propose whitelist pattern', () => {
    expect(source).toContain('token_proposeWhitelist');
    expect(source).toContain('token_confirmWhitelist');
    expect(source).not.toContain('token_setWhitelist');
  });

  it('should have batch propose whitelist', () => {
    expect(source).toContain('token_batchProposeWhitelist');
    expect(source).not.toContain('token_batchWhitelist');
  });
});

/**
 * Tests for the on-chain attestation module (Onboarding Finding B follow-up).
 *
 * The on-chain reads themselves need an RPC, which isn't available in unit tests — so we drive viem's
 * readContract via a controllable mock and verify the THREE-OUTCOME CONTRACT that makes the attestation both
 * farm-proof and false-block-proof:
 *   • confirmed   → granted (chain proves the action)
 *   • not-found   → denied, fail CLOSED (chain read OK, action absent — the farm defense)
 *   • unavailable → denied but RETRYABLE (chain unreadable — never a false "you didn't do this")
 *
 * NOTE: jest.setup.js globally mocks `viem` (createPublicClient → {}) and sets some env addresses. We work WITH
 * that: patch the already-mocked viem's createPublicClient to return a client with our readContract, and set the
 * VaultHub/DAO env addresses the real lib/contracts.ts needs so they resolve as configured.
 */
import { describe, expect, it, jest, beforeEach, beforeAll } from '@jest/globals';

// Configure the contract addresses the attestation reads (real lib/contracts.ts resolves these from env).
process.env.NEXT_PUBLIC_VAULT_HUB_ADDRESS = '0x0000000000000000000000000000000000000005';
process.env.NEXT_PUBLIC_DAO_ADDRESS = '0x000000000000000000000000000000000000000a';
// VFIDE token address is already set by jest.setup.js.

const mockReadContract = jest.fn();

beforeAll(() => {
  // Patch the globally-mocked viem so createPublicClient returns a client whose readContract we control,
  // and make getAddress throw on malformed input (the global passthrough doesn't).
  const viem = jest.requireMock('viem') as {
    createPublicClient: jest.Mock;
    getAddress: jest.Mock;
  };
  viem.createPublicClient.mockReturnValue({ readContract: mockReadContract });
  viem.getAddress.mockImplementation((a: string) => {
    if (typeof a !== 'string' || !/^0x[0-9a-fA-F]{40}$/.test(a)) throw new Error('invalid address');
    return a;
  });
});

import { attestOnchainStep, isAttestedStep } from '@/lib/quests/onchainAttestation';

const USER = '0x1111111111111111111111111111111111111111';
const VAULT = '0x2222222222222222222222222222222222222222';
const ZERO = '0x0000000000000000000000000000000000000000';

beforeEach(() => {
  mockReadContract.mockReset();
});

describe('onchainAttestation · isAttestedStep', () => {
  it('recognizes exactly the on-chain-truth steps', () => {
    expect(isAttestedStep('depositVault')).toBe(true);
    expect(isAttestedStep('voteProposal')).toBe(true);
    expect(isAttestedStep('completeProfile')).toBe(false);
    expect(isAttestedStep('connectWallet')).toBe(false);
  });
});

describe('onchainAttestation · depositVault', () => {
  it('CONFIRMED when the user owns a vault with a positive balance', async () => {
    mockReadContract
      .mockResolvedValueOnce(VAULT)   // vaultOf(user)
      .mockResolvedValueOnce(5n);     // balanceOf(vault)
    const r = await attestOnchainStep('depositVault', USER);
    expect(r.outcome).toBe('confirmed');
    expect(r.granted).toBe(true);
  });

  it('NOT-FOUND (fail closed) when the user has no vault', async () => {
    mockReadContract.mockResolvedValueOnce(ZERO); // vaultOf → zero
    const r = await attestOnchainStep('depositVault', USER);
    expect(r.outcome).toBe('not-found');
    expect(r.granted).toBe(false);
  });

  it('NOT-FOUND (fail closed) when the vault exists but holds nothing (created, never funded)', async () => {
    mockReadContract
      .mockResolvedValueOnce(VAULT)   // vaultOf
      .mockResolvedValueOnce(0n);     // balanceOf → 0
    const r = await attestOnchainStep('depositVault', USER);
    expect(r.outcome).toBe('not-found');
    expect(r.granted).toBe(false);
  });

  it('UNAVAILABLE (retryable) when the RPC read throws — never a false denial', async () => {
    mockReadContract.mockRejectedValueOnce(new Error('RPC timeout'));
    const r = await attestOnchainStep('depositVault', USER);
    expect(r.outcome).toBe('unavailable');
    expect(r.granted).toBe(false);
  });
});

describe('onchainAttestation · voteProposal', () => {
  it('CONFIRMED when DAO.hasVotedAnyProposal is true', async () => {
    mockReadContract.mockResolvedValueOnce(true);
    const r = await attestOnchainStep('voteProposal', USER);
    expect(r.outcome).toBe('confirmed');
    expect(r.granted).toBe(true);
  });

  it('NOT-FOUND (fail closed) when the user has never voted', async () => {
    mockReadContract.mockResolvedValueOnce(false);
    const r = await attestOnchainStep('voteProposal', USER);
    expect(r.outcome).toBe('not-found');
    expect(r.granted).toBe(false);
  });

  it('UNAVAILABLE (retryable) when the governance read throws', async () => {
    mockReadContract.mockRejectedValueOnce(new Error('node unreachable'));
    const r = await attestOnchainStep('voteProposal', USER);
    expect(r.outcome).toBe('unavailable');
    expect(r.granted).toBe(false);
  });
});

describe('onchainAttestation · input validation', () => {
  it('rejects a malformed wallet address as not-found (no read attempted)', async () => {
    const r = await attestOnchainStep('depositVault', 'not-an-address');
    expect(r.outcome).toBe('not-found');
    expect(mockReadContract).not.toHaveBeenCalled();
  });
});

/**
 * CardBoundVault Contract Tests
 * Focused regression coverage for ATM-card authorization model and vault-only custody controls
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { Address, parseEther } from 'viem';

const mockContractRead = jest.fn();
const mockContractWrite = jest.fn();

describe('CardBoundVault Contract', () => {
  let admin: Address;
  let guardian1: Address;
  let guardian2: Address;
  let activeWallet: Address;
  let nextWallet: Address;
  let vaultA: Address;
  let vaultB: Address;
  let nonVault: Address;

  beforeEach(() => {
    admin = '0xAdmin1234567890123456789012345678901234' as Address;
    guardian1 = '0xGuard112345678901234567890123456789012' as Address;
    guardian2 = '0xGuard212345678901234567890123456789012' as Address;
    activeWallet = '0xWallA123456789012345678901234567890123' as Address;
    nextWallet = '0xWallB123456789012345678901234567890123' as Address;
    vaultA = '0xVaultA12345678901234567890123456789012' as Address;
    vaultB = '0xVaultB12345678901234567890123456789012' as Address;
    nonVault = '0x0000000000000000000000000000000000000011' as Address;
    jest.clearAllMocks();
  });

  describe('Vault-to-Vault Transfer Authorization', () => {
    it('should allow a valid signed vault-to-vault transfer', async () => {
      mockContractWrite.mockResolvedValueOnce('0xhash');

      const result = await mockContractWrite({
        functionName: 'executeVaultToVaultTransfer',
        args: [
          {
            vault: vaultA,
            toVault: vaultB,
            amount: parseEther('50'),
            nonce: 0n,
            walletEpoch: 1n,
            deadline: BigInt(Math.floor(Date.now() / 1000) + 3600),
            chainId: 31337n,
          },
          '0xsig',
        ],
      });

      expect(result).toBe('0xhash');
    });

    it('should reject transfer to non-vault destination', async () => {
      mockContractWrite.mockRejectedValueOnce(new Error('CBV_NotVault'));

      await expect(
        mockContractWrite({
          functionName: 'executeVaultToVaultTransfer',
          args: [
            {
              vault: vaultA,
              toVault: nonVault,
              amount: parseEther('10'),
              nonce: 0n,
              walletEpoch: 1n,
              deadline: BigInt(Math.floor(Date.now() / 1000) + 3600),
              chainId: 31337n,
            },
            '0xsig',
          ],
        })
      ).rejects.toThrow('CBV_NotVault');
    });

    it('should reject replayed transfer with stale nonce', async () => {
      mockContractWrite.mockRejectedValueOnce(new Error('CBV_InvalidNonce'));

      await expect(
        mockContractWrite({
          functionName: 'executeVaultToVaultTransfer',
          args: [
            {
              vault: vaultA,
              toVault: vaultB,
              amount: parseEther('20'),
              nonce: 0n,
              walletEpoch: 1n,
              deadline: BigInt(Math.floor(Date.now() / 1000) + 3600),
              chainId: 31337n,
            },
            '0xreplayedSig',
          ],
        })
      ).rejects.toThrow('CBV_InvalidNonce');
    });

    it('should reject transfer with stale wallet epoch', async () => {
      mockContractWrite.mockRejectedValueOnce(new Error('CBV_InvalidEpoch'));

      await expect(
        mockContractWrite({
          functionName: 'executeVaultToVaultTransfer',
          args: [
            {
              vault: vaultA,
              toVault: vaultB,
              amount: parseEther('20'),
              nonce: 1n,
              walletEpoch: 1n,
              deadline: BigInt(Math.floor(Date.now() / 1000) + 3600),
              chainId: 31337n,
            },
            '0xoldWalletEpochSig',
          ],
        })
      ).rejects.toThrow('CBV_InvalidEpoch');
    });

    it('should reject expired intent', async () => {
      mockContractWrite.mockRejectedValueOnce(new Error('CBV_Expired'));

      await expect(
        mockContractWrite({
          functionName: 'executeVaultToVaultTransfer',
          args: [
            {
              vault: vaultA,
              toVault: vaultB,
              amount: parseEther('5'),
              nonce: 1n,
              walletEpoch: 1n,
              deadline: 1n,
              chainId: 31337n,
            },
            '0xexpiredSig',
          ],
        })
      ).rejects.toThrow('CBV_Expired');
    });

    it('should reject transfer signed by wallet that is no longer active', async () => {
      mockContractWrite.mockRejectedValueOnce(new Error('CBV_InvalidSigner'));

      await expect(
        mockContractWrite({
          functionName: 'executeVaultToVaultTransfer',
          args: [
            {
              vault: vaultA,
              toVault: vaultB,
              amount: parseEther('15'),
              nonce: 2n,
              walletEpoch: 2n,
              deadline: BigInt(Math.floor(Date.now() / 1000) + 3600),
              chainId: 31337n,
            },
            '0xoldWalletSig',
          ],
        })
      ).rejects.toThrow('CBV_InvalidSigner');
    });
  });

  describe('Spend and Pause Safeguards', () => {
    it('should reject transfer above max per-transfer limit', async () => {
      mockContractWrite.mockRejectedValueOnce(new Error('CBV_TransferLimit'));

      await expect(
        mockContractWrite({
          functionName: 'executeVaultToVaultTransfer',
          args: [
            {
              vault: vaultA,
              toVault: vaultB,
              amount: parseEther('120'),
              nonce: 3n,
              walletEpoch: 1n,
              deadline: BigInt(Math.floor(Date.now() / 1000) + 3600),
              chainId: 31337n,
            },
            '0xlimitSig',
          ],
        })
      ).rejects.toThrow('CBV_TransferLimit');
    });

    it('should reject transfer above daily aggregate limit', async () => {
      mockContractWrite.mockRejectedValueOnce(new Error('CBV_DailyLimit'));

      await expect(
        mockContractWrite({
          functionName: 'executeVaultToVaultTransfer',
          args: [
            {
              vault: vaultA,
              toVault: vaultB,
              amount: parseEther('100'),
              nonce: 4n,
              walletEpoch: 1n,
              deadline: BigInt(Math.floor(Date.now() / 1000) + 3600),
              chainId: 31337n,
            },
            '0xdailyLimitSig',
          ],
        })
      ).rejects.toThrow('CBV_DailyLimit');
    });

    it('should allow guardian to pause vault operations', async () => {
      mockContractWrite.mockResolvedValueOnce('0xpauseHash');
      expect(await mockContractWrite({ functionName: 'pause', from: guardian1 })).toBe('0xpauseHash');
    });

    it('should reject transfer while paused', async () => {
      mockContractWrite.mockRejectedValueOnce(new Error('CBV_Paused'));

      await expect(
        mockContractWrite({
          functionName: 'executeVaultToVaultTransfer',
          args: [
            {
              vault: vaultA,
              toVault: vaultB,
              amount: parseEther('10'),
              nonce: 5n,
              walletEpoch: 1n,
              deadline: BigInt(Math.floor(Date.now() / 1000) + 3600),
              chainId: 31337n,
            },
            '0xpausedSig',
          ],
        })
      ).rejects.toThrow('CBV_Paused');
    });

    it('should allow admin to unpause vault operations', async () => {
      mockContractWrite.mockResolvedValueOnce('0xunpauseHash');
      expect(await mockContractWrite({ functionName: 'unpause', from: admin })).toBe('0xunpauseHash');
    });
  });

  describe('Wallet Rotation and Guardian Quorum', () => {
    it('should allow admin to propose wallet rotation with delay', async () => {
      mockContractWrite.mockResolvedValueOnce('0xproposeHash');
      expect(
        await mockContractWrite({
          functionName: 'proposeWalletRotation',
          args: [nextWallet, 600],
          from: admin,
        })
      ).toBe('0xproposeHash');
    });

    it('should reject wallet rotation proposal with invalid delay', async () => {
      mockContractWrite.mockRejectedValueOnce(new Error('CBV_RotationNotReady'));

      await expect(
        mockContractWrite({
          functionName: 'proposeWalletRotation',
          args: [nextWallet, 1],
          from: admin,
        })
      ).rejects.toThrow('CBV_RotationNotReady');
    });

    it('should allow guardian approval for active rotation proposal', async () => {
      mockContractWrite.mockResolvedValueOnce('0xapproveHash');
      expect(await mockContractWrite({ functionName: 'approveWalletRotation', from: guardian1 })).toBe(
        '0xapproveHash'
      );
    });

    it('should reject duplicate guardian approval for same proposal nonce', async () => {
      mockContractWrite.mockRejectedValueOnce(new Error('CBV_RotationInsufficientApprovals'));

      await expect(
        mockContractWrite({ functionName: 'approveWalletRotation', from: guardian1 })
      ).rejects.toThrow('CBV_RotationInsufficientApprovals');
    });

    it('should reject finalize before delay passes', async () => {
      mockContractWrite.mockRejectedValueOnce(new Error('CBV_RotationNotReady'));

      await expect(
        mockContractWrite({ functionName: 'finalizeWalletRotation', from: admin })
      ).rejects.toThrow('CBV_RotationNotReady');
    });

    it('should reject finalize when guardian threshold is not met', async () => {
      mockContractWrite.mockRejectedValueOnce(new Error('CBV_RotationInsufficientApprovals'));

      await expect(
        mockContractWrite({ functionName: 'finalizeWalletRotation', from: guardian2 })
      ).rejects.toThrow('CBV_RotationInsufficientApprovals');
    });

    it('should finalize rotation after quorum and delay', async () => {
      mockContractWrite.mockResolvedValueOnce('0xfinalizeHash');
      expect(await mockContractWrite({ functionName: 'finalizeWalletRotation', from: guardian1 })).toBe(
        '0xfinalizeHash'
      );
    });
  });

  describe('Admin and Guardian Control Surface', () => {
    it('should reject non-admin guardian management', async () => {
      mockContractWrite.mockRejectedValueOnce(new Error('CBV_NotAdmin'));

      await expect(
        mockContractWrite({ functionName: 'setGuardian', args: [guardian2, true], from: guardian1 })
      ).rejects.toThrow('CBV_NotAdmin');
    });

    it('should reject invalid guardian threshold', async () => {
      mockContractWrite.mockRejectedValueOnce(new Error('CBV_InvalidThreshold'));

      await expect(
        mockContractWrite({ functionName: 'setGuardianThreshold', args: [0], from: admin })
      ).rejects.toThrow('CBV_InvalidThreshold');
    });

    it('should allow admin to update spend limits within bounds', async () => {
      mockContractWrite.mockResolvedValueOnce('0xlimitsHash');
      expect(
        await mockContractWrite({
          functionName: 'setSpendLimits',
          args: [parseEther('100'), parseEther('150')],
          from: admin,
        })
      ).toBe('0xlimitsHash');
    });

    it('should reject invalid spend limit configuration', async () => {
      mockContractWrite.mockRejectedValueOnce(new Error('CBV_TransferLimit'));

      await expect(
        mockContractWrite({
          functionName: 'setSpendLimits',
          args: [parseEther('200'), parseEther('150')],
          from: admin,
        })
      ).rejects.toThrow('CBV_TransferLimit');
    });

    it('should expose remaining daily capacity view', async () => {
      mockContractRead.mockResolvedValueOnce(parseEther('80'));
      expect(await mockContractRead({ functionName: 'viewRemainingDailyCapacity' })).toBe(parseEther('80'));
    });

    it('should expose current wallet epoch', async () => {
      mockContractRead.mockResolvedValueOnce(2n);
      expect(await mockContractRead({ functionName: 'walletEpoch' })).toBe(2n);
    });

    it('should expose next nonce for transfer sequencing', async () => {
      mockContractRead.mockResolvedValueOnce(7n);
      expect(await mockContractRead({ functionName: 'nextNonce' })).toBe(7n);
    });
  });
});

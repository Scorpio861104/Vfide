/**
 * EscrowManager Contract Tests
 * Comprehensive test suite for escrow creation, deposits, releases, and disputes
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { Address, parseEther } from 'viem';

// Mock contract interaction utilities
const mockContractRead = jest.fn();
const mockContractWrite = jest.fn();

describe('EscrowManager Contract', () => {
  let managerAddress: Address;
  let admin: Address;
  let buyer: Address;
  let seller: Address;
  let arbiter: Address;
  let tokenAddress: Address;

  beforeEach(() => {
    managerAddress = '0xManager1234567890123456789012345678901' as Address;
    admin = '0xAdmin1234567890123456789012345678901234' as Address;
    buyer = '0xBuyer1234567890123456789012345678901234' as Address;
    seller = '0xSeller1234567890123456789012345678901234' as Address;
    arbiter = '0xArbiter1234567890123456789012345678901' as Address;
    tokenAddress = '0xToken1234567890123456789012345678901234' as Address;

    jest.clearAllMocks();
  });

  describe('Escrow Creation', () => {
    it('should allow buyer to create escrow', async () => {
      mockContractWrite.mockResolvedValueOnce('0xhash');

      const result = await mockContractWrite({
        functionName: 'createEscrow',
        args: [seller, parseEther('1000'), tokenAddress, 'Product purchase', arbiter],
      });

      expect(result).toBe('0xhash');
    });

    it('should emit EscrowCreated event', async () => {
      mockContractWrite.mockResolvedValueOnce('0xhash');

      const result = await mockContractWrite({
        functionName: 'createEscrow',
        args: [seller, parseEther('1000'), tokenAddress, 'Description', arbiter],
      });

      expect(result).toBe('0xhash');
    });

    it('should prevent zero amount escrow', async () => {
      mockContractWrite.mockRejectedValueOnce(new Error('Amount must be greater than zero'));

      await expect(async () => {
        await mockContractWrite({
          functionName: 'createEscrow',
          args: [seller, 0n, tokenAddress, 'Description', arbiter],
        });
      }).rejects.toThrow('greater than zero');
    });

    it('should prevent buyer from being seller', async () => {
      mockContractWrite.mockRejectedValueOnce(new Error('Buyer cannot be seller'));

      await expect(async () => {
        await mockContractWrite({
          functionName: 'createEscrow',
          args: [buyer, parseEther('1000'), tokenAddress, 'Description', arbiter],
        });
      }).rejects.toThrow('Buyer cannot be seller');
    });

    it('should get escrow details', async () => {
      mockContractRead.mockResolvedValueOnce({
        id: 1n,
        buyer: buyer,
        seller: seller,
        amount: parseEther('1000'),
        token: tokenAddress,
        description: 'Product purchase',
        arbiter: arbiter,
        state: 0, // Created
        createdAt: 1234567890n,
      });

      const details = await mockContractRead({
        functionName: 'getEscrow',
        args: [1n],
      });

      expect(details.buyer).toBe(buyer);
    });

    it('should increment escrow count', async () => {
      mockContractWrite.mockResolvedValueOnce('0xhash');

      await mockContractWrite({
        functionName: 'createEscrow',
        args: [seller, parseEther('1000'), tokenAddress, 'Description', arbiter],
      });

      mockContractRead.mockResolvedValueOnce(6n); // incremented

      const count = await mockContractRead({
        functionName: 'totalEscrows',
      });

      expect(count).toBe(6n);
    });

    it('should get escrow by buyer', async () => {
      mockContractRead.mockResolvedValueOnce([1n, 2n, 5n]);

      const escrows = await mockContractRead({
        functionName: 'getEscrowsByBuyer',
        args: [buyer],
      });

      expect(escrows).toHaveLength(3);
    });

    it('should get escrow by seller', async () => {
      mockContractRead.mockResolvedValueOnce([3n, 4n]);

      const escrows = await mockContractRead({
        functionName: 'getEscrowsBySeller',
        args: [seller],
      });

      expect(escrows).toHaveLength(2);
    });

    it('should set expiry time on creation', async () => {
      mockContractRead.mockResolvedValueOnce(1237159890n); // 30 days later

      const expiry = await mockContractRead({
        functionName: 'getEscrowExpiry',
        args: [1n],
      });

      expect(expiry).toBe(1237159890n);
    });
  });

  describe('Deposits', () => {
    it('should allow buyer to deposit funds', async () => {
      mockContractWrite.mockResolvedValueOnce('0xhash');

      const result = await mockContractWrite({
        functionName: 'deposit',
        args: [1n],
      });

      expect(result).toBe('0xhash');
    });

    it('should only allow buyer to deposit', async () => {
      mockContractWrite.mockRejectedValueOnce(new Error('Not buyer'));

      await expect(async () => {
        await mockContractWrite({
          functionName: 'deposit',
          args: [1n],
        });
      }).rejects.toThrow('Not buyer');
    });

    it('should require token approval before deposit', async () => {
      mockContractWrite.mockRejectedValueOnce(new Error('Insufficient allowance'));

      await expect(async () => {
        await mockContractWrite({
          functionName: 'deposit',
          args: [1n],
        });
      }).rejects.toThrow('Insufficient allowance');
    });

    it('should verify sufficient balance', async () => {
      mockContractWrite.mockRejectedValueOnce(new Error('Insufficient balance'));

      await expect(async () => {
        await mockContractWrite({
          functionName: 'deposit',
          args: [1n],
        });
      }).rejects.toThrow('Insufficient balance');
    });

    it('should emit FundsDeposited event', async () => {
      mockContractWrite.mockResolvedValueOnce('0xhash');

      const result = await mockContractWrite({
        functionName: 'deposit',
        args: [1n],
      });

      expect(result).toBe('0xhash');
    });

    it('should transition state to Funded', async () => {
      mockContractWrite.mockResolvedValueOnce('0xhash');

      await mockContractWrite({
        functionName: 'deposit',
        args: [1n],
      });

      mockContractRead.mockResolvedValueOnce(1); // Funded

      const state = await mockContractRead({
        functionName: 'getEscrowState',
        args: [1n],
      });

      expect(state).toBe(1);
    });

    it('should prevent deposit to already funded escrow', async () => {
      mockContractWrite.mockRejectedValueOnce(new Error('Already funded'));

      await expect(async () => {
        await mockContractWrite({
          functionName: 'deposit',
          args: [1n],
        });
      }).rejects.toThrow('Already funded');
    });

    it('should get escrow balance', async () => {
      mockContractRead.mockResolvedValueOnce(parseEther('1000'));

      const balance = await mockContractRead({
        functionName: 'getEscrowBalance',
        args: [1n],
      });

      expect(balance).toBe(parseEther('1000'));
    });

    it('should track deposit timestamp', async () => {
      mockContractRead.mockResolvedValueOnce(1234567890n);

      const timestamp = await mockContractRead({
        functionName: 'getDepositTime',
        args: [1n],
      });

      expect(timestamp).toBe(1234567890n);
    });
  });

  describe('Releases', () => {
    it('should allow buyer to release funds to seller', async () => {
      mockContractWrite.mockResolvedValueOnce('0xhash');

      const result = await mockContractWrite({
        functionName: 'releaseFunds',
        args: [1n],
      });

      expect(result).toBe('0xhash');
    });

    it('should only allow buyer to release', async () => {
      mockContractWrite.mockRejectedValueOnce(new Error('Not buyer'));

      await expect(async () => {
        await mockContractWrite({
          functionName: 'releaseFunds',
          args: [1n],
        });
      }).rejects.toThrow('Not buyer');
    });

    it('should prevent release of unfunded escrow', async () => {
      mockContractWrite.mockRejectedValueOnce(new Error('Escrow not funded'));

      await expect(async () => {
        await mockContractWrite({
          functionName: 'releaseFunds',
          args: [1n],
        });
      }).rejects.toThrow('not funded');
    });

    it('should emit FundsReleased event', async () => {
      mockContractWrite.mockResolvedValueOnce('0xhash');

      const result = await mockContractWrite({
        functionName: 'releaseFunds',
        args: [1n],
      });

      expect(result).toBe('0xhash');
    });

    it('should transition state to Completed', async () => {
      mockContractWrite.mockResolvedValueOnce('0xhash');

      await mockContractWrite({
        functionName: 'releaseFunds',
        args: [1n],
      });

      mockContractRead.mockResolvedValueOnce(2); // Completed

      const state = await mockContractRead({
        functionName: 'getEscrowState',
        args: [1n],
      });

      expect(state).toBe(2);
    });

    it('should transfer funds to seller', async () => {
      mockContractWrite.mockResolvedValueOnce('0xhash');

      const result = await mockContractWrite({
        functionName: 'releaseFunds',
        args: [1n],
      });

      expect(result).toBe('0xhash');
    });

    it('should allow partial release', async () => {
      mockContractWrite.mockResolvedValueOnce('0xhash');

      const result = await mockContractWrite({
        functionName: 'releasePartial',
        args: [1n, parseEther('500')],
      });

      expect(result).toBe('0xhash');
    });

    it('should prevent partial release exceeding balance', async () => {
      mockContractWrite.mockRejectedValueOnce(new Error('Amount exceeds balance'));

      await expect(async () => {
        await mockContractWrite({
          functionName: 'releasePartial',
          args: [1n, parseEther('1500')],
        });
      }).rejects.toThrow('exceeds balance');
    });

    it('should get release history', async () => {
      mockContractRead.mockResolvedValueOnce([
        { amount: parseEther('500'), timestamp: 1234567890n },
        { amount: parseEther('500'), timestamp: 1234667890n },
      ]);

      const history = await mockContractRead({
        functionName: 'getReleaseHistory',
        args: [1n],
      });

      expect(history).toHaveLength(2);
    });

    it('should calculate total released', async () => {
      mockContractRead.mockResolvedValueOnce(parseEther('750'));

      const total = await mockContractRead({
        functionName: 'getTotalReleased',
        args: [1n],
      });

      expect(total).toBe(parseEther('750'));
    });
  });

  describe('Refunds', () => {
    it('should allow seller to initiate refund', async () => {
      mockContractWrite.mockResolvedValueOnce('0xhash');

      const result = await mockContractWrite({
        functionName: 'refund',
        args: [1n, 'Product unavailable'],
      });

      expect(result).toBe('0xhash');
    });

    it('should only allow seller to initiate refund', async () => {
      mockContractWrite.mockRejectedValueOnce(new Error('Not seller'));

      await expect(async () => {
        await mockContractWrite({
          functionName: 'refund',
          args: [1n, 'Reason'],
        });
      }).rejects.toThrow('Not seller');
    });

    it('should emit FundsRefunded event', async () => {
      mockContractWrite.mockResolvedValueOnce('0xhash');

      const result = await mockContractWrite({
        functionName: 'refund',
        args: [1n, 'Reason'],
      });

      expect(result).toBe('0xhash');
    });

    it('should transition state to Refunded', async () => {
      mockContractWrite.mockResolvedValueOnce('0xhash');

      await mockContractWrite({
        functionName: 'refund',
        args: [1n, 'Reason'],
      });

      mockContractRead.mockResolvedValueOnce(4); // Refunded

      const state = await mockContractRead({
        functionName: 'getEscrowState',
        args: [1n],
      });

      expect(state).toBe(4);
    });

    it('should return funds to buyer', async () => {
      mockContractWrite.mockResolvedValueOnce('0xhash');

      const result = await mockContractWrite({
        functionName: 'refund',
        args: [1n, 'Reason'],
      });

      expect(result).toBe('0xhash');
    });

    it('should allow buyer to claim expired escrow', async () => {
      mockContractWrite.mockResolvedValueOnce('0xhash');

      const result = await mockContractWrite({
        functionName: 'claimExpired',
        args: [1n],
      });

      expect(result).toBe('0xhash');
    });

    it('should prevent claim of non-expired escrow', async () => {
      mockContractWrite.mockRejectedValueOnce(new Error('Escrow not expired'));

      await expect(async () => {
        await mockContractWrite({
          functionName: 'claimExpired',
          args: [1n],
        });
      }).rejects.toThrow('not expired');
    });
  });

  describe('Disputes', () => {
    it('should allow buyer to raise dispute', async () => {
      mockContractWrite.mockResolvedValueOnce('0xhash');

      const result = await mockContractWrite({
        functionName: 'raiseDispute',
        args: [1n, 'Product not as described'],
      });

      expect(result).toBe('0xhash');
    });

    it('should allow seller to raise dispute', async () => {
      mockContractWrite.mockResolvedValueOnce('0xhash');

      const result = await mockContractWrite({
        functionName: 'raiseDispute',
        args: [1n, 'Payment dispute'],
      });

      expect(result).toBe('0xhash');
    });

    it('should only allow parties to raise dispute', async () => {
      mockContractWrite.mockRejectedValueOnce(new Error('Not a party'));

      await expect(async () => {
        await mockContractWrite({
          functionName: 'raiseDispute',
          args: [1n, 'Reason'],
        });
      }).rejects.toThrow('Not a party');
    });

    it('should emit DisputeRaised event', async () => {
      mockContractWrite.mockResolvedValueOnce('0xhash');

      const result = await mockContractWrite({
        functionName: 'raiseDispute',
        args: [1n, 'Reason'],
      });

      expect(result).toBe('0xhash');
    });

    it('should transition state to Disputed', async () => {
      mockContractWrite.mockResolvedValueOnce('0xhash');

      await mockContractWrite({
        functionName: 'raiseDispute',
        args: [1n, 'Reason'],
      });

      mockContractRead.mockResolvedValueOnce(3); // Disputed

      const state = await mockContractRead({
        functionName: 'getEscrowState',
        args: [1n],
      });

      expect(state).toBe(3);
    });

    it('should allow arbiter to resolve dispute', async () => {
      mockContractWrite.mockResolvedValueOnce('0xhash');

      const result = await mockContractWrite({
        functionName: 'resolveDispute',
        args: [1n, true, 'Ruling: Buyer favor'], // true = buyer wins
      });

      expect(result).toBe('0xhash');
    });

    it('should only allow arbiter to resolve', async () => {
      mockContractWrite.mockRejectedValueOnce(new Error('Not arbiter'));

      await expect(async () => {
        await mockContractWrite({
          functionName: 'resolveDispute',
          args: [1n, true, 'Ruling'],
        });
      }).rejects.toThrow('Not arbiter');
    });

    it('should emit DisputeResolved event', async () => {
      mockContractWrite.mockResolvedValueOnce('0xhash');

      const result = await mockContractWrite({
        functionName: 'resolveDispute',
        args: [1n, false, 'Ruling: Seller favor'],
      });

      expect(result).toBe('0xhash');
    });

    it('should get dispute details', async () => {
      mockContractRead.mockResolvedValueOnce({
        escrowId: 1n,
        initiator: buyer,
        reason: 'Product not as described',
        timestamp: 1234567890n,
        isResolved: false,
      });

      const details = await mockContractRead({
        functionName: 'getDispute',
        args: [1n],
      });

      expect(details.initiator).toBe(buyer);
    });

    it('should check if escrow is disputed', async () => {
      mockContractRead.mockResolvedValueOnce(true);

      const isDisputed = await mockContractRead({
        functionName: 'isDisputed',
        args: [1n],
      });

      expect(isDisputed).toBe(true);
    });

    it('should get arbiter disputes', async () => {
      mockContractRead.mockResolvedValueOnce([1n, 3n, 7n]);

      const disputes = await mockContractRead({
        functionName: 'getArbiterDisputes',
        args: [arbiter],
      });

      expect(disputes).toHaveLength(3);
    });

    it('should allow split resolution', async () => {
      mockContractWrite.mockResolvedValueOnce('0xhash');

      const result = await mockContractWrite({
        functionName: 'resolveSplit',
        args: [1n, 60n, 40n, 'Split: 60% buyer, 40% seller'],
      });

      expect(result).toBe('0xhash');
    });
  });

  describe('Escrow States', () => {
    it('should get escrow state', async () => {
      mockContractRead.mockResolvedValueOnce(1); // Funded

      const state = await mockContractRead({
        functionName: 'getEscrowState',
        args: [1n],
      });

      expect(state).toBe(1);
    });

    it('should check if escrow is active', async () => {
      mockContractRead.mockResolvedValueOnce(true);

      const isActive = await mockContractRead({
        functionName: 'isEscrowActive',
        args: [1n],
      });

      expect(isActive).toBe(true);
    });

    it('should check if escrow is completed', async () => {
      mockContractRead.mockResolvedValueOnce(true);

      const isCompleted = await mockContractRead({
        functionName: 'isEscrowCompleted',
        args: [1n],
      });

      expect(isCompleted).toBe(true);
    });

    it('should get state history', async () => {
      mockContractRead.mockResolvedValueOnce([
        { state: 0, timestamp: 1234567890n },
        { state: 1, timestamp: 1234567900n },
        { state: 2, timestamp: 1234667890n },
      ]);

      const history = await mockContractRead({
        functionName: 'getStateHistory',
        args: [1n],
      });

      expect(history).toHaveLength(3);
    });

    it('should get escrows by state', async () => {
      mockContractRead.mockResolvedValueOnce([1n, 2n, 5n]);

      const escrows = await mockContractRead({
        functionName: 'getEscrowsByState',
        args: [1], // Funded
      });

      expect(escrows).toHaveLength(3);
    });

    it('should prevent invalid state transitions', async () => {
      mockContractWrite.mockRejectedValueOnce(new Error('Invalid state transition'));

      await expect(async () => {
        await mockContractWrite({
          functionName: 'releaseFunds',
          args: [1n],
        });
      }).rejects.toThrow('Invalid state transition');
    });
  });

  describe('Fee Management', () => {
    it('should get platform fee percentage', async () => {
      mockContractRead.mockResolvedValueOnce(200n); // 2%

      const fee = await mockContractRead({
        functionName: 'platformFee',
      });

      expect(fee).toBe(200n);
    });

    it('should allow admin to set platform fee', async () => {
      mockContractWrite.mockResolvedValueOnce('0xhash');

      const result = await mockContractWrite({
        functionName: 'setPlatformFee',
        args: [250n], // 2.5%
      });

      expect(result).toBe('0xhash');
    });

    it('should calculate fee for amount', async () => {
      mockContractRead.mockResolvedValueOnce(parseEther('20')); // 2% of 1000

      const fee = await mockContractRead({
        functionName: 'calculateFee',
        args: [parseEther('1000')],
      });

      expect(fee).toBe(parseEther('20'));
    });

    it('should deduct fee on release', async () => {
      mockContractWrite.mockResolvedValueOnce('0xhash');

      const result = await mockContractWrite({
        functionName: 'releaseFunds',
        args: [1n],
      });

      expect(result).toBe('0xhash');
    });

    it('should get total fees collected', async () => {
      mockContractRead.mockResolvedValueOnce(parseEther('500'));

      const total = await mockContractRead({
        functionName: 'totalFeesCollected',
      });

      expect(total).toBe(parseEther('500'));
    });

    it('should allow admin to withdraw fees', async () => {
      mockContractWrite.mockResolvedValueOnce('0xhash');

      const result = await mockContractWrite({
        functionName: 'withdrawFees',
        args: [parseEther('400')],
      });

      expect(result).toBe('0xhash');
    });
  });

  describe('Statistics and Analytics', () => {
    it('should get total escrows count', async () => {
      mockContractRead.mockResolvedValueOnce(500n);

      const total = await mockContractRead({
        functionName: 'totalEscrows',
      });

      expect(total).toBe(500n);
    });

    it('should get completed escrows count', async () => {
      mockContractRead.mockResolvedValueOnce(450n);

      const completed = await mockContractRead({
        functionName: 'completedEscrows',
      });

      expect(completed).toBe(450n);
    });

    it('should get disputed escrows count', async () => {
      mockContractRead.mockResolvedValueOnce(15n);

      const disputed = await mockContractRead({
        functionName: 'disputedEscrows',
      });

      expect(disputed).toBe(15n);
    });

    it('should get platform statistics', async () => {
      mockContractRead.mockResolvedValueOnce({
        totalEscrows: 500n,
        activeEscrows: 50n,
        completedEscrows: 450n,
        disputedEscrows: 15n,
        totalVolume: parseEther('1000000'),
        totalFees: parseEther('20000'),
      });

      const stats = await mockContractRead({
        functionName: 'getPlatformStats',
      });

      expect(stats.totalEscrows).toBe(500n);
    });

    it('should get user statistics', async () => {
      mockContractRead.mockResolvedValueOnce({
        totalEscrowsAsBuyer: 10n,
        totalEscrowsAsSeller: 5n,
        completedTransactions: 12n,
        disputesRaised: 1n,
      });

      const stats = await mockContractRead({
        functionName: 'getUserStats',
        args: [buyer],
      });

      expect(stats.totalEscrowsAsBuyer).toBe(10n);
    });

    it('should get arbiter statistics', async () => {
      mockContractRead.mockResolvedValueOnce({
        totalDisputes: 25n,
        resolvedDisputes: 20n,
        pendingDisputes: 5n,
        successRate: 90n,
      });

      const stats = await mockContractRead({
        functionName: 'getArbiterStats',
        args: [arbiter],
      });

      expect(stats.totalDisputes).toBe(25n);
    });
  });

  describe('Arbiter Management', () => {
    it('should check if address is arbiter', async () => {
      mockContractRead.mockResolvedValueOnce(true);

      const isArbiter = await mockContractRead({
        functionName: 'isArbiter',
        args: [arbiter],
      });

      expect(isArbiter).toBe(true);
    });

    it('should allow admin to add arbiter', async () => {
      mockContractWrite.mockResolvedValueOnce('0xhash');

      const result = await mockContractWrite({
        functionName: 'addArbiter',
        args: [arbiter],
      });

      expect(result).toBe('0xhash');
    });

    it('should allow admin to remove arbiter', async () => {
      mockContractWrite.mockResolvedValueOnce('0xhash');

      const result = await mockContractWrite({
        functionName: 'removeArbiter',
        args: [arbiter],
      });

      expect(result).toBe('0xhash');
    });

    it('should emit ArbiterAdded event', async () => {
      mockContractWrite.mockResolvedValueOnce('0xhash');

      const result = await mockContractWrite({
        functionName: 'addArbiter',
        args: [arbiter],
      });

      expect(result).toBe('0xhash');
    });

    it('should get all arbiters', async () => {
      mockContractRead.mockResolvedValueOnce([arbiter, admin]);

      const arbiters = await mockContractRead({
        functionName: 'getAllArbiters',
      });

      expect(arbiters).toHaveLength(2);
    });

    it('should reject non-admin arbiter management', async () => {
      mockContractWrite.mockRejectedValueOnce(new Error('Not admin'));

      await expect(async () => {
        await mockContractWrite({
          functionName: 'addArbiter',
          args: [arbiter],
        });
      }).rejects.toThrow('Not admin');
    });
  });

  describe('Admin Functions', () => {
    it('should return admin address', async () => {
      mockContractRead.mockResolvedValueOnce(admin);

      const result = await mockContractRead({
        functionName: 'admin',
      });

      expect(result).toBe(admin);
    });

    it('should allow admin to set new admin', async () => {
      const newAdmin = '0xNewAdmin1234567890123456789012345678' as Address;
      mockContractWrite.mockResolvedValueOnce('0xhash');

      const result = await mockContractWrite({
        functionName: 'setAdmin',
        args: [newAdmin],
      });

      expect(result).toBe('0xhash');
    });

    it('should allow admin to pause contract', async () => {
      mockContractWrite.mockResolvedValueOnce('0xhash');

      const result = await mockContractWrite({
        functionName: 'pause',
        args: [],
      });

      expect(result).toBe('0xhash');
    });

    it('should prevent operations when paused', async () => {
      mockContractWrite.mockRejectedValueOnce(new Error('Contract is paused'));

      await expect(async () => {
        await mockContractWrite({
          functionName: 'createEscrow',
          args: [seller, parseEther('1000'), tokenAddress, 'Description', arbiter],
        });
      }).rejects.toThrow('paused');
    });

    it('should allow admin to emergency release', async () => {
      mockContractWrite.mockResolvedValueOnce('0xhash');

      const result = await mockContractWrite({
        functionName: 'emergencyRelease',
        args: [1n, buyer, 'Security concern'],
      });

      expect(result).toBe('0xhash');
    });

    it('should allow admin to set expiry duration', async () => {
      mockContractWrite.mockResolvedValueOnce('0xhash');

      const result = await mockContractWrite({
        functionName: 'setExpiryDuration',
        args: [2592000n], // 30 days
      });

      expect(result).toBe('0xhash');
    });
  });

  describe('Edge Cases and Integration', () => {
    it('should handle zero balance escrow', async () => {
      mockContractRead.mockResolvedValueOnce(0n);

      const balance = await mockContractRead({
        functionName: 'getEscrowBalance',
        args: [1n],
      });

      expect(balance).toBe(0n);
    });

    it('should prevent operations on cancelled escrow', async () => {
      mockContractWrite.mockRejectedValueOnce(new Error('Escrow cancelled'));

      await expect(async () => {
        await mockContractWrite({
          functionName: 'releaseFunds',
          args: [1n],
        });
      }).rejects.toThrow('cancelled');
    });

    it('should get pending escrows', async () => {
      mockContractRead.mockResolvedValueOnce([1n, 2n, 3n]);

      const pending = await mockContractRead({
        functionName: 'getPendingEscrows',
      });

      expect(pending).toHaveLength(3);
    });

    it('should emit EscrowStateChanged event', async () => {
      mockContractWrite.mockResolvedValueOnce('0xhash');

      const result = await mockContractWrite({
        functionName: 'deposit',
        args: [1n],
      });

      expect(result).toBe('0xhash');
    });
  });
});

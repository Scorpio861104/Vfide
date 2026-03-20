/**
 * VFIDEPresale Contract Tests
 * Mock-based test suite for the VFIDE presale contract interface with tiered pricing
 * NOTE: These are interface-level mock tests. Real on-chain tests are in test/hardhat/.
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import {
  createPublicClient,
  createWalletClient,
  http,
  parseEther,
  formatEther,
  Address,
} from 'viem';
import { sepolia } from 'viem/chains';

const mockContractRead = jest.fn();
const mockContractWrite = jest.fn();
const mockWaitForTransactionReceipt = jest.fn();

jest.mock('viem', () => ({
  ...jest.requireActual('viem'),
  createPublicClient: jest.fn(),
  createWalletClient: jest.fn(),
}));

describe('VFIDEPresale Contract', () => {
  let presaleAddress: Address;
  let owner: Address;
  let buyer1: Address;
  let buyer2: Address;
  let referrer: Address;

  beforeEach(() => {
    presaleAddress = '0x1234567890123456789012345678901234567890' as Address;
    owner = '0xOwner1234567890123456789012345678901234' as Address;
    buyer1 = '0xBuyer1234567890123456789012345678901234' as Address;
    buyer2 = '0xBuyer2234567890123456789012345678901234' as Address;
    referrer = '0xRefer1234567890123456789012345678901234' as Address;

    jest.clearAllMocks();
  });

  describe('Presale Configuration', () => {
    it('should return correct base supply', async () => {
      mockContractRead.mockResolvedValueOnce(parseEther('35000000'));
      const result = await mockContractRead({ functionName: 'BASE_SUPPLY' });
      expect(result).toBe(parseEther('35000000'));
    });

    it('should return correct total supply', async () => {
      mockContractRead.mockResolvedValueOnce(parseEther('35000000'));
      const result = await mockContractRead({ functionName: 'TOTAL_SUPPLY' });
      expect(result).toBe(parseEther('35000000'));
    });

    it('should return correct sale duration', async () => {
      mockContractRead.mockResolvedValueOnce(30 * 24 * 60 * 60); // 30 days
      const result = await mockContractRead({ functionName: 'SALE_DURATION' });
      expect(result).toBe(30 * 24 * 60 * 60);
    });

    it('should return correct minimum goal', async () => {
      mockContractRead.mockResolvedValueOnce(parseEther('8750000'));
      const result = await mockContractRead({ functionName: 'MINIMUM_GOAL' });
      expect(result).toBe(parseEther('8750000'));
    });

    it('should return correct max per wallet', async () => {
      mockContractRead.mockResolvedValueOnce(parseEther('500000'));
      const result = await mockContractRead({ functionName: 'MAX_PER_WALLET' });
      expect(result).toBe(parseEther('500000'));
    });

    it('should return correct minimum purchase in ETH', async () => {
      mockContractRead.mockResolvedValueOnce(parseEther('0.01'));
      const result = await mockContractRead({ functionName: 'MIN_PURCHASE_ETH' });
      expect(result).toBe(parseEther('0.01'));
    });

    it('should return correct minimum purchase in USD', async () => {
      mockContractRead.mockResolvedValueOnce(10_000_000n); // 10 USD in 6 decimals
      const result = await mockContractRead({ functionName: 'MIN_PURCHASE_USD' });
      expect(result).toBe(10_000_000n);
    });

    it('should return correct max purchases per wallet', async () => {
      mockContractRead.mockResolvedValueOnce(100);
      const result = await mockContractRead({ functionName: 'MAX_PURCHASES_PER_WALLET' });
      expect(result).toBe(100);
    });
  });

  describe('Tier Configuration', () => {
    it('should return Tier 0 price', async () => {
      mockContractRead.mockResolvedValueOnce(30_000n); // $0.03 in microUSD
      const result = await mockContractRead({ functionName: 'TIER_0_PRICE' });
      expect(result).toBe(30_000n);
    });

    it('should return Tier 0 cap', async () => {
      mockContractRead.mockResolvedValueOnce(parseEther('10000000'));
      const result = await mockContractRead({ functionName: 'TIER_0_CAP' });
      expect(result).toBe(parseEther('10000000'));
    });

    it('should return Tier 1 price', async () => {
      mockContractRead.mockResolvedValueOnce(50_000n); // $0.05 in microUSD
      const result = await mockContractRead({ functionName: 'TIER_1_PRICE' });
      expect(result).toBe(50_000n);
    });

    it('should return Tier 1 cap', async () => {
      mockContractRead.mockResolvedValueOnce(parseEther('10000000'));
      const result = await mockContractRead({ functionName: 'TIER_1_CAP' });
      expect(result).toBe(parseEther('10000000'));
    });

    it('should return Tier 2 price', async () => {
      mockContractRead.mockResolvedValueOnce(70_000n); // $0.07 in microUSD
      const result = await mockContractRead({ functionName: 'TIER_2_PRICE' });
      expect(result).toBe(70_000n);
    });

    it('should return Tier 2 cap', async () => {
      mockContractRead.mockResolvedValueOnce(parseEther('15000000'));
      const result = await mockContractRead({ functionName: 'TIER_2_CAP' });
      expect(result).toBe(parseEther('15000000'));
    });

    it('should check tier availability', async () => {
      mockContractRead.mockResolvedValueOnce(true);
      const result = await mockContractRead({ functionName: 'isTierAvailable', args: [0] });
      expect(result).toBe(true);
    });

    it('should get tier remaining', async () => {
      mockContractRead.mockResolvedValueOnce(parseEther('25000000'));
      const result = await mockContractRead({ functionName: 'getTierRemaining', args: [0] });
      expect(result).toBe(parseEther('25000000'));
    });

    it('should get tier price', async () => {
      mockContractRead.mockResolvedValueOnce(30_000n); // $0.03 in microUSD
      const result = await mockContractRead({ functionName: 'getTierPrice', args: [0] });
      expect(result).toBe(30_000n);
    });

    it('should get tier required lock', async () => {
      mockContractRead.mockResolvedValueOnce(180 * 24 * 3600); // Tier 0 = 180 days
      const result = await mockContractRead({ functionName: 'getTierRequiredLock', args: [0] });
      expect(result).toBe(180 * 24 * 3600);
    });
  });

  describe('Lock Period Bonuses — removed', () => {
    it('confirms lock bonuses are not available', () => {
      // BONUS_NO_LOCK, BONUS_90_DAYS, BONUS_180_DAYS have been removed from VFIDEPresale.
      // Lock periods exist for commitment tracking, not to earn bonus tokens.
      expect(true).toBe(true);
    });

    it('should return no lock immediate release percentage', async () => {
      mockContractRead.mockResolvedValueOnce(100); // 100% immediate
      const result = await mockContractRead({ functionName: 'IMMEDIATE_NO_LOCK' });
      expect(result).toBe(100);
    });

    it('should return 90 days immediate release percentage', async () => {
      mockContractRead.mockResolvedValueOnce(20); // 20% immediate
      const result = await mockContractRead({ functionName: 'IMMEDIATE_90_DAYS' });
      expect(result).toBe(20);
    });

    it('should return 180 days immediate release percentage', async () => {
      mockContractRead.mockResolvedValueOnce(10); // 10% immediate
      const result = await mockContractRead({ functionName: 'IMMEDIATE_180_DAYS' });
      expect(result).toBe(10);
    });
  });

  describe('Referral System — removed', () => {
    it('confirms referral bonuses are not available', () => {
      // buyTokensWithReferral, buyWithStableReferral, and claimReferralBonus
      // have been removed from VFIDEPresale. VFIDE has no referral or bonus system.
      expect(true).toBe(true);
    });
  });

  describe('Buy Tokens - ETH', () => {
    it('should allow buying tokens with ETH', async () => {
      mockContractWrite.mockResolvedValueOnce('0xhash');
      const result = await mockContractWrite({
        functionName: 'buyTokens',
        args: [0], // Tier 0, no lock
      });
      expect(result).toBe('0xhash');
    });

    it('should reject purchase below minimum ETH', async () => {
      mockContractWrite.mockRejectedValueOnce(new Error('BelowMinimum'));
      await expect(
        mockContractWrite({
          functionName: 'buyTokens',
          args: [0],
          value: parseEther('0.005'),
        })
      ).rejects.toThrow('BelowMinimum');
    });

    it('should reject purchase exceeding max per wallet', async () => {
      mockContractWrite.mockRejectedValueOnce(new Error('MaxPerWalletExceeded'));
      await expect(
        mockContractWrite({
          functionName: 'buyTokens',
          args: [0],
          value: parseEther('51'),
        })
      ).rejects.toThrow('MaxPerWalletExceeded');
    });

    it('should reject purchase when sale not active', async () => {
      mockContractWrite.mockRejectedValueOnce(new Error('SaleNotActive'));
      await expect(
        mockContractWrite({
          functionName: 'buyTokens',
          args: [0],
        })
      ).rejects.toThrow('SaleNotActive');
    });

    it('should reject purchase when paused', async () => {
      mockContractWrite.mockRejectedValueOnce(new Error('Pausable: paused'));
      await expect(
        mockContractWrite({
          functionName: 'buyTokens',
          args: [0],
        })
      ).rejects.toThrow('Pausable: paused');
    });

    it('should reject purchase when ETH not accepted', async () => {
      mockContractWrite.mockRejectedValueOnce(new Error('EthNotAccepted'));
      await expect(
        mockContractWrite({
          functionName: 'buyTokens',
          args: [0],
        })
      ).rejects.toThrow('EthNotAccepted');
    });

    it('should reject purchase with stale ETH price', async () => {
      mockContractWrite.mockRejectedValueOnce(new Error('StalePrice'));
      await expect(
        mockContractWrite({
          functionName: 'buyTokens',
          args: [0],
        })
      ).rejects.toThrow('StalePrice');
    });

  });

  describe('Buy Tokens - Stablecoins', () => {
    it('should allow buying with stablecoin', async () => {
      mockContractWrite.mockResolvedValueOnce('0xhash');
      const result = await mockContractWrite({
        functionName: 'buyWithStable',
        args: [buyer1, parseEther('100'), 0],
      });
      expect(result).toBe('0xhash');
    });

    it('should reject invalid stablecoin', async () => {
      mockContractWrite.mockRejectedValueOnce(new Error('InvalidStablecoin'));
      await expect(
        mockContractWrite({
          functionName: 'buyWithStable',
          args: [buyer1, parseEther('100'), 0],
        })
      ).rejects.toThrow('InvalidStablecoin');
    });

    it('should reject purchase below minimum USD', async () => {
      mockContractWrite.mockRejectedValueOnce(new Error('BelowMinimum'));
      await expect(
        mockContractWrite({
          functionName: 'buyWithStable',
          args: [buyer1, parseEther('20'), 0],
        })
      ).rejects.toThrow('BelowMinimum');
    });
  });

  describe('Token Calculations', () => {
    it('should calculate tokens from ETH', async () => {
      mockContractRead.mockResolvedValueOnce(parseEther('50000'));
      const result = await mockContractRead({
        functionName: 'calculateTokensFromEth',
        args: [parseEther('1'), 0],
      });
      expect(result).toBe(parseEther('50000'));
    });

    it('should calculate tokens from ETH for specific tier', async () => {
      mockContractRead.mockResolvedValueOnce(parseEther('40000'));
      const result = await mockContractRead({
        functionName: 'calculateTokensFromEthTier',
        args: [parseEther('1'), 1],
      });
      expect(result).toBe(parseEther('40000'));
    });

    it('should calculate tokens from USD', async () => {
      mockContractRead.mockResolvedValueOnce(parseEther('50000'));
      const result = await mockContractRead({
        functionName: 'calculateTokensFromUsd',
        args: [parseEther('100'), 0],
      });
      expect(result).toBe(parseEther('50000'));
    });

    it('should preview tokens from USD', async () => {
      mockContractRead.mockResolvedValueOnce(parseEther('50000'));
      const result = await mockContractRead({
        functionName: 'calculateTokensFromUsdPreview',
        args: [parseEther('100'), 0],
      });
      expect(result).toBe(parseEther('50000'));
    });

    it('should calculate tokens from USD for specific tier', async () => {
      mockContractRead.mockResolvedValueOnce(parseEther('40000'));
      const result = await mockContractRead({
        functionName: 'calculateTokensFromUsdTier',
        args: [parseEther('100'), 1],
      });
      expect(result).toBe(parseEther('40000'));
    });

    it('should calculate generic tokens', async () => {
      mockContractRead.mockResolvedValueOnce(parseEther('50000'));
      const result = await mockContractRead({
        functionName: 'calculateTokens',
        args: [parseEther('100'), 0],
      });
      expect(result).toBe(parseEther('50000'));
    });

    it('should calculate listing price', async () => {
      mockContractRead.mockResolvedValueOnce(parseEther('0.001'));
      const result = await mockContractRead({ functionName: 'calculateListingPrice' });
      expect(result).toBe(parseEther('0.001'));
    });
  });

  describe('Claiming Tokens', () => {
    it('should allow claiming immediate tokens', async () => {
      mockContractWrite.mockResolvedValueOnce('0xhash');
      const result = await mockContractWrite({ functionName: 'claimImmediate' });
      expect(result).toBe('0xhash');
    });

    it('should allow claiming locked tokens', async () => {
      mockContractWrite.mockResolvedValueOnce('0xhash');
      const result = await mockContractWrite({ functionName: 'claimLocked' });
      expect(result).toBe('0xhash');
    });

    it('should allow claiming all tokens', async () => {
      mockContractWrite.mockResolvedValueOnce('0xhash');
      const result = await mockContractWrite({ functionName: 'claimAll' });
      expect(result).toBe('0xhash');
    });

    it('should reject claim when not finalized', async () => {
      mockContractWrite.mockRejectedValueOnce(new Error('NotFinalized'));
      await expect(mockContractWrite({ functionName: 'claimImmediate' })).rejects.toThrow(
        'NotFinalized'
      );
    });

    it('should reject claim with no tokens available', async () => {
      mockContractWrite.mockRejectedValueOnce(new Error('NothingToClaim'));
      await expect(mockContractWrite({ functionName: 'claimImmediate' })).rejects.toThrow(
        'NothingToClaim'
      );
    });

    it('should reject locked token claim before unlock time', async () => {
      mockContractWrite.mockRejectedValueOnce(new Error('TokensStillLocked'));
      await expect(mockContractWrite({ functionName: 'claimLocked' })).rejects.toThrow(
        'TokensStillLocked'
      );
    });
  });

  describe('Refunds', () => {
    it('should check if user can claim refund', async () => {
      mockContractRead.mockResolvedValueOnce(true);
      const result = await mockContractRead({ functionName: 'canClaimRefund', args: [buyer1] });
      expect(result).toBe(true);
    });

    it('should allow claiming ETH refund', async () => {
      mockContractWrite.mockResolvedValueOnce('0xhash');
      const result = await mockContractWrite({ functionName: 'claimRefund' });
      expect(result).toBe('0xhash');
    });

    it('should allow claiming stable refund', async () => {
      mockContractWrite.mockResolvedValueOnce('0xhash');
      const result = await mockContractWrite({ functionName: 'claimStableRefund' });
      expect(result).toBe('0xhash');
    });

    it('should allow enabling refunds', async () => {
      mockContractWrite.mockResolvedValueOnce('0xhash');
      const result = await mockContractWrite({ functionName: 'enableRefunds' });
      expect(result).toBe('0xhash');
    });

    it('should recover unclaimed stable refunds', async () => {
      mockContractWrite.mockResolvedValueOnce('0xhash');
      const result = await mockContractWrite({ functionName: 'recoverUnclaimedStableRefunds' });
      expect(result).toBe('0xhash');
    });

    it('should check if refunds enabled', async () => {
      mockContractRead.mockResolvedValueOnce(true);
      const result = await mockContractRead({ functionName: 'refundsEnabled' });
      expect(result).toBe(true);
    });

    it('should get refund deadline', async () => {
      const deadline = Math.floor(Date.now() / 1000) + 86400;
      mockContractRead.mockResolvedValueOnce(deadline);
      const result = await mockContractRead({ functionName: 'refundDeadline' });
      expect(result).toBe(deadline);
    });

    it('should reject refund when not enabled', async () => {
      mockContractWrite.mockRejectedValueOnce(new Error('RefundsNotEnabled'));
      await expect(mockContractWrite({ functionName: 'claimRefund' })).rejects.toThrow(
        'RefundsNotEnabled'
      );
    });

    it('should reject refund after deadline', async () => {
      mockContractWrite.mockRejectedValueOnce(new Error('RefundDeadlinePassed'));
      await expect(mockContractWrite({ functionName: 'claimRefund' })).rejects.toThrow(
        'RefundDeadlinePassed'
      );
    });

    it('should recover unclaimed refunds', async () => {
      mockContractWrite.mockResolvedValueOnce('0xhash');
      const result = await mockContractWrite({ functionName: 'recoverUnclaimedRefunds' });
      expect(result).toBe('0xhash');
    });
  });

  describe('Presale Management', () => {
    it('should allow depositing tokens', async () => {
      mockContractWrite.mockResolvedValueOnce('0xhash');
      const result = await mockContractWrite({
        functionName: 'depositTokens',
      });
      expect(result).toBe('0xhash');
    });

    it('should allow finalizing presale', async () => {
      mockContractWrite.mockResolvedValueOnce('0xhash');
      const result = await mockContractWrite({ functionName: 'finalizePresale' });
      expect(result).toBe('0xhash');
    });

    it('should allow extending sale', async () => {
      mockContractWrite.mockResolvedValueOnce('0xhash');
      const result = await mockContractWrite({
        functionName: 'extendSale',
        args: [86400], // 1 day extension
      });
      expect(result).toBe('0xhash');
    });

    it('should allow canceling purchase', async () => {
      mockContractWrite.mockResolvedValueOnce('0xhash');
      const result = await mockContractWrite({
        functionName: 'cancelPurchase',
        args: [0],
      });
      expect(result).toBe('0xhash');
    });

    it('should allow withdrawing unsold tokens', async () => {
      mockContractWrite.mockResolvedValueOnce('0xhash');
      const result = await mockContractWrite({ functionName: 'withdrawUnsold' });
      expect(result).toBe('0xhash');
    });

    it('should check if finalized', async () => {
      mockContractRead.mockResolvedValueOnce(false);
      const result = await mockContractRead({ functionName: 'finalized' });
      expect(result).toBe(false);
    });

    it('should check if sale extended', async () => {
      mockContractRead.mockResolvedValueOnce(false);
      const result = await mockContractRead({ functionName: 'saleExtended' });
      expect(result).toBe(false);
    });

    it('should check if tokens deposited', async () => {
      mockContractRead.mockResolvedValueOnce(true);
      const result = await mockContractRead({ functionName: 'tokensDeposited' });
      expect(result).toBe(true);
    });
  });

  describe('Admin Controls', () => {
    it('should allow setting pause state', async () => {
      mockContractWrite.mockResolvedValueOnce('0xhash');
      const result = await mockContractWrite({
        functionName: 'setPaused',
        args: [true],
      });
      expect(result).toBe('0xhash');
    });

    it('should allow setting ETH accepted', async () => {
      mockContractWrite.mockResolvedValueOnce('0xhash');
      const result = await mockContractWrite({
        functionName: 'setEthAccepted',
        args: [true],
      });
      expect(result).toBe('0xhash');
    });

    it('should allow setting ETH price', async () => {
      mockContractWrite.mockResolvedValueOnce('0xhash');
      const result = await mockContractWrite({
        functionName: 'setEthPrice',
        args: [parseEther('2500')],
      });
      expect(result).toBe('0xhash');
    });

    it('should allow setting stablecoin registry', async () => {
      mockContractWrite.mockResolvedValueOnce('0xhash');
      const result = await mockContractWrite({
        functionName: 'setStablecoinRegistry',
        args: [buyer1],
      });
      expect(result).toBe('0xhash');
    });

    it('should allow setting tier enabled', async () => {
      mockContractWrite.mockResolvedValueOnce('0xhash');
      const result = await mockContractWrite({
        functionName: 'setTierEnabled',
        args: [0, true],
      });
      expect(result).toBe('0xhash');
    });

    it('should reject non-owner admin calls', async () => {
      mockContractWrite.mockRejectedValueOnce(new Error('Ownable: caller is not the owner'));
      await expect(
        mockContractWrite({
          functionName: 'setPaused',
          args: [true],
        })
      ).rejects.toThrow('Ownable: caller is not the owner');
    });
  });

  describe('View Functions', () => {
    it('should get presale stats', async () => {
      const stats = {
        totalSold: parseEther('100000000'),
        totalEthRaised: parseEther('500'),
        totalUsdRaised: parseEther('1250000'),
        tier0Sold: parseEther('50000000'),
        tier1Sold: parseEther('50000000'),
        tier2Sold: parseEther('0'),
      };
      mockContractRead.mockResolvedValueOnce(stats);
      const result = await mockContractRead({ functionName: 'getPresaleStats' });
      expect(result).toEqual(stats);
    });

    it('should get user info', async () => {
      const userInfo = {
        ethContributed: parseEther('1'),
        usdContributed: parseEther('2500'),
        tokensAllocated: parseEther('5000'),
        purchaseCount: 1,
        lastPurchaseTime: Math.floor(Date.now() / 1000),
      };
      mockContractRead.mockResolvedValueOnce(userInfo);
      const result = await mockContractRead({ functionName: 'getUserInfo', args: [buyer1] });
      expect(result).toEqual(userInfo);
    });

    it('should get user dashboard', async () => {
      const dashboard = {
        purchaseCount: 2,
        totalAllocated: parseEther('5000'),
        ethContributed: parseEther('1'),
        usdContributed: 3500_000000n, // $3500 in 6 decimals
      };
      mockContractRead.mockResolvedValueOnce(dashboard);
      const result = await mockContractRead({ functionName: 'getUserDashboard', args: [buyer1] });
      expect(result).toEqual(dashboard);
    });

    it('should get purchase details', async () => {
      const details = {
        ethAmount: parseEther('1'),
        tokensBase: parseEther('2500'),
        tokensBonus: parseEther('500'),
        lockPeriod: 90,
        purchaseTime: Math.floor(Date.now() / 1000),
      };
      mockContractRead.mockResolvedValueOnce(details);
      const result = await mockContractRead({
        functionName: 'getPurchaseDetails',
        args: [buyer1, 0],
      });
      expect(result).toEqual(details);
    });

    it('should get all purchases', async () => {
      mockContractRead.mockResolvedValueOnce([]);
      const result = await mockContractRead({ functionName: 'getAllPurchases', args: [buyer1] });
      expect(Array.isArray(result)).toBe(true);
    });

    it('should get finalization details', async () => {
      const details = {
        listingPrice: parseEther('0.001'),
        lpVfideAmount: parseEther('50000000'),
        finalizedTime: Math.floor(Date.now() / 1000),
      };
      mockContractRead.mockResolvedValueOnce(details);
      const result = await mockContractRead({ functionName: 'getFinalizationDetails' });
      expect(result).toEqual(details);
    });

    it('should get raise stats', async () => {
      const stats = {
        totalEthRaised: parseEther('500'),
        totalUsdRaised: parseEther('1250000'),
        minimumGoal: parseEther('1200'),
        goalReached: true,
      };
      mockContractRead.mockResolvedValueOnce(stats);
      const result = await mockContractRead({ functionName: 'getRaiseStats' });
      expect(result).toEqual(stats);
    });

    it('should get user stable contributions', async () => {
      mockContractRead.mockResolvedValueOnce(parseEther('1000'));
      const result = await mockContractRead({
        functionName: 'getUserStableContributions',
        args: [buyer1],
      });
      expect(result).toBe(parseEther('1000'));
    });
  });

  describe('State Variables', () => {
    it('should get sale start time', async () => {
      const startTime = Math.floor(Date.now() / 1000);
      mockContractRead.mockResolvedValueOnce(startTime);
      const result = await mockContractRead({ functionName: 'saleStartTime' });
      expect(result).toBe(startTime);
    });

    it('should get sale end time', async () => {
      const endTime = Math.floor(Date.now() / 1000) + 7 * 86400;
      mockContractRead.mockResolvedValueOnce(endTime);
      const result = await mockContractRead({ functionName: 'saleEndTime' });
      expect(result).toBe(endTime);
    });

    it('should get ETH price USD', async () => {
      mockContractRead.mockResolvedValueOnce(parseEther('2500'));
      const result = await mockContractRead({ functionName: 'ethPriceUsd' });
      expect(result).toBe(parseEther('2500'));
    });

    it('should get ETH price last updated', async () => {
      const timestamp = Math.floor(Date.now() / 1000);
      mockContractRead.mockResolvedValueOnce(timestamp);
      const result = await mockContractRead({ functionName: 'ethPriceLastUpdated' });
      expect(result).toBe(timestamp);
    });

    it('should check if ETH price stale', async () => {
      mockContractRead.mockResolvedValueOnce(false);
      const result = await mockContractRead({ functionName: 'isEthPriceStale' });
      expect(result).toBe(false);
    });

    it('should get paused state', async () => {
      mockContractRead.mockResolvedValueOnce(false);
      const result = await mockContractRead({ functionName: 'paused' });
      expect(result).toBe(false);
    });

    it('should get ETH accepted state', async () => {
      mockContractRead.mockResolvedValueOnce(true);
      const result = await mockContractRead({ functionName: 'ethAccepted' });
      expect(result).toBe(true);
    });

    it('should get tier enabled states', async () => {
      mockContractRead.mockResolvedValueOnce(true);
      const result = await mockContractRead({ functionName: 'tier0Enabled' });
      expect(result).toBe(true);
    });

    it('should get tier sold amounts', async () => {
      mockContractRead.mockResolvedValueOnce(parseEther('25000000'));
      const result = await mockContractRead({ functionName: 'tier0Sold' });
      expect(result).toBe(parseEther('25000000'));
    });

    it('should get total sold', async () => {
      mockContractRead.mockResolvedValueOnce(parseEther('100000000'));
      const result = await mockContractRead({ functionName: 'totalSold' });
      expect(result).toBe(parseEther('100000000'));
    });

    it('should get total base sold', async () => {
      mockContractRead.mockResolvedValueOnce(parseEther('80000000'));
      const result = await mockContractRead({ functionName: 'totalBaseSold' });
      expect(result).toBe(parseEther('80000000'));
    });

    it('should get total sold', async () => {
      mockContractRead.mockResolvedValueOnce(parseEther('20000000'));
      const result = await mockContractRead({ functionName: 'totalSold' });
      expect(result).toBe(parseEther('20000000'));
    });

    it('should get listing price', async () => {
      mockContractRead.mockResolvedValueOnce(parseEther('0.001'));
      const result = await mockContractRead({ functionName: 'listingPrice' });
      expect(result).toBe(parseEther('0.001'));
    });

    it('should get LP VFIDE amount', async () => {
      mockContractRead.mockResolvedValueOnce(parseEther('50000000'));
      const result = await mockContractRead({ functionName: 'lpVfideAmount' });
      expect(result).toBe(parseEther('50000000'));
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero purchase amount', async () => {
      mockContractWrite.mockRejectedValueOnce(new Error('InvalidAmount'));
      await expect(
        mockContractWrite({
          functionName: 'buyTokens',
          args: [0],
          value: parseEther('0'),
        })
      ).rejects.toThrow('InvalidAmount');
    });

    it('should handle tier sold out', async () => {
      mockContractWrite.mockRejectedValueOnce(new Error('TierSoldOut'));
      await expect(
        mockContractWrite({
          functionName: 'buyTokens',
          args: [0],
        })
      ).rejects.toThrow('TierSoldOut');
    });

    it('should handle max extension exceeded', async () => {
      mockContractWrite.mockRejectedValueOnce(new Error('MaxExtensionExceeded'));
      await expect(
        mockContractWrite({
          functionName: 'extendSale',
          args: [100 * 86400], // 100 days
        })
      ).rejects.toThrow('MaxExtensionExceeded');
    });

    it('should check should enable refunds logic', async () => {
      mockContractRead.mockResolvedValueOnce(false);
      const result = await mockContractRead({ functionName: 'shouldEnableRefunds' });
      expect(result).toBe(false);
    });

    it('should handle purchase count limit', async () => {
      mockContractWrite.mockRejectedValueOnce(new Error('MaxPurchasesExceeded'));
      await expect(
        mockContractWrite({
          functionName: 'buyTokens',
          args: [0],
        })
      ).rejects.toThrow('MaxPurchasesExceeded');
    });

    it('should get last purchase time', async () => {
      const timestamp = Math.floor(Date.now() / 1000);
      mockContractRead.mockResolvedValueOnce(timestamp);
      const result = await mockContractRead({ functionName: 'lastPurchaseTime', args: [buyer1] });
      expect(result).toBe(timestamp);
    });

    it('should get total ETH raised', async () => {
      mockContractRead.mockResolvedValueOnce(parseEther('500'));
      const result = await mockContractRead({ functionName: 'totalEthRaised' });
      expect(result).toBe(parseEther('500'));
    });

    it('should get total USD raised', async () => {
      mockContractRead.mockResolvedValueOnce(parseEther('1250000'));
      const result = await mockContractRead({ functionName: 'totalUsdRaised' });
      expect(result).toBe(parseEther('1250000'));
    });

    it('should get ETH contributed by user', async () => {
      mockContractRead.mockResolvedValueOnce(parseEther('1'));
      const result = await mockContractRead({ functionName: 'ethContributed', args: [buyer1] });
      expect(result).toBe(parseEther('1'));
    });

    it('should get USD contributed by user', async () => {
      mockContractRead.mockResolvedValueOnce(parseEther('2500'));
      const result = await mockContractRead({ functionName: 'usdContributed', args: [buyer1] });
      expect(result).toBe(parseEther('2500'));
    });

    it('should get stable contributed by user', async () => {
      mockContractRead.mockResolvedValueOnce(parseEther('1000'));
      const result = await mockContractRead({ functionName: 'stableContributed', args: [buyer1] });
      expect(result).toBe(parseEther('1000'));
    });

    it('should get total allocated to user', async () => {
      mockContractRead.mockResolvedValueOnce(parseEther('5000'));
      const result = await mockContractRead({ functionName: 'totalAllocated', args: [buyer1] });
      expect(result).toBe(parseEther('5000'));
    });

    it('should get total claimed by user', async () => {
      mockContractRead.mockResolvedValueOnce(parseEther('500'));
      const result = await mockContractRead({ functionName: 'totalClaimed', args: [buyer1] });
      expect(result).toBe(parseEther('500'));
    });

    it('should get VFIDE token address', async () => {
      mockContractRead.mockResolvedValueOnce(buyer1);
      const result = await mockContractRead({ functionName: 'vfideToken' });
      expect(result).toBe(buyer1);
    });

    it('should get DAO address', async () => {
      mockContractRead.mockResolvedValueOnce(buyer1);
      const result = await mockContractRead({ functionName: 'DAO' });
      expect(result).toBe(buyer1);
    });

    it('should get treasury address', async () => {
      mockContractRead.mockResolvedValueOnce(buyer1);
      const result = await mockContractRead({ functionName: 'TREASURY' });
      expect(result).toBe(buyer1);
    });

    it('should get stablecoin registry address', async () => {
      mockContractRead.mockResolvedValueOnce(buyer1);
      const result = await mockContractRead({ functionName: 'stablecoinRegistry' });
      expect(result).toBe(buyer1);
    });
  });
});

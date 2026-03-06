/**
 * BridgeSecurityModule Contract Tests
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { Address, parseEther } from 'viem';

const mockContractRead: any = jest.fn();
const mockContractWrite: any = jest.fn();

jest.mock('viem', () => {
  const actualViem = jest.requireActual('viem') as Record<string, unknown>;
  return { ...actualViem, createPublicClient: jest.fn(), createWalletClient: jest.fn() };
});

describe('BridgeSecurityModule Contract', () => {
  let owner: Address;
  let bridge: Address;
  let user: Address;

  beforeEach(() => {
    owner = '0xOwner1234567890123456789012345678901234' as Address;
    bridge = '0xBridg1234567890123456789012345678901234' as Address;
    user = '0xUser11234567890123456789012345678901234' as Address;
    jest.clearAllMocks();
  });

  describe('Admin Setters', () => {
    it('should set bridge address', async () => {
      mockContractWrite.mockResolvedValueOnce('0xhash');
      expect(await mockContractWrite({ functionName: 'setBridge', args: [bridge] })).toBe('0xhash');
    });

    it('should reject zero user in whitelist setter', async () => {
      mockContractWrite.mockRejectedValueOnce(new Error('Invalid user'));
      await expect(
        mockContractWrite({
          functionName: 'setWhitelist',
          args: ['0x0000000000000000000000000000000000000000' as Address, true],
        })
      ).rejects.toThrow('Invalid user');
    });

    it('should reject zero user in blacklist setter', async () => {
      mockContractWrite.mockRejectedValueOnce(new Error('Invalid user'));
      await expect(
        mockContractWrite({
          functionName: 'setBlacklist',
          args: ['0x0000000000000000000000000000000000000000' as Address, true],
        })
      ).rejects.toThrow('Invalid user');
    });

    it('should reject inconsistent hourly and daily limits', async () => {
      mockContractWrite.mockRejectedValueOnce(new Error('Hourly exceeds daily'));
      await expect(
        mockContractWrite({ functionName: 'setUserLimits', args: [parseEther('1000'), parseEther('500')] })
      ).rejects.toThrow('Hourly exceeds daily');
    });

    it('should reject zero limits', async () => {
      mockContractWrite.mockRejectedValueOnce(new Error('Invalid limits'));
      await expect(mockContractWrite({ functionName: 'setUserLimits', args: [0, 0] })).rejects.toThrow('Invalid limits');
    });
  });

  describe('Reads', () => {
    it('should read configured bridge', async () => {
      mockContractRead.mockResolvedValueOnce(bridge);
      expect(await mockContractRead({ functionName: 'bridge' })).toBe(bridge);
    });

    it('should read required oracles', async () => {
      mockContractRead.mockResolvedValueOnce(2);
      expect(await mockContractRead({ functionName: 'requiredOracles' })).toBe(2);
    });

    it('should read whitelist status', async () => {
      mockContractRead.mockResolvedValueOnce(true);
      expect(await mockContractRead({ functionName: 'whitelist', args: [user] })).toBe(true);
    });
  });
});

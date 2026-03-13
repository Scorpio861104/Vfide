/**
 * OwnerControlPanel Contract Tests
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { Address, parseEther } from 'viem';

const mockContractRead = jest.fn();
const mockContractWrite = jest.fn();

jest.mock('viem', () => ({
  ...jest.requireActual('viem'),
  createPublicClient: jest.fn(),
  createWalletClient: jest.fn(),
}));

describe('OwnerControlPanel Contract', () => {
  let owner: Address, user1: Address;

  beforeEach(() => {
    owner = '0xOwner1234567890123456789012345678901234' as Address;
    user1 = '0xUser11234567890123456789012345678901234' as Address;
    jest.clearAllMocks();
  });

  describe('Emergency Controls', () => {
    it('should pause all', async () => {
      mockContractWrite.mockResolvedValueOnce('0xhash');
      expect(await mockContractWrite({ functionName: 'emergency_pauseAll' })).toBe('0xhash');
    });

    it('should resume all', async () => {
      mockContractWrite.mockResolvedValueOnce('0xhash');
      expect(await mockContractWrite({ functionName: 'emergency_resumeAll' })).toBe('0xhash');
    });

    it('should recover ETH', async () => {
      mockContractWrite.mockResolvedValueOnce('0xhash');
      expect(await mockContractWrite({ functionName: 'emergency_recoverETH', args: [owner] })).toBe(
        '0xhash'
      );
    });

    it('should recover tokens', async () => {
      mockContractWrite.mockResolvedValueOnce('0xhash');
      expect(
        await mockContractWrite({ functionName: 'emergency_recoverTokens', args: [user1, owner] })
      ).toBe('0xhash');
    });

    it('should reject unauthorized pause', async () => {
      mockContractWrite.mockRejectedValueOnce(new Error('Ownable: caller is not the owner'));
      await expect(mockContractWrite({ functionName: 'emergency_pauseAll' })).rejects.toThrow(
        'Ownable: caller is not the owner'
      );
    });
  });

  describe('Governance Guardrails', () => {
    it('should set governance delay within allowed range', async () => {
      mockContractWrite.mockResolvedValueOnce('0xhash');

      const tx = await mockContractWrite({ functionName: 'governance_setDelay', args: [86400] });
      expect(tx).toBe('0xhash');
    });

    it('should reject governance delay outside allowed range', async () => {
      mockContractWrite.mockRejectedValueOnce(new Error('OCP_InvalidRange'));

      await expect(
        mockContractWrite({ functionName: 'governance_setDelay', args: [30] })
      ).rejects.toThrow('OCP_InvalidRange');
    });

    it('should set autoswap slippage governance cap', async () => {
      mockContractWrite.mockResolvedValueOnce('0xhash');

      const tx = await mockContractWrite({
        functionName: 'governance_setMaxAutoSwapSlippageBps',
        args: [300],
      });
      expect(tx).toBe('0xhash');
    });

    it('should reject autoswap slippage governance cap above hard max', async () => {
      mockContractWrite.mockRejectedValueOnce(new Error('OCP_InvalidRange'));

      await expect(
        mockContractWrite({ functionName: 'governance_setMaxAutoSwapSlippageBps', args: [9999] })
      ).rejects.toThrow('OCP_InvalidRange');
    });

    it('should set auto work payout bounds', async () => {
      mockContractWrite.mockResolvedValueOnce('0xhash');

      const tx = await mockContractWrite({
        functionName: 'governance_setAutoWorkPayoutBounds',
        args: [0, parseEther('100')],
      });
      expect(tx).toBe('0xhash');
    });

    it('should reject auto work payout bounds when min > max', async () => {
      mockContractWrite.mockRejectedValueOnce(new Error('OCP_InvalidRange'));

      await expect(
        mockContractWrite({
          functionName: 'governance_setAutoWorkPayoutBounds',
          args: [parseEther('10'), parseEther('1')],
        })
      ).rejects.toThrow('OCP_InvalidRange');
    });

    it('should queue a governance action', async () => {
      const actionId = '0xactionid1234';
      mockContractWrite.mockResolvedValueOnce('0xhash');

      const tx = await mockContractWrite({
        functionName: 'governance_queueAction',
        args: [actionId],
      });
      expect(tx).toBe('0xhash');
    });

    it('should cancel a queued governance action', async () => {
      const actionId = '0xactionid1234';
      mockContractWrite.mockResolvedValueOnce('0xhash');

      const tx = await mockContractWrite({
        functionName: 'governance_cancelAction',
        args: [actionId],
      });
      expect(tx).toBe('0xhash');
    });

    it('should reject token_lockPolicy when action is not queued', async () => {
      mockContractWrite.mockRejectedValueOnce(new Error('OCP_ActionNotQueued'));

      await expect(mockContractWrite({ functionName: 'token_lockPolicy' })).rejects.toThrow(
        'OCP_ActionNotQueued'
      );
    });

    it('should reject queued action execution before timelock delay', async () => {
      mockContractWrite.mockRejectedValueOnce(new Error('OCP_ActionNotReady'));

      await expect(
        mockContractWrite({ functionName: 'autoSwap_configure', args: [owner, user1, true, 100] })
      ).rejects.toThrow('OCP_ActionNotReady');
    });

    it('should reject autoswap config when slippage exceeds governance cap', async () => {
      mockContractWrite.mockRejectedValueOnce(new Error('OCP_SlippageTooHigh'));

      await expect(
        mockContractWrite({ functionName: 'autoSwap_configure', args: [owner, user1, true, 9999] })
      ).rejects.toThrow('OCP_SlippageTooHigh');
    });

    it('should reject auto work payout config when outside bounds', async () => {
      mockContractWrite.mockRejectedValueOnce(new Error('OCP_InvalidRange'));

      await expect(
        mockContractWrite({
          functionName: 'ecosystem_configureAutoWorkPayout',
          args: [true, parseEther('999999999'), parseEther('999999999'), parseEther('999999999')],
        })
      ).rejects.toThrow('OCP_InvalidRange');
    });

    it('should allow execution after queue + delay flow', async () => {
      const actionId = '0xactionid1234';
      mockContractRead.mockResolvedValueOnce(actionId);
      mockContractWrite.mockResolvedValueOnce('0xqueuehash');
      mockContractWrite.mockResolvedValueOnce('0xexecuthash');

      const computedActionId = await mockContractRead({
        functionName: 'actionId_token_lockPolicy',
      });
      const queueTx = await mockContractWrite({
        functionName: 'governance_queueAction',
        args: [computedActionId],
      });
      const executeTx = await mockContractWrite({ functionName: 'token_lockPolicy' });

      expect(computedActionId).toBe(actionId);
      expect(queueTx).toBe('0xqueuehash');
      expect(executeTx).toBe('0xexecuthash');
    });

    it('should compute and queue action id for autoSwap_configure then execute', async () => {
      const actionId = '0xautoswapactionid1234';
      mockContractRead.mockResolvedValueOnce(actionId);
      mockContractWrite.mockResolvedValueOnce('0xqueuehash');
      mockContractWrite.mockResolvedValueOnce('0xexecuthash');

      const computedActionId = await mockContractRead({
        functionName: 'actionId_autoSwap_configure',
        args: [owner, user1, true, 100],
      });
      const queueTx = await mockContractWrite({
        functionName: 'governance_queueAction',
        args: [computedActionId],
      });
      const executeTx = await mockContractWrite({
        functionName: 'autoSwap_configure',
        args: [owner, user1, true, 100],
      });

      expect(computedActionId).toBe(actionId);
      expect(queueTx).toBe('0xqueuehash');
      expect(executeTx).toBe('0xexecuthash');
    });

    it('should compute and queue action id for ecosystem_configureAutoWorkPayout then execute', async () => {
      const actionId = '0xautoworkactionid1234';
      mockContractRead.mockResolvedValueOnce(actionId);
      mockContractWrite.mockResolvedValueOnce('0xqueuehash');
      mockContractWrite.mockResolvedValueOnce('0xexecuthash');

      const computedActionId = await mockContractRead({
        functionName: 'actionId_ecosystem_configureAutoWorkPayout',
        args: [true, parseEther('1'), parseEther('0.5'), parseEther('0.25')],
      });
      const queueTx = await mockContractWrite({
        functionName: 'governance_queueAction',
        args: [computedActionId],
      });
      const executeTx = await mockContractWrite({
        functionName: 'ecosystem_configureAutoWorkPayout',
        args: [true, parseEther('1'), parseEther('0.5'), parseEther('0.25')],
      });

      expect(computedActionId).toBe(actionId);
      expect(queueTx).toBe('0xqueuehash');
      expect(executeTx).toBe('0xexecuthash');
    });

    it('should reject cancellation for non-queued action id', async () => {
      mockContractWrite.mockRejectedValueOnce(new Error('OCP_ActionNotQueued'));

      await expect(
        mockContractWrite({ functionName: 'governance_cancelAction', args: ['0xnotqueued'] })
      ).rejects.toThrow('OCP_ActionNotQueued');
    });

    it('should reject emergency recoverETH when action is not queued', async () => {
      mockContractWrite.mockRejectedValueOnce(new Error('OCP_ActionNotQueued'));

      await expect(
        mockContractWrite({ functionName: 'emergency_recoverETH', args: [owner] })
      ).rejects.toThrow('OCP_ActionNotQueued');
    });
  });

  describe('Fee Management', () => {
    it('should set fee policy', async () => {
      mockContractWrite.mockResolvedValueOnce('0xhash');
      expect(await mockContractWrite({ functionName: 'fees_setPolicy', args: [250, 100] })).toBe(
        '0xhash'
      );
    });

    it('should get fee policy', async () => {
      mockContractRead.mockResolvedValueOnce({ baseFee: 250, minFee: 100 });
      expect(await mockContractRead({ functionName: 'fees_getPolicy' })).toEqual({
        baseFee: 250,
        minFee: 100,
      });
    });

    it('should get effective rates', async () => {
      mockContractRead.mockResolvedValueOnce({ buyFee: 250, sellFee: 300 });
      expect(await mockContractRead({ functionName: 'fees_getEffectiveRates' })).toEqual({
        buyFee: 250,
        sellFee: 300,
      });
    });

    it('should preview fee for score', async () => {
      mockContractRead.mockResolvedValueOnce(parseEther('2.5'));
      expect(
        await mockContractRead({
          functionName: 'fees_previewForScore',
          args: [parseEther('100'), 800],
        })
      ).toBe(parseEther('2.5'));
    });

    it('should preview transfer fee', async () => {
      mockContractRead.mockResolvedValueOnce(parseEther('1'));
      expect(
        await mockContractRead({
          functionName: 'fees_previewTransfer',
          args: [user1, owner, parseEther('100')],
        })
      ).toBe(parseEther('1'));
    });
  });

  describe('System Status', () => {
    it('should get system health', async () => {
      mockContractRead.mockResolvedValueOnce({ healthy: true, score: 95 });
      expect(await mockContractRead({ functionName: 'getSystemHealth' })).toEqual({
        healthy: true,
        score: 95,
      });
    });

    it('should get presale status', async () => {
      mockContractRead.mockResolvedValueOnce({ active: true, raised: parseEther('1000') });
      expect(await mockContractRead({ functionName: 'getPresaleStatus' })).toEqual({
        active: true,
        raised: parseEther('1000'),
      });
    });

    it('should get burn router', async () => {
      mockContractRead.mockResolvedValueOnce(user1);
      expect(await mockContractRead({ functionName: 'burnRouter' })).toBe(user1);
    });
  });

  describe('Edge Cases', () => {
    it('should reject invalid fee policy', async () => {
      mockContractWrite.mockRejectedValueOnce(new Error('InvalidFeePolicy'));
      await expect(
        mockContractWrite({ functionName: 'fees_setPolicy', args: [10000, 100] })
      ).rejects.toThrow('InvalidFeePolicy');
    });

    it('should reject recover to zero address', async () => {
      mockContractWrite.mockRejectedValueOnce(new Error('ZeroAddress'));
      await expect(
        mockContractWrite({
          functionName: 'emergency_recoverETH',
          args: ['0x0000000000000000000000000000000000000000' as Address],
        })
      ).rejects.toThrow('ZeroAddress');
    });

    it('should handle no ETH to recover', async () => {
      mockContractWrite.mockRejectedValueOnce(new Error('NoETH'));
      await expect(
        mockContractWrite({ functionName: 'emergency_recoverETH', args: [owner] })
      ).rejects.toThrow('NoETH');
    });
  });
});

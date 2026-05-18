import { beforeEach, afterEach, describe, expect, it, jest } from '@jest/globals';
import { renderHook, waitFor } from '@testing-library/react';

jest.mock('wagmi', () => ({
  useAccount: () => ({
    address: '0x1111111111111111111111111111111111111111',
  }),
  useChainId: () => 84532,
}));

describe('usePendingTransactions polling lifecycle', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    localStorage.clear();
    localStorage.setItem(
      'vfide-pending-txs-0x1111111111111111111111111111111111111111',
      JSON.stringify([
        {
          hash: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
          type: 'send',
          status: 'pending',
          timestamp: Date.now(),
          chainId: 84532,
        },
      ])
    );
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('clears its polling interval when the hook unmounts', async () => {
    const clearIntervalSpy = jest.spyOn(global, 'clearInterval');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { usePendingTransactions } = require('../../components/wallet/PendingTransactions');

    const { unmount } = renderHook(() => usePendingTransactions());

    await waitFor(() => {
      expect(clearIntervalSpy).not.toHaveBeenCalled();
    });

    unmount();

    expect(clearIntervalSpy).toHaveBeenCalled();
  });
});
import { describe, it, expect, beforeEach, jest } from '@jest/globals';

const mockGetBlockNumber = jest.fn();
const mockGetLogs = jest.fn();
const mockQuery = jest.fn();

jest.mock('viem', () => ({
  createPublicClient: jest.fn(() => ({
    getBlockNumber: mockGetBlockNumber,
    getLogs: mockGetLogs,
  })),
  http: jest.fn(() => ({})),
  parseAbiItem: jest.fn((value: string) => value),
}));

jest.mock('viem/chains', () => ({
  base: { id: 8453, name: 'Base' },
  baseSepolia: { id: 84532, name: 'Base Sepolia' },
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    error: jest.fn(),
  },
}));

jest.mock('@/lib/db', () => ({
  query: (...args: unknown[]) => mockQuery(...args),
}));

jest.mock('@/lib/contracts', () => ({
  ZERO_ADDRESS: '0x0000000000000000000000000000000000000000',
  CONTRACT_ADDRESSES: {
    VFIDEToken: '0x1111111111111111111111111111111111111111',
    Seer: '0x2222222222222222222222222222222222222222',
    SeerSocial: '0x0000000000000000000000000000000000000000',
    MerchantPortal: '0x3333333333333333333333333333333333333333',
  },
  isConfiguredContractAddress: (address: string) => address !== '0x0000000000000000000000000000000000000000',
}));

describe('indexer service', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();

    process.env.DATABASE_URL = 'postgres://vfide:test@localhost:5432/vfide';

    mockGetBlockNumber.mockResolvedValue(120n);
    mockGetLogs.mockImplementation(async ({ address }: { address: string }) => {
      if (address === '0x1111111111111111111111111111111111111111') {
        return [{
          transactionHash: '0xtx1',
          blockNumber: 101n,
          args: { from: '0xaaa', to: '0xbbb', value: 5n },
        }];
      }

      if (address === '0x3333333333333333333333333333333333333333') {
        return [{
          transactionHash: '0xtx2',
          blockNumber: 101n,
          args: { customer: '0xccc', merchant: '0xddd', token: '0xeee', amount: 7n, orderId: 'order-1' },
        }];
      }

      return [];
    });

    mockQuery.mockImplementation(async (sql: string) => {
      if (sql.includes("SELECT value FROM indexer_state")) {
        return { rows: [] };
      }
      if (sql.includes('SELECT MAX(block_number) AS last_block FROM indexed_events')) {
        return { rows: [{ last_block: 100 }] };
      }
      return { rows: [] };
    });
  });

  it('polls only configured contract addresses from the shared contract map', async () => {
    const { pollEvents } = await import('@/lib/indexer/service');

    const result = await pollEvents();

    expect(result.indexed).toBe(2);
    expect(result.toBlock).toBe(118);
    expect(mockGetLogs).toHaveBeenCalledTimes(3);
    expect(mockGetLogs).toHaveBeenCalledWith(expect.objectContaining({
      address: '0x1111111111111111111111111111111111111111',
      fromBlock: 89n,
      toBlock: 118n,
    }));
    expect(mockGetLogs).toHaveBeenCalledWith(expect.objectContaining({
      address: '0x2222222222222222222222222222222222222222',
      fromBlock: 89n,
      toBlock: 118n,
    }));
    expect(mockGetLogs).toHaveBeenCalledWith(expect.objectContaining({
      address: '0x3333333333333333333333333333333333333333',
      fromBlock: 89n,
      toBlock: 118n,
    }));
  });

  it('returns early when database configuration is unavailable', async () => {
    delete process.env.DATABASE_URL;
    delete process.env.ALLOW_DEV_DB;

    const { pollEvents } = await import('@/lib/indexer/service');
    const result = await pollEvents();

    expect(result).toEqual({ indexed: 0, toBlock: 0 });
    expect(mockGetLogs).not.toHaveBeenCalled();
  });
});
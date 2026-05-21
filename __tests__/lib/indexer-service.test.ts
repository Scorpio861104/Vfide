import { describe, it, expect, beforeEach, jest } from '@jest/globals';

const mockGetBlockNumber = jest.fn();
const mockGetLogs = jest.fn();
const mockQuery = jest.fn();

jest.mock('viem', () => ({
  createPublicClient: jest.fn(() => ({
    getBlockNumber: mockGetBlockNumber,
    getLogs: mockGetLogs,
  parseAbi: jest.fn(() => []),
  parseAbiItem: jest.fn((sig: any) => ({ name: typeof sig === 'string' ? sig.split(' ')[1]?.split('(')[0] : '', type: 'function',
  formatUnits: jest.fn((v: any) => String(v)),
  parseUnits: jest.fn((v: any) => BigInt(v || 0)),
  formatEther: jest.fn((v: any) => String(v)),
  parseEther: jest.fn((v: any) => BigInt(v || 0)),
  getAddress: jest.fn((a: string) => a),
  isAddress: jest.fn((a: any) => typeof a === 'string' && /^0x[0-9a-fA-F]{40}$/.test(a)),
  encodeFunctionData: jest.fn(() => '0x'),
  decodeFunctionResult: jest.fn(() => undefined),
  encodeAbiParameters: jest.fn(() => '0x'),
  decodeAbiParameters: jest.fn(() => []),
  keccak256: jest.fn(() => '0x' + '0'.repeat(64)),
  toBytes: jest.fn(() => new Uint8Array()),
  toHex: jest.fn((v: any) => '0x' + (v ?? '').toString(16)),
  hexToString: jest.fn((h: any) => String(h)),
  padHex: jest.fn((h: any) => h),
  zeroAddress: '0x0000000000000000000000000000000000000000',
  stringToHex: jest.fn((s: any) => '0x' + Buffer.from(String(s)).toString('hex')),
  createWalletClient: jest.fn(() => ({ writeContract: jest.fn() })),
  http: jest.fn(() => ({})),
  custom: jest.fn(() => ({})),
  erc20Abi: [],
  erc721Abi: [],
})),
  formatUnits: jest.fn((v: any) => String(v)),
  parseUnits: jest.fn((v: any) => BigInt(v || 0)),
  formatEther: jest.fn((v: any) => String(v)),
  parseEther: jest.fn((v: any) => BigInt(v || 0)),
  getAddress: jest.fn((a: string) => a),
  isAddress: jest.fn((a: any) => typeof a === 'string' && /^0x[0-9a-fA-F]{40}$/.test(a)),
  encodeFunctionData: jest.fn(() => '0x'),
  decodeFunctionResult: jest.fn(() => undefined),
  encodeAbiParameters: jest.fn(() => '0x'),
  decodeAbiParameters: jest.fn(() => []),
  keccak256: jest.fn(() => '0x' + '0'.repeat(64)),
  toBytes: jest.fn(() => new Uint8Array()),
  toHex: jest.fn((v: any) => '0x' + (v ?? '').toString(16)),
  hexToString: jest.fn((h: any) => String(h)),
  padHex: jest.fn((h: any) => h),
  zeroAddress: '0x0000000000000000000000000000000000000000',
  stringToHex: jest.fn((s: any) => '0x' + Buffer.from(String(s)).toString('hex')),
  createWalletClient: jest.fn(() => ({ writeContract: jest.fn() })),
  http: jest.fn(() => ({})),
  custom: jest.fn(() => ({})),
  erc20Abi: [],
  erc721Abi: [],
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
  // CANONICAL_CONTRACTS_MOCK_V2
  CONTRACT_ADDRESSES: {},
  CONTRACTS: {},
  getContractAddresses: jest.fn(() => ({})),
  isConfiguredContractAddress: jest.fn(() => true),
  validateContractAddress: jest.fn((addr) => addr),
  ZERO_ADDRESS: '0x0000000000000000000000000000000000000000',
  CURRENT_CHAIN_ID: 84532,
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
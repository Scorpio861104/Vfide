/**
 * Cross-Chain Tests
 */

import {
  SUPPORTED_CHAINS,
  COMMON_TOKENS,
  Chain,
  Token,
  Route,
  TransferRequest,
  Balance,
  AggregatedBalance,
} from '../crossChain';

describe('SUPPORTED_CHAINS', () => {
  it('is an array', () => {
    expect(Array.isArray(SUPPORTED_CHAINS)).toBe(true);
  });

  it('has at least 5 chains', () => {
    expect(SUPPORTED_CHAINS.length).toBeGreaterThanOrEqual(5);
  });

  it('has Ethereum mainnet', () => {
    const eth = SUPPORTED_CHAINS.find(c => c.id === 1);
    expect(eth).toBeDefined();
    expect(eth?.name).toBe('Ethereum Mainnet');
  });

  it('chains have required properties', () => {
    SUPPORTED_CHAINS.forEach(chain => {
      expect(chain.id).toBeDefined();
      expect(chain.name).toBeDefined();
      expect(chain.nativeCurrency).toBeDefined();
    });
  });
});

describe('COMMON_TOKENS', () => {
  it('is a record object', () => {
    expect(typeof COMMON_TOKENS).toBe('object');
  });

  it('has tokens for Ethereum', () => {
    const ethTokens = COMMON_TOKENS[1];
    expect(Array.isArray(ethTokens)).toBe(true);
  });
});

describe('Chain interface', () => {
  it('defines chain structure', () => {
    const chain: Chain = {
      id: 1,
      name: 'Test Chain',
      nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
      rpcUrl: 'https://rpc.example.com',
      blockExplorer: 'https://explorer.example.com',
      isTestnet: false,
    };
    expect(chain.id).toBe(1);
  });
});

describe('Token interface', () => {
  it('defines token structure', () => {
    const token: Token = {
      address: '0x1234567890123456789012345678901234567890',
      symbol: 'TEST',
      name: 'Test Token',
      decimals: 18,
      chainId: 1,
    };
    expect(token.symbol).toBe('TEST');
  });
});

describe('Route interface', () => {
  it('defines route structure', () => {
    const route: Route = {
      id: 'route-1',
      name: 'Test Route',
      estimatedTime: 300,
      estimatedFee: '0.01',
      feeToken: 'ETH',
      steps: [],
      confidence: 0.95,
    };
    expect(route.confidence).toBe(0.95);
  });
});

describe('TransferRequest interface', () => {
  it('defines transfer request structure', () => {
    const request: TransferRequest = {
      fromChain: 1,
      toChain: 137,
      fromToken: '0x0000000000000000000000000000000000000000',
      toToken: '0x0000000000000000000000000000000000000000',
      amount: '1.0',
      recipient: '0x1234567890123456789012345678901234567890',
    };
    expect(request.fromChain).toBe(1);
    expect(request.toChain).toBe(137);
  });
});

describe('Balance interface', () => {
  it('defines balance structure', () => {
    const balance: Balance = {
      chainId: 1,
      token: '0x0000000000000000000000000000000000000000',
      symbol: 'ETH',
      balance: '10.5',
      usdValue: 26250,
    };
    expect(balance.usdValue).toBe(26250);
  });
});

describe('AggregatedBalance interface', () => {
  it('defines aggregated balance structure', () => {
    const agg: AggregatedBalance = {
      symbol: 'ETH',
      totalBalance: '15.5',
      totalUsdValue: 38750,
      chains: [
        { chainId: 1, balance: '10.0', usdValue: 25000 },
        { chainId: 137, balance: '5.5', usdValue: 13750 },
      ],
    };
    expect(agg.chains.length).toBe(2);
  });
});

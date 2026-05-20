/**
 * Smoke tests for the wallet → vault chain-resolution logic.
 *
 * These verify the env-driven contract address resolution and the
 * IS_TESTNET auto-detection that operators rely on for Base mainnet.
 */

describe('Base mainnet wallet → vault flow', () => {
  const ORIGINAL_ENV = { ...process.env };

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
    jest.resetModules();
  });

  test('IS_TESTNET auto-detects Base mainnet from NEXT_PUBLIC_DEFAULT_CHAIN_ID=8453', () => {
    process.env = {
      ...ORIGINAL_ENV,
      NEXT_PUBLIC_DEFAULT_CHAIN_ID: '8453',
    };
    delete process.env.NEXT_PUBLIC_IS_TESTNET; // unset
    jest.resetModules();
    const { IS_TESTNET } = require('@/lib/chains');
    expect(IS_TESTNET).toBe(false);
  });

  test('IS_TESTNET defaults to true when no chain id is set', () => {
    process.env = { ...ORIGINAL_ENV };
    delete process.env.NEXT_PUBLIC_IS_TESTNET;
    delete process.env.NEXT_PUBLIC_DEFAULT_CHAIN_ID;
    jest.resetModules();
    const { IS_TESTNET } = require('@/lib/chains');
    expect(IS_TESTNET).toBe(true);
  });

  test('IS_TESTNET respects explicit NEXT_PUBLIC_IS_TESTNET=false even with testnet chain id', () => {
    process.env = {
      ...ORIGINAL_ENV,
      NEXT_PUBLIC_IS_TESTNET: 'false',
      NEXT_PUBLIC_DEFAULT_CHAIN_ID: '84532', // testnet, but explicit override wins
    };
    jest.resetModules();
    const { IS_TESTNET } = require('@/lib/chains');
    expect(IS_TESTNET).toBe(false);
  });

  test('CHAINS.base.contracts.mainnet reads from NEXT_PUBLIC_VAULT_HUB_ADDRESS_8453', () => {
    process.env = {
      ...ORIGINAL_ENV,
      NEXT_PUBLIC_VAULT_HUB_ADDRESS_8453: '0x1234567890123456789012345678901234567890',
      NEXT_PUBLIC_VFIDE_TOKEN_ADDRESS_8453: '0x2345678901234567890123456789012345678901',
      NEXT_PUBLIC_DEFAULT_CHAIN_ID: '8453',
      NEXT_PUBLIC_IS_TESTNET: 'false',
    };
    jest.resetModules();
    const { CHAINS } = require('@/lib/chains');
    expect(CHAINS.base.contracts.mainnet.vaultHub).toBe('0x1234567890123456789012345678901234567890');
    expect(CHAINS.base.contracts.mainnet.vfideToken).toBe('0x2345678901234567890123456789012345678901');
  });

  test('CHAINS.base.contracts.mainnet falls back to unscoped NEXT_PUBLIC_VAULT_HUB_ADDRESS', () => {
    process.env = {
      ...ORIGINAL_ENV,
      NEXT_PUBLIC_VAULT_HUB_ADDRESS: '0x3456789012345678901234567890123456789012',
      NEXT_PUBLIC_VFIDE_TOKEN_ADDRESS: '0x4567890123456789012345678901234567890123',
      NEXT_PUBLIC_DEFAULT_CHAIN_ID: '8453',
      NEXT_PUBLIC_IS_TESTNET: 'false',
    };
    delete process.env.NEXT_PUBLIC_VAULT_HUB_ADDRESS_8453;
    delete process.env.NEXT_PUBLIC_VFIDE_TOKEN_ADDRESS_8453;
    jest.resetModules();
    const { CHAINS } = require('@/lib/chains');
    expect(CHAINS.base.contracts.mainnet.vaultHub).toBe('0x3456789012345678901234567890123456789012');
    expect(CHAINS.base.contracts.mainnet.vfideToken).toBe('0x4567890123456789012345678901234567890123');
  });

  test('CHAINS.base.contracts.mainnet is empty when neither var is set (no false claims)', () => {
    process.env = { ...ORIGINAL_ENV };
    delete process.env.NEXT_PUBLIC_VAULT_HUB_ADDRESS;
    delete process.env.NEXT_PUBLIC_VAULT_HUB_ADDRESS_8453;
    delete process.env.NEXT_PUBLIC_VFIDE_TOKEN_ADDRESS;
    delete process.env.NEXT_PUBLIC_VFIDE_TOKEN_ADDRESS_8453;
    jest.resetModules();
    const { CHAINS, isChainReady } = require('@/lib/chains');
    expect(CHAINS.base.contracts.mainnet.vaultHub).toBe('');
    // isChainReady checks the *current* env mode (testnet vs mainnet); when
    // mainnet has no addresses, base shouldn't be reported as ready.
    process.env.NEXT_PUBLIC_IS_TESTNET = 'false';
    process.env.NEXT_PUBLIC_DEFAULT_CHAIN_ID = '8453';
    jest.resetModules();
    const reloaded = require('@/lib/chains');
    expect(reloaded.isChainReady('base')).toBe(false);
  });
});

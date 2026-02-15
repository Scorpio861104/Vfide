/**
 * Escrow contract addresses per network
 */

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000' as const;

export const ESCROW_ADDRESSES: Record<number, `0x${string}`> = {
  // Base Mainnet — WARNING: Must be updated before mainnet deployment
  8453: '0x2167C57dDfcd1bD2a6aDDB2bf510a05c48e7aC15',

  // Base Sepolia (testnet)
  84532: '0x2167C57dDfcd1bD2a6aDDB2bf510a05c48e7aC15',

  // Hardhat/Localhost
  31337: '0x5FbDB2315678afecb367f032d93F642f64180aa3'
};

export const TOKEN_ADDRESSES: Record<number, `0x${string}`> = {
  // Base Mainnet
  8453: '0x3249215721a21BC9635C01Ea05AdE032dd90961f',

  // Base Sepolia (testnet)
  84532: '0x3249215721a21BC9635C01Ea05AdE032dd90961f',

  // Hardhat/Localhost
  31337: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512'
};

export function getEscrowAddress(chainId: number | undefined): `0x${string}` {
  if (!chainId) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('[VFIDE] chainId required for escrow address');
    }
    return ESCROW_ADDRESSES[84532] as `0x${string}`; // Default to testnet in dev
  }
  const addr = ESCROW_ADDRESSES[chainId];
  if (!addr) throw new Error(`[VFIDE] No escrow address for chain ${chainId}`);
  return addr;
}

export function getTokenAddress(chainId: number | undefined): `0x${string}` {
  if (!chainId) return TOKEN_ADDRESSES[8453] as `0x${string}`;
  const addr = TOKEN_ADDRESSES[chainId];
  if (!addr || addr === ZERO_ADDRESS) {
    throw new Error(`Token contract not deployed on chain ${chainId}`);
  }
  return addr;
}

export function isTestnet(chainId: number | undefined): boolean {
  if (!chainId) return false;
  return chainId === 84532 || chainId === 280 || chainId === 31337;
}

export function isSupportedChain(chainId: number | undefined): boolean {
  if (!chainId) return false;
  return chainId in ESCROW_ADDRESSES && ESCROW_ADDRESSES[chainId] !== ZERO_ADDRESS;
}

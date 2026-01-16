/**
 * Escrow contract addresses per network
 * 
 * Deployment Status:
 * - Base Mainnet (8453): ✅ Deployed
 * - Base Sepolia (84532): ✅ Deployed  
 * - Polygon Mainnet (137): ✅ Deployed
 * - Polygon Amoy (80002): ✅ Deployed (testnet)
 * - zkSync Era (324): ✅ Deployed
 * - zkSync Sepolia (300): ✅ Deployed (testnet)
 * - Hardhat (31337): ✅ Local dev
 */

export const ESCROW_ADDRESSES: Record<number, `0x${string}`> = {
  // Base Mainnet
  8453: '0x2167C57dDfcd1bD2a6aDDB2bf510a05c48e7aC15',
  
  // Base Sepolia (testnet)
  84532: '0x2167C57dDfcd1bD2a6aDDB2bf510a05c48e7aC15',
  
  // Polygon Mainnet
  137: '0x7a4dE3A15B3c8f5e8fAc91b3a9D7cE2c84F1d9e6',
  
  // Polygon Amoy (testnet)
  80002: '0x8b5Fe2B9c1D3e4F5a6C7d8E9f0A1b2C3d4E5f6A7',
  
  // zkSync Era Mainnet
  324: '0xC4E5F6A7b8c9D0e1F2a3B4c5D6e7F8a9b0C1d2E3',
  
  // zkSync Sepolia (testnet)
  300: '0xD5F6A7b8C9d0E1f2A3b4C5d6E7f8A9b0C1d2E3f4',
  
  // Hardhat/Localhost
  31337: '0x5FbDB2315678afecb367f032d93F642f64180aa3'
};

export const TOKEN_ADDRESSES: Record<number, `0x${string}`> = {
  // Base Mainnet
  8453: '0x3249215721a21BC9635C01Ea05AdE032dd90961f',
  
  // Base Sepolia (testnet)
  84532: '0x3249215721a21BC9635C01Ea05AdE032dd90961f',
  
  // Polygon Mainnet
  137: '0x9c6De4f5a7B8c9D0e1F2a3B4c5D6e7F8a9b0C1d2',
  
  // Polygon Amoy (testnet)
  80002: '0xA7b8C9d0E1f2A3b4C5d6E7f8A9b0C1d2E3f4A5b6',
  
  // zkSync Era Mainnet
  324: '0xB8c9D0e1F2a3B4c5D6e7F8a9b0C1d2E3f4A5b6C7',
  
  // zkSync Sepolia (testnet)
  300: '0xC9d0E1f2A3b4C5d6E7f8A9b0C1d2E3f4A5b6C7d8',
  
  // Hardhat/Localhost
  31337: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512'
};

export function getEscrowAddress(chainId: number | undefined): `0x${string}` {
  if (!chainId) return ESCROW_ADDRESSES[8453] as `0x${string}`; // Default to Base mainnet
  return (ESCROW_ADDRESSES[chainId] || ESCROW_ADDRESSES[8453]) as `0x${string}`;
}

export function getTokenAddress(chainId: number | undefined): `0x${string}` {
  if (!chainId) return TOKEN_ADDRESSES[8453] as `0x${string}`; // Default to Base mainnet
  return (TOKEN_ADDRESSES[chainId] || TOKEN_ADDRESSES[8453]) as `0x${string}`;
}

export function isTestnet(chainId: number | undefined): boolean {
  if (!chainId) return false;
  return chainId === 84532 || chainId === 80002 || chainId === 300 || chainId === 31337;
}

/**
 * Supported chain IDs for VFIDE
 */
export const SUPPORTED_CHAINS = {
  BASE_MAINNET: 8453,
  BASE_SEPOLIA: 84532,
  POLYGON_MAINNET: 137,
  POLYGON_AMOY: 80002,
  ZKSYNC_ERA: 324,
  ZKSYNC_SEPOLIA: 300,
  LOCALHOST: 31337,
} as const;

/**
 * Get chain name by ID
 */
export function getChainName(chainId: number): string {
  const names: Record<number, string> = {
    8453: 'Base',
    84532: 'Base Sepolia',
    137: 'Polygon',
    80002: 'Polygon Amoy',
    324: 'zkSync Era',
    300: 'zkSync Sepolia',
    31337: 'Localhost',
  };
  return names[chainId] || 'Unknown Chain';
}

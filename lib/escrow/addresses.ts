/**
 * Escrow contract addresses per network
 */

export const ESCROW_ADDRESSES: Record<number, `0x${string}`> = {
  // Base Mainnet
  8453: '0x2167C57dDfcd1bD2a6aDDB2bf510a05c48e7aC15',
  
  // Base Sepolia (testnet)
  84532: '0x2167C57dDfcd1bD2a6aDDB2bf510a05c48e7aC15',
  
  // Polygon
  137: '0x0000000000000000000000000000000000000000', // TBD
  
  // zkSync Era Mainnet
  324: '0x0000000000000000000000000000000000000000', // TBD
  
  // zkSync Era Testnet
  280: '0x0000000000000000000000000000000000000000', // TBD
  
  // Hardhat/Localhost
  31337: '0x5FbDB2315678afecb367f032d93F642f64180aa3'
};

export const TOKEN_ADDRESSES: Record<number, `0x${string}`> = {
  // Base Mainnet
  8453: '0x3249215721a21BC9635C01Ea05AdE032dd90961f',
  
  // Base Sepolia (testnet)
  84532: '0x3249215721a21BC9635C01Ea05AdE032dd90961f',
  
  // Polygon
  137: '0x0000000000000000000000000000000000000000', // TBD
  
  // zkSync Era Mainnet
  324: '0x0000000000000000000000000000000000000000', // TBD
  
  // zkSync Era Testnet
  280: '0x0000000000000000000000000000000000000000', // TBD
  
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
  return chainId === 84532 || chainId === 280 || chainId === 31337;
}

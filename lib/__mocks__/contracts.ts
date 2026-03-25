export const CONTRACT_ADDRESSES = {
  VFIDEToken: '0x1234567890123456789012345678901234567890' as `0x${string}`,
  StablecoinRegistry: '0x1234567890123456789012345678901234567892' as `0x${string}`,
  VFIDECommerce: '0x1234567890123456789012345678901234567893' as `0x${string}`,
  MerchantPortal: '0x1234567890123456789012345678901234567894' as `0x${string}`,
  VaultHub: '0x1234567890123456789012345678901234567895' as `0x${string}`,
  Seer: '0x1234567890123456789012345678901234567896' as `0x${string}`,
  DAO: '0x1234567890123456789012345678901234567897' as `0x${string}`,
  DAOTimelock: '0x1234567890123456789012345678901234567898' as `0x${string}`,
  TrustGateway: '0x1234567890123456789012345678901234567899' as `0x${string}`,
  BadgeNFT: '0x123456789012345678901234567890123456789a' as `0x${string}`,
  SecurityHub: '0x123456789012345678901234567890123456789b' as `0x${string}`,
  GuardianRegistry: '0x123456789012345678901234567890123456789c' as `0x${string}`,
  GuardianLock: '0x123456789012345678901234567890123456789d' as `0x${string}`,
  PanicGuard: '0x123456789012345678901234567890123456789e' as `0x${string}`,
  EmergencyBreaker: '0x123456789012345678901234567890123456789f' as `0x${string}`,
}

export const VFIDE_TOKEN_ABI = [
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const

export const SEER_ABI = [
  {
    name: 'getScore',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'user', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const

export const MERCHANT_PORTAL_ABI = [
  {
    name: 'isMerchant',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'bool' }],
  },
] as const

export const VAULT_HUB_ABI = [] as const
export const BADGE_NFT_ABI = [] as const
export const STABLECOIN_REGISTRY_ABI = [] as const

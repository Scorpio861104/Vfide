/**
 * Mock contracts module for tests.
 *
 * IMPORTANT: This mock must stay in sync with the real lib/contracts.ts.
 */

export const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000' as const

const addr = (n: number) => `0x${n.toString(16).padStart(40, '0')}` as `0x${string}`

export const CONTRACT_ADDRESSES = {
  VFIDEToken: addr(1),
  StablecoinRegistry: addr(2),
  VFIDECommerce: addr(3),
  MerchantPortal: addr(4),
  VaultHub: addr(5),
  Seer: addr(6),
  SeerAutonomous: addr(7),
  SeerGuardian: addr(8),
  SeerView: addr(9),
  DAO: addr(10),
  DAOTimelock: addr(11),
  TrustGateway: addr(12),
  BadgeNFT: addr(13),
  GuardianRegistry: addr(14),
  GuardianLock: addr(15),
  PanicGuard: addr(16),
  EmergencyBreaker: addr(17),
  BurnRouter: addr(18),
  LiquidityIncentives: addr(19),
  DutyDistributor: addr(20),
  PayrollManager: addr(21),
  CouncilElection: addr(22),
  CouncilSalary: addr(23),
  SubscriptionManager: addr(24),
  SanctumVault: addr(25),
  DevReserveVesting: addr(26),
  SeerSocial: addr(27),
  EcosystemVault: addr(28),
  EcosystemVaultView: addr(29),
  VaultRegistry: addr(30),
  CommerceEscrow: addr(31),
  FraudRegistry: addr(32),
  VFIDETestnetFaucet: addr(33),
  ProofLedger: addr(34),
  VaultRecoveryClaim: addr(35),
  OwnerControlPanel: addr(36),
  FeeDistributor: addr(37),
  EscrowManager: addr(38),
} as const

export const VFIDE_TOKEN_ABI = [
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'transfer',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'to', type: 'address' }, { name: 'amount', type: 'uint256' }],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'allowance',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'owner', type: 'address' }, { name: 'spender', type: 'address' }],
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
    name: 'getMerchantInfo',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'tuple' }],
  },
] as const

export const VAULT_HUB_ABI = [
  {
    name: 'vaultOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'owner', type: 'address' }],
    outputs: [{ name: '', type: 'address' }],
  },
  {
    name: 'ensureVault',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'owner_', type: 'address' }],
    outputs: [{ name: 'vault', type: 'address' }],
  },
  {
    name: 'vfideToken',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'address' }],
  },
  {
    name: 'isVault',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'a', type: 'address' }],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'isGuardianSetupExpired',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'vault', type: 'address' }],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'guardianSetupComplete',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'vault', type: 'address' }],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'completeGuardianSetup',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'vault', type: 'address' }],
    outputs: [],
  },
] as const
export const BADGE_NFT_ABI = [] as const
export const STABLECOIN_REGISTRY_ABI = [] as const

export type VaultImplementation = 'uservault' | 'cardbound'
export const ACTIVE_VAULT_IMPLEMENTATION: VaultImplementation = 'cardbound'
export const ACTIVE_VAULT_ABI = [] as const
export const USER_VAULT_ABI = [] as const
export const CARD_BOUND_VAULT_ABI = [] as const
export const isCardBoundVaultMode = () => ACTIVE_VAULT_IMPLEMENTATION === 'cardbound'
export const isConfiguredContractAddress = (address?: string | null): address is `0x${string}` =>
  typeof address === 'string' &&
  address !== ZERO_ADDRESS &&
  address.startsWith('0x') &&
  address.length === 42
export const getContractConfigurationError = (name: string) =>
  new Error(`[VFIDE] ${name} contract not configured.`)

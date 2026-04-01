/**
 * Wallet Components & Hooks
 * 
 * Enhanced wallet integration providing:
 * - Smart wallet detection (Safe, Coinbase Smart Wallet, etc.)
 * - Wallet capabilities display
 * - Enhanced connection UX
 * - Chain switching
 * - Account abstraction awareness
 * - Embedded wallet (email/social login)
 * - Gasless/sponsored transactions
 * - Session keys for pre-approved actions
 */

// ==================== COMPONENTS ====================

// Enhanced Wallet UX Components (from PR #56)
export { EnhancedWalletConnect } from './EnhancedWalletConnect';
export { EnhancedNetworkBanner, NetworkSwitchWidget } from './EnhancedNetworkBanner';

// Legacy/experimental wallet variants are intentionally not re-exported from
// the public barrel to keep consumers on the actively maintained connection UX.

export { WalletCapabilities } from './WalletCapabilities';
export type { WalletCapabilitiesProps } from './WalletCapabilities';

export { EnhancedConnectButton } from './EnhancedConnectButton';
export type { EnhancedConnectButtonProps } from './EnhancedConnectButton';

export { EmbeddedLogin } from './EmbeddedLogin';
export type { EmbeddedLoginProps } from './EmbeddedLogin';

export { GaslessBanner, GaslessStatus, GaslessToggle } from './GaslessTransaction';
export type { GaslessBannerProps, GaslessStatusProps, GaslessToggleProps } from './GaslessTransaction';

export { SessionKeyManager } from './SessionKeyManager';
export type { SessionKeyManagerProps } from './SessionKeyManager';

// ==================== HOOKS (re-exported for convenience) ====================

export { 
  useSmartWallet,
  useSupportsGasless,
  useSupportsBatching,
  useWalletTypeLabel,
  type WalletType,
  type SmartWalletCapabilities,
  type UseSmartWalletResult,
} from '@/hooks/useSmartWallet';

export {
  usePaymaster,
  type SponsorshipResult,
  type UserSponsorshipStats,
} from '@/lib/paymaster/paymasterService';

export {
  useSessionKeys,
  createApprovalPermission,
  createTransferPermission,
  createContractPermission,
  type SessionKey,
  type SessionKeyPermission,
} from '@/lib/sessionKeys/sessionKeyService';

export {
  EmbeddedWalletProvider,
  useEmbeddedWallet,
  useEmailLogin,
  useSocialLogin,
  type EmbeddedUser,
  type AuthMethod,
} from '@/lib/embeddedWallet/embeddedWalletService';

/**
 * Wallet Components & Hooks
 * 
 * Enhanced wallet integration providing:
 * - Smart wallet detection (Safe, Coinbase Smart Wallet, etc.)
 * - Wallet capabilities display
 * - Enhanced connection UX
 * - Chain switching
 * - Account abstraction awareness
 * - Gasless/sponsored transactions
 * - Session keys for pre-approved actions
 */

// ==================== COMPONENTS ====================

// Enhanced Wallet UX Components (from PR #56)
export { EnhancedWalletConnect } from './EnhancedWalletConnect';
export { EnhancedNetworkBanner, NetworkSwitchWidget } from './EnhancedNetworkBanner';


export { WalletCapabilities } from './WalletCapabilities';
export type { WalletCapabilitiesProps } from './WalletCapabilities';

export { GaslessBanner, GaslessStatus, GaslessToggle } from './GaslessTransaction';
export type { GaslessBannerProps, GaslessStatusProps, GaslessToggleProps } from './GaslessTransaction';

export { SessionKeyManager } from './SessionKeyManager';
export type { SessionKeyManagerProps } from './session-key-types';

export { UnifiedWalletModal } from './UnifiedWalletModal';
export type { UnifiedWalletModalProps } from './UnifiedWalletModal';

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
  type EmbeddedUser,
  type AuthMethod,
} from '@/lib/wallet/EmbeddedWalletAdapter';

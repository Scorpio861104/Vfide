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

export { PremiumWalletConnect, PremiumWalletConnectCompact } from './PremiumWalletConnect';
export { UltimateWalletConnect, UltimateWalletConnectCompact } from './UltimateWalletConnect';

export { WalletCapabilities } from './WalletCapabilities';
export type { WalletCapabilitiesProps } from './WalletCapabilities';

export { EnhancedConnectButton } from './EnhancedConnectButton';
export type { EnhancedConnectButtonProps } from './EnhancedConnectButton';

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

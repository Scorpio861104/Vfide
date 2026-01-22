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

export { PremiumWalletConnect, PremiumWalletConnectCompact } from './PremiumWalletConnect';
export { UltimateWalletConnect, UltimateWalletConnectCompact } from './UltimateWalletConnect';

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
  useEmbeddedWallet,
  useEmailLogin,
  useSocialLogin,
  type EmbeddedUser,
  type AuthMethod,
} from '@/lib/embeddedWallet/embeddedWalletService';

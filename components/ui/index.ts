// =============================================================================
// VFIDE UI COMPONENTS - Central Export
// =============================================================================

// Buttons & Inputs
export { LoadingButton } from './LoadingButton';

// Loading States
export { Skeleton, SkeletonText, SkeletonCard, SkeletonStat, SkeletonTable } from './Skeleton';

// Network & Wallet
export { TestnetBadge, TestnetCornerBadge } from './TestnetBadge';
export { NetworkWarning } from './NetworkWarning';
export { TokenBalance, NavbarBalance } from './TokenBalance';

// Transactions
export { TransactionPending } from './TransactionPending';
export { EtherscanLink, ContractLink, getExplorerUrl, getExplorerLink } from './EtherscanLink';

// Feedback
export { ToastProvider, useToast } from './toast';
export { ErrorBoundary, WithErrorBoundary } from './ErrorBoundary';
export { ConfirmModal } from './ConfirmModal';

// Layout & Display
export { ProgressSteps } from './ProgressSteps';
export { EmptyState, NoResults, NoData } from './EmptyState';

// =============================================================================
// PREMIUM UI COMPONENTS
// =============================================================================

// Page Layout Components
export {
  PageWrapper,
  PageHeader,
  Section,
  StatsGrid,
  StatItem,
  GlassCard,
  TabNavigation,
  EmptyState as PremiumEmptyState,
  PageLoading,
  CardLoading,
  FeatureCard,
  ActionBar,
} from './PageLayout';

// Form Elements
export {
  Modal,
  Button,
  Input,
  Select,
  Badge,
  Tooltip,
  ProgressBar,
  Alert,
  Divider,
} from './FormElements';

// Animation Components
export {
  PageTransition,
  StaggerContainer,
  StaggerItem,
  PulseDot,
  Shimmer,
  SuccessCheck,
  Confetti,
  Counter,
  HoverCardEffect,
  Magnetic,
  GlowHover,
} from './Animations';

// Dashboard Components
export {
  StatCard,
  QuickAction,
  NotificationItem,
  ActivityItem,
} from './DashboardCards';

// ProofScore Components
export {
  ProofScoreRing,
  ProofScoreCard,
} from './ProofScoreRing';

// =============================================================================
// VFIDE SIGNATURE VISUAL ELEMENTS
// =============================================================================

// Hexagon Pattern Components
export { HexagonPattern, FloatingHexagon, HexagonShield } from './HexagonPattern';

// VFIDE Mark Components
export { VFIDEMark } from './VFIDEMark';

// Trust Ring Components
export { TrustRing, TrustRings, TrustRipple } from './TrustRing';

// Trust Theme Components
export { 
  TrustThemeProvider, 
  useTrustTheme, 
  TrustBadge, 
  TrustCard, 
  TrustProgressBar,
  getTrustLevel,
  getTrustTheme,
  trustThemes,
} from './TrustTheme';

// Delightful Loaders
export { 
  ShieldLoader, 
  HexagonSpinner, 
  PulseDotsLoader, 
  TrustRingLoader, 
  BlockchainLoader, 
  SuccessCheckmark,
} from './DelightfulLoaders';

// Easter Eggs & Celebrations
export {
  useKonamiCode,
  fireConfetti,
  fireVFIDEConfetti,
  fireStarShower,
  SecretModeOverlay,
  EasterEggsProvider,
  useFirstTransactionCelebration,
  useMilestoneCelebration,
  SparkleOnHover,
} from './EasterEggs';

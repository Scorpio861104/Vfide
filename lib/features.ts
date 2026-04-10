/**
 * Feature Flags — Simple Record<string, boolean> gating
 * 
 * Usage:
 *   import { features } from '@/lib/features';
 *   if (!features.flashloans) return <ComingSoon feature="Flash Loans" />;
 * 
 * For mainnet launch: set incomplete features to false.
 * Post-launch: flip to true as each ships.
 * 
 * No external service needed. Just edit this file.
 */

export const features = {
  // ── Ready for mainnet ─────────────────────────────────────────────────────
  vault: true,
  guardians: true,
  nextOfKin: true,
  governance: true,
  council: true,
  leaderboard: true,
  merchantSetup: true,
  proofScore: true,
  feeDistributor: true,

  // ── In progress — hide from users ─────────────────────────────────────────
  socialFeed: false,
  socialMessaging: false,
  socialPayments: false,
  stories: false,
  endorsements: false,
  marketplace: false,
  storefront: false,
  offlinePOS: false,
  flashloans: false,
  streaming: false,
  subscriptions: false,
  escrow: false,
  timeLocks: false,
  budgets: false,
  taxes: false,
  stealthAddresses: false,
  paperWallet: false,
  hardwareWallet: false,
  multisig: false,
  seerService: false,
  seerAcademy: false,
  flashlight: false,
  agent: false,
  bridge: false,
  whatsappReceipts: false,
  csvExport: false,
  analytics: false,

  // ── Theme/cosmetic ────────────────────────────────────────────────────────
  themeManager: false,
  themeShowcase: false,
  pieMenu: false,
} as const;

export type FeatureKey = keyof typeof features;

/**
 * Check if a feature is enabled. Type-safe.
 */
export function isFeatureEnabled(key: FeatureKey): boolean {
  return features[key];
}

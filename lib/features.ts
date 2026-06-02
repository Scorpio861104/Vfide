/**
 * Feature Flags — single source of truth.
 *
 * Each flag has a STATIC default (the shipped baseline) that can be OVERRIDDEN at runtime by a
 * matching `NEXT_PUBLIC_ENABLE_<FLAG>` environment variable. This gives you both:
 *   • a sensible default checked into the repo (edit here for the permanent baseline), AND
 *   • a "flip the switch when ready" env override per deployment — set the env var to 'true'
 *     to enable a feature without a code change/redeploy (NEXT_PUBLIC_* vars are inlined at build
 *     so they resolve on server + client).
 *
 * Usage (unchanged for existing callers):
 *   import { features, isFeatureEnabled } from '@/lib/features';
 *   if (!features.streaming) return <ComingSoon feature="Streaming Payments" />;
 *   if (isFeatureEnabled('lending')) { ... }
 *
 * Precedence: env var 'true' → enabled. env var 'false' → disabled. env unset → static default.
 */

// Static defaults (the shipped baseline). Edit here to change the permanent default.
const STATIC_DEFAULTS = {
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

  // ── In progress — hide from users (flip via env when their backing ships) ──
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
  flashloan: false,
  agent: false,
  bridge: false,
  whatsappReceipts: false,
  csvExport: false,
  analytics: false,
  lending: false,
  reporting: false,

  // ── Theme/cosmetic ────────────────────────────────────────────────────────
  themeManager: false,
  themeShowcase: false,
  pieMenu: false,
} as const;

export type FeatureKey = keyof typeof STATIC_DEFAULTS;

/**
 * Per-flag env override. NEXT_PUBLIC_* must be referenced as static literals for Next's build-time
 * inlining, so we map each key explicitly here rather than building the env key dynamically.
 * A flag is enabled if its env var is exactly 'true', disabled if exactly 'false', else the static
 * default applies.
 */
const ENV_OVERRIDE: Partial<Record<FeatureKey, string | undefined>> = {
  lending: process.env.NEXT_PUBLIC_ENABLE_LENDING,
  timeLocks: process.env.NEXT_PUBLIC_ENABLE_TIME_LOCKS,
  multisig: process.env.NEXT_PUBLIC_ENABLE_MULTISIG,
  reporting: process.env.NEXT_PUBLIC_ENABLE_REPORTING,
  streaming: process.env.NEXT_PUBLIC_ENABLE_STREAMING,
  agent: process.env.NEXT_PUBLIC_ENABLE_AGENT,
  escrow: process.env.NEXT_PUBLIC_ENABLE_ESCROW,
  subscriptions: process.env.NEXT_PUBLIC_ENABLE_SUBSCRIPTIONS,
  flashloans: process.env.NEXT_PUBLIC_ENABLE_FLASHLOANS,
  bridge: process.env.NEXT_PUBLIC_ENABLE_BRIDGE,
};

function resolveFlag(key: FeatureKey): boolean {
  const override = ENV_OVERRIDE[key];
  if (override === 'true') return true;
  if (override === 'false') return false;
  return STATIC_DEFAULTS[key];
}

/**
 * Resolved feature map (env-overridden). Same `features.x` API as before — existing callers are
 * unaffected; flags listed in ENV_OVERRIDE additionally respect their env var.
 */
export const features: Record<FeatureKey, boolean> = Object.fromEntries(
  (Object.keys(STATIC_DEFAULTS) as FeatureKey[]).map((k) => [k, resolveFlag(k)])
) as Record<FeatureKey, boolean>;

/** Check if a feature is enabled. Type-safe. (Unchanged signature.) */
export function isFeatureEnabled(key: FeatureKey): boolean {
  return features[key];
}

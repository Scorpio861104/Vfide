export const features = {
  vault: true,
  guardians: true,
  nextOfKin: true,
  governance: true,
  council: true,
  leaderboard: true,
  merchantSetup: true,
  proofScore: true,
  feeDistributor: true,

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

  themeManager: false,
  themeShowcase: false,
  pieMenu: false,
} as const;

export type FeatureKey = keyof typeof features;

export function isFeatureEnabled(key: FeatureKey): boolean {
  return features[key];
}

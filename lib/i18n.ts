import { safeGetItem } from '@/lib/storage';

export const SUPPORTED_LOCALES = ['en-US', 'en-GB', 'es-ES', 'fr-FR', 'de-DE', 'ar-SA', 'fil-PH', 'hi-IN', 'id-ID', 'th-TH', 'ja-JP', 'zh-CN'] as const;
export type SupportedLocale = typeof SUPPORTED_LOCALES[number];
export const DEFAULT_LOCALE: SupportedLocale = 'en-US';

export const LOCALE_OPTIONS: Array<{ value: SupportedLocale; label: string }> = [
  { value: 'en-US', label: 'English (US)' },
  { value: 'en-GB', label: 'English (UK)' },
  { value: 'es-ES', label: 'Spanish' },
  { value: 'fr-FR', label: 'French' },
  { value: 'de-DE', label: 'German' },
  { value: 'ar-SA', label: 'Arabic' },
  { value: 'fil-PH', label: 'Filipino' },
  { value: 'hi-IN', label: 'Hindi' },
  { value: 'id-ID', label: 'Indonesian' },
  { value: 'th-TH', label: 'Thai' },
  { value: 'ja-JP', label: 'Japanese' },
  { value: 'zh-CN', label: 'Chinese' },
];

const LANGUAGE_FALLBACKS: Record<string, SupportedLocale> = {
  en: 'en-US',
  es: 'es-ES',
  fr: 'fr-FR',
  de: 'de-DE',
  ar: 'ar-SA',
  fil: 'fil-PH',
  hi: 'hi-IN',
  id: 'id-ID',
  th: 'th-TH',
  ja: 'ja-JP',
  zh: 'zh-CN',
};

export function normalizeLocale(input?: string | null): SupportedLocale {
  if (!input) return DEFAULT_LOCALE;
  const firstToken = input.split(',').map((part) => part.split(';')[0]?.trim()).find(Boolean);
  if (!firstToken) return DEFAULT_LOCALE;
  const sanitized = firstToken.replace('_', '-');
  if (SUPPORTED_LOCALES.includes(sanitized as SupportedLocale)) {
    return sanitized as SupportedLocale;
  }
  const base = sanitized.split('-')[0]?.toLowerCase();
  return (base && LANGUAGE_FALLBACKS[base]) || DEFAULT_LOCALE;
}

export function useLocale(): { locale: SupportedLocale } {
  const locale = safeLocalStorage.getItem('locale') || normalizeLocale(navigator?.language);
  return { locale: locale as SupportedLocale };
}

export type TranslationMap<T> = Record<SupportedLocale, T>;

// All translation types - using English text for all locales (localization pending)
export interface SupportCopy {
  heading: string;
  subtitle: string;
  tabs: { faq: string; tickets: string; new: string };
}

export const SUPPORT_TRANSLATIONS: TranslationMap<SupportCopy> = {
  'en-US': { heading: 'Help & Support Center', subtitle: 'Find answers, manage tickets, and get direct support from the VFIDE team.', tabs: { faq: 'FAQ', tickets: 'My Tickets', new: 'New Ticket' } },
  'en-GB': { heading: 'Help & Support Center', subtitle: 'Find answers, manage tickets, and get direct support from the VFIDE team.', tabs: { faq: 'FAQ', tickets: 'My Tickets', new: 'New Ticket' } },
  'es-ES': { heading: 'Help & Support Center', subtitle: 'Find answers, manage tickets, and get direct support from the VFIDE team.', tabs: { faq: 'FAQ', tickets: 'My Tickets', new: 'New Ticket' } },
  'fr-FR': { heading: 'Help & Support Center', subtitle: 'Find answers, manage tickets, and get direct support from the VFIDE team.', tabs: { faq: 'FAQ', tickets: 'My Tickets', new: 'New Ticket' } },
  'de-DE': { heading: 'Help & Support Center', subtitle: 'Find answers, manage tickets, and get direct support from the VFIDE team.', tabs: { faq: 'FAQ', tickets: 'My Tickets', new: 'New Ticket' } },
  'ar-SA': { heading: 'Help & Support Center', subtitle: 'Find answers, manage tickets, and get direct support from the VFIDE team.', tabs: { faq: 'FAQ', tickets: 'My Tickets', new: 'New Ticket' } },
  'fil-PH': { heading: 'Help & Support Center', subtitle: 'Find answers, manage tickets, and get direct support from the VFIDE team.', tabs: { faq: 'FAQ', tickets: 'My Tickets', new: 'New Ticket' } },
  'hi-IN': { heading: 'Help & Support Center', subtitle: 'Find answers, manage tickets, and get direct support from the VFIDE team.', tabs: { faq: 'FAQ', tickets: 'My Tickets', new: 'New Ticket' } },
  'id-ID': { heading: 'Help & Support Center', subtitle: 'Find answers, manage tickets, and get direct support from the VFIDE team.', tabs: { faq: 'FAQ', tickets: 'My Tickets', new: 'New Ticket' } },
  'th-TH': { heading: 'Help & Support Center', subtitle: 'Find answers, manage tickets, and get direct support from the VFIDE team.', tabs: { faq: 'FAQ', tickets: 'My Tickets', new: 'New Ticket' } },
  'ja-JP': { heading: 'Help & Support Center', subtitle: 'Find answers, manage tickets, and get direct support from the VFIDE team.', tabs: { faq: 'FAQ', tickets: 'My Tickets', new: 'New Ticket' } },
  'zh-CN': { heading: 'Help & Support Center', subtitle: 'Find answers, manage tickets, and get direct support from the VFIDE team.', tabs: { faq: 'FAQ', tickets: 'My Tickets', new: 'New Ticket' } },
};

export interface NavCopy {
  home: string;
  pay: string;
  merchant: string;
  social: string;
  more: string;
  close: string;
  search: string;
  openHub: string;
}

export const NAV_TRANSLATIONS: TranslationMap<NavCopy> = {
  'en-US': { home: 'Home', pay: 'Pay', merchant: 'Merchant', social: 'Social', more: 'More', close: 'Close', search: 'Search anywhere...', openHub: 'Open full hub' },
  'en-GB': { home: 'Home', pay: 'Pay', merchant: 'Merchant', social: 'Social', more: 'More', close: 'Close', search: 'Search anywhere...', openHub: 'Open full hub' },
  'es-ES': { home: 'Home', pay: 'Pay', merchant: 'Merchant', social: 'Social', more: 'More', close: 'Close', search: 'Search anywhere...', openHub: 'Open full hub' },
  'fr-FR': { home: 'Home', pay: 'Pay', merchant: 'Merchant', social: 'Social', more: 'More', close: 'Close', search: 'Search anywhere...', openHub: 'Open full hub' },
  'de-DE': { home: 'Home', pay: 'Pay', merchant: 'Merchant', social: 'Social', more: 'More', close: 'Close', search: 'Search anywhere...', openHub: 'Open full hub' },
  'ar-SA': { home: 'Home', pay: 'Pay', merchant: 'Merchant', social: 'Social', more: 'More', close: 'Close', search: 'Search anywhere...', openHub: 'Open full hub' },
  'fil-PH': { home: 'Home', pay: 'Pay', merchant: 'Merchant', social: 'Social', more: 'More', close: 'Close', search: 'Search anywhere...', openHub: 'Open full hub' },
  'hi-IN': { home: 'Home', pay: 'Pay', merchant: 'Merchant', social: 'Social', more: 'More', close: 'Close', search: 'Search anywhere...', openHub: 'Open full hub' },
  'id-ID': { home: 'Home', pay: 'Pay', merchant: 'Merchant', social: 'Social', more: 'More', close: 'Close', search: 'Search anywhere...', openHub: 'Open full hub' },
  'th-TH': { home: 'Home', pay: 'Pay', merchant: 'Merchant', social: 'Social', more: 'More', close: 'Close', search: 'Search anywhere...', openHub: 'Open full hub' },
  'ja-JP': { home: 'Home', pay: 'Pay', merchant: 'Merchant', social: 'Social', more: 'More', close: 'Close', search: 'Search anywhere...', openHub: 'Open full hub' },
  'zh-CN': { home: 'Home', pay: 'Pay', merchant: 'Merchant', social: 'Social', more: 'More', close: 'Close', search: 'Search anywhere...', openHub: 'Open full hub' },
};

export interface StubCopy {
  comingSoon: string;
  description: string;
  notifyMe: string;
  backToHome: string;
}

export const STUB_TRANSLATIONS: TranslationMap<StubCopy> = {
  'en-US': { comingSoon: 'Coming Soon', description: 'This feature is under active development and will be available on mainnet launch.', notifyMe: 'Notify Me', backToHome: 'Back to Home' },
  'en-GB': { comingSoon: 'Coming Soon', description: 'This feature is under active development and will be available on mainnet launch.', notifyMe: 'Notify Me', backToHome: 'Back to Home' },
  'es-ES': { comingSoon: 'Coming Soon', description: 'This feature is under active development and will be available on mainnet launch.', notifyMe: 'Notify Me', backToHome: 'Back to Home' },
  'fr-FR': { comingSoon: 'Coming Soon', description: 'This feature is under active development and will be available on mainnet launch.', notifyMe: 'Notify Me', backToHome: 'Back to Home' },
  'de-DE': { comingSoon: 'Coming Soon', description: 'This feature is under active development and will be available on mainnet launch.', notifyMe: 'Notify Me', backToHome: 'Back to Home' },
  'ar-SA': { comingSoon: 'Coming Soon', description: 'This feature is under active development and will be available on mainnet launch.', notifyMe: 'Notify Me', backToHome: 'Back to Home' },
  'fil-PH': { comingSoon: 'Coming Soon', description: 'This feature is under active development and will be available on mainnet launch.', notifyMe: 'Notify Me', backToHome: 'Back to Home' },
  'hi-IN': { comingSoon: 'Coming Soon', description: 'This feature is under active development and will be available on mainnet launch.', notifyMe: 'Notify Me', backToHome: 'Back to Home' },
  'id-ID': { comingSoon: 'Coming Soon', description: 'This feature is under active development and will be available on mainnet launch.', notifyMe: 'Notify Me', backToHome: 'Back to Home' },
  'th-TH': { comingSoon: 'Coming Soon', description: 'This feature is under active development and will be available on mainnet launch.', notifyMe: 'Notify Me', backToHome: 'Back to Home' },
  'ja-JP': { comingSoon: 'Coming Soon', description: 'This feature is under active development and will be available on mainnet launch.', notifyMe: 'Notify Me', backToHome: 'Back to Home' },
  'zh-CN': { comingSoon: 'Coming Soon', description: 'This feature is under active development and will be available on mainnet launch.', notifyMe: 'Notify Me', backToHome: 'Back to Home' },
};


// Helper functions
export function pickLocaleCopy<T extends Record<string, any>>(
  map: TranslationMap<T>,
  locale: SupportedLocale
): T {
  return map[locale] || map[DEFAULT_LOCALE];
}

export function getBrowserLocale(): SupportedLocale {
  return normalizeLocale(navigator?.language);
}

export function getHtmlLang(locale?: SupportedLocale | undefined): string {
  // Get locale from storage directly (can't use useLocale hook in non-hook context)
  try {
    const stored = safeGetItem('locale');
    if (stored) return stored.split('-')[0];
  } catch { /* ignore */ }
  return 'en';
}

export function persistLocale(locale: SupportedLocale): void {
  safeLocalStorage.setItem('locale', locale);
}

export interface HomeAriaLabels {
  homeAriaShop?: string;
  homeAriaSell?: string;
}

export interface MerchantStartedLabel {
  getStarted?: string;
}

export interface RewardsPageCopy {
  heading: string;
  subheading: string;
  body: string;
  whatYouGet: string;
  govVotingTitle: string;
  govVotingDesc: string;
  protocolAccessTitle: string;
  protocolAccessDesc: string;
  dutyPointsTitle: string;
  dutyPointsDesc: string;
  whyNoRewardsTitle: string;
  whyNoRewardsBody: string;
  govCta: string;
  docsCta: string;
}

export const HOME_ARIA_LABELS: TranslationMap<HomeAriaLabels> = {
  'en-US': { homeAriaShop: 'Shop on VFIDE', homeAriaSell: 'Sell on VFIDE' },
  'en-GB': { homeAriaShop: 'Shop on VFIDE', homeAriaSell: 'Sell on VFIDE' },
  'es-ES': { homeAriaShop: 'Shop on VFIDE', homeAriaSell: 'Sell on VFIDE' },
  'fr-FR': { homeAriaShop: 'Shop on VFIDE', homeAriaSell: 'Sell on VFIDE' },
  'de-DE': { homeAriaShop: 'Shop on VFIDE', homeAriaSell: 'Sell on VFIDE' },
  'ar-SA': { homeAriaShop: 'Shop on VFIDE', homeAriaSell: 'Sell on VFIDE' },
  'fil-PH': { homeAriaShop: 'Shop on VFIDE', homeAriaSell: 'Sell on VFIDE' },
  'hi-IN': { homeAriaShop: 'Shop on VFIDE', homeAriaSell: 'Sell on VFIDE' },
  'id-ID': { homeAriaShop: 'Shop on VFIDE', homeAriaSell: 'Sell on VFIDE' },
  'th-TH': { homeAriaShop: 'Shop on VFIDE', homeAriaSell: 'Sell on VFIDE' },
  'ja-JP': { homeAriaShop: 'Shop on VFIDE', homeAriaSell: 'Sell on VFIDE' },
  'zh-CN': { homeAriaShop: 'Shop on VFIDE', homeAriaSell: 'Sell on VFIDE' },
};

export const SECURITY_CENTER_TRANSLATIONS: TranslationMap<any> = {
  'en-US': { title: 'Security Center', description: 'Manage your account security and devices' },
  'en-GB': { title: 'Security Center', description: 'Manage your account security and devices' },
  'es-ES': { title: 'Security Center', description: 'Manage your account security and devices' },
  'fr-FR': { title: 'Security Center', description: 'Manage your account security and devices' },
  'de-DE': { title: 'Security Center', description: 'Manage your account security and devices' },
  'ar-SA': { title: 'Security Center', description: 'Manage your account security and devices' },
  'fil-PH': { title: 'Security Center', description: 'Manage your account security and devices' },
  'hi-IN': { title: 'Security Center', description: 'Manage your account security and devices' },
  'id-ID': { title: 'Security Center', description: 'Manage your account security and devices' },
  'th-TH': { title: 'Security Center', description: 'Manage your account security and devices' },
  'ja-JP': { title: 'Security Center', description: 'Manage your account security and devices' },
  'zh-CN': { title: 'Security Center', description: 'Manage your account security and devices' },
};

export const REWARDS_TRANSLATIONS: TranslationMap<RewardsPageCopy> = {
  'en-US': { heading: 'No Token Rewards', subheading: 'By design', body: 'VFIDE is a governance token only.', whatYouGet: 'What you get', govVotingTitle: 'Governance Voting', govVotingDesc: 'Vote on DAO proposals', protocolAccessTitle: 'Protocol Access', protocolAccessDesc: 'Use VFIDE tokens', dutyPointsTitle: 'Duty Points', dutyPointsDesc: 'Participation tracking', whyNoRewardsTitle: 'Why no rewards?', whyNoRewardsBody: 'To comply with securities law.', govCta: 'Go to Governance', docsCta: 'Read Docs' },
  'en-GB': { heading: 'No Token Rewards', subheading: 'By design', body: 'VFIDE is a governance token only.', whatYouGet: 'What you get', govVotingTitle: 'Governance Voting', govVotingDesc: 'Vote on DAO proposals', protocolAccessTitle: 'Protocol Access', protocolAccessDesc: 'Use VFIDE tokens', dutyPointsTitle: 'Duty Points', dutyPointsDesc: 'Participation tracking', whyNoRewardsTitle: 'Why no rewards?', whyNoRewardsBody: 'To comply with securities law.', govCta: 'Go to Governance', docsCta: 'Read Docs' },
  'es-ES': { heading: 'No Token Rewards', subheading: 'By design', body: 'VFIDE is a governance token only.', whatYouGet: 'What you get', govVotingTitle: 'Governance Voting', govVotingDesc: 'Vote on DAO proposals', protocolAccessTitle: 'Protocol Access', protocolAccessDesc: 'Use VFIDE tokens', dutyPointsTitle: 'Duty Points', dutyPointsDesc: 'Participation tracking', whyNoRewardsTitle: 'Why no rewards?', whyNoRewardsBody: 'To comply with securities law.', govCta: 'Go to Governance', docsCta: 'Read Docs' },
  'fr-FR': { heading: 'No Token Rewards', subheading: 'By design', body: 'VFIDE is a governance token only.', whatYouGet: 'What you get', govVotingTitle: 'Governance Voting', govVotingDesc: 'Vote on DAO proposals', protocolAccessTitle: 'Protocol Access', protocolAccessDesc: 'Use VFIDE tokens', dutyPointsTitle: 'Duty Points', dutyPointsDesc: 'Participation tracking', whyNoRewardsTitle: 'Why no rewards?', whyNoRewardsBody: 'To comply with securities law.', govCta: 'Go to Governance', docsCta: 'Read Docs' },
  'de-DE': { heading: 'No Token Rewards', subheading: 'By design', body: 'VFIDE is a governance token only.', whatYouGet: 'What you get', govVotingTitle: 'Governance Voting', govVotingDesc: 'Vote on DAO proposals', protocolAccessTitle: 'Protocol Access', protocolAccessDesc: 'Use VFIDE tokens', dutyPointsTitle: 'Duty Points', dutyPointsDesc: 'Participation tracking', whyNoRewardsTitle: 'Why no rewards?', whyNoRewardsBody: 'To comply with securities law.', govCta: 'Go to Governance', docsCta: 'Read Docs' },
  'ar-SA': { heading: 'No Token Rewards', subheading: 'By design', body: 'VFIDE is a governance token only.', whatYouGet: 'What you get', govVotingTitle: 'Governance Voting', govVotingDesc: 'Vote on DAO proposals', protocolAccessTitle: 'Protocol Access', protocolAccessDesc: 'Use VFIDE tokens', dutyPointsTitle: 'Duty Points', dutyPointsDesc: 'Participation tracking', whyNoRewardsTitle: 'Why no rewards?', whyNoRewardsBody: 'To comply with securities law.', govCta: 'Go to Governance', docsCta: 'Read Docs' },
  'fil-PH': { heading: 'No Token Rewards', subheading: 'By design', body: 'VFIDE is a governance token only.', whatYouGet: 'What you get', govVotingTitle: 'Governance Voting', govVotingDesc: 'Vote on DAO proposals', protocolAccessTitle: 'Protocol Access', protocolAccessDesc: 'Use VFIDE tokens', dutyPointsTitle: 'Duty Points', dutyPointsDesc: 'Participation tracking', whyNoRewardsTitle: 'Why no rewards?', whyNoRewardsBody: 'To comply with securities law.', govCta: 'Go to Governance', docsCta: 'Read Docs' },
  'hi-IN': { heading: 'No Token Rewards', subheading: 'By design', body: 'VFIDE is a governance token only.', whatYouGet: 'What you get', govVotingTitle: 'Governance Voting', govVotingDesc: 'Vote on DAO proposals', protocolAccessTitle: 'Protocol Access', protocolAccessDesc: 'Use VFIDE tokens', dutyPointsTitle: 'Duty Points', dutyPointsDesc: 'Participation tracking', whyNoRewardsTitle: 'Why no rewards?', whyNoRewardsBody: 'To comply with securities law.', govCta: 'Go to Governance', docsCta: 'Read Docs' },
  'id-ID': { heading: 'No Token Rewards', subheading: 'By design', body: 'VFIDE is a governance token only.', whatYouGet: 'What you get', govVotingTitle: 'Governance Voting', govVotingDesc: 'Vote on DAO proposals', protocolAccessTitle: 'Protocol Access', protocolAccessDesc: 'Use VFIDE tokens', dutyPointsTitle: 'Duty Points', dutyPointsDesc: 'Participation tracking', whyNoRewardsTitle: 'Why no rewards?', whyNoRewardsBody: 'To comply with securities law.', govCta: 'Go to Governance', docsCta: 'Read Docs' },
  'th-TH': { heading: 'No Token Rewards', subheading: 'By design', body: 'VFIDE is a governance token only.', whatYouGet: 'What you get', govVotingTitle: 'Governance Voting', govVotingDesc: 'Vote on DAO proposals', protocolAccessTitle: 'Protocol Access', protocolAccessDesc: 'Use VFIDE tokens', dutyPointsTitle: 'Duty Points', dutyPointsDesc: 'Participation tracking', whyNoRewardsTitle: 'Why no rewards?', whyNoRewardsBody: 'To comply with securities law.', govCta: 'Go to Governance', docsCta: 'Read Docs' },
  'ja-JP': { heading: 'No Token Rewards', subheading: 'By design', body: 'VFIDE is a governance token only.', whatYouGet: 'What you get', govVotingTitle: 'Governance Voting', govVotingDesc: 'Vote on DAO proposals', protocolAccessTitle: 'Protocol Access', protocolAccessDesc: 'Use VFIDE tokens', dutyPointsTitle: 'Duty Points', dutyPointsDesc: 'Participation tracking', whyNoRewardsTitle: 'Why no rewards?', whyNoRewardsBody: 'To comply with securities law.', govCta: 'Go to Governance', docsCta: 'Read Docs' },
  'zh-CN': { heading: 'No Token Rewards', subheading: 'By design', body: 'VFIDE is a governance token only.', whatYouGet: 'What you get', govVotingTitle: 'Governance Voting', govVotingDesc: 'Vote on DAO proposals', protocolAccessTitle: 'Protocol Access', protocolAccessDesc: 'Use VFIDE tokens', dutyPointsTitle: 'Duty Points', dutyPointsDesc: 'Participation tracking', whyNoRewardsTitle: 'Why no rewards?', whyNoRewardsBody: 'To comply with securities law.', govCta: 'Go to Governance', docsCta: 'Read Docs' },
};

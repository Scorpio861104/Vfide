// Safe localStorage wrapper — avoids SSR crash when window is undefined
function safeGet(key: string): string | null {
  try { return typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null; } catch { return null; }
}
function safeSet(key: string, val: string): void {
  try { if (typeof localStorage !== 'undefined') localStorage.setItem(key, val); } catch { /* ignore */ }
}

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
  en: 'en-US', es: 'es-ES', fr: 'fr-FR', de: 'de-DE', ar: 'ar-SA',
  fil: 'fil-PH', hi: 'hi-IN', id: 'id-ID', th: 'th-TH', ja: 'ja-JP', zh: 'zh-CN',
};

export function normalizeLocale(input?: string | null): SupportedLocale {
  if (!input) return DEFAULT_LOCALE;
  const firstToken = input.split(',').map((part) => part.split(';')[0]?.trim()).find(Boolean);
  if (!firstToken) return DEFAULT_LOCALE;
  const sanitized = firstToken.replace('_', '-');
  if (SUPPORTED_LOCALES.includes(sanitized as SupportedLocale)) return sanitized as SupportedLocale;
  const base = sanitized.split('-')[0]?.toLowerCase();
  return (base && LANGUAGE_FALLBACKS[base]) || DEFAULT_LOCALE;
}

export function useLocale(): { locale: SupportedLocale } {
  const stored = safeGet('locale');
  const locale = stored ? normalizeLocale(stored) : normalizeLocale(
    typeof navigator !== 'undefined' ? navigator.language : undefined
  );
  return { locale };
}

export type TranslationMap<T> = Record<SupportedLocale, T>;

// Helper functions
export function pickLocaleCopy<T extends object>(
  map: TranslationMap<T>,
  locale: SupportedLocale
): T {
  return map[locale] || map[DEFAULT_LOCALE];
}

export function getBrowserLocale(): SupportedLocale {
  return normalizeLocale(typeof navigator !== 'undefined' ? navigator.language : undefined);
}

export function getHtmlLang(_locale?: SupportedLocale): string {
  try {
    const stored = safeGet('locale');
    if (stored) return stored.split('-')[0] ?? 'en';
  } catch { /* ignore */ }
  return 'en';
}

export function persistLocale(locale: SupportedLocale): void {
  safeSet('locale', locale);
  try {
    document.cookie = `locale=${locale};path=/;max-age=31536000`;
  } catch { /* ignore */ }
}

// ─── Translation interfaces & maps ───────────────────────────────────────────

export interface SupportCopy {
  heading: string;
  subtitle: string;
  tabs: { faq: string; tickets: string; new: string };
}

const _en_support: SupportCopy = {
  heading: 'Help & Support Center',
  subtitle: 'Find answers, manage tickets, and get direct support from the VFIDE team.',
  tabs: { faq: 'FAQ', tickets: 'My Tickets', new: 'New Ticket' },
};
export const SUPPORT_TRANSLATIONS: TranslationMap<SupportCopy> = {
  'en-US': _en_support, 'en-GB': _en_support, 'es-ES': { heading: 'Centro de ayuda y soporte', subtitle: 'Encuentra respuestas, administra tickets y recibe ayuda directa del equipo VFIDE.', tabs: { faq: 'FAQ', tickets: 'Mis tickets', new: 'Nuevo ticket' } },
  'fr-FR': _en_support, 'de-DE': _en_support, 'ar-SA': _en_support, 'fil-PH': _en_support,
  'hi-IN': _en_support, 'id-ID': _en_support, 'th-TH': _en_support, 'ja-JP': _en_support, 'zh-CN': _en_support,
};

export interface NavCopy {
  home: string; pay: string; merchant: string; social: string; more: string;
  close: string; search: string; openHub: string;
}
const _en_nav: NavCopy = { home: 'Home', pay: 'Pay', merchant: 'Merchant', social: 'Social', more: 'More', close: 'Close', search: 'Search anywhere...', openHub: 'Open full hub' };
export const NAV_TRANSLATIONS: TranslationMap<NavCopy> = {
  'en-US': _en_nav, 'en-GB': _en_nav, 'es-ES': _en_nav, 'fr-FR': _en_nav, 'de-DE': _en_nav,
  'ar-SA': _en_nav, 'fil-PH': _en_nav, 'hi-IN': _en_nav, 'id-ID': _en_nav,
  'th-TH': _en_nav, 'ja-JP': _en_nav, 'zh-CN': _en_nav,
};

export interface StubCopy {
  comingSoon: string; description: string; notifyMe: string; backToHome: string;
}
const _en_stub: StubCopy = { comingSoon: 'Coming Soon', description: 'This feature is under active development and will be available on mainnet launch.', notifyMe: 'Notify Me', backToHome: 'Back to Home' };
export const STUB_TRANSLATIONS: TranslationMap<StubCopy> = {
  'en-US': _en_stub, 'en-GB': _en_stub, 'es-ES': _en_stub, 'fr-FR': _en_stub, 'de-DE': _en_stub,
  'ar-SA': _en_stub, 'fil-PH': _en_stub, 'hi-IN': _en_stub, 'id-ID': _en_stub,
  'th-TH': _en_stub, 'ja-JP': _en_stub, 'zh-CN': _en_stub,
};

export interface AboutCopy { heading: string; subtitle: string; mission: string; }
const _en_about: AboutCopy = { heading: 'About VFIDE', subtitle: 'A non-custodial payment protocol built for the world\'s unbanked.', mission: 'Financial infrastructure that works for people, not against them.' };
export const ABOUT_TRANSLATIONS: TranslationMap<AboutCopy> = {
  'en-US': _en_about, 'en-GB': _en_about, 'es-ES': _en_about, 'fr-FR': _en_about, 'de-DE': _en_about,
  'ar-SA': _en_about, 'fil-PH': _en_about, 'hi-IN': _en_about, 'id-ID': _en_about,
  'th-TH': _en_about, 'ja-JP': _en_about, 'zh-CN': _en_about,
};

export interface HomeCopy { hero: string; subtitle: string; cta: string; homeAriaShop: string; homeAriaSell: string; }
const _en_home: HomeCopy = { hero: 'Pay anyone. Zero merchant fees.', subtitle: 'The non-custodial payment protocol built for the world\'s unbanked — powered by ProofScore.', cta: 'Get started', homeAriaShop: 'Browse the marketplace', homeAriaSell: 'Set up your merchant account' };
export const HOME_TRANSLATIONS: TranslationMap<HomeCopy> = {
  'en-US': _en_home, 'en-GB': _en_home, 'es-ES': _en_home, 'fr-FR': _en_home, 'de-DE': _en_home,
  'ar-SA': _en_home, 'fil-PH': _en_home, 'hi-IN': _en_home, 'id-ID': _en_home,
  'th-TH': _en_home, 'ja-JP': _en_home, 'zh-CN': _en_home,
};

export interface MerchantCopy { heading: string; subtitle: string; getStarted: string; }
const _en_merchant: MerchantCopy = { heading: 'Merchant Hub', subtitle: 'Sell anything. Keep 100% of every payment.', getStarted: 'Get started' };
export const MERCHANT_TRANSLATIONS: TranslationMap<MerchantCopy> = {
  'en-US': _en_merchant, 'en-GB': _en_merchant, 'es-ES': _en_merchant, 'fr-FR': _en_merchant, 'de-DE': _en_merchant,
  'ar-SA': _en_merchant, 'fil-PH': _en_merchant, 'hi-IN': _en_merchant, 'id-ID': _en_merchant,
  'th-TH': _en_merchant, 'ja-JP': _en_merchant, 'zh-CN': _en_merchant,
};

export interface OnboardingCopy { heading: string; subtitle: string; launch: string; reset: string; }
const _en_onboarding: OnboardingCopy = { heading: 'Setup Wizard', subtitle: 'Get started with VFIDE in under 2 minutes.', launch: 'Open wizard', reset: 'Reset & restart' };
export const ONBOARDING_TRANSLATIONS: TranslationMap<OnboardingCopy> = {
  'en-US': _en_onboarding, 'en-GB': _en_onboarding, 'es-ES': _en_onboarding, 'fr-FR': _en_onboarding, 'de-DE': _en_onboarding,
  'ar-SA': _en_onboarding, 'fil-PH': _en_onboarding, 'hi-IN': _en_onboarding, 'id-ID': _en_onboarding,
  'th-TH': _en_onboarding, 'ja-JP': _en_onboarding, 'zh-CN': _en_onboarding,
};

export interface PayCopy { heading: string; subtitle: string; }
const _en_pay: PayCopy = { heading: 'Send Payment', subtitle: 'Pay any wallet. Zero merchant fees.' };
export const PAY_TRANSLATIONS: TranslationMap<PayCopy> = {
  'en-US': _en_pay, 'en-GB': _en_pay, 'es-ES': _en_pay, 'fr-FR': _en_pay, 'de-DE': _en_pay,
  'ar-SA': _en_pay, 'fil-PH': _en_pay, 'hi-IN': _en_pay, 'id-ID': _en_pay,
  'th-TH': _en_pay, 'ja-JP': _en_pay, 'zh-CN': _en_pay,
};

export interface ProofscoreCopy { heading: string; subtitle: string; }
const _en_proofscore: ProofscoreCopy = { heading: 'Your ProofScore', subtitle: 'On-chain reputation that earns you cheaper fees.' };
export const PROOFSCORE_TRANSLATIONS: TranslationMap<ProofscoreCopy> = {
  'en-US': _en_proofscore, 'en-GB': _en_proofscore, 'es-ES': _en_proofscore, 'fr-FR': _en_proofscore, 'de-DE': _en_proofscore,
  'ar-SA': _en_proofscore, 'fil-PH': _en_proofscore, 'hi-IN': _en_proofscore, 'id-ID': _en_proofscore,
  'th-TH': _en_proofscore, 'ja-JP': _en_proofscore, 'zh-CN': _en_proofscore,
};

export interface RemittanceCopy { heading: string; subtitle: string; }
const _en_remittance: RemittanceCopy = { heading: 'Send Money Home', subtitle: 'International transfers at near-zero cost.' };
export const REMITTANCE_TRANSLATIONS: TranslationMap<RemittanceCopy> = {
  'en-US': _en_remittance, 'en-GB': _en_remittance, 'es-ES': _en_remittance, 'fr-FR': _en_remittance, 'de-DE': _en_remittance,
  'ar-SA': _en_remittance, 'fil-PH': _en_remittance, 'hi-IN': _en_remittance, 'id-ID': _en_remittance,
  'th-TH': _en_remittance, 'ja-JP': _en_remittance, 'zh-CN': _en_remittance,
};

export interface SecurityCenterCopy { heading: string; subtitle: string; }
const _en_security: SecurityCenterCopy = { heading: 'Security Center', subtitle: 'Monitor sessions, signing keys, and protocol activity.' };
export const SECURITY_CENTER_TRANSLATIONS: TranslationMap<SecurityCenterCopy> = {
  'en-US': _en_security, 'en-GB': _en_security, 'es-ES': _en_security, 'fr-FR': _en_security, 'de-DE': _en_security,
  'ar-SA': _en_security, 'fil-PH': _en_security, 'hi-IN': _en_security, 'id-ID': _en_security,
  'th-TH': _en_security, 'ja-JP': _en_security, 'zh-CN': _en_security,
};

export interface DashboardCopy { heading: string; subtitle: string; }
const _en_dashboard: DashboardCopy = { heading: 'Dashboard', subtitle: 'Your VFIDE activity at a glance.' };
export const DASHBOARD_TRANSLATIONS: TranslationMap<DashboardCopy> = {
  'en-US': _en_dashboard, 'en-GB': _en_dashboard, 'es-ES': { heading: 'Panel de control', subtitle: 'Tu actividad VFIDE de un vistazo.' },
  'fr-FR': { heading: 'Tableau de bord', subtitle: 'Votre activité VFIDE en un coup d\'œil.' },
  'de-DE': { heading: 'Dashboard', subtitle: 'Ihre VFIDE-Aktivität auf einen Blick.' },
  'ar-SA': { heading: 'لوحة التحكم', subtitle: 'نشاطك في VFIDE بنظرة واحدة.' },
  'fil-PH': { heading: 'Dashboard', subtitle: 'Ang iyong aktibidad sa VFIDE sa isang tingin.' },
  'hi-IN': { heading: 'डैशबोर्ड', subtitle: 'एक नजर में आपकी VFIDE गतिविधि।' },
  'id-ID': { heading: 'Dasbor', subtitle: 'Aktivitas VFIDE Anda sekilas.' },
  'th-TH': { heading: 'แดชบอร์ด', subtitle: 'กิจกรรม VFIDE ของคุณในมุมมองเดียว' },
  'ja-JP': { heading: 'ダッシュボード', subtitle: 'VFIDEの活動を一目で確認。' },
  'zh-CN': { heading: '仪表板', subtitle: '一览您的 VFIDE 活动。' },
};

export interface BenefitsCopy { heading: string; subtitle: string; }
const _en_benefits: BenefitsCopy = { heading: 'Benefits & Rewards', subtitle: 'Earn more as your ProofScore grows.' };
export const BENEFITS_TRANSLATIONS: TranslationMap<BenefitsCopy> = {
  'en-US': _en_benefits, 'en-GB': _en_benefits,
  'es-ES': { heading: 'Beneficios y recompensas', subtitle: 'Gana más a medida que crece tu ProofScore.' },
  'fr-FR': { heading: 'Avantages et récompenses', subtitle: 'Gagnez plus à mesure que votre ProofScore augmente.' },
  'de-DE': { heading: 'Vorteile & Belohnungen', subtitle: 'Verdiene mehr, je höher dein ProofScore steigt.' },
  'ar-SA': { heading: 'المزايا والمكافآت', subtitle: 'اكسب أكثر كلما نما رصيد الإثبات الخاص بك.' },
  'fil-PH': { heading: 'Mga Benepisyo at Gantimpala', subtitle: 'Kumita ng higit pa habang lumalaki ang iyong ProofScore.' },
  'hi-IN': { heading: 'लाभ और पुरस्कार', subtitle: 'आपका ProofScore बढ़ने के साथ अधिक कमाएं।' },
  'id-ID': { heading: 'Manfaat & Hadiah', subtitle: 'Dapatkan lebih banyak seiring ProofScore Anda bertumbuh.' },
  'th-TH': { heading: 'สิทธิประโยชน์และรางวัล', subtitle: 'รับมากขึ้นเมื่อ ProofScore ของคุณเติบโต' },
  'ja-JP': { heading: 'ベネフィットと報酬', subtitle: 'ProofScoreが上がるほど多く獲得できます。' },
  'zh-CN': { heading: '福利与奖励', subtitle: '随着 ProofScore 提升获得更多收益。' },
};

export interface GovernanceCopy { heading: string; subtitle: string; }
const _en_governance: GovernanceCopy = { heading: 'Governance', subtitle: 'Vote on proposals. Shape the protocol.' };
export const GOVERNANCE_TRANSLATIONS: TranslationMap<GovernanceCopy> = {
  'en-US': _en_governance, 'en-GB': _en_governance,
  'es-ES': { heading: 'Gobernanza', subtitle: 'Vota propuestas. Da forma al protocolo.' },
  'fr-FR': { heading: 'Gouvernance', subtitle: 'Votez les propositions. Façonnez le protocole.' },
  'de-DE': { heading: 'Governance', subtitle: 'Stimme über Vorschläge ab. Gestalte das Protokoll.' },
  'ar-SA': { heading: 'الحوكمة', subtitle: 'صوّت على المقترحات. شكّل البروتوكول.' },
  'fil-PH': { heading: 'Pamamahala', subtitle: 'Bumoto sa mga panukala. Hubugin ang protokol.' },
  'hi-IN': { heading: 'शासन', subtitle: 'प्रस्तावों पर मतदान करें। प्रोटोकॉल को आकार दें।' },
  'id-ID': { heading: 'Tata Kelola', subtitle: 'Voting proposal. Bentuk protokolnya.' },
  'th-TH': { heading: 'การกำกับดูแล', subtitle: 'ลงคะแนนข้อเสนอ กำหนดทิศทางโปรโตคอล' },
  'ja-JP': { heading: 'ガバナンス', subtitle: '提案に投票してプロトコルを形成する。' },
  'zh-CN': { heading: '治理', subtitle: '对提案投票，塑造协议走向。' },
};


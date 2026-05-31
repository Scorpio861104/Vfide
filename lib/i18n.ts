import { safeLocalStorage } from '@/lib/utils';
import { LOCALE_STORAGE_KEY, LEGACY_LOCALE_STORAGE_KEY } from '@/lib/locale';

export const SUPPORTED_LOCALES = ['en-US', 'en-GB', 'es-ES', 'fr-FR', 'de-DE'] as const;
export type SupportedLocale = typeof SUPPORTED_LOCALES[number];

export const DEFAULT_LOCALE: SupportedLocale = 'en-US';

export const LOCALE_OPTIONS: Array<{ value: SupportedLocale; label: string }> = [
  { value: 'en-US', label: 'English (US)' },
  { value: 'en-GB', label: 'English (UK)' },
  { value: 'es-ES', label: 'Español' },
  { value: 'fr-FR', label: 'Français' },
  { value: 'de-DE', label: 'Deutsch' },
];

const LANGUAGE_FALLBACKS: Record<string, SupportedLocale> = {
  en: 'en-US',
  es: 'es-ES',
  fr: 'fr-FR',
  de: 'de-DE',
};

export function normalizeLocale(input?: string | null): SupportedLocale {
  if (!input) return DEFAULT_LOCALE;

  const firstToken = input
    .split(',')
    .map((part) => part.split(';')[0]?.trim())
    .find(Boolean);

  if (!firstToken) return DEFAULT_LOCALE;

  const sanitized = firstToken.replace('_', '-');
  if (SUPPORTED_LOCALES.includes(sanitized as SupportedLocale)) {
    return sanitized as SupportedLocale;
  }

  const base = sanitized.slice(0, 2).toLowerCase();
  return LANGUAGE_FALLBACKS[base] ?? DEFAULT_LOCALE;
}

export function getHtmlLang(input?: string | null): string {
  return normalizeLocale(input).split('-')[0] ?? 'en';
}

export function getBrowserLocale(): SupportedLocale {
  if (typeof window === 'undefined') return DEFAULT_LOCALE;

  const queryLocale = new URLSearchParams(window.location.search).get('lang');
  const storedLocale = safeLocalStorage.getItem(LOCALE_STORAGE_KEY)
    || safeLocalStorage.getItem(LEGACY_LOCALE_STORAGE_KEY);
  const navigatorLocale = typeof navigator !== 'undefined' ? navigator.language : DEFAULT_LOCALE;

  return normalizeLocale(queryLocale ?? storedLocale ?? navigatorLocale);
}

export function persistLocale(locale: string): SupportedLocale {
  const normalized = normalizeLocale(locale);

  safeLocalStorage.setItem(LOCALE_STORAGE_KEY, normalized);
  // Keep legacy key for backwards compatibility while old code paths are retired.
  safeLocalStorage.setItem(LEGACY_LOCALE_STORAGE_KEY, normalized);

  if (typeof document !== 'undefined') {
    document.documentElement.lang = getHtmlLang(normalized);
    document.documentElement.setAttribute('data-locale', normalized);
    document.cookie = `${LOCALE_STORAGE_KEY}=${normalized}; path=/; max-age=31536000; samesite=lax`;
    document.cookie = `${LEGACY_LOCALE_STORAGE_KEY}=${normalized}; path=/; max-age=31536000; samesite=lax`;
  }

  return normalized;
}

type TranslationMap<T> = Partial<Record<SupportedLocale, T>> & { 'en-US': T };

export function pickLocaleCopy<T>(translations: TranslationMap<T>, locale: string | null | undefined): T {
  const normalized = normalizeLocale(locale);
  return translations[normalized] ?? translations['en-US'];
}

export interface SupportCopy {
  badge: string;
  heading: string;
  subtitle: string;
  languageLabel: string;
  faqTabLabel: string;
  ticketsTabLabel: string;
  newTicketTabLabel: string;
  faqItems: Array<{ question: string; answer: string }>;
  searchPlaceholder: string;
  noFaqResults: string;
  noTicketsMessage: string;
  createTicketHint: string;
  subjectPrefix: string;
  ticketIdLabel: string;
  supportTeamLabel: string;
  youLabel: string;
  selectTicketMessage: string;
  connectPrompt: string;
  subjectPlaceholder: string;
  detailsPlaceholder: string;
  submitTicketLabel: string;
}

const supportEnglish: SupportCopy = {
  badge: '24/7 Support',
  heading: 'Help & Support Center',
  subtitle: 'Find answers, manage tickets, and get direct support from the VFIDE team.',
  languageLabel: 'Language',
  faqTabLabel: 'FAQ',
  ticketsTabLabel: 'My Tickets',
  newTicketTabLabel: 'New Ticket',
  faqItems: [
    {
      question: 'How do I connect my wallet?',
      answer: 'Open the wallet menu, select your preferred wallet, and approve the VFIDE connection request.',
    },
    {
      question: 'How does ProofScore work?',
      answer: 'ProofScore rewards trustworthy activity, participation, and successful platform usage over time.',
    },
    {
      question: 'How do I set up guardians?',
      answer: 'Navigate to the guardians page, choose trusted contacts, and confirm the recovery configuration.',
    },
  ],
  searchPlaceholder: 'Search for answers...',
  noFaqResults: 'No matching FAQs found.',
  noTicketsMessage: 'No tickets yet. Create one from the new ticket tab.',
  createTicketHint: 'Choose a ticket to see the conversation.',
  subjectPrefix: 'Subject',
  ticketIdLabel: 'Ticket ID',
  supportTeamLabel: 'Support Team',
  youLabel: 'You',
  selectTicketMessage: 'Choose a ticket to see the conversation.',
  connectPrompt: 'Connect your wallet to create support tickets.',
  subjectPlaceholder: 'Brief summary of your issue',
  detailsPlaceholder: 'Describe what happened, what you expected, and any transaction IDs.',
  submitTicketLabel: 'Submit Ticket',
};

export const SUPPORT_TRANSLATIONS: TranslationMap<SupportCopy> = {
  'en-US': supportEnglish,
  'en-GB': supportEnglish,
  'es-ES': {
    badge: 'Soporte 24/7',
    heading: 'Centro de ayuda y soporte',
    subtitle: 'Encuentra respuestas, administra tickets y recibe ayuda directa del equipo VFIDE.',
    languageLabel: 'Language',
    faqTabLabel: 'FAQ',
    ticketsTabLabel: 'Mis tickets',
    newTicketTabLabel: 'Nuevo ticket',
    faqItems: [
      {
        question: '¿Cómo conecto mi billetera?',
        answer: 'Abre el menú de billetera, elige tu billetera preferida y aprueba la solicitud de conexión de VFIDE.',
      },
      {
        question: '¿Cómo funciona ProofScore?',
        answer: 'ProofScore recompensa la actividad confiable, la participación y el uso exitoso de la plataforma con el tiempo.',
      },
      {
        question: '¿Cómo configuro guardians?',
        answer: 'Ve a la página de guardians, elige contactos de confianza y confirma la configuración de recuperación.',
      },
    ],
    searchPlaceholder: 'Buscar respuestas...',
    noFaqResults: 'No se encontraron preguntas frecuentes.',
    noTicketsMessage: 'Aún no tienes tickets. Crea uno desde la pestaña de nuevo ticket.',
    createTicketHint: 'Elige un ticket para ver la conversación.',
    subjectPrefix: 'Asunto',
    ticketIdLabel: 'ID del ticket',
    supportTeamLabel: 'Equipo de soporte',
    youLabel: 'Tú',
    selectTicketMessage: 'Elige un ticket para ver la conversación.',
    connectPrompt: 'Conecta tu billetera para crear tickets de soporte.',
    subjectPlaceholder: 'Resumen breve del problema',
    detailsPlaceholder: 'Describe qué ocurrió, qué esperabas y cualquier ID de transacción.',
    submitTicketLabel: 'Enviar ticket',
  },
  'fr-FR': {
    badge: 'Assistance 24/7',
    heading: 'Centre d’aide et d’assistance',
    subtitle: 'Trouvez des réponses, gérez vos tickets et obtenez un support direct de l’équipe VFIDE.',
    languageLabel: 'Language',
    faqTabLabel: 'FAQ',
    ticketsTabLabel: 'Mes tickets',
    newTicketTabLabel: 'Nouveau ticket',
    faqItems: supportEnglish.faqItems,
    searchPlaceholder: 'Rechercher des réponses...',
    noFaqResults: supportEnglish.noFaqResults,
    noTicketsMessage: supportEnglish.noTicketsMessage,
    createTicketHint: supportEnglish.createTicketHint,
    subjectPrefix: supportEnglish.subjectPrefix,
    ticketIdLabel: supportEnglish.ticketIdLabel,
    supportTeamLabel: supportEnglish.supportTeamLabel,
    youLabel: supportEnglish.youLabel,
    selectTicketMessage: supportEnglish.selectTicketMessage,
    connectPrompt: supportEnglish.connectPrompt,
    subjectPlaceholder: supportEnglish.subjectPlaceholder,
    detailsPlaceholder: supportEnglish.detailsPlaceholder,
    submitTicketLabel: supportEnglish.submitTicketLabel,
  },
  'de-DE': {
    badge: '24/7-Support',
    heading: 'Hilfe- und Supportcenter',
    subtitle: 'Finden Sie Antworten, verwalten Sie Tickets und erhalten Sie direkten Support vom VFIDE-Team.',
    languageLabel: 'Language',
    faqTabLabel: 'FAQ',
    ticketsTabLabel: 'Meine Tickets',
    newTicketTabLabel: 'Neues Ticket',
    faqItems: supportEnglish.faqItems,
    searchPlaceholder: 'Nach Antworten suchen...',
    noFaqResults: supportEnglish.noFaqResults,
    noTicketsMessage: supportEnglish.noTicketsMessage,
    createTicketHint: supportEnglish.createTicketHint,
    subjectPrefix: supportEnglish.subjectPrefix,
    ticketIdLabel: supportEnglish.ticketIdLabel,
    supportTeamLabel: supportEnglish.supportTeamLabel,
    youLabel: supportEnglish.youLabel,
    selectTicketMessage: supportEnglish.selectTicketMessage,
    connectPrompt: supportEnglish.connectPrompt,
    subjectPlaceholder: supportEnglish.subjectPlaceholder,
    detailsPlaceholder: supportEnglish.detailsPlaceholder,
    submitTicketLabel: supportEnglish.submitTicketLabel,
  },
};

export interface HomeCopy {
  liveBadge: string;
  heroPrefix: string;
  heroAccent: string;
  heroDescription: string;
  trustPoints: [string, string, string, string];
  primaryCta: string;
  secondaryCta: string;
  sliderHint: string;
  statsKicker: string;
  statsTitlePrefix: string;
  statsTitleAccent: string;
  merchantFeesLabel: string;
  maxProofScoreLabel: string;
  burnRateLabel: string;
  sanctumFundLabel: string;
}

const homeEnglish: HomeCopy = {
  liveBadge: 'Trust-Scored Payments · Now on Base',
  heroPrefix: 'Keep what you',
  heroAccent: 'earn',
  heroDescription: 'Zero merchant fees. Guardian-protected self-custody. Reputation that pays you back. Built for everyone the platforms forgot.',
  trustPoints: [
    'Non-custodial: your keys, your coins',
    'Open-source contracts on Base',
    'Guardian multi-sig recovery',
    'On-chain audit trail for every tx',
  ],
  primaryCta: 'Start selling',
  secondaryCta: 'Browse marketplace',
  sliderHint: 'Try the slider — drag your trust score and watch the fee curve respond in real time.',
  statsKicker: 'Protocol stats',
  statsTitlePrefix: 'Numbers that',
  statsTitleAccent: 'matter',
  merchantFeesLabel: 'Merchant Fees',
  maxProofScoreLabel: 'Max ProofScore',
  burnRateLabel: 'Burn Rate',
  sanctumFundLabel: 'Sanctum Fund',
};

export const HOME_TRANSLATIONS: TranslationMap<HomeCopy> = {
  'en-US': homeEnglish,
  'en-GB': homeEnglish,
  'es-ES': {
    liveBadge: 'Pagos con trust score · Ya disponible en Base',
    heroPrefix: 'Conserva lo que',
    heroAccent: 'ganas',
    heroDescription: 'Cero comisiones para comerciantes. Autocustodia protegida por guardians. Reputación que te devuelve valor. Diseñado para quienes las plataformas olvidaron.',
    trustPoints: [
      'Sin custodia: tus llaves, tus fondos',
      'Contratos de código abierto en Base',
      'Recuperación multi-sig con guardians',
      'Rastreo on-chain para cada transacción',
    ],
    primaryCta: 'Empezar a vender',
    secondaryCta: 'Explorar marketplace',
    sliderHint: 'Prueba el deslizador: mueve tu trust score y observa cómo responde la curva de comisiones en tiempo real.',
    statsKicker: 'Estadísticas del protocolo',
    statsTitlePrefix: 'Números que',
    statsTitleAccent: 'importan',
    merchantFeesLabel: 'Comisiones de comerciantes',
    maxProofScoreLabel: 'ProofScore máximo',
    burnRateLabel: 'Tasa de quema',
    sanctumFundLabel: 'Fondo Sanctum',
  },
  'fr-FR': {
    liveBadge: 'Paiements scorés par la confiance · Désormais sur Base',
    heroPrefix: 'Gardez ce que vous',
    heroAccent: 'gagnez',
    heroDescription: 'Zéro frais marchand. Auto-garde protégée par guardians. Une réputation qui vous récompense. Conçu pour celles et ceux que les plateformes ont oubliés.',
    trustPoints: [
      'Non custodial : vos clés, vos fonds',
      'Contrats open source sur Base',
      'Récupération multi-signature avec guardians',
      'Traçabilité on-chain pour chaque transaction',
    ],
    primaryCta: 'Commencer à vendre',
    secondaryCta: 'Parcourir le marketplace',
    sliderHint: 'Testez le curseur : ajustez votre trust score et observez la courbe des frais en temps réel.',
    statsKicker: 'Statistiques du protocole',
    statsTitlePrefix: 'Des chiffres qui',
    statsTitleAccent: 'comptent',
    merchantFeesLabel: 'Frais marchands',
    maxProofScoreLabel: 'ProofScore max',
    burnRateLabel: 'Taux de burn',
    sanctumFundLabel: 'Fonds Sanctum',
  },
  'de-DE': {
    liveBadge: 'Vertrauensbasierte Zahlungen · Jetzt auf Base',
    heroPrefix: 'Behalte, was du',
    heroAccent: 'verdienst',
    heroDescription: 'Keine Händlergebühren. Guardian-geschützte Selbstverwahrung. Reputation, die sich auszahlt. Für alle gebaut, die Plattformen vergessen haben.',
    trustPoints: [
      'Non-custodial: deine Keys, deine Coins',
      'Open-Source-Verträge auf Base',
      'Guardian Multi-Sig Recovery',
      'On-Chain-Audit-Track für jede Transaktion',
    ],
    primaryCta: 'Verkauf starten',
    secondaryCta: 'Marketplace öffnen',
    sliderHint: 'Teste den Regler: Bewege deinen Trust Score und sieh, wie die Gebührenkurve in Echtzeit reagiert.',
    statsKicker: 'Protokoll-Statistiken',
    statsTitlePrefix: 'Zahlen, die',
    statsTitleAccent: 'zählen',
    merchantFeesLabel: 'Händlergebühren',
    maxProofScoreLabel: 'Max ProofScore',
    burnRateLabel: 'Burn Rate',
    sanctumFundLabel: 'Sanctum-Fonds',
  },
};

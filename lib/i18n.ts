import { safeLocalStorage } from '@/lib/utils';

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
  const storedLocale = safeLocalStorage.getItem('vfide_locale');
  const navigatorLocale = typeof navigator !== 'undefined' ? navigator.language : DEFAULT_LOCALE;

  return normalizeLocale(queryLocale ?? storedLocale ?? navigatorLocale);
}

export function persistLocale(locale: string): SupportedLocale {
  const normalized = normalizeLocale(locale);

  safeLocalStorage.setItem('vfide_locale', normalized);

  if (typeof document !== 'undefined') {
    document.documentElement.lang = getHtmlLang(normalized);
    document.documentElement.setAttribute('data-locale', normalized);
    document.cookie = `vfide_locale=${normalized}; path=/; max-age=31536000; samesite=lax`;
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
  description: string;
  languageLabel: string;
  faqTitle: string;
  faqDescription: string;
  ticketsTitle: string;
  ticketsDescription: string;
  activeSuffix: string;
  newTicketTitle: string;
  newTicketDescription: string;
  searchPlaceholder: string;
}

const supportEnglish: SupportCopy = {
  badge: '24/7 Support',
  heading: 'Help & Support Center',
  description: 'Find answers to common questions or open a support ticket. Our team is here to help you with any issues.',
  languageLabel: 'Language',
  faqTitle: 'FAQ & Guides',
  faqDescription: 'Browse common questions and tutorials',
  ticketsTitle: 'My Tickets',
  ticketsDescription: 'View and manage your support requests',
  activeSuffix: 'active',
  newTicketTitle: 'New Ticket',
  newTicketDescription: 'Create a new support request',
  searchPlaceholder: 'Search for answers...',
};

export const SUPPORT_TRANSLATIONS: TranslationMap<SupportCopy> = {
  'en-US': supportEnglish,
  'en-GB': supportEnglish,
  'es-ES': {
    badge: 'Soporte 24/7',
    heading: 'Centro de ayuda y soporte',
    description: 'Encuentra respuestas a preguntas comunes o abre un ticket de soporte. Nuestro equipo está aquí para ayudarte con cualquier problema.',
    languageLabel: 'Language',
    faqTitle: 'Preguntas frecuentes y guías',
    faqDescription: 'Consulta preguntas comunes y tutoriales',
    ticketsTitle: 'Mis tickets',
    ticketsDescription: 'Ver y gestionar tus solicitudes de soporte',
    activeSuffix: 'activos',
    newTicketTitle: 'Nuevo ticket',
    newTicketDescription: 'Crear una nueva solicitud de soporte',
    searchPlaceholder: 'Buscar respuestas...',
  },
  'fr-FR': {
    badge: 'Assistance 24/7',
    heading: 'Centre d’aide et d’assistance',
    description: 'Trouvez des réponses aux questions courantes ou ouvrez un ticket d’assistance. Notre équipe est là pour vous aider.',
    languageLabel: 'Language',
    faqTitle: 'FAQ et guides',
    faqDescription: 'Parcourez les questions courantes et les tutoriels',
    ticketsTitle: 'Mes tickets',
    ticketsDescription: 'Voir et gérer vos demandes d’assistance',
    activeSuffix: 'actifs',
    newTicketTitle: 'Nouveau ticket',
    newTicketDescription: 'Créer une nouvelle demande d’assistance',
    searchPlaceholder: 'Rechercher des réponses...',
  },
  'de-DE': {
    badge: '24/7-Support',
    heading: 'Hilfe- und Supportcenter',
    description: 'Finden Sie Antworten auf häufige Fragen oder eröffnen Sie ein Support-Ticket. Unser Team hilft Ihnen gern weiter.',
    languageLabel: 'Language',
    faqTitle: 'FAQ & Anleitungen',
    faqDescription: 'Häufige Fragen und Tutorials durchsuchen',
    ticketsTitle: 'Meine Tickets',
    ticketsDescription: 'Ihre Supportanfragen ansehen und verwalten',
    activeSuffix: 'aktiv',
    newTicketTitle: 'Neues Ticket',
    newTicketDescription: 'Eine neue Supportanfrage erstellen',
    searchPlaceholder: 'Nach Antworten suchen...',
  },
};

export interface HomeCopy {
  languageLabel: string;
  liveBadge: string;
  heroTitle: string;
  heroAccent: string;
  heroDescription: string;
  valueProps: [string, string, string];
  primaryCta: string;
  secondaryCta: string;
  contractsBadge: string;
  auditBadge: string;
  settlementBadge: string;
  chainBadge: string;
  finalTitle: string;
  finalDescription: string;
  launchApp: string;
  docsCta: string;
}

const homeEnglish: HomeCopy = {
  languageLabel: 'Language',
  liveBadge: 'Now Live on Base',
  heroTitle: 'Accept Crypto.',
  heroAccent: 'Zero Fees.',
  heroDescription: 'The first payment protocol where merchants pay zero processing fees. Token transfers have behavioral fees (0.25-5%) that reward trust. Own your funds and build a ProofScore that unlocks lower fees.',
  valueProps: ['Pay', 'Build Trust', 'Unlock Rewards'],
  primaryCta: 'Get Started',
  secondaryCta: 'Explore Flashloans P2P',
  contractsBadge: '14 Contracts Deployed',
  auditBadge: 'Audited & Open Source',
  settlementBadge: 'Instant Settlement',
  chainBadge: 'Built for Base • Polygon • zkSync',
  finalTitle: 'Ready to Own Your Payments?',
  finalDescription: 'Join thousands of merchants and users building trust on VFIDE.',
  launchApp: 'Launch App',
  docsCta: 'Read Documentation',
};

export const HOME_TRANSLATIONS: TranslationMap<HomeCopy> = {
  'en-US': homeEnglish,
  'en-GB': homeEnglish,
  'es-ES': {
    languageLabel: 'Language',
    liveBadge: 'Ya disponible en Base',
    heroTitle: 'Acepta criptomonedas.',
    heroAccent: 'Cero comisiones.',
    heroDescription: 'El primer protocolo de pagos donde los comerciantes pagan cero comisiones de procesamiento. Las transferencias aplican tarifas de comportamiento (0,25-5%) que recompensan la confianza.',
    valueProps: ['Paga', 'Gana confianza', 'Desbloquea recompensas'],
    primaryCta: 'Comenzar',
    secondaryCta: 'Explorar Flashloans P2P',
    contractsBadge: '14 contratos desplegados',
    auditBadge: 'Auditado y de código abierto',
    settlementBadge: 'Liquidación instantánea',
    chainBadge: 'Creado para Base • Polygon • zkSync',
    finalTitle: '¿Listo para controlar tus pagos?',
    finalDescription: 'Únete a miles de comerciantes y usuarios que están construyendo confianza en VFIDE.',
    launchApp: 'Abrir app',
    docsCta: 'Leer documentación',
  },
  'fr-FR': {
    languageLabel: 'Language',
    liveBadge: 'Désormais en ligne sur Base',
    heroTitle: 'Acceptez la crypto.',
    heroAccent: 'Zéro frais.',
    heroDescription: 'Le premier protocole de paiement où les commerçants paient zéro frais de traitement. Les transferts appliquent des frais comportementaux (0,25-5 %) qui récompensent la confiance.',
    valueProps: ['Payer', 'Créer la confiance', 'Débloquer des récompenses'],
    primaryCta: 'Commencer',
    secondaryCta: 'Explorer Flashloans P2P',
    contractsBadge: '14 contrats déployés',
    auditBadge: 'Audité et open source',
    settlementBadge: 'Règlement instantané',
    chainBadge: 'Conçu pour Base • Polygon • zkSync',
    finalTitle: 'Prêt à maîtriser vos paiements ?',
    finalDescription: 'Rejoignez des milliers de marchands et d’utilisateurs qui renforcent la confiance sur VFIDE.',
    launchApp: 'Ouvrir l’app',
    docsCta: 'Lire la documentation',
  },
  'de-DE': {
    languageLabel: 'Language',
    liveBadge: 'Jetzt live auf Base',
    heroTitle: 'Krypto akzeptieren.',
    heroAccent: 'Keine Gebühren.',
    heroDescription: 'Das erste Zahlungsprotokoll, bei dem Händler keine Bearbeitungsgebühren zahlen. Token-Transfers nutzen verhaltensabhängige Gebühren (0,25-5 %), die Vertrauen belohnen.',
    valueProps: ['Bezahlen', 'Vertrauen aufbauen', 'Belohnungen freischalten'],
    primaryCta: 'Loslegen',
    secondaryCta: 'Flashloans P2P erkunden',
    contractsBadge: '14 Verträge bereitgestellt',
    auditBadge: 'Geprüft & Open Source',
    settlementBadge: 'Sofortige Abwicklung',
    chainBadge: 'Entwickelt für Base • Polygon • zkSync',
    finalTitle: 'Bereit, Ihre Zahlungen selbst zu steuern?',
    finalDescription: 'Schließen Sie sich Tausenden von Händlern und Nutzern an, die Vertrauen auf VFIDE aufbauen.',
    launchApp: 'App starten',
    docsCta: 'Dokumentation lesen',
  },
};

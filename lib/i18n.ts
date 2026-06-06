import { safeLocalStorage } from '@/lib/utils';
import { LOCALE_STORAGE_KEY, LEGACY_LOCALE_STORAGE_KEY } from '@/lib/locale';

export const SUPPORTED_LOCALES = ['en-US', 'en-GB', 'es-ES', 'fr-FR', 'de-DE', 'ar-SA', 'fil-PH', 'id-ID', 'th-TH', 'hi-IN', 'ja-JP', 'zh-CN', 'sw-KE', 'ha-NG', 'pt-BR'] as const;
export type SupportedLocale = typeof SUPPORTED_LOCALES[number];

export const DEFAULT_LOCALE: SupportedLocale = 'en-US';

export const LOCALE_OPTIONS: Array<{ value: SupportedLocale; label: string }> = [
  { value: 'en-US', label: 'English (US)' },
  { value: 'en-GB', label: 'English (UK)' },
  { value: 'es-ES', label: 'Español' },
  { value: 'fr-FR', label: 'Français' },
  { value: 'de-DE', label: 'Deutsch' },
  { value: 'ar-SA', label: 'العربية' },
  { value: 'fil-PH', label: 'Filipino' },
  { value: 'id-ID', label: 'Bahasa Indonesia' },
  { value: 'th-TH', label: 'ไทย' },
  { value: 'hi-IN', label: 'हिन्दी' },
  { value: 'ja-JP', label: '日本語' },
  { value: 'zh-CN', label: '中文' },
  { value: 'sw-KE', label: 'Kiswahili' },
  { value: 'ha-NG', label: 'Hausa' },
  { value: 'pt-BR', label: 'Português' },
];

const LANGUAGE_FALLBACKS: Record<string, SupportedLocale> = {
  en: 'en-US',
  es: 'es-ES',
  fr: 'fr-FR',
  de: 'de-DE',
  ar: 'ar-SA',
  hi: 'hi-IN',
  sw: 'sw-KE',
  ha: 'ha-NG',
  pt: 'pt-BR',
  fil: 'fil-PH',
  tl: 'fil-PH',
  id: 'id-ID',
  th: 'th-TH',
  ja: 'ja-JP',
  zh: 'zh-CN',
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
  whatKicker: string;
  whatTitlePrefix: string;
  whatTitleAccent: string;
  whatItems: [
    { label: string; body: string },
    { label: string; body: string },
    { label: string; body: string },
  ];
  // below-the-fold
  featuresKicker: string;
  featuresTitlePrefix: string;
  featuresTitleAccent: string;
  featuresSubhead: string;
  features: [
    { title: string; description: string },
    { title: string; description: string },
    { title: string; description: string },
    { title: string; description: string },
    { title: string; description: string },
    { title: string; description: string },
  ];
  calcKicker: string;
  calcTitlePrefix: string;
  calcTitleAccent: string;
  stepsKicker: string;
  stepsTitlePrefix: string;
  stepsTitleAccent: string;
  steps: [
    { title: string; description: string },
    { title: string; description: string },
    { title: string; description: string },
  ];
  ctaBadge: string;
  ctaTitlePrefix: string;
  ctaTitleAccent: string;
  ctaSubhead: string;
  ctaPrimary: string;
  ctaSecondary: string;
  ctaFootnote: string;
}

const homeEnglish: HomeCopy = {
  liveBadge: 'No bank needed · Built on Base',
  heroPrefix: 'Accept payments.',
  heroAccent: 'Keep 100%.',
  heroDescription: 'VFIDE is an app for getting paid and sending money — no bank, no middleman taking a cut. Share one link and anyone can pay you. Sellers keep everything, and your fees get smaller the more people trust you.',
  trustPoints: [
    'Your money stays yours — we can never touch it',
    'No bank account, no paperwork, no approval',
    'Lose your phone? Trusted friends help you back in',
    'Fees shrink as you build a good track record',
  ],
  primaryCta: 'Start selling',
  secondaryCta: 'Browse marketplace',
  sliderHint: 'This is your trust score. Drag it — watch your fee shrink as trust grows.',
  statsKicker: 'Protocol stats',
  statsTitlePrefix: 'Numbers that',
  statsTitleAccent: 'matter',
  merchantFeesLabel: 'Merchant Fees',
  maxProofScoreLabel: 'Max ProofScore',
  burnRateLabel: 'Burn Rate',
  sanctumFundLabel: 'Sanctum Fund',
  whatKicker: 'In plain terms',
  whatTitlePrefix: 'A payments app you',
  whatTitleAccent: 'actually own',
  whatItems: [
    { label: 'What it is', body: 'Open a free wallet on your phone and you can get paid, send money, and sell — no bank account, no approval, nobody to ask permission.' },
    { label: 'What it costs', body: 'Sellers pay nothing. Buyers pay a small fee that starts low and keeps dropping as you build a trusted track record.' },
    { label: 'Why it\'s different', body: 'Your money is never held by us or anyone else. No freezes, no blocked accounts — you stay in control, not a bank and not us.' },
  ],
  featuresKicker: 'What you get',
  featuresTitlePrefix: 'Everything you need.',
  featuresTitleAccent: 'Nothing you don\'t.',
  featuresSubhead: 'Three things working together: a wallet only you control, a reputation that earns you lower fees the more you trade, and zero fees for sellers.',
  features: [
    { title: 'Guardian-Protected Vaults', description: 'You hold the keys. Guardians help rotate wallet access, protect queued transfers, and support recovery flows — non-custodial by design.' },
    { title: 'Zero Merchant Fees', description: 'Sellers keep 100%. Buyers pay a trust fee that drops as ProofScore grows — the network rewards honesty with cheaper transactions.' },
    { title: 'Social Commerce', description: 'Buy, sell, share, endorse. Every transaction builds trust on-chain and grows your reputation across the ecosystem.' },
    { title: 'Instant Merchant Portal', description: 'Launch your store in 60 seconds. One link, any stablecoin, any device — no bank account, no approval, no gatekeeping.' },
    { title: 'ProofScore Reputation', description: 'On-chain reputation that compounds over time. Build trust across payments, commerce, and social — your score earns you lower fees.' },
    { title: 'DAO Governance', description: 'Vote on protocol parameters, elect council members, and help steer where the protocol goes — governance that\'s actually on-chain.' },
  ],
  calcKicker: 'Savings calculator',
  calcTitlePrefix: 'See how much you',
  calcTitleAccent: 'save',
  stepsKicker: 'Quick start',
  stepsTitlePrefix: 'Get started in',
  stepsTitleAccent: '60 seconds',
  steps: [
    { title: 'Create your account', description: 'Connect your wallet — that\'s it. No email, no KYC for basic use, no approval wait.' },
    { title: 'Set up your store', description: 'Name, category, add one product. One shareable payment link. You are live.' },
    { title: 'Share your link', description: 'Send via WhatsApp, Instagram, Discord, anywhere. Customers pay with any stablecoin.' },
  ],
  ctaBadge: 'Zero fees. Open source. Self-custody.',
  ctaTitlePrefix: 'Ready to own your',
  ctaTitleAccent: 'payments?',
  ctaSubhead: 'Set up your store in about a minute and start accepting payments — no bank, no gatekeeper. Your ProofScore begins with your first transaction.',
  ctaPrimary: 'Launch your store',
  ctaSecondary: 'View dashboard',
  ctaFootnote: 'No credit card. No bank account. Just your wallet.',
};

export const HOME_TRANSLATIONS: TranslationMap<HomeCopy> = {
  'en-US': homeEnglish,
  'en-GB': homeEnglish,
  'es-ES': {
    liveBadge: 'Pagos sin custodia · Construido en Base',
    heroPrefix: 'Acepta pagos.',
    heroAccent: 'Quédate con el 100%.',
    heroDescription: 'VFIDE es una app de pagos que tú controlas por completo. Acepta cualquier stablecoin con un solo enlace: sin banco, sin trabas de registro y sin comisiones de protocolo. Cuanto más transaccionas con honestidad, más bajan tus comisiones.',
    trustPoints: [
      'Sin custodia: tus llaves, tus fondos',
      'Contratos de código abierto en Base',
      'Recuperación multi-sig con guardians',
      'Rastreo on-chain para cada transacción',
    ],
    primaryCta: 'Empezar a vender',
    secondaryCta: 'Explorar marketplace',
    sliderHint: 'Mueve tu trust score y observa cómo cae la comisión en tiempo real.',
    statsKicker: 'Estadísticas del protocolo',
    statsTitlePrefix: 'Números que',
    statsTitleAccent: 'importan',
    merchantFeesLabel: 'Comisiones de comerciantes',
    maxProofScoreLabel: 'ProofScore máximo',
    burnRateLabel: 'Tasa de quema',
    sanctumFundLabel: 'Fondo Sanctum',
    whatKicker: 'En pocas palabras',
    whatTitlePrefix: 'Una app de pagos que',
    whatTitleAccent: 'es tuya de verdad',
    whatItems: [
      { label: 'Qué es', body: 'Conecta una wallet y podrás cobrar, enviar dinero y vender: sin cuenta bancaria, sin aprobaciones, sin intermediarios.' },
      { label: 'Cuánto cuesta', body: 'Los vendedores no pagan nada. Los compradores pagan una pequeña comisión de confianza que empieza baja y cae hacia cero a medida que crece tu reputación on-chain.' },
      { label: 'Por qué es diferente', body: 'Tu dinero nunca lo custodiamos nosotros ni nadie. Sin congelaciones, sin listas negras: la protección viene del código abierto, no de una empresa.' },
    ],
    featuresKicker: 'Lo que obtienes',
    featuresTitlePrefix: 'Todo lo que necesitas.',
    featuresTitleAccent: 'Nada que no necesites.',
    featuresSubhead: 'Tres cosas que funcionan juntas: una wallet que solo tú controlas, una reputación que te da comisiones más bajas cuanto más operas, y cero comisiones para vendedores.',
    features: [
      { title: 'Bóvedas protegidas por guardians', description: 'Tú tienes las llaves. Los guardians ayudan a rotar el acceso a la wallet, protegen las transferencias en cola y apoyan la recuperación — sin custodia por diseño.' },
      { title: 'Cero comisiones para comerciantes', description: 'Los vendedores se quedan con el 100%. Los compradores pagan una comisión de confianza que baja a medida que crece el ProofScore — la red premia la honestidad con transacciones más baratas.' },
      { title: 'Comercio social', description: 'Compra, vende, comparte, recomienda. Cada transacción construye confianza on-chain y hace crecer tu reputación en todo el ecosistema.' },
      { title: 'Portal de comerciante instantáneo', description: 'Lanza tu tienda en 60 segundos. Un enlace, cualquier stablecoin, cualquier dispositivo — sin cuenta bancaria, sin aprobación, sin trabas.' },
      { title: 'Reputación ProofScore', description: 'Reputación on-chain que se acumula con el tiempo. Genera confianza en pagos, comercio y social — tu puntuación te consigue comisiones más bajas.' },
      { title: 'Gobernanza DAO', description: 'Vota los parámetros del protocolo, elige a los miembros del consejo y ayuda a dirigir hacia dónde va el protocolo — gobernanza realmente on-chain.' },
    ],
    calcKicker: 'Calculadora de ahorro',
    calcTitlePrefix: 'Mira cuánto',
    calcTitleAccent: 'ahorras',
    stepsKicker: 'Inicio rápido',
    stepsTitlePrefix: 'Empieza en',
    stepsTitleAccent: '60 segundos',
    steps: [
      { title: 'Crea tu cuenta', description: 'Conecta tu wallet — eso es todo. Sin correo, sin KYC para uso básico, sin esperas de aprobación.' },
      { title: 'Configura tu tienda', description: 'Nombre, categoría, añade un producto. Un enlace de pago para compartir. Ya estás en marcha.' },
      { title: 'Comparte tu enlace', description: 'Envíalo por WhatsApp, Instagram, Discord, donde sea. Los clientes pagan con cualquier stablecoin.' },
    ],
    ctaBadge: 'Cero comisiones. Código abierto. Autocustodia.',
    ctaTitlePrefix: '¿Listo para controlar tus',
    ctaTitleAccent: 'pagos?',
    ctaSubhead: 'Configura tu tienda en aproximadamente un minuto y empieza a aceptar pagos — sin banco, sin intermediarios. Tu ProofScore empieza con tu primera transacción.',
    ctaPrimary: 'Lanza tu tienda',
    ctaSecondary: 'Ver panel',
    ctaFootnote: 'Sin tarjeta de crédito. Sin cuenta bancaria. Solo tu wallet.',
  },
  'fr-FR': {
    liveBadge: 'Paiements non custodial · Construit sur Base',
    heroPrefix: 'Acceptez des paiements.',
    heroAccent: 'Gardez 100%.',
    heroDescription: 'VFIDE est une application de paiement que vous contrôlez entièrement. Acceptez n\'importe quel stablecoin avec un seul lien — sans banque, sans inscription verrouillée, sans frais de protocole. Plus vous transigez honnêtement, plus vos frais baissent.',
    trustPoints: [
      'Non custodial : vos clés, vos fonds',
      'Contrats open source sur Base',
      'Récupération multi-signature avec guardians',
      'Traçabilité on-chain pour chaque transaction',
    ],
    primaryCta: 'Commencer à vendre',
    secondaryCta: 'Parcourir le marketplace',
    sliderHint: 'Ajustez votre trust score et regardez les frais chuter en temps réel.',
    statsKicker: 'Statistiques du protocole',
    statsTitlePrefix: 'Des chiffres qui',
    statsTitleAccent: 'comptent',
    merchantFeesLabel: 'Frais marchands',
    maxProofScoreLabel: 'ProofScore max',
    burnRateLabel: 'Taux de burn',
    sanctumFundLabel: 'Fonds Sanctum',
    whatKicker: 'En clair',
    whatTitlePrefix: 'Une app de paiement qui',
    whatTitleAccent: 'vous appartient vraiment',
    whatItems: [
      { label: 'Ce que c\'est', body: 'Connectez un wallet et vous pouvez être payé, envoyer de l\'argent et vendre — sans compte bancaire, sans approbation, sans intermédiaire.' },
      { label: 'Ce que ça coûte', body: 'Les vendeurs ne paient rien. Les acheteurs paient de petits frais de confiance qui démarrent bas et tendent vers zéro à mesure que votre réputation on-chain grandit.' },
      { label: 'Pourquoi c\'est différent', body: 'Votre argent n\'est jamais détenu par nous ni par personne. Pas de gel, pas de listes noires — la protection vient du code ouvert, pas d\'une entreprise.' },
    ],
    featuresKicker: 'Ce que vous obtenez',
    featuresTitlePrefix: 'Tout ce qu\'il vous faut.',
    featuresTitleAccent: 'Rien de superflu.',
    featuresSubhead: 'Trois éléments qui fonctionnent ensemble : un wallet que vous seul contrôlez, une réputation qui réduit vos frais à mesure que vous transigez, et zéro frais pour les vendeurs.',
    features: [
      { title: 'Coffres protégés par des guardians', description: 'Vous détenez les clés. Les guardians aident à faire tourner l\'accès au wallet, protègent les transferts en file et facilitent la récupération — non custodial par conception.' },
      { title: 'Zéro frais marchands', description: 'Les vendeurs gardent 100%. Les acheteurs paient des frais de confiance qui baissent à mesure que le ProofScore grandit — le réseau récompense l\'honnêteté par des transactions moins chères.' },
      { title: 'Commerce social', description: 'Achetez, vendez, partagez, recommandez. Chaque transaction bâtit la confiance on-chain et fait grandir votre réputation dans tout l\'écosystème.' },
      { title: 'Portail marchand instantané', description: 'Lancez votre boutique en 60 secondes. Un lien, n\'importe quel stablecoin, n\'importe quel appareil — sans compte bancaire, sans approbation, sans blocage.' },
      { title: 'Réputation ProofScore', description: 'Une réputation on-chain qui se cumule avec le temps. Bâtissez la confiance sur les paiements, le commerce et le social — votre score vous obtient des frais plus bas.' },
      { title: 'Gouvernance DAO', description: 'Votez les paramètres du protocole, élisez les membres du conseil et aidez à orienter le protocole — une gouvernance vraiment on-chain.' },
    ],
    calcKicker: 'Calculateur d\'économies',
    calcTitlePrefix: 'Voyez combien vous',
    calcTitleAccent: 'économisez',
    stepsKicker: 'Démarrage rapide',
    stepsTitlePrefix: 'Commencez en',
    stepsTitleAccent: '60 secondes',
    steps: [
      { title: 'Créez votre compte', description: 'Connectez votre wallet — c\'est tout. Pas d\'e-mail, pas de KYC pour l\'usage de base, pas d\'attente d\'approbation.' },
      { title: 'Configurez votre boutique', description: 'Nom, catégorie, ajoutez un produit. Un lien de paiement à partager. Vous êtes en ligne.' },
      { title: 'Partagez votre lien', description: 'Envoyez-le via WhatsApp, Instagram, Discord, partout. Les clients paient avec n\'importe quel stablecoin.' },
    ],
    ctaBadge: 'Zéro frais. Open source. Auto-conservation.',
    ctaTitlePrefix: 'Prêt à contrôler vos',
    ctaTitleAccent: 'paiements ?',
    ctaSubhead: 'Configurez votre boutique en une minute environ et commencez à accepter des paiements — sans banque, sans intermédiaire. Votre ProofScore commence avec votre première transaction.',
    ctaPrimary: 'Lancez votre boutique',
    ctaSecondary: 'Voir le tableau de bord',
    ctaFootnote: 'Pas de carte bancaire. Pas de compte en banque. Juste votre wallet.',
  },
  'de-DE': {
    liveBadge: 'Non-custodial Zahlungen · Auf Base gebaut',
    heroPrefix: 'Zahlungen annehmen.',
    heroAccent: '100% behalten.',
    heroDescription: 'VFIDE ist eine Zahlungs-App, die du vollständig kontrollierst. Akzeptiere jeden Stablecoin mit einem einzigen Link — ohne Bank, ohne Anmelde-Hürden, ohne Protokollgebühren. Je ehrlicher du handelst, desto niedriger werden deine Gebühren.',
    trustPoints: [
      'Non-custodial: deine Keys, deine Coins',
      'Open-Source-Verträge auf Base',
      'Guardian Multi-Sig Recovery',
      'On-Chain-Audit-Track für jede Transaktion',
    ],
    primaryCta: 'Verkauf starten',
    secondaryCta: 'Marketplace öffnen',
    sliderHint: 'Bewege deinen Trust Score und sieh, wie die Gebühr in Echtzeit fällt.',
    statsKicker: 'Protokoll-Statistiken',
    statsTitlePrefix: 'Zahlen, die',
    statsTitleAccent: 'zählen',
    merchantFeesLabel: 'Händlergebühren',
    maxProofScoreLabel: 'Max ProofScore',
    burnRateLabel: 'Burn Rate',
    sanctumFundLabel: 'Sanctum-Fonds',
    whatKicker: 'Kurz gesagt',
    whatTitlePrefix: 'Eine Zahlungs-App, die',
    whatTitleAccent: 'wirklich dir gehört',
    whatItems: [
      { label: 'Was es ist', body: 'Verbinde ein Wallet und du kannst Geld empfangen, senden und verkaufen — ohne Bankkonto, ohne Freigabe, ohne Gatekeeper.' },
      { label: 'Was es kostet', body: 'Verkäufer zahlen nichts. Käufer zahlen eine kleine Vertrauensgebühr, die niedrig startet und gegen null sinkt, während deine On-Chain-Reputation wächst.' },
      { label: 'Warum es anders ist', body: 'Dein Geld wird nie von uns oder anderen verwahrt. Keine Sperren, keine Blacklists — Schutz kommt aus offenem Code, nicht von einer Firma.' },
    ],
    featuresKicker: 'Was du bekommst',
    featuresTitlePrefix: 'Alles, was du brauchst.',
    featuresTitleAccent: 'Nichts, was du nicht brauchst.',
    featuresSubhead: 'Drei Dinge, die zusammenarbeiten: ein Wallet, das nur du kontrollierst, eine Reputation, die deine Gebühren senkt, je mehr du handelst, und null Gebühren für Verkäufer.',
    features: [
      { title: 'Guardian-geschützte Tresore', description: 'Du hältst die Schlüssel. Guardians helfen, den Wallet-Zugang zu rotieren, schützen anstehende Transfers und unterstützen die Wiederherstellung — non-custodial by design.' },
      { title: 'Null Händlergebühren', description: 'Verkäufer behalten 100%. Käufer zahlen eine Vertrauensgebühr, die sinkt, während der ProofScore wächst — das Netzwerk belohnt Ehrlichkeit mit günstigeren Transaktionen.' },
      { title: 'Social Commerce', description: 'Kaufen, verkaufen, teilen, empfehlen. Jede Transaktion baut On-Chain-Vertrauen auf und lässt deine Reputation im ganzen Ökosystem wachsen.' },
      { title: 'Sofortiges Händlerportal', description: 'Starte deinen Shop in 60 Sekunden. Ein Link, jeder Stablecoin, jedes Gerät — ohne Bankkonto, ohne Freigabe, ohne Hürden.' },
      { title: 'ProofScore-Reputation', description: 'On-Chain-Reputation, die sich über die Zeit summiert. Baue Vertrauen über Zahlungen, Handel und Social auf — dein Score verschafft dir niedrigere Gebühren.' },
      { title: 'DAO-Governance', description: 'Stimme über Protokollparameter ab, wähle Ratsmitglieder und hilf mit, die Richtung des Protokolls zu steuern — Governance, die wirklich on-chain ist.' },
    ],
    calcKicker: 'Spar-Rechner',
    calcTitlePrefix: 'Sieh, wie viel du',
    calcTitleAccent: 'sparst',
    stepsKicker: 'Schnellstart',
    stepsTitlePrefix: 'Leg los in',
    stepsTitleAccent: '60 Sekunden',
    steps: [
      { title: 'Konto erstellen', description: 'Verbinde dein Wallet — das war\'s. Keine E-Mail, kein KYC für die Basisnutzung, kein Warten auf Freigabe.' },
      { title: 'Shop einrichten', description: 'Name, Kategorie, ein Produkt hinzufügen. Ein teilbarer Zahlungslink. Du bist live.' },
      { title: 'Link teilen', description: 'Per WhatsApp, Instagram, Discord, überall senden. Kunden zahlen mit jedem Stablecoin.' },
    ],
    ctaBadge: 'Null Gebühren. Open Source. Selbstverwahrung.',
    ctaTitlePrefix: 'Bereit, deine',
    ctaTitleAccent: 'Zahlungen zu besitzen?',
    ctaSubhead: 'Richte deinen Shop in etwa einer Minute ein und beginne, Zahlungen anzunehmen — ohne Bank, ohne Gatekeeper. Dein ProofScore beginnt mit deiner ersten Transaktion.',
    ctaPrimary: 'Shop starten',
    ctaSecondary: 'Dashboard ansehen',
    ctaFootnote: 'Keine Kreditkarte. Kein Bankkonto. Nur dein Wallet.',
  },
  'ar-SA': {
    liveBadge: 'مدفوعات بدون وصاية · مبنية على Base',
    heroPrefix: 'استقبل المدفوعات.',
    heroAccent: 'احتفظ بـ 100%.',
    heroDescription: 'فيفيدي تطبيق مدفوعات تتحكم فيه بالكامل. استقبل أي عملة مستقرة برابط واحد — دون بنك، ودون قيود تسجيل، ودون رسوم بروتوكول. كلما تعاملت بنزاهة أكثر، انخفضت رسومك أكثر.',
    trustPoints: [
      'بدون وصاية: مفاتيحك، أموالك',
      'عقود مفتوحة المصدر على Base',
      'استرداد متعدد التواقيع عبر الأوصياء',
      'سجل تدقيق على السلسلة لكل معاملة',
    ],
    primaryCta: 'ابدأ البيع',
    secondaryCta: 'تصفح السوق',
    sliderHint: 'حرّك درجة الثقة وشاهد الرسوم تنخفض في الوقت الفعلي.',
    statsKicker: 'إحصاءات البروتوكول',
    statsTitlePrefix: 'أرقام',
    statsTitleAccent: 'تهمّ',
    merchantFeesLabel: 'رسوم التجار',
    maxProofScoreLabel: 'أقصى درجة إثبات',
    burnRateLabel: 'معدل الحرق',
    sanctumFundLabel: 'صندوق Sanctum',
    whatKicker: 'باختصار',
    whatTitlePrefix: 'تطبيق مدفوعات',
    whatTitleAccent: 'تملكه فعلاً',
    whatItems: [
      { label: 'ما هو', body: 'اربط محفظتك لتتلقّى المال وترسله وتبيع — دون حساب بنكي، ودون موافقات، ودون وسيط.' },
      { label: 'كم يكلّف', body: 'البائعون لا يدفعون شيئاً. يدفع المشترون رسوم ثقة صغيرة تبدأ منخفضة وتقترب من الصفر مع نمو سمعتك على السلسلة.' },
      { label: 'لماذا هو مختلف', body: 'أموالك لا نحتفظ بها نحن ولا أي طرف آخر. لا تجميد ولا قوائم سوداء — الحماية تأتي من الشيفرة المفتوحة، لا من شركة.' },
    ],
    featuresKicker: 'ما الذي تحصل عليه',
    featuresTitlePrefix: 'كل ما تحتاجه.',
    featuresTitleAccent: 'لا شيء زائد.',
    featuresSubhead: 'ثلاثة أشياء تعمل معًا: محفظة تتحكم بها وحدك، وسمعة تخفّض رسومك كلما تعاملت أكثر، ورسوم صفرية للبائعين.',
    features: [
      { title: 'خزائن يحميها الأوصياء', description: 'أنت تملك المفاتيح. يساعد الأوصياء في تدوير الوصول إلى المحفظة، ويحمون التحويلات في قائمة الانتظار، ويدعمون الاسترداد — بدون وصاية بحكم التصميم.' },
      { title: 'رسوم صفرية للتجار', description: 'يحتفظ البائعون بنسبة 100%. يدفع المشترون رسوم ثقة تنخفض كلما نمت درجة الإثبات — تكافئ الشبكة النزاهة بمعاملات أرخص.' },
      { title: 'تجارة اجتماعية', description: 'اشترِ وبِع وشارك وأوصِ. كل معاملة تبني الثقة على السلسلة وتنمّي سمعتك في المنظومة كلها.' },
      { title: 'بوابة تاجر فورية', description: 'أطلق متجرك في 60 ثانية. رابط واحد، أي عملة مستقرة، أي جهاز — دون حساب بنكي، دون موافقة، دون قيود.' },
      { title: 'سمعة درجة الإثبات', description: 'سمعة على السلسلة تتراكم مع الوقت. ابنِ الثقة عبر المدفوعات والتجارة والتفاعل الاجتماعي — درجتك تمنحك رسومًا أقل.' },
      { title: 'حوكمة DAO', description: 'صوّت على معايير البروتوكول، وانتخب أعضاء المجلس، وساعد في توجيه مسار البروتوكول — حوكمة على السلسلة فعلًا.' },
    ],
    calcKicker: 'حاسبة التوفير',
    calcTitlePrefix: 'شاهد كم',
    calcTitleAccent: 'توفّر',
    stepsKicker: 'بداية سريعة',
    stepsTitlePrefix: 'ابدأ خلال',
    stepsTitleAccent: '60 ثانية',
    steps: [
      { title: 'أنشئ حسابك', description: 'اربط محفظتك — هذا كل شيء. دون بريد إلكتروني، دون تحقق من الهوية للاستخدام الأساسي، دون انتظار موافقة.' },
      { title: 'أعدّ متجرك', description: 'اسم، فئة، أضف منتجًا واحدًا. رابط دفع واحد قابل للمشاركة. أنت جاهز.' },
      { title: 'شارك رابطك', description: 'أرسله عبر واتساب أو إنستغرام أو ديسكورد، في أي مكان. يدفع العملاء بأي عملة مستقرة.' },
    ],
    ctaBadge: 'رسوم صفرية. مفتوح المصدر. حفظ ذاتي.',
    ctaTitlePrefix: 'هل أنت مستعد لامتلاك',
    ctaTitleAccent: 'مدفوعاتك؟',
    ctaSubhead: 'أعدّ متجرك في دقيقة تقريبًا وابدأ بقبول المدفوعات — دون بنك، دون وسيط. تبدأ درجة الإثبات الخاصة بك مع أول معاملة لك.',
    ctaPrimary: 'أطلق متجرك',
    ctaSecondary: 'عرض اللوحة',
    ctaFootnote: 'دون بطاقة ائتمان. دون حساب بنكي. فقط محفظتك.',
  },
  'hi-IN': {
    liveBadge: 'बिना कस्टडी वाले भुगतान · Base पर निर्मित',
    heroPrefix: 'भुगतान स्वीकारें.',
    heroAccent: '100% अपने पास रखें.',
    heroDescription: 'VFIDE एक भुगतान ऐप है जिसे आप पूरी तरह नियंत्रित करते हैं। किसी भी स्टेबलकॉइन को एक ही लिंक से स्वीकारें — बिना बैंक, बिना साइनअप रुकावट, बिना प्रोटोकॉल फीस। आप जितना ईमानदारी से लेन-देन करेंगे, आपकी फीस उतनी ही कम होती जाएगी।',
    trustPoints: [
      'नॉन-कस्टोडियल: आपकी चाबियाँ, आपके सिक्के',
      'Base पर ओपन-सोर्स कॉन्ट्रैक्ट',
      'गार्डियन मल्टी-सिग रिकवरी',
      'हर लेनदेन के लिए ऑन-चेन ऑडिट ट्रेल',
    ],
    primaryCta: 'बेचना शुरू करें',
    secondaryCta: 'मार्केटप्लेस देखें',
    sliderHint: 'अपना ट्रस्ट स्कोर खिसकाएँ और फीस को रियल-टाइम में गिरते देखें।',
    statsKicker: 'प्रोटोकॉल आँकड़े',
    statsTitlePrefix: 'वे संख्याएँ जो',
    statsTitleAccent: 'मायने रखती हैं',
    merchantFeesLabel: 'व्यापारी शुल्क',
    maxProofScoreLabel: 'अधिकतम ProofScore',
    burnRateLabel: 'बर्न दर',
    sanctumFundLabel: 'Sanctum फंड',
    whatKicker: 'सरल शब्दों में',
    whatTitlePrefix: 'एक भुगतान ऐप जो',
    whatTitleAccent: 'सच में आपकी है',
    whatItems: [
      { label: 'यह क्या है', body: 'वॉलेट कनेक्ट करें और आप भुगतान पा सकते हैं, पैसे भेज सकते हैं और बेच सकते हैं — बिना बैंक खाता, बिना अनुमति, बिना बिचौलिया।' },
      { label: 'इसकी लागत', body: 'विक्रेता कुछ नहीं देते। खरीदार एक छोटा ट्रस्ट शुल्क देते हैं जो कम से शुरू होता है और आपकी ऑन-चेन प्रतिष्ठा बढ़ने पर शून्य की ओर गिरता है।' },
      { label: 'यह अलग क्यों है', body: 'आपका पैसा कभी हमारे या किसी और के पास नहीं रहता। कोई फ्रीज़ नहीं, कोई ब्लैकलिस्ट नहीं — सुरक्षा खुले कोड से आती है, किसी कंपनी से नहीं।' },
    ],
    featuresKicker: 'आपको क्या मिलता है',
    featuresTitlePrefix: 'वह सब जो आपको चाहिए।',
    featuresTitleAccent: 'जो नहीं चाहिए, वह कुछ नहीं।',
    featuresSubhead: 'तीन चीज़ें जो साथ काम करती हैं: एक वॉलेट जिसे केवल आप नियंत्रित करते हैं, एक प्रतिष्ठा जो आपके ज़्यादा लेन-देन करने पर फ़ीस घटाती है, और विक्रेताओं के लिए शून्य फ़ीस।',
    features: [
      { title: 'गार्डियन-सुरक्षित वॉल्ट', description: 'चाबियाँ आपके पास हैं। गार्डियन वॉलेट एक्सेस घुमाने, कतार में लगे ट्रांसफ़र की रक्षा करने और रिकवरी में मदद करते हैं — डिज़ाइन से ही बिना कस्टडी।' },
      { title: 'शून्य मर्चेंट फ़ीस', description: 'विक्रेता 100% रखते हैं। खरीदार एक ट्रस्ट फ़ीस देते हैं जो ProofScore बढ़ने पर घटती है — नेटवर्क ईमानदारी को सस्ते लेन-देन से पुरस्कृत करता है।' },
      { title: 'सोशल कॉमर्स', description: 'खरीदें, बेचें, साझा करें, अनुशंसा करें। हर लेन-देन ऑन-चेन भरोसा बनाता है और पूरे इकोसिस्टम में आपकी प्रतिष्ठा बढ़ाता है।' },
      { title: 'तुरंत मर्चेंट पोर्टल', description: 'अपनी दुकान 60 सेकंड में शुरू करें। एक लिंक, कोई भी स्टेबलकॉइन, कोई भी डिवाइस — बिना बैंक खाता, बिना अनुमति, बिना रुकावट।' },
      { title: 'ProofScore प्रतिष्ठा', description: 'ऑन-चेन प्रतिष्ठा जो समय के साथ बढ़ती है। भुगतान, वाणिज्य और सोशल में भरोसा बनाएँ — आपका स्कोर आपको कम फ़ीस दिलाता है।' },
      { title: 'DAO गवर्नेंस', description: 'प्रोटोकॉल पैरामीटर पर वोट दें, काउंसिल सदस्य चुनें, और प्रोटोकॉल की दिशा तय करने में मदद करें — सचमुच ऑन-चेन गवर्नेंस।' },
    ],
    calcKicker: 'बचत कैलकुलेटर',
    calcTitlePrefix: 'देखें आप कितना',
    calcTitleAccent: 'बचाते हैं',
    stepsKicker: 'त्वरित शुरुआत',
    stepsTitlePrefix: 'शुरू करें',
    stepsTitleAccent: '60 सेकंड में',
    steps: [
      { title: 'अपना खाता बनाएँ', description: 'अपना वॉलेट कनेक्ट करें — बस इतना ही। कोई ईमेल नहीं, बुनियादी उपयोग के लिए कोई KYC नहीं, कोई अनुमति का इंतज़ार नहीं।' },
      { title: 'अपनी दुकान सेट करें', description: 'नाम, श्रेणी, एक उत्पाद जोड़ें। एक साझा करने योग्य भुगतान लिंक। आप लाइव हैं।' },
      { title: 'अपना लिंक साझा करें', description: 'WhatsApp, Instagram, Discord, कहीं भी भेजें। ग्राहक किसी भी स्टेबलकॉइन से भुगतान करते हैं।' },
    ],
    ctaBadge: 'शून्य फ़ीस। ओपन सोर्स। सेल्फ़-कस्टडी।',
    ctaTitlePrefix: 'अपने भुगतान के मालिक बनने को',
    ctaTitleAccent: 'तैयार हैं?',
    ctaSubhead: 'अपनी दुकान लगभग एक मिनट में सेट करें और भुगतान स्वीकार करना शुरू करें — बिना बैंक, बिना बिचौलिया। आपका ProofScore आपके पहले लेन-देन से शुरू होता है।',
    ctaPrimary: 'अपनी दुकान शुरू करें',
    ctaSecondary: 'डैशबोर्ड देखें',
    ctaFootnote: 'कोई क्रेडिट कार्ड नहीं। कोई बैंक खाता नहीं। सिर्फ़ आपका वॉलेट।',
  },
  'sw-KE': {
    liveBadge: 'Malipo bila uangalizi · Imejengwa kwenye Base',
    heroPrefix: 'Pokea malipo.',
    heroAccent: 'Baki na 100%.',
    heroDescription: 'VFIDE ni programu ya malipo unayoidhibiti kikamilifu. Pokea stablecoin yoyote kwa kiungo kimoja — bila benki, bila vikwazo vya usajili, bila ada za protokoli. Kadiri unavyofanya miamala kwa uaminifu, ndivyo ada zako zinavyoshuka.',
    trustPoints: [
      'Bila uangalizi: funguo zako, sarafu zako',
      'Mikataba ya chanzo huria kwenye Base',
      'Urejeshaji wa sahihi nyingi kupitia walinzi',
      'Rekodi ya ukaguzi kwenye mnyororo kwa kila muamala',
    ],
    primaryCta: 'Anza kuuza',
    secondaryCta: 'Vinjari soko',
    sliderHint: 'Vuta alama yako ya kuaminika — tazama ada ikishuka papo hapo.',
    statsKicker: 'Takwimu za protokoli',
    statsTitlePrefix: 'Namba',
    statsTitleAccent: 'muhimu',
    merchantFeesLabel: 'Ada za wafanyabiashara',
    maxProofScoreLabel: 'ProofScore ya juu',
    burnRateLabel: 'Kiwango cha kuchoma',
    sanctumFundLabel: 'Mfuko wa Sanctum',
    whatKicker: 'Kwa lugha rahisi',
    whatTitlePrefix: 'Programu ya malipo',
    whatTitleAccent: 'ambayo ni yako kweli',
    whatItems: [
      { label: 'Ni nini', body: 'Unganisha pochi na unaweza kulipwa, kutuma pesa, na kuuza — bila akaunti ya benki, bila idhini, bila mlinzi wa lango.' },
      { label: 'Inagharimu nini', body: 'Wauzaji hawalipi chochote. Wanunuzi hulipa ada ndogo ya kuaminika inayoanza chini na kushuka kuelekea sifuri kadiri sifa yako kwenye mnyororo inavyokua.' },
      { label: 'Kwa nini ni tofauti', body: 'Pesa zako hazishikiliwi na sisi wala mtu mwingine yeyote. Hakuna kufungia, hakuna orodha za kuzuia — ulinzi unatoka kwa kanuni huria, si kampuni.' },
    ],
    featuresKicker: 'Unachopata',
    featuresTitlePrefix: 'Kila kitu unachohitaji.',
    featuresTitleAccent: 'Hakuna usichohitaji.',
    featuresSubhead: 'Vitu vitatu vinavyofanya kazi pamoja: pochi unayoidhibiti wewe pekee, sifa inayopunguza ada zako kadiri unavyofanya biashara zaidi, na ada sifuri kwa wauzaji.',
    features: [
      { title: 'Vyumba vya hazina vinavyolindwa na walinzi', description: 'Wewe unashikilia funguo. Walinzi husaidia kuzungusha ufikiaji wa pochi, kulinda uhamishaji ulio kwenye foleni, na kusaidia urejeshaji — bila uangalizi kwa muundo.' },
      { title: 'Ada sifuri kwa wafanyabiashara', description: 'Wauzaji hubaki na 100%. Wanunuzi hulipa ada ya kuaminika inayoshuka kadiri ProofScore inavyokua — mtandao hutuza uaminifu kwa miamala nafuu.' },
      { title: 'Biashara ya kijamii', description: 'Nunua, uza, shiriki, pendekeza. Kila muamala hujenga uaminifu kwenye mnyororo na kukuza sifa yako katika mfumo mzima.' },
      { title: 'Lango la mfanyabiashara la papo hapo', description: 'Anzisha duka lako kwa sekunde 60. Kiungo kimoja, stablecoin yoyote, kifaa chochote — bila akaunti ya benki, bila idhini, bila vizuizi.' },
      { title: 'Sifa ya ProofScore', description: 'Sifa kwenye mnyororo inayoongezeka kwa muda. Jenga uaminifu katika malipo, biashara na kijamii — alama yako hukupatia ada za chini.' },
      { title: 'Utawala wa DAO', description: 'Piga kura kuhusu vigezo vya protokoli, chagua wajumbe wa baraza, na saidia kuelekeza protokoli inakoenda — utawala ulio kwenye mnyororo kweli.' },
    ],
    calcKicker: 'Kikokotoo cha akiba',
    calcTitlePrefix: 'Ona kiasi gani',
    calcTitleAccent: 'unaokoa',
    stepsKicker: 'Anza haraka',
    stepsTitlePrefix: 'Anza kwa',
    stepsTitleAccent: 'sekunde 60',
    steps: [
      { title: 'Fungua akaunti yako', description: 'Unganisha pochi yako — ndivyo tu. Bila barua pepe, bila KYC kwa matumizi ya msingi, bila kusubiri idhini.' },
      { title: 'Sanidi duka lako', description: 'Jina, kategoria, ongeza bidhaa moja. Kiungo kimoja cha malipo cha kushiriki. Uko hewani.' },
      { title: 'Shiriki kiungo chako', description: 'Tuma kupitia WhatsApp, Instagram, Discord, popote. Wateja hulipa kwa stablecoin yoyote.' },
    ],
    ctaBadge: 'Ada sifuri. Chanzo huria. Uhifadhi binafsi.',
    ctaTitlePrefix: 'Uko tayari kumiliki',
    ctaTitleAccent: 'malipo yako?',
    ctaSubhead: 'Sanidi duka lako kwa takriban dakika moja na uanze kupokea malipo — bila benki, bila mlinzi wa lango. ProofScore yako huanza na muamala wako wa kwanza.',
    ctaPrimary: 'Anzisha duka lako',
    ctaSecondary: 'Ona dashibodi',
    ctaFootnote: 'Bila kadi ya mkopo. Bila akaunti ya benki. Pochi yako tu.',
  },
  'ha-NG': {
    liveBadge: 'Biyan kuɗi ba tare da riƙo ba · An gina akan Base',
    heroPrefix: 'Karɓi biyan kuɗi.',
    heroAccent: 'Ka riƙe 100%.',
    heroDescription: 'VFIDE manhaja ce ta biyan kuɗi da kake iko da ita gaba ɗaya. Karɓi kowane stablecoin da hanyar haɗi guda — babu banki, babu shingen rajista, babu kuɗin yarjejeniya. Yadda kake yin mu’amala da gaskiya, haka kuɗaɗenka ke ƙara raguwa.',
    trustPoints: [
      'Ba tare da riƙo ba: makullanka, kuɗinka',
      'Kwangiloli na buɗaɗɗen tushe akan Base',
      'Dawowa ta sa-hannu masu yawa ta masu kāre',
      'Bayanan duba kan sarkar don kowane mu’amala',
    ],
    primaryCta: 'Fara sayarwa',
    secondaryCta: 'Bincika kasuwa',
    sliderHint: 'Ja makin amincinka — ka ga kuɗaɗen suna sauka nan take.',
    statsKicker: 'Ƹididdigar yarjejeniya',
    statsTitlePrefix: 'Lambobi masu',
    statsTitleAccent: 'muhimmanci',
    merchantFeesLabel: 'Kuɗin ɗan kasuwa',
    maxProofScoreLabel: 'Mafi girman ProofScore',
    burnRateLabel: 'Yawan ƙonewa',
    sanctumFundLabel: 'Asusun Sanctum',
    whatKicker: 'A sauƙaƙe',
    whatTitlePrefix: 'Manhajar biyan kuɗi',
    whatTitleAccent: 'da gaske take naka',
    whatItems: [
      { label: 'Mene ne shi', body: 'Haɗa wallet kuma za ka iya karɓar kuɗi, aika kuɗi, da sayarwa — babu asusun banki, babu amincewa, babu mai tsaron ƙofa.' },
      { label: 'Nawa ne kuɗinsa', body: 'Masu sayarwa ba sa biyan komai. Masu saye suna biyan ƙaramin kuɗin aminci da ke farawa ƙasa kuma yana sauka zuwa sifili yayin da sunanka kan sarkar ke girma.' },
      { label: 'Me ya sa ya bambanta', body: 'Kuɗinka ba a taɓa riƙe shi da mu ko wani ba. Babu daskarewa, babu jerin haramtacce — kāriya tana zuwa daga buɗaɗɗen lambar, ba kamfani ba.' },
    ],
    featuresKicker: 'Abin da kake samu',
    featuresTitlePrefix: 'Duk abin da kake bukata.',
    featuresTitleAccent: 'Babu abin da ba ka bukata.',
    featuresSubhead: 'Abubuwa uku da ke aiki tare: wallet da kai kaɗai ke iko da shi, suna da ke rage kuɗaɗenka yayin da kake ƙara kasuwanci, da kuɗi sifili ga masu sayarwa.',
    features: [
      { title: 'Ma\'ajiyar da masu kāre ke karewa', description: 'Kai ke riƙe da makullai. Masu kāre suna taimakawa wajen juya damar wallet, kāre tura kuɗi a layi, da taimakon dawowa — ba tare da riƙo ba ta ƙira.' },
      { title: 'Kuɗi sifili ga ɗan kasuwa', description: 'Masu sayarwa suna riƙe da 100%. Masu saye suna biyan kuɗin aminci da ke raguwa yayin da ProofScore ke girma — cibiyar tana ba da lada ga gaskiya da mu\'amaloli masu rahusa.' },
      { title: 'Kasuwancin zamantakewa', description: 'Saya, sayar, raba, ba da shawara. Kowace mu\'amala tana gina aminci kan sarkar tana kuma haɓaka sunanka a cikin tsarin gaba ɗaya.' },
      { title: 'Ƙofar ɗan kasuwa nan take', description: 'Ƙaddamar da shagonka cikin daƙiƙa 60. Hanyar haɗi guda, kowane stablecoin, kowane na’ura — babu asusun banki, babu amincewa, babu shinge.' },
      { title: 'Sunan ProofScore', description: 'Suna kan sarkar da ke ƙaruwa cikin lokaci. Gina aminci a biyan kuɗi, kasuwanci da zamantakewa — makinka yana samar maka da ƙananan kuɗaɗe.' },
      { title: 'Mulkin DAO', description: 'Kaɗa ƙuri\'a kan sigogin yarjejeniya, zaɓi mambobin majalisa, kuma taimaka wajen jagorantar inda yarjejeniyar za ta nufa — mulki da gaske yake kan sarkar.' },
    ],
    calcKicker: 'Na’urar lissafin tanadi',
    calcTitlePrefix: 'Ka ga nawa kake',
    calcTitleAccent: 'tanadi',
    stepsKicker: 'Fara da sauri',
    stepsTitlePrefix: 'Fara cikin',
    stepsTitleAccent: 'daƙiƙa 60',
    steps: [
      { title: 'Ƙirƙiri asusunka', description: 'Haɗa wallet ɗinka — shi ke nan. Babu imel, babu KYC don amfani na asali, babu jiran amincewa.' },
      { title: 'Saita shagonka', description: 'Suna, rukuni, ƙara samfur ɗaya. Hanyar biyan kuɗi guda da za a iya rabawa. Kana kan layi.' },
      { title: 'Raba hanyar haɗinka', description: 'Aika ta WhatsApp, Instagram, Discord, ko\'ina. Abokan ciniki suna biya da kowane stablecoin.' },
    ],
    ctaBadge: 'Kuɗi sifili. Buɗaɗɗen tushe. Riƙe kai.',
    ctaTitlePrefix: 'Shin a shirye kake ka mallaki',
    ctaTitleAccent: 'biyan kuɗinka?',
    ctaSubhead: 'Saita shagonka cikin kusan minti ɗaya ka fara karɓar biyan kuɗi — babu banki, babu mai tsaron ƙofa. ProofScore ɗinka yana farawa da mu’amalarka ta farko.',
    ctaPrimary: 'Ƙaddamar da shagonka',
    ctaSecondary: 'Duba dashboard',
    ctaFootnote: 'Babu katin kuɗi. Babu asusun banki. Wallet ɗinka kawai.',
  },
  'pt-BR': {
    liveBadge: 'Pagamentos sem custódia · Construído na Base',
    heroPrefix: 'Receba pagamentos.',
    heroAccent: 'Fique com 100%.',
    heroDescription: 'VFIDE é um app de pagamentos que você controla por completo. Aceite qualquer stablecoin com um único link — sem banco, sem burocracia de cadastro, sem taxas de protocolo. Quanto mais você transaciona com honestidade, mais baixas ficam suas taxas.',
    trustPoints: [
      'Sem custódia: suas chaves, suas moedas',
      'Contratos de código aberto na Base',
      'Recuperação multi-assinatura com guardians',
      'Trilha de auditoria on-chain para cada transação',
    ],
    primaryCta: 'Começar a vender',
    secondaryCta: 'Explorar marketplace',
    sliderHint: 'Arraste sua pontuação de confiança — veja a taxa cair em tempo real.',
    statsKicker: 'Estatísticas do protocolo',
    statsTitlePrefix: 'Números que',
    statsTitleAccent: 'importam',
    merchantFeesLabel: 'Taxas de comerciantes',
    maxProofScoreLabel: 'ProofScore máximo',
    burnRateLabel: 'Taxa de queima',
    sanctumFundLabel: 'Fundo Sanctum',
    whatKicker: 'Em poucas palavras',
    whatTitlePrefix: 'Um app de pagamentos que',
    whatTitleAccent: 'é realmente seu',
    whatItems: [
      { label: 'O que é', body: 'Conecte uma carteira e você pode receber, enviar dinheiro e vender — sem conta bancária, sem aprovação, sem intermediário.' },
      { label: 'Quanto custa', body: 'Vendedores não pagam nada. Compradores pagam uma pequena taxa de confiança que começa baixa e cai para perto de zero à medida que sua reputação on-chain cresce.' },
      { label: 'Por que é diferente', body: 'Seu dinheiro nunca fica com a gente nem com ninguém. Sem congelamentos, sem listas negras — a proteção vem do código aberto, não de uma empresa.' },
    ],
    featuresKicker: 'O que você ganha',
    featuresTitlePrefix: 'Tudo o que você precisa.',
    featuresTitleAccent: 'Nada que você não precise.',
    featuresSubhead: 'Três coisas que funcionam juntas: uma carteira que só você controla, uma reputação que reduz suas taxas quanto mais você transaciona, e zero taxas para vendedores.',
    features: [
      { title: 'Cofres protegidos por guardians', description: 'Você tem as chaves. Os guardians ajudam a alternar o acesso à carteira, protegem transferências na fila e apoiam a recuperação — sem custódia por design.' },
      { title: 'Zero taxas para comerciantes', description: 'Vendedores ficam com 100%. Compradores pagam uma taxa de confiança que cai conforme o ProofScore cresce — a rede recompensa a honestidade com transações mais baratas.' },
      { title: 'Comércio social', description: 'Compre, venda, compartilhe, recomende. Cada transação constrói confiança on-chain e faz sua reputação crescer em todo o ecossistema.' },
      { title: 'Portal de comerciante instantâneo', description: 'Lance sua loja em 60 segundos. Um link, qualquer stablecoin, qualquer dispositivo — sem conta bancária, sem aprovação, sem barreiras.' },
      { title: 'Reputação ProofScore', description: 'Reputação on-chain que se acumula com o tempo. Construa confiança em pagamentos, comércio e social — sua pontuação garante taxas menores.' },
      { title: 'Governança DAO', description: 'Vote nos parâmetros do protocolo, eleja membros do conselho e ajude a direcionar para onde o protocolo vai — governança realmente on-chain.' },
    ],
    calcKicker: 'Calculadora de economia',
    calcTitlePrefix: 'Veja quanto você',
    calcTitleAccent: 'economiza',
    stepsKicker: 'Início rápido',
    stepsTitlePrefix: 'Comece em',
    stepsTitleAccent: '60 segundos',
    steps: [
      { title: 'Crie sua conta', description: 'Conecte sua carteira — é isso. Sem e-mail, sem KYC para uso básico, sem espera por aprovação.' },
      { title: 'Configure sua loja', description: 'Nome, categoria, adicione um produto. Um link de pagamento para compartilhar. Você está no ar.' },
      { title: 'Compartilhe seu link', description: 'Envie pelo WhatsApp, Instagram, Discord, onde quiser. Os clientes pagam com qualquer stablecoin.' },
    ],
    ctaBadge: 'Zero taxas. Código aberto. Autocustódia.',
    ctaTitlePrefix: 'Pronto para controlar seus',
    ctaTitleAccent: 'pagamentos?',
    ctaSubhead: 'Configure sua loja em cerca de um minuto e comece a aceitar pagamentos — sem banco, sem intermediário. Seu ProofScore começa com sua primeira transação.',
    ctaPrimary: 'Lance sua loja',
    ctaSecondary: 'Ver painel',
    ctaFootnote: 'Sem cartão de crédito. Sem conta bancária. Apenas sua carteira.',
  },
  'fil-PH': {
    liveBadge: 'Mga bayad na walang custodian · Binuo sa Base',
    heroPrefix: 'Tumanggap ng bayad.',
    heroAccent: 'Panatilihin ang 100%.',
    heroDescription: 'Ang VFIDE ay isang payments app na ganap mong kontrolado. Tumanggap ng anumang stablecoin gamit ang isang link — walang bangko, walang harang sa pag-signup, walang protocol fee. Habang mas tapat kang makipagtransaksyon, mas bumababa ang iyong mga bayarin.',
    trustPoints: [
      'Non-custodial: iyong mga susi, iyong pera',
      'Open-source na kontrata sa Base',
      'Guardian multi-sig recovery',
      'On-chain audit trail sa bawat transaksyon',
    ],
    primaryCta: 'Magsimulang magbenta',
    secondaryCta: 'Mag-browse ng marketplace',
    sliderHint: 'I-drag ang iyong trust score — panoorin ang bayad na bumaba sa real time.',
    statsKicker: 'Mga istatistika ng protocol',
    statsTitlePrefix: 'Mga numerong',
    statsTitleAccent: 'mahalaga',
    merchantFeesLabel: 'Bayarin ng Merchant',
    maxProofScoreLabel: 'Max ProofScore',
    burnRateLabel: 'Burn Rate',
    sanctumFundLabel: 'Sanctum Fund',
    whatKicker: 'Sa simpleng salita',
    whatTitlePrefix: 'Isang payments app na',
    whatTitleAccent: 'tunay mong pag-aari',
    whatItems: [
      { label: 'Ano ito', body: 'Ikonekta ang isang wallet at maaari ka nang mabayaran, magpadala ng pera, at magbenta — walang bank account, walang pag-apruba, walang tagapamagitan.' },
      { label: 'Magkano ang halaga', body: 'Walang bayad ang mga nagbebenta. Ang mga bumibili ay nagbabayad ng maliit na trust fee na nagsisimulang mababa at bumababa papalapit sa zero habang lumalago ang iyong on-chain reputation.' },
      { label: 'Bakit ito naiiba', body: 'Ang pera mo ay hindi kailanman hawak namin o ninuman. Walang pag-freeze, walang blacklist — ang proteksyon ay nagmumula sa open code, hindi sa isang kompanya.' },
    ],
    featuresKicker: 'Ang makukuha mo',
    featuresTitlePrefix: 'Lahat ng kailangan mo.',
    featuresTitleAccent: 'Walang sobra.',
    featuresSubhead: 'Tatlong bagay na magkakasama: isang wallet na ikaw lang ang may kontrol, reputasyon na nagpapababa ng iyong bayarin habang dumarami ang transaksyon mo, at zero bayarin para sa mga nagbebenta.',
    features: [
      { title: 'Mga vault na protektado ng guardian', description: 'Ikaw ang may hawak ng mga susi. Tinutulungan ng mga guardian na i-rotate ang access sa wallet, pinoprotektahan ang mga naka-queue na transfer, at sinusuportahan ang recovery — non-custodial talaga.' },
      { title: 'Zero merchant fees', description: 'Sa nagbebenta, 100% ang natatira. Ang mga bumibili ay nagbabayad ng trust fee na bumababa habang lumalaki ang ProofScore — ginagantimpalaan ng network ang katapatan ng mas murang transaksyon.' },
      { title: 'Social commerce', description: 'Bumili, magbenta, magbahagi, mag-endorso. Bawat transaksyon ay nagtatayo ng tiwala on-chain at nagpapalago ng iyong reputasyon sa buong ecosystem.' },
      { title: 'Instant merchant portal', description: 'Ilunsad ang iyong tindahan sa 60 segundo. Isang link, kahit anong stablecoin, kahit anong device — walang bank account, walang pag-apruba, walang harang.' },
      { title: 'ProofScore reputation', description: 'On-chain na reputasyong lumalago sa paglipas ng panahon. Magtayo ng tiwala sa mga bayad, kalakalan, at social — ang iyong score ang nagbibigay sa iyo ng mas mababang bayarin.' },
      { title: 'DAO governance', description: 'Bumoto sa mga parameter ng protocol, maghalal ng mga miyembro ng konseho, at tumulong na patnubayan kung saan papunta ang protocol — governance na talagang on-chain.' },
    ],
    calcKicker: 'Calculator ng tipid',
    calcTitlePrefix: 'Tingnan kung magkano ang',
    calcTitleAccent: 'natitipid mo',
    stepsKicker: 'Mabilis na simula',
    stepsTitlePrefix: 'Magsimula sa',
    stepsTitleAccent: '60 segundo',
    steps: [
      { title: 'Gumawa ng account', description: 'Ikonekta ang iyong wallet — ayun na. Walang email, walang KYC para sa basic na gamit, walang hintayan ng pag-apruba.' },
      { title: 'I-set up ang tindahan mo', description: 'Pangalan, kategorya, magdagdag ng isang produkto. Isang nasha-share na payment link. Live ka na.' },
      { title: 'I-share ang iyong link', description: 'Ipadala sa WhatsApp, Instagram, Discord, kahit saan. Nagbabayad ang mga customer gamit ang kahit anong stablecoin.' },
    ],
    ctaBadge: 'Zero fees. Open source. Self-custody.',
    ctaTitlePrefix: 'Handa nang ariin ang iyong mga',
    ctaTitleAccent: 'bayad?',
    ctaSubhead: 'I-set up ang iyong tindahan sa mga isang minuto at simulang tumanggap ng bayad — walang bangko, walang gatekeeper. Nagsisimula ang iyong ProofScore sa iyong unang transaksyon.',
    ctaPrimary: 'Ilunsad ang tindahan',
    ctaSecondary: 'Tingnan ang dashboard',
    ctaFootnote: 'Walang credit card. Walang bank account. Wallet mo lang.',
  },
  'id-ID': {
    liveBadge: 'Pembayaran non-kustodian · Dibangun di Base',
    heroPrefix: 'Terima pembayaran.',
    heroAccent: 'Simpan 100%.',
    heroDescription: 'VFIDE adalah aplikasi pembayaran yang sepenuhnya Anda kendalikan. Terima stablecoin apa pun dengan satu tautan — tanpa bank, tanpa hambatan pendaftaran, tanpa biaya protokol. Makin jujur Anda bertransaksi, makin rendah biaya Anda.',
    trustPoints: [
      'Non-kustodian: kunci Anda, koin Anda',
      'Kontrak sumber terbuka di Base',
      'Pemulihan multi-tanda tangan via guardian',
      'Jejak audit on-chain untuk setiap transaksi',
    ],
    primaryCta: 'Mulai berjualan',
    secondaryCta: 'Jelajahi marketplace',
    sliderHint: 'Geser skor kepercayaan Anda — lihat biaya turun secara real time.',
    statsKicker: 'Statistik protokol',
    statsTitlePrefix: 'Angka yang',
    statsTitleAccent: 'berarti',
    merchantFeesLabel: 'Biaya Pedagang',
    maxProofScoreLabel: 'ProofScore Maks',
    burnRateLabel: 'Laju Burn',
    sanctumFundLabel: 'Dana Sanctum',
    whatKicker: 'Singkatnya',
    whatTitlePrefix: 'Aplikasi pembayaran yang',
    whatTitleAccent: 'benar-benar milik Anda',
    whatItems: [
      { label: 'Apa ini', body: 'Hubungkan dompet dan Anda bisa menerima bayaran, mengirim uang, dan berjualan — tanpa rekening bank, tanpa persetujuan, tanpa perantara.' },
      { label: 'Berapa biayanya', body: 'Penjual tidak membayar apa pun. Pembeli membayar biaya kepercayaan kecil yang dimulai rendah dan turun menuju nol seiring tumbuhnya reputasi on-chain Anda.' },
      { label: 'Mengapa berbeda', body: 'Uang Anda tidak pernah dipegang oleh kami atau siapa pun. Tanpa pembekuan, tanpa daftar hitam — perlindungan berasal dari kode terbuka, bukan dari perusahaan.' },
    ],
    featuresKicker: 'Yang Anda dapatkan',
    featuresTitlePrefix: 'Semua yang Anda butuhkan.',
    featuresTitleAccent: 'Tanpa yang tidak perlu.',
    featuresSubhead: 'Tiga hal yang bekerja bersama: dompet yang hanya Anda kendalikan, reputasi yang menurunkan biaya Anda seiring makin banyak transaksi, dan nol biaya untuk penjual.',
    features: [
      { title: 'Brankas yang dilindungi guardian', description: 'Anda memegang kunci. Guardian membantu merotasi akses dompet, melindungi transfer yang mengantre, dan mendukung pemulihan — non-kustodian sejak awal.' },
      { title: 'Nol biaya pedagang', description: 'Penjual menyimpan 100%. Pembeli membayar biaya kepercayaan yang turun seiring ProofScore tumbuh — jaringan menghargai kejujuran dengan transaksi lebih murah.' },
      { title: 'Perdagangan sosial', description: 'Beli, jual, bagikan, rekomendasikan. Setiap transaksi membangun kepercayaan on-chain dan menumbuhkan reputasi Anda di seluruh ekosistem.' },
      { title: 'Portal pedagang instan', description: 'Luncurkan toko Anda dalam 60 detik. Satu tautan, stablecoin apa pun, perangkat apa pun — tanpa rekening bank, tanpa persetujuan, tanpa hambatan.' },
      { title: 'Reputasi ProofScore', description: 'Reputasi on-chain yang menumpuk seiring waktu. Bangun kepercayaan di pembayaran, perdagangan, dan sosial — skor Anda memberi Anda biaya lebih rendah.' },
      { title: 'Tata kelola DAO', description: 'Pilih parameter protokol, pilih anggota dewan, dan bantu mengarahkan ke mana protokol melangkah — tata kelola yang benar-benar on-chain.' },
    ],
    calcKicker: 'Kalkulator penghematan',
    calcTitlePrefix: 'Lihat berapa yang Anda',
    calcTitleAccent: 'hemat',
    stepsKicker: 'Mulai cepat',
    stepsTitlePrefix: 'Mulai dalam',
    stepsTitleAccent: '60 detik',
    steps: [
      { title: 'Buat akun Anda', description: 'Hubungkan dompet Anda — selesai. Tanpa email, tanpa KYC untuk penggunaan dasar, tanpa menunggu persetujuan.' },
      { title: 'Siapkan toko Anda', description: 'Nama, kategori, tambahkan satu produk. Satu tautan pembayaran yang bisa dibagikan. Anda sudah aktif.' },
      { title: 'Bagikan tautan Anda', description: 'Kirim lewat WhatsApp, Instagram, Discord, di mana saja. Pelanggan membayar dengan stablecoin apa pun.' },
    ],
    ctaBadge: 'Nol biaya. Sumber terbuka. Penyimpanan mandiri.',
    ctaTitlePrefix: 'Siap memiliki',
    ctaTitleAccent: 'pembayaran Anda?',
    ctaSubhead: 'Siapkan toko Anda dalam sekitar satu menit dan mulai menerima pembayaran — tanpa bank, tanpa perantara. ProofScore Anda dimulai dengan transaksi pertama Anda.',
    ctaPrimary: 'Luncurkan toko',
    ctaSecondary: 'Lihat dasbor',
    ctaFootnote: 'Tanpa kartu kredit. Tanpa rekening bank. Cukup dompet Anda.',
  },
  'th-TH': {
    liveBadge: 'การชำระเงินแบบไม่ฝากดูแล · สร้างบน Base',
    heroPrefix: 'รับการชำระเงิน',
    heroAccent: 'เก็บไว้ 100%',
    heroDescription: 'VFIDE คือแอปชำระเงินที่คุณควบคุมได้อย่างสมบูรณ์ รับ stablecoin ใดก็ได้ด้วยลิงก์เดียว — ไม่ต้องมีธนาคาร ไม่มีการกีดกันการสมัคร ไม่มีค่าธรรมเนียมโปรโตคอล ยิ่งคุณทำธุรกรรมอย่างซื่อสัตย์ ค่าธรรมเนียมของคุณก็ยิ่งลดลง',
    trustPoints: [
      'ไม่ฝากดูแล: กุญแจของคุณ เหรียญของคุณ',
      'สัญญาโอเพนซอร์สบน Base',
      'การกู้คืนแบบหลายลายเซ็นผ่านผู้พิทักษ์',
      'บันทึกตรวจสอบบนเชนสำหรับทุกธุรกรรม',
    ],
    primaryCta: 'เริ่มขาย',
    secondaryCta: 'เลือกดูมาร์เก็ตเพลส',
    sliderHint: 'ลากคะแนนความน่าเชื่อถือของคุณ — ดูค่าธรรมเนียมลดลงแบบเรียลไทม์',
    statsKicker: 'สถิติโปรโตคอล',
    statsTitlePrefix: 'ตัวเลขที่',
    statsTitleAccent: 'สำคัญ',
    merchantFeesLabel: 'ค่าธรรมเนียมร้านค้า',
    maxProofScoreLabel: 'ProofScore สูงสุด',
    burnRateLabel: 'อัตราการเผา',
    sanctumFundLabel: 'กองทุน Sanctum',
    whatKicker: 'พูดให้เข้าใจง่าย',
    whatTitlePrefix: 'แอปชำระเงินที่',
    whatTitleAccent: 'เป็นของคุณอย่างแท้จริง',
    whatItems: [
      { label: 'มันคืออะไร', body: 'เชื่อมต่อกระเป๋าเงินแล้วคุณก็รับเงิน ส่งเงิน และขายได้ — ไม่ต้องมีบัญชีธนาคาร ไม่ต้องขออนุมัติ ไม่มีคนกลาง' },
      { label: 'มีค่าใช้จ่ายเท่าไร', body: 'ผู้ขายไม่ต้องจ่ายอะไรเลย ผู้ซื้อจ่ายค่าธรรมเนียมความน่าเชื่อถือเล็กน้อยที่เริ่มต้นต่ำและลดลงเข้าใกล้ศูนย์เมื่อชื่อเสียงบนเชนของคุณเติบโต' },
      { label: 'ทำไมจึงต่างออกไป', body: 'เงินของคุณไม่เคยถูกถือโดยเราหรือใครก็ตาม ไม่มีการอายัด ไม่มีบัญชีดำ — การปกป้องมาจากโค้ดเปิด ไม่ใช่จากบริษัท' },
    ],
    featuresKicker: 'สิ่งที่คุณได้รับ',
    featuresTitlePrefix: 'ทุกอย่างที่คุณต้องการ',
    featuresTitleAccent: 'ไม่มีส่วนเกิน',
    featuresSubhead: 'สามสิ่งที่ทำงานร่วมกัน: กระเป๋าเงินที่คุณควบคุมเองคนเดียว ชื่อเสียงที่ทำให้ค่าธรรมเนียมของคุณลดลงเมื่อคุณทำธุรกรรมมากขึ้น และค่าธรรมเนียมศูนย์สำหรับผู้ขาย',
    features: [
      { title: 'ตู้นิรภัยที่ปกป้องโดยผู้พิทักษ์', description: 'คุณถือกุญแจเอง ผู้พิทักษ์ช่วยหมุนเวียนการเข้าถึงกระเป๋าเงิน ปกป้องการโอนที่อยู่ในคิว และช่วยการกู้คืน — ไม่ฝากดูแลโดยการออกแบบ' },
      { title: 'ค่าธรรมเนียมร้านค้าศูนย์', description: 'ผู้ขายเก็บไว้ 100% ผู้ซื้อจ่ายค่าธรรมเนียมความน่าเชื่อถือที่ลดลงเมื่อ ProofScore เติบโต — เครือข่ายตอบแทนความซื่อสัตย์ด้วยธุรกรรมที่ถูกลง' },
      { title: 'การค้าเชิงสังคม', description: 'ซื้อ ขาย แบ่งปัน แนะนำ ทุกธุรกรรมสร้างความน่าเชื่อถือบนเชนและเพิ่มชื่อเสียงของคุณทั่วทั้งระบบนิเวศ' },
      { title: 'พอร์ทัลร้านค้าทันที', description: 'เปิดร้านของคุณใน 60 วินาที ลิงก์เดียว stablecoin ใดก็ได้ อุปกรณ์ใดก็ได้ — ไม่ต้องมีบัญชีธนาคาร ไม่ต้องอนุมัติ ไม่มีการกีดกัน' },
      { title: 'ชื่อเสียง ProofScore', description: 'ชื่อเสียงบนเชนที่สะสมเมื่อเวลาผ่านไป สร้างความน่าเชื่อถือในการชำระเงิน การค้า และสังคม — คะแนนของคุณช่วยให้ค่าธรรมเนียมต่ำลง' },
      { title: 'การกำกับดูแล DAO', description: 'โหวตพารามิเตอร์โปรโตคอล เลือกสมาชิกสภา และช่วยกำหนดทิศทางของโปรโตคอล — การกำกับดูแลที่อยู่บนเชนจริง ๆ' },
    ],
    calcKicker: 'เครื่องคำนวณการประหยัด',
    calcTitlePrefix: 'ดูว่าคุณ',
    calcTitleAccent: 'ประหยัดได้เท่าไร',
    stepsKicker: 'เริ่มต้นอย่างรวดเร็ว',
    stepsTitlePrefix: 'เริ่มได้ใน',
    stepsTitleAccent: '60 วินาที',
    steps: [
      { title: 'สร้างบัญชีของคุณ', description: 'เชื่อมต่อกระเป๋าเงินของคุณ — แค่นั้น ไม่ต้องใช้อีเมล ไม่ต้องมี KYC สำหรับการใช้งานพื้นฐาน ไม่ต้องรออนุมัติ' },
      { title: 'ตั้งค่าร้านของคุณ', description: 'ชื่อ หมวดหมู่ เพิ่มสินค้าหนึ่งรายการ ลิงก์ชำระเงินที่แชร์ได้หนึ่งลิงก์ คุณพร้อมแล้ว' },
      { title: 'แชร์ลิงก์ของคุณ', description: 'ส่งผ่าน WhatsApp, Instagram, Discord, ที่ไหนก็ได้ ลูกค้าชำระด้วย stablecoin ใดก็ได้' },
    ],
    ctaBadge: 'ค่าธรรมเนียมศูนย์ โอเพนซอร์ส เก็บรักษาด้วยตนเอง',
    ctaTitlePrefix: 'พร้อมเป็นเจ้าของ',
    ctaTitleAccent: 'การชำระเงินของคุณหรือยัง?',
    ctaSubhead: 'ตั้งค่าร้านของคุณในเวลาประมาณหนึ่งนาทีและเริ่มรับชำระเงิน — ไม่ต้องมีธนาคาร ไม่มีคนกลาง ProofScore ของคุณเริ่มต้นด้วยธุรกรรมแรกของคุณ',
    ctaPrimary: 'เปิดร้านของคุณ',
    ctaSecondary: 'ดูแดชบอร์ด',
    ctaFootnote: 'ไม่ต้องใช้บัตรเครดิต ไม่ต้องมีบัญชีธนาคาร แค่กระเป๋าเงินของคุณ',
  },
  'ja-JP': {
    liveBadge: 'ノンカストディアル決済 · Base 上に構築',
    heroPrefix: '支払いを受け取る。',
    heroAccent: '100% 自分のもの。',
    heroDescription: 'VFIDE は、あなたが完全に管理できる決済アプリです。リンク 1 つでどんなステーブルコインも受け取れます — 銀行不要、登録の制限なし、プロトコル手数料ゼロ。誠実に取引するほど、手数料は下がっていきます。',
    trustPoints: [
      'ノンカストディアル：鍵もコインもあなたのもの',
      'Base 上のオープンソース契約',
      'ガーディアンによるマルチシグ復元',
      '全取引のオンチェーン監査証跡',
    ],
    primaryCta: '販売を始める',
    secondaryCta: 'マーケットプレイスを見る',
    sliderHint: '信用スコアをドラッグして、手数料がリアルタイムで下がる様子をご覧ください。',
    statsKicker: 'プロトコル統計',
    statsTitlePrefix: '意味のある',
    statsTitleAccent: '数字',
    merchantFeesLabel: '加盟店手数料',
    maxProofScoreLabel: '最大 ProofScore',
    burnRateLabel: 'バーンレート',
    sanctumFundLabel: 'Sanctum ファンド',
    whatKicker: '簡単に言うと',
    whatTitlePrefix: '本当に自分のものになる',
    whatTitleAccent: '決済アプリ',
    whatItems: [
      { label: 'これは何か', body: 'ウォレットを接続するだけで、支払いの受け取り、送金、販売ができます — 銀行口座も、承認も、仲介者も不要です。' },
      { label: '費用はいくらか', body: '売り手の負担はゼロ。買い手は少額の信用手数料を支払いますが、オンチェーンの評価が高まるにつれて手数料はゼロに近づきます。' },
      { label: 'なぜ違うのか', body: 'あなたの資金を当社や他の誰かが預かることは一切ありません。凍結もブラックリストもなし — 保護は会社ではなくオープンなコードから生まれます。' },
    ],
    featuresKicker: '得られるもの',
    featuresTitlePrefix: '必要なものすべて。',
    featuresTitleAccent: '余計なものはなし。',
    featuresSubhead: '3つが連携します。あなただけが管理するウォレット、取引するほど手数料が下がる評価、そして売り手の手数料はゼロ。',
    features: [
      { title: 'ガーディアンが守る保管庫', description: '鍵はあなたが保持します。ガーディアンはウォレットのアクセス権の更新を助け、キュー内の送金を保護し、復元をサポートします — 設計からノンカストディアル。' },
      { title: '加盟店手数料ゼロ', description: '売り手は100%受け取ります。買い手は信用手数料を支払いますが、ProofScoreが高まるほど下がります — ネットワークは誠実さをより安い取引で報います。' },
      { title: 'ソーシャルコマース', description: '買う、売る、共有する、推薦する。すべての取引がオンチェーンで信頼を築き、エコシステム全体であなたの評価を高めます。' },
      { title: '即時加盟店ポータル', description: '60秒でストアを開設。1つのリンク、どんなステーブルコインも、どんなデバイスでも — 銀行口座なし、承認なし、障壁なし。' },
      { title: 'ProofScore 評価', description: '時とともに積み上がるオンチェーン評価。支払い、商取引、ソーシャルで信頼を築けば — スコアが手数料を下げてくれます。' },
      { title: 'DAO ガバナンス', description: 'プロトコルのパラメータに投票し、評議員を選び、プロトコルの方向性を導きます — 本当にオンチェーンなガバナンス。' },
    ],
    calcKicker: '節約シミュレーター',
    calcTitlePrefix: 'どれだけ',
    calcTitleAccent: '節約できるか',
    stepsKicker: 'クイックスタート',
    stepsTitlePrefix: '始めるのは',
    stepsTitleAccent: '60秒',
    steps: [
      { title: 'アカウントを作成', description: 'ウォレットを接続するだけ。メール不要、基本利用にKYC不要、承認待ちもありません。' },
      { title: 'ストアを設定', description: '名前、カテゴリ、商品を1つ追加。共有できる支払いリンクが1つ。これで公開です。' },
      { title: 'リンクを共有', description: 'WhatsApp、Instagram、Discord、どこへでも送信。お客様はどんなステーブルコインでも支払えます。' },
    ],
    ctaBadge: '手数料ゼロ。オープンソース。セルフカストディ。',
    ctaTitlePrefix: 'あなたの決済を',
    ctaTitleAccent: '自分のものに?',
    ctaSubhead: '1分ほどでストアを設定し、支払いの受け取りを始めましょう — 銀行も仲介者も不要。ProofScoreは最初の取引から始まります。',
    ctaPrimary: 'ストアを開設',
    ctaSecondary: 'ダッシュボードを見る',
    ctaFootnote: 'クレジットカード不要。銀行口座不要。必要なのはウォレットだけ。',
  },
  'zh-CN': {
    liveBadge: '非托管支付 · 基于 Base 构建',
    heroPrefix: '收取付款。',
    heroAccent: '全额留存。',
    heroDescription: 'VFIDE 是一款完全由你掌控的支付应用。用一个链接即可收取任意稳定币——无需银行、没有注册门槛、零协议费用。你越是诚信交易，手续费就越低。',
    trustPoints: [
      '非托管：你的密钥，你的代币',
      'Base 上的开源合约',
      '守护者多签恢复',
      '每笔交易的链上审计记录',
    ],
    primaryCta: '开始销售',
    secondaryCta: '浏览市场',
    sliderHint: '拖动你的信任评分——实时观看手续费下降。',
    statsKicker: '协议统计',
    statsTitlePrefix: '重要的',
    statsTitleAccent: '数字',
    merchantFeesLabel: '商家手续费',
    maxProofScoreLabel: '最高 ProofScore',
    burnRateLabel: '销毁率',
    sanctumFundLabel: 'Sanctum 基金',
    whatKicker: '简单来说',
    whatTitlePrefix: '真正属于你的',
    whatTitleAccent: '支付应用',
    whatItems: [
      { label: '它是什么', body: '连接钱包，你就能收款、转账和销售——无需银行账户、无需审批、没有中间人。' },
      { label: '费用如何', body: '卖家无需付费。买家支付一笔很低的信任费，起步很低，并随着你的链上信誉增长而趋近于零。' },
      { label: '有何不同', body: '你的资金从不由我们或任何人保管。没有冻结，没有黑名单——保护来自开放的代码，而非某家公司。' },
    ],
    featuresKicker: '你获得什么',
    featuresTitlePrefix: '你需要的一切。',
    featuresTitleAccent: '没有多余。',
    featuresSubhead: '三者协同：只有你掌控的钱包、交易越多手续费越低的信誉，以及卖家零手续费。',
    features: [
      { title: '守护者保护的金库', description: '密钥由你持有。守护者帮助轮换钱包访问权限、保护排队中的转账并支持恢复——设计上即为非托管。' },
      { title: '零商家手续费', description: '卖家保留100%。买家支付一笔信任费，随着 ProofScore 增长而下降——网络以更便宜的交易回报诚信。' },
      { title: '社交商务', description: '买、卖、分享、推荐。每一笔交易都在链上建立信任，并在整个生态中提升你的信誉。' },
      { title: '即时商家门户', description: '60 秒开店。一个链接、任意稳定币、任意设备——无需银行账户、无需审批、没有门槛。' },
      { title: 'ProofScore 信誉', description: '随时间累积的链上信誉。在支付、商务和社交中建立信任——你的评分为你换来更低的手续费。' },
      { title: 'DAO 治理', description: '对协议参数投票、选举理事会成员，并帮助引导协议走向——真正在链上的治理。' },
    ],
    calcKicker: '节省计算器',
    calcTitlePrefix: '看看你能',
    calcTitleAccent: '省多少',
    stepsKicker: '快速开始',
    stepsTitlePrefix: '开始仅需',
    stepsTitleAccent: '60 秒',
    steps: [
      { title: '创建账户', description: '连接钱包——就这么简单。无需邮箱，基础使用无需 KYC，无需等待审批。' },
      { title: '设置店铺', description: '名称、类别、添加一件商品。一个可分享的支付链接。你已上线。' },
      { title: '分享链接', description: '通过 WhatsApp、Instagram、Discord，随处发送。客户用任意稳定币付款。' },
    ],
    ctaBadge: '零手续费。开源。自托管。',
    ctaTitlePrefix: '准备好掌控你的',
    ctaTitleAccent: '付款了吗?',
    ctaSubhead: '约一分钟设置好店铺，开始收款——无需银行，没有中间人。你的 ProofScore 从第一笔交易开始。',
    ctaPrimary: '开店',
    ctaSecondary: '查看仪表板',
    ctaFootnote: '无需信用卡。无需银行账户。只需你的钱包。',
  },
};

export interface VaultHeaderCopy {
  badge: string;
  title: string;
  subtitle: string;
  noVaultTitle: string;
  noVaultDesc: string;
  creating: string;
  createVault: string;
  loading: string;
  walletNotConnected: string;
  connectPrompt: string;
  switchTo: string;
  switchDesc: string;
  switching: string;
  switchButton: string;
  notDeployedTitle: string;
  notDeployedDesc: string;
}

const vaultHeaderEnglish: VaultHeaderCopy = {
  badge: 'Self-Custody Vault',
  title: 'Vault Manager',
  subtitle: 'Self-custody with guardian-backed wallet rotation, recovery, and queued transfer protection',
  noVaultTitle: 'No Vault Found',
  noVaultDesc: 'Create your vault to start using VFIDE securely on {chain}',
  creating: 'Creating…',
  createVault: 'Create Vault',
  loading: 'Loading vault information...',
  walletNotConnected: 'Wallet Not Connected',
  connectPrompt: 'Please connect your wallet to view your vault',
  switchTo: 'Switch to {chain}',
  switchDesc: 'Your vault lives on {chain}. Switch your wallet there to view and manage it.',
  switching: 'Switching…',
  switchButton: 'Switch to {chain}',
  notDeployedTitle: 'Vault contracts not yet deployed',
  notDeployedDesc: 'Vault contracts are not yet available on {chain}. Please check back shortly or follow our deployment status page for updates.',
};

export const VAULT_HEADER_TRANSLATIONS: TranslationMap<VaultHeaderCopy> = {
  'en-US': vaultHeaderEnglish,
  'en-GB': vaultHeaderEnglish,
  'es-ES': {
    badge: 'Bóveda de autocustodia',
    title: 'Gestor de bóveda',
    subtitle: 'Autocustodia con rotación de billetera respaldada por guardians, recuperación y protección de transferencias en cola',
    noVaultTitle: 'No se encontró bóveda',
    noVaultDesc: 'Crea tu bóveda para empezar a usar VFIDE de forma segura en {chain}',
    creating: 'Creando…',
    createVault: 'Crear bóveda',
    loading: 'Cargando información de la bóveda...',
    walletNotConnected: 'Billetera no conectada',
    connectPrompt: 'Conecta tu billetera para ver tu bóveda',
    switchTo: 'Cambiar a {chain}',
    switchDesc: 'Tu bóveda está en {chain}. Cambia tu billetera allí para verla y gestionarla.',
    switching: 'Cambiando…',
    switchButton: 'Cambiar a {chain}',
    notDeployedTitle: 'Contratos de bóveda aún no desplegados',
    notDeployedDesc: 'Los contratos de bóveda aún no están disponibles en {chain}. Vuelve pronto o sigue nuestra página de estado de despliegue.',
  },
  'fr-FR': {
    badge: 'Coffre auto-gardé',
    title: 'Gestionnaire de coffre',
    subtitle: 'Auto-garde avec rotation de portefeuille soutenue par guardians, récupération et protection des transferts en file',
    noVaultTitle: 'Aucun coffre trouvé',
    noVaultDesc: 'Créez votre coffre pour utiliser VFIDE en toute sécurité sur {chain}',
    creating: 'Création…',
    createVault: 'Créer un coffre',
    loading: 'Chargement des informations du coffre...',
    walletNotConnected: 'Portefeuille non connecté',
    connectPrompt: 'Connectez votre portefeuille pour voir votre coffre',
    switchTo: 'Basculer vers {chain}',
    switchDesc: 'Votre coffre est sur {chain}. Basculez-y votre portefeuille pour le voir et le gérer.',
    switching: 'Basculement…',
    switchButton: 'Basculer vers {chain}',
    notDeployedTitle: 'Contrats de coffre pas encore déployés',
    notDeployedDesc: 'Les contrats de coffre ne sont pas encore disponibles sur {chain}. Revenez bientôt ou suivez notre page de statut de déploiement.',
  },
  'de-DE': {
    badge: 'Selbstverwahrungs-Vault',
    title: 'Vault-Manager',
    subtitle: 'Selbstverwahrung mit Guardian-gestützter Wallet-Rotation, Wiederherstellung und Warteschlangen-Transferschutz',
    noVaultTitle: 'Kein Vault gefunden',
    noVaultDesc: 'Erstelle deinen Vault, um VFIDE sicher auf {chain} zu nutzen',
    creating: 'Wird erstellt…',
    createVault: 'Vault erstellen',
    loading: 'Vault-Informationen werden geladen...',
    walletNotConnected: 'Wallet nicht verbunden',
    connectPrompt: 'Verbinde deine Wallet, um deinen Vault zu sehen',
    switchTo: 'Zu {chain} wechseln',
    switchDesc: 'Dein Vault liegt auf {chain}. Wechsle deine Wallet dorthin, um ihn zu verwalten.',
    switching: 'Wechsle…',
    switchButton: 'Zu {chain} wechseln',
    notDeployedTitle: 'Vault-Verträge noch nicht bereitgestellt',
    notDeployedDesc: 'Vault-Verträge sind auf {chain} noch nicht verfügbar. Schau bald wieder vorbei oder folge unserer Deployment-Statusseite.',
  },
  'ar-SA': {
    badge: 'خزنة حفظ ذاتي',
    title: 'مدير الخزنة',
    subtitle: 'حفظ ذاتي مع تدوير محفظة مدعوم بالأوصياء، واسترداد، وحماية تحويلات في قائمة الانتظار',
    noVaultTitle: 'لم يتم العثور على خزنة',
    noVaultDesc: 'أنشئ خزنتك لبدء استخدام VFIDE بأمان على {chain}',
    creating: 'جارٍ الإنشاء…',
    createVault: 'إنشاء خزنة',
    loading: 'جارٍ تحميل معلومات الخزنة...',
    walletNotConnected: 'المحفظة غير متصلة',
    connectPrompt: 'يرجى توصيل محفظتك لعرض خزنتك',
    switchTo: 'التبديل إلى {chain}',
    switchDesc: 'خزنتك على {chain}. بدّل محفظتك هناك لعرضها وإدارتها.',
    switching: 'جارٍ التبديل…',
    switchButton: 'التبديل إلى {chain}',
    notDeployedTitle: 'لم يتم نشر عقود الخزنة بعد',
    notDeployedDesc: 'عقود الخزنة غير متوفرة بعد على {chain}. يرجى التحقق قريبًا أو متابعة صفحة حالة النشر.',
  },
  'hi-IN': {
    badge: 'स्व-अभिरक्षा वॉल्ट',
    title: 'वॉल्ट प्रबंधक',
    subtitle: 'गार्डियन-समर्थित वॉलेट रोटेशन, रिकवरी, और कतारबद्ध ट्रांसफर सुरक्षा के साथ स्व-अभिरक्षा',
    noVaultTitle: 'कोई वॉल्ट नहीं मिला',
    noVaultDesc: '{chain} पर VFIDE सुरक्षित रूप से उपयोग करने के लिए अपना वॉल्ट बनाएं',
    creating: 'बना रहे हैं…',
    createVault: 'वॉल्ट बनाएं',
    loading: 'वॉल्ट जानकारी लोड हो रही है...',
    walletNotConnected: 'वॉलेट कनेक्ट नहीं है',
    connectPrompt: 'अपना वॉल्ट देखने के लिए कृपया अपना वॉलेट कनेक्ट करें',
    switchTo: '{chain} पर स्विच करें',
    switchDesc: 'आपका वॉल्ट {chain} पर है। इसे देखने और प्रबंधित करने के लिए अपना वॉलेट वहाँ स्विच करें।',
    switching: 'स्विच हो रहा है…',
    switchButton: '{chain} पर स्विच करें',
    notDeployedTitle: 'वॉल्ट कॉन्ट्रैक्ट अभी तैनात नहीं हुए',
    notDeployedDesc: '{chain} पर वॉल्ट कॉन्ट्रैक्ट अभी उपलब्ध नहीं हैं। कृपया शीघ्र ही पुनः जांचें या हमारे डिप्लॉयमेंट स्टेटस पेज का अनुसरण करें।',
  },
  'pt-BR': {
    badge: 'Cofre de autocustódia',
    title: 'Gerenciador de cofre',
    subtitle: 'Autocustódia com rotação de carteira apoiada por guardians, recuperação e proteção de transferências em fila',
    noVaultTitle: 'Nenhum cofre encontrado',
    noVaultDesc: 'Crie seu cofre para começar a usar a VFIDE com segurança na {chain}',
    creating: 'Criando…',
    createVault: 'Criar cofre',
    loading: 'Carregando informações do cofre...',
    walletNotConnected: 'Carteira não conectada',
    connectPrompt: 'Conecte sua carteira para ver seu cofre',
    switchTo: 'Mudar para {chain}',
    switchDesc: 'Seu cofre está na {chain}. Mude sua carteira para lá para visualizá-lo e gerenciá-lo.',
    switching: 'Mudando…',
    switchButton: 'Mudar para {chain}',
    notDeployedTitle: 'Contratos de cofre ainda não implantados',
    notDeployedDesc: 'Os contratos de cofre ainda não estão disponíveis na {chain}. Volte em breve ou acompanhe nossa página de status de implantação.',
  },
  'zh-CN': {
    badge: '自托管金库',
    title: '金库管理器',
    subtitle: '自托管，配备守护者支持的钱包轮换、恢复和排队转账保护',
    noVaultTitle: '未找到金库',
    noVaultDesc: '创建你的金库，开始在 {chain} 上安全使用 VFIDE',
    creating: '创建中…',
    createVault: '创建金库',
    loading: '正在加载金库信息...',
    walletNotConnected: '钱包未连接',
    connectPrompt: '请连接你的钱包以查看金库',
    switchTo: '切换到 {chain}',
    switchDesc: '你的金库在 {chain} 上。请将钱包切换到该网络以查看和管理。',
    switching: '切换中…',
    switchButton: '切换到 {chain}',
    notDeployedTitle: '金库合约尚未部署',
    notDeployedDesc: '金库合约在 {chain} 上尚不可用。请稍后再查看或关注我们的部署状态页面。',
  },
};

export interface VaultOverviewCopy {
  totalBalance: string;
  updatedRealtime: string;
  guardians: string;
  rotationEnabled: string;
  rotationDisabled: string;
}

const vaultOverviewEnglish: VaultOverviewCopy = {
  totalBalance: 'Total Balance',
  updatedRealtime: 'Updated in real time',
  guardians: 'Guardians',
  rotationEnabled: 'Wallet rotation enabled',
  rotationDisabled: 'Add guardians to enable wallet rotation',
};

export const VAULT_OVERVIEW_TRANSLATIONS: TranslationMap<VaultOverviewCopy> = {
  'en-US': vaultOverviewEnglish,
  'en-GB': vaultOverviewEnglish,
  'es-ES': {
    totalBalance: 'Saldo total',
    updatedRealtime: 'Actualizado en tiempo real',
    guardians: 'Guardians',
    rotationEnabled: 'Rotación de billetera activada',
    rotationDisabled: 'Añade guardians para activar la rotación de billetera',
  },
  'fr-FR': {
    totalBalance: 'Solde total',
    updatedRealtime: 'Mis à jour en temps réel',
    guardians: 'Guardians',
    rotationEnabled: 'Rotation de portefeuille activée',
    rotationDisabled: 'Ajoutez des guardians pour activer la rotation du portefeuille',
  },
  'de-DE': {
    totalBalance: 'Gesamtsaldo',
    updatedRealtime: 'In Echtzeit aktualisiert',
    guardians: 'Guardians',
    rotationEnabled: 'Wallet-Rotation aktiviert',
    rotationDisabled: 'Füge Guardians hinzu, um die Wallet-Rotation zu aktivieren',
  },
  'ar-SA': {
    totalBalance: 'الرصيد الإجمالي',
    updatedRealtime: 'يُحدَّث في الوقت الفعلي',
    guardians: 'الأوصياء',
    rotationEnabled: 'تم تفعيل تدوير المحفظة',
    rotationDisabled: 'أضف أوصياء لتفعيل تدوير المحفظة',
  },
  'hi-IN': {
    totalBalance: 'कुल शेष',
    updatedRealtime: 'वास्तविक समय में अपडेट',
    guardians: 'गार्डियन',
    rotationEnabled: 'वॉलेट रोटेशन सक्षम',
    rotationDisabled: 'वॉलेट रोटेशन सक्षम करने के लिए गार्डियन जोड़ें',
  },
  'pt-BR': {
    totalBalance: 'Saldo total',
    updatedRealtime: 'Atualizado em tempo real',
    guardians: 'Guardians',
    rotationEnabled: 'Rotação de carteira ativada',
    rotationDisabled: 'Adicione guardians para ativar a rotação de carteira',
  },
  'zh-CN': {
    totalBalance: '总余额',
    updatedRealtime: '实时更新',
    guardians: '守护者',
    rotationEnabled: '已启用钱包轮换',
    rotationDisabled: '添加守护者以启用钱包轮换',
  },
};

export interface VaultSecurityCopy {
  emergencyTitle: string;
  quarantinedTitle: string;
  quarantinedDesc: string;
  promptDesc: string;
  panicButton: string;
  alreadyLocked: string;
  locking: string;
  confirmLock: string;
  manualUnpause: string;
}

const vaultSecurityEnglish: VaultSecurityCopy = {
  emergencyTitle: 'Emergency Security',
  quarantinedTitle: 'Vault Quarantined',
  quarantinedDesc: 'Paused until you explicitly unpause the vault',
  promptDesc: 'Suspect compromise? Lock immediately.',
  panicButton: 'Panic Button',
  alreadyLocked: 'Already Locked',
  locking: 'Locking...',
  confirmLock: 'Confirm Lock',
  manualUnpause: 'Manual unpause required to resume withdrawals and transfers.',
};

export const VAULT_SECURITY_TRANSLATIONS: TranslationMap<VaultSecurityCopy> = {
  'en-US': vaultSecurityEnglish,
  'en-GB': vaultSecurityEnglish,
  'es-ES': {
    emergencyTitle: 'Seguridad de emergencia',
    quarantinedTitle: 'Bóveda en cuarentena',
    quarantinedDesc: 'En pausa hasta que reactives la bóveda explícitamente',
    promptDesc: '¿Sospechas un compromiso? Bloquea de inmediato.',
    panicButton: 'Botón de pánico',
    alreadyLocked: 'Ya bloqueada',
    locking: 'Bloqueando...',
    confirmLock: 'Confirmar bloqueo',
    manualUnpause: 'Se requiere reactivación manual para reanudar retiros y transferencias.',
  },
  'fr-FR': {
    emergencyTitle: 'Sécurité d’urgence',
    quarantinedTitle: 'Coffre en quarantaine',
    quarantinedDesc: 'En pause jusqu’à réactivation explicite du coffre',
    promptDesc: 'Compromission suspectée ? Verrouillez immédiatement.',
    panicButton: 'Bouton panique',
    alreadyLocked: 'Déjà verrouillé',
    locking: 'Verrouillage...',
    confirmLock: 'Confirmer le verrouillage',
    manualUnpause: 'Réactivation manuelle requise pour reprendre retraits et transferts.',
  },
  'de-DE': {
    emergencyTitle: 'Notfall-Sicherheit',
    quarantinedTitle: 'Vault unter Quarantäne',
    quarantinedDesc: 'Pausiert, bis du den Vault ausdrücklich entsperrst',
    promptDesc: 'Kompromittierung vermutet? Sofort sperren.',
    panicButton: 'Panikknopf',
    alreadyLocked: 'Bereits gesperrt',
    locking: 'Sperren...',
    confirmLock: 'Sperren bestätigen',
    manualUnpause: 'Manuelle Entsperrung nötig, um Abhebungen und Transfers fortzusetzen.',
  },
  'ar-SA': {
    emergencyTitle: 'أمان الطوارئ',
    quarantinedTitle: 'الخزنة معزولة',
    quarantinedDesc: 'متوقفة حتى تلغي الإيقاف صراحةً',
    promptDesc: 'تشك في اختراق؟ اقفل فورًا.',
    panicButton: 'زر الذعر',
    alreadyLocked: 'مقفلة بالفعل',
    locking: 'جارٍ القفل...',
    confirmLock: 'تأكيد القفل',
    manualUnpause: 'يلزم إلغاء الإيقاف يدويًا لاستئناف السحوبات والتحويلات.',
  },
  'hi-IN': {
    emergencyTitle: 'आपातकालीन सुरक्षा',
    quarantinedTitle: 'वॉल्ट क्वारंटीन',
    quarantinedDesc: 'जब तक आप स्पष्ट रूप से अनपॉज़ न करें, रुका हुआ',
    promptDesc: 'समझौते का संदेह? तुरंत लॉक करें।',
    panicButton: 'पैनिक बटन',
    alreadyLocked: 'पहले से लॉक',
    locking: 'लॉक हो रहा है...',
    confirmLock: 'लॉक की पुष्टि करें',
    manualUnpause: 'निकासी और स्थानांतरण फिर से शुरू करने के लिए मैनुअल अनपॉज़ आवश्यक।',
  },
  'pt-BR': {
    emergencyTitle: 'Segurança de emergência',
    quarantinedTitle: 'Cofre em quarentena',
    quarantinedDesc: 'Pausado até você reativar o cofre explicitamente',
    promptDesc: 'Suspeita de comprometimento? Bloqueie já.',
    panicButton: 'Botão de pânico',
    alreadyLocked: 'Já bloqueado',
    locking: 'Bloqueando...',
    confirmLock: 'Confirmar bloqueio',
    manualUnpause: 'Reativação manual necessária para retomar saques e transferências.',
  },
  'zh-CN': {
    emergencyTitle: '紧急安全',
    quarantinedTitle: '金库已隔离',
    quarantinedDesc: '暂停，直到你明确解除暂停',
    promptDesc: '怀疑被入侵？立即锁定。',
    panicButton: '紧急按钮',
    alreadyLocked: '已锁定',
    locking: '锁定中...',
    confirmLock: '确认锁定',
    manualUnpause: '需手动解除暂停才能恢复提现和转账。',
  },
};

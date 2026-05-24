import { safeLocalStorage } from '@/lib/utils';

export const SUPPORTED_LOCALES = ['en-US', 'en-GB', 'es-ES', 'fr-FR', 'de-DE', 'ar-SA'] as const;
export type SupportedLocale = typeof SUPPORTED_LOCALES[number];

export const DEFAULT_LOCALE: SupportedLocale = 'en-US';

export const LOCALE_OPTIONS: Array<{ value: SupportedLocale; label: string }> = [
  { value: 'en-US', label: 'English (US)' },
  { value: 'en-GB', label: 'English (UK)' },
  { value: 'es-ES', label: 'Español' },
  { value: 'fr-FR', label: 'Français' },
  { value: 'de-DE', label: 'Deutsch' },
  { value: 'ar-SA', label: 'العربية' },
];

const LANGUAGE_FALLBACKS: Record<string, SupportedLocale> = {
  en: 'en-US',
  es: 'es-ES',
  fr: 'fr-FR',
  de: 'de-DE',
  ar: 'ar-SA',
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
  'ar-SA': {
    badge: 'دعم على مدار الساعة',
    heading: 'مركز المساعدة والدعم',
    description: 'ابحث عن إجابات للأسئلة الشائعة أو افتح تذكرة دعم. فريقنا هنا لمساعدتك في أي مشكلة.',
    languageLabel: 'اللغة',
    faqTitle: 'الأسئلة الشائعة والأدلة',
    faqDescription: 'تصفح الأسئلة الشائعة والدروس التعليمية',
    ticketsTitle: 'تذاكري',
    ticketsDescription: 'عرض وإدارة طلبات الدعم',
    activeSuffix: 'نشطة',
    newTicketTitle: 'تذكرة جديدة',
    newTicketDescription: 'إنشاء طلب دعم جديد',
    searchPlaceholder: 'ابحث عن إجابات...',
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
  'ar-SA': {
    languageLabel: 'اللغة',
    liveBadge: 'متاح الآن على Base',
    heroTitle: 'استقبل العملات الرقمية.',
    heroAccent: 'بدون رسوم.',
    heroDescription: 'أول بروتوكول دفع لا يتحمل فيه التجار أي رسوم معالجة. تحمل التحويلات رسوم سلوكية (0.25–5٪) تكافئ الثقة. امتلك أموالك وابنِ ProofScore لفتح رسوم أقل.',
    valueProps: ['ادفع', 'ابنِ الثقة', 'افتح المكافآت'],
    primaryCta: 'ابدأ الآن',
    secondaryCta: 'استكشاف القروض السريعة P2P',
    contractsBadge: '14 عقداً منشوراً',
    auditBadge: 'مدقق ومفتوح المصدر',
    settlementBadge: 'تسوية فورية',
    chainBadge: 'مبني لـ Base • Polygon • zkSync',
    finalTitle: 'هل أنت مستعد لامتلاك مدفوعاتك؟',
    finalDescription: 'انضم إلى آلاف التجار والمستخدمين الذين يبنون الثقة على VFIDE.',
    launchApp: 'تشغيل التطبيق',
    docsCta: 'اقرأ التوثيق',
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


// ─── NAV / SHELL ─────────────────────────────────────────────────────────────

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
  'en-US': { home: 'Home', pay: 'Pay', merchant: 'Shop', social: 'Social', more: 'More', close: 'Close', search: 'Find anywhere…', openHub: 'Open full hub' },
  'en-GB': { home: 'Home', pay: 'Pay', merchant: 'Shop', social: 'Social', more: 'More', close: 'Close', search: 'Find anywhere…', openHub: 'Open full hub' },
  'es-ES': { home: 'Inicio', pay: 'Pagar', merchant: 'Tienda', social: 'Social', more: 'Más', close: 'Cerrar', search: 'Buscar en cualquier lugar…', openHub: 'Abrir hub completo' },
  'fr-FR': { home: 'Accueil', pay: 'Payer', merchant: 'Boutique', social: 'Social', more: 'Plus', close: 'Fermer', search: 'Trouver n'importe où…', openHub: 'Ouvrir le hub complet' },
  'de-DE': { home: 'Start', pay: 'Bezahlen', merchant: 'Shop', social: 'Sozial', more: 'Mehr', close: 'Schließen', search: 'Überall suchen…', openHub: 'Vollständiges Hub öffnen' },
  'ar-SA': { home: 'الرئيسية', pay: 'الدفع', merchant: 'المتجر', social: 'اجتماعي', more: 'المزيد', close: 'إغلاق', search: 'ابحث في أي مكان…', openHub: 'فتح لوحة التحكم الكاملة' },
};

// ─── PAY PAGE ────────────────────────────────────────────────────────────────

export interface PayCopy {
  title: string;
  subtitle: string;
  recipientLabel: string;
  recipientPlaceholder: string;
  amountLabel: string;
  amountPlaceholder: string;
  noteLabel: string;
  notePlaceholder: string;
  submitButton: string;
  connectWallet: string;
  preview: string;
  feeLabel: string;
  totalLabel: string;
  confirmButton: string;
  cancelButton: string;
  successTitle: string;
  successDescription: string;
}

const payEn: PayCopy = {
  title: 'Send Payment',
  subtitle: 'Send VFIDE to any wallet address or ENS name',
  recipientLabel: 'Recipient',
  recipientPlaceholder: '0x… or name.eth',
  amountLabel: 'Amount',
  amountPlaceholder: '0.00',
  noteLabel: 'Note (optional)',
  notePlaceholder: 'What's this for?',
  submitButton: 'Review Payment',
  connectWallet: 'Connect Wallet to Send',
  preview: 'Payment Preview',
  feeLabel: 'Protocol Fee',
  totalLabel: 'Total',
  confirmButton: 'Confirm & Send',
  cancelButton: 'Cancel',
  successTitle: 'Payment Sent',
  successDescription: 'Your payment has been submitted to the network.',
};

export const PAY_TRANSLATIONS: TranslationMap<PayCopy> = {
  'en-US': payEn,
  'en-GB': payEn,
  'es-ES': {
    title: 'Enviar pago',
    subtitle: 'Envía VFIDE a cualquier dirección de wallet o nombre ENS',
    recipientLabel: 'Destinatario',
    recipientPlaceholder: '0x… o nombre.eth',
    amountLabel: 'Cantidad',
    amountPlaceholder: '0,00',
    noteLabel: 'Nota (opcional)',
    notePlaceholder: '¿Para qué es?',
    submitButton: 'Revisar pago',
    connectWallet: 'Conecta tu wallet para enviar',
    preview: 'Vista previa del pago',
    feeLabel: 'Tarifa de protocolo',
    totalLabel: 'Total',
    confirmButton: 'Confirmar y enviar',
    cancelButton: 'Cancelar',
    successTitle: 'Pago enviado',
    successDescription: 'Tu pago ha sido enviado a la red.',
  },
  'fr-FR': {
    title: 'Envoyer un paiement',
    subtitle: 'Envoyez des VFIDE à n'importe quelle adresse de portefeuille ou nom ENS',
    recipientLabel: 'Destinataire',
    recipientPlaceholder: '0x… ou nom.eth',
    amountLabel: 'Montant',
    amountPlaceholder: '0,00',
    noteLabel: 'Note (facultatif)',
    notePlaceholder: 'À quoi sert ce paiement ?',
    submitButton: 'Vérifier le paiement',
    connectWallet: 'Connectez votre portefeuille pour envoyer',
    preview: 'Aperçu du paiement',
    feeLabel: 'Frais de protocole',
    totalLabel: 'Total',
    confirmButton: 'Confirmer et envoyer',
    cancelButton: 'Annuler',
    successTitle: 'Paiement envoyé',
    successDescription: 'Votre paiement a été soumis au réseau.',
  },
  'ar-SA': {
    title: 'إرسال دفعة',
    subtitle: 'أرسل VFIDE إلى أي عنوان محفظة أو اسم ENS',
    recipientLabel: 'المستلم',
    recipientPlaceholder: '0x… أو name.eth',
    amountLabel: 'المبلغ',
    amountPlaceholder: '0.00',
    noteLabel: 'ملاحظة (اختياري)',
    notePlaceholder: 'ما الغرض من هذه الدفعة؟',
    submitButton: 'مراجعة الدفعة',
    connectWallet: 'اربط محفظتك للإرسال',
    preview: 'معاينة الدفعة',
    feeLabel: 'رسوم البروتوكول',
    totalLabel: 'الإجمالي',
    confirmButton: 'تأكيد وإرسال',
    cancelButton: 'إلغاء',
    successTitle: 'تم إرسال الدفعة',
    successDescription: 'تم إرسال دفعتك إلى الشبكة.',
  },
  'de-DE': {
    title: 'Zahlung senden',
    subtitle: 'Senden Sie VFIDE an eine beliebige Wallet-Adresse oder einen ENS-Namen',
    recipientLabel: 'Empfänger',
    recipientPlaceholder: '0x… oder name.eth',
    amountLabel: 'Betrag',
    amountPlaceholder: '0,00',
    noteLabel: 'Notiz (optional)',
    notePlaceholder: 'Wofür ist das?',
    submitButton: 'Zahlung prüfen',
    connectWallet: 'Wallet verbinden, um zu senden',
    preview: 'Zahlungsvorschau',
    feeLabel: 'Protokollgebühr',
    totalLabel: 'Gesamt',
    confirmButton: 'Bestätigen und senden',
    cancelButton: 'Abbrechen',
    successTitle: 'Zahlung gesendet',
    successDescription: 'Ihre Zahlung wurde an das Netzwerk übermittelt.',
  },
};

// ─── PROOFSCORE PAGE ──────────────────────────────────────────────────────────

export interface ProofScoreCopy {
  title: string;
  subtitle: string;
  connectPrompt: string;
  currentScore: string;
  tier: string;
  breakdown: string;
  history: string;
  improve: string;
  howItWorks: string;
  tierNames: [string, string, string, string, string];
}

const proofScoreEn: ProofScoreCopy = {
  title: 'ProofScore',
  subtitle: 'Your on-chain reputation — built by behavior, not identity',
  connectPrompt: 'Connect your wallet to view your ProofScore',
  currentScore: 'Current Score',
  tier: 'Tier',
  breakdown: 'Score Breakdown',
  history: 'Score History',
  improve: 'How to Improve',
  howItWorks: 'How ProofScore Works',
  tierNames: ['New', 'Trusted', 'Established', 'Verified', 'Seer'],
};

export const PROOFSCORE_TRANSLATIONS: TranslationMap<ProofScoreCopy> = {
  'en-US': proofScoreEn,
  'en-GB': proofScoreEn,
  'es-ES': {
    title: 'ProofScore',
    subtitle: 'Tu reputación en cadena — construida por comportamiento, no por identidad',
    connectPrompt: 'Conecta tu wallet para ver tu ProofScore',
    currentScore: 'Puntuación actual',
    tier: 'Nivel',
    breakdown: 'Desglose de puntuación',
    history: 'Historial de puntuación',
    improve: 'Cómo mejorar',
    howItWorks: 'Cómo funciona ProofScore',
    tierNames: ['Nuevo', 'Confiable', 'Establecido', 'Verificado', 'Seer'],
  },
  'fr-FR': {
    title: 'ProofScore',
    subtitle: 'Votre réputation on-chain — construite par le comportement, pas par l'identité',
    connectPrompt: 'Connectez votre portefeuille pour voir votre ProofScore',
    currentScore: 'Score actuel',
    tier: 'Niveau',
    breakdown: 'Détail du score',
    history: 'Historique du score',
    improve: 'Comment s'améliorer',
    howItWorks: 'Comment fonctionne ProofScore',
    tierNames: ['Nouveau', 'Fiable', 'Établi', 'Vérifié', 'Seer'],
  },
  'ar-SA': {
    title: 'ProofScore',
    subtitle: 'سمعتك على السلسلة — مبنية على السلوك، لا على الهوية',
    connectPrompt: 'اربط محفظتك لعرض ProofScore الخاص بك',
    currentScore: 'النقاط الحالية',
    tier: 'المستوى',
    breakdown: 'تفصيل النقاط',
    history: 'سجل النقاط',
    improve: 'كيفية التحسين',
    howItWorks: 'كيف يعمل ProofScore',
    tierNames: ['جديد', 'موثوق', 'راسخ', 'معتمد', 'Seer'],
  },
  'de-DE': {
    title: 'ProofScore',
    subtitle: 'Ihr On-Chain-Ruf — aufgebaut durch Verhalten, nicht durch Identität',
    connectPrompt: 'Verbinden Sie Ihre Wallet, um Ihren ProofScore zu sehen',
    currentScore: 'Aktueller Score',
    tier: 'Stufe',
    breakdown: 'Score-Aufschlüsselung',
    history: 'Score-Verlauf',
    improve: 'Wie man sich verbessert',
    howItWorks: 'Wie ProofScore funktioniert',
    tierNames: ['Neu', 'Vertrauenswürdig', 'Etabliert', 'Verifiziert', 'Seer'],
  },
};

// ─── ONBOARDING PAGE ─────────────────────────────────────────────────────────

export interface OnboardingCopy {
  title: string;
  subtitle: string;
  step1Title: string;
  step1Description: string;
  step2Title: string;
  step2Description: string;
  step3Title: string;
  step3Description: string;
  continueButton: string;
  backButton: string;
  skipButton: string;
  finishButton: string;
  welcomeTitle: string;
  welcomeSubtitle: string;
}

const onboardingEn: OnboardingCopy = {
  title: 'Welcome to VFIDE',
  subtitle: 'Let's get you set up in a few steps',
  step1Title: 'Connect Your Wallet',
  step1Description: 'Link your crypto wallet to access all VFIDE features. We support MetaMask, Coinbase Wallet, and more.',
  step2Title: 'Build Your ProofScore',
  step2Description: 'Your ProofScore reflects your on-chain behavior. Higher scores unlock lower fees and exclusive benefits.',
  step3Title: 'Start Transacting',
  step3Description: 'Send, receive, and manage VFIDE with zero merchant fees. Own your funds at every step.',
  continueButton: 'Continue',
  backButton: 'Back',
  skipButton: 'Skip',
  finishButton: 'Get Started',
  welcomeTitle: 'You're all set!',
  welcomeSubtitle: 'Your wallet is connected. Start exploring VFIDE.',
};

export const ONBOARDING_TRANSLATIONS: TranslationMap<OnboardingCopy> = {
  'en-US': onboardingEn,
  'en-GB': onboardingEn,
  'es-ES': {
    title: 'Bienvenido a VFIDE',
    subtitle: 'Vamos a configurarte en unos pocos pasos',
    step1Title: 'Conecta tu wallet',
    step1Description: 'Vincula tu wallet de criptomonedas para acceder a todas las funciones de VFIDE. Soportamos MetaMask, Coinbase Wallet y más.',
    step2Title: 'Construye tu ProofScore',
    step2Description: 'Tu ProofScore refleja tu comportamiento en cadena. Puntuaciones más altas desbloquean tarifas más bajas y beneficios exclusivos.',
    step3Title: 'Empieza a transaccionar',
    step3Description: 'Envía, recibe y gestiona VFIDE sin comisiones de comerciante. Mantén el control de tus fondos en cada paso.',
    continueButton: 'Continuar',
    backButton: 'Atrás',
    skipButton: 'Omitir',
    finishButton: 'Comenzar',
    welcomeTitle: '¡Todo listo!',
    welcomeSubtitle: 'Tu wallet está conectada. Empieza a explorar VFIDE.',
  },
  'fr-FR': {
    title: 'Bienvenue sur VFIDE',
    subtitle: 'Configurons votre compte en quelques étapes',
    step1Title: 'Connectez votre portefeuille',
    step1Description: 'Liez votre portefeuille crypto pour accéder à toutes les fonctionnalités de VFIDE. Nous supportons MetaMask, Coinbase Wallet et plus.',
    step2Title: 'Construisez votre ProofScore',
    step2Description: 'Votre ProofScore reflète votre comportement on-chain. Des scores plus élevés débloquent des frais réduits et des avantages exclusifs.',
    step3Title: 'Commencez à transiger',
    step3Description: 'Envoyez, recevez et gérez des VFIDE sans frais marchands. Conservez le contrôle de vos fonds à chaque étape.',
    continueButton: 'Continuer',
    backButton: 'Retour',
    skipButton: 'Passer',
    finishButton: 'Commencer',
    welcomeTitle: 'Tout est prêt !',
    welcomeSubtitle: 'Votre portefeuille est connecté. Commencez à explorer VFIDE.',
  },
  'ar-SA': {
    title: 'مرحباً بك في VFIDE',
    subtitle: 'دعنا نُعدّك في بضع خطوات',
    step1Title: 'اربط محفظتك',
    step1Description: 'اربط محفظة العملات الرقمية للوصول إلى جميع ميزات VFIDE. ندعم MetaMask وCoinbase Wallet والمزيد.',
    step2Title: 'ابنِ ProofScore الخاص بك',
    step2Description: 'يعكس ProofScore سلوكك على السلسلة. النقاط الأعلى تفتح رسوماً أقل ومزايا حصرية.',
    step3Title: 'ابدأ التعاملات',
    step3Description: 'أرسل واستقبل وأدر VFIDE بدون رسوم تجارية. احتفظ بملكية أموالك في كل خطوة.',
    continueButton: 'متابعة',
    backButton: 'رجوع',
    skipButton: 'تخطي',
    finishButton: 'ابدأ الآن',
    welcomeTitle: 'كل شيء جاهز!',
    welcomeSubtitle: 'محفظتك متصلة. ابدأ استكشاف VFIDE.',
  },
  'de-DE': {
    title: 'Willkommen bei VFIDE',
    subtitle: 'Lassen Sie uns Sie in wenigen Schritten einrichten',
    step1Title: 'Wallet verbinden',
    step1Description: 'Verknüpfen Sie Ihre Krypto-Wallet, um auf alle VFIDE-Funktionen zuzugreifen. Wir unterstützen MetaMask, Coinbase Wallet und mehr.',
    step2Title: 'ProofScore aufbauen',
    step2Description: 'Ihr ProofScore spiegelt Ihr On-Chain-Verhalten wider. Höhere Scores schalten niedrigere Gebühren und exklusive Vorteile frei.',
    step3Title: 'Mit Transaktionen beginnen',
    step3Description: 'Senden, empfangen und verwalten Sie VFIDE ohne Händlergebühren. Behalten Sie die Kontrolle über Ihre Mittel.',
    continueButton: 'Weiter',
    backButton: 'Zurück',
    skipButton: 'Überspringen',
    finishButton: 'Loslegen',
    welcomeTitle: 'Alles bereit!',
    welcomeSubtitle: 'Ihre Wallet ist verbunden. Erkunden Sie VFIDE.',
  },
};

// ─── MERCHANT PAGE ────────────────────────────────────────────────────────────

export interface MerchantCopy {
  title: string;
  subtitle: string;
  connectPrompt: string;
  dashboardTitle: string;
  totalRevenue: string;
  totalTransactions: string;
  averageOrder: string;
  recentTransactions: string;
  feeSavings: string;
  feeSavingsDescription: string;
  setupTitle: string;
  setupDescription: string;
  createProfile: string;
  profileName: string;
  profileDescription: string;
  saveButton: string;
}

const merchantEn: MerchantCopy = {
  title: 'Merchant Dashboard',
  subtitle: 'Zero processing fees. Real-time settlement. Your funds, your rules.',
  connectPrompt: 'Connect your wallet to access your merchant dashboard',
  dashboardTitle: 'Your Store',
  totalRevenue: 'Total Revenue',
  totalTransactions: 'Transactions',
  averageOrder: 'Avg. Order',
  recentTransactions: 'Recent Transactions',
  feeSavings: 'Fee Savings',
  feeSavingsDescription: 'Amount saved compared to traditional payment processors',
  setupTitle: 'Set Up Your Store',
  setupDescription: 'Create your merchant profile to start accepting VFIDE payments with zero processing fees.',
  createProfile: 'Create Merchant Profile',
  profileName: 'Business Name',
  profileDescription: 'Business Description',
  saveButton: 'Save Profile',
};

export const MERCHANT_TRANSLATIONS: TranslationMap<MerchantCopy> = {
  'en-US': merchantEn,
  'en-GB': merchantEn,
  'es-ES': {
    title: 'Panel de comerciante',
    subtitle: 'Sin comisiones de procesamiento. Liquidación en tiempo real. Tus fondos, tus reglas.',
    connectPrompt: 'Conecta tu wallet para acceder a tu panel de comerciante',
    dashboardTitle: 'Tu tienda',
    totalRevenue: 'Ingresos totales',
    totalTransactions: 'Transacciones',
    averageOrder: 'Pedido promedio',
    recentTransactions: 'Transacciones recientes',
    feeSavings: 'Ahorro en comisiones',
    feeSavingsDescription: 'Importe ahorrado en comparación con los procesadores de pago tradicionales',
    setupTitle: 'Configura tu tienda',
    setupDescription: 'Crea tu perfil de comerciante para empezar a aceptar pagos VFIDE sin comisiones.',
    createProfile: 'Crear perfil de comerciante',
    profileName: 'Nombre del negocio',
    profileDescription: 'Descripción del negocio',
    saveButton: 'Guardar perfil',
  },
  'fr-FR': {
    title: 'Tableau de bord marchand',
    subtitle: 'Zéro frais de traitement. Règlement en temps réel. Vos fonds, vos règles.',
    connectPrompt: 'Connectez votre portefeuille pour accéder à votre tableau de bord marchand',
    dashboardTitle: 'Votre boutique',
    totalRevenue: 'Revenu total',
    totalTransactions: 'Transactions',
    averageOrder: 'Commande moy.',
    recentTransactions: 'Transactions récentes',
    feeSavings: 'Économies sur les frais',
    feeSavingsDescription: 'Montant économisé par rapport aux processeurs de paiement traditionnels',
    setupTitle: 'Configurez votre boutique',
    setupDescription: 'Créez votre profil marchand pour commencer à accepter des paiements VFIDE sans frais.',
    createProfile: 'Créer un profil marchand',
    profileName: 'Nom de l'entreprise',
    profileDescription: 'Description de l'entreprise',
    saveButton: 'Enregistrer le profil',
  },
  'ar-SA': {
    title: 'لوحة تحكم التاجر',
    subtitle: 'بدون رسوم معالجة. تسوية فورية. أموالك، قواعدك.',
    connectPrompt: 'اربط محفظتك للوصول إلى لوحة تحكم التاجر',
    dashboardTitle: 'متجرك',
    totalRevenue: 'إجمالي الإيرادات',
    totalTransactions: 'المعاملات',
    averageOrder: 'متوسط الطلب',
    recentTransactions: 'المعاملات الأخيرة',
    feeSavings: 'توفير في الرسوم',
    feeSavingsDescription: 'المبلغ الموفر مقارنة بمعالجات الدفع التقليدية',
    setupTitle: 'أعدّ متجرك',
    setupDescription: 'أنشئ ملف التاجر الخاص بك لبدء قبول مدفوعات VFIDE بدون رسوم.',
    createProfile: 'إنشاء ملف تاجر',
    profileName: 'اسم الشركة',
    profileDescription: 'وصف الشركة',
    saveButton: 'حفظ الملف',
  },
  'de-DE': {
    title: 'Händler-Dashboard',
    subtitle: 'Keine Bearbeitungsgebühren. Echtzeit-Abrechnung. Ihre Mittel, Ihre Regeln.',
    connectPrompt: 'Verbinden Sie Ihre Wallet, um auf Ihr Händler-Dashboard zuzugreifen',
    dashboardTitle: 'Ihr Shop',
    totalRevenue: 'Gesamtumsatz',
    totalTransactions: 'Transaktionen',
    averageOrder: 'Ø Bestellung',
    recentTransactions: 'Letzte Transaktionen',
    feeSavings: 'Gebührenersparnis',
    feeSavingsDescription: 'Gespartes im Vergleich zu traditionellen Zahlungsabwicklern',
    setupTitle: 'Richten Sie Ihren Shop ein',
    setupDescription: 'Erstellen Sie Ihr Händlerprofil, um VFIDE-Zahlungen ohne Bearbeitungsgebühren zu akzeptieren.',
    createProfile: 'Händlerprofil erstellen',
    profileName: 'Unternehmensname',
    profileDescription: 'Unternehmensbeschreibung',
    saveButton: 'Profil speichern',
  },
};

// ─── REMITTANCE PAGE ──────────────────────────────────────────────────────────

export interface RemittanceCopy {
  title: string;
  subtitle: string;
  sendAmount: string;
  receiveAmount: string;
  from: string;
  to: string;
  rate: string;
  fee: string;
  totalCost: string;
  compareTitle: string;
  calculateButton: string;
  connectToSend: string;
  savingsVsTraditional: string;
}

const remittanceEn: RemittanceCopy = {
  title: 'Remittance',
  subtitle: 'Send money across borders — instant, low-cost, no bank required',
  sendAmount: 'You Send',
  receiveAmount: 'They Receive',
  from: 'From',
  to: 'To',
  rate: 'Exchange Rate',
  fee: 'Fee',
  totalCost: 'Total Cost',
  compareTitle: 'vs. Traditional Options',
  calculateButton: 'Calculate',
  connectToSend: 'Connect Wallet to Send',
  savingsVsTraditional: 'Savings vs. traditional wire',
};

export const REMITTANCE_TRANSLATIONS: TranslationMap<RemittanceCopy> = {
  'en-US': remittanceEn,
  'en-GB': remittanceEn,
  'es-ES': {
    title: 'Remesas',
    subtitle: 'Envía dinero al extranjero — instantáneo, económico, sin banco',
    sendAmount: 'Envías',
    receiveAmount: 'Reciben',
    from: 'Desde',
    to: 'Hacia',
    rate: 'Tipo de cambio',
    fee: 'Comisión',
    totalCost: 'Coste total',
    compareTitle: 'vs. opciones tradicionales',
    calculateButton: 'Calcular',
    connectToSend: 'Conecta tu wallet para enviar',
    savingsVsTraditional: 'Ahorro frente a transferencia bancaria',
  },
  'fr-FR': {
    title: 'Transfert d'argent',
    subtitle: 'Envoyez de l'argent à l'étranger — instantané, peu coûteux, sans banque',
    sendAmount: 'Vous envoyez',
    receiveAmount: 'Ils reçoivent',
    from: 'De',
    to: 'Vers',
    rate: 'Taux de change',
    fee: 'Frais',
    totalCost: 'Coût total',
    compareTitle: 'vs. options traditionnelles',
    calculateButton: 'Calculer',
    connectToSend: 'Connectez votre portefeuille pour envoyer',
    savingsVsTraditional: 'Économies vs. virement bancaire',
  },
  'ar-SA': {
    title: 'تحويل الأموال',
    subtitle: 'أرسل الأموال عبر الحدود — فوري، منخفض التكلفة، بدون بنك',
    sendAmount: 'ترسل',
    receiveAmount: 'يستلمون',
    from: 'من',
    to: 'إلى',
    rate: 'سعر الصرف',
    fee: 'الرسوم',
    totalCost: 'التكلفة الإجمالية',
    compareTitle: 'مقابل الخيارات التقليدية',
    calculateButton: 'احسب',
    connectToSend: 'اربط محفظتك للإرسال',
    savingsVsTraditional: 'التوفير مقابل التحويل المصرفي',
  },
  'de-DE': {
    title: 'Geldüberweisung',
    subtitle: 'Geld ins Ausland senden — sofort, günstig, ohne Bank',
    sendAmount: 'Sie senden',
    receiveAmount: 'Sie erhalten',
    from: 'Von',
    to: 'Nach',
    rate: 'Wechselkurs',
    fee: 'Gebühr',
    totalCost: 'Gesamtkosten',
    compareTitle: 'vs. traditionelle Optionen',
    calculateButton: 'Berechnen',
    connectToSend: 'Wallet verbinden zum Senden',
    savingsVsTraditional: 'Ersparnis vs. Banküberweisung',
  },
};

// ─── ABOUT PAGE ───────────────────────────────────────────────────────────────

export interface AboutCopy {
  title: string;
  subtitle: string;
  missionTitle: string;
  missionBody: string;
  feeInversionTitle: string;
  feeInversionBody: string;
  seerTitle: string;
  seerBody: string;
  keyBurnTitle: string;
  keyBurnBody: string;
  proofScoreTitle: string;
  proofScoreBody: string;
  teamTitle: string;
  teamBody: string;
}

const aboutEn: AboutCopy = {
  title: 'About VFIDE',
  subtitle: 'A financial protocol built for people who have been left out — not cashed in on',
  missionTitle: 'Our Mission',
  missionBody: 'VFIDE exists to invert the extractive model of traditional finance. We build infrastructure where merchants pay zero processing fees, users earn trust through behavior, and no single entity — including us — controls the protocol forever.',
  feeInversionTitle: 'Fee Inversion',
  feeInversionBody: 'Traditional payment processors charge merchants 2–4% per transaction. VFIDE inverts this: merchants pay zero. Instead, token-to-token transfers carry behavioral fees (0.25–5%) that reward trust and fund the ecosystem.',
  seerTitle: 'The Seer Constitution',
  seerBody: 'A protocol-level bill of rights for every user. It guarantees the right to dispute, appeal, recover funds, and exit the protocol — without permission from any authority.',
  keyBurnTitle: 'Developer Key Burn',
  keyBurnBody: 'Six months after mainnet launch, the developer admin keys are permanently destroyed. No upgrade. No rug. The protocol becomes fully autonomous — owned by the community and governed by its participants.',
  proofScoreTitle: 'ProofScore',
  proofScoreBody: 'On-chain reputation built through behavior, not identity. Consistent, honest behavior unlocks lower fees, higher limits, and a seat at governance tables.',
  teamTitle: 'Built in Public',
  teamBody: 'VFIDE is open source, audited, and built with radical transparency. Every contract, every decision, every tradeoff — documented and on-chain.',
};

export const ABOUT_TRANSLATIONS: TranslationMap<AboutCopy> = {
  'en-US': aboutEn,
  'en-GB': aboutEn,
  'es-ES': {
    title: 'Sobre VFIDE',
    subtitle: 'Un protocolo financiero construido para quienes han sido excluidos — no explotados',
    missionTitle: 'Nuestra misión',
    missionBody: 'VFIDE existe para invertir el modelo extractivo de las finanzas tradicionales. Construimos infraestructura donde los comerciantes pagan cero comisiones de procesamiento, los usuarios ganan confianza a través del comportamiento y ninguna entidad — incluidos nosotros — controla el protocolo para siempre.',
    feeInversionTitle: 'Inversión de tarifas',
    feeInversionBody: 'Los procesadores de pago tradicionales cobran a los comerciantes entre el 2 y el 4 % por transacción. VFIDE lo invierte: los comerciantes pagan cero. En cambio, las transferencias de token a token llevan tarifas de comportamiento (0,25–5 %) que recompensan la confianza y financian el ecosistema.',
    seerTitle: 'La Constitución Seer',
    seerBody: 'Una declaración de derechos a nivel de protocolo para cada usuario. Garantiza el derecho a disputar, apelar, recuperar fondos y salir del protocolo, sin permiso de ninguna autoridad.',
    keyBurnTitle: 'Quema de claves de desarrollador',
    keyBurnBody: 'Seis meses después del lanzamiento en mainnet, las claves de administrador del desarrollador se destruyen permanentemente. Sin actualizaciones. Sin fraude. El protocolo se vuelve completamente autónomo — en manos de la comunidad.',
    proofScoreTitle: 'ProofScore',
    proofScoreBody: 'Reputación en cadena construida a través del comportamiento, no de la identidad. Un comportamiento consistente y honesto desbloquea tarifas más bajas, límites más altos y un lugar en la gobernanza.',
    teamTitle: 'Construido en público',
    teamBody: 'VFIDE es de código abierto, auditado y construido con transparencia radical. Cada contrato, cada decisión, cada compensación — documentados y en cadena.',
  },
  'fr-FR': {
    title: 'À propos de VFIDE',
    subtitle: 'Un protocole financier conçu pour ceux qui ont été exclus — pas exploités',
    missionTitle: 'Notre mission',
    missionBody: 'VFIDE existe pour inverser le modèle extractif de la finance traditionnelle. Nous construisons une infrastructure où les commerçants paient zéro frais de traitement, les utilisateurs gagnent de la confiance par leur comportement, et aucune entité — y compris nous — ne contrôle le protocole pour toujours.',
    feeInversionTitle: 'Inversion des frais',
    feeInversionBody: 'Les processeurs de paiement traditionnels facturent aux commerçants 2 à 4 % par transaction. VFIDE inverse cela : les commerçants paient zéro. À la place, les transferts de token à token comportent des frais comportementaux (0,25–5 %) qui récompensent la confiance et financent l'écosystème.',
    seerTitle: 'La Constitution Seer',
    seerBody: 'Une déclaration des droits au niveau du protocole pour chaque utilisateur. Elle garantit le droit de contester, faire appel, récupérer des fonds et quitter le protocole — sans permission d'aucune autorité.',
    keyBurnTitle: 'Destruction des clés développeur',
    keyBurnBody: 'Six mois après le lancement sur le réseau principal, les clés d'administration du développeur sont définitivement détruites. Pas de mise à niveau. Pas d'arnaque. Le protocole devient entièrement autonome — appartenant à la communauté.',
    proofScoreTitle: 'ProofScore',
    proofScoreBody: 'Réputation on-chain construite par le comportement, pas par l'identité. Un comportement cohérent et honnête débloque des frais réduits, des limites plus élevées et une place dans la gouvernance.',
    teamTitle: 'Construit en public',
    teamBody: 'VFIDE est open source, audité et construit avec une transparence radicale. Chaque contrat, chaque décision, chaque compromis — documentés et on-chain.',
  },
  'ar-SA': {
    title: 'عن VFIDE',
    subtitle: 'بروتوكول مالي مبني للمستبعدين — لا للمستغَلين',
    missionTitle: 'مهمتنا',
    missionBody: 'وُجد VFIDE لقلب النموذج الاستخراجي للتمويل التقليدي. نبني بنية تحتية حيث يدفع التجار صفراً من رسوم المعالجة، ويكسب المستخدمون الثقة من خلال السلوك، ولا تسيطر أي جهة — بما فيها نحن — على البروتوكول إلى الأبد.',
    feeInversionTitle: 'عكس الرسوم',
    feeInversionBody: 'تفرض معالجات الدفع التقليدية على التجار 2–4٪ لكل معاملة. يعكس VFIDE ذلك: التجار يدفعون صفراً. بدلاً من ذلك، تحمل تحويلات الرموز رسوماً سلوكية (0.25–5٪) تكافئ الثقة وتموّل المنظومة.',
    seerTitle: 'دستور Seer',
    seerBody: 'وثيقة حقوق على مستوى البروتوكول لكل مستخدم. تضمن حق الاعتراض والاستئناف واسترداد الأموال والخروج من البروتوكول — دون إذن من أي سلطة.',
    keyBurnTitle: 'حرق مفاتيح المطور',
    keyBurnBody: 'بعد ستة أشهر من إطلاق الشبكة الرئيسية، تُتلف مفاتيح المسؤول الخاصة بالمطور نهائياً. لا ترقيات. لا احتيال. يصبح البروتوكول مستقلاً تماماً — ملكاً للمجتمع.',
    proofScoreTitle: 'ProofScore',
    proofScoreBody: 'سمعة على السلسلة مبنية على السلوك، لا على الهوية. يفتح السلوك المتسق والصادق رسوماً أقل وحدوداً أعلى ومقعداً في الحوكمة.',
    teamTitle: 'مبني بشفافية',
    teamBody: 'VFIDE مفتوح المصدر ومدقق ومبني بشفافية جذرية. كل عقد، كل قرار، كل مقايضة — موثق وعلى السلسلة.',
  },
  'de-DE': {
    title: 'Über VFIDE',
    subtitle: 'Ein Finanzprotokoll für Menschen, die ausgegrenzt wurden — nicht ausgenutzt',
    missionTitle: 'Unsere Mission',
    missionBody: 'VFIDE existiert, um das extraktive Modell der traditionellen Finanzen umzukehren. Wir bauen Infrastruktur, bei der Händler keine Bearbeitungsgebühren zahlen, Nutzer durch Verhalten Vertrauen aufbauen und keine einzelne Instanz — auch nicht wir — das Protokoll für immer kontrolliert.',
    feeInversionTitle: 'Gebühreninversion',
    feeInversionBody: 'Traditionelle Zahlungsabwickler berechnen Händlern 2–4 % pro Transaktion. VFIDE kehrt dies um: Händler zahlen null. Stattdessen tragen Token-zu-Token-Transfers verhaltensabhängige Gebühren (0,25–5 %), die Vertrauen belohnen und das Ökosystem finanzieren.',
    seerTitle: 'Die Seer-Verfassung',
    seerBody: 'Eine protokollweite Grundrechtserklärung für jeden Nutzer. Sie garantiert das Recht auf Einspruch, Berufung, Rückerstattung und Protokollausstieg — ohne Genehmigung einer Behörde.',
    keyBurnTitle: 'Entwicklerschlüssel-Verbrennung',
    keyBurnBody: 'Sechs Monate nach dem Mainnet-Launch werden die Entwickler-Admin-Schlüssel dauerhaft vernichtet. Kein Upgrade. Kein Rug-Pull. Das Protokoll wird vollständig autonom — im Besitz der Community.',
    proofScoreTitle: 'ProofScore',
    proofScoreBody: 'On-Chain-Reputation, die durch Verhalten aufgebaut wird, nicht durch Identität. Konsistentes, ehrliches Verhalten schaltet niedrigere Gebühren, höhere Limits und einen Platz in der Governance frei.',
    teamTitle: 'Öffentlich entwickelt',
    teamBody: 'VFIDE ist Open Source, geprüft und mit radikaler Transparenz entwickelt. Jeder Vertrag, jede Entscheidung, jeder Kompromiss — dokumentiert und on-chain.',
  },
};

// ─── SECURITY CENTER PAGE ─────────────────────────────────────────────────────

export interface SecurityCenterCopy {
  title: string;
  subtitle: string;
  connectPrompt: string;
  walletHealth: string;
  approvals: string;
  revokeAll: string;
  emergencyFreeze: string;
  guardians: string;
  addGuardian: string;
  twoFactor: string;
  activityLog: string;
  noThreats: string;
  threatsFound: string;
  scanButton: string;
}

const securityEn: SecurityCenterCopy = {
  title: 'Security Center',
  subtitle: 'Monitor and protect your VFIDE wallet and on-chain activity',
  connectPrompt: 'Connect your wallet to access Security Center',
  walletHealth: 'Wallet Health',
  approvals: 'Active Approvals',
  revokeAll: 'Revoke All',
  emergencyFreeze: 'Emergency Freeze',
  guardians: 'Guardians',
  addGuardian: 'Add Guardian',
  twoFactor: '2-Factor Auth',
  activityLog: 'Activity Log',
  noThreats: 'No threats detected',
  threatsFound: 'Threats detected — action required',
  scanButton: 'Run Security Scan',
};

export const SECURITY_CENTER_TRANSLATIONS: TranslationMap<SecurityCenterCopy> = {
  'en-US': securityEn,
  'en-GB': securityEn,
  'es-ES': {
    title: 'Centro de seguridad',
    subtitle: 'Monitorea y protege tu wallet VFIDE y tu actividad en cadena',
    connectPrompt: 'Conecta tu wallet para acceder al Centro de seguridad',
    walletHealth: 'Salud de la wallet',
    approvals: 'Aprobaciones activas',
    revokeAll: 'Revocar todo',
    emergencyFreeze: 'Congelación de emergencia',
    guardians: 'Guardianes',
    addGuardian: 'Añadir guardián',
    twoFactor: 'Autenticación de 2 factores',
    activityLog: 'Registro de actividad',
    noThreats: 'No se detectaron amenazas',
    threatsFound: 'Amenazas detectadas — acción requerida',
    scanButton: 'Ejecutar análisis de seguridad',
  },
  'fr-FR': {
    title: 'Centre de sécurité',
    subtitle: 'Surveillez et protégez votre portefeuille VFIDE et votre activité on-chain',
    connectPrompt: 'Connectez votre portefeuille pour accéder au Centre de sécurité',
    walletHealth: 'Santé du portefeuille',
    approvals: 'Approbations actives',
    revokeAll: 'Tout révoquer',
    emergencyFreeze: 'Gel d'urgence',
    guardians: 'Gardiens',
    addGuardian: 'Ajouter un gardien',
    twoFactor: 'Authentification à 2 facteurs',
    activityLog: 'Journal d'activité',
    noThreats: 'Aucune menace détectée',
    threatsFound: 'Menaces détectées — action requise',
    scanButton: 'Lancer une analyse de sécurité',
  },
  'ar-SA': {
    title: 'مركز الأمان',
    subtitle: 'راقب وحمِ محفظة VFIDE ونشاطك على السلسلة',
    connectPrompt: 'اربط محفظتك للوصول إلى مركز الأمان',
    walletHealth: 'صحة المحفظة',
    approvals: 'الموافقات النشطة',
    revokeAll: 'إلغاء الكل',
    emergencyFreeze: 'التجميد الطارئ',
    guardians: 'الحراس',
    addGuardian: 'إضافة حارس',
    twoFactor: 'المصادقة الثنائية',
    activityLog: 'سجل النشاط',
    noThreats: 'لم يتم اكتشاف أي تهديدات',
    threatsFound: 'تم اكتشاف تهديدات — يلزم اتخاذ إجراء',
    scanButton: 'تشغيل فحص الأمان',
  },
  'de-DE': {
    title: 'Sicherheitscenter',
    subtitle: 'Überwachen und schützen Sie Ihre VFIDE-Wallet und On-Chain-Aktivität',
    connectPrompt: 'Verbinden Sie Ihre Wallet, um auf das Sicherheitscenter zuzugreifen',
    walletHealth: 'Wallet-Gesundheit',
    approvals: 'Aktive Genehmigungen',
    revokeAll: 'Alle widerrufen',
    emergencyFreeze: 'Notfall-Einfrierung',
    guardians: 'Wächter',
    addGuardian: 'Wächter hinzufügen',
    twoFactor: '2-Faktor-Authentifizierung',
    activityLog: 'Aktivitätsprotokoll',
    noThreats: 'Keine Bedrohungen erkannt',
    threatsFound: 'Bedrohungen erkannt — Maßnahmen erforderlich',
    scanButton: 'Sicherheitsscan starten',
  },
};

// ─── STUB PAGE (shared for coming-soon pages) ─────────────────────────────────

export interface StubCopy {
  comingSoon: string;
  description: string;
  notifyMe: string;
  backToHome: string;
}

export const STUB_TRANSLATIONS: TranslationMap<StubCopy> = {
  'en-US': { comingSoon: 'Coming Soon', description: 'This feature is under active development and will be available on mainnet launch.', notifyMe: 'Notify Me', backToHome: 'Back to Home' },
  'en-GB': { comingSoon: 'Coming Soon', description: 'This feature is under active development and will be available on mainnet launch.', notifyMe: 'Notify Me', backToHome: 'Back to Home' },
  'es-ES': { comingSoon: 'Próximamente', description: 'Esta función está en desarrollo activo y estará disponible en el lanzamiento de la red principal.', notifyMe: 'Notifícame', backToHome: 'Volver al inicio' },
  'fr-FR': { comingSoon: 'Bientôt disponible', description: 'Cette fonctionnalité est en cours de développement et sera disponible au lancement sur le réseau principal.', notifyMe: 'Me notifier', backToHome: 'Retour à l'accueil' },
  'ar-SA': { comingSoon: 'قريباً', description: 'هذه الميزة قيد التطوير النشط وستكون متاحة عند إطلاق الشبكة الرئيسية.', notifyMe: 'أخبرني', backToHome: 'العودة للرئيسية' },
  'de-DE': { comingSoon: 'Demnächst verfügbar', description: 'Diese Funktion befindet sich in aktiver Entwicklung und wird beim Mainnet-Launch verfügbar sein.', notifyMe: 'Benachrichtigen', backToHome: 'Zurück zur Startseite' },
};

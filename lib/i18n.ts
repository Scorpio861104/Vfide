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
  'ar-SA': {
    liveBadge: 'مدفوعات قائمة على درجة الثقة · متوفرة الآن على Base',
    heroPrefix: 'احتفظ بما',
    heroAccent: 'تكسبه',
    heroDescription: 'صفر رسوم على التجار. حفظ ذاتي محمي بالأوصياء. سمعة تكافئك. مبني لكل من نسيتهم المنصات.',
    trustPoints: [
      'بدون وصاية: مفاتيحك، أموالك',
      'عقود مفتوحة المصدر على Base',
      'استرداد متعدد التواقيع عبر الأوصياء',
      'سجل تدقيق على السلسلة لكل معاملة',
    ],
    primaryCta: 'ابدأ البيع',
    secondaryCta: 'تصفح السوق',
    sliderHint: 'جرّب المؤشر — اسحب درجة الثقة وشاهد منحنى الرسوم يتغير في الوقت الفعلي.',
    statsKicker: 'إحصاءات البروتوكول',
    statsTitlePrefix: 'أرقام',
    statsTitleAccent: 'تهمّ',
    merchantFeesLabel: 'رسوم التجار',
    maxProofScoreLabel: 'أقصى درجة إثبات',
    burnRateLabel: 'معدل الحرق',
    sanctumFundLabel: 'صندوق Sanctum',
  },
  'hi-IN': {
    liveBadge: 'ट्रस्ट-स्कोर भुगतान · अब Base पर',
    heroPrefix: 'जो आप',
    heroAccent: 'कमाते हैं',
    heroDescription: 'शून्य व्यापारी शुल्क। गार्डियन-संरक्षित स्व-अभिरक्षा। ऐसी प्रतिष्ठा जो आपको लौटाती है। उन सबके लिए बनाया गया जिन्हें प्लेटफ़ॉर्म भूल गए।',
    trustPoints: [
      'नॉन-कस्टोडियल: आपकी चाबियाँ, आपके सिक्के',
      'Base पर ओपन-सोर्स कॉन्ट्रैक्ट',
      'गार्डियन मल्टी-सिग रिकवरी',
      'हर लेनदेन के लिए ऑन-चेन ऑडिट ट्रेल',
    ],
    primaryCta: 'बेचना शुरू करें',
    secondaryCta: 'मार्केटप्लेस देखें',
    sliderHint: 'स्लाइडर आज़माएँ — अपना ट्रस्ट स्कोर खींचें और शुल्क वक्र को वास्तविक समय में बदलते देखें।',
    statsKicker: 'प्रोटोकॉल आँकड़े',
    statsTitlePrefix: 'वे संख्याएँ जो',
    statsTitleAccent: 'मायने रखती हैं',
    merchantFeesLabel: 'व्यापारी शुल्क',
    maxProofScoreLabel: 'अधिकतम ProofScore',
    burnRateLabel: 'बर्न दर',
    sanctumFundLabel: 'Sanctum फंड',
  },
  'sw-KE': {
    liveBadge: 'Malipo Yenye Alama ya Kuaminika · Sasa kwenye Base',
    heroPrefix: 'Weka kile',
    heroAccent: 'unachopata',
    heroDescription: 'Hakuna ada za wafanyabiashara. Uhifadhi binafsi unaolindwa na walinzi. Sifa inayokulipa. Imejengwa kwa kila mtu ambaye majukwaa walimsahau.',
    trustPoints: [
      'Bila uangalizi: funguo zako, sarafu zako',
      'Mikataba ya chanzo huria kwenye Base',
      'Urejeshaji wa sahihi nyingi kupitia walinzi',
      'Rekodi ya ukaguzi kwenye mnyororo kwa kila muamala',
    ],
    primaryCta: 'Anza kuuza',
    secondaryCta: 'Vinjari soko',
    sliderHint: 'Jaribu kitelezi — vuta alama yako ya kuaminika na uone mkondo wa ada ukibadilika papo hapo.',
    statsKicker: 'Takwimu za protokoli',
    statsTitlePrefix: 'Namba',
    statsTitleAccent: 'muhimu',
    merchantFeesLabel: 'Ada za wafanyabiashara',
    maxProofScoreLabel: 'ProofScore ya juu',
    burnRateLabel: 'Kiwango cha kuchoma',
    sanctumFundLabel: 'Mfuko wa Sanctum',
  },
  'ha-NG': {
    liveBadge: 'Biyan Kuɗi Bisa Maki na Aminci · Yanzu akan Base',
    heroPrefix: 'Ka riƙe abin da kake',
    heroAccent: 'samu',
    heroDescription: 'Babu kuɗin ɗan kasuwa. Ajiyar kai da masu kāre ke kārewa. Suna da ke biyan ka. An gina shi don kowa da dandamali suka manta.',
    trustPoints: [
      'Ba tare da riƙo ba: makullanka, kuɗinka',
      'Kwangiloli na buɗaɗɗen tushe akan Base',
      'Dawowa ta sa-hannu masu yawa ta masu kāre',
      'Bayanan duba kan sarkar don kowane mu’amala',
    ],
    primaryCta: 'Fara sayarwa',
    secondaryCta: 'Bincika kasuwa',
    sliderHint: 'Gwada zamewa — ja makin amincinka ka ga yadda layin kuɗi ke sauyawa nan take.',
    statsKicker: 'Ƙididdigar yarjejeniya',
    statsTitlePrefix: 'Lambobi masu',
    statsTitleAccent: 'muhimmanci',
    merchantFeesLabel: 'Kuɗin ɗan kasuwa',
    maxProofScoreLabel: 'Mafi girman ProofScore',
    burnRateLabel: 'Yawan ƙonewa',
    sanctumFundLabel: 'Asusun Sanctum',
  },
  'pt-BR': {
    liveBadge: 'Pagamentos com pontuação de confiança · Agora na Base',
    heroPrefix: 'Fique com o que',
    heroAccent: 'você ganha',
    heroDescription: 'Zero taxas para comerciantes. Autocustódia protegida por guardians. Reputação que retribui. Feito para todos que as plataformas esqueceram.',
    trustPoints: [
      'Sem custódia: suas chaves, suas moedas',
      'Contratos de código aberto na Base',
      'Recuperação multi-assinatura com guardians',
      'Trilha de auditoria on-chain para cada transação',
    ],
    primaryCta: 'Começar a vender',
    secondaryCta: 'Explorar marketplace',
    sliderHint: 'Experimente o controle — arraste sua pontuação de confiança e veja a curva de taxas responder em tempo real.',
    statsKicker: 'Estatísticas do protocolo',
    statsTitlePrefix: 'Números que',
    statsTitleAccent: 'importam',
    merchantFeesLabel: 'Taxas de comerciantes',
    maxProofScoreLabel: 'ProofScore máximo',
    burnRateLabel: 'Taxa de queima',
    sanctumFundLabel: 'Fundo Sanctum',
  },
  'fil-PH': {
    liveBadge: 'Mga Bayad na May Trust Score · Nasa Base na',
    heroPrefix: 'Panatilihin ang',
    heroAccent: 'kinikita mo',
    heroDescription: 'Walang bayarin ang merchant. Self-custody na protektado ng guardian. Reputasyong may kabayaran. Ginawa para sa lahat ng nakalimutan ng mga platform.',
    trustPoints: [
      'Non-custodial: iyong mga susi, iyong pera',
      'Open-source na kontrata sa Base',
      'Guardian multi-sig recovery',
      'On-chain audit trail sa bawat transaksyon',
    ],
    primaryCta: 'Magsimulang magbenta',
    secondaryCta: 'Mag-browse ng marketplace',
    sliderHint: 'Subukan ang slider — i-drag ang iyong trust score at panoorin ang fee curve na tumugon nang real time.',
    statsKicker: 'Mga istatistika ng protocol',
    statsTitlePrefix: 'Mga numerong',
    statsTitleAccent: 'mahalaga',
    merchantFeesLabel: 'Bayarin ng Merchant',
    maxProofScoreLabel: 'Max ProofScore',
    burnRateLabel: 'Burn Rate',
    sanctumFundLabel: 'Sanctum Fund',
  },
  'id-ID': {
    liveBadge: 'Pembayaran Berbasis Skor Kepercayaan · Kini di Base',
    heroPrefix: 'Simpan apa yang',
    heroAccent: 'Anda hasilkan',
    heroDescription: 'Nol biaya pedagang. Penyimpanan mandiri yang dilindungi guardian. Reputasi yang membayar Anda kembali. Dibuat untuk semua yang dilupakan platform.',
    trustPoints: [
      'Non-kustodian: kunci Anda, koin Anda',
      'Kontrak sumber terbuka di Base',
      'Pemulihan multi-tanda tangan via guardian',
      'Jejak audit on-chain untuk setiap transaksi',
    ],
    primaryCta: 'Mulai berjualan',
    secondaryCta: 'Jelajahi marketplace',
    sliderHint: 'Coba slider — geser skor kepercayaan Anda dan lihat kurva biaya merespons secara real time.',
    statsKicker: 'Statistik protokol',
    statsTitlePrefix: 'Angka yang',
    statsTitleAccent: 'berarti',
    merchantFeesLabel: 'Biaya Pedagang',
    maxProofScoreLabel: 'ProofScore Maks',
    burnRateLabel: 'Laju Burn',
    sanctumFundLabel: 'Dana Sanctum',
  },
  'th-TH': {
    liveBadge: 'การชำระเงินที่ให้คะแนนความน่าเชื่อถือ · พร้อมใช้บน Base แล้ว',
    heroPrefix: 'เก็บสิ่งที่',
    heroAccent: 'คุณหามาได้',
    heroDescription: 'ไม่มีค่าธรรมเนียมร้านค้า การเก็บรักษาด้วยตนเองที่ปกป้องโดยผู้พิทักษ์ ชื่อเสียงที่ตอบแทนคุณ สร้างมาเพื่อทุกคนที่แพลตฟอร์มลืม',
    trustPoints: [
      'ไม่ฝากดูแล: กุญแจของคุณ เหรียญของคุณ',
      'สัญญาโอเพนซอร์สบน Base',
      'การกู้คืนแบบหลายลายเซ็นผ่านผู้พิทักษ์',
      'บันทึกตรวจสอบบนเชนสำหรับทุกธุรกรรม',
    ],
    primaryCta: 'เริ่มขาย',
    secondaryCta: 'เลือกดูมาร์เก็ตเพลส',
    sliderHint: 'ลองเลื่อนแถบ — ลากคะแนนความน่าเชื่อถือของคุณและดูเส้นโค้งค่าธรรมเนียมตอบสนองแบบเรียลไทม์',
    statsKicker: 'สถิติโปรโตคอล',
    statsTitlePrefix: 'ตัวเลขที่',
    statsTitleAccent: 'สำคัญ',
    merchantFeesLabel: 'ค่าธรรมเนียมร้านค้า',
    maxProofScoreLabel: 'ProofScore สูงสุด',
    burnRateLabel: 'อัตราการเผา',
    sanctumFundLabel: 'กองทุน Sanctum',
  },
  'ja-JP': {
    liveBadge: '信用スコア型決済 · Base で利用可能に',
    heroPrefix: 'あなたが',
    heroAccent: '稼いだものを守る',
    heroDescription: '加盟店手数料ゼロ。ガーディアンが守るセルフカストディ。あなたに還元される評価。プラットフォームが見落とした全ての人のために。',
    trustPoints: [
      'ノンカストディアル：鍵もコインもあなたのもの',
      'Base 上のオープンソース契約',
      'ガーディアンによるマルチシグ復元',
      '全取引のオンチェーン監査証跡',
    ],
    primaryCta: '販売を始める',
    secondaryCta: 'マーケットプレイスを見る',
    sliderHint: 'スライダーを試す — 信用スコアをドラッグして、手数料カーブがリアルタイムで変化する様子を見てください。',
    statsKicker: 'プロトコル統計',
    statsTitlePrefix: '意味のある',
    statsTitleAccent: '数字',
    merchantFeesLabel: '加盟店手数料',
    maxProofScoreLabel: '最大 ProofScore',
    burnRateLabel: 'バーンレート',
    sanctumFundLabel: 'Sanctum ファンド',
  },
  'zh-CN': {
    liveBadge: '信任评分支付 · 现已登陆 Base',
    heroPrefix: '留住你所',
    heroAccent: '赚取的',
    heroDescription: '零商家手续费。守护者保护的自托管。回报于你的信誉。为每一个被平台遗忘的人而打造。',
    trustPoints: [
      '非托管：你的密钥，你的代币',
      'Base 上的开源合约',
      '守护者多签恢复',
      '每笔交易的链上审计记录',
    ],
    primaryCta: '开始销售',
    secondaryCta: '浏览市场',
    sliderHint: '试试滑块——拖动你的信任评分，实时观察手续费曲线的变化。',
    statsKicker: '协议统计',
    statsTitlePrefix: '重要的',
    statsTitleAccent: '数字',
    merchantFeesLabel: '商家手续费',
    maxProofScoreLabel: '最高 ProofScore',
    burnRateLabel: '销毁率',
    sanctumFundLabel: 'Sanctum 基金',
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

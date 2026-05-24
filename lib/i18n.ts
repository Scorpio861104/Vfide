import { safeLocalStorage } from '@/lib/utils';

export const SUPPORTED_LOCALES = ['en-US', 'en-GB', 'es-ES', 'fr-FR', 'de-DE', 'ar-SA', 'fil-PH', 'hi-IN', 'id-ID', 'th-TH', 'ja-JP', 'zh-CN'] as const;
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
  { value: 'hi-IN', label: 'हिन्दी' },
  { value: 'id-ID', label: 'Bahasa Indonesia' },
  { value: 'th-TH', label: 'ไทย' },
  { value: 'ja-JP', label: '日本語' },
  { value: 'zh-CN', label: '中文' },
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
  'fil-PH': { badge: '24/7 Suporta', heading: 'Help & Support Center', description: 'Hanapin ang mga sagot sa mga karaniwang tanong o mag-open ng support ticket. Nandito ang aming team para tulungan ka.', languageLabel: 'Wika', faqTitle: 'FAQ at Mga Gabay', faqDescription: 'I-browse ang mga karaniwang tanong at tutorial', ticketsTitle: 'Mga Ticket Ko', ticketsDescription: 'Tingnan at pamahalaan ang iyong mga kahilingan sa suporta', activeSuffix: 'aktibo', newTicketTitle: 'Bagong Ticket', newTicketDescription: 'Gumawa ng bagong kahilingan sa suporta', searchPlaceholder: 'Maghanap ng mga sagot...' },
  'hi-IN':  { badge: '24/7 सहायता', heading: 'सहायता केंद्र', description: 'सामान्य प्रश्नों के उत्तर खोजें या सहायता टिकट खोलें। हमारी टीम किसी भी समस्या में आपकी मदद के लिए यहाँ है।', languageLabel: 'भाषा', faqTitle: 'FAQ और गाइड', faqDescription: 'सामान्य प्रश्न और ट्यूटोरियल ब्राउज़ करें', ticketsTitle: 'मेरे टिकट', ticketsDescription: 'अपने सहायता अनुरोध देखें और प्रबंधित करें', activeSuffix: 'सक्रिय', newTicketTitle: 'नया टिकट', newTicketDescription: 'नया सहायता अनुरोध बनाएं', searchPlaceholder: 'उत्तर खोजें...' },
  'id-ID':  { badge: 'Dukungan 24/7', heading: 'Pusat Bantuan & Dukungan', description: 'Temukan jawaban atas pertanyaan umum atau buka tiket dukungan. Tim kami siap membantu Anda.', languageLabel: 'Bahasa', faqTitle: 'FAQ & Panduan', faqDescription: 'Telusuri pertanyaan umum dan tutorial', ticketsTitle: 'Tiket Saya', ticketsDescription: 'Lihat dan kelola permintaan dukungan Anda', activeSuffix: 'aktif', newTicketTitle: 'Tiket Baru', newTicketDescription: 'Buat permintaan dukungan baru', searchPlaceholder: 'Cari jawaban...' },
  'th-TH':  { badge: 'การสนับสนุน 24/7', heading: 'ศูนย์ช่วยเหลือและสนับสนุน', description: 'ค้นหาคำตอบสำหรับคำถามทั่วไปหรือเปิดตั๋วสนับสนุน ทีมของเราพร้อมช่วยเหลือคุณในทุกปัญหา', languageLabel: 'ภาษา', faqTitle: 'คำถามที่พบบ่อยและคู่มือ', faqDescription: 'เรียกดูคำถามทั่วไปและบทช่วยสอน', ticketsTitle: 'ตั๋วของฉัน', ticketsDescription: 'ดูและจัดการคำขอสนับสนุนของคุณ', activeSuffix: 'ที่ใช้งานอยู่', newTicketTitle: 'ตั๋วใหม่', newTicketDescription: 'สร้างคำขอสนับสนุนใหม่', searchPlaceholder: 'ค้นหาคำตอบ...' },
  'ja-JP':  { badge: '24時間365日サポート', heading: 'ヘルプ＆サポートセンター', description: 'よくある質問の回答を見つけるか、サポートチケットを開いてください。チームがあらゆる問題をサポートします。', languageLabel: '言語', faqTitle: 'FAQ＆ガイド', faqDescription: 'よくある質問とチュートリアルを閲覧', ticketsTitle: '私のチケット', ticketsDescription: 'サポートリクエストを表示・管理する', activeSuffix: 'アクティブ', newTicketTitle: '新しいチケット', newTicketDescription: '新しいサポートリクエストを作成する', searchPlaceholder: '回答を検索...' },
  'zh-CN':  { badge: '全天候支持', heading: '帮助与支持中心', description: '查找常见问题的解答或提交支持工单。我们的团队随时为您提供帮助。', languageLabel: '语言', faqTitle: '常见问题与指南', faqDescription: '浏览常见问题和教程', ticketsTitle: '我的工单', ticketsDescription: '查看和管理您的支持请求', activeSuffix: '进行中', newTicketTitle: '新建工单', newTicketDescription: '创建新的支持请求', searchPlaceholder: '搜索答案...' },
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
  'fil-PH': { },  // English fallback
  'hi-IN': { },  // English fallback
  'id-ID': { },  // English fallback
  'th-TH': { },  // English fallback
  'ja-JP': { },  // English fallback
  'zh-CN': { },  // English fallback
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
    homeAriaShop: 'Comprar en VFIDE — explorar el mercado',
    homeAriaSell: 'Vender en VFIDE — configurar una tienda',
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
    homeAriaShop: 'Acheter sur VFIDE — parcourir le marché',
    homeAriaSell: 'Vendre sur VFIDE — créer une boutique',
    docsCta: 'Lire la documentation',
  },
  'fil-PH': {
    languageLabel: 'Wika',
    liveBadge: 'Live na sa Base',
    heroTitle: 'Tanggapin ang Crypto.',
    heroAccent: 'Zero Bayad.',
    heroDescription: 'Ang unang payment protocol na walang processing fee para sa mga merchant. Ang mga token transfer ay may behavioral fee (0.25–5%) na nagbibigay-gantimpala sa tiwala. Pagmamay-ari ang iyong pondo at buuin ang ProofScore para sa mas mababang bayad.',
    valueProps: ['Magbayad', 'Bumuo ng Tiwala', 'I-unlock ang Gantimpala'],
    primaryCta: 'Magsimula',
    secondaryCta: 'Tuklasin ang Flashloans P2P',
    contractsBadge: '14 na Kontratong Na-deploy',
    auditBadge: 'Na-audit at Open Source',
    settlementBadge: 'Instant na Settlement',
    chainBadge: 'Para sa Base • Polygon • zkSync',
    finalTitle: 'Handa ka na bang Pagmamay-ari ang iyong Bayad?',
    finalDescription: 'Sumali sa libu-libong merchant at user na nagtatayo ng tiwala sa VFIDE.',
    launchApp: 'Ilunsad ang App',
    homeAriaShop: 'Mamili sa VFIDE — i-browse ang marketplace',
    homeAriaSell: 'Magbenta sa VFIDE — mag-set up ng tindahan',
    docsCta: 'Basahin ang Dokumentasyon',
  },
  'hi-IN': {
    languageLabel: 'भाषा',
    liveBadge: 'अब Base पर लाइव',
    heroTitle: 'क्रिप्टो स्वीकार करें।',
    heroAccent: 'शून्य शुल्क।',
    heroDescription: 'पहला भुगतान प्रोटोकॉल जहाँ व्यापारी शून्य प्रसंस्करण शुल्क देते हैं। टोकन ट्रांसफर पर व्यवहार-आधारित शुल्क (0.25–5%) लगता है जो विश्वास को पुरस्कृत करता है।',
    valueProps: ['भुगतान करें', 'विश्वास बनाएं', 'पुरस्कार अनलॉक करें'],
    primaryCta: 'शुरू करें',
    secondaryCta: 'Flashloans P2P एक्सप्लोर करें',
    contractsBadge: '14 कॉन्ट्रैक्ट तैनात',
    auditBadge: 'ऑडिट किया और ओपन सोर्स',
    settlementBadge: 'तत्काल निपटान',
    chainBadge: 'Base • Polygon • zkSync के लिए',
    finalTitle: 'अपने भुगतान का स्वामित्व लेने के लिए तैयार हैं?',
    finalDescription: 'हजारों व्यापारियों और उपयोगकर्ताओं से जुड़ें जो VFIDE पर विश्वास बना रहे हैं।',
    launchApp: 'ऐप लॉन्च करें',
    homeAriaShop: 'VFIDE पर खरीदें — मार्केटप्लेस ब्राउज़ करें',
    homeAriaSell: 'VFIDE पर बेचें — दुकान सेट अप करें',
    docsCta: 'दस्तावेज़ पढ़ें',
  },
  'id-ID': {
    languageLabel: 'Bahasa',
    liveBadge: 'Kini Hadir di Base',
    heroTitle: 'Terima Kripto.',
    heroAccent: 'Nol Biaya.',
    heroDescription: 'Protokol pembayaran pertama di mana merchant membayar nol biaya pemrosesan. Transfer token dikenakan biaya perilaku (0,25–5%) yang memberi penghargaan atas kepercayaan.',
    valueProps: ['Bayar', 'Bangun Kepercayaan', 'Buka Hadiah'],
    primaryCta: 'Mulai',
    secondaryCta: 'Jelajahi Flashloans P2P',
    contractsBadge: '14 Kontrak Diterapkan',
    auditBadge: 'Diaudit & Sumber Terbuka',
    settlementBadge: 'Penyelesaian Instan',
    chainBadge: 'Dibangun untuk Base • Polygon • zkSync',
    finalTitle: 'Siap Memiliki Pembayaran Anda?',
    finalDescription: 'Bergabunglah dengan ribuan merchant dan pengguna yang membangun kepercayaan di VFIDE.',
    launchApp: 'Luncurkan Aplikasi',
    homeAriaShop: 'Belanja di VFIDE — jelajahi marketplace',
    homeAriaSell: 'Jual di VFIDE — siapkan toko',
    docsCta: 'Baca Dokumentasi',
  },
  'th-TH': {
    languageLabel: 'ภาษา',
    liveBadge: 'เปิดตัวบน Base แล้ว',
    heroTitle: 'รับชำระด้วยคริปโต',
    heroAccent: 'ไม่มีค่าธรรมเนียม',
    heroDescription: 'โปรโตคอลการชำระเงินแรกที่ผู้ค้าไม่ต้องจ่ายค่าธรรมเนียมการประมวลผล การโอนโทเค็นมีค่าธรรมเนียมตามพฤติกรรม (0.25–5%) ที่ตอบแทนความน่าเชื่อถือ',
    valueProps: ['ชำระเงิน', 'สร้างความไว้วางใจ', 'ปลดล็อกรางวัล'],
    primaryCta: 'เริ่มต้น',
    secondaryCta: 'สำรวจ Flashloans P2P',
    contractsBadge: 'สัญญา 14 รายการที่ติดตั้งแล้ว',
    auditBadge: 'ตรวจสอบแล้ว & โอเพนซอร์ส',
    settlementBadge: 'ชำระทันที',
    chainBadge: 'สร้างสำหรับ Base • Polygon • zkSync',
    finalTitle: 'พร้อมเป็นเจ้าของการชำระเงินของคุณแล้วหรือยัง?',
    finalDescription: 'เข้าร่วมกับผู้ค้าและผู้ใช้หลายพันรายที่สร้างความไว้วางใจบน VFIDE',
    launchApp: 'เปิดแอป',
    homeAriaShop: 'ช้อปบน VFIDE — เรียกดูมาร์เก็ตเพลส',
    homeAriaSell: 'ขายบน VFIDE — ตั้งค่าร้านค้า',
    docsCta: 'อ่านเอกสาร',
  },
  'ja-JP': {
    languageLabel: '言語',
    liveBadge: 'Baseで稼働中',
    heroTitle: '暗号通貨を受け取る。',
    heroAccent: '手数料ゼロ。',
    heroDescription: '加盟店が処理手数料をゼロで済む初めての決済プロトコル。トークン送金には信頼を報酬とする行動ベースの手数料（0.25〜5%）が適用されます。',
    valueProps: ['支払う', '信頼を築く', '報酬を解放'],
    primaryCta: '始める',
    secondaryCta: 'Flashloans P2Pを探る',
    contractsBadge: '14のコントラクトをデプロイ済み',
    auditBadge: '監査済み＆オープンソース',
    settlementBadge: '即時決済',
    chainBadge: 'Base・Polygon・zkSync対応',
    finalTitle: '自分の決済を所有する準備はできていますか？',
    finalDescription: 'VFIDEで信頼を築いている何千もの加盟店とユーザーに参加しましょう。',
    launchApp: 'アプリを起動',
    homeAriaShop: 'VFIDEで買い物 — マーケットプレイスを見る',
    homeAriaSell: 'VFIDEで販売 — ショップを設定',
    docsCta: 'ドキュメントを読む',
  },
  'zh-CN': {
    languageLabel: '语言',
    liveBadge: '现已在 Base 上线',
    heroTitle: '接受加密货币。',
    heroAccent: '零手续费。',
    heroDescription: '首个商家零处理费的支付协议。代币转账采用行为手续费（0.25–5%），以信任换取奖励。拥有您的资金，构建 ProofScore 解锁更低费率。',
    valueProps: ['支付', '建立信任', '解锁奖励'],
    primaryCta: '立即开始',
    secondaryCta: '探索 Flashloans P2P',
    contractsBadge: '已部署 14 个合约',
    auditBadge: '已审计 & 开源',
    settlementBadge: '即时结算',
    chainBadge: '支持 Base • Polygon • zkSync',
    finalTitle: '准备好拥有您的支付了吗？',
    finalDescription: '加入数千名在 VFIDE 上建立信任的商家和用户。',
    launchApp: '启动应用',
    homeAriaShop: '在 VFIDE 购物 — 浏览市场',
    homeAriaSell: '在 VFIDE 出售 — 设置商店',
    docsCta: '阅读文档',
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
    homeAriaShop: 'تسوق على VFIDE — تصفح السوق',
    homeAriaSell: 'بيع على VFIDE — إعداد متجر',
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
    homeAriaShop: 'Bei VFIDE einkaufen — Marktplatz erkunden',
    homeAriaSell: 'Bei VFIDE verkaufen — Shop einrichten',
    docsCta: 'Dokumentation lesen',
  },
  'fil-PH': { },  // English fallback
  'hi-IN': { },  // English fallback
  'id-ID': { },  // English fallback
  'th-TH': { },  // English fallback
  'ja-JP': { },  // English fallback
  'zh-CN': { },  // English fallback
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
  'fil-PH': { home: 'Tahanan', pay: 'Bayad', merchant: 'Tindahan', social: 'Sosyal', more: 'Higit pa', close: 'Isara', search: 'Hanapin kahit saan…', openHub: 'Buksan ang buong hub' },
  'hi-IN':  { home: 'होम', pay: 'भुगतान', merchant: 'दुकान', social: 'सामाजिक', more: 'अधिक', close: 'बंद करें', search: 'कहीं भी खोजें…', openHub: 'पूरा हब खोलें' },
  'id-ID':  { home: 'Beranda', pay: 'Bayar', merchant: 'Toko', social: 'Sosial', more: 'Lainnya', close: 'Tutup', search: 'Cari di mana saja…', openHub: 'Buka hub lengkap' },
  'th-TH':  { home: 'หน้าหลัก', pay: 'ชำระเงิน', merchant: 'ร้านค้า', social: 'โซเชียล', more: 'เพิ่มเติม', close: 'ปิด', search: 'ค้นหาทุกที่…', openHub: 'เปิดฮับทั้งหมด' },
  'ja-JP':  { home: 'ホーム', pay: '支払い', merchant: 'ショップ', social: 'ソーシャル', more: 'もっと見る', close: '閉じる', search: 'どこでも検索…', openHub: 'フルハブを開く' },
  'zh-CN':  { home: '首页', pay: '支付', merchant: '商店', social: '社交', more: '更多', close: '关闭', search: '随处搜索…', openHub: '打开完整面板' },
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
  'fil-PH': { title: 'Magpadala ng Bayad', subtitle: 'Magpadala ng VFIDE sa anumang wallet address o ENS name', recipientLabel: 'Tatanggap', recipientPlaceholder: '0x… o name.eth', amountLabel: 'Halaga', amountPlaceholder: '0.00', noteLabel: 'Tala (opsyonal)', notePlaceholder: 'Para saan ito?', submitButton: 'Suriin ang Bayad', connectWallet: 'I-connect ang Wallet para Magpadala', preview: 'Preview ng Bayad', feeLabel: 'Protocol Fee', totalLabel: 'Kabuuan', confirmButton: 'Kumpirmahin at Ipadala', cancelButton: 'Kanselahin', successTitle: 'Naipadala na ang Bayad', successDescription: 'Ang iyong bayad ay naisumite sa network.' },
  'hi-IN':  { title: 'भुगतान भेजें', subtitle: 'किसी भी वॉलेट पते या ENS नाम पर VFIDE भेजें', recipientLabel: 'प्राप्तकर्ता', recipientPlaceholder: '0x… या name.eth', amountLabel: 'राशि', amountPlaceholder: '0.00', noteLabel: 'नोट (वैकल्पिक)', notePlaceholder: 'यह किसलिए है?', submitButton: 'भुगतान की समीक्षा करें', connectWallet: 'भेजने के लिए वॉलेट कनेक्ट करें', preview: 'भुगतान पूर्वावलोकन', feeLabel: 'प्रोटोकॉल शुल्क', totalLabel: 'कुल', confirmButton: 'पुष्टि करें और भेजें', cancelButton: 'रद्द करें', successTitle: 'भुगतान भेजा गया', successDescription: 'आपका भुगतान नेटवर्क पर सबमिट हो गया।' },
  'id-ID':  { title: 'Kirim Pembayaran', subtitle: 'Kirim VFIDE ke alamat wallet atau nama ENS mana pun', recipientLabel: 'Penerima', recipientPlaceholder: '0x… atau name.eth', amountLabel: 'Jumlah', amountPlaceholder: '0,00', noteLabel: 'Catatan (opsional)', notePlaceholder: 'Untuk apa ini?', submitButton: 'Tinjau Pembayaran', connectWallet: 'Hubungkan Wallet untuk Mengirim', preview: 'Pratinjau Pembayaran', feeLabel: 'Biaya Protokol', totalLabel: 'Total', confirmButton: 'Konfirmasi & Kirim', cancelButton: 'Batal', successTitle: 'Pembayaran Terkirim', successDescription: 'Pembayaran Anda telah dikirimkan ke jaringan.' },
  'th-TH':  { title: 'ส่งการชำระเงิน', subtitle: 'ส่ง VFIDE ไปยังที่อยู่กระเป๋าหรือชื่อ ENS ใดก็ได้', recipientLabel: 'ผู้รับ', recipientPlaceholder: '0x… หรือ name.eth', amountLabel: 'จำนวน', amountPlaceholder: '0.00', noteLabel: 'หมายเหตุ (ไม่บังคับ)', notePlaceholder: 'นี่เพื่ออะไร?', submitButton: 'ตรวจสอบการชำระเงิน', connectWallet: 'เชื่อมต่อกระเป๋าเพื่อส่ง', preview: 'ตัวอย่างการชำระเงิน', feeLabel: 'ค่าธรรมเนียมโปรโตคอล', totalLabel: 'รวม', confirmButton: 'ยืนยันและส่ง', cancelButton: 'ยกเลิก', successTitle: 'ส่งการชำระเงินแล้ว', successDescription: 'การชำระเงินของคุณถูกส่งไปยังเครือข่ายแล้ว' },
  'ja-JP':  { title: '送金', subtitle: '任意のウォレットアドレスまたはENS名にVFIDEを送る', recipientLabel: '受取人', recipientPlaceholder: '0x… または name.eth', amountLabel: '金額', amountPlaceholder: '0.00', noteLabel: 'メモ（任意）', notePlaceholder: '何のための支払いですか？', submitButton: '支払いを確認', connectWallet: '送金するにはウォレットを接続してください', preview: '支払いプレビュー', feeLabel: 'プロトコル手数料', totalLabel: '合計', confirmButton: '確認して送金', cancelButton: 'キャンセル', successTitle: '送金完了', successDescription: '支払いがネットワークに送信されました。' },
  'zh-CN':  { title: '发送付款', subtitle: '向任意钱包地址或 ENS 名称发送 VFIDE', recipientLabel: '收款人', recipientPlaceholder: '0x… 或 name.eth', amountLabel: '金额', amountPlaceholder: '0.00', noteLabel: '备注（可选）', notePlaceholder: '这笔款项用于？', submitButton: '审核付款', connectWallet: '连接钱包以发送', preview: '付款预览', feeLabel: '协议费用', totalLabel: '总计', confirmButton: '确认并发送', cancelButton: '取消', successTitle: '付款已发送', successDescription: '您的付款已提交至网络。' },
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
  'fil-PH': { },  // English fallback
  'hi-IN': { },  // English fallback
  'id-ID': { },  // English fallback
  'th-TH': { },  // English fallback
  'ja-JP': { },  // English fallback
  'zh-CN': { },  // English fallback
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
  'fil-PH': { title: 'ProofScore', subtitle: 'Ang iyong on-chain na reputasyon — binuo ng ugali, hindi pagkakakilanlan', connectPrompt: 'I-connect ang iyong wallet para makita ang ProofScore', currentScore: 'Kasalukuyang Score', tier: 'Antas', breakdown: 'Breakdown ng Score', history: 'Kasaysayan ng Score', improve: 'Paano Mapabuti', howItWorks: 'Paano Gumagana ang ProofScore', tierNames: ['Bago', 'Pinagkakatiwalaan', 'Naitatag', 'Napatunayan', 'Seer'] },
  'hi-IN':  { title: 'ProofScore', subtitle: 'आपकी ऑन-चेन प्रतिष्ठा — व्यवहार से बनी, पहचान से नहीं', connectPrompt: 'अपना ProofScore देखने के लिए वॉलेट कनेक्ट करें', currentScore: 'वर्तमान स्कोर', tier: 'स्तर', breakdown: 'स्कोर विवरण', history: 'स्कोर इतिहास', improve: 'कैसे सुधारें', howItWorks: 'ProofScore कैसे काम करता है', tierNames: ['नया', 'विश्वसनीय', 'स्थापित', 'सत्यापित', 'Seer'] },
  'id-ID':  { title: 'ProofScore', subtitle: 'Reputasi on-chain Anda — dibangun dari perilaku, bukan identitas', connectPrompt: 'Hubungkan wallet Anda untuk melihat ProofScore', currentScore: 'Skor Saat Ini', tier: 'Tingkat', breakdown: 'Rincian Skor', history: 'Riwayat Skor', improve: 'Cara Meningkatkan', howItWorks: 'Cara Kerja ProofScore', tierNames: ['Baru', 'Terpercaya', 'Mapan', 'Terverifikasi', 'Seer'] },
  'th-TH':  { title: 'ProofScore', subtitle: 'ชื่อเสียงบนเชนของคุณ — สร้างจากพฤติกรรม ไม่ใช่ตัวตน', connectPrompt: 'เชื่อมต่อกระเป๋าเพื่อดู ProofScore', currentScore: 'คะแนนปัจจุบัน', tier: 'ระดับ', breakdown: 'รายละเอียดคะแนน', history: 'ประวัติคะแนน', improve: 'วิธีปรับปรุง', howItWorks: 'ProofScore ทำงานอย่างไร', tierNames: ['ใหม่', 'น่าเชื่อถือ', 'มั่นคง', 'ได้รับการยืนยัน', 'Seer'] },
  'ja-JP':  { title: 'ProofScore', subtitle: 'あなたのオンチェーン評判 — 行動で築き、アイデンティティではない', connectPrompt: 'ProofScoreを確認するにはウォレットを接続してください', currentScore: '現在のスコア', tier: 'ティア', breakdown: 'スコア内訳', history: 'スコア履歴', improve: '改善方法', howItWorks: 'ProofScoreの仕組み', tierNames: ['新規', '信頼済み', '確立済み', '認証済み', 'Seer'] },
  'zh-CN':  { title: 'ProofScore', subtitle: '您的链上声誉 — 以行为构建，而非身份', connectPrompt: '连接钱包以查看您的 ProofScore', currentScore: '当前分数', tier: '等级', breakdown: '分数明细', history: '分数历史', improve: '如何提升', howItWorks: 'ProofScore 如何运作', tierNames: ['新手', '受信任', '已建立', '已验证', 'Seer'] },
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
  'fil-PH': { },  // English fallback
  'hi-IN': { },  // English fallback
  'id-ID': { },  // English fallback
  'th-TH': { },  // English fallback
  'ja-JP': { },  // English fallback
  'zh-CN': { },  // English fallback
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
  'fil-PH': { title: 'Maligayang pagdating sa VFIDE', subtitle: 'I-set up ka namin sa ilang hakbang', step1Title: 'I-connect ang iyong Wallet', step1Description: 'I-link ang iyong crypto wallet para ma-access ang lahat ng feature ng VFIDE. Sinusuportahan namin ang MetaMask, Coinbase Wallet, at marami pa.', step2Title: 'Buuin ang iyong ProofScore', step2Description: 'Ang iyong ProofScore ay sumasalamin sa iyong on-chain na ugali. Mas mataas na score = mas mababang bayad at eksklusibong benepisyo.', step3Title: 'Magsimulang Mag-transact', step3Description: 'Magpadala, tumanggap, at pamahalaan ang VFIDE nang walang bayad sa merchant. Pagmamay-ari ang iyong pondo sa bawat hakbang.', continueButton: 'Magpatuloy', backButton: 'Bumalik', skipButton: 'Laktawan', finishButton: 'Magsimula', welcomeTitle: 'Handa ka na!', welcomeSubtitle: 'Nakakonekta na ang iyong wallet. Simulan nang i-explore ang VFIDE.' },
  'hi-IN':  { title: 'VFIDE में आपका स्वागत है', subtitle: 'कुछ चरणों में आपको सेटअप करते हैं', step1Title: 'अपना वॉलेट कनेक्ट करें', step1Description: 'सभी VFIDE सुविधाओं तक पहुँचने के लिए अपना क्रिप्टो वॉलेट लिंक करें। हम MetaMask, Coinbase Wallet और अधिक का समर्थन करते हैं।', step2Title: 'अपना ProofScore बनाएं', step2Description: 'आपका ProofScore आपके ऑन-चेन व्यवहार को दर्शाता है। उच्च स्कोर = कम शुल्क और विशेष लाभ।', step3Title: 'लेनदेन शुरू करें', step3Description: 'बिना किसी व्यापारी शुल्क के VFIDE भेजें, प्राप्त करें और प्रबंधित करें। हर कदम पर अपने फंड का स्वामित्व लें।', continueButton: 'जारी रखें', backButton: 'वापस', skipButton: 'छोड़ें', finishButton: 'शुरू करें', welcomeTitle: 'सब तैयार है!', welcomeSubtitle: 'आपका वॉलेट कनेक्ट हो गया। VFIDE एक्सप्लोर करना शुरू करें।' },
  'id-ID':  { title: 'Selamat datang di VFIDE', subtitle: 'Mari siapkan Anda dalam beberapa langkah', step1Title: 'Hubungkan Wallet Anda', step1Description: 'Tautkan wallet kripto Anda untuk mengakses semua fitur VFIDE. Kami mendukung MetaMask, Coinbase Wallet, dan lainnya.', step2Title: 'Bangun ProofScore Anda', step2Description: 'ProofScore Anda mencerminkan perilaku on-chain Anda. Skor lebih tinggi = biaya lebih rendah dan manfaat eksklusif.', step3Title: 'Mulai Bertransaksi', step3Description: 'Kirim, terima, dan kelola VFIDE tanpa biaya merchant. Miliki dana Anda di setiap langkah.', continueButton: 'Lanjutkan', backButton: 'Kembali', skipButton: 'Lewati', finishButton: 'Mulai', welcomeTitle: 'Semua siap!', welcomeSubtitle: 'Wallet Anda terhubung. Mulai jelajahi VFIDE.' },
  'th-TH':  { title: 'ยินดีต้อนรับสู่ VFIDE', subtitle: 'มาตั้งค่าคุณในไม่กี่ขั้นตอน', step1Title: 'เชื่อมต่อกระเป๋าของคุณ', step1Description: 'เชื่อมโยงกระเป๋าคริปโตเพื่อเข้าถึงฟีเจอร์ทั้งหมดของ VFIDE รองรับ MetaMask, Coinbase Wallet และอื่นๆ', step2Title: 'สร้าง ProofScore ของคุณ', step2Description: 'ProofScore สะท้อนพฤติกรรมบนเชนของคุณ คะแนนสูงกว่า = ค่าธรรมเนียมต่ำกว่าและสิทธิประโยชน์พิเศษ', step3Title: 'เริ่มทำธุรกรรม', step3Description: 'ส่ง รับ และจัดการ VFIDE โดยไม่มีค่าธรรมเนียมสำหรับผู้ค้า เป็นเจ้าของเงินของคุณทุกขั้นตอน', continueButton: 'ต่อไป', backButton: 'กลับ', skipButton: 'ข้าม', finishButton: 'เริ่มต้น', welcomeTitle: 'พร้อมแล้ว!', welcomeSubtitle: 'กระเป๋าของคุณเชื่อมต่อแล้ว เริ่มสำรวจ VFIDE' },
  'ja-JP':  { title: 'VFIDEへようこそ', subtitle: 'いくつかのステップでセットアップします', step1Title: 'ウォレットを接続する', step1Description: 'すべてのVFIDE機能にアクセスするために暗号通貨ウォレットをリンクしてください。MetaMask、Coinbaseウォレットなどに対応しています。', step2Title: 'ProofScoreを構築する', step2Description: 'ProofScoreはオンチェーンの行動を反映します。高いスコアで手数料が下がり、特典が解放されます。', step3Title: '取引を開始する', step3Description: '加盟店手数料なしでVFIDEを送受信・管理できます。すべてのステップで自分の資金を所有してください。', continueButton: '続ける', backButton: '戻る', skipButton: 'スキップ', finishButton: '始める', welcomeTitle: '準備完了！', welcomeSubtitle: 'ウォレットが接続されました。VFIDEを探索しましょう。' },
  'zh-CN':  { title: '欢迎使用 VFIDE', subtitle: '只需几步即可完成设置', step1Title: '连接您的钱包', step1Description: '链接您的加密货币钱包以访问所有 VFIDE 功能。支持 MetaMask、Coinbase Wallet 等。', step2Title: '构建您的 ProofScore', step2Description: 'ProofScore 反映您的链上行为。分数越高，手续费越低，专属福利越多。', step3Title: '开始交易', step3Description: '零商家手续费发送、接收和管理 VFIDE。在每一步都掌控您的资金。', continueButton: '继续', backButton: '返回', skipButton: '跳过', finishButton: '开始', welcomeTitle: '一切就绪！', welcomeSubtitle: '您的钱包已连接。开始探索 VFIDE。' },
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
  'fil-PH': { },  // English fallback
  'hi-IN': { },  // English fallback
  'id-ID': { },  // English fallback
  'th-TH': { },  // English fallback
  'ja-JP': { },  // English fallback
  'zh-CN': { },  // English fallback
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
  'fil-PH': { title: 'Dashboard ng Merchant', subtitle: 'Walang processing fee. Real-time settlement. Ang iyong pondo, ang iyong patakaran.', connectPrompt: 'I-connect ang wallet para ma-access ang merchant dashboard', dashboardTitle: 'Ang iyong Tindahan', totalRevenue: 'Kabuuang Kita', totalTransactions: 'Mga Transaksyon', averageOrder: 'Avg. Order', recentTransactions: 'Mga Kamakailang Transaksyon', feeSavings: 'Nakatipid sa Bayad', feeSavingsDescription: 'Halagang nakatipid kumpara sa tradisyonal na payment processor', setupTitle: 'I-set up ang iyong Tindahan', setupDescription: 'Gumawa ng merchant profile para magsimulang tumanggap ng VFIDE payments nang walang processing fee.', createProfile: 'Gumawa ng Merchant Profile', profileName: 'Pangalan ng Negosyo', profileDescription: 'Paglalarawan ng Negosyo', saveButton: 'I-save ang Profile' },
  'hi-IN':  { title: 'व्यापारी डैशबोर्ड', subtitle: 'शून्य प्रसंस्करण शुल्क। रियल-टाइम निपटान। आपके फंड, आपके नियम।', connectPrompt: 'व्यापारी डैशबोर्ड तक पहुँचने के लिए वॉलेट कनेक्ट करें', dashboardTitle: 'आपकी दुकान', totalRevenue: 'कुल राजस्व', totalTransactions: 'लेनदेन', averageOrder: 'औसत ऑर्डर', recentTransactions: 'हाल के लेनदेन', feeSavings: 'शुल्क बचत', feeSavingsDescription: 'पारंपरिक भुगतान प्रोसेसर की तुलना में बचाई गई राशि', setupTitle: 'अपनी दुकान सेटअप करें', setupDescription: 'शून्य शुल्क के साथ VFIDE भुगतान स्वीकार करने के लिए व्यापारी प्रोफाइल बनाएं।', createProfile: 'व्यापारी प्रोफाइल बनाएं', profileName: 'व्यवसाय का नाम', profileDescription: 'व्यवसाय का विवरण', saveButton: 'प्रोफाइल सहेजें' },
  'id-ID':  { title: 'Dashboard Merchant', subtitle: 'Nol biaya pemrosesan. Penyelesaian real-time. Dana Anda, aturan Anda.', connectPrompt: 'Hubungkan wallet untuk mengakses dashboard merchant', dashboardTitle: 'Toko Anda', totalRevenue: 'Total Pendapatan', totalTransactions: 'Transaksi', averageOrder: 'Rata-rata Pesanan', recentTransactions: 'Transaksi Terbaru', feeSavings: 'Penghematan Biaya', feeSavingsDescription: 'Jumlah yang dihemat dibandingkan pemroses pembayaran tradisional', setupTitle: 'Siapkan Toko Anda', setupDescription: 'Buat profil merchant untuk mulai menerima pembayaran VFIDE tanpa biaya.', createProfile: 'Buat Profil Merchant', profileName: 'Nama Bisnis', profileDescription: 'Deskripsi Bisnis', saveButton: 'Simpan Profil' },
  'th-TH':  { title: 'แดชบอร์ดผู้ค้า', subtitle: 'ไม่มีค่าธรรมเนียมการประมวลผล ชำระทันที เงินของคุณ กฎของคุณ', connectPrompt: 'เชื่อมต่อกระเป๋าเพื่อเข้าถึงแดชบอร์ดผู้ค้า', dashboardTitle: 'ร้านของคุณ', totalRevenue: 'รายได้รวม', totalTransactions: 'ธุรกรรม', averageOrder: 'ออเดอร์เฉลี่ย', recentTransactions: 'ธุรกรรมล่าสุด', feeSavings: 'การประหยัดค่าธรรมเนียม', feeSavingsDescription: 'จำนวนที่ประหยัดได้เมื่อเทียบกับผู้ประมวลผลการชำระเงินแบบดั้งเดิม', setupTitle: 'ตั้งค่าร้านของคุณ', setupDescription: 'สร้างโปรไฟล์ผู้ค้าเพื่อเริ่มรับการชำระเงิน VFIDE โดยไม่มีค่าธรรมเนียม', createProfile: 'สร้างโปรไฟล์ผู้ค้า', profileName: 'ชื่อธุรกิจ', profileDescription: 'คำอธิบายธุรกิจ', saveButton: 'บันทึกโปรไฟล์' },
  'ja-JP':  { title: '加盟店ダッシュボード', subtitle: '処理手数料ゼロ。リアルタイム決済。あなたの資金、あなたのルール。', connectPrompt: '加盟店ダッシュボードにアクセスするにはウォレットを接続してください', dashboardTitle: 'あなたのショップ', totalRevenue: '総収益', totalTransactions: '取引数', averageOrder: '平均注文額', recentTransactions: '最近の取引', feeSavings: '手数料節約額', feeSavingsDescription: '従来の決済処理業者と比較した節約額', setupTitle: 'ショップを設定する', setupDescription: '加盟店プロフィールを作成して、手数料なしでVFIDE決済の受け取りを開始しましょう。', createProfile: '加盟店プロフィールを作成', profileName: '事業者名', profileDescription: '事業者説明', saveButton: 'プロフィールを保存' },
  'zh-CN':  { title: '商家控制台', subtitle: '零处理费。实时结算。您的资金，您的规则。', connectPrompt: '连接钱包以访问商家控制台', dashboardTitle: '您的店铺', totalRevenue: '总收入', totalTransactions: '交易次数', averageOrder: '平均订单', recentTransactions: '近期交易', feeSavings: '节省手续费', feeSavingsDescription: '与传统支付处理商相比节省的金额', setupTitle: '设置您的店铺', setupDescription: '创建商家资料，开始零手续费接受 VFIDE 付款。', createProfile: '创建商家资料', profileName: '企业名称', profileDescription: '企业描述', saveButton: '保存资料' },
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
  'fil-PH': { },  // English fallback
  'hi-IN': { },  // English fallback
  'id-ID': { },  // English fallback
  'th-TH': { },  // English fallback
  'ja-JP': { },  // English fallback
  'zh-CN': { },  // English fallback
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
  'fil-PH': { title: 'Remittance', subtitle: 'Magpadala ng pera sa ibang bansa — mabilis, mura, walang kailangan na bangko', sendAmount: 'Ipapadala mo', receiveAmount: 'Matatanggap nila', from: 'Mula', to: 'Papunta', rate: 'Exchange Rate', fee: 'Bayad', totalCost: 'Kabuuang Gastos', compareTitle: 'kumpara sa Tradisyonal', calculateButton: 'Kalkulahin', connectToSend: 'I-connect ang Wallet para Magpadala', savingsVsTraditional: 'Nakatipid kumpara sa bank wire' },
  'hi-IN':  { title: 'रेमिटेंस', subtitle: 'सीमाओं के पार पैसे भेजें — तत्काल, कम लागत, बिना बैंक के', sendAmount: 'आप भेजते हैं', receiveAmount: 'वे प्राप्त करते हैं', from: 'से', to: 'को', rate: 'विनिमय दर', fee: 'शुल्क', totalCost: 'कुल लागत', compareTitle: 'बनाम पारंपरिक विकल्प', calculateButton: 'गणना करें', connectToSend: 'भेजने के लिए वॉलेट कनेक्ट करें', savingsVsTraditional: 'बैंक वायर की तुलना में बचत' },
  'id-ID':  { title: 'Remitansi', subtitle: 'Kirim uang lintas batas — instan, biaya rendah, tanpa bank', sendAmount: 'Anda Kirim', receiveAmount: 'Mereka Terima', from: 'Dari', to: 'Ke', rate: 'Kurs', fee: 'Biaya', totalCost: 'Total Biaya', compareTitle: 'vs. Opsi Tradisional', calculateButton: 'Hitung', connectToSend: 'Hubungkan Wallet untuk Mengirim', savingsVsTraditional: 'Penghematan vs. transfer bank' },
  'th-TH':  { title: 'โอนเงินระหว่างประเทศ', subtitle: 'ส่งเงินข้ามพรมแดน — ทันที ต้นทุนต่ำ ไม่ต้องใช้ธนาคาร', sendAmount: 'คุณส่ง', receiveAmount: 'พวกเขาได้รับ', from: 'จาก', to: 'ไปยัง', rate: 'อัตราแลกเปลี่ยน', fee: 'ค่าธรรมเนียม', totalCost: 'ต้นทุนรวม', compareTitle: 'เทียบกับตัวเลือกแบบดั้งเดิม', calculateButton: 'คำนวณ', connectToSend: 'เชื่อมต่อกระเป๋าเพื่อส่ง', savingsVsTraditional: 'ประหยัดเมื่อเทียบกับโอนผ่านธนาคาร' },
  'ja-JP':  { title: '海外送金', subtitle: '国境を越えて送金 — 即時、低コスト、銀行不要', sendAmount: '送金額', receiveAmount: '受取額', from: '送金元', to: '送金先', rate: '為替レート', fee: '手数料', totalCost: '合計コスト', compareTitle: '従来の方法との比較', calculateButton: '計算する', connectToSend: '送金するにはウォレットを接続してください', savingsVsTraditional: '銀行送金と比べた節約額' },
  'zh-CN':  { title: '汇款', subtitle: '跨境汇款 — 即时、低成本、无需银行', sendAmount: '您汇出', receiveAmount: '对方收到', from: '从', to: '至', rate: '汇率', fee: '手续费', totalCost: '总费用', compareTitle: '对比传统方式', calculateButton: '计算', connectToSend: '连接钱包以发送', savingsVsTraditional: '对比银行电汇的节省' },
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
  'fil-PH': { },  // English fallback
  'hi-IN': { },  // English fallback
  'id-ID': { },  // English fallback
  'th-TH': { },  // English fallback
  'ja-JP': { },  // English fallback
  'zh-CN': { },  // English fallback
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
  'fil-PH': { title: 'Tungkol sa VFIDE', subtitle: 'Isang financial protocol para sa mga hindi kasama — hindi pinagsasamantalahan', missionTitle: 'Ang Aming Misyon', missionBody: 'Ang VFIDE ay nilikha para baligtarin ang extractive model ng tradisyonal na pananalapi. Nagtatayo kami ng imprastraktura kung saan walang bayad ang mga merchant, nakakakuha ng tiwala ang mga user sa pamamagitan ng ugali, at walang entidad — kasama na kami — ang nagkontrol sa protocol magpakailanman.', feeInversionTitle: 'Fee Inversion', feeInversionBody: 'Nagsisingilin ang tradisyonal na payment processor ng 2–4% bawat transaksyon. Binabaligtad ito ng VFIDE: zero ang bayad ng merchant. Sa halip, ang token-to-token transfer ay may behavioral fee (0.25–5%) na nagbibigay-gantimpala sa tiwala.', seerTitle: 'Ang Seer Constitution', seerBody: 'Isang protocol-level na bill of rights para sa bawat user. Ginagarantiyahan nito ang karapatang magreklamo, mag-apela, mabawi ang pondo, at lumabas sa protocol — nang walang pahintulot ng sinuman.', keyBurnTitle: 'Developer Key Burn', keyBurnBody: 'Anim na buwan pagkatapos ng mainnet launch, permanenteng sisirain ang developer admin keys. Walang upgrade. Walang rug. Magiging ganap na autonomous ang protocol — pag-aari ng komunidad.', proofScoreTitle: 'ProofScore', proofScoreBody: 'On-chain na reputasyon na binuo sa pamamagitan ng ugali, hindi pagkakakilanlan. Ang pare-pareho at tapat na ugali ay nagbubukas ng mas mababang bayad at mas mataas na limitasyon.', teamTitle: 'Binuo nang Bukas', teamBody: 'Ang VFIDE ay open source, na-audit, at binuo nang may radikal na transparency. Bawat kontrata, bawat desisyon, bawat kompromiso — naka-dokumento at nasa chain.' },
  'hi-IN':  { title: 'VFIDE के बारे में', subtitle: 'उन लोगों के लिए वित्तीय प्रोटोकॉल जिन्हें छोड़ दिया गया — शोषित नहीं', missionTitle: 'हमारा मिशन', missionBody: 'VFIDE पारंपरिक वित्त के शोषणकारी मॉडल को पलटने के लिए अस्तित्व में है। हम ऐसा बुनियादी ढाँचा बनाते हैं जहाँ व्यापारी शून्य प्रसंस्करण शुल्क देते हैं, उपयोगकर्ता व्यवहार से विश्वास अर्जित करते हैं, और कोई भी — हम सहित — प्रोटोकॉल पर हमेशा के लिए नियंत्रण नहीं रखता।', feeInversionTitle: 'शुल्क उलटाव', feeInversionBody: 'पारंपरिक भुगतान प्रोसेसर व्यापारियों से प्रति लेनदेन 2–4% शुल्क लेते हैं। VFIDE इसे पलटता है: व्यापारी शून्य देते हैं। बदले में, टोकन-से-टोकन ट्रांसफर पर व्यवहार-आधारित शुल्क (0.25–5%) लगता है जो विश्वास को पुरस्कृत करता है।', seerTitle: 'Seer संविधान', seerBody: 'हर उपयोगकर्ता के लिए प्रोटोकॉल-स्तरीय अधिकार पत्र। यह विवाद करने, अपील करने, धन वापस पाने और प्रोटोकॉल से बाहर निकलने का अधिकार गारंटी देता है — किसी प्राधिकरण की अनुमति के बिना।', keyBurnTitle: 'डेवलपर की बर्न', keyBurnBody: 'मेननेट लॉन्च के छह महीने बाद, डेवलपर एडमिन की को स्थायी रूप से नष्ट कर दिया जाता है। कोई अपग्रेड नहीं। कोई धोखा नहीं। प्रोटोकॉल पूरी तरह स्वायत्त हो जाता है — समुदाय का।', proofScoreTitle: 'ProofScore', proofScoreBody: 'व्यवहार से निर्मित ऑन-चेन प्रतिष्ठा, पहचान से नहीं। सुसंगत और ईमानदार व्यवहार कम शुल्क, उच्च सीमाएं और प्रशासन में जगह खोलता है।', teamTitle: 'सार्वजनिक रूप से निर्मित', teamBody: 'VFIDE ओपन सोर्स है, ऑडिट किया गया है और पूर्ण पारदर्शिता के साथ बनाया गया है। हर अनुबंध, हर निर्णय, हर समझौता — दस्तावेज़ीकृत और ऑन-चेन।' },
  'id-ID':  { title: 'Tentang VFIDE', subtitle: 'Protokol keuangan untuk mereka yang tersingkir — bukan dieksploitasi', missionTitle: 'Misi Kami', missionBody: 'VFIDE hadir untuk membalik model ekstraktif keuangan tradisional. Kami membangun infrastruktur di mana merchant membayar nol biaya pemrosesan, pengguna mendapatkan kepercayaan melalui perilaku, dan tidak ada entitas — termasuk kami — yang mengendalikan protokol selamanya.', feeInversionTitle: 'Inversi Biaya', feeInversionBody: 'Pemroses pembayaran tradisional mengenakan 2–4% per transaksi kepada merchant. VFIDE membaliknya: merchant membayar nol. Sebagai gantinya, transfer token-ke-token dikenakan biaya perilaku (0,25–5%) yang memberi penghargaan atas kepercayaan.', seerTitle: 'Konstitusi Seer', seerBody: 'Deklarasi hak tingkat protokol untuk setiap pengguna. Ini menjamin hak untuk bersengketa, banding, memulihkan dana, dan keluar dari protokol — tanpa izin dari otoritas mana pun.', keyBurnTitle: 'Pembakaran Kunci Pengembang', keyBurnBody: 'Enam bulan setelah peluncuran mainnet, kunci admin pengembang dihancurkan secara permanen. Tidak ada pembaruan. Tidak ada penipuan. Protokol menjadi sepenuhnya otonom — milik komunitas.', proofScoreTitle: 'ProofScore', proofScoreBody: 'Reputasi on-chain yang dibangun melalui perilaku, bukan identitas. Perilaku yang konsisten dan jujur membuka biaya lebih rendah, batas lebih tinggi, dan tempat dalam tata kelola.', teamTitle: 'Dibangun Secara Terbuka', teamBody: 'VFIDE adalah open source, telah diaudit, dan dibangun dengan transparansi radikal. Setiap kontrak, setiap keputusan, setiap pertukaran — terdokumentasi dan on-chain.' },
  'th-TH':  { title: 'เกี่ยวกับ VFIDE', subtitle: 'โปรโตคอลทางการเงินสำหรับผู้ที่ถูกทิ้งไว้ข้างหลัง — ไม่ใช่ถูกเอารัดเอาเปรียบ', missionTitle: 'พันธกิจของเรา', missionBody: 'VFIDE มีขึ้นเพื่อพลิกโมเดลการดึงทรัพยากรของการเงินแบบดั้งเดิม เราสร้างโครงสร้างพื้นฐานที่ผู้ค้าไม่ต้องจ่ายค่าธรรมเนียม ผู้ใช้สร้างความไว้วางใจผ่านพฤติกรรม และไม่มีองค์กรใด — รวมถึงเรา — ควบคุมโปรโตคอลตลอดไป', feeInversionTitle: 'การพลิกค่าธรรมเนียม', feeInversionBody: 'ผู้ประมวลผลการชำระเงินแบบดั้งเดิมเรียกเก็บ 2–4% ต่อธุรกรรมจากผู้ค้า VFIDE พลิกสิ่งนี้: ผู้ค้าจ่ายศูนย์ แทนที่จะเป็นเช่นนั้น การโอนโทเค็นจะมีค่าธรรมเนียมตามพฤติกรรม (0.25–5%) ที่ตอบแทนความไว้วางใจ', seerTitle: 'รัฐธรรมนูญ Seer', seerBody: 'ร่างกฎหมายสิทธิระดับโปรโตคอลสำหรับผู้ใช้ทุกคน รับประกันสิทธิ์ในการโต้แย้ง อุทธรณ์ กู้คืนเงินทุน และออกจากโปรโตคอล — โดยไม่ต้องขออนุญาตจากผู้มีอำนาจใด', keyBurnTitle: 'การเผาคีย์นักพัฒนา', keyBurnBody: 'หกเดือนหลังจากเปิดตัว mainnet คีย์ผู้ดูแลระบบของนักพัฒนาจะถูกทำลายอย่างถาวร ไม่มีการอัปเกรด ไม่มีการโกง โปรโตคอลจะกลายเป็นอิสระอย่างสมบูรณ์ — เป็นของชุมชน', proofScoreTitle: 'ProofScore', proofScoreBody: 'ชื่อเสียงบนเชนที่สร้างจากพฤติกรรม ไม่ใช่ตัวตน พฤติกรรมที่สม่ำเสมอและซื่อสัตย์จะปลดล็อกค่าธรรมเนียมที่ต่ำกว่า วงเงินที่สูงกว่า และที่นั่งในการกำกับดูแล', teamTitle: 'สร้างแบบโปร่งใส', teamBody: 'VFIDE เป็นโอเพนซอร์ส ได้รับการตรวจสอบ และสร้างด้วยความโปร่งใสอย่างสุดขีด ทุกสัญญา ทุกการตัดสินใจ ทุกการแลกเปลี่ยน — มีเอกสารและบนเชน' },
  'ja-JP':  { title: 'VFIDEについて', subtitle: '取り残された人々のための金融プロトコル — 搾取ではなく', missionTitle: '私たちのミッション', missionBody: 'VFIDEは伝統的金融の搾取モデルを逆転させるために存在します。加盟店が処理手数料をゼロで済む、ユーザーが行動で信頼を獲得できる、そして私たちを含むいかなる組織もプロトコルを永久には支配できないインフラを構築しています。', feeInversionTitle: '手数料反転', feeInversionBody: '従来の決済処理業者は加盟店に取引ごとに2〜4%を請求します。VFIDEはこれを逆転させます：加盟店はゼロを支払います。代わりに、トークン間の送金に信頼を報酬とする行動手数料（0.25〜5%）が適用されます。', seerTitle: 'Seer憲法', seerBody: 'すべてのユーザーのためのプロトコルレベルの権利章典。争議、控訴、資金の回収、プロトコルからの退出の権利を保証します — いかなる権威の許可も不要です。', keyBurnTitle: '開発者キーバーン', keyBurnBody: 'メインネット起動から6ヶ月後、開発者の管理者キーは永久に破棄されます。アップグレードなし。詐欺なし。プロトコルは完全に自律的になります — コミュニティの所有物として。', proofScoreTitle: 'ProofScore', proofScoreBody: 'アイデンティティではなく行動によって構築されたオンチェーンの評判。一貫した誠実な行動で手数料が下がり、限度が上がり、ガバナンスへの参加権が得られます。', teamTitle: '公開で開発', teamBody: 'VFIDEはオープンソースで、監査済みで、徹底した透明性で開発されています。すべてのコントラクト、すべての決定、すべてのトレードオフ — 文書化され、オンチェーンに記録されています。' },
  'zh-CN':  { title: '关于 VFIDE', subtitle: '为被排除在外的人构建的金融协议 — 而非被剥削', missionTitle: '我们的使命', missionBody: 'VFIDE 的存在是为了颠覆传统金融的剥削模式。我们构建的基础设施让商家零处理费，用户通过行为获得信任，任何实体——包括我们——都无法永久控制协议。', feeInversionTitle: '手续费倒置', feeInversionBody: '传统支付处理商向商家收取每笔交易 2–4% 的费用。VFIDE 颠覆了这一模式：商家支付零费用。取而代之的是，代币间转账收取行为手续费（0.25–5%），以信任换取奖励。', seerTitle: 'Seer 宪法', seerBody: '为每位用户提供协议级权利法案。它保障争议、申诉、资金追回和退出协议的权利——无需任何机构的许可。', keyBurnTitle: '开发者密钥销毁', keyBurnBody: '主网上线六个月后，开发者管理员密钥将被永久销毁。无升级。无跑路。协议完全自治——归社区所有。', proofScoreTitle: 'ProofScore', proofScoreBody: '通过行为构建的链上声誉，而非身份。持续诚实的行为可解锁更低费率、更高限额和治理席位。', teamTitle: '公开构建', teamBody: 'VFIDE 开源、经过审计，以彻底透明的方式构建。每一份合约、每一个决策、每一次权衡——均已记录在链上。' },
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
  'fil-PH': { },  // English fallback
  'hi-IN': { },  // English fallback
  'id-ID': { },  // English fallback
  'th-TH': { },  // English fallback
  'ja-JP': { },  // English fallback
  'zh-CN': { },  // English fallback
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
  'fil-PH': { title: 'Security Center', subtitle: 'Bantayan at protektahan ang iyong VFIDE wallet at on-chain na aktibidad', connectPrompt: 'I-connect ang wallet para ma-access ang Security Center', walletHealth: 'Kalusugan ng Wallet', approvals: 'Mga Aktibong Pahintulot', revokeAll: 'Bawiin ang Lahat', emergencyFreeze: 'Emergency Freeze', guardians: 'Mga Tagapagbantay', addGuardian: 'Magdagdag ng Tagapagbantay', twoFactor: '2-Factor Auth', activityLog: 'Activity Log', noThreats: 'Walang natukoy na banta', threatsFound: 'May natukoy na banta — kailangan ng aksyon', scanButton: 'Mag-scan para sa Seguridad' },
  'hi-IN':  { title: 'सुरक्षा केंद्र', subtitle: 'अपने VFIDE वॉलेट और ऑन-चेन गतिविधि की निगरानी और सुरक्षा करें', connectPrompt: 'सुरक्षा केंद्र तक पहुँचने के लिए वॉलेट कनेक्ट करें', walletHealth: 'वॉलेट स्वास्थ्य', approvals: 'सक्रिय अनुमोदन', revokeAll: 'सभी रद्द करें', emergencyFreeze: 'आपातकालीन फ्रीज', guardians: 'अभिभावक', addGuardian: 'अभिभावक जोड़ें', twoFactor: '2-कारक प्रमाणीकरण', activityLog: 'गतिविधि लॉग', noThreats: 'कोई खतरा नहीं मिला', threatsFound: 'खतरे मिले — कार्रवाई आवश्यक', scanButton: 'सुरक्षा स्कैन चलाएं' },
  'id-ID':  { title: 'Pusat Keamanan', subtitle: 'Pantau dan lindungi wallet VFIDE dan aktivitas on-chain Anda', connectPrompt: 'Hubungkan wallet untuk mengakses Pusat Keamanan', walletHealth: 'Kesehatan Wallet', approvals: 'Persetujuan Aktif', revokeAll: 'Cabut Semua', emergencyFreeze: 'Pembekuan Darurat', guardians: 'Penjaga', addGuardian: 'Tambah Penjaga', twoFactor: 'Autentikasi 2 Faktor', activityLog: 'Log Aktivitas', noThreats: 'Tidak ada ancaman terdeteksi', threatsFound: 'Ancaman terdeteksi — tindakan diperlukan', scanButton: 'Jalankan Pemindaian Keamanan' },
  'th-TH':  { title: 'ศูนย์ความปลอดภัย', subtitle: 'ตรวจสอบและปกป้องกระเป๋า VFIDE และกิจกรรมบนเชนของคุณ', connectPrompt: 'เชื่อมต่อกระเป๋าเพื่อเข้าถึงศูนย์ความปลอดภัย', walletHealth: 'สุขภาพกระเป๋า', approvals: 'การอนุมัติที่ใช้งานอยู่', revokeAll: 'เพิกถอนทั้งหมด', emergencyFreeze: 'การแช่แข็งฉุกเฉิน', guardians: 'ผู้พิทักษ์', addGuardian: 'เพิ่มผู้พิทักษ์', twoFactor: 'การยืนยันตัวตน 2 ปัจจัย', activityLog: 'บันทึกกิจกรรม', noThreats: 'ไม่พบภัยคุกคาม', threatsFound: 'พบภัยคุกคาม — ต้องดำเนินการ', scanButton: 'เรียกใช้การสแกนความปลอดภัย' },
  'ja-JP':  { title: 'セキュリティセンター', subtitle: 'VFIDEウォレットとオンチェーン活動を監視・保護する', connectPrompt: 'セキュリティセンターにアクセスするにはウォレットを接続してください', walletHealth: 'ウォレット健全性', approvals: 'アクティブな承認', revokeAll: 'すべて取り消す', emergencyFreeze: '緊急凍結', guardians: 'ガーディアン', addGuardian: 'ガーディアンを追加', twoFactor: '2要素認証', activityLog: 'アクティビティログ', noThreats: '脅威は検出されませんでした', threatsFound: '脅威が検出されました — 対応が必要です', scanButton: 'セキュリティスキャンを実行' },
  'zh-CN':  { title: '安全中心', subtitle: '监控并保护您的 VFIDE 钱包和链上活动', connectPrompt: '连接钱包以访问安全中心', walletHealth: '钱包健康状态', approvals: '活跃授权', revokeAll: '全部撤销', emergencyFreeze: '紧急冻结', guardians: '守护者', addGuardian: '添加守护者', twoFactor: '双重认证', activityLog: '活动日志', noThreats: '未检测到威胁', threatsFound: '检测到威胁 — 需要采取行动', scanButton: '运行安全扫描' },
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
  'fil-PH': { },  // English fallback
  'hi-IN': { },  // English fallback
  'id-ID': { },  // English fallback
  'th-TH': { },  // English fallback
  'ja-JP': { },  // English fallback
  'zh-CN': { },  // English fallback
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
  'fil-PH': { comingSoon: 'Paparating Na', description: 'Ang feature na ito ay aktibong pinagtatrabahuhan at magiging available sa paglulunsad ng mainnet.', notifyMe: 'Abisuhan Ako', backToHome: 'Bumalik sa Tahanan' },
  'hi-IN':  { comingSoon: 'जल्द आ रहा है', description: 'यह सुविधा सक्रिय विकास में है और मेननेट लॉन्च पर उपलब्ध होगी।', notifyMe: 'मुझे सूचित करें', backToHome: 'होम पर वापस जाएं' },
  'id-ID':  { comingSoon: 'Segera Hadir', description: 'Fitur ini sedang dalam pengembangan aktif dan akan tersedia saat peluncuran mainnet.', notifyMe: 'Beri Tahu Saya', backToHome: 'Kembali ke Beranda' },
  'th-TH':  { comingSoon: 'เร็วๆ นี้', description: 'ฟีเจอร์นี้อยู่ระหว่างการพัฒนาและจะพร้อมใช้งานเมื่อเปิดตัว mainnet', notifyMe: 'แจ้งเตือนฉัน', backToHome: 'กลับหน้าหลัก' },
  'ja-JP':  { comingSoon: '近日公開', description: 'この機能は現在開発中で、メインネット起動時に利用可能になります。', notifyMe: '通知を受け取る', backToHome: 'ホームに戻る' },
  'zh-CN':  { comingSoon: '即将推出', description: '此功能正在积极开发中，将在主网上线时可用。', notifyMe: '通知我', backToHome: '返回首页' },
  'ar-SA': { comingSoon: 'قريباً', description: 'هذه الميزة قيد التطوير النشط وستكون متاحة عند إطلاق الشبكة الرئيسية.', notifyMe: 'أخبرني', backToHome: 'العودة للرئيسية' },
  'de-DE': { comingSoon: 'Demnächst verfügbar', description: 'Diese Funktion befindet sich in aktiver Entwicklung und wird beim Mainnet-Launch verfügbar sein.', notifyMe: 'Benachrichtigen', backToHome: 'Zurück zur Startseite' },
  'fil-PH': { comingSoon: 'Coming Soon', description: 'This feature is under active development and will be available on mainnet launch.', notifyMe: 'Notify Me', backToHome: 'Back to Home' },
  'hi-IN': { comingSoon: 'Coming Soon', description: 'This feature is under active development and will be available on mainnet launch.', notifyMe: 'Notify Me', backToHome: 'Back to Home' },
  'id-ID': { comingSoon: 'Coming Soon', description: 'This feature is under active development and will be available on mainnet launch.', notifyMe: 'Notify Me', backToHome: 'Back to Home' },
  'th-TH': { comingSoon: 'Coming Soon', description: 'This feature is under active development and will be available on mainnet launch.', notifyMe: 'Notify Me', backToHome: 'Back to Home' },
  'ja-JP': { comingSoon: 'Coming Soon', description: 'This feature is under active development and will be available on mainnet launch.', notifyMe: 'Notify Me', backToHome: 'Back to Home' },
  'zh-CN': { comingSoon: 'Coming Soon', description: 'This feature is under active development and will be available on mainnet launch.', notifyMe: 'Notify Me', backToHome: 'Back to Home' },
};

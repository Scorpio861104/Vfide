/**
 * useT — universal translation hook
 *
 * Returns a flat map of translated strings for every page/section.
 * Import once per component: const t = useT()
 * Then use: t.dashboard_welcome, t.vault_heading, etc.
 *
 * Adding a new locale: add a row to overrides below.
 * Adding a new string: add the key to TranslationKeys + all locale rows.
 */
'use client';

import { useLocale } from '@/hooks/useLocale';
import { SupportedLocale } from '@/lib/i18n';

// ── Type ─────────────────────────────────────────────────────────────────────

export interface TranslationKeys {
  // Common
  common_back: string; common_loading: string; common_comingSoon: string;
  common_notifyMe: string; common_getStarted: string; common_learnMore: string;
  common_save: string; common_cancel: string; common_confirm: string;
  common_close: string; common_search: string; common_filter: string;
  common_all: string; common_active: string; common_completed: string;
  common_pending: string; common_failed: string; common_success: string;
  common_error: string; common_connect_wallet: string; common_disconnect: string;
  common_copy: string; common_share: string; common_settings: string;
  common_activity: string; common_overview: string; common_history: string;
  common_balance: string; common_send: string; common_receive: string;
  // Nav
  nav_home: string; nav_pay: string; nav_merchant: string; nav_social: string;
  nav_more: string; nav_vault: string; nav_wallet: string;
  nav_rewards: string; nav_governance: string;
  // Dashboard
  dashboard_welcome: string; dashboard_tab_overview: string; dashboard_tab_badges: string;
  dashboard_tab_score: string; dashboard_tab_fees: string; dashboard_tab_activity: string;
  dashboard_trust_score: string; dashboard_fee_rate: string; dashboard_transactions: string;
  // Vault
  vault_heading: string; vault_subtitle: string; vault_settings: string;
  vault_recover: string; vault_lock: string; vault_safety: string;
  // Wallet
  wallet_heading: string; wallet_subtitle: string; wallet_connect: string;
  wallet_hardware: string; wallet_paper: string; wallet_recovery: string;
  wallet_guardians: string; wallet_buy: string;
  // Marketplace
  marketplace_heading: string; marketplace_subtitle: string;
  marketplace_search: string; marketplace_filter: string;
  // Pay
  pay_heading: string; pay_subtitle: string;
  // Remittance
  remittance_heading: string; remittance_subtitle: string;
  // Settings
  settings_heading: string; settings_tab_account: string; settings_tab_vault: string;
  settings_tab_security: string; settings_tab_notifications: string;
  // Profile / Notifications
  profile_heading: string; profile_subtitle: string;
  notifications_heading: string; notifications_subtitle: string;
  // Achievements
  achievements_heading: string; achievements_tab_achievements: string; achievements_tab_perks: string;
  // Rewards
  rewards_heading: string; rewards_subtitle: string;
  rewards_tab_rewards: string; rewards_tab_leaderboard: string; rewards_tab_quests: string;
  // Leaderboard / Social / Feed
  leaderboard_heading: string; leaderboard_subtitle: string;
  social_heading: string; social_subtitle: string;
  feed_heading: string; feed_subtitle: string;
  // Sanctum
  sanctum_heading: string; sanctum_subtitle: string; sanctum_tab_overview: string;
  sanctum_tab_charities: string; sanctum_tab_disbursements: string;
  sanctum_tab_donate: string; sanctum_tab_history: string;
  // Governance / DAO / Council / Treasury / Staking
  governance_heading: string; governance_subtitle: string;
  dao_hub_heading: string; dao_hub_subtitle: string;
  council_heading: string; council_subtitle: string;
  treasury_heading: string; treasury_subtitle: string;
  staking_heading: string; staking_subtitle: string;
  // Explorer / Escrow
  explorer_heading: string; explorer_subtitle: string;
  escrow_heading: string; escrow_subtitle: string;
  // Merchant sub-pages
  merchant_setup: string; merchant_analytics: string; merchant_customers: string;
  merchant_inventory: string; merchant_invoices: string;
  merchant_loyalty: string; merchant_subscriptions: string;
  // Security / Support / ProofScore
  security_heading: string; security_subtitle: string;
  support_heading: string; support_tab_faq: string;
  support_tab_tickets: string; support_tab_new: string;
  proofscore_heading: string; proofscore_subtitle: string;
  // Guardians / Inheritance / Invite
  guardians_heading: string; guardians_subtitle: string;
  inheritance_heading: string; inheritance_subtitle: string;
  invite_heading: string; invite_subtitle: string;
  // Misc pages
  legal_heading: string; docs_heading: string; roadmap_heading: string;
  testnet_heading: string; developer_heading: string;
  onboarding_heading: string; onboarding_subtitle: string; onboarding_launch: string;
}

// ── English base ──────────────────────────────────────────────────────────────

const en: TranslationKeys = {
  common_back: 'Back', common_loading: 'Loading…', common_comingSoon: 'Coming Soon',
  common_notifyMe: 'Notify Me', common_getStarted: 'Get started', common_learnMore: 'Learn more',
  common_save: 'Save', common_cancel: 'Cancel', common_confirm: 'Confirm',
  common_close: 'Close', common_search: 'Search…', common_filter: 'Filter',
  common_all: 'All', common_active: 'Active', common_completed: 'Completed',
  common_pending: 'Pending', common_failed: 'Failed', common_success: 'Success',
  common_error: 'Error', common_connect_wallet: 'Connect wallet',
  common_disconnect: 'Disconnect', common_copy: 'Copy', common_share: 'Share',
  common_settings: 'Settings', common_activity: 'Activity', common_overview: 'Overview',
  common_history: 'History', common_balance: 'Balance', common_send: 'Send', common_receive: 'Receive',

  nav_home: 'Home', nav_pay: 'Pay', nav_merchant: 'Merchant', nav_social: 'Social',
  nav_more: 'More', nav_vault: 'Vault', nav_wallet: 'Wallet',
  nav_rewards: 'Rewards', nav_governance: 'Governance',

  dashboard_welcome: 'Welcome back', dashboard_tab_overview: 'Overview',
  dashboard_tab_badges: 'Badges', dashboard_tab_score: 'Score Sim',
  dashboard_tab_fees: 'Fee Sim', dashboard_tab_activity: 'Activity',
  dashboard_trust_score: 'Trust Score', dashboard_fee_rate: 'Fee Rate',
  dashboard_transactions: 'Transactions',

  vault_heading: 'Your Vault', vault_subtitle: 'Non-custodial. Yours alone.',
  vault_settings: 'Vault Settings', vault_recover: 'Vault Recovery',
  vault_lock: 'Lock My Vault', vault_safety: 'Safety Window',

  wallet_heading: 'Wallet', wallet_subtitle: 'Manage your keys and connections.',
  wallet_connect: 'Connect Wallet', wallet_hardware: 'Hardware Wallet',
  wallet_paper: 'Paper Wallet', wallet_recovery: 'Vault Recovery',
  wallet_guardians: 'Guardian Setup', wallet_buy: 'Buy / Swap',

  marketplace_heading: 'Marketplace',
  marketplace_subtitle: 'Buy from verified merchants. Zero buyer fees.',
  marketplace_search: 'Search products…', marketplace_filter: 'Filter',

  pay_heading: 'Send Payment', pay_subtitle: 'Pay any wallet. Zero merchant fees.',

  remittance_heading: 'Send Money Home',
  remittance_subtitle: 'International transfers at near-zero cost.',

  settings_heading: 'Settings', settings_tab_account: 'Account',
  settings_tab_vault: 'Vault', settings_tab_security: 'Security',
  settings_tab_notifications: 'Notifications',

  profile_heading: 'Your Profile', profile_subtitle: 'Manage your public identity.',
  notifications_heading: 'Notifications', notifications_subtitle: 'Stay up to date on your activity.',

  achievements_heading: 'Achievements',
  achievements_tab_achievements: 'Achievements', achievements_tab_perks: 'Perks',

  rewards_heading: 'Rewards Hub', rewards_subtitle: 'Earn rewards for every on-chain action.',
  rewards_tab_rewards: 'Rewards', rewards_tab_leaderboard: 'Leaderboard', rewards_tab_quests: 'Quests',

  leaderboard_heading: 'Leaderboard', leaderboard_subtitle: 'Top ProofScore holders this month.',
  social_heading: 'Social', social_subtitle: 'Follow wallets. Share payments.',
  feed_heading: 'Feed', feed_subtitle: 'Activity from your network.',

  sanctum_heading: 'Sanctum Fund',
  sanctum_subtitle: 'Protocol-level community support — 2% of every burn.',
  sanctum_tab_overview: 'Overview', sanctum_tab_charities: 'Charities',
  sanctum_tab_disbursements: 'Disbursements', sanctum_tab_donate: 'Donate',
  sanctum_tab_history: 'History',

  governance_heading: 'Governance', governance_subtitle: 'Vote on protocol proposals.',
  dao_hub_heading: 'DAO Hub', dao_hub_subtitle: 'Participate in on-chain governance.',
  council_heading: 'Council', council_subtitle: 'Elite governance committee.',
  treasury_heading: 'Treasury', treasury_subtitle: 'Protocol treasury overview.',
  staking_heading: 'Staking', staking_subtitle: 'Stake VFIDE to earn rewards.',

  explorer_heading: 'VFIDE Explorer', explorer_subtitle: 'Inspect wallets, vaults, and ProofScores.',
  escrow_heading: 'Escrow', escrow_subtitle: 'Secure held payments between parties.',

  merchant_setup: 'Set up your store', merchant_analytics: 'Analytics',
  merchant_customers: 'Customers', merchant_inventory: 'Inventory',
  merchant_invoices: 'Invoices', merchant_loyalty: 'Loyalty',
  merchant_subscriptions: 'Subscriptions',

  security_heading: 'Account Security',
  security_subtitle: 'Monitor sessions, signing keys, and protocol activity.',

  support_heading: 'Help & Support Center',
  support_subtitle: 'We\'re here to help.', support_tab_faq: 'FAQ',
  support_tab_tickets: 'My Tickets', support_tab_new: 'New Ticket',

  proofscore_heading: 'Your ProofScore',
  proofscore_subtitle: 'On-chain reputation that earns you cheaper fees.',

  guardians_heading: 'Guardian Dashboard',
  guardians_subtitle: 'Trusted contacts who can help recover your vault.',

  inheritance_heading: 'Inheritance',
  inheritance_subtitle: 'Set up on-chain inheritance for your vault.',

  invite_heading: 'Invite Friends',
  invite_subtitle: 'Earn rewards for every friend you bring to VFIDE.',

  legal_heading: 'Legal & Policies', docs_heading: 'Documentation',
  roadmap_heading: "What's Coming", testnet_heading: 'Testnet Setup',
  developer_heading: 'Developer Hub',

  onboarding_heading: 'Setup Wizard',
  onboarding_subtitle: 'Get started with VFIDE in under 2 minutes.',
  onboarding_launch: 'Open wizard',
};

// ── Per-locale overrides ──────────────────────────────────────────────────────

const overrides: Partial<Record<SupportedLocale, Partial<TranslationKeys>>> = {
  'es-ES': {
    common_back: 'Volver', common_loading: 'Cargando…', common_comingSoon: 'Próximamente',
    common_notifyMe: 'Notificarme', common_getStarted: 'Comenzar', common_learnMore: 'Saber más',
    common_save: 'Guardar', common_cancel: 'Cancelar', common_confirm: 'Confirmar',
    common_close: 'Cerrar', common_search: 'Buscar…', common_filter: 'Filtrar',
    common_all: 'Todo', common_active: 'Activo', common_completed: 'Completado',
    common_pending: 'Pendiente', common_failed: 'Fallido', common_success: 'Éxito',
    common_error: 'Error', common_connect_wallet: 'Conectar cartera',
    common_disconnect: 'Desconectar', common_copy: 'Copiar', common_share: 'Compartir',
    common_settings: 'Ajustes', common_activity: 'Actividad', common_overview: 'Resumen',
    common_history: 'Historial', common_balance: 'Saldo', common_send: 'Enviar', common_receive: 'Recibir',
    nav_home: 'Inicio', nav_pay: 'Pagar', nav_merchant: 'Comerciante', nav_social: 'Social',
    nav_more: 'Más', nav_vault: 'Bóveda', nav_wallet: 'Cartera',
    nav_rewards: 'Recompensas', nav_governance: 'Gobernanza',
    dashboard_welcome: 'Bienvenido', dashboard_tab_overview: 'Resumen',
    dashboard_tab_badges: 'Insignias', dashboard_tab_score: 'Simular puntuación',
    dashboard_tab_fees: 'Simular comisión', dashboard_tab_activity: 'Actividad',
    dashboard_trust_score: 'Puntuación de confianza', dashboard_fee_rate: 'Tasa de comisión',
    dashboard_transactions: 'Transacciones',
    vault_heading: 'Tu Bóveda', vault_subtitle: 'No custodial. Solo tuya.',
    vault_settings: 'Ajustes de bóveda', vault_recover: 'Recuperar bóveda',
    vault_lock: 'Bloquear bóveda', vault_safety: 'Ventana de seguridad',
    wallet_heading: 'Cartera', wallet_subtitle: 'Gestiona tus claves y conexiones.',
    wallet_connect: 'Conectar cartera', wallet_hardware: 'Cartera hardware',
    wallet_paper: 'Cartera en papel', wallet_recovery: 'Recuperar bóveda',
    wallet_guardians: 'Configurar guardianes', wallet_buy: 'Comprar / Intercambiar',
    marketplace_heading: 'Mercado', marketplace_subtitle: 'Compra a comerciantes verificados. Sin comisiones.',
    marketplace_search: 'Buscar productos…', marketplace_filter: 'Filtrar',
    pay_heading: 'Enviar pago', pay_subtitle: 'Paga a cualquier cartera. Sin comisiones.',
    remittance_heading: 'Enviar dinero a casa', remittance_subtitle: 'Transferencias internacionales a coste casi nulo.',
    settings_heading: 'Ajustes', settings_tab_account: 'Cuenta',
    settings_tab_vault: 'Bóveda', settings_tab_security: 'Seguridad', settings_tab_notifications: 'Notificaciones',
    profile_heading: 'Tu perfil', profile_subtitle: 'Gestiona tu identidad pública.',
    notifications_heading: 'Notificaciones', notifications_subtitle: 'Mantente al día.',
    achievements_heading: 'Logros', achievements_tab_achievements: 'Logros', achievements_tab_perks: 'Ventajas',
    rewards_heading: 'Centro de recompensas', rewards_subtitle: 'Gana recompensas por cada acción on-chain.',
    rewards_tab_rewards: 'Recompensas', rewards_tab_leaderboard: 'Clasificación', rewards_tab_quests: 'Misiones',
    leaderboard_heading: 'Clasificación', leaderboard_subtitle: 'Los mejores ProofScores este mes.',
    social_heading: 'Social', social_subtitle: 'Sigue carteras. Comparte pagos.',
    feed_heading: 'Noticias', feed_subtitle: 'Actividad de tu red.',
    sanctum_heading: 'Fondo Sanctum', sanctum_subtitle: 'Apoyo comunitario a nivel de protocolo.',
    sanctum_tab_overview: 'Resumen', sanctum_tab_charities: 'Organizaciones',
    sanctum_tab_disbursements: 'Desembolsos', sanctum_tab_donate: 'Donar', sanctum_tab_history: 'Historial',
    governance_heading: 'Gobernanza', governance_subtitle: 'Vota las propuestas del protocolo.',
    dao_hub_heading: 'Centro DAO', dao_hub_subtitle: 'Participa en la gobernanza on-chain.',
    council_heading: 'Consejo', council_subtitle: 'Comité de gobernanza élite.',
    treasury_heading: 'Tesorería', treasury_subtitle: 'Vista general de la tesorería.',
    staking_heading: 'Staking', staking_subtitle: 'Bloquea VFIDE para ganar recompensas.',
    explorer_heading: 'Explorador VFIDE', explorer_subtitle: 'Inspecciona carteras, bóvedas y puntuaciones.',
    escrow_heading: 'Depósito en garantía', escrow_subtitle: 'Pagos retenidos de forma segura.',
    merchant_setup: 'Configura tu tienda', merchant_analytics: 'Analítica',
    merchant_customers: 'Clientes', merchant_inventory: 'Inventario',
    merchant_invoices: 'Facturas', merchant_loyalty: 'Fidelización', merchant_subscriptions: 'Suscripciones',
    security_heading: 'Seguridad de la cuenta', security_subtitle: 'Supervisa sesiones y claves.',
    support_heading: 'Ayuda y soporte', support_tab_faq: 'FAQ',
    support_tab_tickets: 'Mis tickets', support_tab_new: 'Nuevo ticket',
    proofscore_heading: 'Tu ProofScore', proofscore_subtitle: 'Reputación on-chain para comisiones más bajas.',
    guardians_heading: 'Panel de guardianes', guardians_subtitle: 'Contactos de confianza para recuperar tu bóveda.',
    inheritance_heading: 'Herencia', inheritance_subtitle: 'Configura la herencia on-chain de tu bóveda.',
    invite_heading: 'Invitar amigos', invite_subtitle: 'Gana recompensas por cada amigo que traigas.',
    legal_heading: 'Legal y políticas', docs_heading: 'Documentación',
    roadmap_heading: 'Lo que viene', testnet_heading: 'Configuración testnet', developer_heading: 'Hub de desarrollo',
    onboarding_heading: 'Asistente de configuración',
    onboarding_subtitle: 'Empieza con VFIDE en menos de 2 minutos.', onboarding_launch: 'Abrir asistente',
  },

  'fr-FR': {
    common_back: 'Retour', common_loading: 'Chargement…', common_comingSoon: 'Bientôt disponible',
    common_notifyMe: 'Me notifier', common_getStarted: 'Commencer', common_learnMore: 'En savoir plus',
    common_save: 'Enregistrer', common_cancel: 'Annuler', common_confirm: 'Confirmer',
    common_close: 'Fermer', common_search: 'Rechercher…', common_filter: 'Filtrer',
    common_all: 'Tout', common_active: 'Actif', common_completed: 'Terminé',
    common_pending: 'En attente', common_failed: 'Échoué', common_success: 'Succès',
    common_error: 'Erreur', common_connect_wallet: 'Connecter le portefeuille',
    common_disconnect: 'Déconnecter', common_copy: 'Copier', common_share: 'Partager',
    common_settings: 'Paramètres', common_activity: 'Activité', common_overview: 'Aperçu',
    common_history: 'Historique', common_balance: 'Solde', common_send: 'Envoyer', common_receive: 'Recevoir',
    nav_home: 'Accueil', nav_pay: 'Payer', nav_merchant: 'Marchand', nav_social: 'Social',
    nav_more: 'Plus', nav_vault: 'Coffre', nav_wallet: 'Portefeuille',
    nav_rewards: 'Récompenses', nav_governance: 'Gouvernance',
    dashboard_welcome: 'Bienvenue', dashboard_tab_overview: 'Aperçu', dashboard_tab_badges: 'Badges',
    dashboard_tab_score: 'Simuler score', dashboard_tab_fees: 'Simuler frais', dashboard_tab_activity: 'Activité',
    dashboard_trust_score: 'Score de confiance', dashboard_fee_rate: 'Taux de frais', dashboard_transactions: 'Transactions',
    vault_heading: 'Votre Coffre', vault_subtitle: "Non-custodial. Rien qu'à vous.",
    vault_settings: 'Paramètres du coffre', vault_recover: 'Récupérer le coffre',
    vault_lock: 'Verrouiller le coffre', vault_safety: 'Fenêtre de sécurité',
    wallet_heading: 'Portefeuille', wallet_subtitle: 'Gérez vos clés et connexions.',
    wallet_connect: 'Connecter le portefeuille', wallet_hardware: 'Portefeuille matériel',
    wallet_paper: 'Portefeuille papier', wallet_recovery: 'Récupérer le coffre',
    wallet_guardians: 'Configurer les gardiens', wallet_buy: 'Acheter / Échanger',
    marketplace_heading: 'Marché', marketplace_subtitle: 'Achetez auprès de marchands vérifiés. Zéro frais.',
    marketplace_search: 'Rechercher des produits…', marketplace_filter: 'Filtrer',
    pay_heading: 'Envoyer un paiement', pay_subtitle: "Payez n'importe quel portefeuille. Zéro frais.",
    remittance_heading: "Envoyer de l'argent", remittance_subtitle: 'Transferts internationaux à coût quasi nul.',
    settings_heading: 'Paramètres', settings_tab_account: 'Compte',
    settings_tab_vault: 'Coffre', settings_tab_security: 'Sécurité', settings_tab_notifications: 'Notifications',
    profile_heading: 'Votre profil', profile_subtitle: 'Gérez votre identité publique.',
    notifications_heading: 'Notifications', notifications_subtitle: 'Restez informé.',
    achievements_heading: 'Réalisations', achievements_tab_achievements: 'Réalisations', achievements_tab_perks: 'Avantages',
    rewards_heading: 'Hub récompenses', rewards_subtitle: 'Gagnez des récompenses pour chaque action on-chain.',
    rewards_tab_rewards: 'Récompenses', rewards_tab_leaderboard: 'Classement', rewards_tab_quests: 'Quêtes',
    leaderboard_heading: 'Classement', leaderboard_subtitle: 'Meilleurs ProofScores ce mois.',
    social_heading: 'Social', social_subtitle: 'Suivez des portefeuilles. Partagez des paiements.',
    feed_heading: "Fil d'actualité", feed_subtitle: 'Activité de votre réseau.',
    sanctum_heading: 'Fonds Sanctum', sanctum_subtitle: 'Soutien communautaire au niveau du protocole.',
    sanctum_tab_overview: 'Aperçu', sanctum_tab_charities: 'Associations',
    sanctum_tab_disbursements: 'Décaissements', sanctum_tab_donate: 'Donner', sanctum_tab_history: 'Historique',
    governance_heading: 'Gouvernance', governance_subtitle: 'Votez sur les propositions.',
    dao_hub_heading: 'Hub DAO', dao_hub_subtitle: "Participez à la gouvernance on-chain.",
    council_heading: 'Conseil', council_subtitle: 'Comité de gouvernance élite.',
    treasury_heading: 'Trésorerie', treasury_subtitle: 'Aperçu de la trésorerie.',
    staking_heading: 'Staking', staking_subtitle: 'Stakez VFIDE pour gagner des récompenses.',
    explorer_heading: 'Explorateur VFIDE', explorer_subtitle: 'Inspectez les portefeuilles et les scores.',
    escrow_heading: 'Séquestre', escrow_subtitle: 'Paiements retenus de façon sécurisée.',
    merchant_setup: 'Configurer votre boutique', merchant_analytics: 'Analytique',
    merchant_customers: 'Clients', merchant_inventory: 'Inventaire',
    merchant_invoices: 'Factures', merchant_loyalty: 'Fidélité', merchant_subscriptions: 'Abonnements',
    security_heading: 'Sécurité du compte', security_subtitle: 'Surveillez les sessions et les clés.',
    support_heading: 'Aide et support', support_tab_faq: 'FAQ',
    support_tab_tickets: 'Mes tickets', support_tab_new: 'Nouveau ticket',
    proofscore_heading: 'Votre ProofScore', proofscore_subtitle: "Réputation on-chain pour des frais moins élevés.",
    guardians_heading: 'Tableau des gardiens', guardians_subtitle: 'Contacts de confiance pour récupérer votre coffre.',
    inheritance_heading: 'Héritage', inheritance_subtitle: "Configurez l'héritage on-chain de votre coffre.",
    invite_heading: 'Inviter des amis', invite_subtitle: 'Gagnez des récompenses pour chaque ami invité.',
    legal_heading: 'Légal et politiques', docs_heading: 'Documentation',
    roadmap_heading: 'Ce qui arrive', testnet_heading: 'Configuration testnet', developer_heading: 'Hub développeur',
    onboarding_heading: 'Assistant de configuration',
    onboarding_subtitle: 'Démarrez avec VFIDE en moins de 2 minutes.', onboarding_launch: "Ouvrir l'assistant",
  },

  'de-DE': {
    common_back: 'Zurück', common_loading: 'Laden…', common_comingSoon: 'Demnächst',
    common_notifyMe: 'Benachrichtigen', common_getStarted: 'Loslegen', common_learnMore: 'Mehr erfahren',
    common_save: 'Speichern', common_cancel: 'Abbrechen', common_confirm: 'Bestätigen',
    common_close: 'Schließen', common_search: 'Suchen…', common_filter: 'Filtern',
    common_all: 'Alle', common_active: 'Aktiv', common_completed: 'Abgeschlossen',
    common_pending: 'Ausstehend', common_failed: 'Fehlgeschlagen', common_success: 'Erfolg',
    common_error: 'Fehler', common_connect_wallet: 'Wallet verbinden',
    common_disconnect: 'Trennen', common_copy: 'Kopieren', common_share: 'Teilen',
    common_settings: 'Einstellungen', common_activity: 'Aktivität', common_overview: 'Übersicht',
    common_history: 'Verlauf', common_balance: 'Guthaben', common_send: 'Senden', common_receive: 'Empfangen',
    nav_home: 'Start', nav_pay: 'Zahlen', nav_merchant: 'Händler', nav_social: 'Sozial',
    nav_more: 'Mehr', nav_vault: 'Tresor', nav_wallet: 'Wallet',
    nav_rewards: 'Belohnungen', nav_governance: 'Governance',
    dashboard_welcome: 'Willkommen zurück', dashboard_tab_overview: 'Übersicht', dashboard_tab_badges: 'Abzeichen',
    dashboard_tab_score: 'Score-Sim', dashboard_tab_fees: 'Gebühren-Sim', dashboard_tab_activity: 'Aktivität',
    dashboard_trust_score: 'Vertrauensscore', dashboard_fee_rate: 'Gebührenrate', dashboard_transactions: 'Transaktionen',
    vault_heading: 'Ihr Tresor', vault_subtitle: 'Nicht verwahrend. Nur Ihres.',
    vault_settings: 'Tresor-Einstellungen', vault_recover: 'Tresor wiederherstellen',
    vault_lock: 'Tresor sperren', vault_safety: 'Sicherheitsfenster',
    wallet_heading: 'Wallet', wallet_subtitle: 'Verwalten Sie Ihre Schlüssel.',
    wallet_connect: 'Wallet verbinden', wallet_hardware: 'Hardware-Wallet',
    wallet_paper: 'Papier-Wallet', wallet_recovery: 'Tresor wiederherstellen',
    wallet_guardians: 'Wächter einrichten', wallet_buy: 'Kaufen / Tauschen',
    marketplace_heading: 'Marktplatz', marketplace_subtitle: 'Von verifizierten Händlern kaufen. Null Gebühren.',
    marketplace_search: 'Produkte suchen…', marketplace_filter: 'Filtern',
    pay_heading: 'Zahlung senden', pay_subtitle: 'Zahle an jede Wallet. Keine Händlergebühren.',
    remittance_heading: 'Geld nach Hause senden', remittance_subtitle: 'Internationale Überweisungen zu Minimalkosten.',
    settings_heading: 'Einstellungen', settings_tab_account: 'Konto',
    settings_tab_vault: 'Tresor', settings_tab_security: 'Sicherheit', settings_tab_notifications: 'Benachrichtigungen',
    profile_heading: 'Ihr Profil', profile_subtitle: 'Verwalten Sie Ihre öffentliche Identität.',
    notifications_heading: 'Benachrichtigungen', notifications_subtitle: 'Bleiben Sie auf dem Laufenden.',
    achievements_heading: 'Errungenschaften', achievements_tab_achievements: 'Errungenschaften', achievements_tab_perks: 'Vorteile',
    rewards_heading: 'Belohnungshub', rewards_subtitle: 'Verdiene Belohnungen für jede On-Chain-Aktion.',
    rewards_tab_rewards: 'Belohnungen', rewards_tab_leaderboard: 'Bestenliste', rewards_tab_quests: 'Aufgaben',
    leaderboard_heading: 'Bestenliste', leaderboard_subtitle: 'Top ProofScores diesen Monat.',
    social_heading: 'Sozial', social_subtitle: 'Wallets folgen. Zahlungen teilen.',
    feed_heading: 'Feed', feed_subtitle: 'Aktivität aus Ihrem Netzwerk.',
    sanctum_heading: 'Sanctum-Fonds', sanctum_subtitle: 'Unterstützung auf Protokollebene.',
    sanctum_tab_overview: 'Übersicht', sanctum_tab_charities: 'Organisationen',
    sanctum_tab_disbursements: 'Auszahlungen', sanctum_tab_donate: 'Spenden', sanctum_tab_history: 'Verlauf',
    governance_heading: 'Governance', governance_subtitle: 'Abstimmung über Protokollvorschläge.',
    dao_hub_heading: 'DAO-Hub', dao_hub_subtitle: 'An der On-Chain-Governance teilnehmen.',
    council_heading: 'Rat', council_subtitle: 'Elite-Governance-Ausschuss.',
    treasury_heading: 'Schatzkammer', treasury_subtitle: 'Protokollschatzkammer im Überblick.',
    staking_heading: 'Staking', staking_subtitle: 'VFIDE staken und Belohnungen verdienen.',
    explorer_heading: 'VFIDE-Explorer', explorer_subtitle: 'Wallets und Scores überprüfen.',
    escrow_heading: 'Treuhand', escrow_subtitle: 'Sicher hinterlegte Zahlungen.',
    merchant_setup: 'Ihren Shop einrichten', merchant_analytics: 'Analytik',
    merchant_customers: 'Kunden', merchant_inventory: 'Inventar',
    merchant_invoices: 'Rechnungen', merchant_loyalty: 'Kundenbindung', merchant_subscriptions: 'Abonnements',
    security_heading: 'Kontosicherheit', security_subtitle: 'Sitzungen und Schlüssel überwachen.',
    support_heading: 'Hilfe & Support', support_tab_faq: 'FAQ',
    support_tab_tickets: 'Meine Tickets', support_tab_new: 'Neues Ticket',
    proofscore_heading: 'Ihr ProofScore', proofscore_subtitle: 'On-Chain-Reputation für günstigere Gebühren.',
    guardians_heading: 'Wächter-Dashboard', guardians_subtitle: 'Vertrauenswürdige Kontakte zur Tresorverwaltung.',
    inheritance_heading: 'Erbschaft', inheritance_subtitle: 'On-Chain-Erbschaft für Ihren Tresor einrichten.',
    invite_heading: 'Freunde einladen', invite_subtitle: 'Belohnungen für jeden eingeladenen Freund.',
    legal_heading: 'Rechtliches & Richtlinien', docs_heading: 'Dokumentation',
    roadmap_heading: 'Was kommt', testnet_heading: 'Testnet-Einrichtung', developer_heading: 'Entwickler-Hub',
    onboarding_heading: 'Einrichtungsassistent',
    onboarding_subtitle: 'Starten Sie mit VFIDE in unter 2 Minuten.', onboarding_launch: 'Assistenten öffnen',
  },

  'ar-SA': {
    common_back: 'رجوع', common_loading: 'جارٍ التحميل…', common_comingSoon: 'قريباً',
    common_notifyMe: 'أعلمني', common_getStarted: 'ابدأ الآن', common_learnMore: 'اعرف المزيد',
    common_save: 'حفظ', common_cancel: 'إلغاء', common_confirm: 'تأكيد', common_close: 'إغلاق',
    common_search: 'بحث…', common_filter: 'تصفية', common_all: 'الكل', common_active: 'نشط',
    common_completed: 'مكتمل', common_pending: 'قيد الانتظار', common_failed: 'فشل',
    common_success: 'نجاح', common_error: 'خطأ', common_connect_wallet: 'ربط المحفظة',
    common_disconnect: 'قطع الاتصال', common_copy: 'نسخ', common_share: 'مشاركة',
    common_settings: 'الإعدادات', common_activity: 'النشاط', common_overview: 'نظرة عامة',
    common_history: 'السجل', common_balance: 'الرصيد', common_send: 'إرسال', common_receive: 'استقبال',
    nav_home: 'الرئيسية', nav_pay: 'ادفع', nav_merchant: 'التاجر', nav_social: 'اجتماعي',
    nav_more: 'المزيد', nav_vault: 'الخزينة', nav_wallet: 'المحفظة',
    nav_rewards: 'المكافآت', nav_governance: 'الحوكمة',
    dashboard_welcome: 'مرحباً بعودتك', dashboard_tab_overview: 'نظرة عامة', dashboard_tab_badges: 'الشارات',
    dashboard_tab_score: 'محاكي النقاط', dashboard_tab_fees: 'محاكي الرسوم', dashboard_tab_activity: 'النشاط',
    dashboard_trust_score: 'درجة الثقة', dashboard_fee_rate: 'معدل الرسوم', dashboard_transactions: 'المعاملات',
    vault_heading: 'خزينتك', vault_subtitle: 'غير احتجازي. لك وحدك.',
    vault_settings: 'إعدادات الخزينة', vault_recover: 'استعادة الخزينة',
    vault_lock: 'قفل الخزينة', vault_safety: 'نافذة الأمان',
    wallet_heading: 'المحفظة', wallet_subtitle: 'أدر مفاتيحك واتصالاتك.',
    wallet_connect: 'ربط المحفظة', wallet_hardware: 'محفظة الأجهزة',
    wallet_paper: 'محفظة ورقية', wallet_recovery: 'استعادة الخزينة',
    wallet_guardians: 'إعداد الحراس', wallet_buy: 'شراء / تبادل',
    marketplace_heading: 'السوق', marketplace_subtitle: 'اشتر من تجار موثقين. بدون رسوم.',
    marketplace_search: 'البحث عن منتجات…', marketplace_filter: 'تصفية',
    pay_heading: 'إرسال دفعة', pay_subtitle: 'ادفع لأي محفظة. بدون رسوم تاجر.',
    remittance_heading: 'إرسال الأموال للوطن', remittance_subtitle: 'تحويلات دولية بتكلفة شبه صفرية.',
    settings_heading: 'الإعدادات', settings_tab_account: 'الحساب',
    settings_tab_vault: 'الخزينة', settings_tab_security: 'الأمان', settings_tab_notifications: 'الإشعارات',
    profile_heading: 'ملفك الشخصي', profile_subtitle: 'أدر هويتك العامة.',
    notifications_heading: 'الإشعارات', notifications_subtitle: 'ابقَ على اطلاع.',
    achievements_heading: 'الإنجازات', achievements_tab_achievements: 'الإنجازات', achievements_tab_perks: 'المزايا',
    rewards_heading: 'مركز المكافآت', rewards_subtitle: 'اكسب مكافآت على كل إجراء على السلسلة.',
    rewards_tab_rewards: 'المكافآت', rewards_tab_leaderboard: 'المتصدرون', rewards_tab_quests: 'المهام',
    leaderboard_heading: 'لوحة الصدارة', leaderboard_subtitle: 'أعلى ProofScores هذا الشهر.',
    social_heading: 'اجتماعي', social_subtitle: 'تابع محافظ. شارك المدفوعات.',
    feed_heading: 'الخلاصة', feed_subtitle: 'نشاط شبكتك.',
    sanctum_heading: 'صندوق Sanctum', sanctum_subtitle: 'دعم مجتمعي على مستوى البروتوكول.',
    sanctum_tab_overview: 'نظرة عامة', sanctum_tab_charities: 'الجمعيات',
    sanctum_tab_disbursements: 'المدفوعات', sanctum_tab_donate: 'تبرع', sanctum_tab_history: 'السجل',
    governance_heading: 'الحوكمة', governance_subtitle: 'صوّت على مقترحات البروتوكول.',
    dao_hub_heading: 'مركز DAO', dao_hub_subtitle: 'شارك في الحوكمة على السلسلة.',
    council_heading: 'المجلس', council_subtitle: 'لجنة الحوكمة النخبة.',
    treasury_heading: 'الخزينة', treasury_subtitle: 'نظرة عامة على خزينة البروتوكول.',
    staking_heading: 'الرهن', staking_subtitle: 'ارهن VFIDE لكسب المكافآت.',
    explorer_heading: 'مستكشف VFIDE', explorer_subtitle: 'افحص المحافظ والخزائن والنقاط.',
    escrow_heading: 'الضمان', escrow_subtitle: 'مدفوعات مؤجلة بشكل آمن بين الأطراف.',
    merchant_setup: 'إعداد متجرك', merchant_analytics: 'التحليلات',
    merchant_customers: 'العملاء', merchant_inventory: 'المخزون',
    merchant_invoices: 'الفواتير', merchant_loyalty: 'الولاء', merchant_subscriptions: 'الاشتراكات',
    security_heading: 'أمان الحساب', security_subtitle: 'راقب الجلسات والمفاتيح.',
    support_heading: 'المساعدة والدعم', support_tab_faq: 'الأسئلة الشائعة',
    support_tab_tickets: 'تذاكري', support_tab_new: 'تذكرة جديدة',
    proofscore_heading: 'درجة ProofScore', proofscore_subtitle: 'سمعة على السلسلة تمنحك رسوماً أقل.',
    guardians_heading: 'لوحة الحراس', guardians_subtitle: 'جهات اتصال موثوقة لاستعادة خزينتك.',
    inheritance_heading: 'الميراث', inheritance_subtitle: 'إعداد الميراث على السلسلة لخزينتك.',
    invite_heading: 'دعوة الأصدقاء', invite_subtitle: 'اكسب مكافآت على كل صديق تدعوه.',
    legal_heading: 'القانونية والسياسات', docs_heading: 'التوثيق',
    roadmap_heading: 'القادم قريباً', testnet_heading: 'إعداد الشبكة التجريبية', developer_heading: 'مركز المطورين',
    onboarding_heading: 'معالج الإعداد',
    onboarding_subtitle: 'ابدأ مع VFIDE في أقل من دقيقتين.', onboarding_launch: 'فتح المعالج',
  },

  'hi-IN': {
    common_back: 'वापस', common_loading: 'लोड हो रहा है…', common_comingSoon: 'जल्द आ रहा है',
    common_notifyMe: 'सूचित करें', common_getStarted: 'शुरू करें', common_learnMore: 'और जानें',
    common_save: 'सहेजें', common_cancel: 'रद्द करें', common_confirm: 'पुष्टि करें',
    common_close: 'बंद करें', common_search: 'खोजें…', common_filter: 'फ़िल्टर',
    common_all: 'सभी', common_active: 'सक्रिय', common_completed: 'पूर्ण',
    common_pending: 'लंबित', common_failed: 'विफल', common_success: 'सफलता',
    common_error: 'त्रुटि', common_connect_wallet: 'वॉलेट जोड़ें', common_disconnect: 'डिस्कनेक्ट',
    common_copy: 'कॉपी', common_share: 'शेयर', common_settings: 'सेटिंग्स',
    common_activity: 'गतिविधि', common_overview: 'सारांश', common_history: 'इतिहास',
    common_balance: 'बैलेंस', common_send: 'भेजें', common_receive: 'प्राप्त करें',
    nav_home: 'होम', nav_pay: 'भुगतान', nav_merchant: 'व्यापारी', nav_social: 'सामाजिक',
    nav_more: 'अधिक', nav_vault: 'वॉल्ट', nav_wallet: 'वॉलेट',
    nav_rewards: 'पुरस्कार', nav_governance: 'शासन',
    dashboard_welcome: 'वापसी पर स्वागत है', dashboard_tab_overview: 'सारांश', dashboard_tab_badges: 'बैज',
    dashboard_tab_score: 'स्कोर सिम', dashboard_tab_fees: 'शुल्क सिम', dashboard_tab_activity: 'गतिविधि',
    dashboard_trust_score: 'विश्वास स्कोर', dashboard_fee_rate: 'शुल्क दर', dashboard_transactions: 'लेन-देन',
    vault_heading: 'आपका वॉल्ट', vault_subtitle: 'गैर-कस्टोडियल। केवल आपका।',
    wallet_heading: 'वॉलेट', wallet_subtitle: 'अपनी चाबियाँ प्रबंधित करें।',
    marketplace_heading: 'मार्केटप्लेस', marketplace_subtitle: 'सत्यापित व्यापारियों से खरीदें। शून्य शुल्क।',
    marketplace_search: 'उत्पाद खोजें…', marketplace_filter: 'फ़िल्टर',
    pay_heading: 'भुगतान भेजें', pay_subtitle: 'किसी भी वॉलेट को भुगतान करें। शून्य शुल्क।',
    remittance_heading: 'पैसे घर भेजें', remittance_subtitle: 'लगभग शून्य लागत पर अंतर्राष्ट्रीय स्थानांतरण।',
    settings_heading: 'सेटिंग्स', settings_tab_account: 'खाता',
    settings_tab_vault: 'वॉल्ट', settings_tab_security: 'सुरक्षा', settings_tab_notifications: 'सूचनाएं',
    profile_heading: 'आपका प्रोफ़ाइल', profile_subtitle: 'अपनी सार्वजनिक पहचान प्रबंधित करें।',
    notifications_heading: 'सूचनाएं', notifications_subtitle: 'अपडेट रहें।',
    achievements_heading: 'उपलब्धियां', achievements_tab_achievements: 'उपलब्धियां', achievements_tab_perks: 'लाभ',
    rewards_heading: 'पुरस्कार हब', rewards_subtitle: 'हर ऑन-चेन कार्य के लिए पुरस्कार अर्जित करें।',
    rewards_tab_rewards: 'पुरस्कार', rewards_tab_leaderboard: 'लीडरबोर्ड', rewards_tab_quests: 'क्वेस्ट',
    leaderboard_heading: 'लीडरबोर्ड', leaderboard_subtitle: 'इस महीने के शीर्ष ProofScore।',
    social_heading: 'सामाजिक', social_subtitle: 'वॉलेट फॉलो करें। भुगतान साझा करें।',
    feed_heading: 'फ़ीड', feed_subtitle: 'आपके नेटवर्क की गतिविधि।',
    sanctum_heading: 'सैंक्टम फंड', sanctum_subtitle: 'प्रोटोकॉल-स्तर सामुदायिक समर्थन।',
    sanctum_tab_overview: 'सारांश', sanctum_tab_charities: 'दान संस्थाएं',
    sanctum_tab_disbursements: 'वितरण', sanctum_tab_donate: 'दान', sanctum_tab_history: 'इतिहास',
    governance_heading: 'शासन', governance_subtitle: 'प्रोटोकॉल प्रस्तावों पर वोट करें।',
    dao_hub_heading: 'DAO हब', dao_hub_subtitle: 'ऑन-चेन शासन में भाग लें।',
    council_heading: 'परिषद', council_subtitle: 'एलीट गवर्नेंस कमेटी।',
    treasury_heading: 'खजाना', treasury_subtitle: 'प्रोटोकॉल ट्रेजरी अवलोकन।',
    staking_heading: 'स्टेकिंग', staking_subtitle: 'पुरस्कार अर्जित करने के लिए VFIDE स्टेक करें।',
    explorer_heading: 'VFIDE एक्सप्लोरर', explorer_subtitle: 'वॉलेट, वॉल्ट और ProofScore देखें।',
    escrow_heading: 'एस्क्रो', escrow_subtitle: 'पार्टियों के बीच सुरक्षित भुगतान।',
    merchant_setup: 'अपनी दुकान सेट करें', merchant_analytics: 'विश्लेषण',
    merchant_customers: 'ग्राहक', merchant_inventory: 'इन्वेंट्री',
    merchant_invoices: 'चालान', merchant_loyalty: 'वफ़ादारी', merchant_subscriptions: 'सदस्यता',
    security_heading: 'खाता सुरक्षा', security_subtitle: 'सत्रों और चाबियों की निगरानी करें।',
    support_heading: 'सहायता और समर्थन', support_tab_faq: 'FAQ',
    support_tab_tickets: 'मेरे टिकट', support_tab_new: 'नया टिकट',
    proofscore_heading: 'आपका ProofScore', proofscore_subtitle: 'ऑन-चेन प्रतिष्ठा जो शुल्क कम करती है।',
    guardians_heading: 'गार्जियन डैशबोर्ड', guardians_subtitle: 'आपकी वॉल्ट रिकवरी के लिए विश्वसनीय संपर्क।',
    inheritance_heading: 'उत्तराधिकार', inheritance_subtitle: 'अपनी वॉल्ट के लिए ऑन-चेन उत्तराधिकार सेट करें।',
    invite_heading: 'दोस्तों को आमंत्रित करें', invite_subtitle: 'हर आमंत्रित मित्र के लिए पुरस्कार अर्जित करें।',
    legal_heading: 'कानूनी और नीतियां', docs_heading: 'दस्तावेज़ीकरण',
    roadmap_heading: 'क्या आ रहा है', testnet_heading: 'टेस्टनेट सेटअप', developer_heading: 'डेवलपर हब',
    onboarding_heading: 'सेटअप विज़ार्ड',
    onboarding_subtitle: 'VFIDE के साथ 2 मिनट से कम में शुरू करें।', onboarding_launch: 'विज़ार्ड खोलें',
  },

  'ja-JP': {
    common_back: '戻る', common_loading: '読み込み中…', common_comingSoon: '近日公開',
    common_notifyMe: '通知する', common_getStarted: '始める', common_learnMore: '詳細を見る',
    common_save: '保存', common_cancel: 'キャンセル', common_confirm: '確認', common_close: '閉じる',
    common_search: '検索…', common_filter: 'フィルター', common_all: 'すべて', common_active: 'アクティブ',
    common_completed: '完了', common_pending: '保留中', common_failed: '失敗', common_success: '成功',
    common_error: 'エラー', common_connect_wallet: 'ウォレットを接続', common_disconnect: '切断',
    common_copy: 'コピー', common_share: 'シェア', common_settings: '設定',
    common_activity: 'アクティビティ', common_overview: '概要', common_history: '履歴',
    common_balance: '残高', common_send: '送る', common_receive: '受け取る',
    nav_home: 'ホーム', nav_pay: '支払い', nav_merchant: 'マーチャント', nav_social: 'ソーシャル',
    nav_more: 'もっと', nav_vault: 'ボールト', nav_wallet: 'ウォレット',
    nav_rewards: '報酬', nav_governance: 'ガバナンス',
    dashboard_welcome: 'おかえりなさい', dashboard_tab_overview: '概要', dashboard_tab_badges: 'バッジ',
    dashboard_tab_score: 'スコアシミュ', dashboard_tab_fees: '手数料シミュ', dashboard_tab_activity: 'アクティビティ',
    dashboard_trust_score: 'トラストスコア', dashboard_fee_rate: '手数料率', dashboard_transactions: '取引数',
    vault_heading: 'あなたのボールト', vault_subtitle: '非カストディアル。あなただけのもの。',
    vault_settings: 'ボールト設定', vault_recover: 'ボールトを回復',
    vault_lock: 'ボールトをロック', vault_safety: 'セーフティウィンドウ',
    wallet_heading: 'ウォレット', wallet_subtitle: '鍵と接続を管理。',
    wallet_connect: 'ウォレットを接続', wallet_hardware: 'ハードウェアウォレット',
    wallet_paper: 'ペーパーウォレット', wallet_recovery: 'ボールトを回復',
    wallet_guardians: 'ガーディアン設定', wallet_buy: '購入 / スワップ',
    marketplace_heading: 'マーケットプレイス', marketplace_subtitle: '認定マーチャントから購入。手数料なし。',
    marketplace_search: '商品を検索…', marketplace_filter: 'フィルター',
    pay_heading: '支払いを送る', pay_subtitle: '任意のウォレットへ。マーチャント手数料ゼロ。',
    remittance_heading: '仕送り', remittance_subtitle: 'ほぼゼロコストの国際送金。',
    settings_heading: '設定', settings_tab_account: 'アカウント',
    settings_tab_vault: 'ボールト', settings_tab_security: 'セキュリティ', settings_tab_notifications: '通知',
    profile_heading: 'あなたのプロフィール', profile_subtitle: '公開プロフィールを管理。',
    notifications_heading: '通知', notifications_subtitle: '最新情報を受け取る。',
    achievements_heading: '実績', achievements_tab_achievements: '実績', achievements_tab_perks: '特典',
    rewards_heading: '報酬ハブ', rewards_subtitle: 'すべてのオンチェーンアクションで報酬を獲得。',
    rewards_tab_rewards: '報酬', rewards_tab_leaderboard: 'ランキング', rewards_tab_quests: 'クエスト',
    leaderboard_heading: 'ランキング', leaderboard_subtitle: '今月のトップProofScore。',
    social_heading: 'ソーシャル', social_subtitle: 'ウォレットをフォロー。支払いをシェア。',
    feed_heading: 'フィード', feed_subtitle: 'ネットワークのアクティビティ。',
    sanctum_heading: 'サンクタムファンド', sanctum_subtitle: 'プロトコルレベルのコミュニティサポート。',
    sanctum_tab_overview: '概要', sanctum_tab_charities: '慈善団体',
    sanctum_tab_disbursements: '支出', sanctum_tab_donate: '寄付', sanctum_tab_history: '履歴',
    governance_heading: 'ガバナンス', governance_subtitle: 'プロトコル提案に投票。',
    dao_hub_heading: 'DAOハブ', dao_hub_subtitle: 'オンチェーンガバナンスに参加。',
    council_heading: '評議会', council_subtitle: 'エリートガバナンス委員会。',
    treasury_heading: '財務', treasury_subtitle: 'プロトコル財務の概要。',
    staking_heading: 'ステーキング', staking_subtitle: 'VFIDEをステークして報酬を獲得。',
    explorer_heading: 'VFIDEエクスプローラー', explorer_subtitle: 'ウォレット、ボールト、スコアを調査。',
    escrow_heading: 'エスクロー', escrow_subtitle: '当事者間の安全な保留払い。',
    merchant_setup: 'ショップを設定', merchant_analytics: '分析',
    merchant_customers: '顧客', merchant_inventory: '在庫',
    merchant_invoices: '請求書', merchant_loyalty: 'ロイヤリティ', merchant_subscriptions: 'サブスク',
    security_heading: 'アカウントセキュリティ', security_subtitle: 'セッションと鍵を監視。',
    support_heading: 'ヘルプ & サポート', support_tab_faq: 'よくある質問',
    support_tab_tickets: 'チケット', support_tab_new: '新規チケット',
    proofscore_heading: 'あなたのProofScore', proofscore_subtitle: 'オンチェーンの評判で手数料を下げよう。',
    guardians_heading: 'ガーディアンダッシュボード', guardians_subtitle: 'ボールト回復を助ける信頼できる連絡先。',
    inheritance_heading: '相続', inheritance_subtitle: 'ボールトのオンチェーン相続を設定。',
    invite_heading: '友達を招待', invite_subtitle: '招待した友達ごとに報酬を獲得。',
    legal_heading: '法律とポリシー', docs_heading: 'ドキュメント',
    roadmap_heading: '今後の予定', testnet_heading: 'テストネット設定', developer_heading: '開発者ハブ',
    onboarding_heading: 'セットアップウィザード',
    onboarding_subtitle: 'VFIDEを2分以内に始めよう。', onboarding_launch: 'ウィザードを開く',
  },

  'zh-CN': {
    common_back: '返回', common_loading: '加载中…', common_comingSoon: '即将推出',
    common_notifyMe: '通知我', common_getStarted: '开始使用', common_learnMore: '了解更多',
    common_save: '保存', common_cancel: '取消', common_confirm: '确认', common_close: '关闭',
    common_search: '搜索…', common_filter: '筛选', common_all: '全部', common_active: '活跃',
    common_completed: '已完成', common_pending: '待处理', common_failed: '失败', common_success: '成功',
    common_error: '错误', common_connect_wallet: '连接钱包', common_disconnect: '断开连接',
    common_copy: '复制', common_share: '分享', common_settings: '设置',
    common_activity: '活动', common_overview: '概览', common_history: '历史',
    common_balance: '余额', common_send: '发送', common_receive: '接收',
    nav_home: '首页', nav_pay: '付款', nav_merchant: '商家', nav_social: '社交',
    nav_more: '更多', nav_vault: '金库', nav_wallet: '钱包',
    nav_rewards: '奖励', nav_governance: '治理',
    dashboard_welcome: '欢迎回来', dashboard_tab_overview: '概览', dashboard_tab_badges: '徽章',
    dashboard_tab_score: '评分模拟', dashboard_tab_fees: '费用模拟', dashboard_tab_activity: '活动',
    dashboard_trust_score: '信任评分', dashboard_fee_rate: '费率', dashboard_transactions: '交易数',
    vault_heading: '您的金库', vault_subtitle: '非托管。只属于您。',
    vault_settings: '金库设置', vault_recover: '恢复金库',
    vault_lock: '锁定金库', vault_safety: '安全窗口',
    wallet_heading: '钱包', wallet_subtitle: '管理您的密钥和连接。',
    wallet_connect: '连接钱包', wallet_hardware: '硬件钱包',
    wallet_paper: '纸钱包', wallet_recovery: '恢复金库',
    wallet_guardians: '设置守护人', wallet_buy: '购买 / 兑换',
    marketplace_heading: '市场', marketplace_subtitle: '从认证商家购买。零手续费。',
    marketplace_search: '搜索商品…', marketplace_filter: '筛选',
    pay_heading: '发送付款', pay_subtitle: '向任意钱包付款。零商家费用。',
    remittance_heading: '汇款回家', remittance_subtitle: '近乎零成本的国际转账。',
    settings_heading: '设置', settings_tab_account: '账户',
    settings_tab_vault: '金库', settings_tab_security: '安全', settings_tab_notifications: '通知',
    profile_heading: '您的个人资料', profile_subtitle: '管理您的公开身份。',
    notifications_heading: '通知', notifications_subtitle: '保持最新动态。',
    achievements_heading: '成就', achievements_tab_achievements: '成就', achievements_tab_perks: '特权',
    rewards_heading: '奖励中心', rewards_subtitle: '每次链上操作都能赚取奖励。',
    rewards_tab_rewards: '奖励', rewards_tab_leaderboard: '排行榜', rewards_tab_quests: '任务',
    leaderboard_heading: '排行榜', leaderboard_subtitle: '本月最高ProofScore。',
    social_heading: '社交', social_subtitle: '关注钱包。分享付款。',
    feed_heading: '动态', feed_subtitle: '您网络的活动。',
    sanctum_heading: 'Sanctum基金', sanctum_subtitle: '协议级社区支持 — 每次销毁的2%。',
    sanctum_tab_overview: '概览', sanctum_tab_charities: '慈善机构',
    sanctum_tab_disbursements: '拨款', sanctum_tab_donate: '捐赠', sanctum_tab_history: '历史',
    governance_heading: '治理', governance_subtitle: '对协议提案进行投票。',
    dao_hub_heading: 'DAO中心', dao_hub_subtitle: '参与链上治理。',
    council_heading: '理事会', council_subtitle: '精英治理委员会。',
    treasury_heading: '财务', treasury_subtitle: '协议财务概览。',
    staking_heading: '质押', staking_subtitle: '质押VFIDE赚取奖励。',
    explorer_heading: 'VFIDE浏览器', explorer_subtitle: '查看钱包、金库和ProofScore。',
    escrow_heading: '托管', escrow_subtitle: '各方之间安全托管的付款。',
    merchant_setup: '设置您的店铺', merchant_analytics: '分析',
    merchant_customers: '客户', merchant_inventory: '库存',
    merchant_invoices: '发票', merchant_loyalty: '忠诚度', merchant_subscriptions: '订阅',
    security_heading: '账户安全', security_subtitle: '监控会话和密钥。',
    support_heading: '帮助与支持', support_tab_faq: '常见问题',
    support_tab_tickets: '我的工单', support_tab_new: '新建工单',
    proofscore_heading: '您的ProofScore', proofscore_subtitle: '链上声誉助您获得更低费用。',
    guardians_heading: '守护人仪表板', guardians_subtitle: '可帮助恢复金库的可信联系人。',
    inheritance_heading: '继承', inheritance_subtitle: '为您的金库设置链上继承。',
    invite_heading: '邀请朋友', invite_subtitle: '每邀请一位朋友即可获得奖励。',
    legal_heading: '法律与政策', docs_heading: '文档',
    roadmap_heading: '即将推出', testnet_heading: '测试网设置', developer_heading: '开发者中心',
    onboarding_heading: '设置向导',
    onboarding_subtitle: '在2分钟内开始使用VFIDE。', onboarding_launch: '打开向导',
  },
};

// Locales that fall back to English (not yet translated)
const FALLBACK_LOCALES: SupportedLocale[] = ['en-GB', 'fil-PH', 'id-ID', 'th-TH'];

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useT(): TranslationKeys {
  const [locale] = useLocale();
  if (FALLBACK_LOCALES.includes(locale)) return en;
  const override = overrides[locale];
  if (!override) return en;
  return { ...en, ...override } as TranslationKeys;
}

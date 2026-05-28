'use client';

export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion, AnimatePresence, LazyMotion, domAnimation } from 'framer-motion';
import { useAccount } from 'wagmi';
import {
  Store, ArrowRight, FileText, Package, CalendarDays, Repeat,
  DollarSign, Link2, Percent, Users, RotateCcw, Award, Receipt,
  Tag, UserCog, BarChart3, Gift, MapPin, Truck, Boxes, GraduationCap,
  Banknote, Lock, Zap, Calendar, LayoutGrid,
} from 'lucide-react';
import { Footer } from '@/components/layout/Footer';
import { HubSection, type HubLink } from '@/components/navigation/HubGrid';
import { MerchantDashboard } from '@/components/merchant/MerchantDashboard';
import { PaymentInterface } from '@/components/merchant/PaymentInterface';
import { PaymentQR } from '@/components/merchant/PaymentQR';
import { useLocale } from '@/hooks/useLocale';
import { MERCHANT_TRANSLATIONS, pickLocaleCopy } from '@/lib/i18n';
import nextDynamic from 'next/dynamic';

// Tab content — lazy loaded
const EscrowTab    = nextDynamic(() => import('./components/EscrowTab').then(m => ({ default: m.EscrowTab })),       { ssr: false });
const FlashloansTab= nextDynamic(() => import('./components/FlashloansTab').then(m => ({ default: m.FlashloansTab })), { ssr: false });
const PayrollTab   = nextDynamic(() => import('./components/PayrollTab').then(m => ({ default: m.PayrollTab })),     { ssr: false });

type TabId = 'hub' | 'escrow' | 'flashloans' | 'payroll';

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: 'hub',        label: 'Hub',        icon: LayoutGrid },
  { id: 'escrow',     label: 'Escrow',     icon: Lock       },
  { id: 'flashloans', label: 'Flashloans', icon: Zap        },
  { id: 'payroll',    label: 'Payroll',    icon: Calendar   },
];

// ─── Hub module lists ────────────────────────────────────────────────────────
const SALES_MODULES: HubLink[] = [
  { href: '/merchant/inventory',     icon: Package,     label: 'Inventory',     description: 'Products, stock levels, low-stock alerts.' },
  { href: '/merchant/invoices',      icon: FileText,    label: 'Invoices',      description: 'Itemized bills with payment links.' },
  { href: '/merchant/payment-links', icon: Link2,       label: 'Payment links', description: 'Share a URL for any product or amount.' },
  { href: '/merchant/bookings',      icon: CalendarDays,label: 'Bookings',      description: 'Appointments and availability slots.' },
  { href: '/subscriptions',          icon: Repeat,      label: 'Subscriptions', description: 'Weekly, monthly, quarterly, yearly plans.' },
];
const CUSTOMER_MODULES: HubLink[] = [
  { href: '/merchant/customers', icon: Users,    label: 'Customers', description: 'Your buyer list, with lifetime value.' },
  { href: '/merchant/loyalty',   icon: Award,    label: 'Loyalty',   description: 'Punch cards, point rewards, tiers.' },
  { href: '/merchant/coupons',   icon: Tag,      label: 'Discounts', description: 'Coupon codes and promotional campaigns.' },
  { href: '/merchant/gift-cards',icon: Gift,     label: 'Gift cards',description: 'Issue and redeem stored-value cards.' },
  { href: '/merchant/returns',   icon: RotateCcw,label: 'Returns',   description: 'Refunds and dispute handling.' },
];
const OPS_MODULES: HubLink[] = [
  { href: '/merchant/expenses',     icon: Receipt,  label: 'Expenses',     description: 'Track outgoings against revenue.' },
  { href: '/merchant/tax',          icon: Percent,  label: 'Sales tax',    description: 'Per-jurisdiction tax configuration.' },
  { href: '/merchant/tips',         icon: DollarSign,label: 'Tips',        description: 'Tip jar settings and history.' },
  { href: '/merchant/installments', icon: RotateCcw,label: 'Installments', description: 'Buy now, pay later plans.' },
  { href: '/merchant/staff',        icon: UserCog,  label: 'Staff',        description: 'Team access roles and activity.' },
];
const BUSINESS_MODULES: HubLink[] = [
  { href: '/merchant/analytics', icon: BarChart3,label: 'Analytics', description: 'Revenue, customers, and trends.' },
  { href: '/merchant/locations', icon: MapPin,   label: 'Locations', description: 'Multi-store and franchise management.' },
  { href: '/merchant/suppliers', icon: Truck,    label: 'Suppliers', description: 'Supply chain and purchase orders.' },
  { href: '/merchant/wholesale', icon: Boxes,    label: 'Wholesale', description: 'B2B pricing and group buys.' },
];
const SETUP_MODULES: HubLink[] = [
  { href: '/merchant/setup',         icon: Store,   label: 'Merchant setup', description: 'Configure your storefront and payouts.' },
  { href: '/merchant/profile/setup', icon: UserCog, label: 'VFIDE Profile',  description: 'Set up your on-chain business identity.' },
];
const EARNINGS_MODULES: HubLink[] = [
  { href: '/merchant/payouts', icon: Banknote, label: 'Earnings & payouts', description: 'See confirmed earnings and cash out to mobile money, bank, or airtime.' },
];

const processors = [
  { name: 'Square', fee: '2.6% + $0.10' },
  { name: 'Stripe', fee: '2.9% + $0.30' },
  { name: 'PayPal', fee: '3.49% + $0.49' },
  { name: 'VFIDE',  fee: '0%*' },
];

// ─── Inner component (needs useSearchParams) ──────────────────────────────────
function MerchantHubInner() {
  const searchParams = useSearchParams();
  const initial = (searchParams.get('tab') as TabId | null) ?? 'hub';
  const [activeTab, setActiveTab] = useState<TabId>(
    TABS.find(t => t.id === initial) ? initial : 'hub'
  );
  const [locale] = useLocale();
  const copy = pickLocaleCopy(MERCHANT_TRANSLATIONS, locale);
  const { address, isConnected } = useAccount();

  return (
    <>
      <div className="min-h-screen bg-zinc-950 md:pt-[3.5rem]">
        {/* Hero */}
        <section className="relative py-16 overflow-hidden">
          <div className="hero-mesh-bg opacity-60" aria-hidden="true">
            <div className="mesh-orb-cyan" style={{ width: '50%', height: '50%', top: '-10%', right: '-5%' }} />
          </div>
          <div className="container mx-auto max-w-6xl px-4">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-10">
              <div className="badge-live mb-5 mx-auto w-fit">
                <Store size={12} className="mr-1" /> Merchant Portal
              </div>
              <h1 className="text-4xl md:text-5xl font-black text-white mb-4 tracking-tight">
                {isConnected ? 'Welcome back' : 'Run your whole business from here'}
              </h1>
              <p className="mx-auto max-w-2xl text-lg text-zinc-400 leading-relaxed">
                {isConnected
                  ? <>Connected as <span className="font-mono text-accent">{address?.slice(0, 6)}…{address?.slice(-4)}</span>. Pick a module below.</>
                  : 'Inventory, invoicing, payroll, escrow — every operations tool a small business needs, with zero payment-processor fees.'}
              </p>
              {!isConnected && (
                <Link href="/merchant/setup" className="btn-premium btn-premium-primary mt-8 inline-flex">
                  <Store size={16} /> {copy.getStarted} <ArrowRight size={15} />
                </Link>
              )}
            </motion.div>

            {/* ─── Tab bar ─────────────────────────────────────────────────── */}
            <div
              className="flex gap-1 overflow-x-auto scrollbar-hide border-b border-white/8 mb-8"
              role="tablist"
              aria-label="Merchant hub sections"
            >
              {TABS.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  role="tab"
                  onClick={() => setActiveTab(id)}
                  aria-selected={activeTab === id}
                  className={`flex items-center gap-1.5 px-5 py-3 text-sm font-medium rounded-t-lg transition-colors whitespace-nowrap -mb-px
                    ${activeTab === id
                      ? 'text-accent border-b-2 border-accent bg-accent/8'
                      : 'text-zinc-400 hover:text-white border-b-2 border-transparent'}`}
                >
                  <Icon size={14} /> {label}
                </button>
              ))}
            </div>

            {/* ─── Tab panels ──────────────────────────────────────────────── */}
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.2 }}
              >
                {/* HUB ─────────────────────────────────────────────────────── */}
                {activeTab === 'hub' && (
                  <div className="space-y-10">
                    {/* Quick-action cards */}
                    <h2 className="text-2xl font-bold text-white mb-2">Merchant Portal</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="analytics-card p-6">
                        <h3 className="text-lg font-semibold text-white mb-4">Merchant Dashboard</h3>
                        <MerchantDashboard />
                      </div>
                      <div className="analytics-card p-6">
                        <h3 className="text-lg font-semibold text-white mb-4">Make Payment</h3>
                        <PaymentInterface />
                      </div>
                    </div>

                    <div className="analytics-card p-6">
                      <h2 className="text-xl font-bold text-white mb-5">Generate Payment QR Code</h2>
                      <PaymentQR />
                    </div>

                    {/* Processor comparison */}
                    <div className="max-w-2xl mx-auto">
                      <h2 className="mb-6 text-center text-xl font-bold text-white">vs Traditional Processors</h2>
                      <div className="glass-card-premium p-1 overflow-hidden">
                        <div className="flex items-center justify-between rounded-t-xl border-b border-white/8 bg-white/4 px-5 py-3">
                          <div className="text-xs font-bold uppercase tracking-wider text-zinc-400">Processor</div>
                          <div className="text-xs font-bold uppercase tracking-wider text-zinc-400">Processing Fee</div>
                        </div>
                        {processors.map((p) => (
                          <div key={p.name} className={`flex items-center justify-between px-5 py-3.5 border-b border-white/5 last:border-0 transition-colors ${p.name === 'VFIDE' ? 'bg-accent/8' : 'hover:bg-white/3'}`}>
                            <div className={`font-semibold text-sm ${p.name === 'VFIDE' ? 'text-accent' : 'text-white'}`}>{p.name}</div>
                            <div className={`font-mono font-bold text-sm ${p.name === 'VFIDE' ? 'text-glow-cyan' : 'text-zinc-300'}`}>{p.fee}</div>
                          </div>
                        ))}
                      </div>
                      <p className="text-xs text-zinc-500 mt-3 text-center">
                        * Burn fees of 0.25–5% and Base gas apply. Merchant pays nothing.
                      </p>
                    </div>

                    {/* Getting started */}
                    <div className="max-w-2xl mx-auto">
                      <h2 className="mb-5 text-center text-xl font-bold text-white">Getting Started</h2>
                      <div className="glass-card-premium overflow-hidden divide-y divide-white/5">
                        {[
                          { title: 'Register Your Business', desc: 'Connect your wallet and create your merchant profile in seconds.' },
                          { title: 'Configure Settings',     desc: 'Set payout preferences, tax settings, and notification options.' },
                          { title: 'Start Accepting Payments', desc: 'Share your payment link — receive any stablecoin, zero merchant fees.' },
                        ].map((item, i) => (
                          <div key={i} className="flex items-start gap-4 p-5 hover:bg-white/3 transition-colors">
                            <div className="step-number-badge shrink-0" style={{ width: '2.25rem', height: '2.25rem', fontSize: '0.875rem' }}>{i + 1}</div>
                            <div>
                              <div className="font-semibold text-white mb-0.5">{item.title}</div>
                              <div className="text-sm text-zinc-400">{item.desc}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Module grids — connected only */}
                    {isConnected && (
                      <div className="space-y-12 mt-4">
                        <HubSection title="Earnings & payouts" links={EARNINGS_MODULES} />
                        <HubSection title="Sales & checkout"   links={SALES_MODULES} />
                        <HubSection title="Customers"          links={CUSTOMER_MODULES} />
                        <HubSection title="Operations"         links={OPS_MODULES} />
                        <HubSection title="Business"           links={BUSINESS_MODULES} />
                        <HubSection title="Setup"              links={SETUP_MODULES} />
                        <div className="analytics-card p-6 flex items-start gap-4">
                          <GraduationCap size={26} className="text-accent flex-shrink-0 mt-0.5" />
                          <div>
                            <h3 className="font-bold text-white mb-1.5">First time? Start with these three.</h3>
                            <p className="text-sm text-zinc-400 leading-relaxed">
                              1.{' '}<Link href="/merchant/setup" className="text-accent hover:text-accent transition-colors">Set up your storefront</Link>.{' '}
                              2.{' '}<Link href="/merchant/inventory" className="text-accent hover:text-accent transition-colors">Add your first product</Link>.{' '}
                              3.{' '}<Link href="/merchant/payment-links" className="text-accent hover:text-accent transition-colors">Generate a payment link</Link> to share with a customer.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'escrow'     && <EscrowTab />}
                {activeTab === 'flashloans' && <FlashloansTab />}
                {activeTab === 'payroll'    && <PayrollTab />}
              </motion.div>
            </AnimatePresence>
          </div>
        </section>
      </div>
      <Footer />
    </>
  );
}

export default function MerchantPage() {
  return (
    <Suspense>
      <LazyMotion features={domAnimation}>
        <MerchantHubInner />
      </LazyMotion>
    </Suspense>
  );
}

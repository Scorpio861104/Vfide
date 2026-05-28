'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { useAccount } from 'wagmi';
import {
  Store,
  ArrowRight,
  FileText,
  Package,
  CalendarDays,
  Repeat,
  DollarSign,
  Link2,
  Percent,
  Users,
  RotateCcw,
  Award,
  Receipt,
  Tag,
  UserCog,
  BarChart3,
  Gift,
  MapPin,
  Truck,
  Boxes,
  GraduationCap,
  Banknote,
} from 'lucide-react';
import { Footer } from '@/components/layout/Footer';
import { HubSection, type HubLink } from '@/components/navigation/HubGrid';

// Import merchant components
import { MerchantDashboard } from '@/components/merchant/MerchantDashboard';
import { PaymentInterface } from '@/components/merchant/PaymentInterface';
import { PaymentQR } from '@/components/merchant/PaymentQR';
import { useLocale } from '@/hooks/useLocale';
import { MERCHANT_TRANSLATIONS, pickLocaleCopy } from '@/lib/i18n';

const SALES_MODULES: HubLink[] = [
  { href: '/merchant/inventory',      icon: Package,     label: 'Inventory',      description: 'Products, stock levels, low-stock alerts.' },
  { href: '/merchant/invoices',       icon: FileText,    label: 'Invoices',       description: 'Itemized bills with payment links.' },
  { href: '/merchant/payment-links',  icon: Link2,       label: 'Payment links',  description: 'Share a URL for any product or amount.' },
  { href: '/merchant/bookings',       icon: CalendarDays,label: 'Bookings',       description: 'Appointments and availability slots.' },
  { href: '/merchant/subscriptions',  icon: Repeat,      label: 'Subscriptions',  description: 'Weekly, monthly, quarterly, yearly plans.' },
];

const CUSTOMER_MODULES: HubLink[] = [
  { href: '/merchant/customers',      icon: Users,       label: 'Customers',      description: 'Your buyer list, with lifetime value.' },
  { href: '/merchant/loyalty',        icon: Award,       label: 'Loyalty',        description: 'Punch cards, point rewards, tiers.' },
  { href: '/merchant/coupons',        icon: Tag,         label: 'Discounts',      description: 'Coupon codes and promotional campaigns.' },
  { href: '/merchant/gift-cards',     icon: Gift,        label: 'Gift cards',     description: 'Issue and redeem stored-value cards.' },
  { href: '/merchant/returns',        icon: RotateCcw,   label: 'Returns',        description: 'Refunds and dispute handling.' },
];

const OPS_MODULES: HubLink[] = [
  { href: '/merchant/expenses',       icon: Receipt,     label: 'Expenses',       description: 'Track outgoings against revenue.' },
  { href: '/merchant/tax',            icon: Percent,     label: 'Sales tax',      description: 'Per-jurisdiction tax configuration.' },
  { href: '/merchant/tips',           icon: DollarSign,  label: 'Tips',           description: 'Tip jar settings and history.' },
  { href: '/merchant/installments',   icon: RotateCcw,   label: 'Installments',   description: 'Buy now, pay later plans.' },
  { href: '/merchant/staff',          icon: UserCog,     label: 'Staff',          description: 'Team access roles and activity.' },
];

const BUSINESS_MODULES: HubLink[] = [
  { href: '/merchant/analytics',      icon: BarChart3,   label: 'Analytics',      description: 'Revenue, customers, and trends.' },
  { href: '/merchant/locations',      icon: MapPin,      label: 'Locations',      description: 'Multi-store and franchise management.' },
  { href: '/merchant/suppliers',      icon: Truck,       label: 'Suppliers',      description: 'Supply chain and purchase orders.' },
  { href: '/merchant/wholesale',      icon: Boxes,       label: 'Wholesale',      description: 'B2B pricing and group buys.' },
];

const SETUP_MODULES: HubLink[] = [
  { href: '/merchant/setup',          icon: Store,       label: 'Merchant setup', description: 'Configure your storefront and payouts.' },
  { href: '/merchant/profile/setup',  icon: UserCog,     label: 'VFIDE Profile',  description: 'Set up your on-chain business identity — name, logo, category.' },
];

const EARNINGS_MODULES: HubLink[] = [
  { href: '/merchant/payouts',        icon: Banknote,    label: 'Earnings & payouts', description: 'See confirmed earnings and cash out to mobile money, bank, or airtime.' },
];

const processors = [
  { name: 'Square', fee: '2.6% + $0.10' },
  { name: 'Stripe', fee: '2.9% + $0.30' },
  { name: 'PayPal', fee: '3.49% + $0.49' },
  { name: 'VFIDE',  fee: '0%*' },
];

export default function MerchantPage() {
  const [locale] = useLocale();
  const copy = pickLocaleCopy(MERCHANT_TRANSLATIONS, locale); // merchant page i18n
  const { address, isConnected } = useAccount();

  return (
    <>
      <div className="min-h-screen bg-zinc-950 md:pt-[3.5rem]">
        {/* Premium hero header */}
        <section className="relative py-16 overflow-hidden">
          <div className="hero-mesh-bg opacity-60" aria-hidden="true">
            <div className="mesh-orb-cyan" style={{ width: '50%', height: '50%', top: '-10%', right: '-5%' }} />
          </div>
          <div className="container mx-auto max-w-6xl px-4">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-12">
              <div className="badge-live mb-5 mx-auto w-fit">
                <Store size={12} className="mr-1" /> Merchant Portal
              </div>
              <h1 className="text-4xl md:text-5xl font-black text-white mb-4 tracking-tight">
                {isConnected ? 'Welcome back' : 'Run your whole business from here'}
              </h1>
              <p className="mx-auto max-w-2xl text-lg text-zinc-400 leading-relaxed">
                {isConnected
                  ? <>Connected as <span className="font-mono text-accent">{address?.slice(0, 6)}…{address?.slice(-4)}</span>. Pick a module below.</>
                  : 'Inventory, invoicing, bookings, loyalty, taxes — every operations tool a small business needs, with zero payment-processor fees.'}
              </p>
              {!isConnected && (
                <Link
                  href="/merchant/setup"
                  className="btn-premium btn-premium-primary mt-8 inline-flex"
                >
                  <Store size={16} /> {copy.getStarted} <ArrowRight size={15} />
                </Link>
              )}
            </motion.div>

            {/* Always show these sections */}
            <h2 className="text-2xl font-bold text-white mb-6">Merchant Portal</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
              <div className="analytics-card p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Merchant Dashboard</h3>
                <MerchantDashboard />
              </div>
              <div className="analytics-card p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Make Payment</h3>
                <PaymentInterface />
              </div>
            </div>

            <div className="analytics-card p-6 mb-10">
              <h2 className="text-xl font-bold text-white mb-5">Generate Payment QR Code</h2>
              <PaymentQR />
            </div>

            {/* Comparison Table */}
            <div className="mt-10 max-w-2xl mx-auto mb-12">
              <h2 className="mb-6 text-center text-xl font-bold text-white">vs Traditional Processors</h2>
              <div className="glass-card-premium p-1 overflow-hidden">
                <div className="flex items-center justify-between rounded-t-xl border-b border-white/8 bg-white/4 px-5 py-3">
                  <div className="text-xs font-bold uppercase tracking-wider text-zinc-400">Processor</div>
                  <div className="text-xs font-bold uppercase tracking-wider text-zinc-400">Processing Fee</div>
                </div>
                {processors.map((p) => (
                  <div key={p.name} className={`flex items-center justify-between px-5 py-3.5 border-b border-white/5 last:border-0 transition-colors ${p.name === 'VFIDE' ? 'bg-cyan-500/8' : 'hover:bg-white/3'}`}>
                    <div className={`font-semibold text-sm ${p.name === 'VFIDE' ? 'text-accent' : 'text-white'}`}>{p.name}</div>
                    <div className={`font-mono font-bold text-sm ${p.name === 'VFIDE' ? 'text-glow-cyan' : 'text-zinc-300'}`}>{p.fee}</div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-zinc-500 mt-3 text-center">
                * Burn fees of 0.25–5% and Base gas apply. Merchant pays nothing.
              </p>
            </div>

            {/* Getting Started Section */}
            <div className="mt-10 max-w-2xl mx-auto mb-12">
              <h2 className="mb-5 text-center text-xl font-bold text-white">Getting Started</h2>
              <div className="glass-card-premium overflow-hidden divide-y divide-white/5">
                {[
                  { title: 'Register Your Business', desc: 'Connect your wallet and create your merchant profile in seconds.' },
                  { title: 'Configure Settings',     desc: 'Set payout preferences, tax settings, and notification options.' },
                  { title: 'Start Accepting Payments', desc: 'Share your payment link — receive any stablecoin, zero merchant fees.' },
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-4 p-5 hover:bg-white/3 transition-colors">
                    <div className="step-number-badge shrink-0" style={{ width: '2.25rem', height: '2.25rem', fontSize: '0.875rem' }}>
                      {i + 1}
                    </div>
                    <div>
                      <div className="font-semibold text-white mb-0.5">{item.title}</div>
                      <div className="text-sm text-zinc-400">{item.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Module sections when connected */}
            {isConnected && (
              <div className="space-y-12 mt-12">
                <HubSection title="Earnings & payouts" links={EARNINGS_MODULES} />
                <HubSection title="Sales & checkout" links={SALES_MODULES} />
                <HubSection title="Customers" links={CUSTOMER_MODULES} />
                <HubSection title="Operations" links={OPS_MODULES} />
                <HubSection title="Business" links={BUSINESS_MODULES} />
                <HubSection title="Setup" links={SETUP_MODULES} />

                <div className="analytics-card p-6 flex items-start gap-4 mt-10">
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
        </section>
      </div>
      <Footer />
    </>
  );
}

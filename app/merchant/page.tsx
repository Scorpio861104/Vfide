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
  const { address, isConnected } = useAccount();

  return (
    <>
      <div className="min-h-screen bg-zinc-950 pt-20">
        <section className="py-16">
          <div className="container mx-auto max-w-6xl px-4">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-12">
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-sm text-cyan-300 mb-4">
                <Store size={14} /> Merchant Portal
              </div>
              <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
                {isConnected ? 'Welcome back' : 'Run your whole business from here'}
              </h1>
              <p className="mx-auto max-w-2xl text-lg text-gray-400">
                {isConnected
                  ? <>Connected as <span className="font-mono text-cyan-300">{address?.slice(0, 6)}…{address?.slice(-4)}</span>. Pick a module below.</>
                  : 'Inventory, invoicing, bookings, loyalty, taxes — every operations tool a small business needs, with zero payment-processor fees.'}
              </p>
              {!isConnected && (
                <Link
                  href="/merchant/setup"
                  className="mt-6 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-6 py-3 font-bold text-white transition-transform hover:scale-[1.02]"
                >
                  <Store size={18} /> Get started <ArrowRight size={16} />
                </Link>
              )}
            </motion.div>

            {/* Always show these sections */}
            <h2 className="text-3xl font-bold text-white mb-8">Merchant Portal</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
              <div>
                <h3 className="text-xl font-semibold text-white mb-4">Merchant Dashboard</h3>
                <MerchantDashboard />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-white mb-4">Make Payment</h3>
                <PaymentInterface />
              </div>
            </div>

            <div className="my-12">
              <h2 className="text-2xl font-bold text-white mb-6">Generate Payment QR Code</h2>
              <PaymentQR />
            </div>

            {/* Comparison Table */}
            <div className="mt-12 max-w-2xl mx-auto mb-12">
              <h2 className="mb-6 text-center text-2xl font-bold text-white">vs Traditional Processors</h2>
              <div className="space-y-2">
                <div className="flex items-center justify-between rounded-xl border border-white/20 bg-white/10 p-4">
                  <div className="font-semibold text-white">Processor</div>
                  <div className="font-semibold text-white">Processing Fee</div>
                </div>
                {processors.map((p) => (
                  <div key={p.name} className={`flex items-center justify-between rounded-xl border p-4 ${p.name === 'VFIDE' ? 'border-cyan-500/40 bg-cyan-500/5' : 'border-white/10 bg-white/5'}`}>
                    <div className="font-semibold text-white">{p.name}</div>
                    <div className="font-numeric text-cyan-300">{p.fee}</div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-zinc-500 mt-3 text-center">
                * Burn fees of 0.25–5% and Base gas apply. Merchant pays nothing.
              </p>
            </div>

            {/* Getting Started Section */}
            <div className="mt-12 max-w-2xl mx-auto mb-12">
              <h2 className="mb-6 text-center text-2xl font-bold text-white">Getting Started</h2>
              <div className="space-y-3">
                <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                  <div className="font-semibold text-white mb-1">Register Your Business</div>
                </div>
                <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                  <div className="font-semibold text-white mb-1">Configure Settings</div>
                </div>
                <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                  <div className="font-semibold text-white mb-1">Start Accepting Payments</div>
                </div>
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

                <div className="rounded-2xl border border-white/10 bg-white/3 p-6 flex items-start gap-4 mt-12">
                  <GraduationCap size={28} className="text-cyan-300 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-white mb-1">First time? Start with these three.</h3>
                    <p className="text-sm text-gray-400">
                      1. <Link href="/merchant/setup" className="text-cyan-300 hover:text-cyan-200">Set up your storefront</Link>.
                      2. <Link href="/merchant/inventory" className="text-cyan-300 hover:text-cyan-200">Add your first product</Link>.
                      3. <Link href="/merchant/payment-links" className="text-cyan-300 hover:text-cyan-200">Generate a payment link</Link> to share with a customer.
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

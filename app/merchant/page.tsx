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
} from 'lucide-react';
import { Footer } from '@/components/layout/Footer';

interface HubLink {
  href: string;
  icon: typeof FileText;
  label: string;
  description: string;
}

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

            {isConnected ? (
              <div className="space-y-12">
                <ModuleSection title="Sales & checkout" links={SALES_MODULES} />
                <ModuleSection title="Customers" links={CUSTOMER_MODULES} />
                <ModuleSection title="Operations" links={OPS_MODULES} />
                <ModuleSection title="Business" links={BUSINESS_MODULES} />
                <ModuleSection title="Setup" links={SETUP_MODULES} />

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
            ) : (
              <div className="mt-8 max-w-2xl mx-auto">
                <h2 className="mb-6 text-center text-xl font-semibold text-white">vs Traditional Processors</h2>
                <div className="space-y-2">
                  {processors.map((p) => (
                    <div key={p.name} className={`flex items-center justify-between rounded-xl border p-4 ${p.name === 'VFIDE' ? 'border-cyan-500/40 bg-cyan-500/5' : 'border-white/10 bg-white/5'}`}>
                      <div className="font-semibold text-white">{p.name}</div>
                      <div className="font-mono text-cyan-300">{p.fee}</div>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-zinc-500 mt-3 text-center">
                  * Burn fees of 0.25–5% and Base gas apply. Merchant pays nothing.
                </p>
              </div>
            )}
          </div>
        </section>
      </div>
      <Footer />
    </>
  );
}

function ModuleSection({ title, links }: { title: string; links: HubLink[] }) {
  return (
    <div>
      <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3">{title}</h2>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {links.map((l) => {
          const Icon = l.icon;
          return (
            <Link
              key={l.href}
              href={l.href}
              className="group rounded-xl border border-white/10 bg-white/3 p-4 hover:border-cyan-500/30 hover:bg-cyan-500/5 transition-colors"
            >
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-zinc-900 group-hover:bg-cyan-500/10 p-2 transition-colors">
                  <Icon size={20} className="text-cyan-300" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-white flex items-center gap-1.5">
                    {l.label}
                    <ArrowRight size={14} className="opacity-0 group-hover:opacity-100 -translate-x-1 group-hover:translate-x-0 transition-all" />
                  </div>
                  <div className="text-xs text-zinc-500 mt-0.5">{l.description}</div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

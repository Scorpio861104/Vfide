'use client';

/**
 * MerchantOperatingModel — the institutional structure of Merchant Headquarters.
 *
 * Three institutions (Sales / Customer / Operations Infrastructure), a Business Health Center
 * (executive briefing on real signals), and a Business Continuity section (the differentiator —
 * links commerce into the Continuity institution).
 *
 * Microcopy is institutional: "infrastructure", "systems", "operations" — never tools/widgets/
 * features. Links resolve only to real routes (conceptual modules without a route are omitted to
 * avoid dead links). Health metrics derive from the REAL useMerchantHealth engine.
 */

import Link from 'next/link';
import type { MerchantHealth } from '@/hooks/useMerchantHealth';
import {
  CreditCard, FileText, Repeat, CalendarDays, Package, Link2, Boxes,
  Users, Award, Gift, RotateCcw, Tag,
  UserCog, MapPin, Truck, Percent, BarChart3, Receipt,
  LifeBuoy, ShieldAlert, ArrowRightLeft, Landmark, Vault, Activity,
  ArrowRight, Banknote, ShieldCheck, type LucideIcon,
} from 'lucide-react';

interface Service {
  label: string;
  href: string;
  icon: LucideIcon;
}

interface Institution {
  id: string;
  headline: string;
  description: string;
  accent: string;
  services: Service[];
}

// Organized around what a merchant is trying to DO — not internal architecture.
// Six plain-language goals a shop owner recognizes immediately.
const INSTITUTIONS: Institution[] = [
  {
    id: 'get-paid',
    headline: 'Get Paid',
    description: 'Take money from customers — in person, by link, or by invoice.',
    accent: '#10b981',
    services: [
      { label: 'Payment links', href: '/merchant/payment-links', icon: Link2 },
      { label: 'Send an invoice', href: '/merchant/invoices', icon: FileText },
      { label: 'Take a payment', href: '/merchant/payment-links', icon: CreditCard },
      { label: 'Tips', href: '/merchant/tips', icon: Award },
      { label: 'Cash out', href: '/merchant/payouts', icon: Banknote },
    ],
  },
  {
    id: 'run-store',
    headline: 'Run Your Store',
    description: 'Your products, bookings, and sales — all in one place.',
    accent: '#8b5cf6',
    services: [
      { label: 'Products', href: '/merchant/inventory', icon: Package },
      { label: 'Bookings', href: '/merchant/bookings', icon: CalendarDays },
      { label: 'Subscriptions', href: '/merchant/subscriptions', icon: Repeat },
      { label: 'Wholesale', href: '/merchant/wholesale', icon: Boxes },
      { label: 'Returns', href: '/merchant/returns', icon: RotateCcw },
    ],
  },
  {
    id: 'customers',
    headline: 'Look After Customers',
    description: 'Keep people coming back, and reward the regulars.',
    accent: '#06b6d4',
    services: [
      { label: 'Your customers', href: '/merchant/customers', icon: Users },
      { label: 'Loyalty rewards', href: '/merchant/loyalty', icon: Award },
      { label: 'Gift cards', href: '/merchant/gift-cards', icon: Gift },
      { label: 'Discounts', href: '/merchant/coupons', icon: Tag },
    ],
  },
  {
    id: 'staff',
    headline: 'Manage Staff',
    description: 'Give your team access — and see what they do.',
    accent: '#f59e0b',
    services: [
      { label: 'Staff & access', href: '/merchant/staff', icon: UserCog },
      { label: 'Locations', href: '/merchant/locations', icon: MapPin },
      { label: 'Suppliers', href: '/merchant/suppliers', icon: Truck },
    ],
  },
  {
    id: 'money',
    headline: 'Keep Track of Money',
    description: 'See how the business is doing, and stay on top of tax.',
    accent: '#6366f1',
    services: [
      { label: 'How sales are going', href: '/merchant/analytics', icon: BarChart3 },
      { label: 'Expenses', href: '/merchant/expenses', icon: Receipt },
      { label: 'Sales tax', href: '/merchant/tax', icon: Percent },
    ],
  },
  {
    id: 'protect',
    headline: 'Protect Your Business',
    description: 'Be ready if you lose your phone — or if someone needs to take over.',
    accent: '#ec4899',
    services: [
      { label: 'If you lose access', href: '/vault/recover', icon: LifeBuoy },
      { label: 'Trusted people', href: '/guardians', icon: ShieldCheck },
      { label: 'Who takes over', href: '/merchant/continuity', icon: ArrowRightLeft },
    ],
  },
];

function InstitutionBlock({ inst }: { inst: Institution }) {
  return (
    <div>
      <div className="mb-6">
        <h3 className="text-xl font-semibold tracking-tight text-white">{inst.headline}</h3>
        <p className="mt-2 text-zinc-400">{inst.description}</p>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {inst.services.map((s) => {
          const Icon = s.icon;
          return (
            <Link
              key={s.label}
              href={s.href}
              className="group flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3.5 transition-colors hover:bg-white/[0.04]"
            >
              <Icon size={17} className="shrink-0 text-zinc-500 transition-colors group-hover:text-zinc-300" aria-hidden="true" />
              <span className="text-sm font-medium text-zinc-200">{s.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export function MerchantOperatingModel() {
  return (
    <section className="mb-16" aria-label="Merchant operating model">
      <div className="mb-10 max-w-2xl">
        <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-zinc-500">Everything in one place</h2>
        <p className="mt-2 text-2xl font-semibold tracking-tight text-white">What would you like to do?</p>
        <p className="mt-3 text-zinc-400">Pick what you need. You can always come back for the rest.</p>
      </div>
      <div className="space-y-14">
        {INSTITUTIONS.map((inst) => (
          <InstitutionBlock key={inst.id} inst={inst} />
        ))}
      </div>
    </section>
  );
}

// ─── Business Health Center ──────────────────────────────────────────────────

export function BusinessHealthCenter({ m }: { m: MerchantHealth }) {
  const hasRevenue = m.volume > 0;
  const hasTx = m.txCount > 0;

  const briefing: { label: string; value: string; note: string }[] = [
    {
      label: 'Revenue Trend',
      value: hasRevenue ? m.volumeLabel : '—',
      note: hasRevenue ? 'Lifetime processed volume' : 'No revenue recorded yet',
    },
    {
      label: 'Customer Growth',
      value: hasTx ? 'Active' : '—',
      note: hasTx ? `${m.txCount} payment${m.txCount === 1 ? '' : 's'} to date` : 'No customer activity yet',
    },
    {
      label: 'Average Transaction Value',
      value: hasRevenue && hasTx ? (m.volume / m.txCount).toLocaleString(undefined, { maximumFractionDigits: 2 }) : '—',
      note: hasRevenue && hasTx ? 'Volume per payment' : 'Awaiting first payments',
    },
    {
      label: 'Settlement Reliability',
      value: m.isMerchant && !m.isSuspended ? 'Operational' : '—',
      note: m.isSuspended ? 'Account suspended' : m.isMerchant ? 'Settlements active' : 'Not set up',
    },
    {
      label: 'Retention',
      value: hasTx ? 'Tracking' : '—',
      note: 'Repeat-customer signal builds with activity',
    },
    {
      label: 'Commerce Activity',
      value: m.healthLabel,
      note: 'Whether your store is actively transacting',
    },
  ];

  return (
    <section className="mb-16" aria-label="Business health center">
      <div className="mb-8 max-w-2xl">
        <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-zinc-500">Business Health Center</h2>
        <p className="mt-2 text-2xl font-semibold tracking-tight text-white">Executive briefing</p>
        <p className="mt-3 text-zinc-400">Your business at a glance — the numbers that matter, in plain terms.</p>
      </div>
      <div className="grid grid-cols-1 gap-px overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.04] sm:grid-cols-2 lg:grid-cols-3">
        {briefing.map((b) => (
          <div key={b.label} className="bg-zinc-950/40 p-6">
            <p className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">{b.label}</p>
            <p className="mt-2 text-2xl font-semibold tracking-tight text-white">{b.value}</p>
            <p className="mt-1.5 text-xs text-zinc-500">{b.note}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

// ─── Business Continuity (the differentiator) ────────────────────────────────

interface ContinuityCard {
  title: string;
  description: string;
  icon: LucideIcon;
  href: string;
}

const CONTINUITY_CARDS: ContinuityCard[] = [
  { title: 'Business Recovery', description: 'Restore access to your business if a device or key is lost.', icon: LifeBuoy, href: '/vault/recover' },
  { title: 'Emergency Operations', description: 'Keep operating through disruption with trusted contacts in place.', icon: ShieldAlert, href: '/security-center' },
  { title: 'Ownership Transition', description: 'Hand the business to new ownership cleanly, on your terms.', icon: ArrowRightLeft, href: '/merchant/continuity' },
  { title: 'Merchant Succession', description: 'Choose who takes over the business if you can\'t continue.', icon: Landmark, href: '/merchant/continuity' },
  { title: 'Asset Preservation', description: 'Protect business funds and records so nothing is lost.', icon: Vault, href: '/vault' },
  { title: 'Operational Resilience', description: 'Continuity infrastructure built into the business, not bolted on.', icon: Activity, href: '/continuity' },
];

export function MerchantContinuity({ m }: { m: MerchantHealth }) {
  const readinessWord =
    m.continuity.readiness === 'protected' ? 'Protected'
    : m.continuity.readiness === 'partial' ? 'Partially protected'
    : m.continuity.readiness === 'incomplete' ? 'Not yet protected'
    : 'Connect your wallet to assess';

  return (
    <section className="mb-16" aria-label="Business continuity">
      <div className="mb-8 max-w-2xl">
        <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-zinc-500">Business Continuity</h2>
        <p className="mt-2 text-2xl font-semibold tracking-tight text-white">Prepare for disruption and succession</p>
        <p className="mt-3 text-zinc-400">
          Prepare your business for disruption, transition, and long-term succession — continuity
          infrastructure most commerce platforms simply do not have.
        </p>
        <p className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-zinc-300">
          Current status: {readinessWord}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {CONTINUITY_CARDS.map((c) => {
          const Icon = c.icon;
          return (
            <Link
              key={c.title}
              href={c.href}
              className="group flex flex-col rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 transition-colors hover:bg-white/[0.04]"
            >
              <Icon size={20} className="text-pink-300/80" aria-hidden="true" />
              <h3 className="mt-4 font-semibold text-white">{c.title}</h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-zinc-400">{c.description}</p>
              <span className="mt-5 inline-flex items-center gap-1.5 text-xs font-medium text-zinc-500 transition-colors group-hover:text-zinc-300">
                Open <ArrowRight size={12} aria-hidden="true" />
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

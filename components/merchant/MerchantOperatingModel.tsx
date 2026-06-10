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
  ArrowRight, type LucideIcon,
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

const INSTITUTIONS: Institution[] = [
  {
    id: 'sales',
    headline: 'Sales Infrastructure',
    description: 'Everything required to generate and process revenue.',
    accent: '#8b5cf6',
    services: [
      { label: 'Payments', href: '/merchant/payment-links', icon: CreditCard },
      { label: 'Invoices', href: '/merchant/invoices', icon: FileText },
      { label: 'Subscriptions', href: '/merchant/subscriptions', icon: Repeat },
      { label: 'Bookings', href: '/merchant/bookings', icon: CalendarDays },
      { label: 'Inventory', href: '/merchant/inventory', icon: Package },
      { label: 'Payment Links', href: '/merchant/payment-links', icon: Link2 },
      { label: 'Wholesale', href: '/merchant/wholesale', icon: Boxes },
    ],
  },
  {
    id: 'customer',
    headline: 'Customer Infrastructure',
    description: 'Systems for building long-term customer relationships.',
    accent: '#06b6d4',
    services: [
      { label: 'Customers', href: '/merchant/customers', icon: Users },
      { label: 'Loyalty', href: '/merchant/loyalty', icon: Award },
      { label: 'Gift Cards', href: '/merchant/gift-cards', icon: Gift },
      { label: 'Returns', href: '/merchant/returns', icon: RotateCcw },
      { label: 'Discounts', href: '/merchant/coupons', icon: Tag },
    ],
  },
  {
    id: 'operations',
    headline: 'Operations Infrastructure',
    description: 'The systems that keep a business running.',
    accent: '#f59e0b',
    services: [
      { label: 'Staff', href: '/merchant/staff', icon: UserCog },
      { label: 'Locations', href: '/merchant/locations', icon: MapPin },
      { label: 'Suppliers', href: '/merchant/suppliers', icon: Truck },
      { label: 'Tax', href: '/merchant/tax', icon: Percent },
      { label: 'Analytics', href: '/merchant/analytics', icon: BarChart3 },
      { label: 'Expenses', href: '/merchant/expenses', icon: Receipt },
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
        <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-zinc-500">Operating Model</h2>
        <p className="mt-2 text-2xl font-semibold tracking-tight text-white">Three institutions, one headquarters</p>
        <p className="mt-3 text-zinc-400">Every capability lives under one of these.</p>
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
      value: m.health,
      note: 'Overall business health',
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
  { title: 'Ownership Transition', description: 'Hand the business to new ownership cleanly, on your terms.', icon: ArrowRightLeft, href: '/inheritance' },
  { title: 'Merchant Succession', description: 'Pass stewardship of the business to chosen successors.', icon: Landmark, href: '/inheritance' },
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

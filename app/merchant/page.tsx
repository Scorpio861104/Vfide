'use client';

export const dynamic = 'force-dynamic';

/**
 * /merchant — Merchant Headquarters (Wave 32).
 *
 * A digital commercial headquarters: "I can run my business from here." Leads with a monumental
 * executive hero + status band (real signals from useMerchantHealth), then the operating model
 * (Sales / Customer / Operations Infrastructure), a Business Health Center (executive briefing),
 * and Business Continuity (the differentiator — links commerce into the Continuity institution).
 * Operational surfaces (payment interface, QR, earnings, setup) remain below.
 *
 * Microcopy is institutional: infrastructure / systems / operations. All metrics are real or show
 * honest "no data yet" states — never fabricated. Links resolve only to real routes.
 */

import Link from 'next/link';
import { useAccount } from 'wagmi';
import { useLocale } from '@/lib/locale/LocaleProvider';
import { Banknote, Store, UserCog, GraduationCap, ArrowRight } from 'lucide-react';
import { Footer } from '@/components/layout/Footer';
import { HubSection, type HubLink } from '@/components/navigation/HubGrid';
import { MerchantHQ } from '@/components/merchant/MerchantHQ';
import { MerchantOpportunityRisk } from '@/components/merchant/MerchantOpportunityRisk';
import { MerchantDiscoveryStanding } from '@/components/merchant/MerchantDiscoveryStanding';
import { MerchantDashboard } from '@/components/merchant/MerchantDashboard';
import { PaymentInterface } from '@/components/merchant/PaymentInterface';
import { PaymentQR } from '@/components/merchant/PaymentQR';
import { useMerchantHealth } from '@/hooks/useMerchantHealth';
import { useMerchantHQ } from '@/hooks/useMerchantHQ';
import { MerchantHeadquartersHero } from '@/components/merchant/MerchantHeadquartersHero';
import { PlainHelp } from '@/components/common/PlainHelp';
import { MerchantVerificationCard } from '@/components/merchant/MerchantVerificationCard';
import {
  MerchantOperatingModel,
  BusinessHealthCenter,
  MerchantContinuity,
} from '@/components/merchant/MerchantOperatingModel';
import { MerchantKnowledge } from '@/components/education/InstitutionKnowledge';

const SETUP_MODULES: HubLink[] = [
  { href: '/merchant/setup', icon: Store, label: 'Merchant setup', description: 'Configure your storefront and payouts.' },
  { href: '/merchant/profile/setup', icon: UserCog, label: 'VFIDE Profile', description: 'Set up your on-chain business identity — name, logo, category.' },
];

const EARNINGS_MODULES: HubLink[] = [
  { href: '/merchant/payouts', icon: Banknote, label: 'Earnings & payouts', description: 'See confirmed earnings and cash out to mobile money, bank, or airtime.' },
];

const processors = [
  { name: 'Square', fee: '2.6% + $0.10' },
  { name: 'Stripe', fee: '2.9% + $0.30' },
  { name: 'PayPal', fee: '3.5% + $0.49' },
  { name: 'VFIDE', fee: '0% merchant fee' },
];

export default function MerchantPage() {
  const { locale } = useLocale();
  void locale;
  const { isConnected } = useAccount();
  const m = useMerchantHealth();
  const hq = useMerchantHQ(isConnected); // composite Merchant Health for a consistent hero band
  const compositeHealth = hq.health ? { score: hq.health.score, band: hq.health.band } : null;

  return (
    <>
      <div className="ui-page-shell relative min-h-screen overflow-hidden md:pt-[3.5rem]">
        {/* Ambient field — restrained single glow (institution, not dashboard) */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
          <div
            className="absolute -top-48 left-1/4 h-[680px] w-[680px] rounded-full opacity-[0.05]"
            style={{ background: 'radial-gradient(circle, #8b5cf6 0%, transparent 70%)' }}
          />
        </div>

        <div className="relative z-10 mx-auto w-full max-w-6xl px-5 py-16 md:px-8 md:py-20">
          {/* Executive hero + status band */}
          <MerchantHeadquartersHero m={m} compositeHealth={compositeHealth} />

          <PlainHelp
            title="Your business, in one place"
            whatIsThis="This is where you run your shop — take payments, manage products, look after customers, and cash out."
            whyYouNeedIt="Everything for your business is here, so you don't need separate apps or a card machine."
            whatHappensNext="Pick what you'd like to do below. Most people start by setting up their shop and taking a first payment."
            status={{ state: m.isMerchant ? 'done' : 'not-started', label: m.isMerchant ? 'Your shop is set up' : 'Set up your shop to begin' }}
          />

          {m.isMerchant && (
            <div className="mb-10">
              <MerchantVerificationCard />
            </div>
          )}

          {/* What commerce returns to the merchant (existing trust/fee command center) */}
          <div className="mb-16">
            <MerchantHQ />
          </div>

          {/* Business intelligence — Opportunity + Risk Center (Wave 75: surface the HQ intelligence) */}
          <div className="mb-16">
            <MerchantOpportunityRisk enabled={isConnected} />
          </div>

          {/* Discovery explainability — why you rank + how to improve (Wave 76: surface whyRanked) */}
          <div className="mb-16">
            <MerchantDiscoveryStanding enabled={isConnected} />
          </div>

          {/* The operating model — three institutions */}
          <MerchantOperatingModel />

          {/* Executive briefing */}
          <BusinessHealthCenter m={m} />

          {/* The differentiator — business continuity */}
          <MerchantContinuity m={m} />

          {/* Embedded education — learn the business systems in place */}
          <MerchantKnowledge />

          {/* ── Operational surfaces ───────────────────────────────────────── */}
          <section className="mb-16" aria-label="Operations">
            <div className="mb-8 max-w-2xl">
              <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-zinc-500">Operations</h2>
              <p className="mt-2 text-2xl font-semibold tracking-tight text-white">Run the day-to-day</p>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6">
                <h3 className="mb-4 text-lg font-semibold text-white">Headquarters overview</h3>
                <MerchantDashboard />
              </div>
              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6">
                <h3 className="mb-4 text-lg font-semibold text-white">Accept a payment</h3>
                <PaymentInterface />
              </div>
            </div>

            <div className="mt-6 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6">
              <h3 className="mb-5 text-lg font-semibold text-white">Generate a payment QR code</h3>
              <PaymentQR />
            </div>
          </section>

          {/* Earnings + setup */}
          {isConnected && (
            <section className="mb-16 space-y-12" aria-label="Earnings and setup">
              <HubSection title="Earnings & payouts" links={EARNINGS_MODULES} />
              <HubSection title="Setup" links={SETUP_MODULES} />

              <div className="flex items-start gap-4 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6">
                <GraduationCap size={26} className="mt-0.5 shrink-0 text-cyan-400" aria-hidden="true" />
                <div>
                  <h3 className="mb-1.5 font-semibold text-white">First time? Start with these three.</h3>
                  <p className="text-sm leading-relaxed text-zinc-400">
                    1.{' '}<Link href="/merchant/setup" className="text-cyan-400 transition-colors hover:text-cyan-300">Set up your storefront</Link>.{' '}
                    2.{' '}<Link href="/merchant/inventory" className="text-cyan-400 transition-colors hover:text-cyan-300">Add your first product</Link>.{' '}
                    3.{' '}<Link href="/merchant/payment-links" className="text-cyan-400 transition-colors hover:text-cyan-300">Generate a payment link</Link> to share with a customer.
                  </p>
                </div>
              </div>
            </section>
          )}

          {/* Fee comparison — institutional, restrained */}
          <section className="mb-4 max-w-2xl" aria-label="Fee comparison">
            <h2 className="mb-6 text-sm font-semibold uppercase tracking-[0.2em] text-zinc-500">vs Traditional Processors</h2>
            <div className="overflow-hidden rounded-2xl border border-white/[0.06]">
              <div className="flex items-center justify-between border-b border-white/[0.06] bg-white/[0.03] px-5 py-3">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Processor</span>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Processing fee</span>
              </div>
              {processors.map((p) => (
                <div
                  key={p.name}
                  className={`flex items-center justify-between border-b border-white/[0.04] px-5 py-3.5 last:border-0 ${p.name === 'VFIDE' ? 'bg-cyan-500/[0.06]' : ''}`}
                >
                  <span className={`text-sm font-semibold ${p.name === 'VFIDE' ? 'text-cyan-400' : 'text-white'}`}>{p.name}</span>
                  <span className={`font-mono text-sm font-bold ${p.name === 'VFIDE' ? 'text-cyan-300' : 'text-zinc-300'}`}>{p.fee}</span>
                </div>
              ))}
            </div>
            <p className="mt-3 text-xs text-zinc-500">* Burn fees of 0.25–5% and Base gas apply. Merchant pays nothing.</p>
          </section>
        </div>
        <Footer />
      </div>
    </>
  );
}

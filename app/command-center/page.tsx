'use client';

/**
 * Command Center (Platform Transformation, Wave 1).
 *
 * Not a dashboard — a briefing environment. It answers the participant's standing questions (Am I protected? What
 * requires attention? What opportunities exist? What should I learn / simulate / review?) over a calm, sculpted
 * surface, and it makes UNIVERSAL DISCOVERABILITY visible: a search that always reaches every capability, plus the
 * five headquarters laid out as environments rather than widgets.
 *
 * Honesty (Veritas Law): availability is shown truthfully (Ready / In progress / Coming). Wave 1 orders capabilities
 * with the real adaptive engine from neutral signals; wiring live participant signals (vault state, ProofScore,
 * continuity readiness) deepens the personalization in a later wave and is noted in the docs — nothing here implies
 * a personalized protection status that has not yet been computed.
 */
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { HQRoot, Surface, DomainBadge, StatusDot } from '@/components/headquarters/HQTheme';
import { PrimaryNav } from '@/components/headquarters/PrimaryNav';
import { SeerPanel } from '@/components/headquarters/SeerPanel';
import { RecommendedPlaybook } from '@/components/headquarters/PlaybooksPanel';
import { HEADQUARTERS, HQ_ORDER, type Capability } from '@/lib/headquarters/model';
import { computeEmphasis, searchCapabilities, NEUTRAL_SIGNALS, type EmphasisResult } from '@/lib/headquarters/adaptive';
import { DOMAIN_COLOR } from '@/lib/design/hqTokens';
import { Search, ArrowUpRight } from 'lucide-react';

function greeting(): string {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
}

export default function CommandCenterPage() {
  const [query, setQuery] = useState('');
  const emphasis = useMemo(() => computeEmphasis(NEUTRAL_SIGNALS), []);
  const results = useMemo(() => (query ? searchCapabilities(query) : []), [query]);

  const byDomain = (d: string): EmphasisResult[] => emphasis.filter((e) => e.capability.domain === d);
  const attention = emphasis.filter((e) => e.emphasis === 'primary' || e.emphasis === 'suggested').slice(0, 4);

  return (
    <HQRoot>
      <div className="mx-auto max-w-5xl px-6 py-10">
        <PrimaryNav />
        {/* Briefing — the thesis */}
        <div className="mt-10" />
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em]" style={{ color: 'var(--hq-gold)' }}>
          Command Center
        </p>
        <h1 className="mt-4 text-4xl font-semibold leading-tight md:text-5xl" style={{ color: 'var(--hq-ink)' }}>
          {greeting()}.
          <span className="block font-normal" style={{ color: 'var(--hq-ink-soft)' }}>
            Here is where things stand.
          </span>
        </h1>
        <p className="mt-4 max-w-xl text-sm leading-relaxed" style={{ color: 'var(--hq-ink-soft)' }}>
          Your headquarters for what you own, how protected you are, and what is worth your attention — you stay in
          control of every decision.
        </p>

        {/* Universal search — discoverability made visible */}
        <div className="mt-8">
          <div
            className="flex items-center gap-3 rounded-xl px-4 py-3"
            style={{ background: 'var(--hq-graphite)', border: '1px solid var(--hq-edge)' }}
          >
            <Search size={16} style={{ color: 'var(--hq-ink-faint)' }} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Find anything — vaults, heirs, ProofScore, shipping, voting…"
              className="w-full bg-transparent text-sm outline-none"
              style={{ color: 'var(--hq-ink)' }}
            />
          </div>
          {query && (
            <Surface className="mt-2" padded={false}>
              <div className="divide-y" style={{ borderColor: 'var(--hq-edge)' }}>
                {results.length === 0 && (
                  <p className="px-5 py-4 text-sm" style={{ color: 'var(--hq-ink-faint)' }}>
                    Nothing matches “{query}”. Every capability stays searchable — try another word.
                  </p>
                )}
                {results.map((c) => <SearchRow key={c.id} c={c} />)}
              </div>
            </Surface>
          )}
        </div>

        {/* What requires attention — adaptive */}
        {!query && (
          <section className="mt-12">
            <h2 className="text-sm font-semibold uppercase tracking-wider" style={{ color: 'var(--hq-ink-faint)' }}>
              What's worth your attention
            </h2>
            <div className="mt-4 space-y-2">
              {attention.map((e) => (
                <Link key={e.capability.id} href={e.capability.href}
                  className="group flex items-center justify-between rounded-xl px-4 py-3 transition-colors"
                  style={{ background: 'var(--hq-graphite)', border: '1px solid var(--hq-edge)' }}>
                  <div className="flex items-center gap-3">
                    <StatusDot status={e.capability.status} />
                    <div>
                      <p className="text-sm font-medium" style={{ color: 'var(--hq-ink)' }}>{e.capability.label}</p>
                      <p className="text-xs" style={{ color: 'var(--hq-ink-faint)' }}>{e.reason}</p>
                    </div>
                  </div>
                  <ArrowUpRight size={16} className="opacity-0 transition-opacity group-hover:opacity-100" style={{ color: 'var(--hq-gold)' }} />
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Your next journey — recommended playbook */}
        {!query && (
          <section className="mt-12">
            <h2 className="text-sm font-semibold uppercase tracking-wider" style={{ color: 'var(--hq-ink-faint)' }}>Your next journey</h2>
            <div className="mt-4"><RecommendedPlaybook /></div>
          </section>
        )}

        {/* What should I simulate? — contextual entry to the bureau */}
        {!query && (
          <section className="mt-12">
            <Link href="/simulations" className="group flex items-center justify-between rounded-xl px-4 py-3 transition-colors"
              style={{ background: 'var(--hq-graphite)', border: '1px solid var(--hq-edge)' }}>
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--hq-ink)' }}>Understand it before you live it</p>
                <p className="text-xs" style={{ color: 'var(--hq-ink-faint)' }}>Walk through what happens, or try the numbers — educational, never a prediction.</p>
              </div>
              <span className="text-xs font-medium" style={{ color: 'var(--hq-gold)' }}>Open the Simulation Bureau</span>
            </Link>
          </section>
        )}

        {/* Global Connection — entry to the community network */}
        {!query && (
          <section className="mt-4">
            <Link href="/community" className="group flex items-center justify-between rounded-xl px-4 py-3 transition-colors"
              style={{ background: 'var(--hq-graphite)', border: '1px solid var(--hq-edge)' }}>
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--hq-ink)' }}>People, on equal terms</p>
                <p className="text-xs" style={{ color: 'var(--hq-ink-faint)' }}>Connect, share, and learn — no ranking, no popularity, nothing tuned to hold your attention.</p>
              </div>
              <span className="text-xs font-medium" style={{ color: 'var(--hq-gold)' }}>Open the Community</span>
            </Link>
          </section>
        )}

        {/* The five environments */}
        {!query && (
          <section className="mt-14">
            <h2 className="text-sm font-semibold uppercase tracking-wider" style={{ color: 'var(--hq-ink-faint)' }}>
              Your headquarters
            </h2>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {HQ_ORDER.map((id) => {
                const hq = HEADQUARTERS[id];
                const top = byDomain(id).slice(0, 3);
                const c = DOMAIN_COLOR[id];
                return (
                  <Surface key={id} tone={id}>
                    <div className="flex items-center justify-between">
                      <DomainBadge domain={id}>{hq.label}</DomainBadge>
                      <Link href={`/hq/${id}`} className="text-xs transition-colors hover:underline" style={{ color: c.soft }}>
                        Open
                      </Link>
                    </div>
                    <p className="mt-3 text-base font-medium" style={{ color: 'var(--hq-ink)' }}>{hq.question}</p>
                    <div className="mt-4 space-y-1.5">
                      {top.map((e) => (
                        <Link key={e.capability.id} href={e.capability.href}
                          className="flex items-center justify-between rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-white/[0.02]"
                          style={{ color: 'var(--hq-ink-soft)' }}>
                          <span className="flex items-center gap-2">
                            <StatusDot status={e.capability.status} />
                            {e.capability.label}
                          </span>
                        </Link>
                      ))}
                    </div>
                  </Surface>
                );
              })}
            </div>
          </section>
        )}

        {/* The Seer — live deterministic observations */}
        {!query && (
          <section className="mt-14">
            <SeerPanel />
          </section>
        )}

      </div>
    </HQRoot>
  );
}

function SearchRow({ c }: { c: Capability }) {
  return (
    <Link href={c.href} className="flex items-center justify-between px-5 py-3 transition-colors hover:bg-white/[0.02]">
      <div className="flex items-center gap-3">
        <StatusDot status={c.status} />
        <div>
          <p className="text-sm font-medium" style={{ color: 'var(--hq-ink)' }}>{c.label}</p>
          <p className="text-xs" style={{ color: 'var(--hq-ink-faint)' }}>{c.summary}</p>
        </div>
      </div>
      <span className="text-[10px] uppercase tracking-wider" style={{ color: DOMAIN_COLOR[c.domain].soft }}>
        {HEADQUARTERS[c.domain].label}
      </span>
    </Link>
  );
}

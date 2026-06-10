'use client';

/**
 * OwnershipNetworkSection — the homepage centerpiece (Wave 40).
 *
 * The most visually distinct area on the site: headline + the OwnershipNexus diagram. Frames the
 * Nexus with the wave's narrative — build it, protect it, operate it, preserve it — and the
 * one-line meanings of each layer, so a visitor grasps the connected ecosystem within seconds.
 *
 * Premium, restrained presentation: deep field, a single soft glow, generous spacing. The diagram
 * itself carries the motion; the surrounding chrome stays calm.
 */

import { OwnershipNexus } from '@/components/nexus/OwnershipNexus';

const LAYER_NOTES: { word: string; note: string }[] = [
  { word: 'Build it', note: 'Ownership is the foundation — funds in a vault only you control.' },
  { word: 'Protect it', note: 'Trust reduces friction; protection and continuity keep access safe.' },
  { word: 'Operate it', note: 'Commerce turns ownership into activity — payments, customers, growth.' },
  { word: 'Preserve it', note: 'Continuity carries it forward — recovery, succession, resilience.' },
];

export function OwnershipNetworkSection() {
  return (
    <section className="relative overflow-hidden py-24 sm:py-32" aria-label="The ownership network">
      {/* Field — single deep glow behind the diagram */}
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div
          className="absolute left-1/2 top-1/2 h-[820px] w-[820px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-[0.06]"
          style={{ background: 'radial-gradient(circle, #22d3ee 0%, transparent 70%)' }}
        />
      </div>

      <div className="container relative z-10 mx-auto max-w-6xl px-5 md:px-8">
        <div className="mx-auto mb-4 max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-zinc-500">One connected ecosystem</p>
          <h2 className="mt-4 text-4xl font-bold tracking-tight text-white sm:text-5xl">
            The Ownership Network
          </h2>
          <p className="mt-5 text-lg text-zinc-400">
            Build it. Protect it. Operate it. Preserve it.
          </p>
          <p className="mt-3 text-sm text-zinc-500">
            You are at the center. Every institution connects to you — and the network grows as you
            establish each one.
          </p>
        </div>

        {/* The signature diagram */}
        <div className="mt-12">
          <OwnershipNexus />
        </div>

        {/* Layer meanings — the connected narrative, quietly stated */}
        <div className="mx-auto mt-16 grid max-w-4xl grid-cols-1 gap-x-10 gap-y-6 sm:grid-cols-2 lg:grid-cols-4">
          {LAYER_NOTES.map((l) => (
            <div key={l.word} className="text-center sm:text-left">
              <p className="text-sm font-semibold text-white">{l.word}</p>
              <p className="mt-1.5 text-sm leading-relaxed text-zinc-500">{l.note}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

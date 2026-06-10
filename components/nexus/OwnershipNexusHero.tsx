'use client';

/**
 * OwnershipNexusHero — the defining first-viewport experience (Wave 41).
 *
 * The Ownership Nexus IS the hero. It dominates the viewport (~60–70% visual); the headline sits
 * with it, concise, letting the diagram do most of the talking. The cinematic intro plays on load
 * (field → center → connections form in order). Architectural depth: a faint institutional field
 * behind, the monumental Nexus, the overlay message.
 *
 * "What is this?" at five seconds; "I understand what this does" at thirty.
 */

import Link from 'next/link';
import { m, LazyMotion, domAnimation } from 'framer-motion';
import { ArrowRight, ChevronDown } from 'lucide-react';
import { OwnershipNexus } from './OwnershipNexus';

export function OwnershipNexusHero() {
  return (
    <LazyMotion features={domAnimation}>
      <section
        className="relative flex min-h-[100svh] flex-col items-center overflow-hidden pt-[4.5rem]"
        aria-label="The ownership network"
      >
        {/* Architectural field — deep, layered, slow to emerge (Layer 1) */}
        <div className="pointer-events-none absolute inset-0" aria-hidden="true">
          <m.div
            className="absolute left-1/2 top-1/2 h-[1100px] w-[1100px] -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(34,211,238,0.07) 0%, transparent 70%)' }}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 2.4, ease: 'easeOut' }}
          />
          <div
            className="absolute inset-0 opacity-[0.4]"
            style={{
              background: 'radial-gradient(ellipse 80% 60% at 50% 40%, transparent 40%, rgba(0,0,0,0.6) 100%)',
            }}
          />
        </div>

        <div className="relative z-10 flex w-full flex-1 flex-col items-center px-5 md:px-8">
          {/* Overlay headline — concise; the Nexus carries the weight */}
          <m.div
            className="mx-auto mt-6 max-w-3xl text-center md:mt-10"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.3, ease: 'easeOut' }}
          >
            <h1 className="text-4xl font-bold leading-[1.05] tracking-tight text-white sm:text-5xl md:text-6xl">
              Build It. Protect It.{' '}
              <span className="block sm:inline">Operate It. Preserve It.</span>
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-zinc-400 sm:text-lg">
              A self-sovereign ownership network connecting commerce, trust, protection, continuity,
              and governance into one ecosystem.
            </p>
          </m.div>

          {/* The monumental Nexus — the centerpiece */}
          <div className="mt-2 w-full md:mt-4">
            <OwnershipNexus variant="monumental" />
          </div>

          {/* Quiet CTAs beneath — explanation second */}
          <m.div
            className="mb-8 mt-2 flex flex-col items-center gap-3 sm:flex-row"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 3.6 }}
          >
            <Link href="/merchant/setup" className="btn-premium btn-premium-primary text-sm">
              Get started <ArrowRight size={16} aria-hidden="true" />
            </Link>
            <Link href="/vault" className="btn-premium btn-premium-ghost text-sm">
              Open your vault
            </Link>
          </m.div>
        </div>

        {/* Scroll affordance */}
        <m.div
          className="relative z-10 mb-6 flex flex-col items-center gap-1 text-zinc-600"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 4 }}
          aria-hidden="true"
        >
          <span className="text-[10px] font-medium uppercase tracking-[0.2em]">Explore the network</span>
          <ChevronDown size={18} className="animate-bounce" />
        </m.div>
      </section>
    </LazyMotion>
  );
}

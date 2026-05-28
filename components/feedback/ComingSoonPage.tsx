'use client';

/**
 * ComingSoonPage
 *
 * Honest placeholder for features that are designed and named in the
 * navigation but are not yet implemented in this release.
 */

import Link from 'next/link';
import { ArrowLeft, AlertCircle, ArrowRight, CheckCircle2, Clock } from 'lucide-react';
import { Footer } from '@/components/layout/Footer';
import { motion } from 'framer-motion';

export interface ComingSoonPageProps {
  title: string;
  tagline?: string;
  description: string;
  requirements?: string[];
  alternative?: {
    href: string;
    label: string;
    description?: string;
  };
  backHref?: string;
  backLabel?: string;
}

export function ComingSoonPage({
  title,
  tagline,
  description,
  requirements = [],
  alternative,
  backHref = '/',
  backLabel = 'Back to home',
}: ComingSoonPageProps) {
  return (
    <>
      <div className="min-h-screen bg-zinc-950 md:pt-[3.5rem] text-white relative">
        {/* Ambient orbs */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 left-1/3 w-[600px] h-[600px] rounded-full opacity-[0.06]"
            style={{ background: 'radial-gradient(circle, #f59e0b 0%, transparent 70%)' }} />
          <div className="absolute bottom-0 -right-24 w-[500px] h-[500px] rounded-full opacity-[0.05]"
            style={{ background: 'radial-gradient(circle, #06b6d4 0%, transparent 70%)' }} />
        </div>
        <div className="grid-pattern pointer-events-none absolute inset-0 opacity-20" />

        <section className="relative py-12">
          <div className="container mx-auto max-w-3xl px-4">
            <Link href={backHref} className="mb-6 inline-flex items-center gap-2 text-accent hover:text-accent transition-colors">
              <ArrowLeft size={16} /> {backLabel}
            </Link>

            {/* Coming soon notice */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-5 mb-6"
            >
              <div className="flex items-start gap-3">
                <AlertCircle size={22} className="text-amber-300 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="text-amber-200 text-sm font-semibold mb-1">Not available in this release</div>
                  <div className="text-amber-100/80 text-sm">
                    This page is reserved for an upcoming feature. The link is kept in navigation
                    so future shipping doesn&apos;t require a redirect, but no functionality is wired up yet.
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Header */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="mb-6"
            >
              <div className="badge-live mb-4">
                <Clock size={12} /> Coming Soon
              </div>
              <h1 className="text-4xl font-black mb-2 tracking-tight">
                <span className="bg-gradient-to-r from-white to-amber-300 bg-clip-text text-transparent">{title}</span>
              </h1>
              {tagline && <p className="text-lg text-gray-400">{tagline}</p>}
            </motion.div>

            {/* Description */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="glass-card-premium p-6 mb-5"
            >
              <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3">What this will do</h2>
              <p className="text-gray-300 whitespace-pre-wrap leading-relaxed">{description}</p>
            </motion.div>

            {/* Requirements */}
            {requirements.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="glass-card-premium p-6 mb-5"
              >
                <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3">What&apos;s required to ship it</h2>
                <ul className="space-y-2">
                  {requirements.map((req, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                      <span className="text-zinc-500 mt-1">○</span>
                      <span>{req}</span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            )}

            {/* Alternative */}
            {alternative && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-5"
              >
                <h2 className="text-sm font-semibold text-emerald-300 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <CheckCircle2 size={14} /> Use this instead today
                </h2>
                <Link
                  href={alternative.href}
                  className="group flex items-center justify-between gap-4 rounded-xl bg-white/5 border border-white/10 p-4 hover:border-emerald-500/40 hover:bg-emerald-500/5 transition-colors"
                >
                  <div className="flex-1">
                    <div className="font-medium text-white group-hover:text-emerald-200">{alternative.label}</div>
                    {alternative.description && (
                      <div className="text-xs text-zinc-400 mt-0.5">{alternative.description}</div>
                    )}
                  </div>
                  <ArrowRight size={18} className="text-emerald-400 group-hover:translate-x-1 transition-transform" />
                </Link>
              </motion.div>
            )}
          </div>
        </section>
      </div>
      <Footer />
    </>
  );
}

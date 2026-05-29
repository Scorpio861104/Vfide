'use client';

import Link from 'next/link';
import { m, LazyMotion, domAnimation } from 'framer-motion';
import { Home, ArrowLeft, LayoutDashboard, Vault, Store, BookOpen } from 'lucide-react';

const QUICK_LINKS = [
  { href: '/dashboard',  icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/vault',      icon: Vault,           label: 'Vault' },
  { href: '/merchant',   icon: Store,           label: 'Merchant' },
  { href: '/docs',       icon: BookOpen,        label: 'Docs' },
];

export default function NotFound() {
  return (
    <div className="min-h-screen bg-zinc-950 md:pt-[3.5rem] flex items-center justify-center px-4 relative overflow-hidden">
      {/* Ambient orbs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] rounded-full opacity-[0.08]"
          style={{ background: 'radial-gradient(circle, #06b6d4 0%, transparent 65%)', filter: 'blur(80px)' }} />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full opacity-[0.06]"
          style={{ background: 'radial-gradient(circle, #8b5cf6 0%, transparent 65%)', filter: 'blur(80px)' }} />
      </div>
      <div className="grid-pattern pointer-events-none absolute inset-0 opacity-20" aria-hidden="true" />

      <m.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative z-10 w-full max-w-lg text-center"
      >
        {/* Glass card */}
        <div className="glass-card-premium p-10 mb-6">
          {/* 404 number */}
          <m.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 20, delay: 0.1 }}
            className="mb-6"
          >
            <div
              className="text-[7rem] font-black leading-none tracking-tighter select-none"
              style={{
                background: 'linear-gradient(135deg, var(--accent) 0%, #818cf8 60%, #c084fc 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                filter: 'drop-shadow(0 0 40px rgba(34,211,238,0.3))',
              }}
            >
              404
            </div>
          </m.div>

          <m.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <h1 className="text-2xl font-bold text-white mb-3">
              Page not found
            </h1>
            <p className="text-zinc-400 text-sm leading-relaxed mb-8">
              The page you&apos;re looking for doesn&apos;t exist or has moved.
              Let&apos;s get you back on track.
            </p>
          </m.div>

          {/* Primary actions */}
          <m.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45 }}
            className="flex flex-col sm:flex-row gap-3 justify-center"
          >
            <Link
              href="/"
              className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg font-semibold text-sm text-zinc-950 bg-gradient-to-r from-accent to-accent-dark hover:from-accent-dark hover:to-accent active:scale-[0.98] transition-all shadow-lg shadow-accent/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
            >
              <Home size={16} />
              Go home
            </Link>
            <button
              onClick={() => window.history.back()}
              className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg font-semibold text-sm text-zinc-300 bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 active:scale-[0.98] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
            >
              <ArrowLeft size={16} />
              Go back
            </button>
          </m.div>
        </div>

        {/* Quick links */}
        <m.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
        >
          <p className="text-xs text-zinc-500 mb-3 uppercase tracking-widest font-semibold">
            Quick links
          </p>
          <div className="grid grid-cols-4 gap-3">
            {QUICK_LINKS.map(({ href, icon: Icon, label }) => (
              <Link
                key={href}
                href={href}
                className="flex flex-col items-center gap-2 p-3 rounded-xl bg-white/[0.03] border border-white/6 hover:bg-white/[0.06] hover:border-white/12 transition-all group"
              >
                <Icon size={18} className="text-zinc-500 group-hover:text-accent transition-colors" />
                <span className="text-[11px] text-zinc-500 group-hover:text-zinc-300 transition-colors font-medium">
                  {label}
                </span>
              </Link>
            ))}
          </div>
        </m.div>

        {/* Search hint */}
        <m.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.75 }}
          className="mt-6 text-xs text-zinc-600"
        >
          Press <kbd className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-white/8 border border-white/10 font-mono text-[10px] text-zinc-400">⌘K</kbd> to search
        </m.p>
      </m.div>
    </div>
  );
}

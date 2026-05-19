'use client';

import Link from 'next/link';
import { Footer } from '@/components/layout/Footer';
import { Settings, Lock, Bell, Shield } from 'lucide-react';
import { motion } from 'framer-motion';

const SETTINGS_LINKS = [
  {
    href: '/vault/settings',
    icon: Lock,
    title: 'Vault Settings',
    description: 'Recovery controls, guardians, and lock preferences.',
    color: 'text-amber-400',
    border: 'border-amber-500/20 hover:border-amber-500/40',
    bg: 'bg-amber-500/5',
  },
  {
    href: '/security-center',
    icon: Shield,
    title: 'Security Center',
    description: 'Authentication health, monitoring, and alerts.',
    color: 'text-emerald-400',
    border: 'border-emerald-500/20 hover:border-emerald-500/40',
    bg: 'bg-emerald-500/5',
  },
  {
    href: '/notifications',
    icon: Bell,
    title: 'Notifications',
    description: 'Message routing and account update preferences.',
    color: 'text-violet-400',
    border: 'border-violet-500/20 hover:border-violet-500/40',
    bg: 'bg-violet-500/5',
  },
];

export default function SettingsPage() {
  return (
    <>
      <div className="min-h-screen bg-zinc-950 md:pt-[3.5rem] text-white relative">
        {/* Ambient orbs */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-20 w-[600px] h-[600px] rounded-full opacity-[0.07]"
            style={{ background: 'radial-gradient(circle, #8b5cf6 0%, transparent 70%)' }} />
          <div className="absolute bottom-0 -left-32 w-[500px] h-[500px] rounded-full opacity-[0.05]"
            style={{ background: 'radial-gradient(circle, #06b6d4 0%, transparent 70%)' }} />
        </div>
        <div className="grid-pattern pointer-events-none absolute inset-0 opacity-20" />

        <div className="relative container mx-auto max-w-5xl px-4 py-10">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-10"
          >
            <div className="badge-live mb-4">
              <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
              Account Controls
            </div>
            <h1 className="text-4xl font-black text-white mb-3 tracking-tight flex items-center gap-3">
              <Settings className="text-violet-400" size={36} />
              <span className="bg-gradient-to-r from-white to-violet-300 bg-clip-text text-transparent">
                Settings Center
              </span>
            </h1>
            <p className="text-white/60 text-lg max-w-2xl">
              Manage operational preferences, security controls, and notification defaults.
            </p>
          </motion.div>

          {/* Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {SETTINGS_LINKS.map((link, i) => (
              <motion.div
                key={link.href}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
              >
                <Link href={link.href}
                  className={`glass-card-premium p-6 flex flex-col gap-4 border ${link.border} ${link.bg} transition-all duration-300 hover:-translate-y-1 group block`}
                >
                  <div className={`w-12 h-12 rounded-2xl border ${link.border} flex items-center justify-center`}>
                    <link.icon size={22} className={link.color} />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white mb-1">{link.title}</h2>
                    <p className="text-sm text-gray-400">{link.description}</p>
                  </div>
                  <div className={`text-xs font-semibold ${link.color} flex items-center gap-1 mt-auto`}>
                    Open settings <span className="ml-1 group-hover:ml-2 transition-all">→</span>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}

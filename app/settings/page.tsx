'use client';

import Link from 'next/link';
import { Footer } from '@/components/layout/Footer';

const SETTINGS_LINKS = [
  { href: '/vault/settings', title: 'Vault settings', description: 'Recovery controls, guardians, and lock preferences.' },
  { href: '/security-center', title: 'Security center', description: 'Authentication health, monitoring, and alerts.' },
  { href: '/notifications', title: 'Notifications', description: 'Message routing and account update preferences.' },
];

export default function SettingsPage() {
  return (
    <>
      <div className="min-h-screen bg-zinc-950 pt-20">
        <div className="container mx-auto max-w-5xl px-4 py-8 space-y-6">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">Settings Center</h1>
            <p className="text-white/60">Manage operational preferences, security controls, and notification defaults.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {SETTINGS_LINKS.map((link) => (
              <Link key={link.href} href={link.href} className="rounded-2xl border border-white/10 bg-white/3 p-5 hover:border-cyan-500/30 transition-colors">
                <h2 className="text-xl font-semibold text-white">{link.title}</h2>
                <p className="text-sm text-gray-400 mt-2">{link.description}</p>
              </Link>
            ))}
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}

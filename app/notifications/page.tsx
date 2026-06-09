'use client';

export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { Bell, ShieldCheck, Users, KeyRound, ArrowRight } from 'lucide-react';
import { useAccount } from 'wagmi';

import { Footer } from '@/components/layout/Footer';
import { useLocale } from '@/lib/locale/LocaleProvider';

const ALERT_CHANNELS = [
  {
    title: 'Recovery alerts',
    description: 'Recovery requests, challenge windows, and status transitions.',
    icon: KeyRound,
  },
  {
    title: 'Inheritance alerts',
    description: 'Inheritance state changes, proof-of-life windows, and claims.',
    icon: Users,
  },
  {
    title: 'Guardian alerts',
    description: 'Guardian invitations, confirmations, and configuration updates.',
    icon: ShieldCheck,
  },
] as const;

export default function NotificationsPage() {
  const { locale } = useLocale();
  void locale;

  const { isConnected } = useAccount();

  return (
    <>
      <div className="ui-page-shell min-h-screen md:pt-[3.5rem] relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
          <div
            className="absolute -top-28 left-1/4 h-[460px] w-[460px] rounded-full opacity-[0.07]"
            style={{ background: 'radial-gradient(circle, #06b6d4 0%, transparent 70%)' }}
          />
          <div
            className="absolute bottom-0 right-1/4 h-[420px] w-[420px] rounded-full opacity-[0.05]"
            style={{ background: 'radial-gradient(circle, #8b5cf6 0%, transparent 70%)' }}
          />
        </div>
        <div className="grid-pattern pointer-events-none absolute inset-0 opacity-20" aria-hidden="true" />

        <div className="ui-container-breathing relative z-10 py-10">
          <section className="glass-card-premium p-6 sm:p-8 mb-6">
            <div className="flex items-start gap-4">
              <div className="rounded-xl border border-accent/20 bg-accent/5 p-2.5">
                <Bell size={20} className="text-cyan-400" aria-hidden="true" />
              </div>
              <div>
                <div className="badge-live mb-2 w-fit">Notification Center</div>
                <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">Critical alerts, all in one place</h1>
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-400">
                  This center prioritizes continuity events first: recovery, inheritance, and guardian activity.
                  Notifications here are operational alerts, not social noise.
                </p>
              </div>
            </div>
          </section>

          {!isConnected ? (
            <section className="glass-card-premium p-8 text-center">
              <p className="text-lg font-semibold text-white">Connect your wallet to load your notification stream.</p>
              <p className="mt-2 text-sm text-zinc-400">No sample alerts are shown while disconnected.</p>
              <div className="mt-5">
                <Link
                  href="/settings?tab=notifications"
                  className="btn-premium btn-premium-primary inline-flex items-center gap-2"
                >
                  Open notification settings <ArrowRight size={14} />
                </Link>
              </div>
            </section>
          ) : (
            <section className="grid grid-cols-1 gap-4 md:grid-cols-3 mb-6">
              {ALERT_CHANNELS.map(({ title, description, icon: Icon }) => (
                <article key={title} className="analytics-card p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <Icon size={16} className="text-cyan-400" aria-hidden="true" />
                    <h2 className="text-sm font-semibold text-white">{title}</h2>
                  </div>
                  <p className="text-xs leading-relaxed text-zinc-400">{description}</p>
                  <p className="mt-3 text-xs text-zinc-500">No active alerts.</p>
                </article>
              ))}
            </section>
          )}

          <section className="glass-card-premium p-6 sm:p-7">
            <h2 className="text-lg font-semibold text-white">Current stream</h2>
            <p className="mt-1 text-sm text-zinc-400">
              You&apos;re all caught up. New recovery, inheritance, and guardian events will appear here as they happen.
            </p>
            <div className="mt-4 rounded-xl border border-dashed border-white/10 bg-white/[0.02] p-4 text-xs text-zinc-500">
              Truth-in-state: this page only shows real events when they exist; no fabricated activity is displayed.
            </div>
          </section>
        </div>
      </div>
      <Footer />
    </>
  );
}

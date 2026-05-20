'use client';

/**
 * FiatTab — fiat on/off ramp surface.
 *
 * This page describes the experience the network will offer once a fiat
 * provider partnership is integrated. The integration is not yet built —
 * it requires a third-party regulated provider (Ramp, MoonPay, Banxa,
 * Stripe Fiat-to-Crypto, or equivalent), KYC/AML compliance scaffolding,
 * and per-region availability rules. Until then, this tab honestly
 * declares Future Release status rather than showing fake provider
 * lists or fake "Operational" banners.
 */

import { CreditCard } from 'lucide-react';

import { LivePriceDisplay } from './LivePriceDisplay';
import { FutureReleaseBanner } from '@/components/feedback/FutureReleaseBanner';

export function FiatTab({ isConnected: _isConnected }: { isConnected: boolean }) {
  return (
    <div className="space-y-8">
      {/* Fiat Overview header (no false status banner) */}
      <div className="bg-gradient-to-br from-amber-900/15 to-zinc-900/40 border border-amber-500/20 rounded-xl p-4 sm:p-6 md:p-8">
        <div className="flex items-center gap-4 mb-2">
          <CreditCard className="w-12 h-12 text-amber-300" />
          <div>
            <h2 className="text-2xl font-bold text-zinc-100">Fiat On/Off Ramp</h2>
            <p className="text-zinc-400">Convert between fiat currencies and VFIDE</p>
          </div>
        </div>
      </div>

      {/* Future Release banner */}
      <FutureReleaseBanner
        title="Fiat ramp pending partner integration"
        description={
          'The fiat ramp requires a regulated payments partner to move money between bank rails ' +
          'and the VFIDE network. We are not custodial of fiat — we route through a licensed provider.\n\n' +
          'Until that partnership is signed and the integration is built and audited, this tab is a ' +
          'placeholder. We will not list "Available" providers or quote fees we cannot honor.'
        }
        requirements={[
          'Signed agreement with a regulated fiat-to-crypto provider (Ramp / MoonPay / Banxa / Transak / equivalent)',
          'KYC/AML scaffolding aligned with the partner\'s requirements (most partners handle KYC themselves; we surface and route)',
          'Per-region availability rules — fiat partners restrict by country/state, the UI must reflect that',
          'Off-ramp settlement path — VFIDE → stablecoin → partner → bank, with on-chain proof of the leg we control',
          'Compliance review of the customer-funds flow to confirm the structure stays non-custodial of fiat from our side',
        ]}
        alternative={{
          href: '/buy',
          label: 'Buy VFIDE on Base via Uniswap',
          description: 'Until the in-app ramp ships, users with any wallet can swap on-chain via the existing /buy → Uniswap route.',
        }}
      />

      {/* Live price stays — it's real */}
      <LivePriceDisplay />
    </div>
  );
}

/**
 * On-Ramp Integration — Fiat-to-crypto via third-party providers
 * 
 * VFIDE does NOT handle fiat. Users buy tokens from regulated providers
 * (MoonPay, Transak, Ramp, etc.) who handle their own KYC.
 * 
 * This component:
 * 1. Opens the provider's widget in an iframe or new window
 * 2. Pre-fills the user's wallet address as the destination
 * 3. Shows clear disclaimer that KYC is handled by the provider
 * 4. VFIDE never sees the user's bank details, ID, or payment info
 * 
 * The user buys VFIDE tokens (or stablecoins) from the provider.
 * Tokens arrive in the user's wallet. User deposits to vault.
 * VFIDE's involvement is zero — we just provide the link.
 */
'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CreditCard, ExternalLink, X, Shield, ChevronRight } from 'lucide-react';
import { OnRampDisclaimer, ThirdPartyServiceNotice } from './ProtocolDisclaimers';

// ── Provider Config ─────────────────────────────────────────────────────────

interface OnRampProvider {
  id: string;
  name: string;
  description: string;
  logoEmoji: string;
  color: string;
  buildUrl: (params: { walletAddress: string; token: string; fiatCurrency: string; fiatAmount?: number }) => string;
  supportedTokens: string[];
  supportedRegions: string[]; // ISO country codes, or ['*'] for global
}

const PROVIDERS: OnRampProvider[] = [
  {
    id: 'moonpay',
    name: 'MoonPay',
    description: 'Card, bank transfer, Apple Pay',
    logoEmoji: '🌙',
    color: '#7C3AED',
    buildUrl: ({ walletAddress, token, fiatCurrency, fiatAmount }) => {
      const params = new URLSearchParams({
        apiKey: process.env.NEXT_PUBLIC_MOONPAY_KEY || '',
        currencyCode: token.toLowerCase(),
        walletAddress,
        baseCurrencyCode: fiatCurrency.toLowerCase(),
        ...(fiatAmount ? { baseCurrencyAmount: fiatAmount.toString() } : {}),
        colorCode: '#06b6d4',
      });
      return `https://buy.moonpay.com?${params}`;
    },
    supportedTokens: ['USDC', 'USDT', 'ETH'],
    supportedRegions: ['*'],
  },
  {
    id: 'transak',
    name: 'Transak',
    description: 'Card, bank transfer, UPI, M-Pesa',
    logoEmoji: '⚡',
    color: '#0052FF',
    buildUrl: ({ walletAddress, token, fiatCurrency, fiatAmount }) => {
      const params = new URLSearchParams({
        apiKey: process.env.NEXT_PUBLIC_TRANSAK_KEY || '',
        cryptoCurrencyCode: token,
        walletAddress,
        fiatCurrency: fiatCurrency.toUpperCase(),
        ...(fiatAmount ? { fiatAmount: fiatAmount.toString() } : {}),
        themeColor: '06b6d4',
        environment: process.env.NODE_ENV === 'production' ? 'PRODUCTION' : 'STAGING',
      });
      return `https://global.transak.com?${params}`;
    },
    supportedTokens: ['USDC', 'USDT', 'ETH', 'DAI'],
    supportedRegions: ['*'],
  },
  {
    id: 'ramp',
    name: 'Ramp',
    description: 'Card, bank transfer, open banking',
    logoEmoji: '🔷',
    color: '#21BF73',
    buildUrl: ({ walletAddress, token }) => {
      const params = new URLSearchParams({
        hostApiKey: process.env.NEXT_PUBLIC_RAMP_KEY || '',
        userAddress: walletAddress,
        swapAsset: token,
        hostAppName: 'VFIDE',
      });
      return `https://buy.ramp.network/?${params}`;
    },
    supportedTokens: ['USDC', 'USDT', 'ETH'],
    supportedRegions: ['*'],
  },
];

// ── Component ───────────────────────────────────────────────────────────────

interface OnRampButtonProps {
  walletAddress: string;
  defaultToken?: string;
  defaultFiatCurrency?: string;
  defaultAmount?: number;
  className?: string;
}

export function OnRampButton({
  walletAddress,
  defaultToken = 'USDC',
  defaultFiatCurrency = 'USD',
  defaultAmount,
  className = '',
}: OnRampButtonProps) {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className={`flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-emerald-500 to-green-600 text-white rounded-xl font-bold hover:scale-[1.02] transition-transform ${className}`}
      >
        <CreditCard size={18} />
        Buy Crypto
      </button>

      <AnimatePresence>
        {showModal && (
          <OnRampModal
            walletAddress={walletAddress}
            defaultToken={defaultToken}
            defaultFiatCurrency={defaultFiatCurrency}
            defaultAmount={defaultAmount}
            onClose={() => setShowModal(false)}
          />
        )}
      </AnimatePresence>
    </>
  );
}

function OnRampModal({
  walletAddress,
  defaultToken,
  defaultFiatCurrency,
  defaultAmount,
  onClose,
}: {
  walletAddress: string;
  defaultToken: string;
  defaultFiatCurrency: string;
  defaultAmount?: number;
  onClose: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={e => e.stopPropagation()}
        className="bg-zinc-900 border border-white/10 rounded-2xl w-full max-w-sm overflow-hidden"
      >
        <div className="p-5 pb-0 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-white">Buy Crypto</h3>
            <p className="text-gray-400 text-xs mt-0.5">Choose a provider to purchase tokens</p>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-white"><X size={18} /></button>
        </div>

        <div className="p-5 space-y-2">
          {PROVIDERS.map(provider => {
            const url = provider.buildUrl({
              walletAddress,
              token: defaultToken,
              fiatCurrency: defaultFiatCurrency,
              fiatAmount: defaultAmount,
            });

            return (
              <a
                key={provider.id}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-4 bg-white/3 border border-white/10 rounded-xl hover:border-white/20 transition-colors"
              >
                <span className="text-2xl">{provider.logoEmoji}</span>
                <div className="flex-1">
                  <div className="text-white font-bold text-sm">{provider.name}</div>
                  <div className="text-gray-500 text-xs">{provider.description}</div>
                </div>
                <ExternalLink size={16} className="text-gray-500" />
              </a>
            );
          })}
        </div>

        <div className="px-5 pb-5">
          <OnRampDisclaimer providerName="the selected provider" />
        </div>
      </motion.div>
    </motion.div>
  );
}

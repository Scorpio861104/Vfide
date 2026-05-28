'use client';
/**
 * RemittanceTab — corridor rates + fee calculator inside the /wallet hub.
 * Absorbed from /remittance. API routes at /api/remittance/* are unaffected.
 */
import { useState } from 'react';
import { useAccount } from 'wagmi';
import { ArrowRight, Globe } from 'lucide-react';
import { VfideConnectButton } from '@/components/crypto/VfideConnectButton';
import Link from 'next/link';
import { useLocale } from '@/hooks/useLocale';
import { REMITTANCE_TRANSLATIONS, pickLocaleCopy } from '@/lib/i18n';

const CORRIDORS = [
  { from: '🇺🇸 USD', to: '🇬🇭 GHS', rate: '1 USD ≈ 13.2 GHS',   fee: '0.0%', time: '< 3 sec', saving: 'Save ~$12 vs. Western Union' },
  { from: '🇦🇪 AED', to: '🇵🇭 PHP', rate: '1 AED ≈ 16.4 PHP',   fee: '0.0%', time: '< 3 sec', saving: 'Save ~$8 vs. bank transfer' },
  { from: '🇬🇧 GBP', to: '🇳🇬 NGN', rate: '1 GBP ≈ 2,010 NGN', fee: '0.0%', time: '< 3 sec', saving: 'Save ~$15 vs. MoneyGram' },
  { from: '🇺🇸 USD', to: '🇮🇳 INR', rate: '1 USD ≈ 83.6 INR',   fee: '0.0%', time: '< 3 sec', saving: 'Save ~$6 vs. PayPal' },
];

const STEPS = [
  { step: '1', title: 'Connect wallet',        desc: 'MetaMask, WalletConnect, or Coinbase Wallet.' },
  { step: '2', title: 'Add a beneficiary',     desc: 'Save their wallet address once. Reuse forever.' },
  { step: '3', title: 'Enter amount & send',   desc: 'Pay in USDC or USDT. They receive in any stablecoin.' },
  { step: '4', title: 'Arrives in seconds',    desc: 'On Base L2. Gas is cents, not dollars.' },
];

export function RemittanceTab() {
  const [locale] = useLocale();
  const _copy = pickLocaleCopy(REMITTANCE_TRANSLATIONS, locale);
  const { isConnected } = useAccount();
  const [amount, setAmount] = useState('100');
  const [selectedCorridor, setSelectedCorridor] = useState(0);

  const buyerFee = Math.max(0.25, parseFloat(amount || '0') * 0.025);
  const netAmount = parseFloat(amount || '0') - buyerFee;

  return (
    <div className="max-w-3xl mx-auto py-6 space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <Globe size={20} className="text-accent" /> Send Money Home
        </h2>
        <p className="text-white/50 text-sm mt-1">Zero merchant fee. Base L2. Stablecoin-to-stablecoin. Arrives in seconds.</p>
      </div>

      {/* Corridors */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {CORRIDORS.map((c, i) => (
          <button key={i} onClick={() => setSelectedCorridor(i)}
            className={`text-left p-4 rounded-xl border transition-colors ${selectedCorridor===i ? 'border-accent bg-accent/10' : 'border-zinc-800 bg-zinc-900/40 hover:border-zinc-600'}`}>
            <div className="flex items-center gap-2 text-sm font-medium text-white mb-1">
              {c.from} <ArrowRight size={12} className="text-zinc-500" /> {c.to}
            </div>
            <div className="text-xs text-zinc-500">{c.rate}</div>
            <div className="flex items-center gap-3 mt-2 text-xs">
              <span className="text-emerald-400">{c.fee} fee</span>
              <span className="text-zinc-500">{c.time}</span>
            </div>
            <div className="text-xs text-accent mt-1">{c.saving}</div>
          </button>
        ))}
      </div>

      {/* Fee calc */}
      <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-5 space-y-4">
        <h3 className="font-bold text-white">Fee calculator</h3>
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <label className="text-xs text-zinc-500 block mb-1.5">Amount you send (USD)</label>
            <input type="number" value={amount} onChange={e => setAmount(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-accent" />
          </div>
          <ArrowRight size={20} className="text-zinc-600 mt-5 shrink-0" />
          <div className="flex-1">
            <label className="text-xs text-zinc-500 block mb-1.5">They receive</label>
            <div className="w-full bg-zinc-800/50 border border-zinc-700 rounded-xl px-4 py-2.5 text-emerald-400 text-sm font-bold">
              ${netAmount.toFixed(2)}
            </div>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3 text-center text-sm">
          <div className="bg-zinc-800/50 rounded-xl p-3">
            <div className="text-zinc-500 text-xs mb-1">Protocol fee</div>
            <div className="text-white font-bold">0.00%</div>
          </div>
          <div className="bg-zinc-800/50 rounded-xl p-3">
            <div className="text-zinc-500 text-xs mb-1">Corridor fee</div>
            <div className="text-white font-bold">${buyerFee.toFixed(2)}</div>
          </div>
          <div className="bg-zinc-800/50 rounded-xl p-3">
            <div className="text-zinc-500 text-xs mb-1">Arrives</div>
            <div className="text-white font-bold">&lt; 3 sec</div>
          </div>
        </div>
      </div>

      {/* Steps */}
      <div className="space-y-3">
        <h3 className="font-bold text-white">How it works</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {STEPS.map(s => (
            <div key={s.step} className="flex gap-3 items-start bg-zinc-900/40 border border-zinc-800 rounded-xl p-4">
              <div className="w-7 h-7 rounded-full bg-accent/20 text-accent text-xs font-bold flex items-center justify-center shrink-0">{s.step}</div>
              <div>
                <div className="text-sm font-medium text-white">{s.title}</div>
                <div className="text-xs text-zinc-500 mt-0.5">{s.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {isConnected ? (
        <Link href="/pay"
          className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl bg-accent text-zinc-900 font-bold text-sm hover:bg-accent/90 transition-colors">
          <ArrowRight size={16} /> Send Now via Quick Pay
        </Link>
      ) : (
        <div className="flex flex-col items-center gap-3 py-4">
          <p className="text-zinc-400 text-sm">Connect to start sending</p>
          <VfideConnectButton />
        </div>
      )}
    </div>
  );
}

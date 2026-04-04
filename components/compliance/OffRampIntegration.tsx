'use client';

import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowUpRight, BanknoteArrowDown, CheckCircle2, Clock3, Loader2, Smartphone, X } from 'lucide-react';
import { OnRampDisclaimer, ThirdPartyServiceNotice } from './ProtocolDisclaimers';

interface OffRampProvider {
  id: 'yellowcard' | 'kotanipay' | 'fonbnk' | 'transak' | 'moonpay';
  name: string;
  description: string;
  logoEmoji: string;
  supportedTokens: string[];
  supportedNetworks: string[];
  website: string;
}

const PROVIDERS: OffRampProvider[] = [
  {
    id: 'yellowcard',
    name: 'Yellow Card',
    description: 'Africa-wide stablecoin sell and payout coverage',
    logoEmoji: '🟨',
    supportedTokens: ['USDC', 'USDT'],
    supportedNetworks: ['mpesa', 'mtn_momo', 'bank'],
    website: 'https://yellowcard.io',
  },
  {
    id: 'kotanipay',
    name: 'Kotani Pay',
    description: 'M-Pesa focused crypto off-ramp',
    logoEmoji: '📲',
    supportedTokens: ['USDC', 'USDT', 'VFIDE'],
    supportedNetworks: ['mpesa'],
    website: 'https://kotanipay.com',
  },
  {
    id: 'fonbnk',
    name: 'Fonbnk',
    description: 'Airtime and feature-phone friendly cash-out paths',
    logoEmoji: '📞',
    supportedTokens: ['USDC', 'USDT'],
    supportedNetworks: ['airtime', 'wallet'],
    website: 'https://www.fonbnk.com',
  },
  {
    id: 'transak',
    name: 'Transak Sell',
    description: 'Global off-ramp coverage with local payout rails',
    logoEmoji: '⚡',
    supportedTokens: ['USDC', 'USDT', 'DAI'],
    supportedNetworks: ['mpesa', 'bank', 'wallet', 'gcash'],
    website: 'https://global.transak.com',
  },
  {
    id: 'moonpay',
    name: 'MoonPay Sell',
    description: 'Card and bank-based sell flow',
    logoEmoji: '🌙',
    supportedTokens: ['USDC', 'USDT'],
    supportedNetworks: ['bank', 'wallet'],
    website: 'https://sell.moonpay.com',
  },
];

interface WithdrawalRecord {
  id: number | string;
  amount: string;
  token: string;
  provider: string;
  mobile_number_hint?: string | null;
  network: string;
  status: string;
  created_at: string;
}

interface OffRampButtonProps {
  walletAddress: string;
  className?: string;
}

export function OffRampButton({ walletAddress, className = '' }: OffRampButtonProps) {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className={`inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-5 py-3 font-bold text-white transition-transform hover:scale-[1.02] ${className}`}
      >
        <BanknoteArrowDown size={18} />
        Withdraw to Mobile Money
      </button>

      <AnimatePresence>
        {showModal && (
          <OffRampModal walletAddress={walletAddress} onClose={() => setShowModal(false)} />
        )}
      </AnimatePresence>
    </>
  );
}

function OffRampModal({ walletAddress, onClose }: { walletAddress: string; onClose: () => void }) {
  const [amount, setAmount] = useState('100');
  const [token, setToken] = useState('USDC');
  const [provider, setProvider] = useState<OffRampProvider['id']>('transak');
  const [network, setNetwork] = useState('mpesa');
  const [mobileNumber, setMobileNumber] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ requestId: string; redirectUrl?: string; instructions?: string } | null>(null);

  const selectedProvider = useMemo<OffRampProvider>(
    () => PROVIDERS.find((entry) => entry.id === provider) ?? PROVIDERS[0]!,
    [provider],
  );

  useEffect(() => {
    if (!selectedProvider.supportedNetworks.includes(network)) {
      setNetwork(selectedProvider.supportedNetworks[0] ?? 'bank');
    }
    if (!selectedProvider.supportedTokens.includes(token)) {
      setToken(selectedProvider.supportedTokens[0] ?? 'USDC');
    }
  }, [selectedProvider, network, token]);

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/merchant/withdraw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount,
          token,
          provider,
          mobileNumber,
          network,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create withdrawal request');
      }

      setResult({
        requestId: String(data.request?.id ?? 'pending'),
        redirectUrl: data.redirectUrl,
        instructions: data.instructions,
      });
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Failed to create withdrawal request');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={(event) => event.stopPropagation()}
        className="w-full max-w-lg overflow-hidden rounded-2xl border border-white/10 bg-zinc-900"
      >
        <div className="flex items-center justify-between p-5 pb-0">
          <div>
            <h3 className="text-lg font-bold text-white">Cash out to local rails</h3>
            <p className="text-xs text-gray-400">Wallet: {walletAddress.slice(0, 6)}…{walletAddress.slice(-4)}</p>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-white">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4 p-5">
          <div className="grid gap-3 md:grid-cols-2">
            <label className="space-y-1 text-sm text-gray-300">
              <span>Amount</span>
              <input
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-white"
                inputMode="decimal"
                placeholder="100"
              />
            </label>

            <label className="space-y-1 text-sm text-gray-300">
              <span>Token</span>
              <select
                value={token}
                onChange={(event) => setToken(event.target.value)}
                className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-white"
              >
                {selectedProvider.supportedTokens.map((supportedToken) => (
                  <option key={supportedToken} value={supportedToken}>{supportedToken}</option>
                ))}
              </select>
            </label>
          </div>

          <label className="space-y-1 text-sm text-gray-300">
            <span>Provider</span>
            <div className="grid gap-2 md:grid-cols-2">
              {PROVIDERS.map((entry) => (
                <button
                  key={entry.id}
                  type="button"
                  onClick={() => setProvider(entry.id)}
                  className={`rounded-xl border px-3 py-3 text-left transition-colors ${provider === entry.id ? 'border-cyan-400 bg-cyan-500/10' : 'border-white/10 bg-white/5'}`}
                >
                  <div className="font-semibold text-white">{entry.logoEmoji} {entry.name}</div>
                  <div className="mt-1 text-xs text-gray-400">{entry.description}</div>
                </button>
              ))}
            </div>
          </label>

          <div className="grid gap-3 md:grid-cols-2">
            <label className="space-y-1 text-sm text-gray-300">
              <span>Network</span>
              <select
                value={network}
                onChange={(event) => setNetwork(event.target.value)}
                className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-white"
              >
                {selectedProvider.supportedNetworks.map((supportedNetwork) => (
                  <option key={supportedNetwork} value={supportedNetwork}>{supportedNetwork}</option>
                ))}
              </select>
            </label>

            <label className="space-y-1 text-sm text-gray-300">
              <span>Mobile / payout account</span>
              <input
                value={mobileNumber}
                onChange={(event) => setMobileNumber(event.target.value)}
                className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-white"
                placeholder="+254700123456"
              />
            </label>
          </div>

          {error && <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">{error}</div>}

          {result ? (
            <div className="space-y-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-100">
              <div className="flex items-center gap-2 font-semibold">
                <CheckCircle2 size={16} /> Withdrawal request #{result.requestId} created
              </div>
              {result.instructions && <p>{result.instructions}</p>}
              {result.redirectUrl && (
                <a
                  href={result.redirectUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-3 py-2 font-semibold text-white"
                >
                  Continue with provider
                  <ArrowUpRight size={16} />
                </a>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting || !mobileNumber.trim()}
              className="inline-flex items-center gap-2 rounded-xl bg-cyan-500 px-4 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? <Loader2 size={16} className="animate-spin" /> : <Smartphone size={16} />}
              Create withdrawal request
            </button>
          )}

          <ThirdPartyServiceNotice
            serviceName={selectedProvider.name}
            serviceUrl={selectedProvider.website}
            serviceType="off-ramp"
          />
          <OnRampDisclaimer providerName={selectedProvider.name} />
        </div>
      </motion.div>
    </motion.div>
  );
}

export function OffRampStatus({ walletAddress }: { walletAddress: string }) {
  const [withdrawals, setWithdrawals] = useState<WithdrawalRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const response = await fetch(`/api/merchant/withdraw?merchant=${walletAddress}`);
        if (!response.ok) return;
        const data = await response.json();
        if (!cancelled) {
          setWithdrawals(Array.isArray(data.withdrawals) ? data.withdrawals : []);
        }
      } catch {
        if (!cancelled) {
          setWithdrawals([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [walletAddress]);

  const pending = withdrawals.filter((entry) => entry.status === 'pending').length;
  const completed = withdrawals.filter((entry) => entry.status === 'completed').length;
  const latest = withdrawals[0];

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="mb-3 flex items-center gap-2 text-white">
        <Clock3 size={16} className="text-cyan-400" />
        <span className="font-semibold">Off-ramp status</span>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <Loader2 size={14} className="animate-spin" /> Loading recent withdrawals…
        </div>
      ) : (
        <div className="space-y-3 text-sm">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-white/10 bg-black/20 p-3 text-white">
              <div className="text-xs text-gray-400">Pending</div>
              <div className="text-xl font-bold">{pending}</div>
            </div>
            <div className="rounded-xl border border-white/10 bg-black/20 p-3 text-white">
              <div className="text-xs text-gray-400">Completed</div>
              <div className="text-xl font-bold">{completed}</div>
            </div>
          </div>

          {latest ? (
            <div className="rounded-xl border border-white/10 bg-black/20 p-3 text-gray-300">
              <div className="font-semibold text-white">Latest: {latest.amount} {latest.token}</div>
              <div>{latest.provider} → {latest.network}</div>
              {latest.mobile_number_hint && <div>Payout: {latest.mobile_number_hint}</div>}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-white/10 bg-black/20 p-3 text-gray-400">
              No withdrawal requests yet.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

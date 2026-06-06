'use client';

import { useState } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import {
  Store,
  ShoppingBag,
  Check,
  ChevronRight,
  ArrowRight,
  Banknote,
  Zap,
  Receipt,
  Shield,
  RefreshCw,
} from 'lucide-react';

// ── Simulated product ────────────────────────────────────────────────────────
const PRODUCT = {
  name: 'Handmade Leather Wallet',
  category: 'Accessories',
  price: 50,
  currency: 'USDC',
  seller: 'Amara Osei',
  location: 'Accra, Ghana',
};

// ── Step definitions ──────────────────────────────────────────────────────────
const STEPS = [
  {
    id: 'setup',
    label: 'Store Setup',
    icon: Store,
    color: '#10B981',
    tagline: '30 seconds to launch',
  },
  {
    id: 'checkout',
    label: 'Customer Pays',
    icon: ShoppingBag,
    color: '#06b6d4',
    tagline: 'Buyer experience',
  },
  {
    id: 'settlement',
    label: 'You Get Paid',
    icon: Banknote,
    color: '#8B5CF6',
    tagline: 'Zero fees kept',
  },
] as const;

type StepId = (typeof STEPS)[number]['id'];

// ── Fee comparison data ───────────────────────────────────────────────────────
const COMPARISONS = [
  { name: 'PayPal',   fee: 3.49, color: '#003087' },
  { name: 'Stripe',   fee: 2.90, color: '#635BFF' },
  { name: 'Etsy',     fee: 6.50, color: '#F56400' },
  { name: 'VFIDE',    fee: 0,    color: '#10B981', highlight: true },
];

// ── Component ─────────────────────────────────────────────────────────────────
export function MerchantTab() {
  const [activeStep, setActiveStep] = useState<StepId>('setup');
  const [animatingPay, setAnimatingPay] = useState(false);
  const [paid, setPaid] = useState(false);

  function handlePay() {
    if (animatingPay || paid) return;
    setAnimatingPay(true);
    setTimeout(() => {
      setAnimatingPay(false);
      setPaid(true);
      setTimeout(() => setActiveStep('settlement'), 600);
    }, 1800);
  }

  function reset() {
    setActiveStep('setup');
    setPaid(false);
    setAnimatingPay(false);
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/25 bg-emerald-500/[0.08] px-3 py-1 mb-4">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs font-bold uppercase tracking-widest text-emerald-400">Interactive Demo</span>
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Sell anything. Keep everything.</h2>
        <p className="text-zinc-400 text-sm max-w-xl">
          Walk through a real sale — from store setup to settlement — and see exactly what happens to
          the money. No platform cuts. No surprises.
        </p>
      </div>

      {/* Step nav */}
      <div className="flex items-center gap-0">
        {STEPS.map((step, i) => {
          const isActive = step.id === activeStep;
          const isDone = STEPS.findIndex((s) => s.id === activeStep) > i;
          const Icon = step.icon;
          return (
            <div key={step.id} className="flex items-center flex-1 last:flex-none">
              <button
                onClick={() => { if (isDone || isActive) setActiveStep(step.id); }}
                className={`flex flex-col items-center gap-1.5 px-4 py-2 rounded-xl transition-all text-left ${
                  isActive
                    ? 'bg-white/[0.05] border border-white/10'
                    : isDone
                    ? 'opacity-70 hover:opacity-100 cursor-pointer'
                    : 'opacity-30 cursor-default'
                }`}
              >
                <div
                  className="h-9 w-9 rounded-xl flex items-center justify-center"
                  style={{ background: isDone ? `${step.color}25` : isActive ? `${step.color}20` : 'rgba(255,255,255,0.04)' }}
                >
                  {isDone ? (
                    <Check size={16} className="text-emerald-400" />
                  ) : (
                    <Icon size={16} style={{ color: isActive ? step.color : '#71717a' }} />
                  )}
                </div>
                <span className={`text-xs font-semibold ${isActive ? 'text-white' : isDone ? 'text-zinc-400' : 'text-zinc-600'}`}>
                  {step.label}
                </span>
                <span className={`text-[10px] ${isActive ? 'text-zinc-400' : 'text-zinc-700'}`}>
                  {step.tagline}
                </span>
              </button>
              {i < STEPS.length - 1 && (
                <ChevronRight size={14} className={`mx-1 flex-shrink-0 ${isDone ? 'text-emerald-500' : 'text-zinc-700'}`} />
              )}
            </div>
          );
        })}
      </div>

      {/* Step panels */}
      <AnimatePresence mode="wait">
        <m.div
          key={activeStep}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.22 }}
        >
          {/* ── STEP 1: STORE SETUP ── */}
          {activeStep === 'setup' && (
            <div className="grid gap-5 md:grid-cols-2">
              {/* Store card */}
              <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-emerald-500/15 flex items-center justify-center">
                    <Store size={18} className="text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500 font-semibold uppercase tracking-wider">Demo Merchant</p>
                    <p className="text-white font-bold">{PRODUCT.seller}</p>
                  </div>
                  <div className="ml-auto flex items-center gap-1 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2 py-0.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-[10px] font-bold text-emerald-400 uppercase">Live</span>
                  </div>
                </div>

                <div className="rounded-xl border border-white/5 bg-black/20 p-4 space-y-3">
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-600">Listing</p>
                  <div className="flex items-start justify-between gap-3">
                    <div className="h-14 w-14 rounded-xl bg-amber-900/30 border border-amber-600/20 flex items-center justify-center flex-shrink-0">
                      <span className="text-2xl">👜</span>
                    </div>
                    <div className="flex-1">
                      <p className="text-white font-semibold text-sm">{PRODUCT.name}</p>
                      <p className="text-zinc-500 text-xs">{PRODUCT.category} · {PRODUCT.location}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-white font-black text-lg">${PRODUCT.price}</p>
                      <p className="text-zinc-500 text-xs">{PRODUCT.currency}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2 text-xs text-zinc-400">
                  {[
                    'No application or approval required',
                    'Payment link generated instantly',
                    'Share on WhatsApp, Instagram, anywhere',
                  ].map((item) => (
                    <div key={item} className="flex items-center gap-2">
                      <Check size={12} className="text-emerald-400 flex-shrink-0" />
                      {item}
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => setActiveStep('checkout')}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 transition-colors text-white font-bold text-sm py-3"
                >
                  See customer checkout <ArrowRight size={14} />
                </button>
              </div>

              {/* Fee comparison */}
              <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-6 space-y-4">
                <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">Seller fee on a ${PRODUCT.price} sale</p>
                <div className="space-y-3">
                  {COMPARISONS.map((c) => {
                    const feeAmount = (PRODUCT.price * c.fee) / 100;
                    const barPct = c.fee === 0 ? 2 : (c.fee / 7) * 100;
                    return (
                      <div key={c.name} className={`rounded-xl p-3 ${c.highlight ? 'border border-emerald-500/30 bg-emerald-500/[0.06]' : 'bg-white/[0.02]'}`}>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className={`text-sm font-semibold ${c.highlight ? 'text-emerald-300' : 'text-zinc-300'}`}>
                            {c.name} {c.highlight && '🎉'}
                          </span>
                          <span className={`text-sm font-black ${c.highlight ? 'text-emerald-400' : 'text-zinc-400'}`}>
                            {c.fee === 0 ? '$0.00' : `-$${feeAmount.toFixed(2)}`}
                          </span>
                        </div>
                        <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${barPct}%`, background: c.highlight ? '#10B981' : c.color, opacity: c.highlight ? 1 : 0.5 }}
                          />
                        </div>
                        <p className="text-[10px] text-zinc-600 mt-1">
                          {c.fee === 0 ? 'Seller pays nothing — ever' : `${c.fee}% platform fee`}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ── STEP 2: CUSTOMER CHECKOUT ── */}
          {activeStep === 'checkout' && (
            <div className="max-w-sm mx-auto">
              <div className="rounded-2xl border border-white/10 bg-zinc-900/80 overflow-hidden">
                {/* Phone chrome */}
                <div className="bg-zinc-800/60 px-4 py-3 flex items-center gap-2 border-b border-white/5">
                  <div className="h-2.5 w-2.5 rounded-full bg-zinc-600" />
                  <div className="h-2.5 w-2.5 rounded-full bg-zinc-600" />
                  <div className="h-2.5 w-2.5 rounded-full bg-zinc-600" />
                  <span className="text-xs text-zinc-500 ml-2 flex-1 text-center">vfide.app/pay/amara-osei</span>
                </div>

                <div className="p-5 space-y-4">
                  <div className="text-center">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1">Payment to</p>
                    <p className="text-white font-bold">{PRODUCT.seller}</p>
                    <p className="text-zinc-500 text-xs">{PRODUCT.location}</p>
                  </div>

                  {/* Product */}
                  <div className="rounded-xl bg-white/[0.04] border border-white/5 p-4 flex gap-3 items-center">
                    <span className="text-2xl">👜</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-semibold truncate">{PRODUCT.name}</p>
                      <p className="text-zinc-500 text-xs">{PRODUCT.category}</p>
                    </div>
                    <p className="text-white font-black text-base flex-shrink-0">${PRODUCT.price}</p>
                  </div>

                  {/* Fee breakdown */}
                  <div className="rounded-xl bg-black/30 border border-white/5 p-4 space-y-2 text-sm">
                    <div className="flex justify-between text-zinc-400">
                      <span>Item</span>
                      <span className="font-mono">${PRODUCT.price}.00</span>
                    </div>
                    <div className="flex justify-between text-zinc-400">
                      <span>Buyer fee</span>
                      {/* ProofScore 5000 → ~1.5% */}
                      <span className="font-mono text-cyan-400">+$0.75 <span className="text-zinc-600 text-xs">(1.5%)</span></span>
                    </div>
                    <div className="flex justify-between text-red-400/60 line-through text-xs">
                      <span>Seller fee</span>
                      <span className="font-mono">$0.00</span>
                    </div>
                    <div className="border-t border-white/5 pt-2 flex justify-between text-white font-bold">
                      <span>You pay</span>
                      <span className="font-mono">$50.75</span>
                    </div>
                  </div>

                  {/* Buyer ProofScore */}
                  <div className="flex items-center gap-2 rounded-lg bg-cyan-500/[0.06] border border-cyan-500/20 px-3 py-2">
                    <Shield size={12} className="text-cyan-400 flex-shrink-0" />
                    <p className="text-xs text-cyan-300">Buyer fee drops as trust grows — down to 0.25% at max score</p>
                  </div>

                  {/* CTA */}
                  <button
                    onClick={handlePay}
                    disabled={animatingPay || paid}
                    className={`w-full flex items-center justify-center gap-2 rounded-xl font-bold text-sm py-3.5 transition-all ${
                      paid
                        ? 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-300'
                        : 'bg-cyan-500 hover:bg-cyan-400 text-white'
                    }`}
                  >
                    {paid ? (
                      <><Check size={16} /> Payment confirmed</>
                    ) : animatingPay ? (
                      <><RefreshCw size={14} className="animate-spin" /> Processing on-chain…</>
                    ) : (
                      <><Zap size={14} /> Pay $50.75 USDC</>
                    )}
                  </button>

                  {paid && (
                    <m.p
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-center text-xs text-zinc-500"
                    >
                      Transaction confirmed · Redirecting to receipt…
                    </m.p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── STEP 3: SETTLEMENT ── */}
          {activeStep === 'settlement' && (
            <div className="grid gap-5 md:grid-cols-2">
              {/* Receipt */}
              <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-6 space-y-5">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-purple-500/15 flex items-center justify-center">
                    <Receipt size={18} className="text-purple-400" />
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500 font-semibold uppercase tracking-wider">Settlement Receipt</p>
                    <p className="text-white font-bold">Instant · On-chain</p>
                  </div>
                </div>

                <div className="rounded-xl bg-black/30 border border-white/5 p-4 space-y-3 font-mono text-sm">
                  <div className="flex justify-between text-zinc-400">
                    <span>Sale price</span>
                    <span>${PRODUCT.price}.00 USDC</span>
                  </div>
                  <div className="flex justify-between text-red-400/50">
                    <span>Platform fee</span>
                    <span className="line-through">$0.00</span>
                  </div>
                  <div className="flex justify-between text-zinc-400 text-xs">
                    <span className="text-zinc-600">Gas (network)</span>
                    <span className="text-zinc-600">~$0.03</span>
                  </div>
                  <div className="border-t border-white/8 pt-3 flex justify-between text-white font-black text-base">
                    <span>You receive</span>
                    <span className="text-emerald-400">${PRODUCT.price}.00 USDC</span>
                  </div>
                </div>

                <div className="rounded-xl bg-emerald-500/[0.06] border border-emerald-500/20 p-4">
                  <p className="text-xs font-bold text-emerald-400 mb-1">Why $0 seller fee?</p>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    The <code className="text-zinc-300">protocolFeeBps</code> constant is hardcoded to <code className="text-zinc-300">0</code> in the{' '}
                    <code className="text-zinc-300">MerchantPortal</code> contract. No governance vote, no admin key, no future version
                    of VFIDE can change it.
                  </p>
                </div>

                <div className="space-y-2 text-xs text-zinc-400">
                  {[
                    'Funds arrive in your wallet within 1 block',
                    'No chargeback risk — transactions are final',
                    'No account freeze possible — no custodian',
                  ].map((item) => (
                    <div key={item} className="flex items-center gap-2">
                      <Check size={12} className="text-emerald-400 flex-shrink-0" />
                      {item}
                    </div>
                  ))}
                </div>
              </div>

              {/* Annual savings */}
              <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-6 space-y-5">
                <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">What you save vs. traditional platforms</p>

                <div className="space-y-3">
                  {[
                    { name: 'vs. PayPal',   monthlySales: 5000, feeRate: 0.0349 },
                    { name: 'vs. Stripe',   monthlySales: 5000, feeRate: 0.029 },
                    { name: 'vs. Etsy',     monthlySales: 5000, feeRate: 0.065 },
                  ].map((c) => {
                    const monthly = c.monthlySales * c.feeRate;
                    const annual = monthly * 12;
                    return (
                      <div key={c.name} className="rounded-xl bg-white/[0.03] border border-white/5 p-4">
                        <div className="flex items-start justify-between mb-1">
                          <span className="text-sm font-semibold text-zinc-300">{c.name}</span>
                          <div className="text-right">
                            <p className="text-emerald-400 font-black text-base">${annual.toLocaleString()} saved/yr</p>
                            <p className="text-zinc-600 text-xs">${monthly.toFixed(0)}/mo</p>
                          </div>
                        </div>
                        <p className="text-[11px] text-zinc-600">On $5,000/month in sales at {(c.feeRate * 100).toFixed(2)}% fee</p>
                      </div>
                    );
                  })}
                </div>

                <button
                  onClick={reset}
                  className="w-full flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] transition-colors text-zinc-300 text-sm font-semibold py-2.5"
                >
                  <RefreshCw size={13} /> Run demo again
                </button>
              </div>
            </div>
          )}
        </m.div>
      </AnimatePresence>
    </div>
  );
}

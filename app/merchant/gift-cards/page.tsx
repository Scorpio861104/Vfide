'use client';

export const dynamic = 'force-dynamic';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Gift, Plus, Copy, Check, MessageCircle, Clock, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAccount } from 'wagmi';
import { Footer } from '@/components/layout/Footer';
import { useLocale } from '@/lib/locale/LocaleProvider';

interface GiftCardRecord {
  id: string;
  code: string;
  originalAmount: number;
  remainingAmount: number;
  currency: string;
  recipientName: string | null;
  recipientMessage: string | null;
  status: string;
  purchasedAt: number | null;
  expiresAt: number | null;
}

export default function MerchantGiftCardsPage() {
  const { address } = useAccount();
  const { formatCurrency, formatDate } = useLocale();
  const [cards, setCards] = useState<GiftCardRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);

  const loadCards = useCallback(async () => {
    if (!address) return;

    try {
      const response = await fetch(`/api/merchant/gift-cards?merchant=${address}`);
      const data = await response.json().catch(() => ({ giftCards: [] }));
      if (!response.ok) {
        throw new Error(data.error || 'Failed to load gift cards');
      }

      setCards(Array.isArray(data.giftCards) ? data.giftCards : []);
      setError(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load gift cards');
    } finally {
      setLoading(false);
    }
  }, [address]);

  useEffect(() => {
    void loadCards();
  }, [loadCards]);

  const handleCreate = useCallback(async () => {
    if (!address || !amount) return;

    try {
      const response = await fetch('/api/merchant/gift-cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          merchantAddress: address,
          amount: Number.parseFloat(amount),
          recipientName: recipientName || undefined,
          recipientMessage: message || undefined,
        }),
      });

      const data = await response.json().catch(() => ({ success: false }));
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create gift card');
      }

      setShowCreate(false);
      setAmount('');
      setRecipientName('');
      setMessage('');
      setError(null);
      await loadCards();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'Failed to create gift card');
    }
  }, [address, amount, recipientName, message, loadCards]);

  const copyCode = useCallback(async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      window.setTimeout(() => setCopiedCode(null), 1500);
    } catch {
      setCopiedCode(null);
    }
  }, []);

  const shareGiftCard = useCallback((card: GiftCardRecord) => {
    const giftMessage = `${card.recipientName ? `Hi ${card.recipientName}! ` : ''}You received a ${formatCurrency(card.originalAmount, card.currency)} VFIDE gift card. Code: ${card.code}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(giftMessage)}`, '_blank');
  }, [formatCurrency]);

  return (
    <>
      <div className="min-h-screen bg-zinc-950 pt-20 text-white">
        <section className="py-16">
          <div className="container mx-auto max-w-5xl px-4">
            <Link href="/merchant" className="mb-6 inline-flex items-center gap-2 text-cyan-300 hover:text-cyan-200">
              <ArrowLeft size={16} /> Back to Merchant Hub
            </Link>

            <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-purple-500/30 bg-purple-500/10 px-3 py-1 text-sm text-purple-300">
                  <Gift size={14} /> Gift cards & store credit
                </div>
                <h1 className="text-4xl font-bold">Launch merchant gift cards</h1>
                <p className="mt-3 max-w-3xl text-gray-400">
                  Sell prepaid store credit, share codes instantly, and let buyers redeem them during checkout.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowCreate((current) => !current)}
                className="inline-flex items-center gap-2 rounded-xl border border-purple-500/30 bg-purple-500/10 px-4 py-2 text-sm font-semibold text-purple-200"
              >
                <Plus size={16} /> Create gift card
              </button>
            </div>

            {error && <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</div>}

            <AnimatePresence>
              {showCreate && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mb-6 overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-5">
                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="text-sm text-gray-300">
                      Amount
                      <input
                        value={amount}
                        onChange={(event) =>  setAmount(event.target.value)}
                        type="number"
                        min="0"
                        step="0.01"
                       
                        className="mt-1 w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-white"
                      />
                    </label>
                    <label className="text-sm text-gray-300">
                      Recipient name
                      <input
                        value={recipientName}
                        onChange={(event) =>  setRecipientName(event.target.value)}
                        type="text"
                       
                        className="mt-1 w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-white"
                      />
                    </label>
                  </div>
                  <label className="mt-4 block text-sm text-gray-300">
                    Message
                    <textarea
                      value={message}
                      onChange={(event) =>  setMessage(event.target.value)}
                      rows={3}
                     
                      className="mt-1 w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-white"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => void handleCreate()}
                    disabled={!amount || Number.parseFloat(amount) <= 0}
                    className="mt-4 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
                  >
                    Save gift card
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {!address ? (
              <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-6 text-gray-400">
                Connect the merchant wallet to create and manage gift cards.
              </div>
            ) : loading ? (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-gray-400">Loading gift cards…</div>
            ) : cards.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-6 text-gray-400">
                No gift cards yet. Create your first prepaid store-credit code for repeat buyers.
              </div>
            ) : (
              <div className="space-y-3">
                {cards.map((card) => (
                  <div key={card.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <code className="rounded-lg border border-purple-500/30 bg-purple-500/10 px-3 py-1.5 text-sm font-semibold text-purple-200">{card.code}</code>
                        <div>
                          <div className="font-semibold text-white">{formatCurrency(card.remainingAmount, card.currency)}</div>
                          {card.remainingAmount !== card.originalAmount && (
                            <div className="text-xs text-gray-500">Originally {formatCurrency(card.originalAmount, card.currency)}</div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button type="button" onClick={() => void copyCode(card.code)} className="rounded-lg border border-white/10 bg-black/20 p-2 text-gray-300">
                          {copiedCode === card.code ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                        </button>
                        {card.status === 'active' && (
                          <button type="button" onClick={() => shareGiftCard(card)} className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-2 text-emerald-300">
                            <MessageCircle size={14} />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-gray-400">
                      <span className="rounded-full bg-white/5 px-2 py-1 capitalize">{card.status}</span>
                      {card.recipientName && <span>For: {card.recipientName}</span>}
                      {card.purchasedAt && <span className="inline-flex items-center gap-1"><Clock size={12} /> {formatDate(card.purchasedAt, 'medium')}</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
      <Footer />
    </>
  );
}

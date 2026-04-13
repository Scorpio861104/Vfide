'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Heart } from 'lucide-react';
import { useAccount } from 'wagmi';
import { Footer } from '@/components/layout/Footer';
import { LoyaltyProgram, type LoyaltyConfig } from '@/components/loyalty/LoyaltyProgram';

const DEFAULT_CONFIG: LoyaltyConfig = {
  enabled: true,
  programName: 'Coffee Club',
  tiers: [],
  pointsPerDollar: 1,
  redeemThreshold: 10,
  redeemValue: 1,
};

export default function MerchantLoyaltyPage() {
  const { address } = useAccount();
  const [config, setConfig] = useState<LoyaltyConfig>(DEFAULT_CONFIG);
  const [members, setMembers] = useState(0);
  const [rewardDescription, setRewardDescription] = useState('Free coffee');
  const [rewardType, setRewardType] = useState<'free_item' | 'percentage_discount' | 'fixed_discount'>('free_item');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const loadProgram = useCallback(async () => {
    if (!address) return;

    try {
      const response = await fetch('/api/merchant/loyalty');
      const data = await response.json().catch(() => ({ program: null, members: [] }));
      if (!response.ok) {
        throw new Error(data.error || 'Failed to load loyalty program');
      }

      if (data.program) {
        setConfig({
          enabled: Boolean(data.program.active),
          programName: String(data.program.name || 'Rewards'),
          tiers: [],
          pointsPerDollar: Number(data.program.pointsPerUnit ?? 1),
          redeemThreshold: Number(data.program.stampsRequired ?? 10),
          redeemValue: Number(data.program.rewardValue ?? 1),
        });
        setRewardDescription(String(data.program.rewardDescription || 'Free reward'));
        setRewardType(data.program.rewardType || 'free_item');
      }
      setMembers(Array.isArray(data.members) ? data.members.length : 0);
      setError(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load loyalty program');
    }
  }, [address]);

  useEffect(() => {
    void loadProgram();
  }, [loadProgram]);

  const previewConfig = useMemo(() => ({
    ...config,
    tiers: config.tiers.length > 0 ? config.tiers : [
      { id: 'stamp', name: 'Stamp Card', minPurchases: 1, discountPercent: rewardType === 'percentage_discount' ? config.redeemValue : 0, perks: [rewardDescription], color: 'pink' },
    ],
  }), [config, rewardDescription, rewardType]);

  const handleSave = useCallback(async () => {
    try {
      setSaving(true);
      const response = await fetch('/api/merchant/loyalty', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: config.programName,
          type: 'stamp',
          stampsRequired: config.redeemThreshold,
          pointsPerUnit: config.pointsPerDollar,
          rewardDescription,
          rewardType,
          rewardValue: config.redeemValue,
          active: config.enabled,
        }),
      });
      const data = await response.json().catch(() => ({ success: false }));
      if (!response.ok) {
        throw new Error(data.error || 'Failed to save loyalty program');
      }
      setError(null);
      await loadProgram();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Failed to save loyalty program');
    } finally {
      setSaving(false);
    }
  }, [config, loadProgram, rewardDescription, rewardType]);

  return (
    <>
      <div className="min-h-screen bg-zinc-950 pt-20 text-white">
        <section className="py-16">
          <div className="container mx-auto max-w-6xl px-4">
            <Link href="/merchant" className="mb-6 inline-flex items-center gap-2 text-cyan-300 hover:text-cyan-200">
              <ArrowLeft size={16} /> Back to Merchant Hub
            </Link>

            <div className="mb-8">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-pink-500/30 bg-pink-500/10 px-3 py-1 text-sm text-pink-300">
                <Heart size={14} /> Loyalty stamp cards
              </div>
              <h1 className="text-4xl font-bold">Bring buyers back with simple rewards</h1>
              <p className="mt-3 max-w-3xl text-gray-400">
                Configure a stamp-card style loyalty program and let checkout show each customer how close they are to the next reward.
              </p>
            </div>

            {error && <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</div>}

            {!address ? (
              <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-6 text-gray-400">
                Connect the merchant wallet to configure loyalty rewards.
              </div>
            ) : (
              <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-5 space-y-4">
                  <h2 className="text-xl font-bold">Program settings</h2>
                  <input
                    type="text"
                    value={config.programName}
                    onChange={(event) =>  setConfig((current) => ({ ...current, programName: event.target.value }))}
                   
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white focus:outline-none"
                  />
                  <div className="grid gap-3 sm:grid-cols-2">
                    <input
                      type="number"
                      min="1"
                      value={config.redeemThreshold}
                      onChange={(event) =>  setConfig((current) => ({ ...current, redeemThreshold: Number(event.target.value) || 10 }))}
                     
                      className="rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white focus:outline-none"
                    />
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={config.redeemValue}
                      onChange={(event) =>  setConfig((current) => ({ ...current, redeemValue: Number(event.target.value) || 0 }))}
                     
                      className="rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white focus:outline-none"
                    />
                  </div>
                  <textarea
                    value={rewardDescription}
                    onChange={(event) =>  setRewardDescription(event.target.value)}
                    rows={3}
                   
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white focus:outline-none"
                  />
                  <select
                    value={rewardType}
                    onChange={(event) =>  setRewardType(event.target.value as 'free_item' | 'percentage_discount' | 'fixed_discount')}
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white"
                  >
                    <option value="free_item">Free item</option>
                    <option value="percentage_discount">Percentage discount</option>
                    <option value="fixed_discount">Fixed discount</option>
                  </select>
                  <label className="flex items-center gap-2 text-sm text-gray-300">
                    <input
                      type="checkbox"
                      checked={config.enabled}
                      onChange={(event) =>  setConfig((current) => ({ ...current, enabled: event.target.checked }))}
                    />
                    Loyalty program active
                  </label>
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={saving}
                    className="rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
                  >
                    {saving ? 'Saving…' : 'Save loyalty program'}
                  </button>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                  <LoyaltyProgram config={previewConfig} memberCount={members} />
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
      <Footer />
    </>
  );
}

'use client';

export const dynamic = 'force-dynamic';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Tag, ArrowLeft } from 'lucide-react';
import { useAccount } from 'wagmi';
import { Footer } from '@/components/layout/Footer';
import { DiscountManager, type Discount } from '@/components/discounts';

interface CouponResponse {
  id: string;
  code: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  minOrderAmount?: number | null;
  maxUses?: number | null;
  uses: number;
  validUntil?: number | null;
  active: boolean;
}

function toDiscount(coupon: CouponResponse): Discount {
  return {
    id: coupon.id,
    code: coupon.code,
    type: coupon.discountType === 'percentage' ? 'percent' : 'fixed',
    value: coupon.discountValue,
    minOrder: Number(coupon.minOrderAmount ?? 0),
    maxUses: Number(coupon.maxUses ?? 0),
    usedCount: Number(coupon.uses ?? 0),
    expiresAt: Number(coupon.validUntil ?? Date.now() + 30 * 86400000),
    active: Boolean(coupon.active),
  };
}

export default function MerchantCouponsPage() {
  const { address } = useAccount();
  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [error, setError] = useState<string | null>(null);

  const loadCoupons = useCallback(async () => {
    if (!address) return;

    try {
      const response = await fetch('/api/merchant/coupons');
      const data = await response.json().catch(() => ({ coupons: [] }));
      if (!response.ok) {
        throw new Error(data.error || 'Failed to load coupons');
      }

      setDiscounts(Array.isArray(data.coupons) ? data.coupons.map(toDiscount) : []);
      setError(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load coupons');
    }
  }, [address]);

  useEffect(() => {
    void loadCoupons();
  }, [loadCoupons]);

  const handleCreate = useCallback(async (discount: Omit<Discount, 'id' | 'usedCount'>) => {
    try {
      const response = await fetch('/api/merchant/coupons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: discount.code,
          discountType: discount.type,
          discountValue: discount.value,
          minOrderAmount: discount.minOrder,
          maxUses: discount.maxUses || undefined,
          validUntil: Number.isFinite(discount.expiresAt) ? new Date(discount.expiresAt).toISOString() : undefined,
        }),
      });
      const data = await response.json().catch(() => ({ coupon: null }));
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create coupon');
      }
      setDiscounts((current) => [toDiscount(data.coupon as CouponResponse), ...current]);
      setError(null);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Failed to create coupon');
    }
  }, []);

  const handleToggle = useCallback(async (id: string) => {
    const current = discounts.find((discount) => discount.id === id);
    if (!current) return;

    try {
      const response = await fetch('/api/merchant/coupons', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, active: !current.active }),
      });
      const data = await response.json().catch(() => ({ coupon: null }));
      if (!response.ok) {
        throw new Error(data.error || 'Failed to update coupon');
      }
      setDiscounts((existing) => existing.map((discount) => (
        discount.id === id ? toDiscount(data.coupon as CouponResponse) : discount
      )));
      setError(null);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Failed to update coupon');
    }
  }, [discounts]);

  const handleDelete = useCallback(async (id: string) => {
    try {
      const response = await fetch(`/api/merchant/coupons?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
      const data = await response.json().catch(() => ({ success: false }));
      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete coupon');
      }
      setDiscounts((existing) => existing.filter((discount) => discount.id !== id));
      setError(null);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Failed to delete coupon');
    }
  }, []);

  return (
    <>
      <div className="min-h-screen bg-zinc-950 md:pt-[3.5rem] text-white relative">
        {/* Ambient orbs */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -left-20 w-[600px] h-[600px] rounded-full opacity-[0.07]"
            style={{ background: 'radial-gradient(circle, #f59e0b 0%, transparent 70%)' }} />
          <div className="absolute bottom-0 -right-24 w-[500px] h-[500px] rounded-full opacity-[0.05]"
            style={{ background: 'radial-gradient(circle, #10b981 0%, transparent 70%)' }} />
        </div>
        <div className="grid-pattern pointer-events-none absolute inset-0 opacity-20" />
        <section className="py-16">
          <div className="container mx-auto max-w-6xl px-4">
            <Link href="/merchant" className="mb-6 inline-flex items-center gap-2 text-accent hover:text-accent">
              <ArrowLeft size={16} /> Back to Merchant Hub
            </Link>

            <div className="mb-8">
              <div className="badge-live mb-3">
                <Tag size={14} /> Coupon and promo code engine
              </div>
              <h1 className="text-4xl font-black tracking-tight">Create merchant promo codes</h1>
              <p className="mt-3 max-w-3xl text-gray-400">
                Launch campaigns like `WELCOME10` or `FRIENDS20`, track usage, and apply discounts instantly at checkout.
              </p>
            </div>

            {error && <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</div>}

            {!address ? (
              <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-6 text-gray-400">
                Connect the merchant wallet to manage coupon campaigns.
              </div>
            ) : (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <DiscountManager discounts={discounts} onCreate={handleCreate} onToggle={handleToggle} onDelete={handleDelete} />
              </div>
            )}
          </div>
        </section>
      </div>
      <Footer />
    </>
  );
}

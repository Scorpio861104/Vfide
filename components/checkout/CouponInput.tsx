'use client';

import { useState, type ChangeEvent } from 'react';
import { Button } from '@/components/ui/button';

interface CouponInputProps {
  onApply: (code: string) => Promise<void> | void;
  isApplying?: boolean;
  error?: string | null;
  appliedCode?: string | null;
}

export default function CouponInput({ onApply, isApplying = false, error, appliedCode }: CouponInputProps) {
  const [couponCode, setCouponCode] = useState('');

  return (
    <div className="space-y-2 rounded-lg border p-3">
      <label htmlFor="coupon-code" className="text-sm font-medium">Coupon code</label>
      <div className="flex gap-2">
        <input
          id="coupon-code"
          value={couponCode}
          onChange={(e: ChangeEvent<HTMLInputElement>) => setCouponCode(e.target.value.toUpperCase())}
         
          disabled={isApplying}
          className="flex-1 rounded-md border bg-background px-3 py-2 text-sm"
        />
        <Button
          type="button"
          variant="outline"
          disabled={!couponCode.trim() || isApplying}
          onClick={() => onApply(couponCode.trim())}
        >
          {isApplying ? 'Applying…' : 'Apply'}
        </Button>
      </div>
      {appliedCode ? <p className="text-xs text-emerald-600">Applied: {appliedCode}</p> : null}
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </div>
  );
}

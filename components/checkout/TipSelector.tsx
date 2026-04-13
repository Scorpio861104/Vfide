'use client';

import { useEffect, useMemo, useState, type ChangeEvent } from 'react';
import { Button } from '@/components/ui/button';

interface TipSelectorProps {
  subtotal: number;
  currency?: string;
  onChange: (amount: number) => void;
  defaultPercentages?: number[];
}

export default function TipSelector({
  subtotal,
  currency = 'USD',
  onChange,
  defaultPercentages = [0, 5, 10, 15],
}: TipSelectorProps) {
  const [selected, setSelected] = useState<number>(0);
  const [custom, setCustom] = useState('');

  const tipAmount = useMemo(() => {
    if (selected === -1) {
      const parsed = Number(custom);
      return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
    }
    return (subtotal * selected) / 100;
  }, [custom, selected, subtotal]);

  useEffect(() => {
    onChange(tipAmount);
  }, [onChange, tipAmount]);

  return (
    <div className="space-y-3 rounded-lg border p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium">Add a tip</p>
        <span className="text-xs text-muted-foreground">{currency} {tipAmount.toFixed(2)}</span>
      </div>

      <div className="flex flex-wrap gap-2">
        {defaultPercentages.map((percent) => (
          <Button
            key={percent}
            type="button"
            variant={selected === percent ? 'default' : 'outline'}
            onClick={() => setSelected(percent)}
          >
            {percent === 0 ? 'No tip' : `${percent}%`}
          </Button>
        ))}
        <Button type="button" variant={selected === -1 ? 'default' : 'outline'} onClick={() => setSelected(-1)}>
          Custom
        </Button>
      </div>

      {selected === -1 ? (
        <input
          type="number"
          min="0"
          step="0.01"
          value={custom}
          onChange={(e: ChangeEvent<HTMLInputElement>) => setCustom(e.target.value)}
         
          className="w-full rounded-md border bg-background px-3 py-2 text-sm"
        />
      ) : null}
    </div>
  );
}

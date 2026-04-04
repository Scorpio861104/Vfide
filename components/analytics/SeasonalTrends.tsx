'use client';

import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export interface SeasonalTrendPoint {
  label: string;
  value: number;
}

interface SeasonalTrendsProps {
  title?: string;
  data?: SeasonalTrendPoint[];
  merchantAddress?: string | null;
  period?: '7d' | '30d' | '90d';
}

type TopProduct = {
  name: string;
  revenue: number;
  count: number;
};

const DEFAULT_DATA: SeasonalTrendPoint[] = [
  { label: 'Jan', value: 38 },
  { label: 'Feb', value: 42 },
  { label: 'Mar', value: 51 },
  { label: 'Apr', value: 56 },
  { label: 'May', value: 61 },
  { label: 'Jun', value: 59 },
];

function formatLabel(date: string, index: number): string {
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) {
    return `Day ${index + 1}`;
  }

  return parsed.toLocaleDateString('en-US', { weekday: 'short' });
}

export default function SeasonalTrends({
  title = 'Seasonal trends',
  data = DEFAULT_DATA,
  merchantAddress,
  period = '30d',
}: SeasonalTrendsProps) {
  const [trendData, setTrendData] = useState<SeasonalTrendPoint[]>(data);
  const [revenueChange, setRevenueChange] = useState<number | null>(null);
  const [topProduct, setTopProduct] = useState<TopProduct | null>(null);

  useEffect(() => {
    setTrendData(data);
  }, [data]);

  useEffect(() => {
    if (!merchantAddress || typeof fetch !== 'function') {
      return;
    }

    let cancelled = false;

    const loadAnalytics = async () => {
      try {
        const response = await fetch(`/api/merchant/analytics?address=${merchantAddress}&period=${period}`);
        const payload = await response.json().catch(() => ({} as Record<string, unknown>));

        if (!response.ok || cancelled) {
          return;
        }

        const livePoints = Array.isArray((payload as { dailyRevenue?: unknown[] }).dailyRevenue)
          ? ((payload as { dailyRevenue?: Array<{ date?: string; amount?: number }> }).dailyRevenue ?? [])
              .map((point, index) => ({
                label: formatLabel(String(point?.date ?? ''), index),
                value: Number(point?.amount ?? 0),
              }))
              .filter((point) => Number.isFinite(point.value))
          : [];

        if (livePoints.length > 0) {
          setTrendData(livePoints);
        }

        const nextRevenueChange = Number((payload as { revenueChange?: number | string }).revenueChange ?? NaN);
        setRevenueChange(Number.isFinite(nextRevenueChange) ? nextRevenueChange : null);

        const firstTopProduct = Array.isArray((payload as { topProducts?: unknown[] }).topProducts)
          ? ((payload as { topProducts?: Array<{ name?: string; revenue?: number; count?: number }> }).topProducts ?? [])[0]
          : undefined;

        if (firstTopProduct?.name) {
          setTopProduct({
            name: String(firstTopProduct.name),
            revenue: Number(firstTopProduct.revenue ?? 0),
            count: Number(firstTopProduct.count ?? 0),
          });
        }
      } catch {
        if (!cancelled) {
          setRevenueChange(null);
        }
      }
    };

    void loadAnalytics();

    return () => {
      cancelled = true;
    };
  }, [merchantAddress, period]);

  const maxValue = Math.max(...trendData.map((item) => item.value), 1);
  const restockMessage = useMemo(() => {
    if (!topProduct) {
      return 'Live product demand will surface here once merchant orders are flowing.';
    }

    return `${topProduct.name} is leading demand with ${topProduct.count} units sold and ${topProduct.revenue.toFixed(0)} in revenue.`;
  }, [topProduct]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {revenueChange !== null ? (
          <div className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-300">
            <TrendingUp size={14} /> {revenueChange.toFixed(1)}% vs prior period
          </div>
        ) : null}
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="space-y-3">
            {trendData.map((item) => (
              <div key={item.label} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span>{item.label}</span>
                  <span className="text-muted-foreground">{item.value}</span>
                </div>
                <div className="h-2 rounded-full bg-muted">
                  <div
                    className="h-2 rounded-full bg-primary"
                    style={{ width: `${(item.value / maxValue) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-amber-700 dark:text-amber-300">
              <AlertTriangle size={14} /> Restock alerts
            </div>
            {topProduct ? (
              <div className="mt-2 space-y-1">
                <div className="text-sm font-medium text-foreground">{topProduct.name}</div>
                <p className="text-xs text-muted-foreground">{restockMessage}</p>
              </div>
            ) : (
              <p className="mt-2 text-xs text-muted-foreground">{restockMessage}</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

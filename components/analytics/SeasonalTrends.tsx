'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export interface SeasonalTrendPoint {
  label: string;
  value: number;
}

interface SeasonalTrendsProps {
  title?: string;
  data?: SeasonalTrendPoint[];
}

const DEFAULT_DATA: SeasonalTrendPoint[] = [
  { label: 'Jan', value: 38 },
  { label: 'Feb', value: 42 },
  { label: 'Mar', value: 51 },
  { label: 'Apr', value: 56 },
  { label: 'May', value: 61 },
  { label: 'Jun', value: 59 },
];

export default function SeasonalTrends({ title = 'Seasonal trends', data = DEFAULT_DATA }: SeasonalTrendsProps) {
  const maxValue = Math.max(...data.map((item) => item.value), 1);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {data.map((item) => (
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
      </CardContent>
    </Card>
  );
}

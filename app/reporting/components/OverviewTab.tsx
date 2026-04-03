'use client';

interface OverviewTabProps {
  summaryStats: {
    totalReports: number;
    totalDashboards: number;
    reportsUpdatedToday: number;
    totalMetrics: number;
    totalCharts: number;
  };
}

export function OverviewTab({ summaryStats }: OverviewTabProps) {
  const cards = [
    { label: 'Total Reports', value: summaryStats.totalReports },
    { label: 'Total Dashboards', value: summaryStats.totalDashboards },
    { label: 'Updated Today', value: summaryStats.reportsUpdatedToday },
    { label: 'Signal coverage across every dashboard', value: summaryStats.totalMetrics + summaryStats.totalCharts },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <div key={card.label} className="rounded-2xl border border-white/10 bg-white/3 p-6">
            <p className="mb-2 text-sm text-gray-400">{card.label}</p>
            <p className="text-3xl font-bold text-white">{card.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

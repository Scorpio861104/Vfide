'use client';

interface DashboardsTabProps {
  dashboards: any[];
}

export function DashboardsTab({ dashboards }: DashboardsTabProps) {
  return (
    <div className="space-y-6">
      {dashboards.length > 0 ? (
        dashboards.map((dashboard, index) => (
          <div key={dashboard.id ?? `${dashboard.name}-${index}`} className="rounded-2xl border border-white/10 bg-white/3 p-6">
            <h3 className="mb-2 text-xl font-bold text-white">{dashboard.name}</h3>
            <p className="text-gray-400">{dashboard.description || 'Dashboard overview'}</p>
            <p className="mt-3 text-sm text-cyan-300">Linked reports: {(dashboard.reports ?? []).length}</p>
          </div>
        ))
      ) : (
        <div className="rounded-2xl border border-dashed border-white/10 bg-white/3 p-6 text-gray-400">
          No dashboards configured yet.
        </div>
      )}
    </div>
  );
}

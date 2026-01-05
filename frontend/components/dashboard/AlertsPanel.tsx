const alerts = [
  { title: 'Treasury threshold reached', detail: 'Rebalance recommended within 24h', severity: 'warning' },
  { title: 'New governance proposal', detail: 'Review Proposal #42 before Friday', severity: 'info' },
  { title: 'New device sign-in', detail: 'Confirm login from Chrome on macOS', severity: 'critical' },
];

function badgeStyles(severity: string) {
  switch (severity) {
    case 'critical':
      return 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-200';
    case 'warning':
      return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-200';
    default:
      return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-200';
  }
}

export function AlertsPanel({ limit = alerts.length }: { limit?: number }) {
  const items = alerts.slice(0, limit);

  return (
    <div className="space-y-3">
      {items.map((alert, idx) => (
        <div
          key={idx}
          className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-3 shadow-sm"
        >
          <div className="flex items-center justify-between mb-1">
            <p className="text-sm font-semibold text-gray-900 dark:text-white">{alert.title}</p>
            <span className={`text-xs px-2 py-1 rounded-full ${badgeStyles(alert.severity)}`}>
              {alert.severity.toUpperCase()}
            </span>
          </div>
          <p className="text-xs text-gray-600 dark:text-gray-400">{alert.detail}</p>
        </div>
      ))}
    </div>
  );
}

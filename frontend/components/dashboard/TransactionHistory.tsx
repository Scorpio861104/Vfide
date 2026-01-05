const transactions = [
  { id: 'TX-001', type: 'Inbound', amount: '+2,500 VFIDE', date: 'Today', status: 'Settled' },
  { id: 'TX-002', type: 'Outbound', amount: '-1,200 VFIDE', date: 'Yesterday', status: 'Pending' },
  { id: 'TX-003', type: 'Inbound', amount: '+4,800 VFIDE', date: '2d ago', status: 'Settled' },
];

export function TransactionHistory() {
  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 md:p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white">Recent Transactions</h3>
        <span className="text-xs text-gray-500 dark:text-gray-400">Last 72h</span>
      </div>
      <div className="divide-y divide-gray-200 dark:divide-gray-700">
        {transactions.map((tx) => (
          <div key={tx.id} className="py-3 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-900 dark:text-white">{tx.id}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{tx.date}</p>
            </div>
            <div className="text-right">
              <p className={`text-sm font-semibold ${tx.type === 'Inbound' ? 'text-emerald-500' : 'text-rose-500'}`}>{tx.amount}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{tx.status}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

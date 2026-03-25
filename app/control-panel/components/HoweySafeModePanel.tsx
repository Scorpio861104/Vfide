'use client';

export function HoweySafeModePanel() {
  const contracts = [
    { name: 'DutyDistributor', icon: '⚖️', description: 'Governance participation tracking — no rewards, no profit distribution' },
    { name: 'CouncilSalary', icon: '👥', description: 'Council employment compensation in stablecoins — not investment returns' },
    { name: 'CouncilManager', icon: '🏛️', description: 'Council oversight — operational costs only, not profit-sharing' },
    { name: 'LiquidityIncentives', icon: '💧', description: 'LP participation tracking only — no yield, no profit from providing liquidity' },
    { name: 'VFIDEPresale', icon: '🚀', description: 'Lock bonuses and referral incentives permanently removed' },
    { name: 'EcosystemVault — Headhunter', icon: '🎯', description: 'Fixed stablecoin service fees for verified referral work — rank/percentage claims permanently disabled' },
    { name: 'EcosystemVault — Top Merchant', icon: '🏪', description: 'Fixed stablecoin service fees for verified merchant transaction activity — rank/percentage claims permanently disabled' },
    { name: 'EcosystemVault — DAO Payments', icon: '🏛️', description: 'Operations and treasury disbursements in stablecoin — not distributions to token holders' },
  ];

  return (
    <div className="space-y-6">
      <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10">
        <h2 className="text-2xl font-bold text-white mb-4">Howey Compliance — Hardcoded</h2>
        <div className="bg-green-500/20 border border-green-500/50 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-2">
            <span className="text-2xl">✅</span>
            <div>
              <div className="text-white font-bold">All Systems Permanently Compliant</div>
              <div className="text-sm text-slate-300">
                Howey-safe mode is a compile-time constant in every ecosystem contract.
                There is no runtime toggle — it cannot be disabled.
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          {contracts.map((contract) => (
            <div
              key={contract.name}
              className="p-4 rounded-lg border bg-green-500/10 border-green-500/30 flex items-center gap-3"
            >
              <span className="text-2xl">{contract.icon}</span>
              <div>
                <div className="text-white font-medium">{contract.name}</div>
                <div className="text-slate-400 text-sm">{contract.description}</div>
              </div>
              <span className="ml-auto text-sm font-medium text-green-400 whitespace-nowrap">HARDCODED ✓</span>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-blue-500/20 border border-blue-500/50 rounded-xl p-6">
        <h3 className="text-white font-bold mb-2">ℹ️ Howey Test Analysis</h3>
        <p className="text-slate-300 text-sm mb-4">
          VFIDE passes the Howey Test — it is <strong className="text-white">not</strong> an investment contract.
          Compliance is structural and permanent, enforced at the Solidity source level:
        </p>
        <ul className="text-slate-300 text-sm space-y-2">
          <li>✓ <strong className="text-slate-200">No expectation of profits</strong> — no staking rewards, no yield, no APY/APR</li>
          <li>✓ <strong className="text-slate-200">No passive income</strong> — token holders receive nothing from team efforts</li>
          <li>✓ <strong className="text-slate-200">Utility only</strong> — governance voting rights and protocol access fees</li>
          <li>✓ <strong className="text-slate-200">Council compensation</strong> — paid in stablecoins as employment, not token distributions</li>
          <li>✓ <strong className="text-slate-200">Headhunter &amp; merchant service fees</strong> — fixed stablecoin compensation for verified work performed; rank/percentage-based claims permanently disabled on-chain</li>
          <li>✓ <strong className="text-slate-200">DAO payments</strong> — operational disbursements in stablecoin, never to passive token holders</li>
          <li>✓ <strong className="text-slate-200">Fee distribution</strong> — 40% burned, 30% DAO treasury, 20% operations, 10% Sanctum (never paid to holders)</li>
        </ul>
      </div>
    </div>
  );
}

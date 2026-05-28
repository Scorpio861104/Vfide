'use client';

/**
 * CompliancePanel — read-only display of hardcoded Howey-safe architecture.
 *
 * Howey-safe mode is a compile-time constant in every ecosystem contract.
 * There is NO runtime toggle. This panel is informational only.
 *
 * Fee splits (for reference only — not adjustable here):
 *   ProofScoreBurnRouter.computeFees: 40% burn, 10% Sanctum, 50% ecosystem
 *   FeeDistributor default split:     50% DAO payroll / 30% merchants / 20% headhunters of ecosystem
 *   Composite of total fee:           40 / 10 / 25 / 15 / 10
 */

export function HoweySafeModePanel() {
  const contracts = [
    {
      name: 'CouncilSalary',
      icon: '👥',
      description: 'Council employment compensation in stablecoins — not investment returns. Daily ProofScore checks and removal voting enforced on-chain.',
    },
    {
      name: 'LiquidityIncentives',
      icon: '💧',
      description: 'LP participation tracking only — no yield, no profit distribution, no APY/APR of any kind.',
    },
    {
      name: 'EcosystemVault — Headhunter',
      icon: '🎯',
      description: 'Fixed stablecoin service fees for verified referral work — rank/percentage claims permanently disabled on-chain.',
    },
    {
      name: 'EcosystemVault — Top Merchant',
      icon: '🏪',
      description: 'Fixed stablecoin service fees for verified merchant transaction activity — rank/percentage claims permanently disabled on-chain.',
    },
    {
      name: 'EcosystemVault — DAO Payments',
      icon: '🏛️',
      description: 'Operational disbursements in stablecoin — not distributions to token holders.',
    },
    {
      name: 'ProofScoreBurnRouter',
      icon: '🔥',
      description: 'Fee split is hardcoded in computeFees(): 40% burn, 10% Sanctum, 50% to FeeDistributor. No governance parameter can change these ratios.',
    },
    {
      name: 'FeeDistributor',
      icon: '📊',
      description: 'Distributes the 50% ecosystem share: DAO payroll 50%, merchants 30%, headhunters 20%. DAO-governed with 72-hour timelock.',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10">
        <h2 className="text-2xl font-bold text-white mb-4">Protocol Compliance — Non-Adjustable</h2>
        <div className="bg-green-500/20 border border-green-500/50 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-2">
            <span className="text-2xl">✅</span>
            <div>
              <div className="text-white font-bold">All Systems Permanently Compliant</div>
              <div className="text-sm text-slate-300">
                Howey-safe behaviour is a compile-time constant in every ecosystem contract.
                There is no runtime toggle — it cannot be disabled by any address, including the deployer.
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
        <h3 className="text-white font-bold mb-2">ℹ️ Howey Test — Structural Compliance</h3>
        <p className="text-slate-300 text-sm mb-4">
          VFIDE is not an investment contract. Compliance is structural and permanent,
          enforced at the Solidity source level — not a policy or a flag.
        </p>
        <ul className="text-slate-300 text-sm space-y-2">
          <li>✓ <strong className="text-slate-200">No expectation of profits</strong> — no staking rewards, no yield, no APY/APR anywhere in the protocol</li>
          <li>✓ <strong className="text-slate-200">No passive income</strong> — token holders receive nothing from team or protocol efforts</li>
          <li>✓ <strong className="text-slate-200">Utility only</strong> — governance voting rights and protocol access fees; burn fee reduces supply</li>
          <li>✓ <strong className="text-slate-200">Council compensation</strong> — paid in stablecoins as employment via CouncilSalary; never in VFIDE distributions</li>
          <li>✓ <strong className="text-slate-200">Merchant and headhunter rewards</strong> — fixed stablecoin service fees for verified work; rank/percentage claims disabled on-chain</li>
          <li>✓ <strong className="text-slate-200">DAO payments</strong> — operational disbursements in stablecoin, never to passive token holders</li>
          <li>✓ <strong className="text-slate-200">Burn is deflationary, not redistributive</strong> — 40% of every fee is permanently destroyed, reducing supply for all holders equally</li>
        </ul>
      </div>
    </div>
  );
}

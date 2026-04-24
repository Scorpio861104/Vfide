/**
 * Protocol Disclaimers — Legal copy for the frontend
 * 
 * Drop these into relevant pages:
 * - <ProtocolDisclaimer /> on footer/legal pages
 * - <NonCustodialNotice /> on vault/transaction pages
 * - <OnRampDisclaimer /> next to fiat on-ramp widgets
 * - <RiskDisclaimer /> on governance/staking pages
 */
'use client';

import { Shield, AlertTriangle, ExternalLink, Info } from 'lucide-react';

export function ProtocolDisclaimer({ className = '' }: { className?: string }) {
  return (
    <div className={`text-xs text-gray-600 space-y-2 ${className}`}>
      <p>
        VFIDE is a decentralized payment protocol operating on public blockchain infrastructure.
        VFIDE is not a bank, money services business, payment processor, or financial institution.
        VFIDE does not hold user private keys or operate omnibus custody. Transactions occur through
        user-controlled smart contracts, subject to the protocol&apos;s on-chain safety, recovery, and dispute-resolution rules.
      </p>
      <p>
        Users are solely responsible for their own wallets, private keys, and transaction decisions.
        VFIDE does not provide financial, legal, or tax advice. Use of the protocol is at your own risk.
      </p>
    </div>
  );
}

export function NonCustodialNotice({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-start gap-2 p-3 bg-cyan-500/5 border border-cyan-500/15 rounded-xl ${className}`}>
      <Shield size={14} className="text-cyan-400 mt-0.5 flex-shrink-0" />
      <p className="text-xs text-gray-400">
        <span className="text-cyan-400 font-bold">Self-custody with safeguards.</span> Your wallet remains the
        primary control surface, while queued withdrawals, guardian recovery, and fraud-review controls may affect how funds move through the protocol.
      </p>
    </div>
  );
}

export function OnRampDisclaimer({ providerName = 'the provider' }: { providerName?: string }) {
  return (
    <div className="flex items-start gap-2 p-3 bg-amber-500/5 border border-amber-500/15 rounded-xl">
      <Info size={14} className="text-amber-400 mt-0.5 flex-shrink-0" />
      <p className="text-xs text-gray-400">
        Fiat purchases are processed by {providerName}, a separate regulated entity.
        Identity verification required by {providerName} is subject to their compliance policies,
        not VFIDE&apos;s. VFIDE does not collect or store your identity documents.
      </p>
    </div>
  );
}

export function RiskDisclaimer({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-start gap-2 p-3 bg-red-500/5 border border-red-500/15 rounded-xl ${className}`}>
      <AlertTriangle size={14} className="text-red-400 mt-0.5 flex-shrink-0" />
      <p className="text-xs text-gray-400">
        DeFi protocols carry inherent risks including smart contract vulnerabilities, network
        congestion, and token price volatility. Only use funds you can afford to lose.
        Past ProofScore performance does not guarantee future results.
      </p>
    </div>
  );
}

export function ThirdPartyServiceNotice({ 
  serviceName, 
  serviceUrl,
  serviceType = 'service',
}: { 
  serviceName: string; 
  serviceUrl?: string;
  serviceType?: string;
}) {
  return (
    <div className="flex items-start gap-2 p-3 bg-white/3 border border-white/5 rounded-xl">
      <ExternalLink size={14} className="text-gray-500 mt-0.5 flex-shrink-0" />
      <p className="text-xs text-gray-500">
        This {serviceType} is provided by{' '}
        {serviceUrl ? (
          <a href={serviceUrl} target="_blank" rel="noopener noreferrer" className="text-gray-400 underline">
            {serviceName}
          </a>
        ) : (
          <span className="text-gray-400">{serviceName}</span>
        )}
        , an independent third party. VFIDE is not responsible for their services, terms, or compliance requirements.
      </p>
    </div>
  );
}

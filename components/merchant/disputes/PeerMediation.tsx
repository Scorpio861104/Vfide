import Link from 'next/link';
import { Handshake, ArrowRight, ShieldCheck } from 'lucide-react';

const mediationSteps = [
  'Confirm the order details and expected resolution with both sides.',
  'Offer merchant correction first: refund, exchange, or store credit.',
  'Escalate to formal appeals only if peer mediation does not resolve the case.',
];

export default function PeerMediation() {
  return (
    <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5">
      <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-sm text-emerald-300">
        <Handshake size={14} /> Peer mediation
      </div>
      <h3 className="text-xl font-semibold text-white">Resolve simple disputes before escalation</h3>
      <p className="mt-2 text-sm text-gray-300">
        This mediation-first flow keeps buyer and merchant disputes lightweight, faster, and cheaper before formal review is needed.
      </p>

      <ul className="mt-4 space-y-2 text-sm text-gray-300">
        {mediationSteps.map((step) => (
          <li key={step} className="flex items-start gap-2">
            <ShieldCheck size={16} className="mt-0.5 text-emerald-300" />
            <span>{step}</span>
          </li>
        ))}
      </ul>

      <div className="mt-4 flex flex-wrap gap-3">
        <Link href="/merchant/returns" className="inline-flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm font-semibold text-emerald-200">
          Start merchant correction <ArrowRight size={14} />
        </Link>
        <Link href="/appeals" className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white">
          Escalate to appeals <ArrowRight size={14} />
        </Link>
      </div>
    </div>
  );
}

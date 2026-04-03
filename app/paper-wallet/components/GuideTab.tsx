'use client';

const GUIDE_STEPS = [
  {
    title: '1. Generate in a trusted environment',
    detail: 'Prefer an offline or freshly booted device, and avoid screenshots, email drafts, or cloud sync while creating backup material.',
  },
  {
    title: '2. Make at least two physical backups',
    detail: 'Print or hand-copy one primary backup and one sealed recovery copy, then store them in separate secure locations.',
  },
  {
    title: '3. Verify before moving larger balances',
    detail: 'Send a small test transfer first and confirm the address and recovery phrase both restore the expected wallet.',
  },
];

const SECURITY_RULES = [
  'Never share the private key or recovery phrase with support, friends, or recovery helpers.',
  'Do not keep the only copy on a phone, browser tab, or screenshot album.',
  'Sweep funds into a fresh wallet if you believe the paper copy was exposed.',
];

export function GuideTab() {
  return (
    <div className="space-y-6">
      <div className="bg-white/3 border border-white/10 rounded-2xl p-6">
        <h3 className="text-xl font-bold text-white mb-2">Offline Storage Guide</h3>
        <p className="text-gray-400">
          Use this checklist when preparing a cold-storage paper wallet for long-term backups or emergency recovery.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {GUIDE_STEPS.map((step) => (
          <div key={step.title} className="rounded-2xl border border-white/10 bg-black/20 p-5">
            <h4 className="mb-2 font-semibold text-white">{step.title}</h4>
            <p className="text-sm text-gray-400">{step.detail}</p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-6">
        <h4 className="mb-3 text-lg font-semibold text-white">Security rules</h4>
        <ul className="space-y-2 text-sm text-gray-300">
          {SECURITY_RULES.map((rule) => (
            <li key={rule}>• {rule}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

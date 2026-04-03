'use client';

const GUIDE_STEPS = [
  'Initialize the device with vendor software only, then write down the recovery phrase offline.',
  'Install the chain app you need and confirm the displayed receiving address on the hardware screen itself.',
  'Use a small test transaction before routing payroll, vault, or merchant funds through the device.',
];

export function GuideTab() {
  return (
    <div className="space-y-6">
      <div className="bg-white/3 border border-white/10 rounded-2xl p-6">
        <h3 className="text-xl font-bold text-white mb-2">Setup Guide</h3>
        <p className="text-gray-400">Follow this sequence when onboarding a Ledger, Trezor, or similar signing device into VFIDE.</p>
      </div>

      <div className="rounded-2xl border border-white/10 bg-black/20 p-6">
        <ul className="space-y-2 text-sm text-gray-300">
          {GUIDE_STEPS.map((step) => (
            <li key={step}>• {step}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

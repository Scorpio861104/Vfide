'use client';

const VERIFICATION_STEPS = [
  'Confirm the printed public address matches the address you expect before funding it.',
  'Scan the QR code on a trusted device and compare the decoded value with the printed text.',
  'Perform a small inbound and outbound test before relying on the paper wallet for larger balances.',
];

export function VerifyTab() {
  return (
    <div className="space-y-6">
      <div className="bg-white/3 border border-white/10 rounded-2xl p-6">
        <h3 className="text-xl font-bold text-white mb-2">Verification Checklist</h3>
        <p className="text-gray-400">
          Before treating a paper wallet as production-ready, confirm that the address, QR code, and recovery materials all match.
        </p>
      </div>

      <div className="rounded-2xl border border-white/10 bg-black/20 p-6">
        <div className="space-y-3 text-sm text-gray-300">
          {VERIFICATION_STEPS.map((step) => (
            <p key={step}>• {step}</p>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-6">
        <h4 className="mb-2 font-semibold text-white">Important</h4>
        <p className="text-sm text-gray-300">
          If a private key has ever been exposed to an online device, treat the wallet as hot and move funds to a newly generated backup instead.
        </p>
      </div>
    </div>
  );
}

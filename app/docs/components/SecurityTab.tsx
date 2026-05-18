'use client';

export function SecurityTab() {
  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-6">
        <h3 className="mb-3 text-xl font-bold text-white">Security Practices</h3>
        <ul className="space-y-2 text-gray-300">
          <li>• Use a hardware wallet for long-term storage.</li>
          <li>• Verify payment requests and QR signatures before approving.</li>
          <li>• Keep recovery contacts and vault guardians up to date.</li>
        </ul>
      </div>
    </div>
  );
}

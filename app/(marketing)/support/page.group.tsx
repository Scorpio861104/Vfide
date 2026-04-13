/**
 * Support Page — Server Component (SSR)
 * Full SEO. Zero client JS.
 */
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Support — VFIDE',
  description: 'Get help with VFIDE: vault recovery, merchant setup, guardian management, and more.',
};

export default function SupportPage() {
  return (
    <div className="min-h-screen bg-zinc-950 pt-20">
      <section className="py-16">
        <div className="container mx-auto px-4 max-w-4xl">
          <h1 className="text-4xl font-bold text-white mb-6">Support</h1>
          <p className="text-gray-400 text-lg mb-12">
            Need help? Find answers to common questions or reach out to the community.
          </p>

          <div className="grid gap-6 md:grid-cols-2">
            <article className="rounded-xl border border-white/10 bg-white/3 p-5">
              <h2 className="text-white text-xl font-semibold mb-2">Account and Vault</h2>
              <ul className="space-y-2 text-gray-300 text-sm">
                <li>Recover account access using your configured guardians.</li>
                <li>Verify vault ownership before attempting high-value transfers.</li>
                <li>Review inheritance and recovery policy settings periodically.</li>
              </ul>
            </article>

            <article className="rounded-xl border border-white/10 bg-white/3 p-5">
              <h2 className="text-white text-xl font-semibold mb-2">Merchant Operations</h2>
              <ul className="space-y-2 text-gray-300 text-sm">
                <li>Check POS connectivity when online confirmations lag.</li>
                <li>Use charge history to reconcile daily payment totals.</li>
                <li>Confirm settlement destination matches your merchant vault.</li>
              </ul>
            </article>

            <article className="rounded-xl border border-white/10 bg-white/3 p-5 md:col-span-2">
              <h2 className="text-white text-xl font-semibold mb-2">Community Help</h2>
              <p className="text-gray-300 text-sm leading-relaxed">
                For troubleshooting, share your wallet address, route, and timestamp of the issue.
                Avoid posting private keys or recovery credentials in public channels.
              </p>
            </article>
          </div>
        </div>
      </section>
    </div>
  );
}

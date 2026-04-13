/**
 * Docs Page — Server Component (SSR)
 * Full SEO. Zero client JS.
 */
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Documentation — VFIDE',
  description: 'Learn how to use VFIDE: vault setup, guardian recovery, merchant onboarding, governance, and ProofScore.',
};

export default function DocsPage() {
  return (
    <div className="min-h-screen bg-zinc-950 pt-20">
      <section className="py-16">
        <div className="container mx-auto px-4 max-w-4xl">
          <h1 className="text-4xl font-bold text-white mb-6">Documentation</h1>
          <p className="text-gray-400 text-lg mb-12">
            Everything you need to know about using VFIDE.
          </p>

          <div className="grid gap-6 md:grid-cols-2">
            <article className="rounded-xl border border-white/10 bg-white/3 p-5">
              <h2 className="text-white text-xl font-semibold mb-2">Getting Started</h2>
              <ul className="space-y-2 text-gray-300 text-sm">
                <li>1. Create your VFIDE account with email, phone, or wallet.</li>
                <li>2. Set up guardians for account recovery safety.</li>
                <li>3. Confirm your vault address and backup recovery options.</li>
                <li>4. Complete profile details to improve trust discovery.</li>
              </ul>
            </article>

            <article className="rounded-xl border border-white/10 bg-white/3 p-5">
              <h2 className="text-white text-xl font-semibold mb-2">Merchant Setup</h2>
              <ul className="space-y-2 text-gray-300 text-sm">
                <li>1. Register your store profile and payout vault.</li>
                <li>2. Add products and optional inventory tracking.</li>
                <li>3. Generate POS charge requests for in-person checkout.</li>
                <li>4. Track payment confirmations and settlement status.</li>
              </ul>
            </article>

            <article className="rounded-xl border border-white/10 bg-white/3 p-5">
              <h2 className="text-white text-xl font-semibold mb-2">Vault Security</h2>
              <p className="text-gray-300 text-sm leading-relaxed">
                VFIDE vaults are non-custodial. You keep key ownership while recovery,
                inheritance routing, and policy controls protect long-term access.
              </p>
            </article>

            <article className="rounded-xl border border-white/10 bg-white/3 p-5">
              <h2 className="text-white text-xl font-semibold mb-2">Governance and ProofScore</h2>
              <p className="text-gray-300 text-sm leading-relaxed">
                DAO proposals and trust signals combine on-platform behavior with
                transparent policy rules to prioritize accountable participants.
              </p>
            </article>
          </div>
        </div>
      </section>
    </div>
  );
}

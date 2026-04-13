/**
 * Legal Page — Server Component (SSR)
 * Full SEO. Zero client JS.
 */
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Legal — VFIDE',
  description: 'VFIDE terms of service, privacy policy, and legal information.',
};

export default function LegalPage() {
  return (
    <div className="min-h-screen bg-zinc-950 pt-20">
      <section className="py-16">
        <div className="container mx-auto px-4 max-w-4xl prose prose-invert">
          <h1>Legal</h1>
          <h2>Terms of Service</h2>
          <p>
            VFIDE provides protocol software and user interfaces for decentralized
            payments. You are responsible for compliance with local rules when using
            wallet and merchant features.
          </p>
          <h2>Privacy</h2>
          <p>
            Operational data may be processed to secure accounts, prevent abuse, and
            maintain transaction integrity. Sensitive credentials are never stored in
            plaintext.
          </p>
          <h2>Risk Notice</h2>
          <p>
            Digital asset use carries market, smart contract, and counterparty risks.
            Review vault recovery and guardian settings before handling significant value.
          </p>
          <h2>Contact</h2>
          <p>
            For legal requests, use the support channels listed on the Support page
            and include your account or merchant identifiers when relevant.
          </p>
        </div>
      </section>
    </div>
  );
}

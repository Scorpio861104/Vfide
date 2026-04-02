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
          {/* TODO: Migrate content from existing legal/page.tsx (remove 'use client') */}
        </div>
      </section>
    </div>
  );
}

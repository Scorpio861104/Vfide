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
          {/* TODO: Migrate content from existing docs/page.tsx (remove 'use client') */}
        </div>
      </section>
    </div>
  );
}

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
          {/* TODO: Migrate content from existing support/page.tsx (remove 'use client') */}
        </div>
      </section>
    </div>
  );
}

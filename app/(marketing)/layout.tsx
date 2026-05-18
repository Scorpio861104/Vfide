/**
 * (marketing) Route Group Layout — Pure Server Components
 * 
 * Pages: about, docs, legal, support, benefits, seer-academy, merchants directory
 * 
 * NO 'use client'. NO providers. NO wallet.
 * These pages render as static HTML with zero JS bundle.
 * Full SEO. Sub-1s TTI on 3G.
 * 
 * MIGRATION:
 * 1. Move these folders into app/(marketing)/:
 *    about/, docs/, legal/, support/, benefits/, seer-academy/
 * 2. Remove 'use client' from each page.tsx
 * 3. Remove any useAccount/useWallet hooks (replace with static content)
 * 4. Keep only server-safe imports (no wagmi, no framer-motion, no rainbowkit)
 */

import { Footer } from '@/components/layout/Footer';

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <main className="min-h-screen">{children}</main>
      <Footer />
    </>
  );
}

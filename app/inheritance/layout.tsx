import type { Metadata } from 'next';
import { buildPageMetadata } from '@/lib/seo/buildPageMetadata';

/**
 * /inheritance is an authenticated user surface for next-of-kin /
 * inheritance vault flows. Not indexed because it's per-user gated.
 */
export const metadata: Metadata = buildPageMetadata({
  title: 'Inheritance',
  description: 'Configure inheritance and next-of-kin recovery for your VFIDE vault.',
  path: '/inheritance',
  robots: { index: false, follow: false },
});

export default function InheritanceLayout({ children }: { children: React.ReactNode }) {
  return children;
}

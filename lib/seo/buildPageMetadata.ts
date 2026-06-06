/**
 * Metadata helper for per-route layouts.
 *
 * Why this exists: Tier 3 Round 17 (2026-05-17) — VFIDE has 81 top-level
 * routes but only 21 had per-route metadata. The other 60 all inherited
 * the root title verbatim, so Google search results for /merchants,
 * /developer, /enterprise, /sanctum, /lending, /testnet, /token-launch,
 * /leaderboard, /explorer, /endorsements, /proofscore, /feed etc. all
 * looked identical — killing CTR and rankings on what should be high-
 * intent landing pages.
 *
 * Each layout.tsx that wraps a public-ish route can now `export const
 * metadata = buildPageMetadata({ title, description, path })` and get
 * a complete OG + Twitter + canonical setup in a single line. The root
 * `template: '%s — VFIDE'` in app/layout.tsx automatically appends the
 * brand suffix so callers only need to provide the page-specific title.
 *
 * For pages whose layout was already hand-written before this helper
 * existed, this module's existence doesn't break anything — those
 * layouts continue to work, they just lack the OG / Twitter / canonical
 * polish that callers of this helper get.
 */
import type { Metadata } from 'next';

export interface BuildPageMetadataArgs {
  /** Page title (the brand suffix is added by the root template). */
  title: string;
  /** Concise description (160 chars max for SEO). */
  description: string;
  /**
   * Path the page lives at, e.g. '/developer'. Used to set canonical
   * and openGraph.url. The root metadataBase resolves these to absolute.
   */
  path: string;
  /**
   * Robots controls. Most pages should be indexable; set { index:
   * false } for thin pages, internal pages, or auth-gated routes that
   * shouldn't appear in Google.
   */
  robots?: {
    index?: boolean;
    follow?: boolean;
  };
}

export function buildPageMetadata({
  title,
  description,
  path,
  robots,
}: BuildPageMetadataArgs): Metadata {
  const allowIndex = robots?.index !== false;
  const allowFollow = robots?.follow !== false;

  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      type: 'website',
      url: path,
      title: `${title} — VFIDE`,
      description,
      // Root layout provides the og-image.png fallback (1200×630 PNG — rendered by
      // all major social platforms). Pages that want a custom image can override.
    },
    twitter: {
      card: 'summary_large_image',
      title: `${title} — VFIDE`,
      description,
    },
    robots: {
      index: allowIndex,
      follow: allowFollow,
      googleBot: {
        index: allowIndex,
        follow: allowFollow,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
  };
}

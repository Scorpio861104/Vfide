'use client';

import { m } from 'framer-motion';
import type { ReactNode } from 'react';

/**
 * PageHeader — VFIDE's canonical page header primitive.
 *
 * Tier 3 Round 8 (2026-05-17). Built to consolidate the `<m.h1>` + subtitle
 * pattern repeated verbatim across 20+ wrapper pages (governance, treasury,
 * sanctum, enterprise, escrow, badges, dao-hub, achievements, support, etc.).
 *
 * The animation, font sizing, color tokens, and spacing rhythm are baked in
 * so the entire wrapper layer stays visually identical without per-page
 * hand-copied JSX. Use the `eyebrow` slot for a pre-title pill/badge, and
 * `action` for a right-aligned button or controls in a flex row.
 *
 * Standard usage:
 *
 *   <PageHeader title="Governance" subtitle="Community proposals and voting" />
 *
 * With eyebrow pill:
 *
 *   <PageHeader
 *     eyebrow={<><Vote size={12} /> DAO</>}
 *     title="Governance"
 *     subtitle="Community proposals and voting"
 *   />
 */

export interface PageHeaderProps {
  /** Main title (renders as h1, text-4xl). */
  title: string;
  /** Subtitle paragraph below the title. */
  subtitle?: ReactNode;
  /** Optional small pill/badge above the title. */
  eyebrow?: ReactNode;
  /** Optional content rendered to the right of the title (e.g., a button). */
  action?: ReactNode;
  /** Bottom margin. Default 'lg' (mb-8). */
  spacing?: 'sm' | 'md' | 'lg';
  /** Center-align the header content. */
  centered?: boolean;
  /** Skip the framer-motion entrance animation. */
  noAnimation?: boolean;
}

const SPACING_MAP = {
  sm: 'mb-4',
  md: 'mb-6',
  lg: 'mb-8',
};

export function PageHeader({
  title,
  subtitle,
  eyebrow,
  action,
  spacing = 'lg',
  centered = false,
  noAnimation = false,
}: PageHeaderProps) {
  const Wrapper = noAnimation ? 'div' : m.div;
  const animProps = noAnimation
    ? {}
    : {
        initial: { opacity: 0, y: 20 },
        animate: { opacity: 1, y: 0 },
      };

  const alignment = centered ? 'text-center' : '';
  const layout = action ? 'flex flex-col gap-3 md:flex-row md:items-end md:justify-between' : '';

  return (
    <Wrapper {...animProps} className={`${SPACING_MAP[spacing]} ${layout}`.trim()}>
      <div className={alignment}>
        {eyebrow && (
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent/5 px-3 py-1 text-xs uppercase tracking-widest text-accent">
            {eyebrow}
          </div>
        )}
        <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">{title}</h1>
        {subtitle && <p className="text-sm sm:text-base text-zinc-400">{subtitle}</p>}
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </Wrapper>
  );
}

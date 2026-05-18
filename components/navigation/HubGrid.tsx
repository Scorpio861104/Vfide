'use client';

/**
 * HubGrid — the "section landing page" grid used by /merchant and /me.
 *
 * A user lands on one of the top-level nav sections ("Shop", "Me", etc.)
 * and gets a labeled grid of sub-destinations. Each card is a link with
 * an icon, label, description, and an arrow that animates on hover.
 *
 * Lives in components/navigation because it's structurally part of the
 * navigation system — the top nav's section tabs lead to pages that
 * render groups of these grids. Both the merchant hub at /merchant and
 * the user hub at /me share this exact pattern; keeping it in one place
 * means a styling change to one updates both.
 *
 * Public surface:
 *   - <HubGrid links={...} />        — one section of the grid
 *   - <HubSection title="..." links={...} />  — a labeled section
 *   - HubLink type for typing the link arrays
 */

import { ComponentType } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

export interface HubLink {
  href: string;
  /** Lucide icon component. Pass the icon as a component reference, not an element. */
  icon: ComponentType<{ size?: number; className?: string }>;
  label: string;
  description: string;
  /**
   * Optional "Coming soon" or similar one-word note rendered as a small
   * badge. Use sparingly — most links should just be live destinations.
   */
  badge?: string;
}

/** A single labeled section: <h2> heading + the grid. */
export function HubSection({ title, links }: { title: string; links: HubLink[] }) {
  return (
    <section>
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-zinc-400">
        {title}
      </h2>
      <HubGrid links={links} />
    </section>
  );
}

/** Just the grid, no heading. */
export function HubGrid({ links }: { links: HubLink[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {links.map((link) => (
        <HubCard key={link.href} link={link} />
      ))}
    </div>
  );
}

function HubCard({ link }: { link: HubLink }) {
  const Icon = link.icon;
  return (
    <Link
      href={link.href}
      className="group rounded-xl border border-white/10 bg-white/[0.03] p-4 transition-colors hover:border-cyan-500/30 hover:bg-cyan-500/5"
    >
      <div className="flex items-start gap-3">
        <div className="rounded-lg bg-zinc-900 p-2 transition-colors group-hover:bg-cyan-500/10">
          <Icon size={20} className="text-cyan-300" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 font-medium text-white">
            {link.label}
            {link.badge && (
              <span className="rounded-md border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-amber-300">
                {link.badge}
              </span>
            )}
            <ArrowRight
              size={14}
              className="-translate-x-1 opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100"
            />
          </div>
          <div className="mt-0.5 text-xs text-zinc-500">{link.description}</div>
        </div>
      </div>
    </Link>
  );
}

export default HubGrid;

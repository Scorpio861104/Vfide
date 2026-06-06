'use client';

/**
 * MoreSheet — the "everything else" drawer for the bottom tab bar (mobile)
 * and the top nav (desktop).
 *
 * Design intent: the bottom tab bar shows 4 most-used destinations
 * (Home / Shop / Pay / Social) and a fifth "More" tab. Tapping "More"
 * does NOT navigate — it opens this sheet, which lists the rest of the
 * product organized into the same groups PieMenu uses (Vault, Merchant,
 * Social, Governance, Rewards, Insights, Tools, Account). On desktop,
 * a "More" button in the top nav opens the same sheet as a popover so
 * the discoverable surface is identical on both viewports.
 *
 * Why a sheet rather than a route:
 *   - Fast: no full-page navigation when the user just wants to peek
 *     at where they could go.
 *   - Reversible: tapping outside, tapping the same More tab, or pressing
 *     ESC closes it. Navigating back doesn't strand the user.
 *   - Searchable: 75 destinations is a lot. A search box at the top
 *     filters items live across all groups, so a user typing "vault"
 *     sees Vault / Wallet / Guardians / Recovery without scrolling.
 *
 * Data: reads from `./navigationItems`. PieMenu reads from the same
 * source, so the two surfaces can't drift.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { m, AnimatePresence } from 'framer-motion';
import { Search, X, ArrowUpRight } from 'lucide-react';

import {
  flattenNavItems,
  navigationItems,
  type NavItem,
} from './navigationItems';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';
import { LanguageSwitcher } from '@/components/common/LanguageSwitcher';

interface MoreSheetProps {
  open: boolean;
  onClose: () => void;
  /** Where the sheet should appear relative to its trigger.
   *  'bottom' = full-width bottom sheet (mobile),
   *  'top-right' = popover anchored to the top-nav More button (desktop). */
  variant?: 'bottom' | 'top-right';
}

export function MoreSheet({ open, onClose, variant = 'bottom' }: MoreSheetProps) {
  const reduce = usePrefersReducedMotion();
  const pathname = usePathname();
  const [search, setSearch] = useState('');
  const searchRef = useRef<HTMLInputElement | null>(null);

  // Clear search immediately on pathname change (navigation happened).
  // This ensures re-opening the sheet after a navigation shows a fresh state.
  useEffect(() => {
    setSearch('');
  }, [pathname]);

  // Reset search when the sheet closes. Don't reset on every render —
  // a user typing "vault" who taps a result shouldn't return to see
  // the stale query if they re-open the sheet a second later (sheet
  // pops back to a clean state).
  useEffect(() => {
    if (!open) {
      // Slight delay so the close animation runs before content reflows.
      const t = setTimeout(() => setSearch(''), 200);
      return () => clearTimeout(t);
    }
    // When opening, focus the search input after the open animation
    // settles (~150ms).
    const t = setTimeout(() => searchRef.current?.focus(), 160);
    return () => clearTimeout(t);
  }, [open]);

  // ESC closes the sheet.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  // Auto-close after a result is tapped — handled inline below by passing
  // onClose into the Link's onClick.

  // Live filter. Empty query → return groups unchanged. Non-empty →
  // flatten and filter; render as a flat list under a "Results" heading.
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return null;
    const flat = flattenNavItems(navigationItems);
    return flat.filter((item) =>
      [item.label, item.id, item.badge]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(q))
    );
  }, [search]);

  // Layout depends on variant.
  const positioning =
    variant === 'bottom'
      ? // Mobile bottom sheet: anchored above the 64px BottomTabBar so
        // the tab bar — including the More button that toggled the
        // sheet — remains tappable for re-closing. Rounded top corners,
        // max-height capped so the sheet never covers the whole screen.
        'fixed inset-x-0 z-50 max-h-[70vh] rounded-t-3xl border-t border-x border-white/10 bg-zinc-950/95 backdrop-blur-xl more-sheet-bottom'
      : // Desktop popover: anchored below TopNav (56px) + ticker
        // (28px) = top 88px. Width-constrained so it doesn't dominate.
        // Max height leaves a comfortable gutter at the viewport bottom.
        // CODE-5: Use rem instead of px so the offset scales with the user's font size preference
        'fixed right-4 top-[5.5rem] z-50 w-[min(420px,calc(100vw-2rem))] max-h-[calc(100vh-7rem)] rounded-2xl border border-white/10 bg-zinc-950/95 backdrop-blur-xl shadow-2xl';

  const motionInitial =
    variant === 'bottom' ? { y: '100%', opacity: 1 } : { opacity: 0, y: -8, scale: 0.97 };
  const motionAnimate =
    variant === 'bottom' ? { y: 0, opacity: 1 } : { opacity: 1, y: 0, scale: 1 };
  const motionExit = motionInitial;
  const motionTransition = reduce
    ? { duration: 0 }
    : variant === 'bottom'
      ? { type: 'spring' as const, stiffness: 380, damping: 38 }
      : { duration: 0.15 };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop — click to close. */}
          <m.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduce ? 0 : 0.18 }}
            className="fixed inset-0 z-40 bg-black/70 backdrop-blur-md"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* The sheet. */}
          <m.div
            initial={motionInitial}
            animate={motionAnimate}
            exit={motionExit}
            transition={motionTransition}
            className={`${positioning} ui-card-sheen flex flex-col overflow-hidden`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="more-sheet-title"
            aria-describedby="more-sheet-description"
          >
            {/* Drag indicator + header (mobile). On desktop the rounded
                corners do the same job. */}
            {variant === 'bottom' && (
              <div className="flex justify-center pt-2 pb-1">
                <div className="h-1 w-10 rounded-full bg-white/15" />
              </div>
            )}

            <div className="ui-hairline-top border-b border-white/10 bg-white/[0.02] px-4 pb-3 pt-3">
              <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                  <h2 id="more-sheet-title" className="text-sm font-semibold text-white">
                    Explore VFIDE
                  </h2>
                  <p id="more-sheet-description" className="mt-0.5 text-xs text-gray-500">
                    Search every destination or browse by product area.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-lg border border-white/10 bg-white/[0.03] p-1.5 text-gray-400 transition hover:bg-white/8 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
                  aria-label="Close destinations menu"
                >
                  <X size={16} />
                </button>
              </div>
              {/* Search row */}
              <div className="glass-surface flex items-center gap-2 rounded-xl px-3 py-1.5 focus-within:border-accent/45 focus-within:bg-white/[0.07]">
                <Search size={16} className="text-gray-500" />
                <input
                  ref={searchRef}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search vault, pay, rewards…"
                  className="flex-1 bg-transparent text-base text-white placeholder-gray-500 outline-none min-h-[36px]"
                  aria-label="Search destinations"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch('')}
                    className="rounded-md px-2 py-1 text-xs text-gray-400 hover:bg-white/5 hover:text-white"
                    aria-label="Clear destination search"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-2 pb-4 pt-3">
              {filtered ? (
                <FlatResults
                  items={filtered}
                  pathname={pathname ?? ''}
                  onPick={onClose}
                />
              ) : (
                <GroupedList
                  groups={navigationItems}
                  pathname={pathname ?? ''}
                  onPick={onClose}
                />
              )}
            </div>

            {/* Footer with link to the full hub page */}
            <div className="flex items-center justify-between border-t border-white/10 bg-black/20 px-4 py-3">
              <LanguageSwitcher className="sm:hidden" />
              <span className="text-xs text-gray-500">
                {filtered
                  ? `${filtered.length} match${filtered.length === 1 ? '' : 'es'}`
                  : 'All destinations'}
              </span>
              <Link
                href="/me"
                onClick={onClose}
                className="inline-flex items-center gap-1 text-xs text-accent hover:text-accent"
              >
                Open full hub <ArrowUpRight size={11} />
              </Link>
            </div>
          </m.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ── Helpers ─────────────────────────────────────────────────────────

function GroupedList({
  groups,
  pathname,
  onPick,
}: {
  groups: NavItem[];
  pathname: string;
  onPick: () => void;
}) {
  return (
    <div className="space-y-4">
      {groups.map((group) => {
        // Render top-level items that have an `href` directly (Home,
        // Dashboard), or render groups with children as a labeled
        // section.
        if (group.href && !group.children) {
          return (
            <div key={group.id} className="px-2">
              <ItemRow item={group} pathname={pathname} onPick={onPick} />
            </div>
          );
        }
        if (!group.children || group.children.length === 0) return null;
        return (
          <section key={group.id} className="px-2">
            <div className="mb-1.5 flex items-center gap-2 px-2">
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ background: group.color }}
                aria-hidden="true"
              />
              <h3 className="text-[11px] font-semibold uppercase tracking-widest text-gray-500">
                {group.label}
              </h3>
            </div>
            <div className="space-y-0.5">
              {group.children.map((child) => (
                <ItemRow
                  key={child.id}
                  item={child}
                  pathname={pathname}
                  onPick={onPick}
                />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function FlatResults({
  items,
  pathname,
  onPick,
}: {
  items: NavItem[];
  pathname: string;
  onPick: () => void;
}) {
  if (items.length === 0) {
    return (
      <div className="px-6 py-12 text-center">
        <div className="text-sm font-medium text-gray-300">No destinations found</div>
        <p className="mt-1 text-xs text-gray-500">
          Try a product area like vault, merchant, rewards, governance, or settings.
        </p>
      </div>
    );
  }
  return (
    <div className="space-y-0.5 px-2">
      {items.map((item) => (
        <ItemRow key={item.id} item={item} pathname={pathname} onPick={onPick} />
      ))}
    </div>
  );
}

function ItemRow({
  item,
  pathname,
  onPick,
}: {
  item: NavItem;
  pathname: string;
  onPick: () => void;
}) {
  const href = item.href ?? '/';
  const active = pathname === href || (href !== '/' && pathname.startsWith(href + '/'));
  const Icon = item.icon;

  // T2-4: Coming-soon items are shown but grayed out and unclickable.
  if (item.comingSoon) {
    return (
      <div
        className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm opacity-50 cursor-not-allowed select-none"
        aria-disabled="true"
        title={`${item.label} is not available yet`}
      >
        <span
          className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md"
          style={{ background: `${item.color}10`, color: item.color }}
        >
          <Icon size={14} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-gray-400">{item.label}</span>
          <span className="block truncate text-[10px] text-gray-600">Planned for a later release</span>
        </span>
        <span className="flex-shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider bg-white/5 text-white/40">
          Soon
        </span>
      </div>
    );
  }

  return (
    <Link
      href={href}
      onClick={onPick}
      aria-current={active ? 'page' : undefined}
      title={`Open ${item.label}`}
      className={`group flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 ${
        active
          ? 'bg-accent/10 text-accent'
          : 'text-gray-300 hover:bg-white/5 hover:text-white'
      }`}
    >
      <span
        className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md"
        style={{
          background: active ? `${item.color}25` : `${item.color}15`,
          color: item.color,
        }}
      >
        <Icon size={14} />
      </span>
      <span className="flex-1 truncate">{item.label}</span>
      {item.badge && (
        <span
          className="flex-shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider"
          style={{
            background: `${item.color}20`,
            color: item.color,
          }}
        >
          {item.badge}
        </span>
      )}
    </Link>
  );
}

export default MoreSheet;

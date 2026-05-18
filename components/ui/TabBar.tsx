'use client';

import type { ComponentType, ReactNode } from 'react';

/**
 * TabBar — VFIDE's canonical horizontal tab bar primitive.
 *
 * Tier 3 Round 8 (2026-05-17). Built to consolidate the inline tab bar
 * pattern repeated verbatim across 27 wrapper pages and tab components.
 * Pages each had ~15 lines of hand-copied tab JSX:
 *
 *   <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
 *     {TAB_IDS.map(id => (
 *       <button key={id} onClick={() => setActiveTab(id)}
 *         className={`flex items-center gap-2 px-4 py-2 rounded-xl ...
 *           ${activeTab === id ? 'bg-cyan-500/20 text-cyan-400 ...' : 'bg-white/5 ...'}`}>
 *         <tab.icon size={16} />{tab.label}
 *       </button>
 *     ))}
 *   </div>
 *
 * Replaced with one component call:
 *
 *   <TabBar tabs={tabs} activeId={activeTab} onSelect={setActiveTab} />
 *
 * Tabs can carry icons (Lucide ComponentType), labels (string), and any
 * stable `id` value. The bar scrolls horizontally on narrow screens.
 */

export interface Tab<TId extends string = string> {
  id: TId;
  label: string;
  /** Optional Lucide icon component. */
  icon?: ComponentType<{ size?: number; className?: string }>;
  /** Optional element rendered after the label (e.g., a count badge). */
  badge?: ReactNode;
  /** Disable this tab. Renders muted with no hover/click handling. */
  disabled?: boolean;
}

/** Accent color used for the active-tab state. */
export type TabBarAccent = 'cyan' | 'pink' | 'emerald' | 'amber' | 'purple';

export interface TabBarProps<TId extends string = string> {
  tabs: ReadonlyArray<Tab<TId>>;
  activeId: TId;
  onSelect: (id: TId) => void;
  /** Bottom margin. Default 'md' (mb-8). */
  spacing?: 'none' | 'sm' | 'md';
  /** Accent color for the active tab. Default 'cyan'. */
  accent?: TabBarAccent;
  /** aria-label for the tablist. */
  'aria-label'?: string;
}

const SPACING_MAP = { none: '', sm: 'mb-4', md: 'mb-8' };

const ACCENT_ACTIVE: Record<TabBarAccent, string> = {
  cyan:    'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30',
  pink:    'bg-pink-500/20 text-pink-400 border border-pink-500/30',
  emerald: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30',
  amber:   'bg-amber-500/20 text-amber-400 border border-amber-500/30',
  purple:  'bg-purple-500/20 text-purple-400 border border-purple-500/30',
};

export function TabBar<TId extends string>({
  tabs,
  activeId,
  onSelect,
  spacing = 'md',
  accent = 'cyan',
  'aria-label': ariaLabel = 'Tabs',
}: TabBarProps<TId>) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={`flex gap-2 overflow-x-auto pb-2 ${SPACING_MAP[spacing]}`.trim()}
    >
      {tabs.map((tab) => {
        const isActive = activeId === tab.id;
        const Icon = tab.icon;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            aria-disabled={tab.disabled || undefined}
            onClick={tab.disabled ? undefined : () => onSelect(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm whitespace-nowrap transition-colors ${
              tab.disabled
                ? 'bg-white/[0.02] text-zinc-600 border border-white/5 cursor-not-allowed'
                : isActive
                  ? ACCENT_ACTIVE[accent]
                  : 'bg-white/5 text-zinc-400 border border-white/10 hover:bg-white/10 hover:text-white'
            }`}
          >
            {Icon && <Icon size={16} />}
            {tab.label}
            {tab.badge && <span className="ml-1">{tab.badge}</span>}
          </button>
        );
      })}
    </div>
  );
}

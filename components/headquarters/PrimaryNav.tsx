'use client';

/**
 * Primary Navigation (Platform Transformation, Wave 1).
 *
 * The flat, non-sprawling primary nav from the spec: Command Center, Ownership, Business, Preparedness, Trust,
 * Governance, Profile. Each headquarters carries its jewel tone; the active item lifts. No feature directories,
 * no endless menus — the headquarters themselves hold the depth.
 */
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { HEADQUARTERS, HQ_ORDER } from '@/lib/headquarters/model';
import { DOMAIN_COLOR } from '@/lib/design/hqTokens';
import { LayoutGrid, User } from 'lucide-react';

interface NavItem { id: string; label: string; href: string; accent: string }

const NAV: NavItem[] = [
  { id: 'command-center', label: 'Command Center', href: '/command-center', accent: 'var(--hq-gold)' },
  ...HQ_ORDER.map((id) => ({ id, label: HEADQUARTERS[id].label, href: `/hq/${id}`, accent: DOMAIN_COLOR[id].accent })),
  { id: 'profile', label: 'Profile', href: '/me', accent: 'var(--hq-ink-soft)' },
];

export function PrimaryNav() {
  const pathname = usePathname();
  return (
    <nav
      className="flex items-center gap-1 overflow-x-auto rounded-2xl px-2 py-2"
      style={{ background: 'var(--hq-graphite)', border: '1px solid var(--hq-edge)' }}
      aria-label="Primary"
    >
      {NAV.map((item) => {
        const active = item.href === '/command-center'
          ? pathname === item.href
          : pathname === item.href || pathname.startsWith(`${item.href}/`);
        const Icon = item.id === 'command-center' ? LayoutGrid : item.id === 'profile' ? User : null;
        return (
          <Link
            key={item.id}
            href={item.href}
            className="relative flex items-center gap-2 whitespace-nowrap rounded-xl px-3.5 py-2 text-sm font-medium transition-colors"
            style={{
              color: active ? 'var(--hq-ink)' : 'var(--hq-ink-soft)',
              background: active ? 'var(--hq-stone)' : 'transparent',
            }}
            aria-current={active ? 'page' : undefined}
          >
            {Icon && <Icon size={15} style={{ color: active ? item.accent : 'var(--hq-ink-faint)' }} />}
            <span>{item.label}</span>
            {active && (
              <span aria-hidden className="absolute inset-x-3 -bottom-px h-[2px] rounded-full" style={{ background: item.accent }} />
            )}
          </Link>
        );
      })}
    </nav>
  );
}

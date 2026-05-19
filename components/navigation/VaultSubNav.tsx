'use client';

/**
 * VaultSubNav — sticky breadcrumb + mini-nav for all /vault/* sub-pages.
 *
 * Shows:
 *   ← Vault  |  Overview · Settings · Recovery · Safety · Pending
 *
 * Renders on every vault sub-page so users always know where they are
 * inside the vault and can jump to sibling pages without going back first.
 */

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight, Shield } from 'lucide-react';

const VAULT_LINKS = [
  { href: '/vault',                 label: 'Overview'        },
  { href: '/vault/settings',        label: 'Settings'        },
  { href: '/vault/recover',         label: 'Recovery'        },
  { href: '/vault/safety',          label: 'Safety'          },
  { href: '/vault/pending-changes', label: 'Pending'         },
  { href: '/vault/lock',            label: 'Lock'            },
];

export function VaultSubNav() {
  const pathname = usePathname();

  // Only show on vault sub-pages (not the vault root itself)
  if (pathname === '/vault') return null;

  // Determine current label for breadcrumb
  const current = VAULT_LINKS.find(
    (l) => pathname === l.href || (l.href !== '/vault' && pathname.startsWith(l.href + '/'))
  );

  return (
    // NAV-12: Correct sticky offset = TopNav (3.5rem) + ProtocolTicker (1.75rem) = 5.25rem
    <div
      className="sticky top-[3.5rem] md:top-[5.25rem] z-20 -mx-4 px-4 py-2 border-b border-white/5"
      style={{ background: 'rgba(9,9,11,0.90)', backdropFilter: 'blur(20px)' }}
    >
      <div className="container mx-auto max-w-6xl flex items-center gap-1.5 text-sm">
        {/* Breadcrumb */}
        <Link
          href="/vault"
          className="flex items-center gap-1.5 text-violet-400 hover:text-violet-300 transition-colors font-medium shrink-0"
        >
          <Shield size={13} />
          Vault
        </Link>
        <ChevronRight size={12} className="text-white/20 shrink-0" />
        <span className="text-white/60 truncate">{current?.label ?? 'Sub-page'}</span>

        {/* Separator */}
        <div className="mx-3 h-4 w-px bg-white/10 hidden sm:block" />

        {/* Quick jump links */}
        <div className="hidden sm:flex items-center gap-1 overflow-x-auto scrollbar-hide">
          {VAULT_LINKS.map((link) => {
            const isActive =
              pathname === link.href ||
              (link.href !== '/vault' && pathname.startsWith(link.href + '/'));
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-violet-500/15 text-violet-300'
                    : 'text-white/40 hover:text-white/70 hover:bg-white/5'
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}

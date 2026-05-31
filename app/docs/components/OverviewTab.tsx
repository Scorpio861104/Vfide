'use client';

import Link from 'next/link';
import { useLocale } from '@/lib/locale/LocaleProvider';

const OVERVIEW_COPY = {
  'en-US': {
    sections: [
      {
        title: 'Getting Started',
        links: [
          { name: 'Connect Your Wallet', href: '/dashboard' },
          { name: 'Create Your First Vault', href: '/vault' },
        ],
      },
      {
        title: 'Core Concepts',
        links: [
          { name: 'ProofScore & Reputation', href: '/proofscore' },
          { name: 'Escrow & Trust Fees', href: '/escrow' },
        ],
      },
    ],
  },
  'es-ES': {
    sections: [
      {
        title: 'Primeros pasos',
        links: [
          { name: 'Conecta tu billetera', href: '/dashboard' },
          { name: 'Crea tu primer vault', href: '/vault' },
        ],
      },
      {
        title: 'Conceptos clave',
        links: [
          { name: 'ProofScore y reputación', href: '/proofscore' },
          { name: 'Escrow y comisiones de confianza', href: '/escrow' },
        ],
      },
    ],
  },
};

export function OverviewTab() {
  const { locale } = useLocale();
  const copy = (OVERVIEW_COPY as Record<string, typeof OVERVIEW_COPY['en-US']>)[locale] ?? OVERVIEW_COPY['en-US'];

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
      {copy.sections.map((section) => (
        <div key={section.title} className="rounded-2xl border border-white/10 bg-white/3 p-6">
          <h3 className="mb-4 text-xl font-bold text-white">{section.title}</h3>
          <div className="space-y-2">
            {section.links.map((link) => (
              <Link key={link.name} href={link.href} className="block text-cyan-300 hover:text-cyan-200">
                {link.name}
              </Link>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

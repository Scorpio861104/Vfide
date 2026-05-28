'use client';

import { ShieldCheck, Key, Users, AlertTriangle, Lock } from 'lucide-react';

const SECTIONS = [
  {
    icon: Lock,
    color: 'emerald',
    title: 'Non-custodial by design',
    items: [
      'Your funds live in a CardBound Vault on-chain — not on a company server.',
      'VFIDE cannot freeze, blacklist, or seize your vault. Those functions are deliberately absent from the code, with "REMOVED — non-custodial" comments left in their place for auditor transparency.',
      'The protocol fee is hardcoded to 0% as an immutable constant. No governance vote can change it.',
    ],
  },
  {
    icon: Key,
    color: 'amber',
    title: 'Wallet and key safety',
    items: [
      'Use a hardware wallet (Ledger, Trezor) for long-term or large-balance storage.',
      'Never share your 12-word seed phrase with anyone — not with VFIDE support, not with a wallet app, not with a "recovery" service.',
      'Verify the URL before connecting your wallet. Bookmark app.vfide.io directly.',
      'VFIDE will never send you a DM asking for your seed phrase or private key.',
    ],
  },
  {
    icon: Users,
    color: 'blue',
    title: 'Guardian Recovery',
    items: [
      'Set up at least 3 Guardians before you need them — trusted contacts who co-sign a recovery claim if you lose wallet access.',
      'The recovery process has a mandatory challenge period so you can cancel it if your key reappears.',
      'Keep your Guardian list current — a Guardian who loses their own key cannot help you.',
      'Recovery is on-chain and verifiable; no customer support team is involved.',
    ],
  },
  {
    icon: AlertTriangle,
    color: 'rose',
    title: 'Common attack vectors to know',
    items: [
      'Phishing sites mimic the VFIDE UI. Always check the URL. Legitimate VFIDE pages never ask for your seed phrase.',
      'Approval scams: a malicious site may ask you to "approve" a contract that drains your vault. Read the approval amount before signing.',
      'Fake support: VFIDE support does not operate via Telegram DMs, WhatsApp, or Discord cold outreach.',
      'QR code swaps: verify payment QR codes in-app, not via third-party scanners, to prevent address substitution.',
    ],
  },
  {
    icon: ShieldCheck,
    color: 'violet',
    title: 'Protocol-level safeguards',
    items: [
      'The Seer system can flag high-risk wallets and block transfers at the token level — protecting all users from on-chain contagion.',
      'EmergencyControl allows the guardian committee to pause the protocol in a crisis; it cannot move user funds.',
      'All critical admin operations go through AdminMultiSig with 3-of-5 council approval and a 48-hour timelock.',
      'After the 180-day SystemHandover period, developer admin keys are burned and governance transfers fully to the DAO.',
    ],
  },
];

const COLOR_MAP: Record<string, { border: string; bg: string; text: string }> = {
  emerald: { border: 'border-emerald-500/20', bg: 'bg-emerald-500/8',  text: 'text-emerald-400' },
  amber:   { border: 'border-amber-500/20',   bg: 'bg-amber-500/8',    text: 'text-amber-400'   },
  blue:    { border: 'border-blue-500/20',    bg: 'bg-blue-500/8',     text: 'text-blue-400'    },
  rose:    { border: 'border-rose-500/20',    bg: 'bg-rose-500/8',     text: 'text-rose-400'    },
  violet:  { border: 'border-violet-500/20',  bg: 'bg-violet-500/8',   text: 'text-violet-400'  },
};

export function SecurityTab() {
  return (
    <div className="space-y-5">
      {SECTIONS.map(({ icon: Icon, color, title, items }) => {
        const lookup = COLOR_MAP[color];
        const c = lookup ?? (COLOR_MAP['emerald'] as NonNullable<typeof lookup>);
        return (
          <div
            key={title}
            className={`rounded-2xl border ${c.border} ${c.bg} p-6`}
          >
            <h3 className="mb-3 flex items-center gap-2 text-lg font-bold text-white">
              <Icon size={16} className={c.text} aria-hidden="true" />
              {title}
            </h3>
            <ul className="space-y-2">
              {items.map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm text-gray-300">
                  <span className={`${c.text} mt-0.5 flex-shrink-0`} aria-hidden="true">•</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

'use client';

import { useMemo, useState } from 'react';

const FAQS = [
  {
    question: 'What is VFIDE?',
    answer:
      'VFIDE is a payments and financial services protocol built on blockchain. Merchants pay zero in processing fees — the protocol fee is hardcoded to 0% in an immutable smart contract, so no company can ever change it. You hold your own funds in a non-custodial CardBound Vault.',
  },
  {
    question: 'What is a CardBound Vault?',
    answer:
      'A CardBound Vault is a smart-contract wallet unique to you. Your funds live on-chain, not on a company server. VFIDE cannot freeze, seize, or access your vault — those functions are deliberately absent from the code. You recover access through a Guardian network you configure, not a customer support team.',
  },
  {
    question: 'What is ProofScore?',
    answer:
      'ProofScore is your on-chain reputation score. It starts at 0 and increases through on-time payments, vault activity, and community participation. Higher ProofScore earns you lower escrow fees, better loan terms in V2, and governance voting weight. The curve is immutable — no one can grant or remove reputation, only earn it.',
  },
  {
    question: 'How does escrow work?',
    answer:
      'CommerceEscrow locks buyer funds until the agreed delivery conditions are met. The merchant cannot access the funds early, and the buyer cannot claw them back without a dispute ruling. Disputes are resolved by Seer-verified arbiters. Escrow fees are based on your ProofScore — higher trust, lower cost.',
  },
  {
    question: 'What fees does VFIDE charge merchants?',
    answer:
      'Zero. The MerchantPortal protocol fee is a public constant (protocolFeeBps = 0) in the smart contract — not a setting that can be changed by the team, DAO, or any governance proposal. This is verified on-chain.',
  },
  {
    question: 'What is the Seer Constitution?',
    answer:
      'The Seer Constitution is a set of user rights enforced at the protocol level. The most important guarantees: (1) no entity can freeze, blacklist, or seize your funds — ever; (2) the merchant fee is permanently zero; (3) after a 180-day handover period, developer admin keys are burned and governance transfers to the DAO. These are enforced by code, not policy.',
  },
  {
    question: 'What happens if I lose access to my wallet?',
    answer:
      'You can recover vault access through the Guardian Recovery system. You designate trusted contacts as Guardians before you need them. If you lose your key, Guardians co-sign a VaultRecoveryClaim. There is a mandatory challenge period so you can cancel it if your key reappears, and a finalization grace period for final disputes. No customer support team is involved.',
  },
  {
    question: 'Is VFIDE a speculative investment or a utility token?',
    answer:
      'VFIDE is a utility token for a payments protocol, not a speculative asset. There is no yield-farming, no staking rewards designed to inflate price, and no promises about token value. The supply is fixed at 200 million. The project is built for the unbanked — people who need a working payment system, not a price chart.',
  },
];

export function FaqTab() {
  const [query, setQuery] = useState('');
  const filtered = useMemo(
    () =>
      FAQS.filter((faq) =>
        `${faq.question} ${faq.answer}`.toLowerCase().includes(query.toLowerCase())
      ),
    [query]
  );

  return (
    <div className="space-y-6">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search questions…"
        aria-label="Search FAQ"
        className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-accent/50"
      />
      {filtered.length === 0 ? (
        <p className="text-sm text-zinc-500 text-center py-4">No results for &ldquo;{query}&rdquo;</p>
      ) : (
        <div className="space-y-3">
          {filtered.map((faq) => (
            <div
              key={faq.question}
              className="rounded-2xl border border-white/10 bg-white/[0.03] p-5"
            >
              <h3 className="font-semibold text-white">{faq.question}</h3>
              <p className="mt-2 text-sm text-gray-400 leading-relaxed">{faq.answer}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

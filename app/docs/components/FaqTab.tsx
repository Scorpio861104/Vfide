'use client';

import { useMemo, useState } from 'react';

const FAQS = [
  { question: 'What is ProofScore?', answer: 'ProofScore measures your on-chain and community trust signals.' },
  { question: 'How does escrow work?', answer: 'Escrow locks funds until agreed conditions are met.' },
  { question: 'What is VFIDE?', answer: 'VFIDE is a zero-merchant-fee trust and payments protocol.' },
];

export function FaqTab() {
  const [query, setQuery] = useState('');
  const filtered = useMemo(() => FAQS.filter((faq) => `${faq.question} ${faq.answer}`.toLowerCase().includes(query.toLowerCase())), [query]);

  return (
    <div className="space-y-6">
      <input
        type="text"
        value={query}
        onChange={(event) =>  setQuery(event.target.value)}
       
        className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white "
      />
      <div className="space-y-3">
        {filtered.map((faq) => (
          <div key={faq.question} className="rounded-2xl border border-white/10 bg-white/3 p-5">
            <h3 className="font-semibold text-white">{faq.question}</h3>
            <p className="mt-2 text-gray-400">{faq.answer}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

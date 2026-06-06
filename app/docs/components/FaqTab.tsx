'use client';

import { useMemo, useState } from 'react';
import { useLocale } from '@/lib/locale/LocaleProvider';

const FAQ_COPY = {
  'en-US': {
    inputPlaceholder: 'Search frequently asked questions...',
    noResults: 'No matching FAQs found.',
    items: [
      { question: 'What is ProofScore?', answer: 'ProofScore measures your on-chain and community trust signals.' },
      { question: 'How does escrow work?', answer: 'Escrow locks funds until agreed conditions are met.' },
      { question: 'What is VFIDE?', answer: 'VFIDE is a zero-merchant-fee trust and payments protocol.' },
    ],
  },
  'es-ES': {
    inputPlaceholder: 'Buscar preguntas frecuentes...',
    noResults: 'No se encontraron preguntas coincidentes.',
    items: [
      { question: '¿Qué es ProofScore?', answer: 'ProofScore mide tus señales de confianza on-chain y de comunidad.' },
      { question: '¿Cómo funciona escrow?', answer: 'Escrow bloquea fondos hasta que se cumplan las condiciones acordadas.' },
      { question: '¿Qué es VFIDE?', answer: 'VFIDE es un protocolo de confianza y pagos sin comisiones para comerciantes.' },
    ],
  },
};

export function FaqTab() {
  const [query, setQuery] = useState('');
  const { locale } = useLocale();
  const copy = (FAQ_COPY as Record<string, typeof FAQ_COPY['en-US']>)[locale] ?? FAQ_COPY['en-US'];
  const filtered = useMemo(() => copy.items.filter((faq) => `${faq.question} ${faq.answer}`.toLowerCase().includes(query.toLowerCase())), [copy.items, query]);

  return (
    <div className="space-y-6">
      <input
        type="text"
        value={query}
        onChange={(event) =>  setQuery(event.target.value)}
        placeholder={copy.inputPlaceholder}
       
        className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white "
      />
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <p className="rounded-2xl border border-white/10 bg-white/3 p-5 text-gray-400">{copy.noResults}</p>
        ) : null}
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

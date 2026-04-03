'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';

// Content extracted from original docs page

export function FaqTab() {
  return (
    <div className="space-y-6">
      <motion.div
    key="faq"
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -20 }}
    >
    {/* Search */}
    <div className="max-w-xl mx-auto mb-8">
    <div className="relative">
    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
    <input
    type="text"
    placeholder="Search FAQ..."
    value={searchQuery}
    onChange={(e) => setSearchQuery(e.target.value)}
    className="w-full pl-12 pr-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-zinc-100 focus:border-cyan-400 focus:outline-none"
    />
    </div>
    </div>

    {/* FAQ Accordion */}
    <div className="max-w-3xl mx-auto space-y-6">
    {filteredFaqs.map((category) => (
    <div key={category.category}>
    <h3 className="text-xl font-bold text-cyan-400 mb-4">{category.category}</h3>
    <div className="space-y-2">
    {category.questions.map((faq, idx) => {
    const globalIdx = faqs.flatMap(c => c.questions).indexOf(faq);
    return (
    <div
    key={idx}
    className="bg-zinc-800 rounded-xl border border-zinc-700 overflow-hidden"
    >
    <button
    onClick={() => setOpenFaqIndex(openFaqIndex === globalIdx ? null : globalIdx)}
    className="w-full px-6 py-4 text-left flex items-center justify-between"
    >
    <span className="font-medium text-zinc-100">{faq.q}</span>
    <ChevronDown className={`w-5 h-5 text-zinc-400 transition-transform ${openFaqIndex === globalIdx ? "rotate-180" : ""}`} />
    </button>
    <AnimatePresence>
    {openFaqIndex === globalIdx && (
    <motion.div
    initial={{ height: 0, opacity: 0 }}
    animate={{ height: "auto", opacity: 1 }}
    exit={{ height: 0, opacity: 0 }}
    className="overflow-hidden"
    >
    <div className="px-6 pb-4 text-zinc-400">{faq.a}</div>
    </motion.div>
    )}
    </AnimatePresence>
    </div>
    );
    })}
    </div>
    </div>
    ))}
    </div>
    </motion.div>
    </div>
  );
}

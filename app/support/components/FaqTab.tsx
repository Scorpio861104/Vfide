'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';

// Content extracted from original support page

export function FaqTab() {
  return (
    <div className="space-y-6">
      <motion.div
    key="faq"
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -20 }}
    className="space-y-6"
  >
    {/* Search */}
    <div className="relative">
    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={20} />
    <input
    type="text"
    value={searchQuery}
    onChange={(e) => setSearchQuery(e.target.value)}
    placeholder={uiCopy.searchPlaceholder}
    className="w-full pl-12 pr-4 py-4 bg-zinc-900/50 border border-zinc-700 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:border-jade-500"
    />
    </div>

    {/* FAQ Categories */}
    {filteredFaq.map((category) => (
    <div key={category.category} className="bg-zinc-900/50 border border-zinc-700 rounded-xl overflow-hidden">
    <div className="p-4 border-b border-zinc-700 flex items-center gap-3">
    <category.icon className="text-jade-400" size={20} />
    <h3 className="font-semibold text-white">{category.category}</h3>
    </div>
    <div className="divide-y divide-zinc-800">
    {category.questions.map((item, idx) => {
    const id = `${category.category}-${idx}`;
    return (
    <div key={idx}>
    <button
    onClick={() => setExpandedFaq(expandedFaq === id ? null : id)}
    className="w-full p-4 text-left flex items-center justify-between hover:bg-zinc-800/50 transition-colors"
    >
    <span className="text-white pr-4">{item.q}</span>
    <ChevronDown
    size={20}
    className={`text-zinc-400 transition-transform shrink-0 ${
    expandedFaq === id ? 'rotate-180' : ''
    }`}
    />
    </button>
    <AnimatePresence>
    {expandedFaq === id && (
    <motion.div
    initial={{ height: 0, opacity: 0 }}
    animate={{ height: 'auto', opacity: 1 }}
    exit={{ height: 0, opacity: 0 }}
    className="overflow-hidden"
    >
    <p className="px-4 pb-4 text-zinc-400 text-sm leading-relaxed">
    {item.a}
    </p>
    </motion.div>
    )}
    </AnimatePresence>
    </div>
    );
    })}
    </div>
    </div>
    ))}

    {/* Still need help? */}
    <div className="p-6 bg-gradient-to-r from-jade-500/10 to-teal-500/10 border border-jade-500/30 rounded-xl text-center">
    <LifeBuoy className="text-jade-400 mx-auto mb-4" size={32} />
    <h3 className="text-lg font-semibold text-white mb-2">Still need help?</h3>
    <p className="text-zinc-400 mb-4">Can&apos;t find what you&apos;re looking for? Our support team is ready to assist.</p>
    <button
    onClick={() => setActiveTab('new')}
    className="px-6 py-3 bg-gradient-to-r from-jade-500 to-teal-500 text-black font-semibold rounded-lg"
    >
    Create Support Ticket
    </button>
    </div>
  </motion.div>
    </div>
  );
}

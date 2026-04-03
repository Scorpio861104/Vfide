'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';

// Content extracted from original docs page

export function OverviewTab() {
  return (
    <div className="space-y-6">
      <motion.div
    key="overview"
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -20 }}
    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
    >
    {docSections.map((section, idx) => (
    <motion.div
    key={section.title}
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: idx * 0.1 }}
    className="bg-zinc-800 rounded-xl p-6 border border-zinc-700 hover:border-cyan-400/50 transition-all"
    >
    <div className="flex items-center gap-3 mb-4">
    <div
    className="w-10 h-10 rounded-lg flex items-center justify-center"
    style={{ backgroundColor: `${section.color}20` }}
    >
    <section.icon className="w-5 h-5" style={{ color: section.color }} />
    </div>
    <h3 className="text-lg font-bold text-zinc-100">{section.title}</h3>
    </div>
    <div className="space-y-2">
    {section.links.map((link) => (
    <Link
    key={link.name}
    href={link.href}
    onClick={(e) => {
    if (link.href.startsWith("#")) {
    e.preventDefault();
    setActiveTab(link.href.slice(1) as DocTab);
    }
    }}
    className="block text-zinc-400 hover:text-cyan-400 transition-colors py-1"
    >
    <ChevronRight className="w-4 h-4 inline mr-1" />
    {link.name}
    </Link>
    ))}
    </div>
    </motion.div>
    ))}
    </motion.div>
    </div>
  );
}

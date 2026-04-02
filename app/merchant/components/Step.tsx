'use client';

import { motion } from 'framer-motion';

export function Step({ number, title, description }: { number: number; title: string; description: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true }}
      whileHover={{ x: 5 }}
      className="group flex items-start gap-4"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 font-bold text-white shadow-lg shadow-blue-500/20 transition-shadow group-hover:shadow-blue-500/40">
        {number}
      </div>
      <div>
        <h4 className="mb-1 font-semibold text-white">{title}</h4>
        <p className="text-sm text-gray-400">{description}</p>
      </div>
    </motion.div>
  );
}

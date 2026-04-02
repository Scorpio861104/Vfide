'use client';

import { motion } from 'framer-motion';
import { Zap } from 'lucide-react';

interface StepProps {
  number: number;
  title: string;
  description: string;
  time: string;
  index: number;
}

export function Step({ number, title, description, time, index }: StepProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -30 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6, delay: index * 0.15 }}
      className="group relative flex gap-6"
    >
      {index < 2 && (
        <div className="absolute top-16 bottom-0 left-7 w-px bg-gradient-to-b from-cyan-400/30 to-transparent" />
      )}

      <motion.div
        whileHover={{ scale: 1.1, rotate: 5 }}
        className="relative z-10 flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-500 text-xl font-bold text-zinc-950 shadow-[0_0_30px_rgba(0,240,255,0.3)]"
      >
        {number}
      </motion.div>

      <div className="flex-1 pb-8">
        <h2 className="mb-2 text-xl font-semibold text-zinc-50 transition-colors group-hover:text-cyan-400">
          {title}
        </h2>
        <p className="mb-3 leading-relaxed text-zinc-400">{description}</p>
        <div className="inline-flex items-center gap-2 text-sm font-medium text-cyan-400">
          <Zap className="h-4 w-4" />
          {time}
        </div>
      </div>
    </motion.div>
  );
}

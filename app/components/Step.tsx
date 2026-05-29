'use client';

import { m, LazyMotion, domAnimation } from 'framer-motion';
import { Clock } from 'lucide-react';

interface StepProps {
  number: number;
  title: string;
  description: string;
  time: string;
  index: number;
}

export function Step({ number, title, description, time, index }: StepProps) {
  return (
    <m.div
      initial={{ opacity: 0, x: -24 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.55, delay: index * 0.12 }}
      className="group relative flex gap-5 items-start"
    >
      {/* Vertical connector (except last step) */}
      {index < 2 && (
        <div
          className="step-connector"
          aria-hidden="true"
        />
      )}

      {/* Step number badge */}
      <m.div
        whileHover={{ scale: 1.08, rotate: 4 }}
        transition={{ type: 'spring', stiffness: 400, damping: 20 }}
        className="step-number-badge shrink-0"
      >
        {number}
      </m.div>

      {/* Content */}
      <div className="flex-1 pb-10 pt-1">
        <div className="flex items-start justify-between gap-4 mb-2">
          <h3 className="text-xl font-bold text-zinc-50 transition-colors group-hover:text-accent leading-snug">
            {title}
          </h3>
          <span className="shrink-0 inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-500 bg-white/4 border border-white/8 rounded-full px-3 py-1">
            <Clock size={11} />
            {time}
          </span>
        </div>
        <p className="leading-relaxed text-zinc-400 text-sm max-w-lg">
          {description}
        </p>
      </div>
    </m.div>
  );
}

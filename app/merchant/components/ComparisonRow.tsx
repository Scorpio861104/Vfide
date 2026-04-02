'use client';

import { Check } from 'lucide-react';
import { motion } from 'framer-motion';

const itemVariants = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0 },
} as const;

export function ComparisonRow({ 
  feature, 
  vfide, 
  stripe, 
  square, 
  paypal,
  isLast = false 
}: { 
  feature: string;
  vfide: string;
  stripe: string;
  square: string;
  paypal: string;
  isLast?: boolean;
}) {
  return (
    <motion.tr 
      variants={itemVariants}
      className={`${!isLast ? 'border-b border-white/5' : ''} group hover:bg-white/2 transition-colors`}
    >
      <td className="py-3 sm:py-4 px-2 sm:px-4 text-gray-300 font-medium text-sm">{feature}</td>
      <td className="py-3 sm:py-4 px-2 sm:px-4 text-center">
        <span className="inline-flex items-center gap-1.5 text-emerald-400 font-bold text-sm">
          {vfide === 'Yes' ? <Check className="w-4 h-4" /> : null}
          {vfide}
        </span>
      </td>
      <td className="py-3 sm:py-4 px-2 sm:px-4 text-center text-gray-500 text-sm">{stripe}</td>
      <td className="py-3 sm:py-4 px-2 sm:px-4 text-center text-gray-500 text-sm">{square}</td>
      <td className="py-3 sm:py-4 px-2 sm:px-4 text-center text-gray-500 text-sm">{paypal}</td>
    </motion.tr>
  );
}

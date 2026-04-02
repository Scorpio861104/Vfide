'use client';

import { motion } from 'framer-motion';

const scaleVariants = {
  hidden: { opacity: 0, scale: 0.96 },
  show: { opacity: 1, scale: 1 },
} as const;

export function FeatureCard({ 
  icon: Icon, 
  title, 
  description, 
  color,
  reduceMotion = false,
}: { 
  icon: React.ElementType; 
  title: string; 
  description: string; 
  color: 'green' | 'blue' | 'purple' | 'orange';
  reduceMotion?: boolean;
}) {
  const colorClasses = {
    green: { bg: 'from-emerald-500/20 to-green-500/10', border: 'border-emerald-500/30', text: 'text-emerald-400', glow: 'group-hover:shadow-emerald-500/20' },
    blue: { bg: 'from-blue-500/20 to-cyan-500/10', border: 'border-blue-500/30', text: 'text-blue-400', glow: 'group-hover:shadow-blue-500/20' },
    purple: { bg: 'from-purple-500/20 to-pink-500/10', border: 'border-purple-500/30', text: 'text-purple-400', glow: 'group-hover:shadow-purple-500/20' },
    orange: { bg: 'from-orange-500/20 to-amber-500/10', border: 'border-orange-500/30', text: 'text-orange-400', glow: 'group-hover:shadow-orange-500/20' },
  };

  const c = colorClasses[color];

  return (
    <motion.div
      variants={scaleVariants}
      whileHover={reduceMotion ? undefined : { y: -3, scale: 1.01 }}
      className={`group relative p-6 rounded-2xl bg-gradient-to-br ${c.bg} border ${c.border} backdrop-blur-xl transition-all duration-300 hover:shadow-xl ${c.glow}`}
    >
      {/* Glow effect */}
      <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${c.bg} opacity-0 group-hover:opacity-50 blur-xl transition-opacity duration-300`} />
      
      <div className="relative z-10 text-center">
        <div className={`w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br ${c.bg} border ${c.border} flex items-center justify-center`}>
          <Icon className={`w-8 h-8 ${c.text}`} />
        </div>
        <h3 className={`font-bold text-lg mb-2 ${c.text}`}>{title}</h3>
        <p className="text-sm text-gray-400 leading-relaxed">{description}</p>
      </div>
    </motion.div>
  );
}

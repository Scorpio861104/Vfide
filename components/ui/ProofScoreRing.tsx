'use client';

import { motion, useSpring, useTransform } from "framer-motion";
import { useEffect, useState } from "react";

interface ProofScoreRingProps {
  score: number;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  className?: string;
}

const sizeConfig = {
  sm: { outer: 80, stroke: 6, textSize: "text-lg", labelSize: "text-[10px]" },
  md: { outer: 120, stroke: 8, textSize: "text-3xl", labelSize: "text-xs" },
  lg: { outer: 180, stroke: 10, textSize: "text-5xl", labelSize: "text-sm" },
};

function getTierInfo(score: number) {
  if (score >= 8000) return { tier: "ELITE", color: "#FFD700", gradient: "from-amber-400 to-orange-500" };
  if (score >= 7000) return { tier: "VERIFIED", color: "#A78BFA", gradient: "from-violet-400 to-violet-500" };
  if (score >= 5000) return { tier: "TRUSTED", color: "#00FF88", gradient: "from-emerald-400 to-[#00CC6A]" };
  return { tier: "NEUTRAL", color: "#00F0FF", gradient: "from-cyan-400 to-blue-500" };
}

export function ProofScoreRing({ score, size = "md", showLabel = true, className = "" }: ProofScoreRingProps) {
  const config = sizeConfig[size];
  const radius = (config.outer - config.stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  
  const tierInfo = getTierInfo(score);
  const progress = Math.min(score / 10000, 1);
  
  const springProgress = useSpring(0, { stiffness: 50, damping: 20 });
  const dashOffset = useTransform(springProgress, (v) => circumference * (1 - v));
  
  const [displayScore, setDisplayScore] = useState(0);
  
  useEffect(() => {
    springProgress.set(progress);
  }, [progress, springProgress]);
  
  useEffect(() => {
    // Animate the number
    const duration = 1500;
    const startTime = Date.now();
    const startScore = displayScore;
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const p = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplayScore(Math.floor(startScore + (score - startScore) * eased));
      if (p < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
     
  }, [score]);
  
  return (
    <div className={`relative inline-flex items-center justify-center ${className}`}>
      {/* Glow effect */}
      <div 
        className="absolute rounded-full blur-2xl opacity-30"
        style={{
          width: config.outer * 0.8,
          height: config.outer * 0.8,
          background: tierInfo.color,
        }}
      />
      
      <svg 
        width={config.outer} 
        height={config.outer}
        className="transform -rotate-90"
      >
        {/* Background track */}
        <circle
          cx={config.outer / 2}
          cy={config.outer / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.05)"
          strokeWidth={config.stroke}
        />
        
        {/* Gradient definition */}
        <defs>
          <linearGradient id={`score-gradient-${size}`} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={tierInfo.color} />
            <stop offset="100%" stopColor={tierInfo.color} stopOpacity="0.6" />
          </linearGradient>
        </defs>
        
        {/* Progress arc */}
        <motion.circle
          cx={config.outer / 2}
          cy={config.outer / 2}
          r={radius}
          fill="none"
          stroke={`url(#score-gradient-${size})`}
          strokeWidth={config.stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          style={{ strokeDashoffset: dashOffset }}
        />
      </svg>
      
      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.div 
          className={`font-bold ${config.textSize}`}
          style={{ color: tierInfo.color }}
        >
          {displayScore.toLocaleString()}
        </motion.div>
        
        {showLabel && (
          <div 
            className={`${config.labelSize} font-semibold uppercase tracking-wider mt-1`}
            style={{ color: tierInfo.color, opacity: 0.8 }}
          >
            {tierInfo.tier}
          </div>
        )}
      </div>
    </div>
  );
}

interface ProofScoreCardProps {
  score: number;
  feeRate: number;
  className?: string;
}

export function ProofScoreCard({ score, feeRate, className = "" }: ProofScoreCardProps) {
  const tierInfo = getTierInfo(score);
  
  const breakdown = [
    { label: 'Base Score', value: 5000, icon: '📊' },
    { label: 'Vault Created', value: 500, icon: '🏦' },
    { label: 'Transactions', value: Math.min(Math.max(0, (score - 5500) * 0.4), 1500), icon: '💳' },
    { label: 'Governance', value: Math.min(250, Math.max(0, (score - 6000) * 0.2)), icon: '🗳️' },
    { label: 'Badges', value: Math.min(500, Math.max(0, (score - 6500) * 0.3)), icon: '🏆' },
  ];
  
  return (
    <div className={`glass-card rounded-2xl p-6 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-zinc-50">Your ProofScore</h3>
        <div 
          className="px-3 py-1 rounded-full text-xs font-bold"
          style={{ 
            background: `${tierInfo.color}20`,
            color: tierInfo.color,
            border: `1px solid ${tierInfo.color}40`
          }}
        >
          {feeRate.toFixed(2)}% Fee
        </div>
      </div>
      
      <div className="flex items-center gap-8">
        <ProofScoreRing score={score} size="lg" />
        
        <div className="flex-1 space-y-3">
          {breakdown.map((item, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="flex items-center justify-between text-sm"
            >
              <span className="flex items-center gap-2 text-zinc-400">
                <span>{item.icon}</span>
                {item.label}
              </span>
              <span className="font-medium text-zinc-50">
                +{Math.round(Math.max(0, item.value)).toLocaleString()}
              </span>
            </motion.div>
          ))}
        </div>
      </div>
      
      {/* Fee scale */}
      <div className="mt-6 pt-6 border-t border-zinc-800">
        <div className="flex justify-between text-xs text-zinc-500 mb-2">
          <span>5% fee</span>
          <span>0.25% fee</span>
        </div>
        <div className="relative h-2 bg-zinc-900 rounded-full overflow-hidden">
          <div 
            className="absolute inset-y-0 left-0 bg-gradient-to-r from-[#EF4444] via-[#FFD700] to-[#22C55E] rounded-full"
            style={{ width: `${(score / 10000) * 100}%` }}
          />
          <motion.div
            className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-lg"
            style={{ left: `calc(${(score / 10000) * 100}% - 6px)` }}
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        </div>
        <p className="text-xs text-zinc-500 mt-3 text-center">
          💡 Increase your score through governance, badges, and transactions
        </p>
      </div>
    </div>
  );
}

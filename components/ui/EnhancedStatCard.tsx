/**
 * Enhanced Stat Card Component
 * Beautiful statistics cards with animations
 */

import { motion } from "framer-motion";
import { ReactNode } from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface EnhancedStatCardProps {
  label: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon?: ReactNode;
  variant?: "default" | "gradient" | "glow";
  color?: "cyan" | "green" | "purple" | "gold";
}

const colorStyles = {
  cyan: {
    icon: "text-[#00F0FF]",
    bg: "from-[#00F0FF]/10 to-[#0080FF]/10",
    glow: "group-hover:shadow-[0_0_40px_rgba(0,240,255,0.3)]",
    border: "border-[#00F0FF]/30",
  },
  green: {
    icon: "text-emerald-400",
    bg: "from-emerald-500/10 to-green-500/10",
    glow: "group-hover:shadow-[0_0_40px_rgba(16,185,129,0.3)]",
    border: "border-emerald-500/30",
  },
  purple: {
    icon: "text-purple-400",
    bg: "from-purple-500/10 to-indigo-500/10",
    glow: "group-hover:shadow-[0_0_40px_rgba(167,139,250,0.3)]",
    border: "border-purple-500/30",
  },
  gold: {
    icon: "text-yellow-400",
    bg: "from-yellow-500/10 to-amber-500/10",
    glow: "group-hover:shadow-[0_0_40px_rgba(234,179,8,0.3)]",
    border: "border-yellow-500/30",
  },
};

export function EnhancedStatCard({
  label,
  value,
  change,
  changeLabel,
  icon,
  variant = "default",
  color = "cyan",
}: EnhancedStatCardProps) {
  const colors = colorStyles[color];
  
  const getTrendIcon = () => {
    if (change === undefined || change === 0) return <Minus className="w-4 h-4" />;
    return change > 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />;
  };

  const getTrendColor = () => {
    if (change === undefined || change === 0) return "text-[#8A8A8F]";
    return change > 0 ? "text-emerald-400" : "text-red-400";
  };

  return (
    <motion.div
      className={`
        group relative p-6 rounded-2xl border backdrop-blur-xl
        transition-all duration-300 hover:scale-[1.02] cursor-pointer
        ${variant === "gradient" ? `bg-linear-to-br ${colors.bg}` : "bg-[#0F0F12]/80"}
        ${variant === "glow" ? `${colors.border} ${colors.glow}` : "border-[#1F1F2A]"}
        hover:border-[${color === "cyan" ? "#00F0FF" : color === "green" ? "#10b981" : color === "purple" ? "#a78bfa" : "#eab308"}]/50
      `}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
    >
      {/* Background gradient glow */}
      <div className={`absolute inset-0 rounded-2xl bg-linear-to-br ${colors.bg} opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl`} />
      
      {/* Content */}
      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <span className="text-sm font-medium text-[#A8A8B3] uppercase tracking-wider">
            {label}
          </span>
          {icon && (
            <div className={`${colors.icon} opacity-80 group-hover:opacity-100 transition-opacity`}>
              {icon}
            </div>
          )}
        </div>

        {/* Value */}
        <div className="mb-3">
          <motion.div
            className="text-4xl font-bold text-[#F8F8FC]"
            initial={{ scale: 0.5 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200 }}
          >
            {value}
          </motion.div>
        </div>

        {/* Change indicator */}
        {change !== undefined && (
          <div className="flex items-center gap-2">
            <div className={`flex items-center gap-1 ${getTrendColor()}`}>
              {getTrendIcon()}
              <span className="text-sm font-semibold">
                {Math.abs(change)}%
              </span>
            </div>
            {changeLabel && (
              <span className="text-sm text-[#8A8A8F]">
                {changeLabel}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Shine effect */}
      <motion.div
        className="absolute inset-0 bg-linear-to-r from-transparent via-white/5 to-transparent pointer-events-none rounded-2xl"
        initial={{ x: "-100%" }}
        whileHover={{ x: "100%" }}
        transition={{ duration: 0.6, ease: "easeInOut" }}
      />
    </motion.div>
  );
}

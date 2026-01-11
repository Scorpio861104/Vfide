/**
 * Enhanced Badge Component
 * Premium badges with animations and effects
 */

import { motion } from "framer-motion";
import { ReactNode } from "react";
import { X } from "lucide-react";

interface EnhancedBadgeProps {
  children: ReactNode;
  variant?: "default" | "gradient" | "glow" | "outline" | "solid";
  color?: "cyan" | "green" | "red" | "purple" | "gold" | "gray";
  size?: "sm" | "md" | "lg";
  icon?: ReactNode;
  removable?: boolean;
  onRemove?: () => void;
  pulse?: boolean;
  className?: string;
}

export function EnhancedBadge({
  children,
  variant = "default",
  color = "cyan",
  size = "md",
  icon,
  removable = false,
  onRemove,
  pulse = false,
  className = "",
}: EnhancedBadgeProps) {
  
  const sizeStyles = {
    sm: "px-2 py-0.5 text-xs gap-1",
    md: "px-3 py-1 text-sm gap-1.5",
    lg: "px-4 py-1.5 text-base gap-2",
  };

  const colorMap = {
    cyan: {
      default: "bg-[#00F0FF]/10 text-[#00F0FF] border-[#00F0FF]/30",
      gradient: "bg-gradient-to-r from-[#00F0FF] to-[#0080FF] text-white",
      glow: "bg-[#00F0FF]/10 text-[#00F0FF] border-[#00F0FF]/50 shadow-[0_0_20px_rgba(0,240,255,0.4)]",
      outline: "bg-transparent text-[#00F0FF] border-[#00F0FF]",
      solid: "bg-[#00F0FF] text-[#0A0A0F] border-transparent",
    },
    green: {
      default: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
      gradient: "bg-gradient-to-r from-emerald-500 to-green-500 text-white",
      glow: "bg-emerald-500/10 text-emerald-400 border-emerald-500/50 shadow-[0_0_20px_rgba(16,185,129,0.4)]",
      outline: "bg-transparent text-emerald-400 border-emerald-400",
      solid: "bg-emerald-500 text-white border-transparent",
    },
    red: {
      default: "bg-red-500/10 text-red-400 border-red-500/30",
      gradient: "bg-gradient-to-r from-red-500 to-rose-500 text-white",
      glow: "bg-red-500/10 text-red-400 border-red-500/50 shadow-[0_0_20px_rgba(239,68,68,0.4)]",
      outline: "bg-transparent text-red-400 border-red-400",
      solid: "bg-red-500 text-white border-transparent",
    },
    purple: {
      default: "bg-purple-500/10 text-purple-400 border-purple-500/30",
      gradient: "bg-gradient-to-r from-purple-500 to-indigo-500 text-white",
      glow: "bg-purple-500/10 text-purple-400 border-purple-500/50 shadow-[0_0_20px_rgba(167,139,250,0.4)]",
      outline: "bg-transparent text-purple-400 border-purple-400",
      solid: "bg-purple-500 text-white border-transparent",
    },
    gold: {
      default: "bg-yellow-500/10 text-yellow-400 border-yellow-500/30",
      gradient: "bg-gradient-to-r from-yellow-500 to-amber-500 text-white",
      glow: "bg-yellow-500/10 text-yellow-400 border-yellow-500/50 shadow-[0_0_20px_rgba(234,179,8,0.4)]",
      outline: "bg-transparent text-yellow-400 border-yellow-400",
      solid: "bg-yellow-500 text-white border-transparent",
    },
    gray: {
      default: "bg-[#2A2A35]/50 text-[#A8A8B3] border-[#2A2A35]",
      gradient: "bg-gradient-to-r from-[#2A2A35] to-[#1F1F2A] text-[#F8F8FC]",
      glow: "bg-[#2A2A35]/50 text-[#A8A8B3] border-[#2A2A35] shadow-[0_0_20px_rgba(138,138,143,0.2)]",
      outline: "bg-transparent text-[#A8A8B3] border-[#A8A8B3]",
      solid: "bg-[#2A2A35] text-[#F8F8FC] border-transparent",
    },
  };

  const styles = colorMap[color][variant];

  return (
    <motion.span
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      className={`
        inline-flex items-center justify-center
        rounded-full font-medium border
        transition-all duration-200
        ${sizeStyles[size]}
        ${styles}
        ${pulse ? "animate-glow-pulse" : ""}
        ${className}
      `}
    >
      {/* Icon */}
      {icon && (
        <span className="flex-shrink-0">
          {icon}
        </span>
      )}
      
      {/* Text */}
      <span>{children}</span>
      
      {/* Remove button */}
      {removable && (
        <button
          onClick={onRemove}
          className="flex-shrink-0 ml-1 hover:opacity-70 transition-opacity"
        >
          <X className="w-3 h-3" />
        </button>
      )}

      {/* Pulse dot for notification badges */}
      {pulse && (
        <span className="absolute -top-1 -right-1 w-2 h-2">
          <span className="absolute inline-flex h-full w-full rounded-full bg-current opacity-75 animate-ping" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-current" />
        </span>
      )}
    </motion.span>
  );
}

// Preset badge variants for common use cases
export function SuccessBadge({ children, ...props }: Omit<EnhancedBadgeProps, "color" | "variant">) {
  return <EnhancedBadge color="green" variant="glow" {...props}>{children}</EnhancedBadge>;
}

export function ErrorBadge({ children, ...props }: Omit<EnhancedBadgeProps, "color" | "variant">) {
  return <EnhancedBadge color="red" variant="glow" {...props}>{children}</EnhancedBadge>;
}

export function InfoBadge({ children, ...props }: Omit<EnhancedBadgeProps, "color" | "variant">) {
  return <EnhancedBadge color="cyan" variant="glow" {...props}>{children}</EnhancedBadge>;
}

export function WarningBadge({ children, ...props }: Omit<EnhancedBadgeProps, "color" | "variant">) {
  return <EnhancedBadge color="gold" variant="glow" {...props}>{children}</EnhancedBadge>;
}

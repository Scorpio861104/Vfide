/**
 * Enhanced Progress Components
 * Beautiful progress bars and indicators
 */

import { motion } from "framer-motion";

interface EnhancedProgressBarProps {
  value: number;
  max?: number;
  label?: string;
  showValue?: boolean;
  variant?: "default" | "gradient" | "glow" | "striped";
  color?: "cyan" | "green" | "purple" | "gold";
  size?: "sm" | "md" | "lg";
  animated?: boolean;
}

const colorStyles = {
  cyan: {
    bg: "bg-[#00F0FF]/20",
    fill: "bg-[#00F0FF]",
    gradient: "bg-linear-to-r from-[#00F0FF] to-[#0080FF]",
    glow: "shadow-[0_0_20px_rgba(0,240,255,0.5)]",
  },
  green: {
    bg: "bg-emerald-500/20",
    fill: "bg-emerald-500",
    gradient: "bg-linear-to-r from-emerald-500 to-green-500",
    glow: "shadow-[0_0_20px_rgba(16,185,129,0.5)]",
  },
  purple: {
    bg: "bg-purple-500/20",
    fill: "bg-purple-500",
    gradient: "bg-linear-to-r from-purple-500 to-indigo-500",
    glow: "shadow-[0_0_20px_rgba(167,139,250,0.5)]",
  },
  gold: {
    bg: "bg-yellow-500/20",
    fill: "bg-yellow-500",
    gradient: "bg-linear-to-r from-yellow-500 to-amber-500",
    glow: "shadow-[0_0_20px_rgba(234,179,8,0.5)]",
  },
};

const sizeStyles = {
  sm: "h-1.5",
  md: "h-2.5",
  lg: "h-4",
};

export function EnhancedProgressBar({
  value,
  max = 100,
  label,
  showValue = true,
  variant = "default",
  color = "cyan",
  size = "md",
  animated = true,
}: EnhancedProgressBarProps) {
  const percentage = Math.min((value / max) * 100, 100);
  const colors = colorStyles[color];

  return (
    <div className="w-full">
      {/* Label and value */}
      {(label || showValue) && (
        <div className="flex items-center justify-between mb-2">
          {label && (
            <span className="text-sm font-medium text-[#A8A8B3]">
              {label}
            </span>
          )}
          {showValue && (
            <span className="text-sm font-semibold text-[#F8F8FC]">
              {value}/{max}
            </span>
          )}
        </div>
      )}

      {/* Progress bar */}
      <div className={`
        relative w-full rounded-full overflow-hidden
        ${colors.bg}
        ${sizeStyles[size]}
      `}>
        <motion.div
          className={`
            h-full rounded-full
            ${variant === "gradient" ? colors.gradient : colors.fill}
            ${variant === "glow" ? colors.glow : ""}
            ${variant === "striped" ? "bg-stripes" : ""}
            ${animated ? "transition-all duration-500" : ""}
          `}
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          {/* Shine effect */}
          {animated && (
            <motion.div
              className="absolute inset-0 bg-linear-to-r from-transparent via-white/30 to-transparent"
              initial={{ x: "-100%" }}
              animate={{ x: "200%" }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                repeatDelay: 1,
                ease: "easeInOut",
              }}
            />
          )}
        </motion.div>
      </div>
    </div>
  );
}

interface CircularProgressProps {
  value: number;
  max?: number;
  size?: number;
  strokeWidth?: number;
  color?: "cyan" | "green" | "purple" | "gold";
  showValue?: boolean;
  label?: string;
}

export function CircularProgress({
  value,
  max = 100,
  size = 120,
  strokeWidth = 8,
  color = "cyan",
  showValue = true,
  label,
}: CircularProgressProps) {
  const percentage = Math.min((value / max) * 100, 100);
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percentage / 100) * circumference;

  const colorMap = {
    cyan: "#00F0FF",
    green: "#10b981",
    purple: "#a78bfa",
    gold: "#eab308",
  };

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.1)"
          strokeWidth={strokeWidth}
        />
        
        {/* Progress circle */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={colorMap[color]}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1, ease: "easeInOut" }}
          style={{
            filter: `drop-shadow(0 0 8px ${colorMap[color]}80)`,
          }}
        />
      </svg>

      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {showValue && (
          <span className="text-2xl font-bold text-[#F8F8FC]">
            {Math.round(percentage)}%
          </span>
        )}
        {label && (
          <span className="text-xs text-[#8A8A8F] mt-1">
            {label}
          </span>
        )}
      </div>
    </div>
  );
}

interface StepProgressProps {
  currentStep: number;
  totalSteps: number;
  labels?: string[];
  color?: "cyan" | "green" | "purple" | "gold";
}

export function StepProgress({
  currentStep,
  totalSteps,
  labels,
  color = "cyan",
}: StepProgressProps) {
  const colors = colorStyles[color];

  return (
    <div className="w-full">
      <div className="flex items-center justify-between">
        {Array.from({ length: totalSteps }, (_, i) => {
          const stepNumber = i + 1;
          const isCompleted = stepNumber < currentStep;
          const isCurrent = stepNumber === currentStep;

          return (
            <div key={i} className="flex items-center flex-1 last:flex-initial">
              {/* Step indicator */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: i * 0.1 }}
                className="relative z-10"
              >
                <div
                  className={`
                    w-10 h-10 rounded-full flex items-center justify-center
                    font-semibold text-sm transition-all duration-300
                    ${isCompleted || isCurrent
                      ? `${colors.fill} text-white ${colors.glow}`
                      : "bg-[#1F1F2A] text-[#8A8A8F]"
                    }
                  `}
                >
                  {isCompleted ? "✓" : stepNumber}
                </div>
                {labels?.[i] && (
                  <span className="absolute top-12 left-1/2 -translate-x-1/2 whitespace-nowrap text-xs text-[#A8A8B3]">
                    {labels[i]}
                  </span>
                )}
              </motion.div>

              {/* Connector line */}
              {i < totalSteps - 1 && (
                <div className="flex-1 h-1 mx-2 bg-[#1F1F2A] rounded-full overflow-hidden">
                  <motion.div
                    className={colors.fill}
                    initial={{ width: 0 }}
                    animate={{ width: isCompleted ? "100%" : "0%" }}
                    transition={{ duration: 0.5, delay: i * 0.1 }}
                    style={{ height: "100%" }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

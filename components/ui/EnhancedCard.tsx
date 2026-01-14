/**
 * Enhanced Premium Card Component
 * Beautiful cards with glassmorphism and advanced effects
 */

import { motion, HTMLMotionProps } from "framer-motion";
import { ReactNode } from "react";

interface EnhancedCardProps extends Omit<HTMLMotionProps<"div">, "children"> {
  children: ReactNode;
  variant?: "default" | "glass" | "gradient" | "glow" | "elevated";
  hover?: boolean;
  padding?: "none" | "sm" | "md" | "lg" | "xl";
  glow?: boolean;
  shine?: boolean;
}

export function EnhancedCard({
  children,
  variant = "default",
  hover = true,
  padding = "md",
  glow = false,
  shine = false,
  className = "",
  ...props
}: EnhancedCardProps) {
  
  const baseStyles = "relative rounded-2xl overflow-hidden transition-all duration-300";
  
  const variantStyles = {
    default: `
      bg-[#0F0F12] 
      border border-[#1F1F2A]
      ${hover ? "hover:border-[#00F0FF]/50 hover:shadow-[0_0_30px_rgba(0,240,255,0.1)]" : ""}
    `,
    glass: `
      bg-white/5 
      backdrop-blur-xl 
      border border-white/10
      ${hover ? "hover:bg-white/10 hover:border-white/20 hover:shadow-[0_8px_32px_rgba(0,240,255,0.15)]" : ""}
    `,
    gradient: `
      bg-linear-to-br from-[#1A1A1F] to-[#0F0F12]
      border border-[#2A2A35]
      ${hover ? "hover:from-[#1F1F2A] hover:to-[#0F0F12] hover:border-[#00F0FF]/30" : ""}
    `,
    glow: `
      bg-[#0A0A0F]
      border border-[#00F0FF]/30
      shadow-[0_0_20px_rgba(0,240,255,0.2),inset_0_0_20px_rgba(0,240,255,0.05)]
      ${hover ? "hover:shadow-[0_0_40px_rgba(0,240,255,0.3),inset_0_0_30px_rgba(0,240,255,0.1)] hover:border-[#00F0FF]/50" : ""}
    `,
    elevated: `
      bg-[#16161D]
      border border-[#2A2A35]
      shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)]
      ${hover ? "hover:shadow-[0_30px_80px_-15px_rgba(0,240,255,0.2)] hover:translate-y-[-4px]" : ""}
    `
  };
  
  const paddingStyles = {
    none: "p-0",
    sm: "p-4",
    md: "p-6",
    lg: "p-8",
    xl: "p-10"
  };

  return (
    <motion.div
      className={`
        ${baseStyles}
        ${variantStyles[variant]}
        ${paddingStyles[padding]}
        ${hover ? "hover:scale-[1.01]" : ""}
        ${className}
      `}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      {...props}
    >
      {/* Shine effect overlay */}
      {shine && (
        <motion.div
          className="absolute inset-0 bg-linear-to-r from-transparent via-white/5 to-transparent pointer-events-none"
          initial={{ x: "-100%" }}
          whileHover={{ x: "100%" }}
          transition={{ duration: 0.8, ease: "easeInOut" }}
        />
      )}
      
      {/* Glow effect */}
      {glow && (
        <div className="absolute inset-0 bg-gradient-radial from-[#00F0FF]/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
      )}
      
      {/* Border gradient animation */}
      <div className="absolute inset-0 rounded-2xl opacity-0 hover:opacity-100 transition-opacity duration-500 pointer-events-none">
        <div className="absolute inset-0 rounded-2xl bg-linear-to-r from-[#00F0FF] via-[#0080FF] to-[#00F0FF] opacity-20 blur-sm" />
      </div>
      
      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>
    </motion.div>
  );
}

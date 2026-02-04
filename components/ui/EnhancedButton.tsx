/**
 * Enhanced Premium Button Component
 * Beautiful buttons with advanced animations and effects
 */

import { motion, HTMLMotionProps } from "framer-motion";
import { ReactNode } from "react";

interface EnhancedButtonProps extends Omit<HTMLMotionProps<"button">, "children"> {
  children: ReactNode;
  variant?: "primary" | "secondary" | "accent" | "glass" | "glow" | "gradient";
  size?: "sm" | "md" | "lg" | "xl";
  icon?: ReactNode;
  iconPosition?: "left" | "right";
  loading?: boolean;
  fullWidth?: boolean;
}

export function EnhancedButton({
  children,
  variant = "primary",
  size = "md",
  icon,
  iconPosition = "left",
  loading = false,
  fullWidth = false,
  disabled,
  className = "",
  ...props
}: EnhancedButtonProps) {
  
  const baseStyles = "relative font-semibold rounded-xl transition-all duration-300 overflow-hidden group";
  
  const variantStyles = {
    primary: `
      bg-gradient-to-br from-cyan-400 to-blue-500 
      text-zinc-950 
      hover:shadow-[0_0_30px_rgba(0,240,255,0.4)] 
      hover:scale-[1.02]
      active:scale-[0.98]
    `,
    secondary: `
      bg-zinc-900 
      text-zinc-50 
      border border-zinc-800 
      hover:border-cyan-400 
      hover:bg-zinc-800
      hover:shadow-[0_0_20px_rgba(0,240,255,0.2)]
    `,
    accent: `
      bg-gradient-to-r from-fuchsia-500 via-cyan-400 to-blue-500
      text-white
      hover:shadow-[0_0_40px_rgba(255,0,245,0.5)]
      hover:scale-[1.02]
      active:scale-[0.98]
    `,
    glass: `
      bg-white/5 
      backdrop-blur-xl 
      border border-white/10 
      text-zinc-50
      hover:bg-white/10 
      hover:border-white/20
      hover:shadow-[0_8px_32px_rgba(0,240,255,0.15)]
    `,
    glow: `
      bg-zinc-950 
      text-cyan-400 
      border border-cyan-400/50
      shadow-[0_0_20px_rgba(0,240,255,0.3),inset_0_0_20px_rgba(0,240,255,0.1)]
      hover:shadow-[0_0_40px_rgba(0,240,255,0.5),inset_0_0_30px_rgba(0,240,255,0.2)]
      hover:border-cyan-400
    `,
    gradient: `
      bg-gradient-to-r from-fuchsia-500 via-[#FF0080] to-fuchsia-500
      bg-[length:200%_100%]
      text-white
      hover:bg-[position:100%_0]
      hover:shadow-[0_0_30px_rgba(255,0,245,0.4)]
    `
  };
  
  const sizeStyles = {
    sm: "px-4 py-2 text-sm gap-2",
    md: "px-6 py-3 text-base gap-2.5",
    lg: "px-8 py-4 text-lg gap-3",
    xl: "px-10 py-5 text-xl gap-4"
  };

  return (
    <motion.button
      className={`
        ${baseStyles}
        ${variantStyles[variant]}
        ${sizeStyles[size]}
        ${fullWidth ? "w-full" : ""}
        ${disabled || loading ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
        flex items-center justify-center
        ${className}
      `}
      disabled={disabled || loading}
      whileTap={!disabled && !loading ? { scale: 0.98 } : {}}
      {...props}
    >
      {/* Shine effect overlay */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
        initial={{ x: "-100%" }}
        whileHover={{ x: "100%" }}
        transition={{ duration: 0.6, ease: "easeInOut" }}
      />
      
      {/* Content */}
      <span className="relative z-10 flex items-center gap-inherit">
        {loading ? (
          <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
            <circle 
              className="opacity-25" 
              cx="12" 
              cy="12" 
              r="10" 
              stroke="currentColor" 
              strokeWidth="4" 
              fill="none"
            />
            <path 
              className="opacity-75" 
              fill="currentColor" 
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        ) : (
          <>
            {icon && iconPosition === "left" && <span className="shrink-0">{icon}</span>}
            {children}
            {icon && iconPosition === "right" && <span className="shrink-0">{icon}</span>}
          </>
        )}
      </span>
      
      {/* Ripple effect on click */}
      <span className="absolute inset-0 rounded-xl overflow-hidden">
        <span className="absolute inset-0 bg-white/0 group-active:bg-white/10 transition-colors duration-200" />
      </span>
    </motion.button>
  );
}

/**
 * Enhanced Premium Input Component
 * Beautiful form inputs with advanced styling
 */

import { motion } from "framer-motion";
import { ReactNode, InputHTMLAttributes, TextareaHTMLAttributes, forwardRef } from "react";

interface EnhancedInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: ReactNode;
  iconPosition?: "left" | "right";
  variant?: "default" | "glass" | "glow";
}

export const EnhancedInput = forwardRef<HTMLInputElement, EnhancedInputProps>(
  ({ label, error, icon, iconPosition = "left", variant = "default", className = "", ...props }, ref) => {
    
    const variantStyles = {
      default: `
        bg-[#0F0F12] 
        border border-[#1F1F2A]
        focus:border-[#00F0FF]/50 
        focus:shadow-[0_0_20px_rgba(0,240,255,0.2)]
      `,
      glass: `
        bg-white/5 
        backdrop-blur-xl 
        border border-white/10
        focus:bg-white/10 
        focus:border-white/20
        focus:shadow-[0_0_20px_rgba(0,240,255,0.15)]
      `,
      glow: `
        bg-[#0A0A0F] 
        border border-[#00F0FF]/30
        shadow-[0_0_10px_rgba(0,240,255,0.1),inset_0_0_10px_rgba(0,240,255,0.05)]
        focus:border-[#00F0FF]/50
        focus:shadow-[0_0_30px_rgba(0,240,255,0.3),inset_0_0_20px_rgba(0,240,255,0.1)]
      `
    };

    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-[#F8F8FC] mb-2">
            {label}
          </label>
        )}
        
        <div className="relative">
          {icon && iconPosition === "left" && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8A8A8F]">
              {icon}
            </div>
          )}
          
          <input
            ref={ref}
            className={`
              w-full px-4 py-3 rounded-xl
              text-[#F8F8FC] placeholder:text-[#5A5A5F]
              transition-all duration-300
              outline-none
              ${variantStyles[variant]}
              ${icon && iconPosition === "left" ? "pl-11" : ""}
              ${icon && iconPosition === "right" ? "pr-11" : ""}
              ${error ? "border-red-500/50 focus:border-red-500" : ""}
              ${className}
            `}
            {...props}
          />
          
          {icon && iconPosition === "right" && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8A8A8F]">
              {icon}
            </div>
          )}
        </div>
        
        {error && (
          <motion.p
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-1.5 text-sm text-red-400"
          >
            {error}
          </motion.p>
        )}
      </div>
    );
  }
);

EnhancedInput.displayName = "EnhancedInput";

interface EnhancedTextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  variant?: "default" | "glass" | "glow";
}

export const EnhancedTextarea = forwardRef<HTMLTextAreaElement, EnhancedTextareaProps>(
  ({ label, error, variant = "default", className = "", ...props }, ref) => {
    
    const variantStyles = {
      default: `
        bg-[#0F0F12] 
        border border-[#1F1F2A]
        focus:border-[#00F0FF]/50 
        focus:shadow-[0_0_20px_rgba(0,240,255,0.2)]
      `,
      glass: `
        bg-white/5 
        backdrop-blur-xl 
        border border-white/10
        focus:bg-white/10 
        focus:border-white/20
        focus:shadow-[0_0_20px_rgba(0,240,255,0.15)]
      `,
      glow: `
        bg-[#0A0A0F] 
        border border-[#00F0FF]/30
        shadow-[0_0_10px_rgba(0,240,255,0.1),inset_0_0_10px_rgba(0,240,255,0.05)]
        focus:border-[#00F0FF]/50
        focus:shadow-[0_0_30px_rgba(0,240,255,0.3),inset_0_0_20px_rgba(0,240,255,0.1)]
      `
    };

    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-[#F8F8FC] mb-2">
            {label}
          </label>
        )}
        
        <textarea
          ref={ref}
          className={`
            w-full px-4 py-3 rounded-xl
            text-[#F8F8FC] placeholder:text-[#5A5A5F]
            transition-all duration-300
            outline-none
            resize-none
            ${variantStyles[variant]}
            ${error ? "border-red-500/50 focus:border-red-500" : ""}
            ${className}
          `}
          {...props}
        />
        
        {error && (
          <motion.p
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-1.5 text-sm text-red-400"
          >
            {error}
          </motion.p>
        )}
      </div>
    );
  }
);

EnhancedTextarea.displayName = "EnhancedTextarea";

interface EnhancedSelectProps extends InputHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: Array<{ value: string; label: string }>;
  variant?: "default" | "glass" | "glow";
}

export const EnhancedSelect = forwardRef<HTMLSelectElement, EnhancedSelectProps>(
  ({ label, error, options, variant = "default", className = "", ...props }, ref) => {
    
    const variantStyles = {
      default: `
        bg-[#0F0F12] 
        border border-[#1F1F2A]
        focus:border-[#00F0FF]/50 
        focus:shadow-[0_0_20px_rgba(0,240,255,0.2)]
      `,
      glass: `
        bg-white/5 
        backdrop-blur-xl 
        border border-white/10
        focus:bg-white/10 
        focus:border-white/20
        focus:shadow-[0_0_20px_rgba(0,240,255,0.15)]
      `,
      glow: `
        bg-[#0A0A0F] 
        border border-[#00F0FF]/30
        shadow-[0_0_10px_rgba(0,240,255,0.1),inset_0_0_10px_rgba(0,240,255,0.05)]
        focus:border-[#00F0FF]/50
        focus:shadow-[0_0_30px_rgba(0,240,255,0.3),inset_0_0_20px_rgba(0,240,255,0.1)]
      `
    };

    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-[#F8F8FC] mb-2">
            {label}
          </label>
        )}
        
        <select
          ref={ref}
          className={`
            w-full px-4 py-3 rounded-xl
            text-[#F8F8FC]
            transition-all duration-300
            outline-none
            cursor-pointer
            ${variantStyles[variant]}
            ${error ? "border-red-500/50 focus:border-red-500" : ""}
            ${className}
          `}
          {...props}
        >
          {options.map((option) => (
            <option 
              key={option.value} 
              value={option.value}
              className="bg-[#0F0F12] text-[#F8F8FC]"
            >
              {option.label}
            </option>
          ))}
        </select>
        
        {error && (
          <motion.p
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-1.5 text-sm text-red-400"
          >
            {error}
          </motion.p>
        )}
      </div>
    );
  }
);

EnhancedSelect.displayName = "EnhancedSelect";

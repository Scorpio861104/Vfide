'use client';

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Lightbulb } from "lucide-react";
import { safeLocalStorage } from "@/lib/utils";

interface FeatureTooltipProps {
  id: string;
  title: string;
  description: string;
  position?: "top" | "bottom" | "left" | "right";
  arrow?: boolean;
  onClose?: () => void;
  autoShow?: boolean;
  delay?: number;
}

export function FeatureTooltip({
  id,
  title,
  description,
  position = "top",
  arrow = true,
  onClose,
  autoShow = true,
  delay = 1000
}: FeatureTooltipProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if this tooltip has been dismissed before
    const dismissedTooltips = JSON.parse(
      safeLocalStorage.getItem("vfide_dismissed_tooltips") || "[]"
    );

    if (!dismissedTooltips.includes(id) && autoShow) {
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, delay);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [id, autoShow, delay]);

  const handleClose = () => {
    setIsVisible(false);
    
    // Save to localStorage
    const dismissedTooltips = JSON.parse(
      safeLocalStorage.getItem("vfide_dismissed_tooltips") || "[]"
    );
    if (!dismissedTooltips.includes(id)) {
      dismissedTooltips.push(id);
      safeLocalStorage.setItem("vfide_dismissed_tooltips", JSON.stringify(dismissedTooltips));
    }
    
    onClose?.();
  };

  const positionClasses = {
    top: "bottom-full left-1/2 -translate-x-1/2 mb-2",
    bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
    left: "right-full top-1/2 -translate-y-1/2 mr-2",
    right: "left-full top-1/2 -translate-y-1/2 ml-2"
  };

  const arrowClasses = {
    top: "absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-8 border-transparent border-t-[#00F0FF]",
    bottom: "absolute bottom-full left-1/2 -translate-x-1/2 -mb-1 border-8 border-transparent border-b-[#00F0FF]",
    left: "absolute left-full top-1/2 -translate-y-1/2 -ml-1 border-8 border-transparent border-l-[#00F0FF]",
    right: "absolute right-full top-1/2 -translate-y-1/2 -mr-1 border-8 border-transparent border-r-[#00F0FF]"
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ duration: 0.2 }}
          className={`absolute ${positionClasses[position]} z-50 w-64`}
        >
          <div className="relative bg-gradient-to-br from-zinc-800 to-zinc-900 border-2 border-cyan-400 rounded-lg shadow-2xl p-4">
            {arrow && <div className={arrowClasses[position]} />}
            
            <div className="flex items-start gap-3">
              <div className="shrink-0 w-8 h-8 bg-cyan-400/20 rounded-full flex items-center justify-center">
                <Lightbulb size={16} className="text-cyan-400" />
              </div>
              
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-bold text-zinc-100 mb-1">
                  {title}
                </h4>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  {description}
                </p>
              </div>
              
              <button
                onClick={handleClose}
                className="shrink-0 text-zinc-400 hover:text-zinc-100 transition-colors"
                aria-label="Dismiss tooltip"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Hook to manage tooltip visibility
export function useFeatureTooltip(id: string) {
  // Initialize as false to avoid SSR hydration mismatch
  const [isVisible, setIsVisible] = useState(false);
  
  // Check localStorage after mount to avoid hydration issues
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        const dismissedTooltips = JSON.parse(
          safeLocalStorage.getItem("vfide_dismissed_tooltips") || "[]"
        );
        setIsVisible(!dismissedTooltips.includes(id));
      } catch {
        setIsVisible(true); // Default to showing tooltip if localStorage fails
      }
    }, 0);
    return () => clearTimeout(timer);
  }, [id]);

  const dismiss = () => {
    setIsVisible(false);
    try {
      const dismissedTooltips = JSON.parse(
        safeLocalStorage.getItem("vfide_dismissed_tooltips") || "[]"
      );
      if (!dismissedTooltips.includes(id)) {
        dismissedTooltips.push(id);
        safeLocalStorage.setItem("vfide_dismissed_tooltips", JSON.stringify(dismissedTooltips));
      }
    } catch {
      // Ignore localStorage errors (private browsing mode)
    }
  };

  const reset = () => {
    setIsVisible(true);
    try {
      const dismissedTooltips = JSON.parse(
        localStorage.getItem("vfide_dismissed_tooltips") || "[]"
      );
      const filtered = dismissedTooltips.filter((tooltipId: string) => tooltipId !== id);
      localStorage.setItem("vfide_dismissed_tooltips", JSON.stringify(filtered));
    } catch {
      // Ignore localStorage errors (private browsing mode)
    }
  };

  return { isVisible, dismiss, reset };
}

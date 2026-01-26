/**
 * Trust Level Theme System
 * Dynamic theme that shifts based on user's trust score
 * Low trust = cooler tones (blues), High trust = warmer accents (greens/golds)
 */

"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";

type TrustLevel = "new" | "low" | "fair" | "good" | "excellent";

interface TrustTheme {
  level: TrustLevel;
  score: number;
  colors: {
    primary: string;
    secondary: string;
    glow: string;
    gradient: string;
    background: string;
  };
  label: string;
  icon: string;
}

const trustThemes: Record<TrustLevel, Omit<TrustTheme, "score">> = {
  new: {
    level: "new",
    colors: {
      primary: "#6B7280",
      secondary: "#9CA3AF",
      glow: "rgba(107, 114, 128, 0.4)",
      gradient: "linear-gradient(135deg, #6B7280 0%, #9CA3AF 100%)",
      background: "radial-gradient(ellipse at 50% 50%, rgba(107, 114, 128, 0.05) 0%, transparent 50%)"
    },
    label: "New User",
    icon: "🌱"
  },
  low: {
    level: "low",
    colors: {
      primary: "#3B82F6",
      secondary: "#60A5FA",
      glow: "rgba(59, 130, 246, 0.4)",
      gradient: "linear-gradient(135deg, #3B82F6 0%, #60A5FA 100%)",
      background: "radial-gradient(ellipse at 50% 50%, rgba(59, 130, 246, 0.05) 0%, transparent 50%)"
    },
    label: "Building Trust",
    icon: "🔷"
  },
  fair: {
    level: "fair",
    colors: {
      primary: "#00D4FF",
      secondary: "#00FFB2",
      glow: "rgba(0, 212, 255, 0.4)",
      gradient: "linear-gradient(135deg, #00D4FF 0%, #00FFB2 100%)",
      background: "radial-gradient(ellipse at 50% 50%, rgba(0, 212, 255, 0.05) 0%, transparent 50%)"
    },
    label: "Fair Standing",
    icon: "💎"
  },
  good: {
    level: "good",
    colors: {
      primary: "#00FFB2",
      secondary: "#00FF88",
      glow: "rgba(0, 255, 178, 0.4)",
      gradient: "linear-gradient(135deg, #00FFB2 0%, #00FF88 100%)",
      background: "radial-gradient(ellipse at 50% 50%, rgba(0, 255, 178, 0.05) 0%, transparent 50%)"
    },
    label: "Good Standing",
    icon: "⭐"
  },
  excellent: {
    level: "excellent",
    colors: {
      primary: "#00FF88",
      secondary: "#FFD700",
      glow: "rgba(0, 255, 136, 0.5)",
      gradient: "linear-gradient(135deg, #00FF88 0%, #FFD700 100%)",
      background: "radial-gradient(ellipse at 50% 50%, rgba(0, 255, 136, 0.08) 0%, transparent 50%)"
    },
    label: "Excellent",
    icon: "🏆"
  }
};

function getTrustLevel(score: number): TrustLevel {
  if (score >= 80) return "excellent";
  if (score >= 60) return "good";
  if (score >= 40) return "fair";
  if (score >= 20) return "low";
  return "new";
}

function getTrustTheme(score: number): TrustTheme {
  const level = getTrustLevel(score);
  return {
    ...trustThemes[level],
    score
  };
}

interface TrustThemeContextType {
  theme: TrustTheme;
  setScore: (score: number) => void;
  applyTheme: () => void;
}

const TrustThemeContext = createContext<TrustThemeContextType | null>(null);

/**
 * Trust Theme Provider
 * Provides dynamic theming based on user's trust score
 */
export function TrustThemeProvider({ 
  children, 
  initialScore = 0 
}: { 
  children: ReactNode;
  initialScore?: number;
}) {
  const [theme, setTheme] = useState<TrustTheme>(() => getTrustTheme(initialScore));

  const setScore = (score: number) => {
    setTheme(getTrustTheme(score));
  };

  // Apply CSS custom properties based on trust level
  const applyTheme = () => {
    const root = document.documentElement;
    
    root.style.setProperty("--trust-primary", theme.colors.primary);
    root.style.setProperty("--trust-secondary", theme.colors.secondary);
    root.style.setProperty("--trust-glow", theme.colors.glow);
    root.style.setProperty("--trust-gradient", theme.colors.gradient);
    root.style.setProperty("--trust-background", theme.colors.background);
  };

  useEffect(() => {
    applyTheme();
  }, [theme]);

  return (
    <TrustThemeContext.Provider value={{ theme, setScore, applyTheme }}>
      {children}
    </TrustThemeContext.Provider>
  );
}

/**
 * Hook to access trust theme
 */
export function useTrustTheme() {
  const context = useContext(TrustThemeContext);
  if (!context) {
    // Return default theme if not in provider
    return {
      theme: getTrustTheme(0),
      setScore: () => {},
      applyTheme: () => {}
    };
  }
  return context;
}

/**
 * Trust Badge Component
 * Shows the user's trust level with appropriate styling
 */
export function TrustBadge({ 
  score, 
  showLabel = true,
  size = "md",
  className = "" 
}: { 
  score: number;
  showLabel?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const theme = getTrustTheme(score);
  
  const sizeClasses = {
    sm: "px-2 py-1 text-xs",
    md: "px-3 py-1.5 text-sm",
    lg: "px-4 py-2 text-base"
  };

  return (
    <div 
      className={`inline-flex items-center gap-2 rounded-full font-medium ${sizeClasses[size]} ${className}`}
      style={{
        background: theme.colors.gradient,
        color: theme.level === "excellent" ? "#0A0A0F" : "#fff",
        boxShadow: `0 0 20px -5px ${theme.colors.glow}`
      }}
    >
      <span>{theme.icon}</span>
      {showLabel && <span>{theme.label}</span>}
      <span className="opacity-80">{score}</span>
    </div>
  );
}

/**
 * Trust-Aware Card
 * Card that adapts its styling based on trust level
 */
export function TrustCard({ 
  children,
  trustScore,
  className = ""
}: { 
  children: ReactNode;
  trustScore: number;
  className?: string;
}) {
  const theme = getTrustTheme(trustScore);

  return (
    <div 
      className={`relative rounded-2xl p-6 bg-zinc-900 border overflow-hidden ${className}`}
      style={{
        borderColor: `${theme.colors.primary}30`,
        boxShadow: `0 0 40px -10px ${theme.colors.glow}`
      }}
    >
      {/* Trust level ambient glow */}
      <div 
        className="absolute inset-0 opacity-30 pointer-events-none"
        style={{ background: theme.colors.background }}
      />
      
      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
}

/**
 * Trust Progress Bar
 * Shows progress to next trust level
 */
export function TrustProgressBar({ 
  score,
  showMilestones = true,
  className = ""
}: { 
  score: number;
  showMilestones?: boolean;
  className?: string;
}) {
  const theme = getTrustTheme(score);
  const milestones = [0, 20, 40, 60, 80, 100];
  
  // Find next milestone
  const nextMilestone = milestones.find(m => m > score) || 100;
  const prevMilestone = milestones.filter(m => m <= score).pop() || 0;
  const _progressInLevel = ((score - prevMilestone) / (nextMilestone - prevMilestone)) * 100;

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Progress bar */}
      <div className="relative h-2 bg-zinc-800 rounded-full overflow-hidden">
        <div 
          className="absolute inset-y-0 left-0 rounded-full transition-all duration-500"
          style={{
            width: `${score}%`,
            background: theme.colors.gradient,
            boxShadow: `0 0 10px ${theme.colors.glow}`
          }}
        />
      </div>
      
      {/* Milestones */}
      {showMilestones && (
        <div className="flex justify-between">
          {milestones.map(milestone => (
            <div 
              key={milestone}
              className={`text-xs ${score >= milestone ? "text-zinc-400" : "text-zinc-600"}`}
            >
              {milestone}
            </div>
          ))}
        </div>
      )}
      
      {/* Next level info */}
      <div className="flex justify-between text-sm">
        <span className="text-zinc-400">
          {theme.icon} {theme.label}
        </span>
        <span className="text-zinc-500">
          {nextMilestone - score} points to next level
        </span>
      </div>
    </div>
  );
}

export { getTrustLevel, getTrustTheme, trustThemes };
export type { TrustLevel, TrustTheme };

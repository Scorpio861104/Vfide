"use client";

import { ReactNode } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export function SurfaceCard({
  children,
  variant = "default",
  interactive = true,
  className = "",
}: {
  children: ReactNode;
  variant?: "default" | "muted" | "glow";
  interactive?: boolean;
  className?: string;
}) {
  const base = {
    default: "bg-[#0F0F14]/90 border border-[#1F1F2A]",
    muted: "bg-[#0C0C10] border border-[#1A1A22]",
    glow: "bg-gradient-to-br from-[#0F1624] via-[#0B111C] to-[#0F0F14] border border-[#1F2A38] shadow-[0_20px_60px_-24px_rgba(0,240,255,0.35)]",
  }[variant];

  const Comp = interactive ? motion.div : "div";
  const motionProps = interactive
    ? { whileHover: { y: -4, scale: 1.01 }, transition: { type: "spring" as const, stiffness: 350, damping: 28 } }
    : {};

  return (
    <Comp
      {...motionProps}
      className={cn(
        "relative overflow-hidden rounded-2xl p-6",
        base,
        "backdrop-blur-xl",
        className
      )}
    >
      {children}
    </Comp>
  );
}

export function AccentBadge({ label, color = "cyan", className = "" }: { label: string; color?: "cyan" | "emerald" | "amber" | "purple"; className?: string }) {
  const palette = {
    cyan: "bg-[#00F0FF]/15 text-[#00F0FF] border border-[#00F0FF]/30",
    emerald: "bg-emerald-500/15 text-emerald-300 border border-emerald-400/30",
    amber: "bg-amber-500/15 text-amber-300 border border-amber-400/30",
    purple: "bg-purple-500/15 text-purple-300 border border-purple-400/30",
  }[color];
  return (
    <span className={cn("inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold", palette, className)}>
      <span className="w-2 h-2 rounded-full bg-current animate-pulse" />
      {label}
    </span>
  );
}

export function SectionHeading({
  title,
  subtitle,
  badge,
  badgeColor,
  align = "center",
  className = "",
  actions,
}: {
  title: string;
  subtitle?: string;
  badge?: string;
  badgeColor?: "cyan" | "emerald" | "amber" | "purple";
  align?: "center" | "left";
  className?: string;
  actions?: ReactNode;
}) {
  const badgeColorResolved = badgeColor || "cyan";
  return (
    <div className={cn("flex flex-col gap-3", align === "center" ? "text-center items-center" : "text-left", className)}>
      {badge && <AccentBadge label={badge} color={badgeColorResolved} />}
      <h1 className="text-3xl md:text-4xl lg:text-5xl font-[family-name:var(--font-display)] font-bold text-[#F8F8FC]">
        <span className="gradient-text">{title}</span>
      </h1>
      {subtitle && <p className="text-[#A0A0A5] text-base md:text-lg max-w-3xl">{subtitle}</p>}
      {actions && <div className="flex flex-wrap gap-3 mt-2">{actions}</div>}
    </div>
  );
}

"use client";

import { motion } from "framer-motion";
import { ReactNode } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

interface StatCardProps {
  icon: ReactNode;
  label: string;
  value: string | number;
  subValue?: string;
  color: string;
  href?: string;
  isLoading?: boolean;
  trend?: {
    value: number;
    label: string;
  };
}

export function StatCard({ 
  icon, 
  label, 
  value, 
  subValue, 
  color, 
  href,
  isLoading = false,
  trend
}: StatCardProps) {
  const content = (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={href ? { y: -4, scale: 1.02 } : undefined}
      className={`
        relative glass-card rounded-2xl p-5 overflow-hidden
        ${href ? 'cursor-pointer group' : ''}
      `}
    >
      {/* Top accent line */}
      <div 
        className="absolute top-0 left-0 right-0 h-px opacity-50"
        style={{ background: `linear-gradient(90deg, transparent, ${color}, transparent)` }}
      />
      
      {/* Glow effect on hover */}
      {href && (
        <div 
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
          style={{ 
            background: `radial-gradient(circle at center, ${color}10, transparent 70%)`
          }}
        />
      )}
      
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">{label}</span>
          <div 
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: `${color}15` }}
          >
            <div style={{ color }}>{icon}</div>
          </div>
        </div>
        
        {isLoading ? (
          <div className="space-y-2">
            <div className="h-8 w-24 bg-zinc-900 rounded animate-pulse" />
            <div className="h-4 w-16 bg-zinc-900 rounded animate-pulse" />
          </div>
        ) : (
          <>
            <div className="text-2xl font-bold text-zinc-50">{value}</div>
            {subValue && (
              <div className="text-sm text-zinc-500 mt-1 flex items-center gap-2">
                {subValue}
                {href && (
                  <ChevronRight 
                    className="w-4 h-4 group-hover:translate-x-1 transition-transform" 
                    style={{ color }}
                  />
                )}
              </div>
            )}
            {trend && (
              <div className={`text-xs mt-2 flex items-center gap-1 ${trend.value >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                <span>{trend.value >= 0 ? '↑' : '↓'}</span>
                <span>{Math.abs(trend.value)}% {trend.label}</span>
              </div>
            )}
          </>
        )}
      </div>
    </motion.div>
  );
  
  if (href) {
    return <Link href={href}>{content}</Link>;
  }
  
  return content;
}

interface QuickActionProps {
  icon: ReactNode;
  label: string;
  href: string;
  color: string;
  isPrimary?: boolean;
}

export function QuickAction({ icon, label, href, color, isPrimary = false }: QuickActionProps) {
  return (
    <Link href={href}>
      <motion.div
        whileHover={{ y: -4, scale: 1.05 }}
        whileTap={{ scale: 0.98 }}
        className={`
          relative p-5 rounded-2xl font-semibold flex flex-col items-center gap-3 text-center
          overflow-hidden transition-all duration-300
          ${isPrimary 
            ? 'bg-linear-to-br text-zinc-950 shadow-lg'
            : 'glass-card hover:border-opacity-100'
          }
        `}
        style={isPrimary ? {
          background: `linear-gradient(135deg, ${color}, ${color}CC)`,
          boxShadow: `0 8px 32px ${color}40`
        } : {
          borderColor: `${color}40`
        }}
      >
        {/* Shimmer effect on hover */}
        <div className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity duration-500 bg-linear-to-r from-transparent via-white/10 to-transparent -translate-x-full hover:translate-x-full" />
        
        <div 
          className={`relative z-10 ${isPrimary ? '' : ''}`}
          style={{ color: isPrimary ? '#0A0A0F' : color }}
        >
          {icon}
        </div>
        <span 
          className="relative z-10 text-sm"
          style={{ color: isPrimary ? '#0A0A0F' : '#F8F8FC' }}
        >
          {label}
        </span>
      </motion.div>
    </Link>
  );
}

interface NotificationItemProps {
  icon: ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
  color: string;
  isNew?: boolean;
}

export function NotificationItem({ 
  icon, 
  title, 
  description, 
  actionLabel, 
  actionHref, 
  color,
  isNew = false 
}: NotificationItemProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className="relative p-4 rounded-xl flex items-start gap-4 transition-colors hover:bg-zinc-900"
      style={{ 
        background: `${color}08`,
        border: `1px solid ${color}20`
      }}
    >
      {isNew && (
        <div 
          className="absolute top-3 right-3 w-2 h-2 rounded-full animate-pulse"
          style={{ background: color }}
        />
      )}
      
      <div 
        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: `${color}15`, color }}
      >
        {icon}
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-sm text-zinc-50">{title}</div>
        <div className="text-xs text-zinc-500 mt-1 line-clamp-2">{description}</div>
        {actionLabel && actionHref && (
          <Link 
            href={actionHref}
            className="inline-flex items-center gap-1 text-xs font-medium mt-2 hover:underline"
            style={{ color }}
          >
            {actionLabel}
            <ChevronRight className="w-3 h-3" />
          </Link>
        )}
      </div>
    </motion.div>
  );
}

interface ActivityItemProps {
  icon: ReactNode;
  action: string;
  details: string;
  value?: string;
  time: string;
  color: string;
}

export function ActivityItem({ icon, action, details, value, time, color }: ActivityItemProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center justify-between p-4 rounded-xl bg-zinc-900 hover:bg-zinc-900 transition-colors"
    >
      <div className="flex items-center gap-4">
        <div 
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: `${color}15`, color }}
        >
          {icon}
        </div>
        <div>
          <div className="font-medium text-sm text-zinc-50">{action}</div>
          <div className="text-xs text-zinc-500 flex items-center gap-2">
            {details}
            {value && (
              <span className="text-emerald-500">{value}</span>
            )}
          </div>
        </div>
      </div>
      <div className="text-xs text-zinc-600">{time}</div>
    </motion.div>
  );
}

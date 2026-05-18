'use client'

import { motion, useScroll, useTransform, useSpring } from 'framer-motion'
import { ReactNode, useRef } from 'react'

// =============================================================================
// PREMIUM PAGE WRAPPER - Creates beautiful immersive page experiences
// =============================================================================

interface PageWrapperProps {
  children: ReactNode
  variant?: 'default' | 'cosmic' | 'aurora' | 'matrix' | 'gradient'
  showGrid?: boolean
  showOrbs?: boolean
  className?: string
}

export function PageWrapper({ 
  children, 
  variant = 'default',
  showGrid = true,
  showOrbs = true,
  className = ''
}: PageWrapperProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({ target: containerRef })
  
  const backgroundY = useTransform(scrollYProgress, [0, 1], ['0%', '20%'])
  const springY = useSpring(backgroundY, { stiffness: 50, damping: 30 })

  const backgrounds: Record<string, string> = {
    default: 'bg-gradient-to-b from-zinc-900 via-[#0D0D0F] to-zinc-900',
    cosmic: 'bg-gradient-to-br from-[#0D0221] via-[#1A1A1D] to-[#0A0A12]',
    aurora: 'bg-gradient-to-br from-zinc-900 via-[#0D1520] to-[#0A1515]',
    matrix: 'bg-gradient-to-b from-[#0A1A0A] via-[#0D0D0F] to-[#0A120A]',
    gradient: 'bg-gradient-to-br from-[#1A1525] via-[#1A1A1D] to-[#15201A]',
  }

  return (
    <div 
      ref={containerRef}
      className={`min-h-screen relative overflow-hidden ${backgrounds[variant]} ${className}`}
    >
      {/* Animated background grid */}
      {showGrid && (
        <motion.div 
          style={{ y: springY }}
          className="absolute inset-0 grid-pattern opacity-30 pointer-events-none"
        />
      )}

      {/* Floating orbs */}
      {showOrbs && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <motion.div
            animate={{ 
              x: [0, 100, 0], 
              y: [0, -50, 0],
              scale: [1, 1.2, 1] 
            }}
            transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-20 -left-20 w-96 h-96 bg-cyan-400/5 rounded-full blur-3xl"
          />
          <motion.div
            animate={{ 
              x: [0, -80, 0], 
              y: [0, 60, 0],
              scale: [1, 1.3, 1] 
            }}
            transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }}
            className="absolute bottom-40 -right-20 w-80 h-80 bg-emerald-500/5 rounded-full blur-3xl"
          />
          <motion.div
            animate={{ 
              x: [0, 60, 0], 
              y: [0, -40, 0],
              scale: [1, 1.1, 1] 
            }}
            transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-1/2 left-1/3 w-64 h-64 bg-amber-400/6 rounded-full blur-3xl"
          />
          <motion.div
            animate={{ 
              x: [0, -40, 0], 
              y: [0, 30, 0],
              scale: [1, 1.15, 1] 
            }}
            transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-1/4 right-1/4 w-72 h-72 bg-amber-400/4 rounded-full blur-3xl"
          />
        </div>
      )}

      {/* Main content */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  )
}

// =============================================================================
// PREMIUM HEADER SECTION - Stunning page headers with gradients
// =============================================================================

interface PageHeaderProps {
  icon?: ReactNode
  iconGradient?: string
  title: string
  subtitle?: string
  badge?: string
  badgeColor?: string
  children?: ReactNode
}

export function PageHeader({ 
  icon, 
  iconGradient = 'from-cyan-400 to-cyan-600',
  title, 
  subtitle,
  badge,
  badgeColor = 'bg-cyan-400/20 text-cyan-400',
  children 
}: PageHeaderProps) {
  return (
    <motion.section 
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="py-12 md:py-16 border-b border-white/5"
    >
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="text-center">
          {/* Icon */}
          {icon && (
            <motion.div 
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className={`w-20 h-20 bg-gradient-to-br ${iconGradient} rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-cyan-400/20`}
            >
              {icon}
            </motion.div>
          )}

          {/* Badge */}
          {badge && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 }}
              className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full ${badgeColor} text-sm font-medium mb-4`}
            >
              <span className="w-2 h-2 rounded-full bg-current animate-pulse" />
              {badge}
            </motion.div>
          )}

          {/* Title */}
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-4xl md:text-5xl lg:text-6xl font-[family-name:var(--font-display)] font-bold mb-4"
          >
            <span className="gradient-text">{title}</span>
          </motion.h1>

          {/* Subtitle */}
          {subtitle && (
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-xl text-zinc-400 max-w-2xl mx-auto font-[family-name:var(--font-body)]"
            >
              {subtitle}
            </motion.p>
          )}

          {/* Additional content */}
          {children && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="mt-8"
            >
              {children}
            </motion.div>
          )}
        </div>
      </div>
    </motion.section>
  )
}

// =============================================================================
// PREMIUM STATS GRID - Beautiful animated statistics display
// =============================================================================

interface StatItemProps {
  label: string
  value: string | number
  icon?: ReactNode
  trend?: { value: number; isPositive: boolean }
  color?: string
  delay?: number
}

export function StatItem({ label, value, icon, trend, color = '#00F0FF', delay = 0 }: StatItemProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5 }}
      className="glass-card p-6 text-center group hover:border-cyan-400/30 transition-all duration-300"
    >
      {icon && (
        <div 
          className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3 transition-transform duration-300 group-hover:scale-110"
          style={{ backgroundColor: `${color}20` }}
        >
          <span style={{ color }}>{icon}</span>
        </div>
      )}
      <div className="text-3xl md:text-4xl font-bold text-zinc-100 mb-1">
        {value}
      </div>
      <div className="text-sm text-zinc-400">{label}</div>
      {trend && (
        <div className={`text-xs mt-2 ${trend.isPositive ? 'text-emerald-500' : 'text-red-500'}`}>
          {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%
        </div>
      )}
    </motion.div>
  )
}

interface StatsGridProps {
  stats: StatItemProps[]
  columns?: 2 | 3 | 4
  className?: string
}

export function StatsGrid({ stats, columns = 4, className = '' }: StatsGridProps) {
  const gridCols = {
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
  }

  return (
    <div className={`grid ${gridCols[columns]} gap-4 ${className}`}>
      {stats.map((stat, index) => (
        <StatItem key={stat.label} {...stat} delay={index * 0.1} />
      ))}
    </div>
  )
}

// =============================================================================
// PREMIUM GLASS CARD - Enhanced glass morphism cards
// =============================================================================

interface GlassCardProps {
  children: ReactNode
  className?: string
  gradient?: boolean
  glow?: string
  hover?: boolean
  onClick?: () => void
}

export function GlassCard({ 
  children, 
  className = '',
  gradient = false,
  glow,
  hover = true,
  onClick
}: GlassCardProps) {
  return (
    <motion.div
      whileHover={hover ? { y: -2, scale: 1.005 } : undefined}
      whileTap={onClick ? { scale: 0.98 } : undefined}
      onClick={onClick}
      className={`
        relative rounded-2xl backdrop-blur-xl 
        ${gradient 
          ? 'bg-gradient-to-br from-white/10 via-white/5 to-transparent' 
          : 'bg-white/5'
        }
        border border-white/10
        ${hover ? 'transition-all duration-300 hover:border-white/20 hover:bg-white/8' : ''}
        ${onClick ? 'cursor-pointer' : ''}
        ${className}
      `}
      style={glow ? {
        boxShadow: `0 0 40px ${glow}20, 0 4px 30px rgba(0,0,0,0.2)`
      } : undefined}
    >
      {children}
    </motion.div>
  )
}

// =============================================================================
// PREMIUM TAB NAVIGATION - Sleek animated tab switcher
// =============================================================================

interface Tab {
  id: string
  label: string
  icon?: ReactNode
  badge?: number
}

interface TabNavigationProps {
  tabs: Tab[]
  activeTab: string
  onChange: (tabId: string) => void
  variant?: 'pills' | 'underline' | 'cards'
  className?: string
}

export function TabNavigation({ 
  tabs, 
  activeTab, 
  onChange,
  variant = 'pills',
  className = '' 
}: TabNavigationProps) {
  if (variant === 'cards') {
    return (
      <div className={`flex flex-wrap gap-3 ${className}`}>
        {tabs.map((tab) => (
          <motion.button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className={`
              flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all duration-300
              ${activeTab === tab.id 
                ? 'bg-gradient-to-r from-cyan-400 to-cyan-600 text-black shadow-lg shadow-cyan-400/20' 
                : 'glass text-zinc-400 hover:text-zinc-100 hover:bg-white/10'
              }
            `}
          >
            {tab.icon}
            <span>{tab.label}</span>
            {tab.badge !== undefined && tab.badge > 0 && (
              <span className={`
                px-2 py-0.5 text-xs rounded-full
                ${activeTab === tab.id ? 'bg-black/20' : 'bg-cyan-400/20 text-cyan-400'}
              `}>
                {tab.badge}
              </span>
            )}
          </motion.button>
        ))}
      </div>
    )
  }

  if (variant === 'underline') {
    return (
      <div className={`border-b border-white/10 ${className}`}>
        <div className="flex gap-1 overflow-x-auto scrollbar-hide">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onChange(tab.id)}
              className={`
                relative flex items-center gap-2 px-6 py-4 font-medium transition-colors
                ${activeTab === tab.id ? 'text-cyan-400' : 'text-zinc-400 hover:text-zinc-100'}
              `}
            >
              {tab.icon}
              <span>{tab.label}</span>
              {tab.badge !== undefined && tab.badge > 0 && (
                <span className="px-2 py-0.5 text-xs rounded-full bg-cyan-400/20 text-cyan-400">
                  {tab.badge}
                </span>
              )}
              {activeTab === tab.id && (
                <motion.div
                  layoutId="activeTabUnderline"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-cyan-400 to-emerald-500"
                />
              )}
            </button>
          ))}
        </div>
      </div>
    )
  }

  // Pills variant (default)
  return (
    <div className={`inline-flex p-1 rounded-xl bg-white/5 backdrop-blur ${className}`}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={`
            relative flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium transition-all duration-300
            ${activeTab === tab.id ? 'text-black' : 'text-zinc-400 hover:text-zinc-100'}
          `}
        >
          {activeTab === tab.id && (
            <motion.div
              layoutId="activeTabPill"
              className="absolute inset-0 bg-gradient-to-r from-cyan-400 to-emerald-500 rounded-lg"
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
            />
          )}
          <span className="relative z-10 flex items-center gap-2">
            {tab.icon}
            {tab.label}
            {tab.badge !== undefined && tab.badge > 0 && (
              <span className={`
                px-2 py-0.5 text-xs rounded-full
                ${activeTab === tab.id ? 'bg-black/20' : 'bg-white/10'}
              `}>
                {tab.badge}
              </span>
            )}
          </span>
        </button>
      ))}
    </div>
  )
}

// =============================================================================
// PREMIUM SECTION CONTAINER - Consistent section spacing
// =============================================================================

interface SectionProps {
  children: ReactNode
  className?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
}

export function Section({ children, className = '', size = 'lg' }: SectionProps) {
  const maxWidths = {
    sm: 'max-w-3xl',
    md: 'max-w-4xl',
    lg: 'max-w-6xl',
    xl: 'max-w-7xl',
  }

  return (
    <section className={`py-8 md:py-12 ${className}`}>
      <div className={`container mx-auto px-4 ${maxWidths[size]}`}>
        {children}
      </div>
    </section>
  )
}

// =============================================================================
// PREMIUM EMPTY STATE - Beautiful placeholder when no data
// =============================================================================

interface EmptyStateProps {
  icon: ReactNode
  title: string
  description: string
  action?: {
    label: string
    onClick: () => void
  }
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="glass-card p-12 text-center"
    >
      <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6">
        <span className="text-zinc-400">{icon}</span>
      </div>
      <h3 className="text-xl font-semibold text-zinc-100 mb-2">{title}</h3>
      <p className="text-zinc-400 mb-6 max-w-md mx-auto">{description}</p>
      {action && (
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={action.onClick}
          className="btn-primary"
        >
          {action.label}
        </motion.button>
      )}
    </motion.div>
  )
}

// =============================================================================
// PREMIUM LOADING STATE - Elegant loading indicators
// =============================================================================

export function PageLoading() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-center"
      >
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-12 h-12 border-2 border-cyan-400/20 border-t-[#00F0FF] rounded-full mx-auto mb-4"
        />
        <p className="text-zinc-400">Loading...</p>
      </motion.div>
    </div>
  )
}

export function CardLoading() {
  return (
    <div className="glass-card p-6 animate-pulse">
      <div className="h-4 bg-white/10 rounded w-1/4 mb-4" />
      <div className="h-8 bg-white/10 rounded w-1/2 mb-2" />
      <div className="h-4 bg-white/10 rounded w-3/4" />
    </div>
  )
}

// =============================================================================
// PREMIUM FEATURE CARD - For showcasing features/benefits
// =============================================================================

interface FeatureCardProps {
  icon: ReactNode
  title: string
  description: string
  color?: string
  delay?: number
}

export function FeatureCard({ icon, title, description, color = '#00F0FF', delay = 0 }: FeatureCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      whileHover={{ y: -5 }}
      className="glass-card p-6 group"
    >
      <div 
        className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4 transition-transform duration-300 group-hover:scale-110"
        style={{ backgroundColor: `${color}15` }}
      >
        <span style={{ color }}>{icon}</span>
      </div>
      <h3 className="text-lg font-semibold text-zinc-100 mb-2">{title}</h3>
      <p className="text-zinc-400 text-sm leading-relaxed">{description}</p>
    </motion.div>
  )
}

// =============================================================================
// PREMIUM ACTION BAR - Fixed bottom action bar for mobile
// =============================================================================

interface ActionBarProps {
  children: ReactNode
  className?: string
}

export function ActionBar({ children, className = '' }: ActionBarProps) {
  return (
    <motion.div
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      className={`fixed bottom-0 left-0 right-0 p-4 glass border-t border-white/10 z-40 md:hidden ${className}`}
    >
      {children}
    </motion.div>
  )
}

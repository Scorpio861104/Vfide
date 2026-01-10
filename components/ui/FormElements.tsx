'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { ReactNode, useEffect } from 'react'
import { X } from 'lucide-react'

// =============================================================================
// PREMIUM MODAL - Beautiful animated modal dialogs
// =============================================================================

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  subtitle?: string
  children: ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
  showCloseButton?: boolean
}

export function Modal({ 
  isOpen, 
  onClose, 
  title, 
  subtitle,
  children, 
  size = 'md',
  showCloseButton = true 
}: ModalProps) {
  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  const sizes = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-[90vw]',
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50"
          />

          {/* Modal Container */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className={`
                w-full ${sizes[size]} max-h-[85vh] overflow-y-auto
                bg-linear-to-b from-[#2A2A2F] to-[#1A1A1D]
                border border-white/10 rounded-3xl shadow-2xl
                pointer-events-auto
              `}
            >
              {/* Header */}
              {(title || showCloseButton) && (
                <div className="sticky top-0 flex items-start justify-between p-6 pb-0 bg-linear-to-b from-[#2A2A2F] to-transparent z-10">
                  <div>
                    {title && (
                      <h2 className="text-2xl font-bold text-[#F5F3E8]">{title}</h2>
                    )}
                    {subtitle && (
                      <p className="text-[#A0A0A5] mt-1">{subtitle}</p>
                    )}
                  </div>
                  {showCloseButton && (
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={onClose}
                      className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-[#A0A0A5] hover:text-[#F5F3E8] transition-colors"
                    >
                      <X size={20} />
                    </motion.button>
                  )}
                </div>
              )}

              {/* Content */}
              <div className="p-6">
                {children}
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  )
}

// =============================================================================
// PREMIUM BUTTONS - Consistent button styling
// =============================================================================

interface ButtonProps {
  children: ReactNode
  onClick?: () => void
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'success'
  size?: 'sm' | 'md' | 'lg'
  disabled?: boolean
  loading?: boolean
  icon?: ReactNode
  iconPosition?: 'left' | 'right'
  fullWidth?: boolean
  className?: string
  type?: 'button' | 'submit' | 'reset'
}

export function Button({ 
  children, 
  onClick,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  icon,
  iconPosition = 'left',
  fullWidth = false,
  className = '',
  type = 'button'
}: ButtonProps) {
  const variants = {
    primary: 'bg-linear-to-r from-[#00F0FF] to-[#00A8B5] text-black hover:shadow-lg hover:shadow-[#00F0FF]/25',
    secondary: 'bg-white/10 text-[#F5F3E8] hover:bg-white/20 border border-white/10',
    ghost: 'bg-transparent text-[#A0A0A5] hover:text-[#F5F3E8] hover:bg-white/5',
    danger: 'bg-linear-to-r from-[#FF4444] to-[#CC3333] text-white hover:shadow-lg hover:shadow-[#FF4444]/25',
    success: 'bg-linear-to-r from-[#50C878] to-[#3DA55D] text-black hover:shadow-lg hover:shadow-[#50C878]/25',
  }

  const sizes = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-3 text-base',
    lg: 'px-8 py-4 text-lg',
  }

  return (
    <motion.button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      whileHover={!disabled && !loading ? { scale: 1.02 } : undefined}
      whileTap={!disabled && !loading ? { scale: 0.98 } : undefined}
      className={`
        inline-flex items-center justify-center gap-2 
        font-semibold rounded-xl transition-all duration-300
        ${variants[variant]}
        ${sizes[size]}
        ${fullWidth ? 'w-full' : ''}
        ${disabled || loading ? 'opacity-50 cursor-not-allowed' : ''}
        ${className}
      `}
    >
      {loading && (
        <motion.span
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-4 h-4 border-2 border-current border-t-transparent rounded-full"
        />
      )}
      {!loading && icon && iconPosition === 'left' && icon}
      {children}
      {!loading && icon && iconPosition === 'right' && icon}
    </motion.button>
  )
}

// =============================================================================
// PREMIUM INPUT - Styled form inputs
// =============================================================================

interface InputProps {
  label?: string
  placeholder?: string
  value: string
  onChange: (value: string) => void
  type?: 'text' | 'number' | 'email' | 'password'
  icon?: ReactNode
  error?: string
  hint?: string
  disabled?: boolean
  className?: string
}

export function Input({
  label,
  placeholder,
  value,
  onChange,
  type = 'text',
  icon,
  error,
  hint,
  disabled = false,
  className = ''
}: InputProps) {
  return (
    <div className={className}>
      {label && (
        <label className="block text-sm font-medium text-[#F5F3E8] mb-2">
          {label}
        </label>
      )}
      <div className="relative">
        {icon && (
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[#A0A0A5]">
            {icon}
          </div>
        )}
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className={`
            w-full px-4 py-3 ${icon ? 'pl-12' : ''}
            bg-white/5 border rounded-xl
            text-[#F5F3E8] placeholder-[#6A6A6F]
            focus:outline-none focus:ring-2 focus:ring-[#00F0FF]/50 focus:border-[#00F0FF]/50
            transition-all duration-300
            ${error ? 'border-[#FF4444]' : 'border-white/10 hover:border-white/20'}
            ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
          `}
        />
      </div>
      {error && (
        <p className="mt-2 text-sm text-[#FF4444]">{error}</p>
      )}
      {hint && !error && (
        <p className="mt-2 text-sm text-[#A0A0A5]">{hint}</p>
      )}
    </div>
  )
}

// =============================================================================
// PREMIUM SELECT - Styled dropdown select
// =============================================================================

interface SelectOption {
  value: string
  label: string
}

interface SelectProps {
  label?: string
  options: SelectOption[]
  value: string
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  className?: string
}

export function Select({
  label,
  options,
  value,
  onChange,
  placeholder = 'Select an option',
  disabled = false,
  className = ''
}: SelectProps) {
  return (
    <div className={className}>
      {label && (
        <label className="block text-sm font-medium text-[#F5F3E8] mb-2">
          {label}
        </label>
      )}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className={`
          w-full px-4 py-3
          bg-white/5 border border-white/10 rounded-xl
          text-[#F5F3E8]
          focus:outline-none focus:ring-2 focus:ring-[#00F0FF]/50 focus:border-[#00F0FF]/50
          transition-all duration-300
          hover:border-white/20
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
          appearance-none cursor-pointer
        `}
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23A0A0A5'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'right 1rem center',
          backgroundSize: '1rem',
        }}
      >
        <option value="" disabled className="bg-[#1A1A1D]">{placeholder}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value} className="bg-[#1A1A1D]">
            {option.label}
          </option>
        ))}
      </select>
    </div>
  )
}

// =============================================================================
// PREMIUM BADGE - Status/label badges
// =============================================================================

interface BadgeProps {
  children: ReactNode
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'premium'
  size?: 'sm' | 'md'
  pulse?: boolean
  className?: string
}

export function Badge({ 
  children, 
  variant = 'default',
  size = 'md',
  pulse = false,
  className = ''
}: BadgeProps) {
  const variants = {
    default: 'bg-white/10 text-[#A0A0A5]',
    success: 'bg-[#50C878]/20 text-[#50C878]',
    warning: 'bg-[#FFD700]/20 text-[#FFD700]',
    danger: 'bg-[#FF4444]/20 text-[#FF4444]',
    info: 'bg-[#00F0FF]/20 text-[#00F0FF]',
    premium: 'bg-linear-to-r from-[#FFD700]/20 to-[#FFA500]/20 text-[#FFD700]',
  }

  const sizes = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm',
  }

  return (
    <span className={`
      inline-flex items-center gap-1.5 font-medium rounded-full
      ${variants[variant]}
      ${sizes[size]}
      ${className}
    `}>
      {pulse && (
        <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
      )}
      {children}
    </span>
  )
}

// =============================================================================
// PREMIUM TOOLTIP - Helpful tooltips
// =============================================================================

interface TooltipProps {
  children: ReactNode
  content: string
  position?: 'top' | 'bottom' | 'left' | 'right'
}

export function Tooltip({ children, content, position = 'top' }: TooltipProps) {
  const positions = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  }

  return (
    <div className="relative group">
      {children}
      <div className={`
        absolute ${positions[position]} z-50
        px-3 py-2 rounded-lg
        bg-[#2A2A2F] border border-white/10
        text-sm text-[#F5F3E8]
        opacity-0 invisible group-hover:opacity-100 group-hover:visible
        transition-all duration-200
        whitespace-nowrap
        pointer-events-none
      `}>
        {content}
      </div>
    </div>
  )
}

// =============================================================================
// PREMIUM PROGRESS BAR - Animated progress indicators
// =============================================================================

interface ProgressBarProps {
  value: number
  max?: number
  label?: string
  showValue?: boolean
  color?: string
  size?: 'sm' | 'md' | 'lg'
  animated?: boolean
  className?: string
}

export function ProgressBar({
  value,
  max = 100,
  label,
  showValue = true,
  color = '#00F0FF',
  size = 'md',
  animated = true,
  className = ''
}: ProgressBarProps) {
  const percentage = Math.min((value / max) * 100, 100)
  
  const sizes = {
    sm: 'h-1',
    md: 'h-2',
    lg: 'h-3',
  }

  return (
    <div className={className}>
      {(label || showValue) && (
        <div className="flex justify-between items-center mb-2">
          {label && <span className="text-sm text-[#A0A0A5]">{label}</span>}
          {showValue && <span className="text-sm font-medium text-[#F5F3E8]">{percentage.toFixed(0)}%</span>}
        </div>
      )}
      <div className={`w-full bg-white/10 rounded-full overflow-hidden ${sizes[size]}`}>
        <motion.div
          initial={animated ? { width: 0 } : undefined}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 1, ease: "easeOut" }}
          className="h-full rounded-full"
          style={{ 
            backgroundColor: color,
            boxShadow: `0 0 10px ${color}50`
          }}
        />
      </div>
    </div>
  )
}

// =============================================================================
// PREMIUM ALERT - Notification/alert banners
// =============================================================================

interface AlertProps {
  children: ReactNode
  variant?: 'info' | 'success' | 'warning' | 'danger'
  title?: string
  icon?: ReactNode
  dismissible?: boolean
  onDismiss?: () => void
  className?: string
}

export function Alert({
  children,
  variant = 'info',
  title,
  icon,
  dismissible = false,
  onDismiss,
  className = ''
}: AlertProps) {
  const variants = {
    info: 'bg-[#00F0FF]/10 border-[#00F0FF]/30 text-[#00F0FF]',
    success: 'bg-[#50C878]/10 border-[#50C878]/30 text-[#50C878]',
    warning: 'bg-[#FFD700]/10 border-[#FFD700]/30 text-[#FFD700]',
    danger: 'bg-[#FF4444]/10 border-[#FF4444]/30 text-[#FF4444]',
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={`
        p-4 rounded-xl border
        ${variants[variant]}
        ${className}
      `}
    >
      <div className="flex items-start gap-3">
        {icon && <span className="shrink-0 mt-0.5">{icon}</span>}
        <div className="flex-1">
          {title && <h4 className="font-semibold mb-1">{title}</h4>}
          <div className="text-sm opacity-90">{children}</div>
        </div>
        {dismissible && (
          <button
            onClick={onDismiss}
            className="shrink-0 p-1 hover:bg-white/10 rounded transition-colors"
          >
            <X size={16} />
          </button>
        )}
      </div>
    </motion.div>
  )
}

// =============================================================================
// PREMIUM DIVIDER - Section dividers
// =============================================================================

interface DividerProps {
  label?: string
  className?: string
}

export function Divider({ label, className = '' }: DividerProps) {
  if (label) {
    return (
      <div className={`flex items-center gap-4 ${className}`}>
        <div className="flex-1 h-px bg-linear-to-r from-transparent via-white/20 to-transparent" />
        <span className="text-sm text-[#6A6A6F] font-medium">{label}</span>
        <div className="flex-1 h-px bg-linear-to-r from-transparent via-white/20 to-transparent" />
      </div>
    )
  }

  return (
    <div className={`h-px bg-linear-to-r from-transparent via-white/20 to-transparent ${className}`} />
  )
}

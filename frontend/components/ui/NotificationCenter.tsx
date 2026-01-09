/**
 * NotificationCenter - Bell icon with dropdown for notifications
 * Shows recent activity, pending actions, and system alerts
 */

'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bell, Vote, Gift, Shield, AlertTriangle, CheckCircle2, X } from 'lucide-react'
import Link from 'next/link'

interface Notification {
  id: string
  type: 'vote' | 'reward' | 'security' | 'alert' | 'success'
  title: string
  message: string
  time: string
  href?: string
  read: boolean
}

// Mock notifications - in production, these would come from an API or contract events
const mockNotifications: Notification[] = [
  {
    id: '1',
    type: 'vote',
    title: 'Active Proposal',
    message: 'Proposal #142: Treasury allocation ends in 5 hours',
    time: '5h',
    href: '/governance',
    read: false,
  },
  {
    id: '2',
    type: 'reward',
    title: 'Claimable Rewards',
    message: '467.50 VFIDE from payroll streams',
    time: '1d',
    href: '/payroll',
    read: false,
  },
  {
    id: '3',
    type: 'security',
    title: 'Guardian Request',
    message: '0x1a2b...3c4d wants you as guardian',
    time: '2d',
    href: '/vault',
    read: false,
  },
  {
    id: '4',
    type: 'success',
    title: 'Badge Unlocked',
    message: 'You earned the "Early Adopter" badge!',
    time: '3d',
    href: '/badges',
    read: true,
  },
]

const iconMap = {
  vote: Vote,
  reward: Gift,
  security: Shield,
  alert: AlertTriangle,
  success: CheckCircle2,
}

const colorMap = {
  vote: '#9B59B6',
  reward: '#50C878',
  security: '#00F0FF',
  alert: '#FF6B6B',
  success: '#50C878',
}

export function NotificationCenter() {
  const [isOpen, setIsOpen] = useState(false)
  const [notifications, setNotifications] = useState(mockNotifications)
  
  const unreadCount = notifications.filter(n => !n.read).length

  const markAsRead = (id: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    )
  }

  const markAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
  }

  const dismiss = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id))
  }

  return (
    <div className="relative">
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-[#A0A0A5] hover:text-[#F5F3E8] transition-colors"
        aria-label="Notifications"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-[#FF6B6B] text-white text-xs font-bold rounded-full flex items-center justify-center"
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </motion.span>
        )}
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <div 
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />
            
            {/* Panel */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="fixed sm:absolute right-3 sm:right-0 top-14 sm:top-full mt-2 w-[calc(100vw-1.5rem)] sm:w-80 max-w-md max-h-[70vh] overflow-hidden bg-[#2A2A2F] border border-[#3A3A3F] rounded-xl shadow-2xl z-50"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-[#3A3A3F]">
                <h3 className="font-bold text-[#F5F3E8]">Notifications</h3>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllRead}
                    className="text-xs text-[#00F0FF] hover:underline"
                  >
                    Mark all read
                  </button>
                )}
              </div>

              {/* Notifications List */}
              <div className="max-h-80 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="p-8 text-center text-[#A0A0A5]">
                    <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>No notifications</p>
                  </div>
                ) : (
                  notifications.map((notification) => {
                    const Icon = iconMap[notification.type]
                    const color = colorMap[notification.type]
                    
                    return (
                      <div
                        key={notification.id}
                        className={`relative p-4 border-b border-[#3A3A3F] hover:bg-[#3A3A3F]/50 transition-colors ${
                          !notification.read ? 'bg-[#00F0FF]/5' : ''
                        }`}
                      >
                        <Link
                          href={notification.href || '#'}
                          onClick={() => {
                            markAsRead(notification.id)
                            setIsOpen(false)
                          }}
                          className="flex gap-3"
                        >
                          <div 
                            className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                            style={{ backgroundColor: `${color}20` }}
                          >
                            <Icon size={16} style={{ color }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <span className="font-bold text-sm text-[#F5F3E8]">
                                {notification.title}
                              </span>
                              <span className="text-xs text-[#A0A0A5] shrink-0">
                                {notification.time}
                              </span>
                            </div>
                            <p className="text-xs text-[#A0A0A5] mt-0.5 truncate">
                              {notification.message}
                            </p>
                          </div>
                        </Link>
                        
                        {/* Dismiss button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            dismiss(notification.id)
                          }}
                          className="absolute top-2 right-2 p-1 text-[#A0A0A5] hover:text-[#F5F3E8] opacity-0 hover:opacity-100 transition-opacity"
                        >
                          <X size={14} />
                        </button>
                        
                        {/* Unread indicator */}
                        {!notification.read && (
                          <div className="absolute left-1.5 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-[#00F0FF] rounded-full" />
                        )}
                      </div>
                    )
                  })
                )}
              </div>

              {/* Footer */}
              <Link
                href="/dashboard"
                onClick={() => setIsOpen(false)}
                className="block px-4 py-3 text-center text-sm text-[#00F0FF] hover:bg-[#3A3A3F]/50 transition-colors border-t border-[#3A3A3F]"
              >
                View all activity →
              </Link>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}

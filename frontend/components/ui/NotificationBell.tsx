/**
 * NotificationBell - Bell icon with dropdown for user notifications
 * Shows unread count and list of recent notifications
 */

'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bell, X, Vote, Gift, Shield, AlertTriangle, CheckCircle2, ExternalLink } from 'lucide-react'
import Link from 'next/link'

interface Notification {
  id: string
  type: 'vote' | 'reward' | 'security' | 'alert' | 'success'
  title: string
  message: string
  time: string
  read: boolean
  link?: string
}

// Mock notifications for demo - in production these would come from a backend/indexer
const mockNotifications: Notification[] = [
  {
    id: '1',
    type: 'vote',
    title: 'Active Proposal',
    message: 'Proposal #142: Treasury allocation ends in 5 hours',
    time: '5m ago',
    read: false,
    link: '/governance',
  },
  {
    id: '2',
    type: 'reward',
    title: 'Claimable Rewards',
    message: 'You have 467.50 VFIDE ready to claim from payroll',
    time: '1h ago',
    read: false,
    link: '/payroll',
  },
  {
    id: '3',
    type: 'security',
    title: 'Guardian Request',
    message: '0x1a2b...3c4d wants you as their vault guardian',
    time: '2h ago',
    read: false,
    link: '/vault',
  },
  {
    id: '4',
    type: 'success',
    title: 'Badge Earned',
    message: 'You earned the "Active Trader" badge (+20 ProofScore)',
    time: '1d ago',
    read: true,
    link: '/badges',
  },
  {
    id: '5',
    type: 'alert',
    title: 'Score Changed',
    message: 'Your ProofScore increased by +15 from voting',
    time: '2d ago',
    read: true,
    link: '/dashboard',
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
  alert: '#FFD700',
  success: '#50C878',
}

export function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false)
  const [notifications, setNotifications] = useState(mockNotifications)
  const ref = useRef<HTMLDivElement>(null)
  
  const unreadCount = notifications.filter(n => !n.read).length

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const markAsRead = (id: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    )
  }

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
  }

  const clearAll = () => {
    setNotifications([])
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-[#A0A0A5] hover:text-[#F5F3E8] transition-colors"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-1 -right-1 w-5 h-5 bg-[#FF4444] text-white text-xs font-bold rounded-full flex items-center justify-center"
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </motion.span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute right-0 top-full mt-2 w-80 md:w-96 bg-[#2A2A2F] border border-[#3A3A3F] rounded-xl shadow-xl overflow-hidden z-50"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#3A3A3F]">
              <h3 className="text-[#F5F3E8] font-bold">Notifications</h3>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="text-[#00F0FF] text-xs hover:underline"
                  >
                    Mark all read
                  </button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-[#A0A0A5] hover:text-[#F5F3E8]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Notifications List */}
            <div className="max-h-80 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-8 text-center">
                  <Bell className="w-12 h-12 mx-auto mb-3 text-[#3A3A3F]" />
                  <p className="text-[#A0A0A5]">No notifications yet</p>
                </div>
              ) : (
                notifications.map((notification) => {
                  const Icon = iconMap[notification.type]
                  const color = colorMap[notification.type]
                  
                  return (
                    <Link
                      key={notification.id}
                      href={notification.link || '#'}
                      onClick={() => {
                        markAsRead(notification.id)
                        setIsOpen(false)
                      }}
                      className={`flex items-start gap-3 px-4 py-3 border-b border-[#3A3A3F] hover:bg-[#3A3A3F]/50 transition-colors ${
                        !notification.read ? 'bg-[#00F0FF]/5' : ''
                      }`}
                    >
                      <div
                        className="p-2 rounded-full shrink-0"
                        style={{ backgroundColor: `${color}20` }}
                      >
                        <Icon className="w-4 h-4" style={{ color }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[#F5F3E8] font-bold text-sm">
                            {notification.title}
                          </span>
                          {!notification.read && (
                            <span className="w-2 h-2 bg-[#00F0FF] rounded-full" />
                          )}
                        </div>
                        <p className="text-[#A0A0A5] text-xs mt-0.5 line-clamp-2">
                          {notification.message}
                        </p>
                        <span className="text-[#A0A0A5] text-xs mt-1 block">
                          {notification.time}
                        </span>
                      </div>
                      <ExternalLink className="w-4 h-4 text-[#A0A0A5] shrink-0" />
                    </Link>
                  )
                })
              )}
            </div>

            {/* Footer */}
            {notifications.length > 0 && (
              <div className="px-4 py-3 border-t border-[#3A3A3F] flex justify-between items-center">
                <Link
                  href="/dashboard"
                  onClick={() => setIsOpen(false)}
                  className="text-[#00F0FF] text-sm hover:underline"
                >
                  View all activity
                </Link>
                <button
                  onClick={clearAll}
                  className="text-[#A0A0A5] text-xs hover:text-[#FF4444] transition-colors"
                >
                  Clear all
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

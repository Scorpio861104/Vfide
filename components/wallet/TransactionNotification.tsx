/**
import { log } from '@/lib/logging';
 * Transaction Notifications with Confetti 🎉
 * Beautiful feedback for every blockchain action
 */

'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useEffect, useState } from 'react'
// Note: install with: npm install react-confetti
// import Confetti from 'react-confetti'

type NotificationType = 'pending' | 'success' | 'error'

interface Notification {
  id: string
  type: NotificationType
  title: string
  message: string
  txHash?: string
}

interface TransactionNotificationProps {
  notification: Notification | null
  onClose: () => void
}

const notificationConfig = {
  pending: {
    icon: '⏳',
    color: '#FFD700',
    bgColor: 'rgba(255, 215, 0, 0.1)',
    borderColor: 'rgba(255, 215, 0, 0.3)',
    title: 'Transaction Pending',
  },
  success: {
    icon: '✅',
    color: '#00FF88',
    bgColor: 'rgba(0, 255, 136, 0.1)',
    borderColor: 'rgba(0, 255, 136, 0.3)',
    title: 'Success!',
  },
  error: {
    icon: '❌',
    color: '#FF4444',
    bgColor: 'rgba(255, 68, 68, 0.1)',
    borderColor: 'rgba(255, 68, 68, 0.3)',
    title: 'Transaction Failed',
  },
}

export function TransactionNotification({ notification, onClose }: TransactionNotificationProps) {
  // Confetti functionality - uncomment when react-confetti is installed
  // const [showConfetti, setShowConfetti] = useState(false)
  // const [windowSize, setWindowSize] = useState({ width: 0, height: 0 })
  
  // useEffect(() => {
  //   if (typeof window !== 'undefined') {
  //     setWindowSize({ width: window.innerWidth, height: window.innerHeight })
  //     const handleResize = () => {
  //       setWindowSize({ width: window.innerWidth, height: window.innerHeight })
  //     }
  //     window.addEventListener('resize', handleResize)
  //     return () => window.removeEventListener('resize', handleResize)
  //   }
  // }, [])
  
  // useEffect(() => {
  //   if (notification?.type === 'success') {
  //     setShowConfetti(true)
  //     const timer = setTimeout(() => setShowConfetti(false), 5000)
  //     return () => clearTimeout(timer)
  //   }
  // }, [notification])
  
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(onClose, notification.type === 'pending' ? 30000 : 8000)
      return () => clearTimeout(timer)
    }
    return undefined
  }, [notification, onClose])
  
  if (!notification) return null
  
  const config = notificationConfig[notification.type]
  
  return (
    <>
      {/* Confetti for success - Install: npm install react-confetti */}
      {/* {showConfetti && (
        <Confetti
          width={windowSize.width}
          height={windowSize.height}
          recycle={false}
          numberOfPieces={500}
          gravity={0.3}
          colors={['#00FF88', '#00F0FF', '#FFD700', '#FF6B9D', '#A78BFA']}
        />
      )} */}
      
      {/* Notification Toast */}
      <AnimatePresence>
        <motion.div
          key={notification.id}
          initial={{ opacity: 0, y: -50, x: 50 }}
          animate={{ opacity: 1, y: 0, x: 0 }}
          exit={{ opacity: 0, x: 50 }}
          className="fixed top-4 right-4 z-50 max-w-md"
        >
          {/* Glow effect */}
          <motion.div
            className="absolute inset-0 rounded-xl blur-xl opacity-50"
            style={{ backgroundColor: config.color }}
            animate={{
              scale: [1, 1.05, 1],
              opacity: [0.3, 0.5, 0.3],
            }}
            transition={{ duration: 2, repeat: Infinity }}
          />
          
          {/* Card */}
          <motion.div
            className="relative backdrop-blur-xl rounded-xl p-4 shadow-2xl border-2"
            style={{
              backgroundColor: config.bgColor,
              borderColor: config.borderColor,
            }}
            animate={{
              scale: notification.type === 'success' ? [1, 1.02, 1] : 1,
            }}
            transition={{ duration: 0.5 }}
          >
            <div className="flex items-start gap-3">
              {/* Animated Icon */}
              <motion.div
                className="text-3xl"
                animate={{
                  rotate: notification.type === 'pending' ? 360 : 0,
                  scale: notification.type === 'success' ? [1, 1.2, 1] : 1,
                }}
                transition={{
                  rotate: { duration: 2, repeat: Infinity, ease: 'linear' },
                  scale: { duration: 0.5 },
                }}
              >
                {config.icon}
              </motion.div>
              
              {/* Content */}
              <div className="flex-1 min-w-0">
                <h4
                  className="font-bold text-lg"
                  style={{ color: config.color }}
                >
                  {notification.title}
                </h4>
                <p className="text-sm text-zinc-100/80 mt-1">
                  {notification.message}
                </p>
                
                {notification.txHash && (
                  <motion.a
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    href={`https://sepolia.basescan.org/tx/${notification.txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-cyan-400 hover:text-cyan-400 mt-2 inline-flex items-center gap-1 transition-colors"
                  >
                    View on Explorer →
                  </motion.a>
                )}
              </div>
              
              {/* Close Button */}
              <button
                onClick={onClose}
                className="text-zinc-100/50 hover:text-zinc-100 transition-colors"
              >
                ✕
              </button>
            </div>
            
            {/* Progress bar for pending */}
            {notification.type === 'pending' && (
              <motion.div
                className="mt-3 h-1 rounded-full overflow-hidden"
                style={{ backgroundColor: `${config.color}20` }}
              >
                <motion.div
                  className="h-full"
                  style={{ backgroundColor: config.color }}
                  animate={{
                    x: ['-100%', '100%'],
                  }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    ease: 'linear',
                  }}
                />
              </motion.div>
            )}
          </motion.div>
        </motion.div>
      </AnimatePresence>
    </>
  )
}

// Hook for managing notifications
export function useTransactionNotifications() {
  const [notification, setNotification] = useState<Notification | null>(null)
  
  const showNotification = (
    type: NotificationType,
    title: string,
    message: string,
    txHash?: string
  ) => {
    setNotification({
      id: Date.now().toString(),
      type,
      title,
      message,
      txHash,
    })
  }
  
  const closeNotification = () => {
    setNotification(null)
  }
  
  return {
    notification,
    showNotification,
    closeNotification,
  }
}

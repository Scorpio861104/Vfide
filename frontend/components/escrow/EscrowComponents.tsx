/**
 * Escrow Components - Reusable UI components for escrow functionality
 */

import { motion } from 'framer-motion';
import { 
  Shield, Clock, CheckCircle2, AlertTriangle, 
  Package, Scale, FileCheck, Calendar, DollarSign, 
  User, Hash, Timer 
} from 'lucide-react';

export interface EscrowCardProps {
  id: string;
  orderId: string;
  merchant: string;
  amount: string;
  token: string;
  createdAt: Date;
  releaseTime: Date;
  state: 'CREATED' | 'RELEASED' | 'REFUNDED' | 'DISPUTED';
  timeRemaining: string;
  onRelease?: () => void;
  onDispute?: () => void;
  onRefund?: () => void;
  loading?: boolean;
}

export function EscrowCard({
  id,
  orderId,
  merchant,
  amount,
  token,
  createdAt,
  releaseTime,
  state,
  timeRemaining,
  onRelease,
  onDispute,
  onRefund,
  loading
}: EscrowCardProps) {
  const stateConfig = {
    CREATED: {
      label: 'Active',
      color: 'amber',
      classes: 'text-amber-400 bg-amber-500/20 border-amber-500/30'
    },
    RELEASED: {
      label: 'Released',
      color: 'emerald',
      classes: 'text-emerald-400 bg-emerald-500/20 border-emerald-500/30'
    },
    REFUNDED: {
      label: 'Refunded',
      color: 'blue',
      classes: 'text-blue-400 bg-blue-500/20 border-blue-500/30'
    },
    DISPUTED: {
      label: 'Disputed',
      color: 'red',
      classes: 'text-red-400 bg-red-500/20 border-red-500/30'
    }
  };

  const config = stateConfig[state];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.002, y: -2 }}
      className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-white/[0.08] to-white/[0.02] backdrop-blur-xl border border-white/10 hover:border-white/20 transition-colors"
    >
      <div className="p-4 sm:p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Left: Order Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-3 flex-wrap">
              <span className={`px-3 py-1 rounded-full text-xs font-medium border ${config.classes}`}>
                {config.label}
              </span>
              <span className="text-gray-500 text-sm flex items-center gap-1">
                <Hash className="w-3 h-3" />
                {orderId}
              </span>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 text-sm">
              <div className="min-w-0">
                <p className="text-gray-500 mb-1 flex items-center gap-1 text-xs sm:text-sm">
                  <User className="w-3 h-3 flex-shrink-0" /> Merchant
                </p>
                <p className="text-white font-mono text-xs sm:text-sm truncate">{merchant}</p>
              </div>
              
              <div className="min-w-0">
                <p className="text-gray-500 mb-1 flex items-center gap-1 text-xs sm:text-sm">
                  <DollarSign className="w-3 h-3 flex-shrink-0" /> Amount
                </p>
                <p className="text-white font-semibold text-xs sm:text-sm">{amount} {token}</p>
              </div>
              
              <div className="min-w-0">
                <p className="text-gray-500 mb-1 flex items-center gap-1 text-xs sm:text-sm">
                  <Calendar className="w-3 h-3 flex-shrink-0" /> Created
                </p>
                <p className="text-white text-xs sm:text-sm">{createdAt.toLocaleDateString()}</p>
              </div>
              
              <div className="min-w-0">
                <p className="text-gray-500 mb-1 flex items-center gap-1 text-xs sm:text-sm">
                  <Timer className="w-3 h-3 flex-shrink-0" /> Release
                </p>
                <p className={`font-medium text-xs sm:text-sm ${
                  releaseTime <= new Date(Date.now() + 24 * 60 * 60 * 1000) 
                    ? 'text-amber-400' 
                    : 'text-white'
                }`}>
                  {timeRemaining}
                </p>
              </div>
            </div>
          </div>
          
          {/* Right: Actions */}
          <div className="flex gap-2 sm:gap-3 lg:flex-col">
            {state === 'CREATED' && (
              <>
                {onRelease && (
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={onRelease}
                    disabled={loading}
                    className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-3 sm:px-4 py-2 bg-gradient-to-r from-emerald-500 to-green-500 text-white rounded-xl text-sm font-medium shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 transition-all disabled:opacity-50 whitespace-nowrap"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span className="hidden sm:inline">Release Funds</span>
                    <span className="sm:hidden">Release</span>
                  </motion.button>
                )}
                
                {onDispute && (
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={onDispute}
                    disabled={loading}
                    className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-3 sm:px-4 py-2 bg-white/5 text-red-400 rounded-xl text-sm font-medium border border-red-500/30 hover:bg-red-500/10 transition-all disabled:opacity-50 whitespace-nowrap"
                  >
                    <AlertTriangle className="w-4 h-4" />
                    <span className="hidden sm:inline">Raise Dispute</span>
                    <span className="sm:hidden">Dispute</span>
                  </motion.button>
                )}
              </>
            )}
            
            {state === 'DISPUTED' && (
              <div className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-red-500/10 border border-red-500/30 rounded-xl">
                <Scale className="w-5 h-5 text-red-400 flex-shrink-0" />
                <span className="text-red-300 text-xs sm:text-sm">Awaiting Arbiter</span>
              </div>
            )}
            
            {(state === 'RELEASED' || state === 'REFUNDED') && (
              <div className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-emerald-500/10 border border-emerald-500/30 rounded-xl">
                <FileCheck className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                <span className="text-emerald-300 text-xs sm:text-sm whitespace-nowrap">
                  {state === 'RELEASED' ? 'Funds Released' : 'Funds Refunded'}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export function EscrowStats({ 
  totalInEscrow, 
  activeCount, 
  completedCount, 
  disputedCount 
}: {
  totalInEscrow: string;
  activeCount: number;
  completedCount: number;
  disputedCount: number;
}) {
  const stats = [
    { 
      label: 'Total in Escrow', 
      value: `${totalInEscrow} VFIDE`, 
      icon: <DollarSign className="w-5 h-5" />, 
      gradient: 'from-cyan-500/20 to-teal-500/10', 
      border: 'border-cyan-500/20', 
      text: 'text-cyan-400' 
    },
    { 
      label: 'Active Escrows', 
      value: activeCount.toString(), 
      icon: <Clock className="w-5 h-5" />, 
      gradient: 'from-amber-500/20 to-orange-500/10', 
      border: 'border-amber-500/20', 
      text: 'text-amber-400' 
    },
    { 
      label: 'Completed', 
      value: completedCount.toString(), 
      icon: <CheckCircle2 className="w-5 h-5" />, 
      gradient: 'from-emerald-500/20 to-green-500/10', 
      border: 'border-emerald-500/20', 
      text: 'text-emerald-400' 
    },
    { 
      label: 'In Dispute', 
      value: disputedCount.toString(), 
      icon: <Scale className="w-5 h-5" />, 
      gradient: 'from-red-500/20 to-rose-500/10', 
      border: 'border-red-500/20', 
      text: 'text-red-400' 
    }
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
      {stats.map((stat, idx) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          whileHover={{ scale: 1.02, y: -2 }}
          transition={{ delay: idx * 0.1 }}
          className={`bg-gradient-to-br ${stat.gradient} backdrop-blur-xl border ${stat.border} rounded-2xl p-3 sm:p-4`}
        >
          <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br ${stat.gradient} border ${stat.border} flex items-center justify-center mb-2 sm:mb-3`}>
            <div className={stat.text}>{stat.icon}</div>
          </div>
          <p className="text-lg sm:text-2xl font-bold text-white">{stat.value}</p>
          <p className="text-xs sm:text-sm text-gray-400">{stat.label}</p>
        </motion.div>
      ))}
    </div>
  );
}

export function EmptyState({ 
  icon, 
  title, 
  description 
}: { 
  icon: React.ReactNode; 
  title: string; 
  description: string; 
}) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-center py-12 sm:py-16"
    >
      <div className="p-4 rounded-2xl bg-gradient-to-br from-cyan-500/10 to-emerald-500/5 border border-cyan-500/20 inline-block mb-4">
        {icon}
      </div>
      <h3 className="text-lg sm:text-xl font-semibold text-white mb-2">{title}</h3>
      <p className="text-sm sm:text-base text-gray-400">{description}</p>
    </motion.div>
  );
}

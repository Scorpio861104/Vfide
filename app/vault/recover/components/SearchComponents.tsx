'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Key, Lock, Clock, CheckCircle2, AlertTriangle, Loader2, Copy, ExternalLink } from 'lucide-react';

export function SearchMethodButton({ 
  icon: Icon, 
  title, 
  description, 
  active, 
  onClick,
  gradient,
  badge
}: { 
  icon: React.ElementType;
  title: string;
  description: string;
  active: boolean;
  onClick: () => void;
  gradient: "cyan" | "gold" | "purple" | "green";
  badge?: string;
}) {
  const colors = {
    cyan: { bg: 'bg-cyan-500/20', border: 'border-cyan-500/50', text: 'text-cyan-400', shadow: 'shadow-cyan-500/30', glow: 'from-cyan-500/30' },
    gold: { bg: 'bg-amber-500/20', border: 'border-amber-500/50', text: 'text-amber-400', shadow: 'shadow-amber-500/30', glow: 'from-amber-500/30' },
    purple: { bg: 'bg-purple-500/20', border: 'border-purple-500/50', text: 'text-purple-400', shadow: 'shadow-purple-500/30', glow: 'from-purple-500/30' },
    green: { bg: 'bg-emerald-500/20', border: 'border-emerald-500/50', text: 'text-emerald-400', shadow: 'shadow-emerald-500/30', glow: 'from-emerald-500/30' }
  };
  
  const color = colors[gradient];
  
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.03, y: -4 }}
      whileTap={{ scale: 0.97 }}
      className={`relative p-5 rounded-2xl border-2 text-left transition-all overflow-hidden group ${
        active 
          ? `${color.bg} ${color.border} shadow-xl ${color.shadow}` 
          : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20'
      }`}
    >
      {/* Background glow */}
      {active && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className={`absolute inset-0 bg-gradient-to-br ${color.glow} to-transparent`}
        />
      )}
      
      <div className="relative z-10">
        <div className="flex items-start justify-between mb-3">
          <motion.div 
            animate={active ? { rotate: [0, -10, 10, 0] } : {}}
            transition={{ duration: 0.5 }}
            className={`w-12 h-12 rounded-xl ${active ? color.bg : 'bg-white/10'} flex items-center justify-center border ${active ? color.border : 'border-white/10'}`}
          >
            <Icon className={`h-6 w-6 ${active ? color.text : 'text-gray-400'}`} />
          </motion.div>
          
          {badge && active && (
            <motion.span 
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className={`text-[10px] font-bold px-2 py-1 rounded-full ${color.bg} ${color.text} ${color.border} border`}
            >
              {badge}
            </motion.span>
          )}
        </div>
        
        <h4 className={`font-bold text-lg mb-1 ${active ? 'text-white' : 'text-gray-300'}`}>{title}</h4>
        <p className="text-xs text-gray-500 leading-relaxed">{description}</p>
      </div>
      
      {/* Active glow bar */}
      {active && (
        <motion.div
          layoutId="searchMethodActive"
          className={`absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent ${color.glow} to-transparent`}
        />
      )}
      
      {/* Hover shine */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700"
      />
    </motion.button>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ENHANCED SEARCH RESULT CARD
// ═══════════════════════════════════════════════════════════════════════════════

export function SearchResultCard({ 
  vault, 
  onClaimClick 
}: { 
  vault: {
    address: string;
    originalOwner: string;
    proofScore: number;
    badgeCount: number;
    hasGuardians: boolean;
    lastActive: string;
    isRecoverable: boolean;
  };
  onClaimClick: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ type: "spring" as const, stiffness: 100 }}
    >
      <GlassCard className="p-8" gradient="cyan" glow>
        {/* Success header */}
        <div className="flex items-center gap-4 mb-6">
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring" as const, stiffness: 200, delay: 0.2 }}
            className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/30"
          >
            <ShieldCheck className="h-8 w-8 text-white" />
          </motion.div>
          <div className="flex-1">
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="flex items-center gap-2 mb-1"
            >
              <Sparkles className="h-4 w-4 text-cyan-400" />
              <span className="text-sm text-cyan-400 font-semibold">Vault Found!</span>
            </motion.div>
            <motion.h3 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
              className="text-2xl font-bold text-white"
            >
              Recovery Available
            </motion.h3>
          </div>
          
          {vault.isRecoverable ? (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5 }}
              onClick={onClaimClick}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-xl font-bold text-white flex items-center gap-2 shadow-lg shadow-cyan-500/30 relative overflow-hidden group"
            >
              <Key className="h-5 w-5" />
              <span>Claim Vault</span>
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700"
              />
            </motion.button>
          ) : (
            <div className="px-6 py-3 bg-red-500/20 border-2 border-red-500/50 rounded-xl text-red-400 flex items-center gap-2">
              <Lock className="h-5 w-5" />
              No Recovery Set
            </div>
          )}
        </div>
        
        {/* Vault details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="p-4 rounded-xl bg-black/20 border border-white/10"
          >
            <p className="text-xs text-gray-500 mb-1 flex items-center gap-1">
              <Shield className="h-3 w-3" /> Vault Address
            </p>
            <p className="font-mono text-sm text-cyan-400">
              {vault.address.slice(0, 10)}...{vault.address.slice(-8)}
            </p>
          </motion.div>
          
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="p-4 rounded-xl bg-black/20 border border-white/10"
          >
            <p className="text-xs text-gray-500 mb-1 flex items-center gap-1">
              <User className="h-3 w-3" /> Original Owner
            </p>
            <p className="font-mono text-sm text-gray-300">
              {vault.originalOwner.slice(0, 10)}...{vault.originalOwner.slice(-8)}
            </p>
          </motion.div>
        </div>
        
        {/* Stats grid */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="grid grid-cols-4 gap-3 p-4 rounded-xl bg-black/20 border border-white/10"
        >
          <div className="text-center">
            <div className="w-10 h-10 mx-auto mb-2 rounded-lg bg-cyan-500/20 flex items-center justify-center">
              <Activity className="h-5 w-5 text-cyan-400" />
            </div>
            <p className="text-xl font-bold text-white">{vault.proofScore}</p>
            <p className="text-[10px] text-gray-500">Proof Score</p>
          </div>
          
          <div className="text-center">
            <div className="w-10 h-10 mx-auto mb-2 rounded-lg bg-purple-500/20 flex items-center justify-center">
              <Award className="h-5 w-5 text-purple-400" />
            </div>
            <p className="text-xl font-bold text-white">{vault.badgeCount}</p>
            <p className="text-[10px] text-gray-500">Badges</p>
          </div>
          
          <div className="text-center">
            <div className="w-10 h-10 mx-auto mb-2 rounded-lg bg-emerald-500/20 flex items-center justify-center">
              <Users className="h-5 w-5 text-emerald-400" />
            </div>
            <p className="text-lg font-bold text-white">
              {vault.hasGuardians ? <CheckCircle2 className="h-5 w-5 mx-auto text-emerald-400" /> : <XCircle className="h-5 w-5 mx-auto text-gray-600" />}
            </p>
            <p className="text-[10px] text-gray-500">Guardians</p>
          </div>
          
          <div className="text-center">
            <div className="w-10 h-10 mx-auto mb-2 rounded-lg bg-amber-500/20 flex items-center justify-center">
              <Timer className="h-5 w-5 text-amber-400" />
            </div>
            <p className="text-sm font-bold text-white">{vault.lastActive}</p>
            <p className="text-[10px] text-gray-500">Last Active</p>
          </div>
        </motion.div>
      </GlassCard>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ENHANCED CLAIM FLOW MODAL
// ═══════════════════════════════════════════════════════════════════════════════


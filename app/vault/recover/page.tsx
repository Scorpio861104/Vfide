'use client';

import { Footer } from "@/components/layout/Footer";
import { useState, useEffect } from "react";
import { motion, AnimatePresence, useMotionValue, useTransform, useSpring } from "framer-motion";
import { 
  Search, Shield, Key, Mail, User, Users,
  AlertCircle, ChevronRight, Clock, CheckCircle2, XCircle,
  Sparkles, Fingerprint, ArrowRight, Lock, Unlock, HelpCircle,
  Radar, Scan, RefreshCw, Activity, Award, Timer, ShieldCheck,
  KeyRound, UserCheck, Zap
} from "lucide-react";
import Link from "next/link";
import { useAccount, useReadContract } from "wagmi";
import { isAddress } from "viem";
import { CONTRACT_ADDRESSES } from "@/lib/contracts";
import { VaultHubABI, SeerABI, VFIDEBadgeNFTABI } from "@/lib/abis";

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } }
};

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 100, damping: 15 } }
};

// ═══════════════════════════════════════════════════════════════════════════════
// AURORA BACKGROUND WITH PARTICLES
// ═══════════════════════════════════════════════════════════════════════════════

function AuroraBackground() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden">
      {/* Primary aurora */}
      <motion.div 
        animate={{ 
          x: [0, 100, -50, 0],
          y: [0, -50, 50, 0],
          scale: [1, 1.2, 0.9, 1]
        }}
        transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-0 left-1/4 w-200 h-200 bg-gradient-to-br from-cyan-500/20 via-blue-500/10 to-transparent rounded-full blur-[150px]"
      />
      
      {/* Secondary aurora */}
      <motion.div 
        animate={{ 
          x: [0, -80, 60, 0],
          y: [0, 60, -40, 0],
          scale: [1, 0.8, 1.1, 1]
        }}
        transition={{ duration: 25, repeat: Infinity, ease: "easeInOut", delay: 2 }}
        className="absolute bottom-0 right-1/4 w-175 h-175 bg-gradient-to-br from-purple-500/15 via-pink-500/10 to-transparent rounded-full blur-[130px]"
      />
      
      {/* Accent glow */}
      <motion.div 
        animate={{ 
          opacity: [0.3, 0.6, 0.3],
          scale: [1, 1.3, 1]
        }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-150 h-150 bg-gradient-to-br from-emerald-500/10 to-transparent rounded-full blur-[100px]"
      />
      
      {/* Grid overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(6,182,212,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(6,182,212,0.02)_1px,transparent_1px)] bg-size-[60px_60px]" />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// FLOATING PARTICLES
// ═══════════════════════════════════════════════════════════════════════════════

interface Particle {
  id: number;
  x: number;
  duration: number;
  delay: number;
}

function FloatingParticles() {
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setParticles([...Array(15)].map((_, i) => ({
        id: i,
        x: Math.random() * 100,
        duration: Math.random() * 15 + 15,
        delay: Math.random() * 10
      })));
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  if (particles.length === 0) return null;

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          initial={{ 
            x: `${p.x}%`,
            y: '110%',
            opacity: 0
          }}
          animate={{ 
            y: '-10%',
            opacity: [0, 0.6, 0]
          }}
          transition={{ 
            duration: p.duration,
            repeat: Infinity,
            delay: p.delay,
            ease: "linear"
          }}
          className="absolute w-1 h-1 bg-cyan-400/40 rounded-full"
        />
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 3D VAULT KEY VISUALIZATION
// ═══════════════════════════════════════════════════════════════════════════════

function VaultKeyVisualization({ isSearching }: { isSearching: boolean }) {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  
  const rotateX = useTransform(mouseY, [-200, 200], [15, -15]);
  const rotateY = useTransform(mouseX, [-200, 200], [-15, 15]);
  
  const springRotateX = useSpring(rotateX, { stiffness: 100, damping: 30 });
  const springRotateY = useSpring(rotateY, { stiffness: 100, damping: 30 });
  
  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    mouseX.set(e.clientX - rect.left - rect.width / 2);
    mouseY.set(e.clientY - rect.top - rect.height / 2);
  };
  
  return (
    <motion.div 
      className="relative w-48 h-48 md:w-64 md:h-64 mx-auto"
      style={{ perspective: 1000 }}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => { mouseX.set(0); mouseY.set(0); }}
    >
      <motion.div
        style={{ rotateX: springRotateX, rotateY: springRotateY, transformStyle: "preserve-3d" }}
        className="relative w-full h-full"
      >
        {/* Outer ring */}
        <motion.div
          animate={isSearching ? { rotate: 360 } : { rotate: 0 }}
          transition={{ duration: 3, repeat: isSearching ? Infinity : 0, ease: "linear" }}
          className="absolute inset-0 rounded-full border-2 border-cyan-500/30 border-dashed"
        />
        
        {/* Middle ring */}
        <motion.div
          animate={isSearching ? { rotate: -360 } : { rotate: 0 }}
          transition={{ duration: 5, repeat: isSearching ? Infinity : 0, ease: "linear" }}
          className="absolute inset-4 md:inset-6 rounded-full border-2 border-purple-500/30"
        />
        
        {/* Inner ring */}
        <motion.div
          animate={isSearching ? { rotate: 360 } : { rotate: 0 }}
          transition={{ duration: 2, repeat: isSearching ? Infinity : 0, ease: "linear" }}
          className="absolute inset-8 md:inset-12 rounded-full border-2 border-emerald-500/30"
        />
        
        {/* Central key */}
        <motion.div
          animate={isSearching ? { 
            scale: [1, 1.1, 1],
          } : { scale: 1 }}
          transition={{ duration: 1, repeat: isSearching ? Infinity : 0 }}
          className="absolute inset-0 flex items-center justify-center"
        >
          <motion.div
            animate={{ 
              boxShadow: isSearching 
                ? ['0 0 30px rgba(6, 182, 212, 0.3)', '0 0 60px rgba(6, 182, 212, 0.6)', '0 0 30px rgba(6, 182, 212, 0.3)']
                : '0 0 40px rgba(6, 182, 212, 0.3)'
            }}
            transition={{ duration: 1, repeat: Infinity }}
            className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-gradient-to-br from-cyan-500/30 to-blue-600/30 backdrop-blur-xl flex items-center justify-center border border-cyan-500/50"
          >
            <KeyRound className="h-8 w-8 md:h-10 md:w-10 text-cyan-400" />
          </motion.div>
          
          {/* Scan line */}
          {isSearching && (
            <motion.div
              animate={{ y: [-40, 40] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
              className="absolute inset-x-4 h-0.5 bg-linear-to-r from-transparent via-cyan-400 to-transparent"
            />
          )}
        </motion.div>
        
        {/* Radar pulses */}
        {isSearching && [...Array(3)].map((_, i) => (
          <motion.div
            key={i}
            initial={{ scale: 0.5, opacity: 0.5 }}
            animate={{ scale: 2, opacity: 0 }}
            transition={{ 
              duration: 2,
              repeat: Infinity,
              delay: i * 0.6
            }}
            className="absolute inset-0 rounded-full border border-cyan-400/50"
          />
        ))}
      </motion.div>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PREMIUM GLASS CARD
// ═══════════════════════════════════════════════════════════════════════════════

function GlassCard({ children, className = "", hover = true, gradient, glow }: { 
  children: React.ReactNode; 
  className?: string;
  hover?: boolean;
  gradient?: "cyan" | "gold" | "purple" | "green" | "red";
  glow?: boolean;
}) {
  const gradientMap = {
    cyan: "from-cyan-500/20 via-blue-500/10 to-transparent",
    gold: "from-amber-500/20 via-orange-500/10 to-transparent",
    purple: "from-purple-500/20 via-pink-500/10 to-transparent",
    green: "from-emerald-500/20 via-teal-500/10 to-transparent",
    red: "from-red-500/20 via-red-500/5 to-transparent"
  };
  
  const glowMap = {
    cyan: "shadow-cyan-500/20",
    gold: "shadow-amber-500/20",
    purple: "shadow-purple-500/20",
    green: "shadow-emerald-500/20",
    red: "shadow-red-500/20"
  };
  
  return (
    <motion.div
      whileHover={hover ? { scale: 1.01, y: -4 } : {}}
      transition={{ type: "spring" as const, stiffness: 400, damping: 25 }}
      className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${gradient ? gradientMap[gradient] : 'from-white/8 via-white/4 to-transparent'} backdrop-blur-2xl border border-white/10 ${glow && gradient ? `shadow-2xl ${glowMap[gradient]}` : ''} ${className}`}
    >
      {/* Shine effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-transparent pointer-events-none" />
      {children}
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ENHANCED SEARCH METHOD BUTTON
// ═══════════════════════════════════════════════════════════════════════════════

function SearchMethodButton({ 
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
          className={`absolute bottom-0 left-0 right-0 h-1 bg-linear-to-r from-transparent ${color.glow} to-transparent`}
        />
      )}
      
      {/* Hover shine */}
      <motion.div
        className="absolute inset-0 bg-linear-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700"
      />
    </motion.button>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ENHANCED SEARCH RESULT CARD
// ═══════════════════════════════════════════════════════════════════════════════

function SearchResultCard({ 
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
              className="px-6 py-3 bg-linear-to-r from-cyan-500 to-blue-500 rounded-xl font-bold text-white flex items-center gap-2 shadow-lg shadow-cyan-500/30 relative overflow-hidden group"
            >
              <Key className="h-5 w-5" />
              <span>Claim Vault</span>
              <motion.div
                className="absolute inset-0 bg-linear-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700"
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

function ClaimFlowModal({ 
  vault, 
  onClose 
}: { 
  vault: { address: string; originalOwner: string } | null;
  onClose: () => void;
}) {
  const [step, setStep] = useState(1);
  const [recoveryId, setRecoveryId] = useState("");
  const [reason, setReason] = useState("");
  const { address: newWalletAddress } = useAccount();
  
  if (!vault) return null;
  
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Backdrop */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="absolute inset-0 bg-black/80 backdrop-blur-md"
      />
      
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        transition={{ type: "spring" as const, stiffness: 200 }}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-xl overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 to-slate-800 border-2 border-white/20 shadow-2xl"
      >
        {/* Header with animated gradient */}
        <div className="relative p-8 bg-gradient-to-br from-cyan-500/20 via-blue-500/15 to-purple-500/10 border-b border-white/10 overflow-hidden">
          {/* Animated background orbs */}
          <motion.div
            animate={{ x: [0, 20, 0], y: [0, -10, 0] }}
            transition={{ duration: 5, repeat: Infinity }}
            className="absolute top-0 right-0 w-40 h-40 bg-cyan-500/20 rounded-full blur-3xl"
          />
          
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-4">
              <motion.div 
                animate={{ rotate: [0, 5, -5, 0] }}
                transition={{ duration: 3, repeat: Infinity }}
                className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/30"
              >
                <Key className="h-8 w-8 text-white" />
              </motion.div>
              <div>
                <h2 className="text-2xl font-bold text-white">Claim Your Vault</h2>
                <p className="text-sm text-gray-400">Step {step} of 3 • Secure Recovery</p>
              </div>
            </div>
            <motion.button 
              whileHover={{ scale: 1.1, rotate: 90 }}
              whileTap={{ scale: 0.9 }}
              onClick={onClose} 
              className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/20 transition-colors"
            >
              <XCircle className="h-5 w-5" />
            </motion.button>
          </div>
          
          {/* Animated progress bar */}
          <div className="flex gap-2 mt-6">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex-1 h-2 rounded-full bg-white/10 overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: s <= step ? '100%' : '0%' }}
                  transition={{ duration: 0.5, delay: s * 0.1 }}
                  className="h-full bg-linear-to-r from-cyan-500 to-blue-500"
                />
              </div>
            ))}
          </div>
        </div>
        
        {/* Content */}
        <div className="p-8">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                className="space-y-4"
              >
                <div className="p-5 rounded-2xl bg-white/5 border border-white/10">
                  <p className="text-xs text-gray-500 mb-2 flex items-center gap-2">
                    <Shield className="h-4 w-4 text-cyan-400" />
                    Vault to Recover
                  </p>
                  <p className="font-mono text-cyan-400 text-lg">{vault.address}</p>
                </div>
                
                <div className="p-5 rounded-2xl bg-white/5 border border-white/10">
                  <p className="text-xs text-gray-500 mb-2 flex items-center gap-2">
                    <UserCheck className="h-4 w-4 text-emerald-400" />
                    Your New Wallet
                  </p>
                  <p className="font-mono text-emerald-400 text-lg">
                    {newWalletAddress || "Connect wallet to continue"}
                  </p>
                </div>
                
                <div className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-6 w-6 text-amber-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm text-amber-400 font-semibold mb-1">Security Notice</p>
                      <p className="text-xs text-gray-400 leading-relaxed">
                        This initiates a <strong className="text-white">7-day challenge period</strong>. 
                        Your guardians must approve, and the original wallet can cancel if not truly lost.
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
            
            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                className="space-y-5"
              >
                <div>
                  <label className="text-sm text-gray-300 mb-3 font-medium flex items-center gap-2">
                    <Fingerprint className="h-4 w-4 text-purple-400" />
                    Recovery ID
                  </label>
                  <input
                    type="text"
                    value={recoveryId}
                    onChange={(e) => setRecoveryId(e.target.value)}
                    placeholder="Enter your secret recovery phrase..."
                    className="w-full px-5 py-4 rounded-xl bg-white/5 border-2 border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500/50 transition-colors text-lg"
                  />
                  <p className="text-xs text-gray-500 mt-2 ml-1">
                    The secret phrase you set when creating your vault
                  </p>
                </div>
                
                <div>
                  <label className="text-sm text-gray-300 mb-3 font-medium flex items-center gap-2">
                    <HelpCircle className="h-4 w-4 text-blue-400" />
                    Recovery Reason
                  </label>
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Explain why you need to recover (lost device, seed phrase destroyed, etc.)"
                    rows={3}
                    maxLength={500}
                    className="w-full px-5 py-4 rounded-xl bg-white/5 border-2 border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500/50 transition-colors resize-none"
                  />
                </div>
              </motion.div>
            )}
            
            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                className="text-center py-4"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring" as const, stiffness: 200, delay: 0.2 }}
                  className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-cyan-500 to-emerald-500 flex items-center justify-center mb-6 shadow-lg shadow-cyan-500/30"
                >
                  <CheckCircle2 className="h-12 w-12 text-white" />
                </motion.div>
                
                <motion.h3 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="text-2xl font-bold text-white mb-2"
                >
                  Claim Submitted!
                </motion.h3>
                <motion.p 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="text-gray-400 mb-8"
                >
                  Your recovery process has begun
                </motion.p>
                
                <div className="space-y-3">
                  {[
                    { icon: Users, title: "Guardian Approval", desc: "Waiting for guardian votes", color: "cyan" },
                    { icon: Clock, title: "7-Day Challenge", desc: "Original wallet can contest", color: "amber" },
                    { icon: Unlock, title: "Ownership Transfer", desc: "Vault transfers to new wallet", color: "emerald" }
                  ].map((item, i) => (
                    <motion.div
                      key={item.title}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.6 + i * 0.1 }}
                      className="flex items-center gap-4 p-4 rounded-xl bg-white/5 border border-white/10 text-left"
                    >
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                        item.color === 'cyan' ? 'bg-cyan-500/20' : 
                        item.color === 'amber' ? 'bg-amber-500/20' : 'bg-emerald-500/20'
                      }`}>
                        <item.icon className={`h-5 w-5 ${
                          item.color === 'cyan' ? 'text-cyan-400' : 
                          item.color === 'amber' ? 'text-amber-400' : 'text-emerald-400'
                        }`} />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-white">{item.title}</p>
                        <p className="text-xs text-gray-500">{item.desc}</p>
                      </div>
                      <motion.div 
                        animate={{ opacity: [0.3, 1, 0.3] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                        className="w-2 h-2 rounded-full bg-gray-500"
                      />
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        
        {/* Footer */}
        <div className="p-6 border-t border-white/10 flex justify-between bg-black/20">
          {step > 1 && step < 3 ? (
            <motion.button
              whileHover={{ scale: 1.02, x: -4 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setStep(step - 1)}
              className="px-6 py-3 text-gray-400 hover:text-white transition-colors flex items-center gap-2"
            >
              <ChevronRight className="h-4 w-4 rotate-180" />
              Back
            </motion.button>
          ) : (
            <div />
          )}
          
          {step < 3 ? (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setStep(step + 1)}
              disabled={step === 2 && !recoveryId}
              className="px-8 py-3 bg-linear-to-r from-cyan-500 to-blue-500 rounded-xl font-bold text-white flex items-center gap-2 disabled:opacity-50 shadow-lg shadow-cyan-500/30 relative overflow-hidden group"
            >
              <span className="relative z-10 flex items-center gap-2">
                Continue
                <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </span>
              <motion.div
                className="absolute inset-0 bg-linear-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700"
              />
            </motion.button>
          ) : (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={onClose}
              className="px-8 py-3 bg-linear-to-r from-emerald-500 to-teal-500 rounded-xl font-bold text-white flex items-center gap-2 shadow-lg shadow-emerald-500/30"
            >
              <CheckCircle2 className="h-4 w-4" />
              Done
            </motion.button>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function VaultRecoveryPage() {
  const { address } = useAccount();
  const [searchMethod, setSearchMethod] = useState<"recoveryId" | "email" | "username" | "guardian">("recoveryId");
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [vaultToLookup, setVaultToLookup] = useState<`0x${string}` | undefined>(undefined);
  const [searchResult, setSearchResult] = useState<{
    address: string;
    originalOwner: string;
    proofScore: number;
    badgeCount: number;
    hasGuardians: boolean;
    lastActive: string;
    isRecoverable: boolean;
  } | null>(null);
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [error, setError] = useState("");
  
  // Contract reads for vault lookup
  const { data: _vaultInfo, refetch: refetchVaultInfo } = useReadContract({
    address: CONTRACT_ADDRESSES.VaultHub,
    abi: VaultHubABI,
    functionName: 'getVaultInfo',
    args: vaultToLookup ? [vaultToLookup] : undefined,
    query: { enabled: !!vaultToLookup }
  });
  
  const { data: _proofScore, refetch: refetchProofScore } = useReadContract({
    address: CONTRACT_ADDRESSES.Seer,
    abi: SeerABI,
    functionName: 'proofScore',
    args: vaultToLookup ? [vaultToLookup] : undefined,
    query: { enabled: !!vaultToLookup }
  });
  
  const { data: _badgeBalance, refetch: refetchBadges } = useReadContract({
    address: CONTRACT_ADDRESSES.BadgeNFT,
    abi: VFIDEBadgeNFTABI,
    functionName: 'balanceOf',
    args: vaultToLookup ? [vaultToLookup] : undefined,
    query: { enabled: !!vaultToLookup }
  });

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setError("Please enter a search term");
      return;
    }
    
    setIsSearching(true);
    setError("");
    setSearchResult(null);
    
    try {
      // For recoveryId method, the query should be a vault address
      if (searchMethod === "recoveryId") {
        // Check if it's a valid address format
        if (!isAddress(searchQuery)) {
          setError("Please enter a valid vault address (0x...)");
          setIsSearching(false);
          return;
        }
        
        // Set the vault to lookup and trigger contract reads
        setVaultToLookup(searchQuery as `0x${string}`);
        
        // Wait for refetch to complete
        const [vaultResult, scoreResult, badgeResult] = await Promise.all([
          refetchVaultInfo(),
          refetchProofScore(),
          refetchBadges()
        ]);
        
        const info = vaultResult.data as [string, bigint, boolean, boolean] | undefined;
        
        if (!info || !info[3]) { // info[3] is 'exists' boolean
          setError("No vault found at this address. Please check and try again.");
          setIsSearching(false);
          return;
        }
        
        const [owner, createdAt, isLocked] = info;
        const score = scoreResult.data as bigint | undefined;
        const badges = badgeResult.data as bigint | undefined;
        
        // Calculate last active (using createdAt for now, could add activity tracking later)
        const createdDate = new Date(Number(createdAt) * 1000);
        const daysSince = Math.floor((Date.now() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
        const lastActive = daysSince === 0 ? "Today" : daysSince === 1 ? "Yesterday" : `${daysSince} days ago`;
        
        setSearchResult({
          address: searchQuery,
          originalOwner: owner,
          proofScore: score ? Number(score) / 100 : 0, // Convert from basis points
          badgeCount: badges ? Number(badges) : 0,
          hasGuardians: isLocked, // If locked, likely has guardians
          lastActive,
          isRecoverable: !isLocked && owner !== address // Can recover if not locked and not current user
        });
      } else {
        // For email/username/guardian searches, would need an off-chain indexer
        // These are stored in a backend database, not on-chain
        // TODO: Implement backend API for off-chain identity lookup
        setError(`${searchMethod} search requires backend integration. Currently only vault address (recoveryId) search is supported on-chain.`);
      }
    } catch (_err) {
      setError("Failed to fetch vault information. Please try again.");
    }
    
    setIsSearching(false);
  };
  
  return (
    <main className="min-h-screen bg-zinc-950 relative overflow-hidden">
      <AuroraBackground />
      <FloatingParticles />
      
      {/* Hero Section */}
      <section className="relative pt-28 pb-8">
        <div className="container mx-auto px-4 max-w-5xl">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-10"
          >
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 }}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-linear-to-r from-cyan-500/20 to-purple-500/20 border border-cyan-500/30 mb-8"
            >
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 10, repeat: Infinity, ease: "linear" }}>
                <Sparkles className="h-4 w-4 text-cyan-400" />
              </motion.div>
              <span className="text-sm font-semibold text-transparent bg-clip-text bg-linear-to-r from-cyan-400 to-purple-400">
                Industry First: Wallet Recovery Without Seed Phrases
              </span>
            </motion.div>
            
            {/* Title */}
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-4xl md:text-5xl lg:text-6xl font-black mb-6"
            >
              <span className="text-white">Find & Recover</span>
              <br />
              <span className="text-transparent bg-clip-text bg-linear-to-r from-cyan-400 via-blue-400 to-purple-400">
                Your Vault
              </span>
            </motion.h1>
            
            {/* Subtitle */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto leading-relaxed"
            >
              Lost your wallet? No problem. Search for your vault using your 
              <span className="text-cyan-400"> recovery ID</span>, 
              <span className="text-purple-400"> email</span>, 
              <span className="text-amber-400"> username</span>, or through your 
              <span className="text-emerald-400"> guardians</span>.
            </motion.p>
          </motion.div>
          
          {/* 3D Visualization */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4 }}
            className="mb-10"
          >
            <VaultKeyVisualization isSearching={isSearching} />
          </motion.div>
        </div>
      </section>
      
      {/* Search Section */}
      <section className="relative py-8">
        <div className="container mx-auto px-4 max-w-5xl">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="space-y-8"
          >
            {/* Search Methods */}
            <motion.div variants={itemVariants}>
              <h3 className="text-lg font-bold text-white mb-5 flex items-center gap-2">
                <Radar className="h-5 w-5 text-cyan-400" />
                Select Search Method
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <SearchMethodButton
                  icon={Fingerprint}
                  title="Recovery ID"
                  description="Your secret phrase"
                  active={searchMethod === "recoveryId"}
                  onClick={() => setSearchMethod("recoveryId")}
                  gradient="cyan"
                  badge="Best"
                />
                <SearchMethodButton
                  icon={Mail}
                  title="Email"
                  description="Linked email address"
                  active={searchMethod === "email"}
                  onClick={() => setSearchMethod("email")}
                  gradient="purple"
                />
                <SearchMethodButton
                  icon={User}
                  title="Username"
                  description="Your VFide username"
                  active={searchMethod === "username"}
                  onClick={() => setSearchMethod("username")}
                  gradient="gold"
                />
                <SearchMethodButton
                  icon={Users}
                  title="Guardian"
                  description="Through your guardian"
                  active={searchMethod === "guardian"}
                  onClick={() => setSearchMethod("guardian")}
                  gradient="green"
                />
              </div>
            </motion.div>
            
            {/* Search Input */}
            <motion.div variants={itemVariants}>
              <GlassCard className="p-8" hover={false} glow gradient="cyan">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1 relative">
                    <div className="absolute left-5 top-1/2 -translate-y-1/2">
                      <Search className="h-5 w-5 text-cyan-400" />
                    </div>
                    <input
                      type={searchMethod === "email" ? "email" : "text"}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                      placeholder={
                        searchMethod === "recoveryId" ? "Enter your secret recovery phrase..." :
                        searchMethod === "email" ? "Enter your email address..." :
                        searchMethod === "username" ? "Enter your VFide username..." :
                        "Enter guardian wallet address..."
                      }
                      className="w-full pl-14 pr-6 py-5 rounded-2xl bg-white/5 border-2 border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500/50 text-lg transition-all"
                    />
                  </div>
                  
                  <motion.button
                    onClick={handleSearch}
                    disabled={isSearching}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full sm:w-auto px-6 sm:px-10 py-4 sm:py-5 bg-linear-to-r from-cyan-500 via-blue-500 to-purple-500 rounded-2xl font-bold text-white flex items-center justify-center gap-3 disabled:opacity-50 sm:min-w-50 shadow-lg shadow-cyan-500/30 relative overflow-hidden group"
                  >
                    {isSearching ? (
                      <>
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        >
                          <RefreshCw className="h-5 w-5" />
                        </motion.div>
                        <span>Searching...</span>
                      </>
                    ) : (
                      <>
                        <Scan className="h-5 w-5" />
                        <span>Search Vault</span>
                      </>
                    )}
                    <motion.div
                      className="absolute inset-0 bg-linear-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700"
                    />
                  </motion.button>
                </div>
                
                {/* Error message */}
                <AnimatePresence>
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -10, height: 0 }}
                      animate={{ opacity: 1, y: 0, height: 'auto' }}
                      exit={{ opacity: 0, y: -10, height: 0 }}
                      className="mt-4 p-4 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center gap-3"
                    >
                      <AlertCircle className="h-5 w-5 text-red-400 shrink-0" />
                      <p className="text-red-400">{error}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </GlassCard>
            </motion.div>
            
            {/* Search Result */}
            <AnimatePresence>
              {searchResult && (
                <SearchResultCard 
                  vault={searchResult} 
                  onClaimClick={() => setShowClaimModal(true)}
                />
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </section>
      
      {/* How It Works Section */}
      <section className="relative py-20">
        <div className="container mx-auto px-4 max-w-5xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <motion.div 
              initial={{ scale: 0 }}
              whileInView={{ scale: 1 }}
              viewport={{ once: true }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-500/20 border border-purple-500/30 mb-4"
            >
              <Zap className="h-4 w-4 text-purple-400" />
              <span className="text-sm text-purple-400 font-medium">Secure Process</span>
            </motion.div>
            <h2 className="text-4xl font-bold text-white mb-4">How Recovery Works</h2>
            <p className="text-gray-400 text-lg">A secure, multi-step process to protect against fraud</p>
          </motion.div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: 1,
                icon: Search,
                title: "Find Your Vault",
                description: "Search using your recovery ID, email, username, or through a trusted guardian",
                gradient: "cyan" as const
              },
              {
                step: 2,
                icon: Users,
                title: "Guardian Verification",
                description: "Your pre-designated guardians verify your identity and approve the recovery request",
                gradient: "purple" as const
              },
              {
                step: 3,
                icon: Unlock,
                title: "Secure Transfer",
                description: "After a 7-day challenge period, ownership securely transfers to your new wallet",
                gradient: "green" as const
              }
            ].map((item, index) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.15 }}
              >
                <GlassCard className="p-8 h-full" gradient={item.gradient} glow>
                  <div className="flex items-center gap-4 mb-6">
                    <motion.div 
                      whileHover={{ rotate: 360 }}
                      transition={{ duration: 0.5 }}
                      className="w-14 h-14 rounded-2xl bg-gradient-to-br from-white/20 to-white/5 flex items-center justify-center text-2xl font-black text-white border border-white/20"
                    >
                      {item.step}
                    </motion.div>
                    <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center border border-white/10">
                      <item.icon className="h-6 w-6 text-white" />
                    </div>
                  </div>
                  <h3 className="text-xl font-bold text-white mb-3">{item.title}</h3>
                  <p className="text-gray-400 leading-relaxed">{item.description}</p>
                </GlassCard>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
      
      {/* CTA Section */}
      <section className="relative py-16">
        <div className="container mx-auto px-4 max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <GlassCard className="p-10 text-center relative overflow-hidden" gradient="gold" glow hover={false}>
              {/* Animated background */}
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
                className="absolute -top-20 -right-20 w-64 h-64 bg-gradient-to-br from-amber-500/20 to-transparent rounded-full blur-3xl"
              />
              <motion.div
                animate={{ rotate: -360 }}
                transition={{ duration: 45, repeat: Infinity, ease: "linear" }}
                className="absolute -bottom-20 -left-20 w-48 h-48 bg-gradient-to-br from-orange-500/20 to-transparent rounded-full blur-3xl"
              />
              
              <div className="relative z-10">
                <motion.div
                  animate={{ y: [-5, 5, -5] }}
                  transition={{ duration: 3, repeat: Infinity }}
                  className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/30"
                >
                  <Shield className="h-10 w-10 text-white" />
                </motion.div>
                
                <h2 className="text-3xl font-bold text-white mb-3">Set Up Your Recovery Now</h2>
                <p className="text-gray-400 mb-8 max-w-lg mx-auto">
                  Don&apos;t wait until you lose your wallet. Configure your recovery options today 
                  and never worry about losing access to your assets.
                </p>
                
                <Link href="/vault/settings">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="px-10 py-4 bg-linear-to-r from-amber-500 to-orange-500 rounded-xl font-bold text-white inline-flex items-center gap-3 shadow-lg shadow-amber-500/30 relative overflow-hidden group"
                  >
                    <span className="relative z-10 flex items-center gap-2">
                      Configure Recovery
                      <ChevronRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                    </span>
                    <motion.div
                      className="absolute inset-0 bg-linear-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700"
                    />
                  </motion.button>
                </Link>
              </div>
            </GlassCard>
          </motion.div>
        </div>
      </section>
      
      {/* Claim Modal */}
      <AnimatePresence>
        {showClaimModal && searchResult && (
          <ClaimFlowModal 
            vault={{ address: searchResult.address, originalOwner: searchResult.originalOwner }}
            onClose={() => setShowClaimModal(false)}
          />
        )}
      </AnimatePresence>
      
      <Footer />
    </main>
  );
}

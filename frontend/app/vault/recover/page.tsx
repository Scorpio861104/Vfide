"use client";

import { GlobalNav } from "@/components/layout/GlobalNav";
import { Footer } from "@/components/layout/Footer";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Search, Shield, Key, Mail, Phone, User, Users, Hash, 
  AlertCircle, ChevronRight, Clock, CheckCircle2, XCircle,
  Sparkles, Fingerprint, ArrowRight, Lock, Unlock, HelpCircle
} from "lucide-react";
import Link from "next/link";
import { useAccount } from "wagmi";
import { keccak256, toBytes, toHex } from "viem";

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 100 } }
};

// Glassmorphism card
function GlassCard({ children, className = "", hover = true, gradient }: { 
  children: React.ReactNode; 
  className?: string;
  hover?: boolean;
  gradient?: "cyan" | "gold" | "purple" | "green" | "red";
}) {
  const gradientMap = {
    cyan: "from-cyan-500/20 to-blue-500/10",
    gold: "from-amber-500/20 to-orange-500/10",
    purple: "from-purple-500/20 to-pink-500/10",
    green: "from-emerald-500/20 to-teal-500/10",
    red: "from-red-500/20 to-red-500/5"
  };
  
  return (
    <motion.div
      whileHover={hover ? { scale: 1.01, y: -2 } : {}}
      transition={{ type: "spring", stiffness: 400 }}
      className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${gradient ? gradientMap[gradient] : 'from-white/[0.08] to-white/[0.02]'} backdrop-blur-xl border border-white/10 ${className}`}
    >
      {children}
    </motion.div>
  );
}

// Search Method Button
function SearchMethodButton({ 
  icon: Icon, 
  title, 
  description, 
  active, 
  onClick,
  gradient 
}: { 
  icon: React.ElementType;
  title: string;
  description: string;
  active: boolean;
  onClick: () => void;
  gradient: "cyan" | "gold" | "purple" | "green";
}) {
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={`relative p-4 rounded-xl border text-left transition-all ${
        active 
          ? 'bg-cyan-500/20 border-cyan-500/50 shadow-lg shadow-cyan-500/20' 
          : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20'
      }`}
    >
      <div className={`w-10 h-10 rounded-lg ${active ? 'bg-cyan-500/30' : 'bg-white/10'} flex items-center justify-center mb-3`}>
        <Icon className={`h-5 w-5 ${active ? 'text-cyan-400' : 'text-gray-400'}`} />
      </div>
      <h4 className={`font-semibold mb-1 ${active ? 'text-white' : 'text-gray-300'}`}>{title}</h4>
      <p className="text-xs text-gray-500">{description}</p>
      {active && (
        <motion.div
          layoutId="activeIndicator"
          className="absolute top-2 right-2 w-2 h-2 rounded-full bg-cyan-400"
        />
      )}
    </motion.button>
  );
}

// Search Result Card
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
    <GlassCard className="p-6" gradient="cyan">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Shield className="h-5 w-5 text-cyan-400" />
            <span className="text-sm text-cyan-400 font-medium">Vault Found</span>
          </div>
          <h3 className="text-xl font-bold text-white mb-1">
            {vault.address.slice(0, 6)}...{vault.address.slice(-4)}
          </h3>
          <p className="text-sm text-gray-400">
            Original Owner: {vault.originalOwner.slice(0, 8)}...{vault.originalOwner.slice(-6)}
          </p>
        </div>
        
        {vault.isRecoverable ? (
          <motion.button
            onClick={onClaimClick}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-lg font-semibold text-white flex items-center gap-2"
          >
            <Key className="h-4 w-4" />
            Claim Vault
          </motion.button>
        ) : (
          <div className="px-4 py-2 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400 text-sm flex items-center gap-2">
            <Lock className="h-4 w-4" />
            No Recovery Set
          </div>
        )}
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-4 border-t border-white/10">
        <div>
          <p className="text-xs text-gray-500 mb-1">Proof Score</p>
          <p className="text-lg font-bold text-cyan-400">{vault.proofScore}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-1">Badges</p>
          <p className="text-lg font-bold text-purple-400">{vault.badgeCount}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-1">Guardians</p>
          <p className="text-lg font-bold text-emerald-400">
            {vault.hasGuardians ? <CheckCircle2 className="h-5 w-5" /> : <XCircle className="h-5 w-5 text-gray-600" />}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-1">Last Active</p>
          <p className="text-sm text-gray-300">{vault.lastActive}</p>
        </div>
      </div>
    </GlassCard>
  );
}

// Claim Flow Modal
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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl border border-white/10 shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="p-6 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border-b border-white/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-cyan-500/30 flex items-center justify-center">
                <Key className="h-6 w-6 text-cyan-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Claim Your Vault</h2>
                <p className="text-sm text-gray-400">Step {step} of 3</p>
              </div>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-white">
              <XCircle className="h-6 w-6" />
            </button>
          </div>
          
          {/* Progress bar */}
          <div className="flex gap-2 mt-4">
            {[1, 2, 3].map((s) => (
              <div 
                key={s}
                className={`flex-1 h-1 rounded-full ${s <= step ? 'bg-cyan-500' : 'bg-white/20'}`}
              />
            ))}
          </div>
        </div>
        
        {/* Content */}
        <div className="p-6">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                  <p className="text-sm text-gray-400 mb-1">Vault Address</p>
                  <p className="font-mono text-cyan-400">{vault.address}</p>
                </div>
                
                <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                  <p className="text-sm text-gray-400 mb-1">Your New Wallet</p>
                  <p className="font-mono text-emerald-400">
                    {newWalletAddress || "Connect wallet to continue"}
                  </p>
                </div>
                
                <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-amber-400 mt-0.5" />
                    <div>
                      <p className="text-sm text-amber-400 font-medium">Important</p>
                      <p className="text-xs text-gray-400 mt-1">
                        This will initiate a 7-day challenge period. The original wallet can cancel the claim during this time. Your guardians will need to approve.
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
            
            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <div>
                  <label className="block text-sm text-gray-400 mb-2">
                    <Fingerprint className="h-4 w-4 inline mr-2" />
                    Recovery ID
                  </label>
                  <input
                    type="text"
                    value={recoveryId}
                    onChange={(e) => setRecoveryId(e.target.value)}
                    placeholder="Enter your secret recovery phrase"
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500/50"
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    This is the recovery ID you set when creating your vault
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm text-gray-400 mb-2">
                    <HelpCircle className="h-4 w-4 inline mr-2" />
                    Reason for Recovery
                  </label>
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Explain why you need to recover this vault (lost device, seed phrase destroyed, etc.)"
                    rows={3}
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500/50 resize-none"
                  />
                </div>
              </motion.div>
            )}
            
            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <div className="text-center py-6">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 200 }}
                    className="w-20 h-20 mx-auto rounded-full bg-cyan-500/20 flex items-center justify-center mb-4"
                  >
                    <Clock className="h-10 w-10 text-cyan-400" />
                  </motion.div>
                  <h3 className="text-xl font-bold text-white mb-2">Claim Submitted</h3>
                  <p className="text-gray-400 text-sm">
                    Your recovery claim has been submitted. Here&apos;s what happens next:
                  </p>
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-white/5">
                    <div className="w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center text-cyan-400 text-sm font-bold">1</div>
                    <div>
                      <p className="text-sm text-white">Guardian Approval</p>
                      <p className="text-xs text-gray-500">Your guardians will vote on this claim</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-white/5">
                    <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-400 text-sm font-bold">2</div>
                    <div>
                      <p className="text-sm text-white">7-Day Challenge Period</p>
                      <p className="text-xs text-gray-500">Original wallet can cancel if not truly lost</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-white/5">
                    <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 text-sm font-bold">3</div>
                    <div>
                      <p className="text-sm text-white">Ownership Transfer</p>
                      <p className="text-xs text-gray-500">Vault transfers to your new wallet</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        
        {/* Footer */}
        <div className="p-6 border-t border-white/10 flex justify-between">
          {step > 1 && step < 3 ? (
            <button
              onClick={() => setStep(step - 1)}
              className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
            >
              Back
            </button>
          ) : (
            <div />
          )}
          
          {step < 3 ? (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setStep(step + 1)}
              disabled={step === 2 && !recoveryId}
              className="px-6 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-lg font-semibold text-white flex items-center gap-2 disabled:opacity-50"
            >
              Continue
              <ArrowRight className="h-4 w-4" />
            </motion.button>
          ) : (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={onClose}
              className="px-6 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-lg font-semibold text-white flex items-center gap-2"
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
  const { isConnected, address } = useAccount();
  const [searchMethod, setSearchMethod] = useState<"recoveryId" | "email" | "username" | "guardian">("recoveryId");
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
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
  
  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setError("Please enter a search term");
      return;
    }
    
    setIsSearching(true);
    setError("");
    setSearchResult(null);
    
    // Simulate search (in production, this would call the VaultRegistry contract)
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Mock result for demonstration
    if (searchQuery.toLowerCase() === "demo" || searchQuery.length > 3) {
      setSearchResult({
        address: "0x1234567890abcdef1234567890abcdef12345678",
        originalOwner: "0xabcdef1234567890abcdef1234567890abcdef12",
        proofScore: 847,
        badgeCount: 12,
        hasGuardians: true,
        lastActive: "2 days ago",
        isRecoverable: true
      });
    } else {
      setError("No vault found with that identifier. Please check and try again.");
    }
    
    setIsSearching(false);
  };
  
  return (
    <main className="min-h-screen bg-[#0a0b0f] relative overflow-hidden">
      {/* Aurora Background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-cyan-500/10 rounded-full blur-[128px] animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-purple-500/10 rounded-full blur-[128px] animate-pulse" style={{ animationDelay: '1s' }} />
      </div>
      
      <GlobalNav />
      
      {/* Hero Section */}
      <section className="relative pt-24 pb-16">
        <div className="container mx-auto px-4 max-w-4xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-cyan-500/10 border border-cyan-500/30 mb-6"
          >
            <Sparkles className="h-4 w-4 text-cyan-400" />
            <span className="text-sm text-cyan-400">Industry First: Wallet Recovery Without Seed Phrases</span>
          </motion.div>
          
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-4xl md:text-5xl font-bold text-white mb-4"
          >
            Find & Recover <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400">Your Vault</span>
          </motion.h1>
          
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-xl text-gray-400 max-w-2xl mx-auto"
          >
            Lost your wallet? No problem. Search for your vault using your recovery ID, email, username, or through your guardians.
          </motion.p>
        </div>
      </section>
      
      {/* Search Section */}
      <section className="relative py-8">
        <div className="container mx-auto px-4 max-w-4xl">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="space-y-6"
          >
            {/* Search Methods */}
            <motion.div variants={itemVariants}>
              <h3 className="text-lg font-semibold text-white mb-4">How would you like to search?</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <SearchMethodButton
                  icon={Fingerprint}
                  title="Recovery ID"
                  description="Your secret phrase"
                  active={searchMethod === "recoveryId"}
                  onClick={() => setSearchMethod("recoveryId")}
                  gradient="cyan"
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
              <GlassCard className="p-6" hover={false}>
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1 relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" />
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
                      className="w-full pl-12 pr-4 py-4 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500/50 text-lg"
                    />
                  </div>
                  
                  <motion.button
                    onClick={handleSearch}
                    disabled={isSearching}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="px-8 py-4 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-xl font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-50 min-w-[160px]"
                  >
                    {isSearching ? (
                      <>
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        >
                          <Search className="h-5 w-5" />
                        </motion.div>
                        Searching...
                      </>
                    ) : (
                      <>
                        <Search className="h-5 w-5" />
                        Search Vault
                      </>
                    )}
                  </motion.button>
                </div>
                
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-4 p-4 rounded-lg bg-red-500/10 border border-red-500/30 flex items-center gap-3"
                  >
                    <AlertCircle className="h-5 w-5 text-red-400" />
                    <p className="text-red-400">{error}</p>
                  </motion.div>
                )}
              </GlassCard>
            </motion.div>
            
            {/* Search Result */}
            <AnimatePresence>
              {searchResult && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                >
                  <SearchResultCard 
                    vault={searchResult} 
                    onClaimClick={() => setShowClaimModal(true)}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </section>
      
      {/* How It Works Section */}
      <section className="relative py-16">
        <div className="container mx-auto px-4 max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl font-bold text-white mb-4">How Vault Recovery Works</h2>
            <p className="text-gray-400">A secure, multi-step process to protect against fraud</p>
          </motion.div>
          
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                step: 1,
                icon: Search,
                title: "Find Your Vault",
                description: "Search using your recovery ID, email, username, or through a guardian you trust",
                gradient: "cyan"
              },
              {
                step: 2,
                icon: Users,
                title: "Guardian Verification",
                description: "Your pre-designated guardians verify your identity and approve the recovery",
                gradient: "purple"
              },
              {
                step: 3,
                icon: Unlock,
                title: "Secure Transfer",
                description: "After a 7-day challenge period, ownership transfers to your new wallet",
                gradient: "green"
              }
            ].map((item) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: item.step * 0.1 }}
              >
                <GlassCard className="p-6 h-full" gradient={item.gradient as "cyan" | "purple" | "green"}>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-xl font-bold text-white">
                      {item.step}
                    </div>
                    <item.icon className="h-6 w-6 text-cyan-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">{item.title}</h3>
                  <p className="text-sm text-gray-400">{item.description}</p>
                </GlassCard>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
      
      {/* CTA Section */}
      <section className="relative py-16">
        <div className="container mx-auto px-4 max-w-4xl">
          <GlassCard className="p-8 text-center" gradient="gold" hover={false}>
            <Shield className="h-12 w-12 text-amber-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">Set Up Your Recovery Now</h2>
            <p className="text-gray-400 mb-6">
              Don&apos;t wait until you lose your wallet. Set up recovery options now to protect your assets.
            </p>
            <Link href="/vault/settings">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 rounded-xl font-semibold text-white inline-flex items-center gap-2"
              >
                Configure Recovery
                <ChevronRight className="h-5 w-5" />
              </motion.button>
            </Link>
          </GlassCard>
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

/**
 * AccountButton — The only auth UI the user ever sees
 * 
 * Not connected → "Get Started" → modal with email/phone/Google/Apple/wallet options
 * Connected → avatar + name/address + dropdown with account actions
 * 
 * Replaces ConnectButton everywhere in the app.
 */
'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Mail, Phone, Globe, X, LogOut, Wallet, Shield, ChevronDown, Fingerprint, Loader2, type LucideIcon } from 'lucide-react';
import { useVFIDEWallet, type AuthMethod } from './VFIDEWalletProvider';

// ── Sign-In Modal ───────────────────────────────────────────────────────────

function SignInModal({ onClose }: { onClose: () => void }) {
  const { signIn, status } = useVFIDEWallet();
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [mode, setMode] = useState<'choose' | 'email' | 'phone'>('choose');
  const [error, setError] = useState<string | null>(null);

  const isLoading = status === 'connecting' || status === 'creating-wallet' || status === 'creating-vault';

  const statusMessages: Record<string, string> = {
    'connecting': 'Signing in...',
    'creating-wallet': 'Setting up your account...',
    'creating-vault': 'Creating your vault...',
  };

  const handleSignIn = async (method: AuthMethod, credential?: string) => {
    setError(null);
    try {
      await signIn(method, credential);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    }
  };

  const authOptions: { method: AuthMethod; label: string; icon: LucideIcon; color: string }[] = [
    { method: 'email', label: 'Continue with email', icon: Mail, color: 'cyan' },
    { method: 'phone', label: 'Continue with phone', icon: Phone, color: 'emerald' },
    { method: 'google', label: 'Continue with Google', icon: Globe, color: 'red' },
    { method: 'passkey', label: 'Use passkey', icon: Fingerprint, color: 'purple' },
    { method: 'wallet', label: 'Connect wallet', icon: Wallet, color: 'amber' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={e => e.stopPropagation()}
        className="bg-zinc-900 border border-white/10 rounded-2xl w-full max-w-sm overflow-hidden"
      >
        {/* Header */}
        <div className="p-6 pb-0 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white">
              {mode === 'choose' ? 'Get started' : mode === 'email' ? 'Enter your email' : 'Enter your phone'}
            </h2>
            <p className="text-gray-400 text-sm mt-1">
              {mode === 'choose' ? 'No crypto experience needed' : 'We\'ll create your account automatically'}
            </p>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-white"><X size={20} /></button>
        </div>

        <div className="p-6">
          {/* Loading state */}
          {isLoading && (
            <div className="text-center py-8">
              <Loader2 size={32} className="text-cyan-400 animate-spin mx-auto mb-4" />
              <p className="text-white font-medium">{statusMessages[status]}</p>
              <p className="text-gray-500 text-xs mt-1">This only takes a moment</p>
            </div>
          )}

          {/* Error */}
          {error && !isLoading && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 mb-4 text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Choose method */}
          {!isLoading && mode === 'choose' && (
            <div className="space-y-2">
              {authOptions.map(opt => (
                <button
                  key={opt.method}
                  onClick={() => {
                    if (opt.method === 'email') setMode('email');
                    else if (opt.method === 'phone') setMode('phone');
                    else handleSignIn(opt.method);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3.5 bg-white/5 border border-white/10 rounded-xl text-white hover:border-white/20 hover:bg-white/8 transition-all"
                >
                  <opt.icon size={20} className={`text-${opt.color}-400`} />
                  <span className="font-medium text-sm">{opt.label}</span>
                </button>
              ))}
            </div>
          )}

          {/* Email input */}
          {!isLoading && mode === 'email' && (
            <div className="space-y-4">
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoFocus
                className="w-full px-4 py-3.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:border-cyan-500/50 focus:outline-none"
              />
              <button
                onClick={() => handleSignIn('email', email)}
                disabled={!email.includes('@')}
                className="w-full py-3.5 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-xl font-bold disabled:opacity-50"
              >
                Continue
              </button>
              <button onClick={() => setMode('choose')} className="w-full text-gray-400 text-sm hover:text-white">
                Back to options
              </button>
            </div>
          )}

          {/* Phone input */}
          {!isLoading && mode === 'phone' && (
            <div className="space-y-4">
              <input
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="+1 555 123 4567"
                autoFocus
                className="w-full px-4 py-3.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:border-cyan-500/50 focus:outline-none"
              />
              <button
                onClick={() => handleSignIn('phone', phone)}
                disabled={phone.length < 8}
                className="w-full py-3.5 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-xl font-bold disabled:opacity-50"
              >
                Continue
              </button>
              <button onClick={() => setMode('choose')} className="w-full text-gray-400 text-sm hover:text-white">
                Back to options
              </button>
            </div>
          )}

          {/* Footer */}
          {!isLoading && (
            <p className="text-center text-gray-600 text-xs mt-6">
              By continuing you agree to VFIDE&apos;s terms. No crypto experience required — we handle everything.
            </p>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Account Dropdown ────────────────────────────────────────────────────────

function AccountDropdown({ onClose }: { onClose: () => void }) {
  const { account, signOut } = useVFIDEWallet();
  if (!account) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="absolute right-0 top-full mt-2 w-64 bg-zinc-900 border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50"
    >
      <div className="p-4 border-b border-white/5">
        <div className="text-white font-bold text-sm">{account.displayName || 'VFIDE Account'}</div>
        <div className="text-gray-500 text-xs font-mono mt-0.5">{account.address.slice(0, 8)}...{account.address.slice(-6)}</div>
        {account.email && <div className="text-gray-400 text-xs mt-1">{account.email}</div>}
      </div>

      <div className="p-2">
        <div className="flex items-center gap-3 px-3 py-2 text-sm text-gray-400">
          <Shield size={14} className="text-cyan-400" />
          <span>ProofScore: {account.proofScore.toLocaleString()}</span>
        </div>
      </div>

      <div className="border-t border-white/5 p-2">
        <button
          onClick={async () => { await signOut(); onClose(); }}
          className="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
        >
          <LogOut size={14} />
          Sign out
        </button>
      </div>
    </motion.div>
  );
}

// ── Main Button ─────────────────────────────────────────────────────────────

export function AccountButton({ className = '' }: { className?: string }) {
  const { account, status } = useVFIDEWallet();
  const [showModal, setShowModal] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  const isLoading = status === 'connecting' || status === 'creating-wallet' || status === 'creating-vault';

  if (!account && !isLoading) {
    return (
      <>
        <button
          onClick={() => setShowModal(true)}
          className={`px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-xl font-bold hover:scale-[1.02] transition-transform ${className}`}
        >
          Get Started
        </button>
        <AnimatePresence>
          {showModal && <SignInModal onClose={() => setShowModal(false)} />}
        </AnimatePresence>
      </>
    );
  }

  if (isLoading) {
    return (
      <div className={`flex items-center gap-2 px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl ${className}`}>
        <Loader2 size={16} className="text-cyan-400 animate-spin" />
        <span className="text-gray-400 text-sm">Setting up...</span>
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className={`flex items-center gap-2 px-3 py-2 bg-white/5 border border-white/10 rounded-xl hover:border-white/20 transition-colors ${className}`}
      >
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white text-xs font-bold">
          {account?.displayName?.[0]?.toUpperCase() || account?.address.slice(2, 4).toUpperCase()}
        </div>
        <span className="text-white text-sm font-medium max-w-[120px] truncate">
          {account?.displayName || `${account?.address.slice(0, 6)}...`}
        </span>
        <ChevronDown size={14} className="text-gray-400" />
      </button>

      <AnimatePresence>
        {showDropdown && <AccountDropdown onClose={() => setShowDropdown(false)} />}
      </AnimatePresence>
    </div>
  );
}

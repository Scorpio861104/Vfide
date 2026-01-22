'use client';

/**
 * Embedded Wallet Login UI
 * 
 * Beautiful login component for email/social authentication
 * that creates wallets for non-crypto users.
 */

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Mail,
  ArrowRight,
  Loader2,
  AlertCircle,
  CheckCircle,
  Chrome,
  Twitter,
  Smartphone,
} from 'lucide-react';
import { useEmailLogin, useSocialLogin, useEmbeddedWallet } from '@/lib/embeddedWallet/embeddedWalletService';

// ==================== TYPES ====================

export interface EmbeddedLoginProps {
  /** Show social login options */
  showSocial?: boolean;
  /** Show email login */
  showEmail?: boolean;
  /** Show SMS login */
  showSMS?: boolean;
  /** Callback when login succeeds */
  onSuccess?: () => void;
  /** Callback when login fails */
  onError?: (error: string) => void;
  /** Custom class name */
  className?: string;
}

// ==================== ICONS ====================

function AppleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
    </svg>
  );
}

function DiscordIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
    </svg>
  );
}

// ==================== SUB-COMPONENTS ====================

function EmailLoginForm({ onSuccess, onError }: { onSuccess?: () => void; onError?: (error: string) => void }) {
  const { email, setEmail, submit, isLoading, error } = useEmailLogin();
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await submit();
      setSent(true);
      onSuccess?.();
    } catch (err) {
      onError?.(err instanceof Error ? err.message : 'Login failed');
    }
  };

  if (sent) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center py-6"
      >
        <div className="w-16 h-16 mx-auto mb-4 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
          <CheckCircle className="w-8 h-8 text-green-500" />
        </div>
        <h3 className="font-semibold text-lg mb-2">Check your email</h3>
        <p className="text-sm text-gray-500">
          We sent a login link to <span className="font-medium text-gray-700 dark:text-gray-300">{email}</span>
        </p>
        <button
          onClick={() => setSent(false)}
          className="mt-4 text-sm text-blue-600 hover:text-blue-700"
        >
          Use a different email
        </button>
      </motion.div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Email address
        </label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            required
            disabled={isLoading}
          />
        </div>
      </div>

      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 text-red-600 text-sm"
        >
          <AlertCircle className="w-4 h-4" />
          {error}
        </motion.div>
      )}

      <button
        type="submit"
        disabled={isLoading || !email}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold rounded-xl transition-colors"
      >
        {isLoading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Sending link...
          </>
        ) : (
          <>
            Continue with Email
            <ArrowRight className="w-5 h-5" />
          </>
        )}
      </button>
    </form>
  );
}

function SocialLoginButtons({ onSuccess, onError }: { onSuccess?: () => void; onError?: (error: string) => void }) {
  const { loginWithGoogle, loginWithApple, loginWithTwitter, loginWithDiscord, isLoading } = useSocialLogin();

  const handleLogin = async (provider: 'google' | 'apple' | 'twitter' | 'discord') => {
    try {
      const login = {
        google: loginWithGoogle,
        apple: loginWithApple,
        twitter: loginWithTwitter,
        discord: loginWithDiscord,
      }[provider];

      await login();
      onSuccess?.();
    } catch (err) {
      onError?.(err instanceof Error ? err.message : 'Login failed');
    }
  };

  const socialButtons = [
    { id: 'google' as const, label: 'Google', icon: Chrome, color: 'hover:bg-red-50 dark:hover:bg-red-900/20' },
    { id: 'apple' as const, label: 'Apple', icon: AppleIcon, color: 'hover:bg-gray-100 dark:hover:bg-gray-700' },
    { id: 'twitter' as const, label: 'Twitter', icon: Twitter, color: 'hover:bg-blue-50 dark:hover:bg-blue-900/20' },
    { id: 'discord' as const, label: 'Discord', icon: DiscordIcon, color: 'hover:bg-indigo-50 dark:hover:bg-indigo-900/20' },
  ];

  return (
    <div className="grid grid-cols-2 gap-3">
      {socialButtons.map(({ id, label, icon: Icon, color }) => (
        <button
          key={id}
          onClick={() => handleLogin(id)}
          disabled={isLoading}
          className={`
            flex items-center justify-center gap-2 px-4 py-3
            border border-gray-300 dark:border-gray-600 rounded-xl
            font-medium transition-colors disabled:opacity-50
            ${color}
          `}
        >
          <Icon className="w-5 h-5" />
          {label}
        </button>
      ))}
    </div>
  );
}

// ==================== MAIN COMPONENT ====================

export function EmbeddedLogin({
  showSocial = true,
  showEmail = true,
  showSMS = false,
  onSuccess,
  onError,
  className = '',
}: EmbeddedLoginProps) {
  const { state } = useEmbeddedWallet();

  // If already authenticated, show success
  if (state.isAuthenticated && state.user) {
    return (
      <div className={`p-6 text-center ${className}`}>
        <div className="w-16 h-16 mx-auto mb-4 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
          <CheckCircle className="w-8 h-8 text-green-500" />
        </div>
        <h3 className="font-semibold text-lg mb-2">You&apos;re logged in!</h3>
        <p className="text-sm text-gray-500">
          Connected as {state.user.email || state.user.name}
        </p>
        <p className="text-xs font-mono mt-2 text-gray-400">
          {state.walletAddress?.slice(0, 10)}...{state.walletAddress?.slice(-8)}
        </p>
      </div>
    );
  }

  return (
    <div className={`p-6 ${className}`}>
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold mb-2">Welcome to Vfide</h2>
        <p className="text-gray-500">
          Sign in to get started with your wallet
        </p>
      </div>

      {showEmail && (
        <EmailLoginForm onSuccess={onSuccess} onError={onError} />
      )}

      {showEmail && showSocial && (
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300 dark:border-gray-600" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-4 bg-white dark:bg-gray-900 text-gray-500">
              or continue with
            </span>
          </div>
        </div>
      )}

      {showSocial && (
        <SocialLoginButtons onSuccess={onSuccess} onError={onError} />
      )}

      {showSMS && (
        <button
          className="w-full mt-4 flex items-center justify-center gap-2 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          <Smartphone className="w-5 h-5" />
          Continue with Phone
        </button>
      )}

      <p className="text-xs text-center text-gray-400 mt-6">
        By continuing, you agree to our{' '}
        <a href="/terms" className="text-blue-600 hover:underline">Terms</a>
        {' '}and{' '}
        <a href="/privacy" className="text-blue-600 hover:underline">Privacy Policy</a>
      </p>
    </div>
  );
}

export default EmbeddedLogin;

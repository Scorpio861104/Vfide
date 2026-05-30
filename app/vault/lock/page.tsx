'use client';

export const dynamic = 'force-dynamic';

import { motion } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';
import { LockVaultPanel } from '@/components/vault/LockVaultPanel';
import { Footer } from '@/components/layout/Footer';
import { ErrorBoundary } from '@/components/error/ErrorBoundary';
import { useLocale } from '@/lib/locale/LocaleProvider';

export default function LockVaultPage() {
  const { locale } = useLocale();
  void locale;

  return (
    <>
      <div className="min-h-screen bg-gradient-to-b from-gray-950 to-black text-white md:pt-[3.5rem]">
        <div className="container mx-auto px-4 py-12 max-w-3xl">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-10"
          >
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-red-500 to-orange-600 rounded-2xl mb-4">
              <AlertTriangle className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-3xl sm:text-5xl font-black mb-3 bg-clip-text text-transparent bg-gradient-to-r from-red-400 via-orange-400 to-amber-400">
              Lock My Vault
            </h1>
            <p className="text-lg text-gray-400 max-w-xl mx-auto">
              Emergency dashboard for when your wallet may be compromised or your device is lost.
            </p>
          </motion.div>

          <ErrorBoundary>
            <LockVaultPanel />
          </ErrorBoundary>
        </div>
      </div>
      <Footer />
    </>
  );
}

'use client';

export const dynamic = 'force-dynamic';

/**
 * Merchant Setup Page — /merchant/setup
 * Mobile-first wizard to create a storefront in under 2 minutes
 */



import { Footer } from '@/components/layout/Footer';
import { MerchantQuickSetup } from '@/components/merchant/MerchantQuickSetup';
import { useAccount } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { motion } from 'framer-motion';
import { Store, Wallet } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function MerchantSetupPage() {
  const router = useRouter();
  const { isConnected } = useAccount();

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-zinc-950 pt-20 flex items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-1/4 left-1/4 w-150 h-150 bg-cyan-500/10 rounded-full blur-[120px] animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-100 h-100 bg-purple-500/10 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '1s' }} />
        </div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center px-4 relative z-10">
          <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-purple-500/20 border border-white/10 flex items-center justify-center backdrop-blur-xl">
            <Wallet className="text-cyan-400" size={40} />
          </div>
          <h1 className="text-3xl font-bold text-white mb-3">Connect to get started</h1>
          <p className="text-gray-400 mb-8 max-w-md">Connect your wallet to create your merchant storefront. No monthly fees — ever.</p>
          <ConnectButton />
        </motion.div>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-zinc-950 pt-24 pb-16 relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-1/4 -left-32 w-100 h-100 bg-cyan-500/8 rounded-full blur-[120px]" />
          <div className="absolute bottom-1/4 -right-32 w-100 h-100 bg-emerald-500/8 rounded-full blur-[100px]" />
        </div>
        
        <div className="container mx-auto px-4 relative z-10">
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-10">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-500/20 to-emerald-500/20 border border-cyan-500/30 rounded-full mb-4">
              <Store size={16} className="text-cyan-400" />
              <span className="text-sm text-cyan-400 font-medium">Merchant setup</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">Create your store</h1>
            <p className="text-gray-400 text-lg">Free storefront. No monthly fees. Live in 2 minutes.</p>
          </motion.div>

          <MerchantQuickSetup onComplete={(slug) => {
            router.push(`/store/${slug}`);
          }} />
        </div>
      </div>
      <Footer />
    </>
  );
}

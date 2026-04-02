'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, ExternalLink, Share2, QrCode, Check, Copy } from 'lucide-react';

interface SetupStepSuccessProps {
  businessName: string;
  slug: string;
}

export function SetupStepSuccess({ businessName, slug }: SetupStepSuccessProps) {
  const [copied, setCopied] = useState(false);

  const copyLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/store/${slug}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div key="step3" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-8">
      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 200, delay: 0.1 }}
        className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-emerald-500 to-green-500 flex items-center justify-center shadow-lg shadow-emerald-500/30">
        <CheckCircle2 size={40} className="text-white" />
      </motion.div>

      <h2 className="text-3xl font-bold text-white mb-2">You&apos;re live!</h2>
      <p className="text-gray-400 mb-8">{businessName} is ready to accept payments</p>

      <div className="bg-white/5 border border-white/10 rounded-xl p-4 mb-6 max-w-md mx-auto">
        <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">Your store link</div>
        <div className="flex items-center gap-2">
          <code className="flex-1 text-cyan-400 text-sm truncate">
            {typeof window !== 'undefined' ? window.location.origin : ''}/store/{slug}
          </code>
          <button onClick={copyLink} className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
            {copied ? <Check size={16} className="text-emerald-400" /> : <Copy size={16} className="text-gray-400" />}
          </button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <a href={`/store/${slug}`}
          className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:scale-[1.02] transition-transform">
          <ExternalLink size={18} /> View your store
        </a>
        <button onClick={copyLink}
          className="px-6 py-3 bg-white/5 border border-white/10 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-white/10 transition-colors">
          <Share2 size={18} /> Share link
        </button>
        <a href="/pos"
          className="px-6 py-3 bg-white/5 border border-white/10 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-white/10 transition-colors">
          <QrCode size={18} /> Open POS
        </a>
      </div>
    </motion.div>
  );
}

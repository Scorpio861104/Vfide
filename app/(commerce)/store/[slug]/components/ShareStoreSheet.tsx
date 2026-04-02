'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Copy, Check, MessageCircle, Share2, QrCode } from 'lucide-react';

interface ShareStoreSheetProps {
  show: boolean;
  onClose: () => void;
  storeName: string;
  slug: string;
}

export function ShareStoreSheet({ show, onClose, storeName, slug }: ShareStoreSheetProps) {
  const [copied, setCopied] = useState(false);
  const storeUrl = typeof window !== 'undefined' ? `${window.location.origin}/store/${slug}` : `/store/${slug}`;
  const whatsappText = encodeURIComponent(`Check out ${storeName} on VFIDE! ${storeUrl}`);

  const copyLink = () => {
    navigator.clipboard.writeText(storeUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareNative = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: storeName, text: `Shop at ${storeName} on VFIDE`, url: storeUrl });
      } catch { /* cancelled */ }
    } else {
      copyLink();
    }
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/70 z-50 flex items-end sm:items-center justify-center"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-zinc-900 border border-white/10 rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md p-6"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-white">Share {storeName}</h3>
              <button onClick={onClose} className="text-gray-400 hover:text-white"><X size={20} /></button>
            </div>

            {/* Store link */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-3 mb-4">
              <div className="text-xs text-gray-500 mb-1">Store link</div>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-cyan-400 text-sm truncate">{storeUrl}</code>
                <button onClick={copyLink} className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
                  {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} className="text-gray-400" />}
                </button>
              </div>
            </div>

            {/* Share options */}
            <div className="grid grid-cols-3 gap-3">
              <a
                href={`https://wa.me/?text=${whatsappText}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center gap-2 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl hover:bg-emerald-500/20 transition-colors"
              >
                <MessageCircle size={24} className="text-emerald-400" />
                <span className="text-xs text-emerald-400 font-medium">WhatsApp</span>
              </a>

              <button
                onClick={shareNative}
                className="flex flex-col items-center gap-2 p-4 bg-cyan-500/10 border border-cyan-500/20 rounded-xl hover:bg-cyan-500/20 transition-colors"
              >
                <Share2 size={24} className="text-cyan-400" />
                <span className="text-xs text-cyan-400 font-medium">Share</span>
              </button>

              <button
                onClick={copyLink}
                className="flex flex-col items-center gap-2 p-4 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-colors"
              >
                <QrCode size={24} className="text-gray-400" />
                <span className="text-xs text-gray-400 font-medium">QR Code</span>
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

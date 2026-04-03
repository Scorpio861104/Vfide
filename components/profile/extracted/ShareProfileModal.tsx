'use client';

// Extracted from page.tsx — verify imports
import { GlassCard } from '@/components/ui/GlassCard';
import { motion } from 'framer-motion';

export function ShareProfileModal({ profile, onClose }: { profile: UserProfile; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const profileUrl = typeof window !== 'undefined' ? `${window.location.origin}/profile/${profile.username}` : '';

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(profileUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* ignore */ }
  };

  const shareToTwitter = () => {
    const text = `Check out ${profile.displayName}'s profile on VFIDE!`;
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(profileUrl)}`, '_blank');
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 max-w-sm w-full"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-white">Share Profile</h3>
          <button onClick={onClose} className="p-2 hover:bg-zinc-800 rounded-lg transition-colors">
            <X className="w-5 h-5 text-zinc-400" />
          </button>
        </div>

        {/* QR Code Placeholder */}
        <div className="bg-white rounded-xl p-4 mb-6">
          <div className="w-full aspect-square bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg flex items-center justify-center">
            <div className="text-center">
              <QrCode className="w-16 h-16 text-gray-400 mx-auto mb-2" />
              <p className="text-xs text-gray-500">QR Code for {profile.username}</p>
            </div>
          </div>
        </div>

        {/* Share Link */}
        <div className="bg-zinc-900 rounded-lg p-3 mb-4">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={profileUrl}
              readOnly
              className="flex-1 bg-transparent text-sm text-zinc-400 truncate outline-none"
            />
            <button onClick={copyLink} className="p-2 hover:bg-zinc-800 rounded-lg transition-colors">
              {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 text-zinc-400" />}
            </button>
          </div>
        </div>

        {/* Share Options */}
        <div className="flex gap-2">
          <button
            onClick={shareToTwitter}
            className="flex-1 flex items-center justify-center gap-2 py-3 bg-sky-500/20 text-sky-500 rounded-lg hover:bg-sky-500/30 transition-colors"
          >
            <X className="w-4 h-4" />
            Twitter
          </button>
          <button
            onClick={copyLink}
            className="flex-1 flex items-center justify-center gap-2 py-3 bg-amber-400/20 text-amber-400 rounded-lg hover:bg-amber-400/30 transition-colors"
          >
            <Copy className="w-4 h-4" />
            {copied ? 'Copied!' : 'Copy Link'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

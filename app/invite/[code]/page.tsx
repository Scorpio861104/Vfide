'use client';

import { Footer } from '@/components/layout/Footer';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Gift, Shield, ArrowRight, Loader2 } from 'lucide-react';

export default function InvitePage() {
  const params = useParams();
  const code = params?.code as string;
  const [status, setStatus] = useState<'loading' | 'valid' | 'invalid' | 'claimed'>('loading');

  useEffect(() => {
    if (!code) { setStatus('invalid'); return; }
    fetch(`/api/users/invite?code=${code}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => setStatus(d?.valid ? 'valid' : 'invalid'))
      .catch(() => setStatus('invalid'));
  }, [code]);

  return (
    <>
      <div className="min-h-screen bg-zinc-950 pt-20 flex items-center justify-center px-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center max-w-md w-full bg-white/5 border border-white/10 rounded-2xl p-8 backdrop-blur-sm" aria-live="polite" aria-busy={status === 'loading'}>
          {status === 'loading' && (
            <>
              <Loader2 size={48} className="text-cyan-400 animate-spin mx-auto mb-6" />
              <p className="text-gray-300">Validating your invite link...</p>
            </>
          )}
          {status === 'valid' && (
            <>
              <Gift size={48} className="text-cyan-400 mx-auto mb-6" />
              <h1 className="text-3xl font-bold text-white mb-4">You&apos;re invited to VFIDE</h1>
              <p className="text-gray-400 mb-8">Join the trust-scored payment network. Zero merchant fees.</p>
              <Link href="/setup" className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-xl font-bold">
                Accept Invite <ArrowRight size={20} />
              </Link>
            </>
          )}
          {status === 'invalid' && (
            <>
              <Shield size={48} className="text-red-400 mx-auto mb-6" />
              <h1 className="text-2xl font-bold text-white mb-4">Invalid Invite</h1>
              <p className="text-gray-400 mb-6">This invite link is expired or invalid.</p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link href="/invite" className="px-5 py-3 rounded-xl border border-white/20 text-gray-200 hover:bg-white/10 transition-colors">Try another code</Link>
                <Link href="/" className="px-5 py-3 rounded-xl bg-white/10 text-white hover:bg-white/20 transition-colors">Back to home</Link>
              </div>
            </>
          )}
        </motion.div>
      </div>
      <Footer />
    </>
  );
}

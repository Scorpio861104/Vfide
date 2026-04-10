'use client';

import { Footer } from '@/components/layout/Footer';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Gift, Users, Shield, ArrowRight, Check, Loader2 } from 'lucide-react';

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
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center max-w-md">
          {status === 'loading' && <Loader2 size={48} className="text-cyan-400 animate-spin mx-auto" />}
          {status === 'valid' && (
            <>
              <Gift size={48} className="text-cyan-400 mx-auto mb-6" />
              <h1 className="text-3xl font-bold text-white mb-4">You&apos;re invited to VFIDE</h1>
              <p className="text-gray-400 mb-8">Join the trust-scored payment network. Zero merchant fees.</p>
              <a href="/setup" className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-xl font-bold">
                Accept Invite <ArrowRight size={20} />
              </a>
            </>
          )}
          {status === 'invalid' && (
            <>
              <Shield size={48} className="text-red-400 mx-auto mb-6" />
              <h1 className="text-2xl font-bold text-white mb-4">Invalid Invite</h1>
              <p className="text-gray-400">This invite link is expired or invalid.</p>
            </>
          )}
        </motion.div>
      </div>
      <Footer />
    </>
  );
}

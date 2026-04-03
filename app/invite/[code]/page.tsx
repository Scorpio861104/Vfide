'use client';

import { Footer } from '@/components/layout/Footer';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Shield, Loader2, Users } from 'lucide-react';
import { useAnnounce } from '@/lib/accessibility';
import { useAccount } from 'wagmi';

type InviteRecord = {
  id: string;
  groupId: string;
  code: string;
  createdAt: number;
  currentUses: number;
  maxUses: number;
  metadata?: {
    description?: string;
    requireApproval?: boolean;
  };
};

export default function InvitePage() {
  const params = useParams();
  const router = useRouter();
  const code = params?.code as string;
  const { isConnected } = useAccount();
  const { announce } = useAnnounce();
  const [status, setStatus] = useState<'loading' | 'valid' | 'invalid' | 'submitting' | 'joined'>('loading');
  const [invite, setInvite] = useState<InviteRecord | null>(null);

  useEffect(() => {
    if (!code) {
      setStatus('invalid');
      announce('Invalid invite link', 'assertive');
      return;
    }

    fetch(`/api/groups/invites?code=${code}`)
      .then((response) => response.json())
      .then((data) => {
        if (data?.success && data?.valid && data?.invite) {
          setInvite(data.invite as InviteRecord);
          setStatus('valid');
          return;
        }

        setStatus('invalid');
        announce('Invalid invite link', 'assertive');
      })
      .catch(() => {
        setStatus('invalid');
        announce('Invalid invite link', 'assertive');
      });
  }, [announce, code]);

  const handleJoin = async () => {
    if (!invite) {
      return;
    }

    setStatus('submitting');

    try {
      const response = await fetch('/api/groups/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: invite.code }),
      });
      const data = await response.json();

      if (!data?.success) {
        throw new Error('Unable to join group');
      }

      setStatus('joined');
      announce('Successfully joined group', 'polite');
      setTimeout(() => {
        router.push(`/groups/${data.groupId ?? invite.groupId}`);
      }, 2000);
    } catch {
      setStatus('valid');
      announce('Failed to join group', 'assertive');
    }
  };

  return (
    <>
      <div className="min-h-screen bg-zinc-950 pt-20 flex items-center justify-center px-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center max-w-md">
          {status === 'loading' && <Loader2 size={48} className="text-cyan-400 animate-spin mx-auto" />}
          {(status === 'valid' || status === 'submitting' || status === 'joined') && invite && (
            <>
              <Users size={48} className="text-cyan-400 mx-auto mb-6" />
              <h1 className="text-3xl font-bold text-white mb-4">You&apos;ve been invited!</h1>
              <p className="text-gray-300 mb-2">{invite.metadata?.description || 'Join this group'}</p>
              <p className="text-gray-400 mb-8">0 / {invite.maxUses} uses • Never expires</p>

              {isConnected ? (
                <button
                  type="button"
                  onClick={handleJoin}
                  disabled={status === 'submitting'}
                  className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-xl font-bold disabled:opacity-60"
                >
                  {status === 'submitting' ? <Loader2 size={20} className="animate-spin" /> : <Users size={20} />}
                  {status === 'joined' ? 'Joined Group' : 'Join Group'}
                  <span aria-hidden>→</span>
                </button>
              ) : (
                <div className="space-y-3">
                  <p className="text-gray-400">Connect your wallet to join this group.</p>
                  <a href="/setup" className="inline-flex items-center gap-2 px-6 py-3 bg-white/10 text-white rounded-xl font-semibold">
                    Connect Wallet <span aria-hidden>→</span>
                  </a>
                </div>
              )}
            </>
          )}
          {status === 'invalid' && (
            <>
              <Shield size={48} className="text-red-400 mx-auto mb-6" />
              <h1 className="text-2xl font-bold text-white mb-4">Invalid Invite</h1>
              <p className="text-gray-400">Invalid invite link. This invite link is expired or invalid.</p>
            </>
          )}
        </motion.div>
      </div>
      <Footer />
    </>
  );
}

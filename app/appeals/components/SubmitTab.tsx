'use client';

import { useMemo, useState } from 'react';
import { useAccount, useChainId } from 'wagmi';
import { useAppealStatus, useFileAppeal } from '@/lib/vfide-hooks';

const REASON_CODES: Record<string, string> = {
  '121': 'Code 121 — activity appears unusual but may still be valid and deserves manual review.',
  '404': 'Code 404 — linked evidence or attachment could not be found during automated review.',
};

export function SubmitTab() {
  const { isConnected } = useAccount();
  const chainId = useChainId();
  const [reasonCode, setReasonCode] = useState('');
  const [appealText, setAppealText] = useState('');
  const { hasAppeal, resolved, refetch } = useAppealStatus();
  const { fileAppeal, isLoading } = useFileAppeal();

  const codeMessage = useMemo(() => {
    if (!reasonCode.trim()) {
      return null;
    }

    return REASON_CODES[reasonCode.trim()] ?? `Unknown code: ${reasonCode.trim()}`;
  }, [reasonCode]);

  const isPending = Boolean(hasAppeal && !resolved);
  const buttonLabel = isPending ? 'Appeal Pending' : 'Submit Appeal';

  const handleSubmit = async () => {
    const trimmed = appealText.trim();
    if (!trimmed || !isConnected || isPending) {
      return;
    }

    await Promise.resolve(fileAppeal(trimmed));
    await Promise.resolve(refetch?.());
  };

  return (
    <div className="space-y-6">
      {!isConnected && (
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-amber-100">
          Connect your wallet to file an appeal.
        </div>
      )}

      {isPending && (
        <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/10 p-4 text-cyan-100">
          You already have a pending appeal. Our reviewers will update the case shortly.
        </div>
      )}

      <div className="rounded-2xl border border-white/10 bg-white/3 p-6">
        <h3 className="mb-2 text-xl font-bold text-white">Submit an Appeal</h3>
        <p className="mb-4 text-sm text-gray-400">Network: {chainId}</p>

        <div className="space-y-4">
          <input
            type="text"
            value={reasonCode}
            onChange={(event) => setReasonCode(event.target.value)}
            placeholder="Enter reason code"
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-gray-500"
          />
          {codeMessage ? <p className="text-sm text-cyan-300">{codeMessage.includes('Unknown code') ? codeMessage : `Code ${reasonCode.trim()} — ${codeMessage.replace(/^Code\s\d+\s—\s/, '')}`}</p> : null}
          <textarea
            value={appealText}
            onChange={(event) => setAppealText(event.target.value)}
            placeholder="Describe the issue"
            className="min-h-32 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-gray-500"
          />
          <button
            onClick={handleSubmit}
            disabled={!isConnected || isPending || isLoading || !appealText.trim()}
            className="rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-5 py-3 font-bold text-white disabled:opacity-50"
          >
            {buttonLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

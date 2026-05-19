'use client';

import { useState } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { Shield, Loader2, ExternalLink } from 'lucide-react';
import { getFutureContractAddress } from '@/lib/contracts/future-contracts';

const PASSPORT_ABI = [
  { name: 'hasMinted', type: 'function', stateMutability: 'view', inputs: [{ name: 'user', type: 'address' }], outputs: [{ type: 'bool' }] },
  { name: 'passportOf', type: 'function', stateMutability: 'view', inputs: [{ name: '', type: 'address' }], outputs: [{ type: 'uint256' }] },
  { name: 'minScoreToMint', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { name: 'mint', type: 'function', stateMutability: 'nonpayable', inputs: [], outputs: [] },
] as const;

function tierFromScore(score: number) {
  if (score >= 8000) return { label: 'Elite', color: '#f59e0b' };
  if (score >= 7000) return { label: 'Council', color: '#8b5cf6' };
  if (score >= 6000) return { label: 'Trusted', color: '#3b82f6' };
  if (score >= 5000) return { label: 'Governance', color: '#10b981' };
  if (score >= 3000) return { label: 'Neutral', color: '#6b7280' };
  if (score >= 1000) return { label: 'Low Trust', color: '#f97316' };
  return { label: 'Risky', color: '#ef4444' };
}

export function TrustPassportCard({ proofScore = 0 }: { proofScore?: number }) {
  const { address } = useAccount();
  const contractAddress = getFutureContractAddress('TrustScorePassport') as `0x${string}` | undefined;
  const [confirmed, setConfirmed] = useState(false);

  const { data: hasMinted } = useReadContract({
    address: contractAddress,
    abi: PASSPORT_ABI,
    functionName: 'hasMinted',
    args: address ? [address] : undefined,
    query: { enabled: !!address && !!contractAddress },
  });

  const { data: tokenId } = useReadContract({
    address: contractAddress,
    abi: PASSPORT_ABI,
    functionName: 'passportOf',
    args: address ? [address] : undefined,
    query: { enabled: !!address && !!contractAddress && !!hasMinted },
  });

  const { data: minScore } = useReadContract({
    address: contractAddress,
    abi: PASSPORT_ABI,
    functionName: 'minScoreToMint',
    query: { enabled: !!contractAddress },
  });

  const { writeContract, data: txHash, isPending } = useWriteContract();
  const { isLoading: isConfirming } = useWaitForTransactionReceipt({ hash: txHash });

  const minScoreNum = Number(minScore ?? 3000n);
  const tier = tierFromScore(proofScore);
  const canMint = proofScore >= minScoreNum;

  const handleMint = () => {
    if (!contractAddress) return;
    writeContract({ address: contractAddress, abi: PASSPORT_ABI, functionName: 'mint' });
  };

  if (!contractAddress) {
    return (
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5 text-center">
        <Shield size={32} className="mx-auto mb-3 text-slate-500" />
        <h3 className="font-semibold text-slate-300 mb-1">Trust Passport</h3>
        <p className="text-sm text-slate-500">Coming to mainnet soon</p>
        <div className="mt-3 text-xs text-slate-600 bg-slate-700/30 rounded-lg p-2">
          Soulbound NFT representing your trust tier on-chain
        </div>
      </div>
    );
  }

  if (hasMinted && tokenId) {
    return (
      <div className="rounded-xl overflow-hidden border-2" style={{ borderColor: tier.color }}>
        <div className="bg-slate-900 p-5 text-center">
          <div className="text-xs text-slate-500 mb-2">VFIDE Trust Passport</div>
          <div className="text-3xl font-bold mb-1" style={{ color: tier.color }}>{tier.label}</div>
          <div className="text-xl font-mono text-slate-300">{proofScore.toLocaleString()}</div>
          <div className="text-xs text-slate-500 mt-1">Token #{tokenId.toString()}</div>
          <div className="mt-3 flex justify-center gap-2">
            <a
              href={`https://opensea.io/assets/base/${contractAddress}/${tokenId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-400 hover:underline flex items-center gap-1"
            >
              View on OpenSea <ExternalLink size={10} />
            </a>
          </div>
        </div>
        <div className="px-4 py-2 text-center" style={{ backgroundColor: `${tier.color}15` }}>
          <span className="text-xs" style={{ color: tier.color }}>✓ Soulbound — Non-transferable</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5">
      <div className="flex items-center gap-2 mb-3">
        <Shield size={18} className="text-blue-400" />
        <h3 className="font-semibold text-slate-200">Trust Passport</h3>
      </div>
      <p className="text-sm text-slate-400 mb-4">
        Mint your on-chain soulbound NFT representing your {tier.label} tier.
      </p>

      {!canMint && (
        <div className="mb-4">
          <div className="flex justify-between text-xs text-slate-500 mb-1">
            <span>Score progress</span>
            <span>{proofScore.toLocaleString()} / {minScoreNum.toLocaleString()}</span>
          </div>
          <div className="w-full bg-slate-700 rounded-full h-1.5">
            <div
              className="bg-blue-500 h-1.5 rounded-full"
              style={{ width: `${Math.min(100, (proofScore / minScoreNum) * 100)}%` }}
            />
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Need {(minScoreNum - proofScore).toLocaleString()} more points
          </p>
        </div>
      )}

      <button
        onClick={handleMint}
        disabled={!canMint || isPending || isConfirming || !address}
        className="w-full py-2.5 px-4 rounded-lg font-medium text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        style={{
          backgroundColor: canMint ? `${tier.color}20` : undefined,
          color: canMint ? tier.color : '#64748b',
          borderWidth: 1,
          borderColor: canMint ? `${tier.color}50` : '#334155',
        }}
      >
        {(isPending || isConfirming) && <Loader2 size={14} className="animate-spin" />}
        {isPending ? 'Confirming…' : isConfirming ? 'Minting…' : canMint ? `Mint ${tier.label} Passport` : 'Score too low to mint'}
      </button>
    </div>
  );
}

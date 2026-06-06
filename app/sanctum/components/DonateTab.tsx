'use client';

import { VfideConnectButton } from '@/components/crypto/VfideConnectButton';
import { useState } from 'react';
import { AlertTriangle, Heart, Loader2 } from 'lucide-react';
import { parseEther, erc20Abi } from 'viem';
import { useAccount, useWriteContract, usePublicClient } from 'wagmi';

import { safeParseFloat } from '@/lib/validation';
import { useSanctumVault } from '@/hooks/useSanctumVault';
import { useContractAddresses } from '@/hooks/useContractAddresses';
import { isConfiguredContractAddress } from '@/lib/contracts';
import { parseContractError } from '@/lib/errorHandling';

export function DonateTab({ isConnected }: { isConnected: boolean }) {
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [status, setStatus] = useState<'idle' | 'approving' | 'depositing'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const { address } = useAccount();
  const CONTRACT_ADDRESSES = useContractAddresses();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();
  const { deposit, sanctumAddress, configured } = useSanctumVault();

  if (!isConnected) {
    return (
      <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-12 text-center">
        <Heart className="w-16 h-16 mx-auto mb-4 text-pink-400/50" />
        <h2 className="text-2xl font-bold text-zinc-100 mb-2">Connect to Donate</h2>
        <p className="text-zinc-400">Connect your wallet to make a direct donation to The Sanctum</p>
        <div className="mt-6 flex justify-center">
          <VfideConnectButton size="md" />
        </div>
      </div>
    );
  }

  const parsedAmount = safeParseFloat(amount, 0);
  const tokenAddress = CONTRACT_ADDRESSES.VFIDEToken;
  const contractsReady = configured
    && isConfiguredContractAddress(tokenAddress)
    && Boolean(sanctumAddress);
  const canSubmit = parsedAmount > 0 && status === 'idle' && contractsReady;

  const handleDonate = async () => {
    setError(null);
    setSuccess(null);
    if (!canSubmit) return;
    if (!address) {
      setError('Wallet not connected');
      return;
    }
    if (!sanctumAddress) {
      setError('Sanctum vault is not configured on this network');
      return;
    }

    let amountWei: bigint;
    try {
      amountWei = parseEther(parsedAmount.toString());
    } catch {
      setError('Invalid amount');
      return;
    }

    try {
      setStatus('approving');
      // 1. Approve sanctumVault to pull `amountWei` of VFIDE on our behalf.
      const approveHash = await writeContractAsync({
        address: tokenAddress,
        abi: erc20Abi,
        functionName: 'approve',
        args: [sanctumAddress, amountWei],
      });
      if (publicClient) {
        await publicClient.waitForTransactionReceipt({ hash: approveHash });
      }

      // 2. Call SanctumVault.deposit(token, amount, note).
      setStatus('depositing');
      const depositHash = await deposit(amountWei, { token: tokenAddress, note });
      if (publicClient) {
        await publicClient.waitForTransactionReceipt({ hash: depositHash });
      }

      setSuccess(`Donation of ${parsedAmount.toLocaleString()} VFIDE confirmed. Thank you for supporting The Sanctum.`);
      setAmount('');
      setNote('');
    } catch (err) {
      const parsed = parseContractError(err);
      setError(`Donation failed: ${parsed.userMessage}`);
    } finally {
      setStatus('idle');
    }
  };

  const buttonLabel = (() => {
    if (status === 'approving') return 'Approving VFIDE…';
    if (status === 'depositing') return 'Submitting donation…';
    return `Donate ${amount ? `${parsedAmount.toLocaleString()} VFIDE` : ''}`;
  })();

  return (
    <div className="max-w-xl mx-auto">
      <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-8">
        <div className="text-center mb-8">
          <Heart className="w-12 h-12 mx-auto mb-4 text-pink-400" />
          <h2 className="text-2xl font-bold text-zinc-100 mb-2">Make a Donation</h2>
          <p className="text-zinc-400">Direct donations to The Sanctum charity fund</p>
        </div>

        <div className="space-y-6">
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-zinc-400 text-sm">Amount (VFIDE)</label>
              <button
                type="button"
                onClick={() => setAmount('10000')}
                className="text-xs text-pink-400 hover:text-pink-300 font-bold"
              >
                MAX
              </button>
            </div>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              disabled={status !== 'idle'}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-3 text-zinc-100 focus:border-pink-500 focus:outline-none disabled:opacity-50"
            />
          </div>

          <div className="flex gap-2">
            {[100, 500, 1000, 5000].map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setAmount(String(preset))}
                disabled={status !== 'idle'}
                className="flex-1 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 text-sm transition-colors disabled:opacity-50"
              >
                {preset.toLocaleString()}
              </button>
            ))}
          </div>

          <div>
            <label className="text-zinc-400 text-sm mb-2 block">Note (optional)</label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              disabled={status !== 'idle'}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-3 text-zinc-100 focus:border-pink-500 focus:outline-none disabled:opacity-50"
            />
          </div>

          <button
            type="button"
            onClick={handleDonate}
            disabled={!canSubmit}
            className="w-full py-4 bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 disabled:from-gray-600 disabled:to-gray-600 text-white font-bold rounded-lg transition-all flex items-center justify-center gap-2"
          >
            {status !== 'idle' && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />}
            {buttonLabel}
          </button>

          {!contractsReady && (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-300">
              Sanctum vault or VFIDE token is not configured on this network. Donations are unavailable until contracts are deployed.
            </div>
          )}

          {error && (
            <div role="alert" className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
              {error}
            </div>
          )}

          {success && (
            <div role="status" className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-300">
              {success}
            </div>
          )}

          <div className="bg-pink-500/10 border border-pink-500/30 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 text-pink-400 shrink-0 mt-0.5" />
              <div className="text-sm text-zinc-400">
                Donations are permanent and non-refundable. Funds are distributed to DAO-approved charities only.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

'use client';

import { useAccount, useBalance, useChainId } from 'wagmi';
import { formatUnits } from 'viem';
import { Settings, Wallet, Circle, Info } from 'lucide-react';

export function ManageTab() {
  const { address, connector, isConnected } = useAccount();
  const chainId = useChainId();
  const { data: balance } = useBalance({ address });

  const isHardware = connector?.type === 'ledger' || connector?.type === 'trezor' ||
    (connector?.name?.toLowerCase().includes('ledger') ?? false) ||
    (connector?.name?.toLowerCase().includes('trezor') ?? false);

  if (!isConnected || !address) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Settings size={40} className="text-gray-600 mb-4" />
        <p className="text-gray-400">No wallet connected.</p>
        <p className="text-gray-500 text-sm mt-1">Go to the Connect tab to link your hardware wallet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white/3 border border-white/10 rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 bg-cyan-500/10 rounded-xl flex items-center justify-center">
            <Wallet size={18} className="text-cyan-400" />
          </div>
          <div>
            <p className="text-sm text-gray-400">Connected Account</p>
            <p className="text-white font-semibold text-sm">{connector?.name ?? 'Wallet'}</p>
          </div>
          <div className="ml-auto">
            {isHardware ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-500/10 text-green-400 text-xs border border-green-500/20">Hardware</span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 text-xs border border-blue-500/20">Software</span>
            )}
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-400">Address</p>
            <p className="text-sm text-gray-300 font-mono">{address.slice(0, 10)}…{address.slice(-8)}</p>
          </div>
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-400">Balance</p>
            <p className="text-sm text-white">{balance ? `${parseFloat(formatUnits(balance.value, balance.decimals)).toFixed(4)} ${balance.symbol}` : '—'}</p>
          </div>
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-400">Chain ID</p>
            <p className="text-sm text-white">{chainId}</p>
          </div>
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-400">Connector</p>
            <p className="text-sm text-white">{connector?.name ?? '—'}</p>
          </div>
        </div>
      </div>

      <div className="bg-white/3 border border-white/10 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-2">
          <Info size={14} className="text-gray-400" />
          <p className="text-xs text-gray-400 font-semibold">Derivation Path</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {["m/44'/60'/0'/0", "m/44'/60'/0'"].map((path) => (
            <span key={path} className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-xs text-gray-400 font-mono">{path}</span>
          ))}
        </div>
        <p className="text-xs text-gray-600 mt-2">Standard BIP-44 Ethereum paths. Ledger uses the first; legacy Ledger uses the second.</p>
      </div>

      <div className="bg-white/3 border border-white/10 rounded-xl p-4">
        <p className="text-xs text-gray-400 mb-2 font-semibold">Signing Configuration</p>
        <div className="space-y-2 text-xs text-gray-400">
          <div className="flex items-center gap-2">
            <Circle size={6} className="fill-green-400 text-green-400" />
            Transaction signing — enabled
          </div>
          <div className="flex items-center gap-2">
            <Circle size={6} className="fill-green-400 text-green-400" />
            Message signing (EIP-712) — enabled
          </div>
          <div className="flex items-center gap-2">
            <Circle size={6} className="fill-yellow-400 text-yellow-400" />
            Blind signing — device setting (enable in Ethereum app)
          </div>
        </div>
      </div>
    </div>
  );
}

'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount, useBalance, useChainId } from 'wagmi';
import { CURRENT_CHAIN_ID, FAUCET_URLS } from '@/lib/testnet';
import { useCopyWithId } from '@/lib/hooks/useCopyToClipboard';

const TARGET_NETWORK_NAME = 'Base Sepolia';
const TARGET_NETWORK_HEX = `0x${CURRENT_CHAIN_ID.toString(16)}`;

export function AccountTab() {
  const { isConnected, address } = useAccount();
  const chainId = useChainId();
  const { data: balance } = useBalance({ address, query: { enabled: !!address } });
  const { copiedId, copyWithId } = useCopyWithId<string>();
  const [networkMessage, setNetworkMessage] = useState<string | null>(null);

  const balanceValue = balance?.value ?? 0n;
  const balanceDecimals = balance?.decimals ?? 18;
  const normalizedBalance = Number(balanceValue) / 10 ** balanceDecimals;
  const onExpectedNetwork = chainId === CURRENT_CHAIN_ID;
  const hasGasBalance = normalizedBalance > 0;

  const handleAddNetwork = async () => {
    setNetworkMessage(null);

    const provider = (window as Window & {
      ethereum?: {
        request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
      };
    }).ethereum;

    if (!provider?.request) {
      setNetworkMessage('MetaMask not detected. Use the faucet links below after installing a wallet.');
      return;
    }

    try {
      await provider.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: TARGET_NETWORK_HEX }],
      });
      setNetworkMessage('Network added!');
    } catch (error: unknown) {
      const errorCode = typeof error === 'object' && error !== null && 'code' in error
        ? (error as { code?: number }).code
        : undefined;

      if (errorCode === 4902) {
        await provider.request({
          method: 'wallet_addEthereumChain',
          params: [{
            chainId: TARGET_NETWORK_HEX,
            chainName: TARGET_NETWORK_NAME,
            nativeCurrency: {
              name: 'ETH',
              symbol: 'ETH',
              decimals: 18,
            },
            rpcUrls: ['https://sepolia.base.org'],
            blockExplorerUrls: ['https://sepolia.basescan.org'],
          }],
        });
        setNetworkMessage('Network added!');
        return;
      }

      setNetworkMessage('Unable to add the network automatically.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white/3 border border-white/10 rounded-2xl p-6 space-y-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Testnet Setup Guide</h2>
          <p className="text-gray-400 mt-2">Connect your wallet, switch to {TARGET_NETWORK_NAME}, and make sure you have a little gas to explore VFIDE.</p>
        </div>

        {!isConnected ? (
          <div className="space-y-3">
            <p className="text-gray-300">Connect a wallet to begin the guided setup flow.</p>
            <ConnectButton />
          </div>
        ) : onExpectedNetwork && hasGasBalance ? (
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 space-y-3">
            <h3 className="text-xl font-bold text-emerald-300">You&apos;re All Set!</h3>
            <p className="text-gray-200">Your wallet is connected to {TARGET_NETWORK_NAME} and has test ETH available.</p>
            <div className="flex flex-wrap gap-3">
              <Link href="/token-launch" className="inline-flex items-center rounded-xl border border-cyan-500/30 bg-cyan-500/15 px-4 py-2 font-semibold text-cyan-300">
                Start Using VFIDE
              </Link>
              {address ? (
                <button
                  type="button"
                  onClick={() => void copyWithId('wallet-address', address)}
                  className="rounded-xl border border-white/10 bg-black/20 px-4 py-2 text-sm text-white"
                >
                  {copiedId === 'wallet-address' ? 'Copied!' : address}
                </button>
              ) : null}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 space-y-3">
              <h3 className="text-lg font-semibold text-amber-200">Complete the last two steps</h3>
              <p className="text-gray-200">Switch to {TARGET_NETWORK_NAME} and grab test ETH from a faucet before using the app.</p>
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => void handleAddNetwork()}
                  className="rounded-xl border border-cyan-500/30 bg-cyan-500/15 px-4 py-2 font-semibold text-cyan-300"
                >
                  Add {TARGET_NETWORK_NAME} to MetaMask
                </button>
                {address ? (
                  <button
                    type="button"
                    onClick={() => void copyWithId('wallet-address', address)}
                    className="rounded-xl border border-white/10 bg-black/20 px-4 py-2 text-sm text-white"
                  >
                    {copiedId === 'wallet-address' ? 'Copied!' : address}
                  </button>
                ) : null}
              </div>
              {networkMessage ? <p className="text-sm text-cyan-200">{networkMessage}</p> : null}
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <h4 className="text-white font-semibold mb-2">Testnet faucets</h4>
              <div className="flex flex-wrap gap-3 text-sm">
                <a href={FAUCET_URLS.coinbase} target="_blank" rel="noreferrer" className="text-cyan-300 hover:text-cyan-200">Coinbase Faucet</a>
                <a href={FAUCET_URLS.alchemy} target="_blank" rel="noreferrer" className="text-cyan-300 hover:text-cyan-200">Alchemy Faucet</a>
                <a href={FAUCET_URLS.quicknode} target="_blank" rel="noreferrer" className="text-cyan-300 hover:text-cyan-200">QuickNode Faucet</a>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

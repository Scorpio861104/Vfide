'use client';

import { useState } from 'react';
import { useAccount } from 'wagmi';
import { Wallet } from 'lucide-react';

import { WalletCard } from './extracted/WalletCard';
import { ChainSelector } from './extracted/ChainSelector';
import { TokenList } from './extracted/TokenList';

export default function WalletManager() {
  const { address } = useAccount();
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white flex items-center gap-2"><Wallet className="text-cyan-400" /> Wallets</h2>
      {/* TODO: Wire to wallet hooks */}
    </div>
  );
}

'use client';

import React, { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';

interface Signer {
  address: string;
  name: string;
  isActive: boolean;
}

interface Transaction {
  id: string;
  to: string;
  amount: string;
  token: string;
  description: string;
  confirmations: number;
  required: number;
  createdAt: number;
  status: 'pending' | 'executed' | 'cancelled';
}

export default function MultisigPage() {
  const { address, isConnected } = useAccount();
  const [signers, setSigners] = useState<Signer[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [required, _setRequired] = useState(2);
  const [_showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    if (address) {
      setSigners([
        { address: address, name: 'You', isActive: true },
        { address: '0x1234...5678', name: 'Alice', isActive: true },
        { address: '0xabcd...efgh', name: 'Bob', isActive: true },
      ]);
      setTransactions([
        {
          id: '1',
          to: '0x9999...0000',
          amount: '10',
          token: 'ETH',
          description: 'Team expenses Q1',
          confirmations: 1,
          required: 2,
          createdAt: Date.now() - 2 * 60 * 60 * 1000,
          status: 'pending',
        },
        {
          id: '2',
          to: '0x8888...1111',
          amount: '5000',
          token: 'USDC',
          description: 'Contractor payment',
          confirmations: 2,
          required: 2,
          createdAt: Date.now() - 24 * 60 * 60 * 1000,
          status: 'executed',
        },
      ]);
    }
  }, [address]);

  if (!isConnected) {
    return (
      <div className="container mx-auto px-4 py-8 pt-20 pb-24 md:pb-8">
        <div className="text-center py-20">
          <h1 className="text-xl sm:text-2xl font-bold mb-4">Multi-Signature Vault</h1>
          <p className="text-muted-foreground">Connect your wallet to manage multi-sig</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 pt-20 pb-24 md:pb-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Multi-Signature Vault</h1>
          <p className="text-muted-foreground">Require multiple approvals for transactions</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
        >
          + New Transaction
        </button>
      </div>

      {/* Vault Info */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-card rounded-xl p-4 border">
          <div className="text-sm text-muted-foreground">Signers</div>
          <div className="text-2xl font-bold">{signers.length}</div>
        </div>
        <div className="bg-card rounded-xl p-4 border">
          <div className="text-sm text-muted-foreground">Required</div>
          <div className="text-2xl font-bold">{required} of {signers.length}</div>
        </div>
        <div className="bg-card rounded-xl p-4 border">
          <div className="text-sm text-muted-foreground">Pending</div>
          <div className="text-2xl font-bold">{transactions.filter(t => t.status === 'pending').length}</div>
        </div>
        <div className="bg-card rounded-xl p-4 border">
          <div className="text-sm text-muted-foreground">Total Executed</div>
          <div className="text-2xl font-bold">{transactions.filter(t => t.status === 'executed').length}</div>
        </div>
      </div>

      {/* Signers */}
      <div className="bg-card rounded-xl p-4 border">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-medium">Signers</h3>
          <button className="text-sm text-primary">+ Add Signer</button>
        </div>
        <div className="space-y-2">
          {signers.map((signer, idx) => (
            <div key={idx} className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center text-sm">
                  {signer.name[0]}
                </div>
                <div>
                  <div className="font-medium">{signer.name}</div>
                  <div className="text-xs text-muted-foreground font-mono truncate max-w-[120px] sm:max-w-[200px]">{signer.address}</div>
                </div>
              </div>
              <span className="text-xs px-2 py-1 rounded-full bg-green-500/20 text-green-500">
                Active
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Transactions */}
      <div>
        <h3 className="font-medium mb-3">Transactions</h3>
        <div className="space-y-3">
          {transactions.map((tx) => (
            <div key={tx.id} className="bg-card rounded-xl p-4 border">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <div className="font-medium">{tx.description}</div>
                  <div className="text-sm text-muted-foreground">
                    {tx.amount} {tx.token} → {tx.to}
                  </div>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs ${
                  tx.status === 'pending'
                    ? 'bg-yellow-500/20 text-yellow-500'
                    : tx.status === 'executed'
                    ? 'bg-green-500/20 text-green-500'
                    : 'bg-red-500/20 text-red-500'
                }`}>
                  {tx.status}
                </span>
              </div>

              <div className="flex items-center gap-2 mb-3">
                <div className="text-sm">Confirmations:</div>
                <div className="flex gap-1">
                  {Array.from({ length: tx.required }).map((_, i) => (
                    <div
                      key={i}
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                        i < tx.confirmations
                          ? 'bg-green-500 text-white'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {i < tx.confirmations ? '✓' : i + 1}
                    </div>
                  ))}
                </div>
                <span className="text-sm text-muted-foreground">
                  ({tx.confirmations}/{tx.required})
                </span>
              </div>

              {tx.status === 'pending' && (
                <div className="flex gap-2">
                  <button className="flex-1 px-3 py-2 bg-green-500 text-white rounded-lg text-sm">
                    Confirm
                  </button>
                  <button className="px-3 py-2 bg-muted rounded-lg text-sm">
                    Reject
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

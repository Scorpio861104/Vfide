'use client';

import { Footer } from "@/components/layout/Footer";
import { SubscriptionManagerABI } from "@/lib/abis";
import { useState } from "react";
import { useToast } from "@/components/ui/toast";
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from "wagmi";

// Contract addresses (SubscriptionManager not deployed yet)
const SUBSCRIPTION_MANAGER_ADDRESS = (process.env.NEXT_PUBLIC_SUBSCRIPTION_MANAGER_ADDRESS || '0x0000000000000000000000000000000000000000') as `0x${string}`;
const _VFIDE_TOKEN_ADDRESS = (process.env.NEXT_PUBLIC_VFIDE_TOKEN_ADDRESS || '0x3249215721a21BC9635C01Ea05AdE032dd90961f') as `0x${string}`;

// Check if contract is deployed (not zero address)
const IS_SUBSCRIPTION_DEPLOYED = SUBSCRIPTION_MANAGER_ADDRESS !== '0x0000000000000000000000000000000000000000';

interface Subscription {
  id: number;
  name: string;
  merchant: string;
  amount: string;
  frequency: string;
  nextPayment: string;
  status: "Active" | "Paused";
}

export default function SubscriptionsPage() {
  const { address, isConnected } = useAccount();
  const { showToast } = useToast();
  
  // Contract write hooks
  const { writeContract, data: hash, isPending: _isPending } = useWriteContract();
  const { isLoading: _isConfirming, isSuccess: _isSuccess } = useWaitForTransactionReceipt({ hash });

  // Read user subscriptions
  const { data: _userSubIds } = useReadContract({
    address: SUBSCRIPTION_MANAGER_ADDRESS,
    abi: SubscriptionManagerABI,
    functionName: 'getUserSubscriptions',
    args: address ? [address] : undefined,
    query: { enabled: IS_SUBSCRIPTION_DEPLOYED && !!address },
  });

  // Contract action handlers
  const handlePause = (id: number) => {
    if (!isConnected) {
      showToast("Please connect your wallet", "error");
      return;
    }
    writeContract({
      address: SUBSCRIPTION_MANAGER_ADDRESS,
      abi: SubscriptionManagerABI,
      functionName: 'pauseSubscription',
      args: [BigInt(id)],
    });
  };

  const handleResume = (id: number) => {
    if (!isConnected) {
      showToast("Please connect your wallet", "error");
      return;
    }
    writeContract({
      address: SUBSCRIPTION_MANAGER_ADDRESS,
      abi: SubscriptionManagerABI,
      functionName: 'resumeSubscription',
      args: [BigInt(id)],
    });
  };

  const handleCancel = (id: number) => {
    if (!isConnected) {
      showToast("Please connect your wallet", "error");
      return;
    }
    writeContract({
      address: SUBSCRIPTION_MANAGER_ADDRESS,
      abi: SubscriptionManagerABI,
      functionName: 'cancelSubscription',
      args: [BigInt(id)],
    });
  };

  // Display mock or empty subscriptions for now
  const [subscriptions, _setSubscriptions] = useState<Subscription[]>([]);

  return (
    <>
      
      <main className="min-h-screen bg-zinc-900 pt-20">
        {/* Header */}
        <section className="py-12 bg-zinc-800 border-b border-zinc-700">
          <div className="container mx-auto px-3 sm:px-4">
            <h1 className="text-4xl md:text-5xl font-[family-name:var(--font-display)] font-bold text-zinc-100 mb-2">
              Subscription Manager
            </h1>
            <p className="text-xl text-zinc-400 font-[family-name:var(--font-body)]">
              Recurring crypto payments made easy
            </p>
          </div>
        </section>

        {/* Active Subscriptions */}
        <section className="py-8">
          <div className="container mx-auto px-3 sm:px-4">
            <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-[family-name:var(--font-display)] font-bold text-zinc-100">
                  Active Subscriptions
                </h2>
                <button className="px-6 py-2 bg-linear-to-r from-cyan-400 to-blue-500 text-zinc-900 rounded-lg font-bold hover:scale-105 transition-transform">
                  New Subscription
                </button>
              </div>
              
              <div className="space-y-4">
                {subscriptions.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 mx-auto mb-4 bg-cyan-400/10 rounded-xl flex items-center justify-center">
                      <svg className="w-8 h-8 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                    </div>
                    <h3 className="text-xl font-bold text-zinc-100 mb-2">No Active Subscriptions</h3>
                    <p className="text-zinc-400 mb-4">
                      {isConnected 
                        ? "Subscribe to a merchant service to see your recurring payments here."
                        : "Connect your wallet to view and manage your subscriptions."}
                    </p>
                  </div>
                ) : subscriptions.map((sub) => (
                  <div key={sub.id} className="bg-zinc-900 border border-zinc-700 rounded-xl p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-xl font-bold text-zinc-100 mb-1">{sub.name}</h3>
                        <div className="text-zinc-400 text-sm font-mono mb-2">{sub.merchant}</div>
                        <div className={`inline-block px-3 py-1 rounded text-sm font-bold ${
                          sub.status === "Active" 
                            ? "bg-emerald-500/20 border border-emerald-500 text-emerald-500"
                            : "bg-orange-500/20 border border-orange-500 text-orange-500"
                        }`}>
                          {sub.status}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-cyan-400">{sub.amount}</div>
                        <div className="text-zinc-400 text-sm">{sub.frequency}</div>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between pt-4 border-t border-zinc-700">
                      <div className="text-zinc-400 text-sm">
                        Next payment: {sub.nextPayment}
                      </div>
                      <div className="flex gap-2">
                        {sub.status === "Active" ? (
                          <button 
                            onClick={() => handlePause(sub.id)}
                            className="px-4 py-2 border border-orange-500 text-orange-500 rounded hover:bg-orange-500/10 transition-colors"
                          >
                            Pause
                          </button>
                        ) : (
                          <button 
                            onClick={() => handleResume(sub.id)}
                            className="px-4 py-2 border border-emerald-500 text-emerald-500 rounded hover:bg-emerald-500/10 transition-colors"
                          >
                            Resume
                          </button>
                        )}
                        <button 
                          onClick={() => handleCancel(sub.id)}
                          className="px-4 py-2 border border-red-600 text-red-600 rounded hover:bg-red-600/10 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Create Subscription */}
        <section className="py-8">
          <div className="container mx-auto px-3 sm:px-4">
            <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-6">
              <h2 className="text-2xl font-[family-name:var(--font-display)] font-bold text-zinc-100 mb-6">
                Create New Subscription
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-zinc-400 font-[family-name:var(--font-body)] text-sm mb-2">
                    Merchant Address
                  </label>
                  <input
                    type="text"
                    placeholder="0x..."
                    className="w-full px-4 py-3 bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-100 focus:border-cyan-400 outline-none"
                  />
                </div>
                
                <div>
                  <label className="block text-zinc-400 font-[family-name:var(--font-body)] text-sm mb-2">
                    Amount (USD)
                  </label>
                  <input
                    type="number"
                    placeholder="29.99"
                    className="w-full px-4 py-3 bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-100 focus:border-cyan-400 outline-none"
                  />
                </div>
                
                <div>
                  <label className="block text-zinc-400 font-[family-name:var(--font-body)] text-sm mb-2">
                    Frequency
                  </label>
                  <select className="w-full px-4 py-3 bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-100 focus:border-cyan-400 outline-none">
                    <option>Monthly</option>
                    <option>Weekly</option>
                    <option>Daily</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-zinc-400 font-[family-name:var(--font-body)] text-sm mb-2">
                    Start Date
                  </label>
                  <input
                    type="date"
                    className="w-full px-4 py-3 bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-100 focus:border-cyan-400 outline-none"
                  />
                </div>
              </div>
              
              <button className="mt-6 w-full px-6 py-3 bg-linear-to-r from-cyan-400 to-blue-500 text-zinc-900 rounded-lg font-bold hover:scale-105 transition-transform">
                Create Subscription
              </button>
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="py-8">
          <div className="container mx-auto px-3 sm:px-4">
            <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-6">
              <h2 className="text-2xl font-[family-name:var(--font-display)] font-bold text-zinc-100 mb-6">
                How Subscriptions Work
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="p-4 bg-zinc-900 rounded-lg">
                  <div className="text-4xl font-bold text-cyan-400 mb-3">1</div>
                  <h3 className="text-xl font-bold text-zinc-100 mb-2">Set & Forget</h3>
                  <p className="text-zinc-400 text-sm">
                    Configure payment amount, frequency, and merchant. Smart contract handles the rest.
                  </p>
                </div>
                
                <div className="p-4 bg-zinc-900 rounded-lg">
                  <div className="text-4xl font-bold text-cyan-400 mb-3">2</div>
                  <h3 className="text-xl font-bold text-zinc-100 mb-2">Auto-Payment</h3>
                  <p className="text-zinc-400 text-sm">
                    Payments execute automatically on schedule. Funds pulled from your vault.
                  </p>
                </div>
                
                <div className="p-4 bg-zinc-900 rounded-lg">
                  <div className="text-4xl font-bold text-cyan-400 mb-3">3</div>
                  <h3 className="text-xl font-bold text-zinc-100 mb-2">Full Control</h3>
                  <p className="text-zinc-400 text-sm">
                    Pause, resume, or cancel anytime. No penalties. No hidden fees.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Payment History */}
        <section className="py-8">
          <div className="container mx-auto px-3 sm:px-4">
            <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-6">
              <h2 className="text-2xl font-[family-name:var(--font-display)] font-bold text-zinc-100 mb-6">
                Payment History
              </h2>
              
              <div className="space-y-2">
                {[
                  { service: "Cloud Storage Pro", amount: "$29.99", date: "Nov 15, 2025", status: "Completed" },
                  { service: "VPN Service", amount: "$12.99", date: "Nov 20, 2025", status: "Completed" },
                  { service: "Cloud Storage Pro", amount: "$29.99", date: "Oct 15, 2025", status: "Completed" },
                  { service: "VPN Service", amount: "$12.99", date: "Oct 20, 2025", status: "Completed" },
                ].map((payment, idx) => (
                  <div key={idx} className="flex items-center justify-between p-4 bg-zinc-900 border border-zinc-700 rounded-lg">
                    <div>
                      <div className="text-zinc-100 font-bold">{payment.service}</div>
                      <div className="text-zinc-400 text-sm">{payment.date}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-cyan-400 font-bold">{payment.amount}</div>
                      <div className="text-emerald-500 text-sm">{payment.status}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}

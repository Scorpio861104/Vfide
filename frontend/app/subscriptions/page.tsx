"use client";

import { GlobalNav } from "@/components/layout/GlobalNav";
import { Footer } from "@/components/layout/Footer";
import { useState } from "react";
import { useToast } from "@/components/ui/toast";
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from "wagmi";
import { formatUnits, parseUnits } from "viem";
import { Loader2 } from "lucide-react";

// SubscriptionManager ABI
const SUBSCRIPTION_MANAGER_ABI = [
  { name: 'createSubscription', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'merchant', type: 'address' }, { name: 'token', type: 'address' }, { name: 'amount', type: 'uint256' }, { name: 'interval', type: 'uint256' }, { name: 'maxPayments', type: 'uint256' }], outputs: [{ type: 'uint256' }] },
  { name: 'cancelSubscription', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'subId', type: 'uint256' }], outputs: [] },
  { name: 'pauseSubscription', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'subId', type: 'uint256' }], outputs: [] },
  { name: 'resumeSubscription', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'subId', type: 'uint256' }], outputs: [] },
  { name: 'processPayment', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'subId', type: 'uint256' }], outputs: [] },
  { name: 'getSubscription', type: 'function', stateMutability: 'view', inputs: [{ name: 'subId', type: 'uint256' }], outputs: [{ name: 'sub', type: 'tuple', components: [{ name: 'subscriber', type: 'address' }, { name: 'merchant', type: 'address' }, { name: 'token', type: 'address' }, { name: 'amount', type: 'uint256' }, { name: 'interval', type: 'uint256' }, { name: 'lastPayment', type: 'uint256' }, { name: 'paymentsRemaining', type: 'uint256' }, { name: 'totalPaid', type: 'uint256' }, { name: 'active', type: 'bool' }, { name: 'paused', type: 'bool' }] }] },
  { name: 'getUserSubscriptions', type: 'function', stateMutability: 'view', inputs: [{ name: 'user', type: 'address' }], outputs: [{ type: 'uint256[]' }] },
  { name: 'getNextPaymentInfo', type: 'function', stateMutability: 'view', inputs: [{ name: 'subId', type: 'uint256' }], outputs: [{ name: 'nextPaymentTime', type: 'uint256' }, { name: 'amount', type: 'uint256' }, { name: 'canProcess', type: 'bool' }] },
  { name: 'canProcess', type: 'function', stateMutability: 'view', inputs: [{ name: 'subId', type: 'uint256' }], outputs: [{ name: 'processable', type: 'bool' }, { name: 'reason', type: 'string' }] },
] as const;

// Contract addresses (SubscriptionManager not deployed yet)
const SUBSCRIPTION_MANAGER_ADDRESS = (process.env.NEXT_PUBLIC_SUBSCRIPTION_MANAGER_ADDRESS || '0x0000000000000000000000000000000000000000') as `0x${string}`;
const VFIDE_TOKEN_ADDRESS = (process.env.NEXT_PUBLIC_VFIDE_TOKEN_ADDRESS || '0x3249215721a21BC9635C01Ea05AdE032dd90961f') as `0x${string}`;

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
  const { toast } = useToast();
  
  // Contract write hooks
  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  useEffect(() => {
    if (isSuccess) {
      toast({
        title: "Transaction Successful",
        description: "Your transaction has been confirmed.",
        variant: "default",
      });
    }
  }, [isSuccess, toast]);

  // Read user subscriptions
  const { data: userSubIds } = useReadContract({
    address: SUBSCRIPTION_MANAGER_ADDRESS,
    abi: SUBSCRIPTION_MANAGER_ABI,
    functionName: 'getUserSubscriptions',
    args: address ? [address] : undefined,
    query: { enabled: IS_SUBSCRIPTION_DEPLOYED && !!address },
  });

  // Contract action handlers
  const handlePause = (id: number) => {
    if (!isConnected) {
      toast({ title: "Error", description: "Please connect your wallet", variant: "destructive" });
      return;
    }
    writeContract({
      address: SUBSCRIPTION_MANAGER_ADDRESS,
      abi: SUBSCRIPTION_MANAGER_ABI,
      functionName: 'pauseSubscription',
      args: [BigInt(id)],
    });
  };

  const handleResume = (id: number) => {
    if (!isConnected) {
      toast({ title: "Error", description: "Please connect your wallet", variant: "destructive" });
      return;
    }
    writeContract({
      address: SUBSCRIPTION_MANAGER_ADDRESS,
      abi: SUBSCRIPTION_MANAGER_ABI,
      functionName: 'resumeSubscription',
      args: [BigInt(id)],
    });
  };

  const handleCancel = (id: number) => {
    if (!isConnected) {
      toast({ title: "Error", description: "Please connect your wallet", variant: "destructive" });
      return;
    }
    writeContract({
      address: SUBSCRIPTION_MANAGER_ADDRESS,
      abi: SUBSCRIPTION_MANAGER_ABI,
      functionName: 'cancelSubscription',
      args: [BigInt(id)],
    });
  };

  // Display mock or empty subscriptions for now
  const [subscriptions] = useState<Subscription[]>([
    {
        id: 1,
        name: "Premium Plan",
        merchant: "0x123...abc",
        amount: "50 VFIDE",
        frequency: "Monthly",
        nextPayment: "2023-12-01",
        status: "Active"
    }
  ]);

  // Helpers
  const formatAmount = (amount: bigint) => formatUnits(amount, 18);
  const parseAmount = (amount: string) => parseUnits(amount, 18);

  // Debug: Log userSubIds
  if (userSubIds) {
    console.log('User Subscriptions:', userSubIds);
    console.log('Token Address:', VFIDE_TOKEN_ADDRESS);
    console.log('Formatted 1 VFIDE:', formatAmount(parseAmount('1')));
  }

  return (
    <>
      <GlobalNav />
      
      {/* Loading Overlay */}
      {(isPending || isConfirming) && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
            <div className="bg-[#1A1A1D] border border-[#3A3A3F] rounded-xl p-8 flex flex-col items-center gap-4">
              <Loader2 className="w-12 h-12 text-[#00F0FF] animate-spin" />
              <div className="text-xl font-bold text-white">
                {isPending ? 'Confirm in Wallet...' : 'Processing Transaction...'}
              </div>
            </div>
          </div>
      )}
      
      <main className="min-h-screen bg-[#1A1A1D] pt-20">
        {/* Header */}
        <section className="py-12 bg-[#2A2A2F] border-b border-[#3A3A3F]">
          <div className="container mx-auto px-4">
            <h1 className="text-4xl md:text-5xl font-[family-name:var(--font-display)] font-bold text-[#F5F3E8] mb-2">
              Subscription Manager
            </h1>
            <p className="text-xl text-[#A0A0A5] font-[family-name:var(--font-body)]">
              Recurring crypto payments made easy
            </p>
          </div>
        </section>

        {/* Active Subscriptions */}
        <section className="py-8">
          <div className="container mx-auto px-4">
            <div className="bg-[#2A2A2F] border border-[#3A3A3F] rounded-xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-[family-name:var(--font-display)] font-bold text-[#F5F3E8]">
                  Active Subscriptions
                </h2>
                <button className="px-6 py-2 bg-gradient-to-r from-[#00F0FF] to-[#0080FF] text-[#1A1A1D] rounded-lg font-bold hover:scale-105 transition-transform">
                  New Subscription
                </button>
              </div>
              
              <div className="space-y-4">
                {subscriptions.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 mx-auto mb-4 bg-[#00F0FF]/10 rounded-xl flex items-center justify-center">
                      <svg className="w-8 h-8 text-[#00F0FF]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                    </div>
                    <h3 className="text-xl font-bold text-[#F5F3E8] mb-2">No Active Subscriptions</h3>
                    <p className="text-[#A0A0A5] mb-4">
                      {isConnected 
                        ? "Subscribe to a merchant service to see your recurring payments here."
                        : "Connect your wallet to view and manage your subscriptions."}
                    </p>
                  </div>
                ) : subscriptions.map((sub) => (
                  <div key={sub.id} className="bg-[#1A1A1D] border border-[#3A3A3F] rounded-xl p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-xl font-bold text-[#F5F3E8] mb-1">{sub.name}</h3>
                        <div className="text-[#A0A0A5] text-sm font-mono mb-2">{sub.merchant}</div>
                        <div className={`inline-block px-3 py-1 rounded text-sm font-bold ${
                          sub.status === "Active" 
                            ? "bg-[#50C878]/20 border border-[#50C878] text-[#50C878]"
                            : "bg-[#FFA500]/20 border border-[#FFA500] text-[#FFA500]"
                        }`}>
                          {sub.status}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-[#00F0FF]">{sub.amount}</div>
                        <div className="text-[#A0A0A5] text-sm">{sub.frequency}</div>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between pt-4 border-t border-[#3A3A3F]">
                      <div className="text-[#A0A0A5] text-sm">
                        Next payment: {sub.nextPayment}
                      </div>
                      <div className="flex gap-2">
                        {sub.status === "Active" ? (
                          <button 
                            onClick={() => handlePause(sub.id)}
                            className="px-4 py-2 border border-[#FFA500] text-[#FFA500] rounded hover:bg-[#FFA500]/10 transition-colors"
                          >
                            Pause
                          </button>
                        ) : (
                          <button 
                            onClick={() => handleResume(sub.id)}
                            className="px-4 py-2 border border-[#50C878] text-[#50C878] rounded hover:bg-[#50C878]/10 transition-colors"
                          >
                            Resume
                          </button>
                        )}
                        <button 
                          onClick={() => handleCancel(sub.id)}
                          className="px-4 py-2 border border-[#C41E3A] text-[#C41E3A] rounded hover:bg-[#C41E3A]/10 transition-colors"
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
          <div className="container mx-auto px-4">
            <div className="bg-[#2A2A2F] border border-[#3A3A3F] rounded-xl p-6">
              <h2 className="text-2xl font-[family-name:var(--font-display)] font-bold text-[#F5F3E8] mb-6">
                Create New Subscription
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-[#A0A0A5] font-[family-name:var(--font-body)] text-sm mb-2">
                    Merchant Address
                  </label>
                  <input
                    type="text"
                    placeholder="0x..."
                    className="w-full px-4 py-3 bg-[#1A1A1D] border border-[#3A3A3F] rounded-lg text-[#F5F3E8] focus:border-[#00F0FF] outline-none"
                  />
                </div>
                
                <div>
                  <label className="block text-[#A0A0A5] font-[family-name:var(--font-body)] text-sm mb-2">
                    Amount (USD)
                  </label>
                  <input
                    type="number"
                    placeholder="29.99"
                    className="w-full px-4 py-3 bg-[#1A1A1D] border border-[#3A3A3F] rounded-lg text-[#F5F3E8] focus:border-[#00F0FF] outline-none"
                  />
                </div>
                
                <div>
                  <label className="block text-[#A0A0A5] font-[family-name:var(--font-body)] text-sm mb-2">
                    Frequency
                  </label>
                  <select className="w-full px-4 py-3 bg-[#1A1A1D] border border-[#3A3A3F] rounded-lg text-[#F5F3E8] focus:border-[#00F0FF] outline-none">
                    <option>Monthly</option>
                    <option>Weekly</option>
                    <option>Daily</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-[#A0A0A5] font-[family-name:var(--font-body)] text-sm mb-2">
                    Start Date
                  </label>
                  <input
                    type="date"
                    className="w-full px-4 py-3 bg-[#1A1A1D] border border-[#3A3A3F] rounded-lg text-[#F5F3E8] focus:border-[#00F0FF] outline-none"
                  />
                </div>
              </div>
              
              <button className="mt-6 w-full px-6 py-3 bg-gradient-to-r from-[#00F0FF] to-[#0080FF] text-[#1A1A1D] rounded-lg font-bold hover:scale-105 transition-transform">
                Create Subscription
              </button>
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="py-8">
          <div className="container mx-auto px-4">
            <div className="bg-[#2A2A2F] border border-[#3A3A3F] rounded-xl p-6">
              <h2 className="text-2xl font-[family-name:var(--font-display)] font-bold text-[#F5F3E8] mb-6">
                How Subscriptions Work
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="p-4 bg-[#1A1A1D] rounded-lg">
                  <div className="text-4xl font-bold text-[#00F0FF] mb-3">1</div>
                  <h3 className="text-xl font-bold text-[#F5F3E8] mb-2">Set & Forget</h3>
                  <p className="text-[#A0A0A5] text-sm">
                    Configure payment amount, frequency, and merchant. Smart contract handles the rest.
                  </p>
                </div>
                
                <div className="p-4 bg-[#1A1A1D] rounded-lg">
                  <div className="text-4xl font-bold text-[#00F0FF] mb-3">2</div>
                  <h3 className="text-xl font-bold text-[#F5F3E8] mb-2">Auto-Payment</h3>
                  <p className="text-[#A0A0A5] text-sm">
                    Payments execute automatically on schedule. Funds pulled from your vault.
                  </p>
                </div>
                
                <div className="p-4 bg-[#1A1A1D] rounded-lg">
                  <div className="text-4xl font-bold text-[#00F0FF] mb-3">3</div>
                  <h3 className="text-xl font-bold text-[#F5F3E8] mb-2">Full Control</h3>
                  <p className="text-[#A0A0A5] text-sm">
                    Pause, resume, or cancel anytime. No penalties. No hidden fees.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Payment History */}
        <section className="py-8">
          <div className="container mx-auto px-4">
            <div className="bg-[#2A2A2F] border border-[#3A3A3F] rounded-xl p-6">
              <h2 className="text-2xl font-[family-name:var(--font-display)] font-bold text-[#F5F3E8] mb-6">
                Payment History
              </h2>
              
              <div className="space-y-2">
                {[
                  { service: "Cloud Storage Pro", amount: "$29.99", date: "Nov 15, 2025", status: "Completed" },
                  { service: "VPN Service", amount: "$12.99", date: "Nov 20, 2025", status: "Completed" },
                  { service: "Cloud Storage Pro", amount: "$29.99", date: "Oct 15, 2025", status: "Completed" },
                  { service: "VPN Service", amount: "$12.99", date: "Oct 20, 2025", status: "Completed" },
                ].map((payment, idx) => (
                  <div key={idx} className="flex items-center justify-between p-4 bg-[#1A1A1D] border border-[#3A3A3F] rounded-lg">
                    <div>
                      <div className="text-[#F5F3E8] font-bold">{payment.service}</div>
                      <div className="text-[#A0A0A5] text-sm">{payment.date}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-[#00F0FF] font-bold">{payment.amount}</div>
                      <div className="text-[#50C878] text-sm">{payment.status}</div>
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

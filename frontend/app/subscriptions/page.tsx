"use client";

import { GlobalNav } from "@/components/layout/GlobalNav";
import { Footer } from "@/components/layout/Footer";
import { ZERO_ADDRESS } from '@/lib/constants';
import { CONTRACT_ADDRESSES } from '@/lib/contracts';
import { SurfaceCard, AccentBadge, SectionHeading } from '@/components/ui/primitives';
import { useState, useEffect, useMemo, useCallback } from "react";
import { useToast } from "@/components/ui/toast";
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract, useReadContracts } from "wagmi";
import { formatUnits, parseUnits, isAddress } from "viem";
import { Loader2 } from "lucide-react";

const ERC20_METADATA_ABI = [
  { name: 'symbol', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'string' }] },
  { name: 'decimals', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint8' }] },
] as const;

// SubscriptionManager ABI
const SUBSCRIPTION_MANAGER_ABI = [
  { name: 'createSubscription', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'merchant', type: 'address' }, { name: 'token', type: 'address' }, { name: 'amount', type: 'uint256' }, { name: 'interval', type: 'uint256' }, { name: 'memo', type: 'string' }], outputs: [{ name: 'subId', type: 'uint256' }] },
  { name: 'cancelSubscription', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'subId', type: 'uint256' }], outputs: [] },
  { name: 'pauseSubscription', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'subId', type: 'uint256' }], outputs: [] },
  { name: 'resumeSubscription', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'subId', type: 'uint256' }], outputs: [] },
  { name: 'processPayment', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'subId', type: 'uint256' }], outputs: [] },
  { name: 'modifySubscription', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'subId', type: 'uint256' }, { name: 'newAmount', type: 'uint256' }, { name: 'newInterval', type: 'uint256' }], outputs: [] },
  { name: 'getSubscription', type: 'function', stateMutability: 'view', inputs: [{ name: 'subId', type: 'uint256' }], outputs: [{ name: 'sub', type: 'tuple', components: [{ name: 'subscriber', type: 'address' }, { name: 'merchant', type: 'address' }, { name: 'token', type: 'address' }, { name: 'amount', type: 'uint256' }, { name: 'interval', type: 'uint256' }, { name: 'nextPayment', type: 'uint256' }, { name: 'active', type: 'bool' }, { name: 'paused', type: 'bool' }, { name: 'pausedAt', type: 'uint256' }, { name: 'graceEndTime', type: 'uint256' }, { name: 'failedPayments', type: 'uint256' }, { name: 'memo', type: 'string' }] }] },
  { name: 'getNextPaymentInfo', type: 'function', stateMutability: 'view', inputs: [{ name: 'subId', type: 'uint256' }], outputs: [{ name: 'nextPaymentTime', type: 'uint256' }, { name: 'amount', type: 'uint256' }, { name: 'isPaused', type: 'bool' }, { name: 'isInGracePeriod', type: 'bool' }, { name: 'graceTimeRemaining', type: 'uint256' }, { name: 'failedPaymentCount', type: 'uint256' }] },
  { name: 'getUserSubscriptions', type: 'function', stateMutability: 'view', inputs: [{ name: 'user', type: 'address' }], outputs: [{ type: 'uint256[]' }] },
  { name: 'getMerchantSubscriptions', type: 'function', stateMutability: 'view', inputs: [{ name: 'merchant', type: 'address' }], outputs: [{ type: 'uint256[]' }] },
  { name: 'canProcess', type: 'function', stateMutability: 'view', inputs: [{ name: 'subId', type: 'uint256' }], outputs: [{ name: 'processable', type: 'bool' }, { name: 'reason', type: 'string' }] },
] as const;

// Contract addresses
const SUBSCRIPTION_MANAGER_ADDRESS = CONTRACT_ADDRESSES.SubscriptionManager;

// Check if contract is deployed (not zero address)
const IS_SUBSCRIPTION_DEPLOYED = SUBSCRIPTION_MANAGER_ADDRESS !== ZERO_ADDRESS;

const DEFAULT_TOKEN_ADDRESS = CONTRACT_ADDRESSES.VFIDEToken !== ZERO_ADDRESS ? CONTRACT_ADDRESSES.VFIDEToken : "";

interface Subscription {
  id: number;
  name: string;
  merchant: string;
  amount: string;
  frequency: string;
  nextPayment: string;
  status: "Active" | "Paused";
  tokenSymbol: string;
  tokenDecimals: number;
}

export default function SubscriptionsPage() {
  const { address, isConnected } = useAccount();
  const { toast } = useToast();
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [merchantInput, setMerchantInput] = useState("");
  const [tokenInput, setTokenInput] = useState(DEFAULT_TOKEN_ADDRESS);
  const [amountInput, setAmountInput] = useState("");
  const [frequency, setFrequency] = useState<"monthly" | "weekly" | "daily">("monthly");
  const [memoInput, setMemoInput] = useState("");
  
  // Contract write hooks
  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  // Read user subscriptions
  const { data: userSubIds, refetch: refetchUserSubIds, isLoading: isLoadingUserSubs } = useReadContract({
    address: SUBSCRIPTION_MANAGER_ADDRESS,
    abi: SUBSCRIPTION_MANAGER_ABI,
    functionName: 'getUserSubscriptions',
    args: address ? [address] : undefined,
    query: { enabled: IS_SUBSCRIPTION_DEPLOYED && !!address },
  });

  const userSubIdList = (userSubIds as bigint[] | undefined) ?? [];

  const { data: merchantSubIds, refetch: refetchMerchantSubIds, isLoading: isLoadingMerchantSubs } = useReadContract({
    address: SUBSCRIPTION_MANAGER_ADDRESS,
    abi: SUBSCRIPTION_MANAGER_ABI,
    functionName: 'getMerchantSubscriptions',
    args: address ? [address] : undefined,
    query: { enabled: IS_SUBSCRIPTION_DEPLOYED && !!address },
  });

  const merchantSubIdList = (merchantSubIds as bigint[] | undefined) ?? [];

  const { data: subscriptionDetails, refetch: refetchSubscriptionDetails, isLoading: isLoadingSubscriptions } = useReadContracts({
    contracts: userSubIdList.map((id) => ({
      address: SUBSCRIPTION_MANAGER_ADDRESS,
      abi: SUBSCRIPTION_MANAGER_ABI,
      functionName: 'getSubscription',
      args: [id],
    })),
    query: { enabled: IS_SUBSCRIPTION_DEPLOYED && !!address && userSubIdList.length > 0 },
  });

  const { data: merchantSubscriptionDetails, refetch: refetchMerchantSubscriptionDetails, isLoading: isLoadingMerchantDetails } = useReadContracts({
    contracts: merchantSubIdList.map((id) => ({
      address: SUBSCRIPTION_MANAGER_ADDRESS,
      abi: SUBSCRIPTION_MANAGER_ABI,
      functionName: 'getSubscription',
      args: [id],
    })),
    query: { enabled: IS_SUBSCRIPTION_DEPLOYED && !!address && merchantSubIdList.length > 0 },
  });

  const refreshSubscriptions = useCallback(async () => {
    if (!IS_SUBSCRIPTION_DEPLOYED || !address) return;
    await Promise.all([
      refetchUserSubIds(),
      refetchSubscriptionDetails(),
      refetchMerchantSubIds(),
      refetchMerchantSubscriptionDetails(),
    ]);
  }, [address, refetchMerchantSubIds, refetchMerchantSubscriptionDetails, refetchSubscriptionDetails, refetchUserSubIds]);

  useEffect(() => {
    if (isSuccess) {
      toast({
        title: "Transaction Successful",
        description: "Your transaction has been confirmed.",
        variant: "default",
      });
      refreshSubscriptions();
    }
  }, [isSuccess, toast, refreshSubscriptions]);

  const formatInterval = (interval?: bigint) => {
    if (!interval || interval === 0n) return "Unknown interval";
    const seconds = Number(interval);
    if (seconds % 2592000 === 0) return "Monthly";
    if (seconds % 604800 === 0) return "Weekly";
    if (seconds % 86400 === 0) return "Daily";
    return `${seconds / 3600}h`;
  };

  const formatNextPayment = (timestamp?: bigint) => {
    if (!timestamp || timestamp === 0n) return "Not scheduled";
    const date = new Date(Number(timestamp) * 1000);
    return isNaN(date.getTime()) ? "Not scheduled" : date.toLocaleString();
  };

  const merchantSubscriptions = useMemo<Subscription[]>(() => {
    if (!merchantSubIdList.length) return [];
    return merchantSubIdList.map((id, index) => {
      const detail = merchantSubscriptionDetails?.[index]?.result as { subscriber?: string; amount?: bigint; interval?: bigint; nextPayment?: bigint; active?: boolean; paused?: boolean; memo?: string; token?: string } | undefined;
      const meta = getTokenMeta(detail?.token);
      const amountRaw = detail?.amount !== undefined ? formatUnits(detail.amount, meta.decimals) : null;
      const amountDisplay = amountRaw ? `${Number(amountRaw).toLocaleString(undefined, { maximumFractionDigits: 4 })} ${meta.symbol}` : "—";
      return {
        id: Number(id),
        name: detail?.memo && detail.memo.length > 0 ? detail.memo : `Subscription #${Number(id)}`,
        merchant: detail?.subscriber ?? "Unknown subscriber",
        amount: amountDisplay,
        frequency: formatInterval(detail?.interval),
        nextPayment: formatNextPayment(detail?.nextPayment),
        status: detail?.active && !detail.paused ? "Active" : "Paused",
        tokenSymbol: meta.symbol,
        tokenDecimals: meta.decimals,
      };
    });
  }, [merchantSubIdList, merchantSubscriptionDetails, getTokenMeta]);

  const tokenAddresses = useMemo<`0x${string}`[]>(() => {
    const set = new Set<string>();
    subscriptionDetails?.forEach((detail) => {
      const res = detail?.result as { token?: string } | undefined;
      if (res?.token) set.add((res.token as string).toLowerCase());
    });
    merchantSubscriptionDetails?.forEach((detail) => {
      const res = detail?.result as { token?: string } | undefined;
      if (res?.token) set.add((res.token as string).toLowerCase());
    });
    if (isAddress(tokenInput)) set.add(tokenInput.toLowerCase());
    if (DEFAULT_TOKEN_ADDRESS) set.add(DEFAULT_TOKEN_ADDRESS.toLowerCase());
    return Array.from(set).map((addr) => addr as `0x${string}`);
  }, [subscriptionDetails, merchantSubscriptionDetails, tokenInput]);

  const { data: tokenMetaResults } = useReadContracts({
    contracts: tokenAddresses.flatMap((token) => ([
      { address: token, abi: ERC20_METADATA_ABI, functionName: 'symbol' },
      { address: token, abi: ERC20_METADATA_ABI, functionName: 'decimals' },
    ])),
    query: { enabled: tokenAddresses.length > 0 },
  });

  const tokenMetaMap = useMemo(() => {
    const map = new Map<string, { symbol: string; decimals: number }>();
    tokenAddresses.forEach((token, idx) => {
      const symbol = tokenMetaResults?.[idx * 2]?.result as string | undefined;
      const decimals = tokenMetaResults?.[idx * 2 + 1]?.result as number | bigint | undefined;
      const fallbackSymbol = token.toLowerCase() === DEFAULT_TOKEN_ADDRESS.toLowerCase() ? 'VFIDE' : 'TOKEN';
      map.set(token.toLowerCase(), {
        symbol: symbol || fallbackSymbol,
        decimals: decimals !== undefined ? Number(decimals) : 18,
      });
    });
    return map;
  }, [tokenAddresses, tokenMetaResults]);

  const getTokenMeta = useCallback((token?: string) => {
    if (!token) return { symbol: 'TOKEN', decimals: 18 };
    return tokenMetaMap.get(token.toLowerCase()) || { symbol: token.toLowerCase() === DEFAULT_TOKEN_ADDRESS.toLowerCase() ? 'VFIDE' : 'TOKEN', decimals: 18 };
  }, [tokenMetaMap]);

  const selectedTokenMeta = useMemo(() => getTokenMeta(tokenInput), [getTokenMeta, tokenInput]);

  const subscriptions = useMemo<Subscription[]>(() => {
    if (!userSubIdList.length) return [];
    return userSubIdList.map((id, index) => {
      const detail = subscriptionDetails?.[index]?.result as { merchant?: string; amount?: bigint; interval?: bigint; nextPayment?: bigint; active?: boolean; paused?: boolean; memo?: string; token?: string } | undefined;
      const meta = getTokenMeta(detail?.token);
      const amountRaw = detail?.amount !== undefined ? formatUnits(detail.amount, meta.decimals) : null;
      const amountDisplay = amountRaw ? `${Number(amountRaw).toLocaleString(undefined, { maximumFractionDigits: 4 })} ${meta.symbol}` : "—";
      return {
        id: Number(id),
        name: detail?.memo && detail.memo.length > 0 ? detail.memo : `Subscription #${Number(id)}`,
        merchant: detail?.merchant ?? "Unknown merchant",
        amount: amountDisplay,
        frequency: formatInterval(detail?.interval),
        nextPayment: formatNextPayment(detail?.nextPayment),
        status: detail?.active && !detail.paused ? "Active" : "Paused",
        tokenSymbol: meta.symbol,
        tokenDecimals: meta.decimals,
      };
    });
  }, [subscriptionDetails, userSubIdList, getTokenMeta]);

  // Contract action handlers
  const handleCreate = async () => {
    if (!IS_SUBSCRIPTION_DEPLOYED) {
      toast({ title: "Unavailable", description: "Subscriptions are not deployed on this network.", variant: "destructive" });
      return;
    }
    if (!isConnected) {
      toast({ title: "Error", description: "Please connect your wallet", variant: "destructive" });
      return;
    }

    const errors: string[] = [];
    if (!isAddress(merchantInput) || merchantInput === ZERO_ADDRESS) errors.push("Enter a valid merchant address.");
    if (!isAddress(tokenInput) || tokenInput === ZERO_ADDRESS) errors.push("Enter a valid token address.");

    let parsedAmount: bigint | null = null;
    try {
      parsedAmount = parseUnits(amountInput || "0", getTokenMeta(tokenInput).decimals);
      if (parsedAmount <= 0n) errors.push("Amount must be greater than zero.");
    } catch {
      errors.push("Amount must be a valid number.");
    }

    const intervalSecondsMap: Record<typeof frequency, bigint> = {
      monthly: 2592000n,
      weekly: 604800n,
      daily: 86400n,
    };
    const intervalSeconds = intervalSecondsMap[frequency];

    const { decimals } = getTokenMeta(tokenInput);

    if (errors.length) {
      toast({ title: "Check your inputs", description: errors.join("\n"), variant: "destructive" });
      return;
    }

    if (parsedAmount === null) return;

    setActionLoading("create");
    try {
      await writeContract({
        address: SUBSCRIPTION_MANAGER_ADDRESS,
        abi: SUBSCRIPTION_MANAGER_ABI,
        functionName: 'createSubscription',
        args: [merchantInput as `0x${string}`, tokenInput as `0x${string}`, parsedAmount, intervalSeconds, memoInput || 'Subscription'],
      });
      toast({ title: "Transaction submitted", description: "Confirm in your wallet to create the subscription." });
      await refreshSubscriptions();
    } catch (error) {
      toast({ title: "Transaction failed", description: (error as { message?: string }).message || "Create failed", variant: "destructive" });
    } finally {
      setActionLoading(null);
    }
  };

  const handlePause = async (id: number) => {
    if (!IS_SUBSCRIPTION_DEPLOYED) {
      toast({ title: "Unavailable", description: "Subscriptions are not deployed on this network.", variant: "destructive" });
      return;
    }
    if (!isConnected) {
      toast({ title: "Error", description: "Please connect your wallet", variant: "destructive" });
      return;
    }
    setActionLoading(`pause-${id}`)
    try {
      await writeContract({
        address: SUBSCRIPTION_MANAGER_ADDRESS,
        abi: SUBSCRIPTION_MANAGER_ABI,
        functionName: 'pauseSubscription',
        args: [BigInt(id)],
      });
      await refreshSubscriptions();
    } catch (error) {
      toast({ title: "Transaction failed", description: (error as { message?: string }).message || "Pause failed", variant: "destructive" });
    } finally {
      setActionLoading(null)
    }
  };

  const handleResume = async (id: number) => {
    if (!IS_SUBSCRIPTION_DEPLOYED) {
      toast({ title: "Unavailable", description: "Subscriptions are not deployed on this network.", variant: "destructive" });
      return;
    }
    if (!isConnected) {
      toast({ title: "Error", description: "Please connect your wallet", variant: "destructive" });
      return;
    }
    setActionLoading(`resume-${id}`)
    try {
      await writeContract({
        address: SUBSCRIPTION_MANAGER_ADDRESS,
        abi: SUBSCRIPTION_MANAGER_ABI,
        functionName: 'resumeSubscription',
        args: [BigInt(id)],
      });
      await refreshSubscriptions();
    } catch (error) {
      toast({ title: "Transaction failed", description: (error as { message?: string }).message || "Resume failed", variant: "destructive" });
    } finally {
      setActionLoading(null)
    }
  };

  const handleCancel = async (id: number) => {
    if (!IS_SUBSCRIPTION_DEPLOYED) {
      toast({ title: "Unavailable", description: "Subscriptions are not deployed on this network.", variant: "destructive" });
      return;
    }
    if (!isConnected) {
      toast({ title: "Error", description: "Please connect your wallet", variant: "destructive" });
      return;
    }
    setActionLoading(`cancel-${id}`)
    try {
      await writeContract({
        address: SUBSCRIPTION_MANAGER_ADDRESS,
        abi: SUBSCRIPTION_MANAGER_ABI,
        functionName: 'cancelSubscription',
        args: [BigInt(id)],
      });
      await refreshSubscriptions();
    } catch (error) {
      toast({ title: "Transaction failed", description: (error as { message?: string }).message || "Cancel failed", variant: "destructive" });
    } finally {
      setActionLoading(null)
    }
  };

  // Helpers
  // Debug: Log userSubIds
  if (userSubIds) {
    // Subscription data loaded
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
        <section className="py-12 border-b border-white/10">
          <div className="container mx-auto px-4">
            <SectionHeading
              badge="Recurring Payments"
              title="Subscription Manager"
              subtitle="Recurring crypto payments made easy"
            />
            {!IS_SUBSCRIPTION_DEPLOYED && (
              <p className="mt-2 text-sm text-amber-400 text-center">Subscriptions are not available on this network.</p>
            )}
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
                <button
                  onClick={() => document.getElementById('create-subscription')?.scrollIntoView({ behavior: 'smooth' })}
                  disabled={!isConnected || !IS_SUBSCRIPTION_DEPLOYED}
                  className="px-6 py-2 bg-gradient-to-r from-[#00F0FF] to-[#0080FF] text-[#1A1A1D] rounded-lg font-bold hover:scale-105 transition-transform disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {IS_SUBSCRIPTION_DEPLOYED ? 'New Subscription' : 'Unavailable on this network'}
                </button>
              </div>

              {(isLoadingUserSubs || isLoadingSubscriptions) && (
                <div className="text-sm text-[#A0A0A5] mb-2">Loading subscriptions...</div>
              )}

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
                  <SurfaceCard key={sub.id} className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-xl font-bold text-white mb-1">{sub.name}</h3>
                        <div className="text-gray-400 text-sm font-mono mb-2">{sub.merchant}</div>
                        <AccentBadge color={sub.status === "Active" ? "emerald" : "amber"}>
                          {sub.status}
                        </AccentBadge>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-cyan-400">{sub.amount}</div>
                        <div className="mt-1 inline-flex items-center gap-2">
                          <AccentBadge color="cyan">{sub.tokenSymbol}</AccentBadge>
                          <span className="text-gray-400 text-xs">{sub.frequency}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between pt-4 border-t border-white/10">
                      <div className="text-gray-400 text-sm">
                        Next payment: {sub.nextPayment}
                      </div>
                      <div className="flex gap-2">
                        {sub.status === "Active" ? (
                          <button 
                            onClick={() => handlePause(sub.id)}
                            disabled={actionLoading === `pause-${sub.id}`}
                            className="px-4 py-2 border border-amber-500/50 text-amber-400 rounded hover:bg-amber-500/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {actionLoading === `pause-${sub.id}` ? 'Pausing...' : 'Pause'}
                          </button>
                        ) : (
                          <button 
                            onClick={() => handleResume(sub.id)}
                            disabled={actionLoading === `resume-${sub.id}`}
                            className="px-4 py-2 border border-emerald-500/50 text-emerald-400 rounded hover:bg-emerald-500/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {actionLoading === `resume-${sub.id}` ? 'Resuming...' : 'Resume'}
                          </button>
                        )}
                        <button 
                          onClick={() => handleCancel(sub.id)}
                          disabled={actionLoading === `cancel-${sub.id}`}
                          className="px-4 py-2 border border-red-500/50 text-red-400 rounded hover:bg-red-500/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {actionLoading === `cancel-${sub.id}` ? 'Cancelling...' : 'Cancel'}
                        </button>
                      </div>
                    </div>
                  </SurfaceCard>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Merchant Subscriptions */}
        <section className="py-8">
          <div className="container mx-auto px-4">
            <SurfaceCard className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white">
                  Merchant Subscriptions
                </h2>
                <div className="text-sm text-gray-400">Viewing as merchant</div>
              </div>

              {(isLoadingMerchantSubs || isLoadingMerchantDetails) && (
                <div className="text-sm text-gray-400 mb-2">Loading merchant subscriptions...</div>
              )}

              <div className="space-y-4">
                {merchantSubscriptions.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 mx-auto mb-4 bg-cyan-500/10 rounded-xl flex items-center justify-center">
                      <svg className="w-8 h-8 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">No Merchant Subscriptions</h3>
                    <p className="text-gray-400 mb-4">
                      {isConnected
                        ? "You have no active subscriptions as a merchant yet."
                        : "Connect your wallet to view subscriptions where you are the merchant."}
                    </p>
                  </div>
                ) : merchantSubscriptions.map((sub) => (
                  <SurfaceCard key={sub.id} className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-xl font-bold text-white mb-1">{sub.name}</h3>
                        <div className="text-gray-400 text-sm font-mono mb-2">Subscriber: {sub.merchant}</div>
                        <AccentBadge color={sub.status === "Active" ? "emerald" : "amber"}>
                          {sub.status}
                        </AccentBadge>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-cyan-400">{sub.amount}</div>
                        <div className="mt-1 inline-flex items-center gap-2">
                          <AccentBadge color="cyan">{sub.tokenSymbol}</AccentBadge>
                          <span className="text-gray-400 text-xs">{sub.frequency}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between pt-4 border-t border-white/10">
                      <div className="text-gray-400 text-sm">
                        Next payment: {sub.nextPayment}
                      </div>
                      <div className="text-xs text-gray-400">Subscription ID: {sub.id}</div>
                    </div>
                  </SurfaceCard>
                ))}
              </div>
            </SurfaceCard>
          </div>
        </section>

        {/* Create Subscription */}
        <section className="py-8" id="create-subscription">
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
                    value={merchantInput}
                    onChange={(e) => setMerchantInput(e.target.value.trim())}
                    className="w-full px-4 py-3 bg-[#1A1A1D] border border-[#3A3A3F] rounded-lg text-[#F5F3E8] focus:border-[#00F0FF] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[#A0A0A5] font-[family-name:var(--font-body)] text-sm mb-2">
                    Token Address
                  </label>
                  <input
                    type="text"
                    placeholder="0x..."
                    value={tokenInput}
                    onChange={(e) => setTokenInput(e.target.value.trim())}
                    className="w-full px-4 py-3 bg-[#1A1A1D] border border-[#3A3A3F] rounded-lg text-[#F5F3E8] focus:border-[#00F0FF] outline-none"
                  />
                  <p className="mt-2 text-xs text-[#A0A0A5]">Symbol: {selectedTokenMeta.symbol} • Decimals: {selectedTokenMeta.decimals}</p>
                </div>

                <div>
                  <label className="block text-[#A0A0A5] font-[family-name:var(--font-body)] text-sm mb-2">
                    Amount (token units)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.0001"
                    placeholder="29.99"
                    value={amountInput}
                    onChange={(e) => setAmountInput(e.target.value)}
                    className="w-full px-4 py-3 bg-[#1A1A1D] border border-[#3A3A3F] rounded-lg text-[#F5F3E8] focus:border-[#00F0FF] outline-none"
                  />
                  <p className="mt-2 text-xs text-[#A0A0A5]">Parsed with {selectedTokenMeta.decimals} decimals.</p>
                </div>

                <div>
                  <label className="block text-[#A0A0A5] font-[family-name:var(--font-body)] text-sm mb-2">
                    Frequency
                  </label>
                  <select
                    value={frequency}
                    onChange={(e) => setFrequency(e.target.value as "monthly" | "weekly" | "daily")}
                    className="w-full px-4 py-3 bg-[#1A1A1D] border border-[#3A3A3F] rounded-lg text-[#F5F3E8] focus:border-[#00F0FF] outline-none"
                  >
                    <option value="monthly">Monthly (30d)</option>
                    <option value="weekly">Weekly</option>
                    <option value="daily">Daily</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-[#A0A0A5] font-[family-name:var(--font-body)] text-sm mb-2">
                    Memo (optional)
                  </label>
                  <input
                    type="text"
                    placeholder="Subscription memo"
                    value={memoInput}
                    onChange={(e) => setMemoInput(e.target.value)}
                    className="w-full px-4 py-3 bg-[#1A1A1D] border border-[#3A3A3F] rounded-lg text-[#F5F3E8] focus:border-[#00F0FF] outline-none"
                  />
                </div>
              </div>

              <button
                onClick={handleCreate}
                disabled={!isConnected || !IS_SUBSCRIPTION_DEPLOYED || actionLoading === "create"}
                className="mt-6 w-full px-6 py-3 bg-gradient-to-r from-[#00F0FF] to-[#0080FF] text-[#1A1A1D] rounded-lg font-bold hover:scale-105 transition-transform disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {actionLoading === "create" ? "Creating..." : IS_SUBSCRIPTION_DEPLOYED ? "Create Subscription" : "Unavailable on this network"}
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

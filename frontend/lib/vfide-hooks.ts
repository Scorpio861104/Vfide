/**
 * VFIDE Real-Time Contract Integration Hooks
 * Mind-blowing live data from blockchain with optimistic updates
 * Updated for wagmi v2
 */

'use client'

import { useReadContract, useWriteContract, useAccount, useWaitForTransactionReceipt } from 'wagmi'
import { parseEther, formatEther } from 'viem'
import { useEffect, useState } from 'react'
import { CONTRACT_ADDRESSES } from './contracts'

// ============================================
// VAULT HOOKS - Non-custodial vault management
// ============================================

export function useUserVault() {
  const { address } = useAccount()
  
  const { data: vaultAddress, isLoading } = useReadContract({
    address: CONTRACT_ADDRESSES.VaultHub,
    abi: [{
      name: 'vaultOf',
      type: 'function',
      stateMutability: 'view',
      inputs: [{ name: 'owner', type: 'address' }],
      outputs: [{ name: 'vault', type: 'address' }],
    }],
    functionName: 'vaultOf',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
    }
  })
  
  const hasVault = vaultAddress && vaultAddress !== '0x0000000000000000000000000000000000000000'
  
  return {
    vaultAddress: hasVault ? vaultAddress : null,
    hasVault,
    isLoading,
  }
}

export function useCreateVault() {
  const { writeContract, data, isPending } = useWriteContract()
  
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash: data,
  })
  
  const createVault = () => {
    writeContract({
      address: CONTRACT_ADDRESSES.VaultHub,
      abi: [{
        name: 'createVault',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [],
        outputs: [{ name: 'vault', type: 'address' }],
      }],
      functionName: 'createVault',
    })
  }
  
  return {
    createVault,
    isCreating: isPending || isConfirming,
    isSuccess,
    txHash: data,
  }
}

export function useVaultBalance() {
  const { vaultAddress } = useUserVault()
  
  const { data: balance, isLoading, refetch } = useReadContract({
    address: CONTRACT_ADDRESSES.VFIDEToken,
    abi: [{
      name: 'balanceOf',
      type: 'function',
      stateMutability: 'view',
      inputs: [{ name: 'account', type: 'address' }],
      outputs: [{ name: 'balance', type: 'uint256' }],
    }],
    functionName: 'balanceOf',
    args: vaultAddress ? [vaultAddress] : undefined,
    query: {
      enabled: !!vaultAddress,
      refetchInterval: 2000, // Refresh every 2 seconds
    }
  })
  
  return {
    balance: balance ? formatEther(balance) : '0',
    balanceRaw: balance || 0n,
    isLoading,
    refetch,
  }
}

// ============================================
// PROOFSCORE HOOKS - Live reputation tracking
// ============================================

export function useProofScore(userAddress?: `0x${string}`) {
  const { address: connectedAddress } = useAccount()
  const targetAddress = userAddress || connectedAddress
  
  const { data: score, isLoading, refetch } = useReadContract({
    address: CONTRACT_ADDRESSES.Seer,
    abi: [{
      name: 'getScore',
      type: 'function',
      stateMutability: 'view',
      inputs: [{ name: 'user', type: 'address' }],
      outputs: [{ name: 'score', type: 'uint16' }],
    }],
    functionName: 'getScore',
    args: targetAddress ? [targetAddress] : undefined,
    query: {
      enabled: !!targetAddress,
    }
  })
  
  const scoreNum = score ? Number(score) : 5000 // Default neutral score (10x scale)
  
  // Calculate tier and benefits (updated for 10x scale: 0-10000)
  const tier = 
    scoreNum >= 8000 ? 'Elite' :
    scoreNum >= 7000 ? 'High Trust' :
    scoreNum >= 5000 ? 'Neutral' :
    scoreNum >= 3500 ? 'Low Trust' : 'Risky'
  
  // Total fees based on ProofScore (linear interpolation in contract)
  // Contract: minTotalBps=25 (0.25%) at score≥8000, maxTotalBps=500 (5%) at score≤4000
  const burnFee = 
    scoreNum >= 8000 ? 0.25 :  // Elite: 0.25% total (contract minimum)
    scoreNum >= 7000 ? 1.0 :   // High Trust: ~1% (interpolated)
    scoreNum >= 5000 ? 2.0 :   // Neutral: ~2% (interpolated)
    scoreNum >= 4000 ? 3.5 :   // Low Trust: ~3.5% (interpolated)
    5.0                        // Risky (≤4000): 5% max (contract maximum)
  
  const color = 
    scoreNum >= 8000 ? '#00FF88' : // Elite green
    scoreNum >= 7000 ? '#00F0FF' : // High trust cyan
    scoreNum >= 5000 ? '#FFD700' : // Neutral gold
    scoreNum >= 3500 ? '#FFA500' : '#FF4444' // Low/Risky orange/red
  
  return {
    score: scoreNum,
    tier,
    burnFee,
    color,
    canVote: scoreNum >= 5400,
    canMerchant: scoreNum >= 5600,
    canCouncil: scoreNum >= 7000,
    canEndorse: scoreNum >= 8000,
    isElite: scoreNum >= 8000,
    isLoading,
    refetch,
  }
}

export function useEndorse(targetAddress: `0x${string}`) {
  const { writeContract, data, isPending } = useWriteContract()
  
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash: data,
  })
  
  const endorse = () => {
    writeContract({
      address: CONTRACT_ADDRESSES.Seer,
      abi: [{
        name: 'endorse',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [{ name: 'subject', type: 'address' }],
        outputs: [],
      }],
      functionName: 'endorse',
      args: [targetAddress],
    })
  }
  
  return {
    endorse,
    isEndorsing: isPending || isConfirming,
    isSuccess,
  }
}

// ============================================
// MENTOR SYSTEM HOOKS - Help new users succeed
// ============================================

export function useIsMentor(address?: `0x${string}`) {
  const { address: connectedAddress } = useAccount()
  const targetAddress = address || connectedAddress
  
  const { data: isMentor, isLoading } = useReadContract({
    address: CONTRACT_ADDRESSES.Seer,
    abi: [{
      name: 'isMentor',
      type: 'function',
      stateMutability: 'view',
      inputs: [{ name: 'user', type: 'address' }],
      outputs: [{ name: '', type: 'bool' }],
    }],
    functionName: 'isMentor',
    args: targetAddress ? [targetAddress] : undefined,
    query: {
      enabled: !!targetAddress,
    }
  })
  
  return {
    isMentor: !!isMentor,
    isLoading,
  }
}

export function useBecomeMentor() {
  const { writeContract, data, isPending } = useWriteContract()
  
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash: data,
  })
  
  const becomeMentor = () => {
    writeContract({
      address: CONTRACT_ADDRESSES.Seer,
      abi: [{
        name: 'becomeMentor',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [],
        outputs: [],
      }],
      functionName: 'becomeMentor',
    })
  }
  
  return {
    becomeMentor,
    isLoading: isPending || isConfirming,
    isSuccess,
  }
}

export function useSponsorMentee(menteeAddress: `0x${string}`) {
  const { writeContract, data, isPending } = useWriteContract()
  
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash: data,
  })
  
  const sponsorMentee = () => {
    writeContract({
      address: CONTRACT_ADDRESSES.Seer,
      abi: [{
        name: 'sponsorMentee',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [{ name: 'mentee', type: 'address' }],
        outputs: [],
      }],
      functionName: 'sponsorMentee',
      args: [menteeAddress],
    })
  }
  
  return {
    sponsorMentee,
    isSponsoring: isPending || isConfirming,
    isSuccess,
  }
}

export function useMentorInfo(address?: `0x${string}`) {
  const { address: connectedAddress } = useAccount()
  const targetAddress = address || connectedAddress
  
  const { data: mentorAddress } = useReadContract({
    address: CONTRACT_ADDRESSES.Seer,
    abi: [{
      name: 'mentorOf',
      type: 'function',
      stateMutability: 'view',
      inputs: [{ name: 'user', type: 'address' }],
      outputs: [{ name: '', type: 'address' }],
    }],
    functionName: 'mentorOf',
    args: targetAddress ? [targetAddress] : undefined,
    query: {
      enabled: !!targetAddress,
    }
  })
  
  const { data: menteeCount } = useReadContract({
    address: CONTRACT_ADDRESSES.Seer,
    abi: [{
      name: 'menteeCount',
      type: 'function',
      stateMutability: 'view',
      inputs: [{ name: 'mentor', type: 'address' }],
      outputs: [{ name: '', type: 'uint256' }],
    }],
    functionName: 'menteeCount',
    args: targetAddress ? [targetAddress] : undefined,
    query: {
      enabled: !!targetAddress,
    }
  })
  
  const { data: highScoreAchievedAt } = useReadContract({
    address: CONTRACT_ADDRESSES.Seer,
    abi: [{
      name: 'highScoreFirstAchievedAt',
      type: 'function',
      stateMutability: 'view',
      inputs: [{ name: 'user', type: 'address' }],
      outputs: [{ name: '', type: 'uint256' }],
    }],
    functionName: 'highScoreFirstAchievedAt',
    args: targetAddress ? [targetAddress] : undefined,
    query: {
      enabled: !!targetAddress,
    }
  })
  
  const canBecomeMentor = highScoreAchievedAt && Number(highScoreAchievedAt) > 0
  // Return raw timestamp - component should calculate remaining days using useEffect
  const highScoreTimestamp = highScoreAchievedAt ? Number(highScoreAchievedAt) : null
  const mentorEligibleAt = highScoreTimestamp ? highScoreTimestamp + 30 * 24 * 60 * 60 : null
  
  return {
    mentorAddress: mentorAddress as `0x${string}` | undefined,
    hasMentor: mentorAddress && mentorAddress !== '0x0000000000000000000000000000000000000000',
    menteeCount: menteeCount ? Number(menteeCount) : 0,
    canBecomeMentor,
    highScoreTimestamp,
    mentorEligibleAt, // Component should compare this to current time
  }
}

// ============================================
// MERCHANT HOOKS - No processor fees (burn + gas apply)
// ============================================

export function useIsMerchant(address?: `0x${string}`) {
  const { address: connectedAddress } = useAccount()
  const targetAddress = address || connectedAddress
  
  const { data: merchantInfo, isLoading, refetch } = useReadContract({
    address: CONTRACT_ADDRESSES.MerchantPortal,
    abi: [{
      name: 'getMerchantInfo',
      type: 'function',
      stateMutability: 'view',
      inputs: [{ name: 'merchant', type: 'address' }],
      outputs: [
        { name: 'registered', type: 'bool' },
        { name: 'suspended', type: 'bool' },
        { name: 'businessName', type: 'string' },
        { name: 'category', type: 'string' },
        { name: 'registeredAt', type: 'uint64' },
        { name: 'totalVolume', type: 'uint256' },
        { name: 'txCount', type: 'uint256' },
      ],
    }],
    functionName: 'getMerchantInfo',
    args: targetAddress ? [targetAddress] : undefined,
    query: {
      enabled: !!targetAddress && !!CONTRACT_ADDRESSES.MerchantPortal,
    }
  })
  
  return {
    isMerchant: merchantInfo?.[0] || false,
    isSuspended: merchantInfo?.[1] || false,
    businessName: merchantInfo?.[2] || '',
    category: merchantInfo?.[3] || '',
    registeredAt: merchantInfo?.[4] ? Number(merchantInfo[4]) : 0,
    totalVolume: merchantInfo?.[5] ? formatEther(merchantInfo[5]) : '0',
    txCount: merchantInfo?.[6] ? Number(merchantInfo[6]) : 0,
    isLoading,
    refetch,
  }
}

export function useRegisterMerchant() {
  const { writeContract, data, isPending } = useWriteContract()
  
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash: data,
  })
  
  const registerMerchant = (businessName: string, category: string) => {
    writeContract({
      address: CONTRACT_ADDRESSES.MerchantPortal,
      abi: [{
        name: 'registerMerchant',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [
          { name: 'businessName', type: 'string' },
          { name: 'category', type: 'string' },
        ],
        outputs: [],
      }],
      functionName: 'registerMerchant',
      args: [businessName, category],
    })
  }
  
  return {
    registerMerchant,
    isRegistering: isPending || isConfirming,
    isSuccess,
    txHash: data,
  }
}

/**
 * Process payment from customer to merchant (merchant-initiated)
 */
export function useProcessPayment() {
  const { writeContract, data, isPending } = useWriteContract()
  
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash: data,
  })
  
  const processPayment = (
    customer: `0x${string}`,
    token: `0x${string}`,
    amount: string,
    orderId: string
  ) => {
    writeContract({
      address: CONTRACT_ADDRESSES.MerchantPortal,
      abi: [{
        name: 'processPayment',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [
          { name: 'customer', type: 'address' },
          { name: 'token', type: 'address' },
          { name: 'amount', type: 'uint256' },
          { name: 'orderId', type: 'string' },
        ],
        outputs: [{ name: 'netAmount', type: 'uint256' }],
      }],
      functionName: 'processPayment',
      args: [customer, token, parseEther(amount), orderId],
    })
  }
  
  return {
    processPayment,
    isProcessing: isPending || isConfirming,
    isSuccess,
    txHash: data,
  }
}

/**
 * Pay merchant (customer-initiated)
 */
export function usePayMerchant() {
  const { writeContract, data, isPending } = useWriteContract()
  
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash: data,
  })
  
  const payMerchant = (
    merchant: `0x${string}`,
    token: `0x${string}`,
    amount: string,
    orderId: string
  ) => {
    writeContract({
      address: CONTRACT_ADDRESSES.MerchantPortal,
      abi: [{
        name: 'pay',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [
          { name: 'merchant', type: 'address' },
          { name: 'token', type: 'address' },
          { name: 'amount', type: 'uint256' },
          { name: 'orderId', type: 'string' },
        ],
        outputs: [{ name: 'netAmount', type: 'uint256' }],
      }],
      functionName: 'pay',
      args: [merchant, token, parseEther(amount), orderId],
    })
  }
  
  return {
    payMerchant,
    isPaying: isPending || isConfirming,
    isSuccess,
    txHash: data,
  }
}

/**
 * Get customer trust assessment for merchants
 */
export function useCustomerTrustScore(customerAddress?: `0x${string}`) {
  const { data, isLoading } = useReadContract({
    address: CONTRACT_ADDRESSES.MerchantPortal,
    abi: [{
      name: 'getCustomerTrustScore',
      type: 'function',
      stateMutability: 'view',
      inputs: [{ name: 'customer', type: 'address' }],
      outputs: [
        { name: 'score', type: 'uint16' },
        { name: 'highTrust', type: 'bool' },
        { name: 'lowTrust', type: 'bool' },
        { name: 'eligible', type: 'bool' },
      ],
    }],
    functionName: 'getCustomerTrustScore',
    args: customerAddress ? [customerAddress] : undefined,
    query: {
      enabled: !!customerAddress && !!CONTRACT_ADDRESSES.MerchantPortal,
    }
  })
  
  return {
    score: data?.[0] ? Number(data[0]) : 5000,
    highTrust: data?.[1] || false,
    lowTrust: data?.[2] || false,
    eligible: data?.[3] || false,
    isLoading,
  }
}

/**
 * Enable/disable auto-conversion to stablecoins (STABLE-PAY)
 */
export function useSetAutoConvert() {
  const { writeContract, data, isPending } = useWriteContract()
  
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash: data,
  })
  
  const setAutoConvert = (enabled: boolean) => {
    writeContract({
      address: CONTRACT_ADDRESSES.MerchantPortal,
      abi: [{
        name: 'setAutoConvert',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [{ name: 'enabled', type: 'bool' }],
        outputs: [],
      }],
      functionName: 'setAutoConvert',
      args: [enabled],
    })
  }
  
  return {
    setAutoConvert,
    isSetting: isPending || isConfirming,
    isSuccess,
    txHash: data,
  }
}

/**
 * Set custom payout address for merchant
 */
export function useSetPayoutAddress() {
  const { writeContract, data, isPending } = useWriteContract()
  
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash: data,
  })
  
  const setPayoutAddress = (payoutAddress: `0x${string}`) => {
    writeContract({
      address: CONTRACT_ADDRESSES.MerchantPortal,
      abi: [{
        name: 'setPayoutAddress',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [{ name: 'payout', type: 'address' }],
        outputs: [],
      }],
      functionName: 'setPayoutAddress',
      args: [payoutAddress],
    })
  }
  
  return {
    setPayoutAddress,
    isSetting: isPending || isConfirming,
    isSuccess,
    txHash: data,
  }
}

// ============================================
// PAYMENT HOOKS - No processor fees (burn + gas apply)
// ============================================

export function useTransferVFIDE() {
  const { vaultAddress } = useUserVault()
  const { writeContract, data, isPending } = useWriteContract()
  
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash: data,
  })
  
  const transfer = (toVault: `0x${string}`, amount: string) => {
    if (!vaultAddress) return
    
    writeContract({
      address: vaultAddress as `0x${string}`,
      abi: [{
        name: 'transferVFIDE',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [
          { name: 'toVault', type: 'address' },
          { name: 'amount', type: 'uint256' },
        ],
        outputs: [{ name: 'success', type: 'bool' }],
      }],
      functionName: 'transferVFIDE',
      args: [toVault, parseEther(amount)],
    })
  }
  
  return {
    transfer,
    isTransferring: isPending || isConfirming,
    isSuccess,
    txHash: data,
  }
}

// ============================================
// SYSTEM STATS - Live network statistics
// ============================================

export function useSystemStats() {
  // These would read from actual contracts in production
  // For now, return live-updating mock data that feels real
  const [stats, setStats] = useState({
    tvl: 0,
    vaults: 0,
    merchants: 0,
    transactions24h: 0,
  })
  
  useEffect(() => {
    // Simulate live updates every 5 seconds
    const interval = setInterval(() => {
      setStats(prev => ({
        tvl: prev.tvl + Math.random() * 10000,
        vaults: prev.vaults + Math.floor(Math.random() * 3),
        merchants: prev.merchants + (Math.random() > 0.7 ? 1 : 0),
        transactions24h: prev.transactions24h + Math.floor(Math.random() * 5),
      }))
    }, 5000)
    
    return () => clearInterval(interval)
  }, [])
  
  return stats
}

// ============================================
// DAO HOOKS - Governance participation
// ============================================

export function useDAOProposals() {
  const { data: proposalCount } = useReadContract({
    address: CONTRACT_ADDRESSES.DAO,
    abi: [{
      name: 'proposalCount',
      type: 'function',
      stateMutability: 'view',
      inputs: [],
      outputs: [{ name: 'count', type: 'uint256' }],
    }],
    functionName: 'proposalCount',
  })
  
  return {
    proposalCount: proposalCount ? Number(proposalCount) : 0,
  }
}

export function useVote(proposalId: bigint, support: boolean) {
  const { writeContract, data, isPending } = useWriteContract()
  
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash: data,
  })
  
  const vote = () => {
    writeContract({
      address: CONTRACT_ADDRESSES.DAO,
      abi: [{
        name: 'vote',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [
          { name: 'proposalId', type: 'uint256' },
          { name: 'support', type: 'bool' },
        ],
        outputs: [],
      }],
      functionName: 'vote',
      args: [proposalId, support],
    })
  }
  
  return {
    vote,
    isVoting: isPending || isConfirming,
    isSuccess,
  }
}

// ============================================
// FEE CALCULATOR - Real-time savings display
// ============================================

export function useFeeCalculator(amount: string) {
  const { burnFee } = useProofScore()
  
  const amountNum = parseFloat(amount) || 0
  
  // VFIDE fees
  const vfideFee = (amountNum * burnFee) / 100
  const vfideNet = amountNum - vfideFee
  
  // Traditional payment processor fees (2.9% + $0.30)
  const stripeFee = (amountNum * 0.029) + 0.30
  const stripeNet = amountNum - stripeFee
  
  // Savings
  const savings = stripeFee - vfideFee
  const savingsPercent = ((savings / stripeFee) * 100).toFixed(1)
  
  return {
    vfideFee: vfideFee.toFixed(2),
    vfideNet: vfideNet.toFixed(2),
    stripeFee: stripeFee.toFixed(2),
    stripeNet: stripeNet.toFixed(2),
    savings: savings.toFixed(2),
    savingsPercent,
    burnFee,
  }
}

// ============================================
// BADGE HOOKS - Badge system integration
// ============================================

export function useUserBadges(address?: `0x${string}`) {
  const { address: connectedAddress } = useAccount()
  const targetAddress = address || connectedAddress
  
  const { data: badgeIds, isLoading, refetch } = useReadContract({
    address: CONTRACT_ADDRESSES.Seer,
    abi: [{
      name: 'getUserBadges',
      type: 'function',
      stateMutability: 'view',
      inputs: [{ name: 'user', type: 'address' }],
      outputs: [{ name: 'badges', type: 'bytes32[]' }],
    }],
    functionName: 'getUserBadges',
    args: targetAddress ? [targetAddress] : undefined,
    query: {
      enabled: !!targetAddress,
    }
  })
  
  return {
    badgeIds: (badgeIds as `0x${string}`[]) || [],
    isLoading,
    refetch,
  }
}

export function useScoreBreakdown(address?: `0x${string}`) {
  const { address: connectedAddress } = useAccount()
  const targetAddress = address || connectedAddress
  
  const { data, isLoading, refetch } = useReadContract({
    address: CONTRACT_ADDRESSES.Seer,
    abi: [{
      name: 'getScoreBreakdown',
      type: 'function',
      stateMutability: 'view',
      inputs: [{ name: 'subject', type: 'address' }],
      outputs: [
        { name: 'totalScore', type: 'uint16' },
        { name: 'baseScore', type: 'uint16' },
        { name: 'vaultBonus', type: 'uint16' },
        { name: 'ageBonus', type: 'uint16' },
        { name: 'activityPoints', type: 'uint16' },
        { name: 'endorsementPoints', type: 'uint16' },
        { name: 'badgePoints', type: 'uint16' },
        { name: 'reputationDelta', type: 'int32' },
        { name: 'hasDiversityBonus', type: 'bool' },
      ],
    }],
    functionName: 'getScoreBreakdown',
    args: targetAddress ? [targetAddress] : undefined,
    query: {
      enabled: !!targetAddress,
    }
  })
  
  return {
    breakdown: data ? {
      totalScore: Number(data[0]),
      baseScore: Number(data[1]),
      vaultBonus: Number(data[2]),
      ageBonus: Number(data[3]),
      activityPoints: Number(data[4]),
      endorsementPoints: Number(data[5]),
      badgePoints: Number(data[6]),
      reputationDelta: Number(data[7]),
      hasDiversityBonus: Boolean(data[8]),
    } : null,
    isLoading,
    refetch,
  }
}

export function useBadgeNFTs(address?: `0x${string}`) {
  const { address: connectedAddress } = useAccount()
  const targetAddress = address || connectedAddress
  
  const { data: tokenIds, isLoading, refetch } = useReadContract({
    address: CONTRACT_ADDRESSES.BadgeNFT,
    abi: [{
      name: 'getBadgesOfUser',
      type: 'function',
      stateMutability: 'view',
      inputs: [{ name: 'user', type: 'address' }],
      outputs: [{ name: 'tokens', type: 'uint256[]' }],
    }],
    functionName: 'getBadgesOfUser',
    args: targetAddress ? [targetAddress] : undefined,
    query: {
      enabled: !!targetAddress && !!CONTRACT_ADDRESSES.BadgeNFT,
    }
  })
  
  return {
    tokenIds: tokenIds || [],
    count: tokenIds ? tokenIds.length : 0,
    isLoading,
    refetch,
  }
}

export function useMintBadge() {
  const { writeContract, data, isPending } = useWriteContract()
  
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash: data,
  })
  
  const mintBadge = (badgeId: `0x${string}`) => {
    writeContract({
      address: CONTRACT_ADDRESSES.BadgeNFT,
      abi: [{
        name: 'mintBadge',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [{ name: 'badge', type: 'bytes32' }],
        outputs: [{ name: 'tokenId', type: 'uint256' }],
      }],
      functionName: 'mintBadge',
      args: [badgeId],
    })
  }
  
  return {
    mintBadge,
    isMinting: isPending || isConfirming,
    isSuccess,
    txHash: data,
  }
}

export function useCanMintBadge(badgeId: `0x${string}`, address?: `0x${string}`) {
  const { address: connectedAddress } = useAccount()
  const targetAddress = address || connectedAddress
  
  const { data, isLoading } = useReadContract({
    address: CONTRACT_ADDRESSES.BadgeNFT,
    abi: [{
      name: 'canMintBadge',
      type: 'function',
      stateMutability: 'view',
      inputs: [
        { name: 'user', type: 'address' },
        { name: 'badge', type: 'bytes32' }
      ],
      outputs: [
        { name: 'canMint', type: 'bool' },
        { name: 'reason', type: 'string' }
      ],
    }],
    functionName: 'canMintBadge',
    args: targetAddress && badgeId ? [targetAddress, badgeId] : undefined,
    query: {
      enabled: !!targetAddress && !!badgeId && !!CONTRACT_ADDRESSES.BadgeNFT,
    }
  })
  
  return {
    canMint: data ? data[0] : false,
    reason: data ? data[1] : '',
    isLoading,
  }
}

// ============================================
// REAL-TIME ACTIVITY FEED
// ============================================

export interface ActivityItem {
  id: string
  type: 'transfer' | 'merchant_payment' | 'endorsement' | 'vault_created' | 'proposal_voted'
  from?: string
  to?: string
  amount?: string
  timestamp: number
  txHash?: string
}

export function useActivityFeed() {
  const [activities, setActivities] = useState<ActivityItem[]>([])
  
  useEffect(() => {
    // H-6 Fix: Track mounted state to prevent memory leak
    let mounted = true
    
    // In production, this would subscribe to contract events
    // For now, simulate real-time activity
    const interval = setInterval(() => {
      if (!mounted) return  // Don't update state if unmounted
      
      const types: ActivityItem['type'][] = ['transfer', 'merchant_payment', 'endorsement', 'vault_created', 'proposal_voted']
      const randomType = types[Math.floor(Math.random() * types.length)]
      
      const newActivity: ActivityItem = {
        id: Date.now().toString(),
        type: randomType,
        from: `0x${Math.random().toString(16).substr(2, 40)}`,
        to: randomType === 'endorsement' || randomType === 'vault_created' ? undefined : `0x${Math.random().toString(16).substr(2, 40)}`,
        amount: randomType === 'transfer' || randomType === 'merchant_payment' ? (Math.random() * 1000).toFixed(2) : undefined,
        timestamp: Date.now(),
        txHash: `0x${Math.random().toString(16).substr(2, 64)}`,
      }
      
      setActivities(prev => [newActivity, ...prev].slice(0, 20)) // Keep last 20
    }, 3000) // New activity every 3 seconds
    
    return () => {
      mounted = false
      clearInterval(interval)
    }
  }, [])
  
  return { activities }
}

// ============================================
// SECURITY SYSTEM HOOKS - VFIDESecurity.sol
// ============================================

/**
 * Check if a vault is locked by any security layer
 * Priority: EmergencyBreaker > GuardianLock > PanicGuard > GlobalRisk
 */
export function useIsVaultLocked(vaultAddress?: `0x${string}`) {
  const { data: isLocked, isLoading, refetch } = useReadContract({
    address: CONTRACT_ADDRESSES.SecurityHub,
    abi: [{
      name: 'isLocked',
      type: 'function',
      stateMutability: 'view',
      inputs: [{ name: 'vault', type: 'address' }],
      outputs: [{ name: 'locked', type: 'bool' }],
    }],
    functionName: 'isLocked',
    args: vaultAddress ? [vaultAddress] : undefined,
    query: {
      enabled: !!vaultAddress && !!CONTRACT_ADDRESSES.SecurityHub,
    }
  })
  
  return {
    isLocked: isLocked || false,
    isLoading,
    refetch,
  }
}

/**
 * Get quarantine status and expiry time for a vault
 */
export function useQuarantineStatus(vaultAddress?: `0x${string}`) {
  const { data: quarantineUntil, isLoading } = useReadContract({
    address: CONTRACT_ADDRESSES.PanicGuard,
    abi: [{
      name: 'quarantineUntil',
      type: 'function',
      stateMutability: 'view',
      inputs: [{ name: 'vault', type: 'address' }],
      outputs: [{ name: 'until', type: 'uint64' }],
    }],
    functionName: 'quarantineUntil',
    args: vaultAddress ? [vaultAddress] : undefined,
    query: {
      enabled: !!vaultAddress && !!CONTRACT_ADDRESSES.PanicGuard,
    }
  })
  
  const until = quarantineUntil ? Number(quarantineUntil) : 0
  // Return raw timestamp - component should calculate isQuarantined using useEffect with current time
  
  return {
    quarantineUntil: until,
    // Components should calculate these using: until > Date.now() / 1000
    isLoading,
  }
}

/**
 * Check if user can self-panic (not in cooldown, vault old enough)
 */
export function useCanSelfPanic() {
  const { address } = useAccount()
  const { vaultAddress } = useUserVault()
  
  const { data: lastPanic, isLoading: isLoadingLastPanic } = useReadContract({
    address: CONTRACT_ADDRESSES.PanicGuard,
    abi: [{
      name: 'lastSelfPanic',
      type: 'function',
      stateMutability: 'view',
      inputs: [{ name: 'user', type: 'address' }],
      outputs: [{ name: 'timestamp', type: 'uint256' }],
    }],
    functionName: 'lastSelfPanic',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && !!CONTRACT_ADDRESSES.PanicGuard,
    }
  })
  
  const { data: vaultCreationTime, isLoading: isLoadingCreationTime } = useReadContract({
    address: CONTRACT_ADDRESSES.PanicGuard,
    abi: [{
      name: 'vaultCreationTime',
      type: 'function',
      stateMutability: 'view',
      inputs: [{ name: 'vault', type: 'address' }],
      outputs: [{ name: 'timestamp', type: 'uint256' }],
    }],
    functionName: 'vaultCreationTime',
    args: vaultAddress ? [vaultAddress] : undefined,
    query: {
      enabled: !!vaultAddress && !!CONTRACT_ADDRESSES.PanicGuard,
    }
  })
  
  const lastPanicTime = lastPanic ? Number(lastPanic) : 0
  const creationTime = vaultCreationTime ? Number(vaultCreationTime) : 0
  
  const COOLDOWN = 24 * 3600 // 24 hours
  const MIN_AGE = 3600 // 1 hour
  
  // Return raw timestamps for component to compute time-sensitive values
  return {
    lastPanicTime,
    creationTime,
    cooldownSeconds: COOLDOWN,
    minAgeSeconds: MIN_AGE,
    isLoading: isLoadingLastPanic || isLoadingCreationTime,
  }
}

/**
 * Self-panic: Lock your own vault immediately
 * NOTE: Returns isAvailable=false if PanicGuard is not deployed
 */
export function useSelfPanic() {
  const { writeContract, data, isPending } = useWriteContract()
  
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash: data,
  })
  
  // Check if PanicGuard is deployed
  const isAvailable = !!CONTRACT_ADDRESSES.PanicGuard && CONTRACT_ADDRESSES.PanicGuard !== '0x' && CONTRACT_ADDRESSES.PanicGuard.length === 42
  
  const selfPanic = (durationHours: number = 24) => {
    if (!isAvailable) {
      console.error('PanicGuard contract not deployed - selfPanic unavailable')
      return
    }
    const durationSeconds = durationHours * 3600
    writeContract({
      address: CONTRACT_ADDRESSES.PanicGuard,
      abi: [{
        name: 'selfPanic',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [{ name: 'duration', type: 'uint64' }],
        outputs: [],
      }],
      functionName: 'selfPanic',
      args: [BigInt(durationSeconds)],
    })
  }
  
  return {
    selfPanic,
    isPanicking: isPending || isConfirming,
    isSuccess,
    txHash: data,
    isAvailable, // New: indicates if the feature is available
  }
}

/**
 * Get vault guardians list and threshold
 */
export function useVaultGuardians(vaultAddress?: `0x${string}`) {
  const { data: guardianCount } = useReadContract({
    address: CONTRACT_ADDRESSES.GuardianRegistry,
    abi: [{
      name: 'guardianCount',
      type: 'function',
      stateMutability: 'view',
      inputs: [{ name: 'vault', type: 'address' }],
      outputs: [{ name: 'count', type: 'uint8' }],
    }],
    functionName: 'guardianCount',
    args: vaultAddress ? [vaultAddress] : undefined,
    query: {
      enabled: !!vaultAddress && !!CONTRACT_ADDRESSES.GuardianRegistry,
    }
  })
  
  const { data: threshold } = useReadContract({
    address: CONTRACT_ADDRESSES.GuardianRegistry,
    abi: [{
      name: 'guardiansNeeded',
      type: 'function',
      stateMutability: 'view',
      inputs: [{ name: 'vault', type: 'address' }],
      outputs: [{ name: 'needed', type: 'uint8' }],
    }],
    functionName: 'guardiansNeeded',
    args: vaultAddress ? [vaultAddress] : undefined,
    query: {
      enabled: !!vaultAddress && !!CONTRACT_ADDRESSES.GuardianRegistry,
    }
  })
  
  return {
    guardianCount: guardianCount ? Number(guardianCount) : 0,
    threshold: threshold ? Number(threshold) : 0,
  }
}

/**
 * Check if address is guardian for vault
 */
export function useIsGuardian(vaultAddress?: `0x${string}`, guardianAddress?: `0x${string}`) {
  const { data: isGuardian } = useReadContract({
    address: CONTRACT_ADDRESSES.GuardianRegistry,
    abi: [{
      name: 'isGuardian',
      type: 'function',
      stateMutability: 'view',
      inputs: [
        { name: 'vault', type: 'address' },
        { name: 'guardian', type: 'address' }
      ],
      outputs: [{ name: 'is', type: 'bool' }],
    }],
    functionName: 'isGuardian',
    args: vaultAddress && guardianAddress ? [vaultAddress, guardianAddress] : undefined,
    query: {
      enabled: !!vaultAddress && !!guardianAddress && !!CONTRACT_ADDRESSES.GuardianRegistry,
    }
  })
  
  return isGuardian || false
}

/**
 * Get guardian lock status and approval count
 */
export function useGuardianLockStatus(vaultAddress?: `0x${string}`) {
  const { data: locked } = useReadContract({
    address: CONTRACT_ADDRESSES.GuardianLock,
    abi: [{
      name: 'locked',
      type: 'function',
      stateMutability: 'view',
      inputs: [{ name: 'vault', type: 'address' }],
      outputs: [{ name: 'is', type: 'bool' }],
    }],
    functionName: 'locked',
    args: vaultAddress ? [vaultAddress] : undefined,
    query: {
      enabled: !!vaultAddress && !!CONTRACT_ADDRESSES.GuardianLock,
    }
  })
  
  const { data: approvals } = useReadContract({
    address: CONTRACT_ADDRESSES.GuardianLock,
    abi: [{
      name: 'approvals',
      type: 'function',
      stateMutability: 'view',
      inputs: [{ name: 'vault', type: 'address' }],
      outputs: [{ name: 'count', type: 'uint8' }],
    }],
    functionName: 'approvals',
    args: vaultAddress ? [vaultAddress] : undefined,
    query: {
      enabled: !!vaultAddress && !!CONTRACT_ADDRESSES.GuardianLock,
    }
  })
  
  return {
    isLocked: locked || false,
    approvals: approvals ? Number(approvals) : 0,
  }
}

/**
 * Cast guardian lock vote
 */
export function useCastGuardianLock(vaultAddress: `0x${string}`) {
  const { writeContract, data, isPending } = useWriteContract()
  
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash: data,
  })
  
  const castLock = (reason: string = 'Security concern') => {
    writeContract({
      address: CONTRACT_ADDRESSES.GuardianLock,
      abi: [{
        name: 'castLock',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [
          { name: 'vault', type: 'address' },
          { name: 'reason', type: 'string' }
        ],
        outputs: [],
      }],
      functionName: 'castLock',
      args: [vaultAddress, reason],
    })
  }
  
  return {
    castLock,
    isCasting: isPending || isConfirming,
    isSuccess,
    txHash: data,
  }
}

/**
 * Check global emergency breaker status
 */
export function useEmergencyStatus() {
  const { data: halted, refetch } = useReadContract({
    address: CONTRACT_ADDRESSES.EmergencyBreaker,
    abi: [{
      name: 'halted',
      type: 'function',
      stateMutability: 'view',
      inputs: [],
      outputs: [{ name: 'is', type: 'bool' }],
    }],
    functionName: 'halted',
    query: {
      enabled: !!CONTRACT_ADDRESSES.EmergencyBreaker,
      refetchInterval: 10000, // Check every 10 seconds
    }
  })
  
  const { data: globalRisk } = useReadContract({
    address: CONTRACT_ADDRESSES.PanicGuard,
    abi: [{
      name: 'globalRisk',
      type: 'function',
      stateMutability: 'view',
      inputs: [],
      outputs: [{ name: 'is', type: 'bool' }],
    }],
    functionName: 'globalRisk',
    query: {
      enabled: !!CONTRACT_ADDRESSES.PanicGuard,
      refetchInterval: 10000,
    }
  })
  
  return {
    isHalted: halted || false,
    isGlobalRisk: globalRisk || false,
    isEmergency: halted || globalRisk || false,
    refetch,
  }
}

// ============================================================================
// VAULT MANAGEMENT HOOKS (VaultInfrastructure.sol enhancements)
// ============================================================================

/**
 * Get vault's guardian info with maturity status
 */
export function useVaultGuardiansDetailed(vaultAddress?: `0x${string}`) {
  const { data: guardianCount } = useReadContract({
    address: vaultAddress,
    abi: [{
      name: 'guardianCount',
      type: 'function',
      stateMutability: 'view',
      inputs: [],
      outputs: [{ name: '', type: 'uint8' }],
    }],
    functionName: 'guardianCount',
    query: {
      enabled: !!vaultAddress,
    }
  })

  return {
    guardianCount: guardianCount || 0,
  }
}

/**
 * Check if guardian is mature (past 7-day maturity period)
 */
export function useIsGuardianMature(vaultAddress?: `0x${string}`, guardianAddress?: `0x${string}`) {
  const { data: isMature } = useReadContract({
    address: vaultAddress,
    abi: [{
      name: 'isGuardianMature',
      type: 'function',
      stateMutability: 'view',
      inputs: [{ name: 'g', type: 'address' }],
      outputs: [{ name: '', type: 'bool' }],
    }],
    functionName: 'isGuardianMature',
    args: guardianAddress ? [guardianAddress] : undefined,
    query: {
      enabled: !!vaultAddress && !!guardianAddress,
    }
  })

  return {
    isMature: isMature || false,
  }
}

/**
 * Add or remove guardian (handles UV_RecoveryActive error)
 */
export function useSetGuardian(vaultAddress: `0x${string}`) {
  const { writeContractAsync } = useWriteContract()
  const [txHash, setTxHash] = useState<`0x${string}` | null>(null)
  const [error, setError] = useState<string | null>(null)

  const { isSuccess, isLoading } = useWaitForTransactionReceipt({
    hash: txHash || undefined,
  })

  const setGuardian = async (guardianAddress: `0x${string}`, active: boolean) => {
    setError(null)
    try {
      const hash = await writeContractAsync({
        address: vaultAddress,
        abi: [{
          name: 'setGuardian',
          type: 'function',
          stateMutability: 'nonpayable',
          inputs: [
            { name: 'g', type: 'address' },
            { name: 'active', type: 'bool' }
          ],
          outputs: [],
        }],
        functionName: 'setGuardian',
        args: [guardianAddress, active],
      })
      setTxHash(hash)
      return { success: true, txHash: hash }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Transaction failed'
      if (errorMsg.includes('UV_RecoveryActive')) {
        setError('Cannot remove guardians during active recovery')
      } else if (errorMsg.includes('UV_Locked')) {
        setError('Vault is currently locked')
      } else {
        setError(errorMsg)
      }
      return { success: false, error: errorMsg }
    }
  }

  return {
    setGuardian,
    txHash,
    isSuccess,
    isLoading,
    error,
  }
}

/**
 * Get abnormal transaction threshold (dynamic based on settings)
 */
export function useAbnormalTransactionThreshold(vaultAddress?: `0x${string}`) {
  const { data: threshold } = useReadContract({
    address: vaultAddress,
    abi: [{
      name: 'getAbnormalTransactionThreshold',
      type: 'function',
      stateMutability: 'view',
      inputs: [],
      outputs: [{ name: '', type: 'uint256' }],
    }],
    functionName: 'getAbnormalTransactionThreshold',
    query: {
      enabled: !!vaultAddress,
    }
  })

  const { data: usePercentage } = useReadContract({
    address: vaultAddress,
    abi: [{
      name: 'usePercentageThreshold',
      type: 'function',
      stateMutability: 'view',
      inputs: [],
      outputs: [{ name: '', type: 'bool' }],
    }],
    functionName: 'usePercentageThreshold',
    query: {
      enabled: !!vaultAddress,
    }
  })

  const { data: percentageBps } = useReadContract({
    address: vaultAddress,
    abi: [{
      name: 'abnormalTransactionPercentageBps',
      type: 'function',
      stateMutability: 'view',
      inputs: [],
      outputs: [{ name: '', type: 'uint16' }],
    }],
    functionName: 'abnormalTransactionPercentageBps',
    query: {
      enabled: !!vaultAddress,
    }
  })

  return {
    threshold: threshold || 0n,
    usePercentage: usePercentage || false,
    percentageBps: percentageBps || 0,
  }
}

/**
 * Set balance snapshot mode for abnormal transaction detection
 */
export function useSetBalanceSnapshotMode(vaultAddress: `0x${string}`) {
  const { writeContractAsync } = useWriteContract()
  const [txHash, setTxHash] = useState<`0x${string}` | null>(null)

  const { isSuccess, isLoading } = useWaitForTransactionReceipt({
    hash: txHash || undefined,
  })

  const setSnapshotMode = async (useSnapshot: boolean) => {
    try {
      const hash = await writeContractAsync({
        address: vaultAddress,
        abi: [{
          name: 'setBalanceSnapshotMode',
          type: 'function',
          stateMutability: 'nonpayable',
          inputs: [{ name: '_useSnapshot', type: 'bool' }],
          outputs: [],
        }],
        functionName: 'setBalanceSnapshotMode',
        args: [useSnapshot],
      })
      setTxHash(hash)
      return { success: true, txHash: hash }
    } catch (err: unknown) {
      return { success: false, error: err instanceof Error ? err.message : 'Transaction failed' }
    }
  }

  return {
    setSnapshotMode,
    txHash,
    isSuccess,
    isLoading,
  }
}

/**
 * Update balance snapshot
 */
export function useUpdateBalanceSnapshot(vaultAddress: `0x${string}`) {
  const { writeContractAsync } = useWriteContract()
  const [txHash, setTxHash] = useState<`0x${string}` | null>(null)

  const { isSuccess, isLoading } = useWaitForTransactionReceipt({
    hash: txHash || undefined,
  })

  const updateSnapshot = async () => {
    try {
      const hash = await writeContractAsync({
        address: vaultAddress,
        abi: [{
          name: 'updateBalanceSnapshot',
          type: 'function',
          stateMutability: 'nonpayable',
          inputs: [],
          outputs: [],
        }],
        functionName: 'updateBalanceSnapshot',
      })
      setTxHash(hash)
      return { success: true, txHash: hash }
    } catch (err: unknown) {
      return { success: false, error: err instanceof Error ? err.message : 'Transaction failed' }
    }
  }

  return {
    updateSnapshot,
    txHash,
    isSuccess,
    isLoading,
  }
}

/**
 * Get balance snapshot info
 */
export function useBalanceSnapshot(vaultAddress?: `0x${string}`) {
  const { data: useSnapshot } = useReadContract({
    address: vaultAddress,
    abi: [{
      name: 'useBalanceSnapshot',
      type: 'function',
      stateMutability: 'view',
      inputs: [],
      outputs: [{ name: '', type: 'bool' }],
    }],
    functionName: 'useBalanceSnapshot',
    query: {
      enabled: !!vaultAddress,
    }
  })

  const { data: snapshot } = useReadContract({
    address: vaultAddress,
    abi: [{
      name: 'balanceSnapshot',
      type: 'function',
      stateMutability: 'view',
      inputs: [],
      outputs: [{ name: '', type: 'uint256' }],
    }],
    functionName: 'balanceSnapshot',
    query: {
      enabled: !!vaultAddress,
    }
  })

  return {
    useSnapshot: useSnapshot || false,
    snapshot: snapshot || 0n,
  }
}

/**
 * Get pending transaction details
 */
export function usePendingTransaction(vaultAddress?: `0x${string}`, txId?: number) {
  const { data: pendingTx } = useReadContract({
    address: vaultAddress,
    abi: [{
      name: 'pendingTransactions',
      type: 'function',
      stateMutability: 'view',
      inputs: [{ name: 'txId', type: 'uint256' }],
      outputs: [
        { name: 'toVault', type: 'address' },
        { name: 'amount', type: 'uint256' },
        { name: 'requestTime', type: 'uint64' },
        { name: 'approved', type: 'bool' },
        { name: 'executed', type: 'bool' }
      ],
    }],
    functionName: 'pendingTransactions',
    args: txId !== undefined ? [BigInt(txId)] : undefined,
    query: {
      enabled: !!vaultAddress && txId !== undefined,
    }
  })

  const { data: pendingTxCount } = useReadContract({
    address: vaultAddress,
    abi: [{
      name: 'pendingTxCount',
      type: 'function',
      stateMutability: 'view',
      inputs: [],
      outputs: [{ name: '', type: 'uint256' }],
    }],
    functionName: 'pendingTxCount',
    query: {
      enabled: !!vaultAddress,
    }
  })

  return {
    pendingTx: pendingTx ? {
      toVault: pendingTx[0],
      amount: pendingTx[1],
      requestTime: pendingTx[2],
      approved: pendingTx[3],
      executed: pendingTx[4],
    } : null,
    pendingTxCount: pendingTxCount || 0n,
  }
}

/**
 * Approve pending abnormal transaction
 */
export function useApprovePendingTransaction(vaultAddress: `0x${string}`) {
  const { writeContractAsync } = useWriteContract()
  const [txHash, setTxHash] = useState<`0x${string}` | null>(null)

  const { isSuccess, isLoading } = useWaitForTransactionReceipt({
    hash: txHash || undefined,
  })

  const approve = async (txId: number) => {
    try {
      const hash = await writeContractAsync({
        address: vaultAddress,
        abi: [{
          name: 'approvePendingTransaction',
          type: 'function',
          stateMutability: 'nonpayable',
          inputs: [{ name: 'txId', type: 'uint256' }],
          outputs: [],
        }],
        functionName: 'approvePendingTransaction',
        args: [BigInt(txId)],
      })
      setTxHash(hash)
      return { success: true, txHash: hash }
    } catch (err: unknown) {
      return { success: false, error: err instanceof Error ? err.message : 'Transaction failed' }
    }
  }

  return {
    approve,
    txHash,
    isSuccess,
    isLoading,
  }
}

/**
 * Execute approved pending transaction
 */
export function useExecutePendingTransaction(vaultAddress: `0x${string}`) {
  const { writeContractAsync } = useWriteContract()
  const [txHash, setTxHash] = useState<`0x${string}` | null>(null)

  const { isSuccess, isLoading } = useWaitForTransactionReceipt({
    hash: txHash || undefined,
  })

  const execute = async (txId: number) => {
    try {
      const hash = await writeContractAsync({
        address: vaultAddress,
        abi: [{
          name: 'executePendingTransaction',
          type: 'function',
          stateMutability: 'nonpayable',
          inputs: [{ name: 'txId', type: 'uint256' }],
          outputs: [],
        }],
        functionName: 'executePendingTransaction',
        args: [BigInt(txId)],
      })
      setTxHash(hash)
      return { success: true, txHash: hash }
    } catch (err: unknown) {
      return { success: false, error: err instanceof Error ? err.message : 'Transaction failed' }
    }
  }

  return {
    execute,
    txHash,
    isSuccess,
    isLoading,
  }
}

/**
 * Cleanup expired pending transaction
 */
export function useCleanupExpiredTransaction(vaultAddress: `0x${string}`) {
  const { writeContractAsync } = useWriteContract()
  const [txHash, setTxHash] = useState<`0x${string}` | null>(null)

  const { isSuccess, isLoading } = useWaitForTransactionReceipt({
    hash: txHash || undefined,
  })

  const cleanup = async (txId: number) => {
    try {
      const hash = await writeContractAsync({
        address: vaultAddress,
        abi: [{
          name: 'cleanupExpiredTransaction',
          type: 'function',
          stateMutability: 'nonpayable',
          inputs: [{ name: 'txId', type: 'uint256' }],
          outputs: [],
        }],
        functionName: 'cleanupExpiredTransaction',
        args: [BigInt(txId)],
      })
      setTxHash(hash)
      return { success: true, txHash: hash }
    } catch (err: unknown) {
      return { success: false, error: err instanceof Error ? err.message : 'Transaction failed' }
    }
  }

  return {
    cleanup,
    txHash,
    isSuccess,
    isLoading,
  }
}

/**
 * Guardian votes to cancel fraudulent inheritance request
 */
export function useGuardianCancelInheritance(vaultAddress: `0x${string}`) {
  const { writeContractAsync } = useWriteContract()
  const [txHash, setTxHash] = useState<`0x${string}` | null>(null)

  const { isSuccess, isLoading } = useWaitForTransactionReceipt({
    hash: txHash || undefined,
  })

  const cancelInheritance = async () => {
    try {
      const hash = await writeContractAsync({
        address: vaultAddress,
        abi: [{
          name: 'guardianCancelInheritance',
          type: 'function',
          stateMutability: 'nonpayable',
          inputs: [],
          outputs: [],
        }],
        functionName: 'guardianCancelInheritance',
      })
      setTxHash(hash)
      return { success: true, txHash: hash }
    } catch (err: unknown) {
      return { success: false, error: err instanceof Error ? err.message : 'Transaction failed' }
    }
  }

  return {
    cancelInheritance,
    txHash,
    isSuccess,
    isLoading,
  }
}

/**
 * Get inheritance request status with cancellation tracking
 */
export function useInheritanceStatus(vaultAddress?: `0x${string}`) {
  const { data: nextOfKin } = useReadContract({
    address: vaultAddress,
    abi: [{
      name: 'nextOfKin',
      type: 'function',
      stateMutability: 'view',
      inputs: [],
      outputs: [{ name: '', type: 'address' }],
    }],
    functionName: 'nextOfKin',
    query: {
      enabled: !!vaultAddress,
    }
  })

  return {
    nextOfKin: nextOfKin || '0x0000000000000000000000000000000000000000',
    hasNextOfKin: nextOfKin !== '0x0000000000000000000000000000000000000000',
  }
}

"use client";

import { GlobalNav } from "@/components/layout/GlobalNav";
import { Footer } from "@/components/layout/Footer";
import { useState } from "react";
import { motion } from "framer-motion";
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract, useBalance } from "wagmi";
import { parseUnits, formatUnits, isAddress } from "viem";
import { Loader2, CheckCircle, Wallet } from "lucide-react";

// VFIDEPresale ABI
const PRESALE_ABI = [
  {
    name: 'buyWithStable',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'stablecoin', type: 'address' },
      { name: 'amount', type: 'uint256' },
      { name: 'tier', type: 'uint8' },
      { name: 'lockPeriod', type: 'uint256' }
    ],
    outputs: []
  },
  {
    name: 'buyWithStableReferral',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'stablecoin', type: 'address' },
      { name: 'amount', type: 'uint256' },
      { name: 'tier', type: 'uint8' },
      { name: 'lockPeriod', type: 'uint256' },
      { name: 'referrer', type: 'address' }
    ],
    outputs: []
  },
  {
    name: 'buyTokens',
    type: 'function',
    stateMutability: 'payable',
    inputs: [{ name: 'lockPeriod', type: 'uint256' }],
    outputs: []
  },
  {
    name: 'buyTokensWithReferral',
    type: 'function',
    stateMutability: 'payable',
    inputs: [
      { name: 'lockPeriod', type: 'uint256' },
      { name: 'referrer', type: 'address' }
    ],
    outputs: []
  },
  {
    name: 'getTierRemaining',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'tier', type: 'uint8' }],
    outputs: [{ type: 'uint256' }]
  },
  {
    name: 'getTierPrice',
    type: 'function',
    stateMutability: 'pure',
    inputs: [{ name: 'tier', type: 'uint8' }],
    outputs: [{ type: 'uint256' }]
  },
  {
    name: 'isTierAvailable',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'tier', type: 'uint8' }],
    outputs: [{ type: 'bool' }]
  },
  {
    name: 'calculateTokensFromUsdTier',
    type: 'function',
    stateMutability: 'pure',
    inputs: [
      { name: 'usdAmount', type: 'uint256' },
      { name: 'tier', type: 'uint8' }
    ],
    outputs: [{ type: 'uint256' }]
  },
  {
    name: 'getUserInfo',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'user', type: 'address' }],
    outputs: [
      { name: 'totalPurchased', type: 'uint256' },
      { name: 'totalClaimed', type: 'uint256' },
      { name: 'referralBonus', type: 'uint256' },
      { name: 'purchaseCount', type: 'uint256' }
    ]
  },
  {
    name: 'claimAll',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [],
    outputs: []
  },
  {
    name: 'claimReferralBonus',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [],
    outputs: []
  }
] as const;

// ERC20 approve ABI
const ERC20_ABI = [
  {
    name: 'approve',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' }
    ],
    outputs: [{ type: 'bool' }]
  },
  {
    name: 'allowance',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' }
    ],
    outputs: [{ type: 'uint256' }]
  }
] as const;

// Contract addresses from environment
const PRESALE_ADDRESS = (process.env.NEXT_PUBLIC_VFIDE_PRESALE_ADDRESS || '0x338926cd13aAA99da8e846732e8010b16d1369ea') as `0x${string}`;
// Note: USDC/USDT are not available on zkSync Sepolia testnet
// Users must use ETH for testnet purchases
const STABLECOINS_AVAILABLE = false; // Set to true when stablecoins are deployed

// Tier mapping: 0 = Founding, 1 = Oath, 2 = Public
const TIER_MAP = { founding: 0, oath: 1, public: 2 } as const;
const LOCK_PERIODS = { founding: 180 * 24 * 3600, oath: 90 * 24 * 3600, public: 0 } as const;

export default function TokenLaunchPage() {
  const { address, isConnected } = useAccount();
  const [selectedTier, setSelectedTier] = useState<"founding" | "oath" | "public" | null>(null);
  const [amount, setAmount] = useState("");
  const [referralCode, setReferralCode] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<'usdc' | 'usdt' | 'eth'>('eth');
  
  // Contract write hooks
  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });
  
  // Approval hooks
  const { writeContract: writeApprove, data: approveHash, isPending: isApprovePending } = useWriteContract();
  const { isLoading: isApproveConfirming, isSuccess: isApproveSuccess } = useWaitForTransactionReceipt({ hash: approveHash });

  // Read tier availability
  const { data: foundingRemaining } = useReadContract({
    address: PRESALE_ADDRESS,
    abi: PRESALE_ABI,
    functionName: 'getTierRemaining',
    args: [0],
  });

  const { data: oathRemaining } = useReadContract({
    address: PRESALE_ADDRESS,
    abi: PRESALE_ABI,
    functionName: 'getTierRemaining',
    args: [1],
  });

  const { data: publicRemaining } = useReadContract({
    address: PRESALE_ADDRESS,
    abi: PRESALE_ABI,
    functionName: 'getTierRemaining',
    args: [2],
  });

  // Read user info
  const { data: userInfo } = useReadContract({
    address: PRESALE_ADDRESS,
    abi: PRESALE_ABI,
    functionName: 'getUserInfo',
    args: address ? [address] : undefined,
  });

  // Stablecoin allowance - disabled on testnet since no stablecoins available
  // This will be enabled when USDC/USDT are deployed on mainnet
  const { data: allowance } = useReadContract({
    address: PRESALE_ADDRESS, // Placeholder - won't be used since stablecoins disabled
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: address ? [address, PRESALE_ADDRESS] : undefined,
    query: {
      enabled: STABLECOINS_AVAILABLE && paymentMethod !== 'eth',
    }
  });

  // Handle approve - only for stablecoins (disabled on testnet)
  const handleApprove = () => {
    if (!STABLECOINS_AVAILABLE) return;
    const usdAmount = calculateTotal();
    const amountWithBuffer = parseUnits((usdAmount * 1.01).toFixed(6), 6); // 1% buffer for rounding
    writeApprove({
      address: PRESALE_ADDRESS, // Will be replaced with actual stablecoin address
      abi: ERC20_ABI,
      functionName: 'approve',
      args: [PRESALE_ADDRESS, amountWithBuffer],
    });
  };

  // Handle purchase
  const handlePurchase = () => {
    if (!selectedTier || !amount) return;
    
    const tier = TIER_MAP[selectedTier];
    const lockPeriod = BigInt(LOCK_PERIODS[selectedTier]);
    const usdAmount = calculateTotal();
    const stableAmount = parseUnits(usdAmount.toFixed(6), 6);
    const hasReferrer = referralCode && isAddress(referralCode);
    
    // Only ETH payments are available on testnet
    // Stablecoin payments will be enabled on mainnet
    if (paymentMethod === 'eth' || !STABLECOINS_AVAILABLE) {
      // ETH payments require oracle price feed integration
      // Currently using placeholder value - production will use Chainlink price feeds
      if (hasReferrer) {
        writeContract({
          address: PRESALE_ADDRESS,
          abi: PRESALE_ABI,
          functionName: 'buyTokensWithReferral',
          args: [lockPeriod, referralCode as `0x${string}`],
          value: parseUnits('0.01', 18), // Placeholder - needs oracle
        });
      } else {
        writeContract({
          address: PRESALE_ADDRESS,
          abi: PRESALE_ABI,
          functionName: 'buyTokens',
          args: [lockPeriod],
          value: parseUnits('0.01', 18), // Placeholder - needs oracle
        });
      }
    } else {
      // Stablecoin payments - disabled on testnet
      // This code path is kept for mainnet deployment
      const stablecoinPlaceholder = PRESALE_ADDRESS; // Will be replaced with actual USDC/USDT address
      if (hasReferrer) {
        writeContract({
          address: PRESALE_ADDRESS,
          abi: PRESALE_ABI,
          functionName: 'buyWithStableReferral',
          args: [stablecoinPlaceholder, stableAmount, tier, lockPeriod, referralCode as `0x${string}`],
        });
      } else {
        writeContract({
          address: PRESALE_ADDRESS,
          abi: PRESALE_ABI,
          functionName: 'buyWithStable',
          args: [stablecoinPlaceholder, stableAmount, tier, lockPeriod],
        });
      }
    }
  };
  
  // Legal acknowledgment checkboxes
  const [acknowledgments, setAcknowledgments] = useState({
    readTerms: false,
    utilityToken: false,
    noInvestment: false,
    activeParticipation: false,
    totalLossRisk: false,
    noGuarantee: false,
    notPassiveIncome: false,
    taxResponsibility: false,
    notFinancialAdvice: false,
    canAffordLoss: false,
  });

  const allAcknowledged = Object.values(acknowledgments).every(v => v);

  const tiers = {
    founding: {
      name: "Founding",
      price: 0.03,
      priceDisplay: "$0.03",
      commitment: "180 days (mandatory)",
      immediateUnlock: "10%",
      supply: "10,000,000 VFIDE",
      maxPurchase: "500,000 VFIDE",
      color: "#FFD700",
      features: [
        "180-day lock required (10% immediate, 90% locked)",
        "Best price: 2.33x value vs Public tier",
        "Early supporter recognition",
        "No processor fees (burn + gas apply)",
        "ProofScore reputation building",
        "+2% buyer referral bonus + 3% referrer bonus"
      ]
    },
    oath: {
      name: "Oath",
      price: 0.05,
      priceDisplay: "$0.05",
      commitment: "90 days (mandatory)",
      immediateUnlock: "20%",
      supply: "10,000,000 VFIDE",
      maxPurchase: "500,000 VFIDE",
      color: "#00F0FF",
      features: [
        "90-day lock required (20% immediate, 80% locked)",
        "1.4x value vs Public tier",
        "Priority governance access",
        "No processor fees (burn + gas apply)",
        "ProofScore reputation building",
        "+2% buyer referral bonus + 3% referrer bonus"
      ]
    },
    public: {
      name: "Public",
      price: 0.07,
      priceDisplay: "$0.07",
      commitment: "Optional",
      immediateUnlock: "Varies",
      supply: "15,000,000 VFIDE",
      maxPurchase: "500,000 VFIDE",
      color: "#0080FF",
      features: [
        "No lock required (or optional lock for bonus)",
        "180-day lock: +30% bonus (10% immediate)",
        "90-day lock: +15% bonus (20% immediate)",
        "No lock: 100% immediate, 0% bonus",
        "No processor fees (burn + gas apply)",
        "+2% buyer referral bonus + 3% referrer bonus"
      ]
    }
  };

  const handleCheckboxChange = (key: keyof typeof acknowledgments) => {
    setAcknowledgments(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const calculateTotal = () => {
    if (!selectedTier || !amount) return 0;
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount)) return 0;
    return numAmount * tiers[selectedTier].price;
  };

  const needsApproval = paymentMethod !== 'eth' && allowance !== undefined && 
    calculateTotal() > 0 && allowance < parseUnits(calculateTotal().toFixed(6), 6);

  return (
    <>
      <GlobalNav />
      
      <main className="min-h-screen bg-[#1A1A1D] pt-20">
        {/* Hero Header */}
        <section className="py-16 bg-gradient-to-b from-[#2A2A2F] to-[#1A1A1D] border-b border-[#3A3A3F]">
          <div className="container mx-auto px-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center max-w-4xl mx-auto"
            >
              <h1 className="text-5xl md:text-6xl font-[family-name:var(--font-display)] font-bold text-[#F5F3E8] mb-4">
                Join VFIDE Governance
              </h1>
              <p className="text-xl md:text-2xl text-[#00F0FF] font-[family-name:var(--font-body)] mb-6">
                Participate in DAO Governance • No Processor Fees* • Protocol Development
              </p>
              <p className="text-lg text-[#A0A0A5] max-w-2xl mx-auto mb-8">
                VFIDE tokens grant voting rights, payment network access, and protocol participation.
                Three tiers available based on your commitment level and desired governance influence.
              </p>

              {/* Referral Program Highlight */}
              <div className="bg-gradient-to-r from-[#00F0FF]/10 to-[#0080FF]/10 border-2 border-[#00F0FF] rounded-xl p-6">
                <div className="flex items-center justify-center gap-3 mb-3">
                  <div className="text-3xl">🎁</div>
                  <h3 className="text-2xl font-bold text-[#00F0FF]">Referral Rewards Active</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-center">
                  <div className="bg-[#1A1A1D]/50 rounded-lg p-4">
                    <div className="text-3xl font-bold text-[#00F0FF] mb-1">+2%</div>
                    <div className="text-[#F5F3E8] font-bold mb-1">Buyer Bonus</div>
                    <div className="text-sm text-[#A0A0A5]">Use a referral code when purchasing</div>
                  </div>
                  <div className="bg-[#1A1A1D]/50 rounded-lg p-4">
                    <div className="text-3xl font-bold text-[#00F0FF] mb-1">+3%</div>
                    <div className="text-[#F5F3E8] font-bold mb-1">Referrer Reward</div>
                    <div className="text-sm text-[#A0A0A5]">Share your address to earn</div>
                  </div>
                </div>
                <p className="text-sm text-[#A0A0A5] mt-4">
                  Bonuses paid instantly in VFIDE tokens • No limit on referrals • Multi-level structure
                </p>
              </div>

              {/* Clean Legal Notice */}
              <div className="mt-6 bg-[#2A2A2F]/50 border border-[#3A3A3F] rounded-lg p-4">
                <p className="text-sm text-[#A0A0A5] leading-relaxed">
                  <strong className="text-[#F5F3E8]">Utility Token Notice:</strong> VFIDE tokens provide governance and payment utility. 
                  Not an investment contract. Token value may fluctuate. Purchase only if you plan to participate in governance or payments. 
                  See <a href="/legal" className="text-[#00F0FF] hover:underline">full terms</a>.
                </p>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Tier Selection */}
        <section className="py-16">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-[family-name:var(--font-display)] font-bold text-center text-[#F5F3E8] mb-4">
              Step 1: Select Your Commitment Tier
            </h2>
            <p className="text-center text-[#A0A0A5] mb-12 max-w-3xl mx-auto">
              Different tiers offer different utility characteristics. Longer commitment = lower price + higher voting power.
              All tiers provide immediate governance and payment access.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
              {Object.entries(tiers).map(([key, tier]) => (
                <motion.div
                  key={key}
                  whileHover={{ scale: 1.02 }}
                  onClick={() => setSelectedTier(key as "founding" | "oath" | "public")}
                  className={`relative cursor-pointer bg-[#2A2A2F] border-2 rounded-xl p-8 pt-10 transition-all ${
                    selectedTier === key 
                      ? 'border-[#00F0FF] shadow-lg shadow-[#00F0FF]/20' 
                      : 'border-[#3A3A3F] hover:border-[#4A4A4F]'
                  }`}
                  style={selectedTier === key ? { borderColor: tier.color, boxShadow: `0 0 30px ${tier.color}40` } : undefined}
                >
                  {/* Most Popular badge shown on oath tier */}
                  {key === 'oath' && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-[#00F0FF] text-[#1A1A1D] rounded-full text-sm font-bold">
                      MOST POPULAR
                    </div>
                  )}
                  
                  <div className="text-center mb-6">
                    <h3 className="text-3xl font-[family-name:var(--font-display)] font-bold text-[#F5F3E8] mb-2">
                      {tier.name}
                    </h3>
                    <div className="text-5xl font-bold mb-2" style={{ color: tier.color }}>
                      {tier.priceDisplay}
                    </div>
                    <div className="text-[#A0A0A5] text-sm">per VFIDE token</div>
                  </div>

                  <div className="space-y-3 mb-6">
                    <div className="flex justify-between text-sm">
                      <span className="text-[#A0A0A5]">Commitment Period:</span>
                      <span className="text-[#F5F3E8] font-bold">{tier.commitment}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-[#A0A0A5]">Immediate Unlock:</span>
                      <span className="text-[#F5F3E8] font-bold">{tier.immediateUnlock}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-[#A0A0A5]">Max Purchase:</span>
                      <span className="text-[#F5F3E8] font-bold">{tier.maxPurchase}</span>
                    </div>
                  </div>

                  <div className="border-t border-[#3A3A3F] pt-4 mb-6">
                    <h4 className="text-sm font-bold text-[#F5F3E8] mb-3">Utility Features:</h4>
                    <ul className="space-y-2">
                      {tier.features.map((feature, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs text-[#A0A0A5]">
                          <span style={{ color: tier.color }}>✓</span>
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {selectedTier === key && (
                    <div className="bg-[#00F0FF] text-[#1A1A1D] text-center py-2 rounded-lg font-bold">
                      SELECTED
                    </div>
                  )}
                </motion.div>
              ))}
            </div>

            {/* Token Benefits */}
            <div className="mt-12 max-w-4xl mx-auto bg-[#2A2A2F] border border-[#00F0FF] rounded-xl p-8">
              <h3 className="text-2xl font-bold text-[#F5F3E8] mb-6 text-center">Token Holder Benefits</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="w-12 h-12 mx-auto mb-3 flex items-center justify-center bg-[#00F0FF]/10 rounded-lg">
                    <svg className="w-6 h-6 text-[#00F0FF]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
                  </div>
                  <h4 className="text-[#00F0FF] font-bold mb-2">Governance Rights</h4>
                  <p className="text-sm text-[#A0A0A5]">Vote on proposals, elect council members, influence treasury allocation</p>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 mx-auto mb-3 flex items-center justify-center bg-[#00F0FF]/10 rounded-lg">
                    <svg className="w-6 h-6 text-[#00F0FF]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
                  </div>
                  <h4 className="text-[#00F0FF] font-bold mb-2">Payment Access</h4>
                  <p className="text-sm text-[#A0A0A5]">Accept/make payments with no processor fees* (live in Phase 2)</p>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 mx-auto mb-3 flex items-center justify-center bg-[#00F0FF]/10 rounded-lg">
                    <svg className="w-6 h-6 text-[#00F0FF]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" /></svg>
                  </div>
                  <h4 className="text-[#00F0FF] font-bold mb-2">ProofScore Building</h4>
                  <p className="text-sm text-[#A0A0A5]">Build reputation for fee discounts and enhanced privileges</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Purchase Form */}
        {selectedTier && (
          <section className="py-16 bg-[#2A2A2F]">
            <div className="container mx-auto px-4">
              <div className="max-w-2xl mx-auto bg-[#1A1A1D] border border-[#3A3A3F] rounded-xl p-8">
                <h2 className="text-3xl font-[family-name:var(--font-display)] font-bold text-[#F5F3E8] mb-8 text-center">
                  Step 2: Enter Purchase Amount
                </h2>

                <div className="space-y-6">
                  <div>
                    <label className="block text-[#F5F3E8] font-bold mb-2">
                      Amount of VFIDE Tokens
                    </label>
                    <input
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="Enter amount (max 500,000)"
                      min="0"
                      max="500000"
                      step="1"
                      aria-label="VFIDE token amount"
                      aria-describedby="amount-hint"
                      className="w-full px-4 py-3 bg-[#2A2A2F] border border-[#3A3A3F] rounded-lg text-[#F5F3E8] focus:border-[#00F0FF] focus:outline-none"
                    />
                    <p id="amount-hint" className="text-xs text-[#A0A0A5] mt-2">
                      Maximum 500,000 VFIDE per address (including referral bonuses)
                    </p>
                  </div>

                  {/* Referral Code - Prominent */}
                  <div className="bg-gradient-to-r from-[#00F0FF]/10 to-[#0080FF]/10 border-2 border-[#00F0FF] rounded-xl p-6">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-2xl">🎁</span>
                      <label className="text-[#F5F3E8] font-bold text-lg">
                        Referral Code - Get +2% Bonus VFIDE
                      </label>
                    </div>
                    <input
                      type="text"
                      value={referralCode}
                      onChange={(e) => setReferralCode(e.target.value)}
                      placeholder="Enter referrer address (0x...)"
                      pattern="^0x[a-fA-F0-9]{40}$"
                      aria-label="Referral code address"
                      aria-describedby="referral-hint"
                      className="w-full px-4 py-3 bg-[#1A1A1D] border-2 border-[#00F0FF]/30 rounded-lg text-[#F5F3E8] focus:border-[#00F0FF] focus:outline-none"
                    />
                    <div className="mt-3 bg-[#1A1A1D]/50 rounded-lg p-3">
                      <div className="text-sm text-[#F5F3E8] font-bold mb-1">Referral Rewards:</div>
                      <div className="text-sm text-[#A0A0A5] space-y-1">
                        <div>• <span className="text-[#00F0FF]">You get:</span> +2% bonus VFIDE instantly</div>
                        <div>• <span className="text-[#00F0FF]">Referrer gets:</span> +3% VFIDE when you purchase</div>
                        <div>• <span className="text-[#00F0FF]">No limit:</span> Refer unlimited people, stack rewards</div>
                      </div>
                    </div>
                  </div>

                  {amount && parseFloat(amount) > 0 && (
                    <div className="bg-[#2A2A2F] border border-[#00F0FF] rounded-lg p-6">
                      <h3 className="text-xl font-bold text-[#F5F3E8] mb-4">Purchase Summary</h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-[#A0A0A5]">Tier:</span>
                          <span className="text-[#F5F3E8] font-bold">{tiers[selectedTier].name}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#A0A0A5]">VFIDE Amount:</span>
                          <span className="text-[#F5F3E8] font-bold">{parseFloat(amount).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#A0A0A5]">Price per VFIDE:</span>
                          <span className="text-[#F5F3E8] font-bold">{tiers[selectedTier].priceDisplay}</span>
                        </div>
                        {referralCode && (
                          <div className="flex justify-between text-[#00F0FF]">
                            <span>Referral Bonus (+2%):</span>
                            <span className="font-bold">+{(parseFloat(amount) * 0.02).toLocaleString()} VFIDE</span>
                          </div>
                        )}
                        <div className="border-t border-[#3A3A3F] pt-2 mt-2 flex justify-between text-lg">
                          <span className="text-[#F5F3E8] font-bold">Total Cost:</span>
                          <span className="text-[#00F0FF] font-bold">${calculateTotal().toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#F5F3E8] font-bold">Total VFIDE:</span>
                          <span className="text-[#00F0FF] font-bold">
                            {referralCode 
                              ? (parseFloat(amount) * 1.02).toLocaleString()
                              : parseFloat(amount).toLocaleString()
                            }
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Simplified Acknowledgments */}
        {selectedTier && amount && parseFloat(amount) > 0 && (
          <section className="py-16">
            <div className="container mx-auto px-4">
              <div className="max-w-3xl mx-auto bg-[#2A2A2F] border border-[#3A3A3F] rounded-xl p-8">
                <h2 className="text-3xl font-[family-name:var(--font-display)] font-bold text-[#F5F3E8] mb-4 text-center">
                  Step 3: Confirm Understanding
                </h2>
                <p className="text-center text-[#A0A0A5] mb-8">
                  Please confirm you understand these key points before purchasing.
                </p>

                <div className="space-y-3">
                  {[
                    { key: 'readTerms', label: 'I have read the Terms of Service' },
                    { key: 'utilityToken', label: 'I understand these are utility tokens for governance and payments' },
                    { key: 'noInvestment', label: 'I am purchasing to participate, not for investment returns' },
                    { key: 'activeParticipation', label: 'I plan to actively use tokens for governance or payments' },
                    { key: 'totalLossRisk', label: 'I understand token value may fluctuate and I could lose my purchase amount' },
                    { key: 'noGuarantee', label: 'I acknowledge there are no guarantees of profit or value retention' },
                    { key: 'notPassiveIncome', label: 'I understand tokens do not provide passive income or dividends' },
                    { key: 'taxResponsibility', label: 'I am responsible for any applicable taxes' },
                    { key: 'notFinancialAdvice', label: 'I am not relying on VFIDE for financial or tax advice' },
                    { key: 'canAffordLoss', label: 'I can afford this purchase amount' },
                  ].map(({ key, label }) => (
                    <label
                      key={key}
                      className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-all ${
                        acknowledgments[key as keyof typeof acknowledgments]
                          ? 'bg-[#00F0FF]/10 border border-[#00F0FF]'
                          : 'bg-[#1A1A1D] border border-[#3A3A3F] hover:border-[#4A4A4F]'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={acknowledgments[key as keyof typeof acknowledgments]}
                        onChange={() => handleCheckboxChange(key as keyof typeof acknowledgments)}
                        className="mt-1 w-4 h-4 accent-[#00F0FF]"
                      />
                      <span className="text-[#F5F3E8] text-sm">{label}</span>
                    </label>
                  ))}
                </div>

                {!allAcknowledged && (
                  <div className="mt-6 bg-[#00F0FF]/10 border border-[#00F0FF] rounded-lg p-4">
                    <p className="text-[#00F0FF] text-sm text-center">
                      ✓ Please confirm all items above to continue
                    </p>
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {/* Purchase Button */}
        {selectedTier && amount && parseFloat(amount) > 0 && (
          <section className="py-16 bg-[#2A2A2F]">
            <div className="container mx-auto px-4">
              <div className="max-w-2xl mx-auto">
                {/* Payment Method Selection */}
                <div className="bg-[#1A1A1D] border border-[#3A3A3F] rounded-xl p-6 mb-6">
                  <h3 className="text-lg font-bold text-[#F5F3E8] mb-4">Payment Method</h3>
                  
                  {/* Testnet Notice */}
                  <div className="bg-yellow-500/10 border border-yellow-500 rounded-lg p-3 mb-4">
                    <p className="text-yellow-400 text-sm text-center">
                      🧪 <strong>Testnet:</strong> Only ETH payments available. Get free test ETH from{' '}
                      <a href="https://www.alchemy.com/faucets/zksync-sepolia" target="_blank" rel="noopener noreferrer" className="underline">Alchemy Faucet</a>
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { id: 'usdc' as const, label: 'USDC', color: '#2775CA', disabled: !STABLECOINS_AVAILABLE },
                      { id: 'usdt' as const, label: 'USDT', color: '#26A17B', disabled: !STABLECOINS_AVAILABLE },
                      { id: 'eth' as const, label: 'ETH', color: '#627EEA', disabled: false },
                    ].map((method) => (
                      <button
                        key={method.id}
                        onClick={() => !method.disabled && setPaymentMethod(method.id)}
                        disabled={method.disabled}
                        className={`p-4 rounded-lg border-2 transition-all ${
                          method.disabled 
                            ? 'border-[#2A2A2F] bg-[#1A1A1D] opacity-50 cursor-not-allowed'
                            : paymentMethod === method.id
                              ? 'border-[#00F0FF] bg-[#00F0FF]/10'
                              : 'border-[#3A3A3F] hover:border-[#4A4A4F]'
                        }`}
                      >
                        <div className="text-lg font-bold text-[#F5F3E8]">{method.label}</div>
                        {method.disabled && <div className="text-xs text-[#707075]">Coming Soon</div>}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Connection / Purchase State */}
                <div className="text-center">
                  {!isConnected ? (
                    <div className="bg-[#1A1A1D] border border-[#3A3A3F] rounded-xl p-8">
                      <Wallet className="w-12 h-12 mx-auto mb-4 text-[#00F0FF]" />
                      <h3 className="text-xl font-bold text-[#F5F3E8] mb-2">Connect Wallet</h3>
                      <p className="text-[#A0A0A5] mb-4">Connect your wallet to purchase VFIDE tokens</p>
                      <button className="px-8 py-3 bg-[#00F0FF] hover:bg-[#00D4E0] text-[#0D0D0F] font-bold rounded-lg transition-colors">
                        Connect Wallet
                      </button>
                    </div>
                  ) : isSuccess ? (
                    <div className="bg-green-500/10 border border-green-500 rounded-xl p-8">
                      <CheckCircle className="w-16 h-16 mx-auto mb-4 text-green-400" />
                      <h3 className="text-2xl font-bold text-[#F5F3E8] mb-2">Purchase Successful!</h3>
                      <p className="text-[#A0A0A5]">
                        Your VFIDE tokens have been credited to your vault.
                      </p>
                    </div>
                  ) : (
                    <>
                      {/* Approval Button (for stablecoins) */}
                      {needsApproval && (
                        <button
                          onClick={handleApprove}
                          disabled={!allAcknowledged || isApprovePending || isApproveConfirming}
                          className={`w-full px-12 py-6 rounded-xl font-bold text-xl transition-all mb-4 ${
                            allAcknowledged
                              ? 'bg-gradient-to-r from-yellow-500 to-orange-500 text-white hover:scale-[1.02] cursor-pointer'
                              : 'bg-[#3A3A3F] text-[#707075] cursor-not-allowed'
                          }`}
                        >
                          {isApprovePending || isApproveConfirming ? (
                            <span className="flex items-center justify-center gap-2">
                              <Loader2 className="w-5 h-5 animate-spin" />
                              {isApprovePending ? 'Confirm in wallet...' : 'Approving...'}
                            </span>
                          ) : (
                            `Approve ${paymentMethod.toUpperCase()} Spending`
                          )}
                        </button>
                      )}

                      {/* Purchase Button */}
                      <button
                        onClick={handlePurchase}
                        disabled={!allAcknowledged || needsApproval || isPending || isConfirming}
                        className={`w-full px-12 py-6 rounded-xl font-bold text-xl transition-all ${
                          allAcknowledged && !needsApproval
                            ? 'bg-gradient-to-r from-[#00F0FF] to-[#0080FF] text-[#1A1A1D] hover:scale-[1.02] cursor-pointer shadow-[0_0_40px_rgba(0,240,255,0.4)]'
                            : 'bg-[#3A3A3F] text-[#707075] cursor-not-allowed'
                        }`}
                      >
                        {isPending || isConfirming ? (
                          <span className="flex items-center justify-center gap-2">
                            <Loader2 className="w-5 h-5 animate-spin" />
                            {isPending ? 'Confirm in wallet...' : 'Processing...'}
                          </span>
                        ) : needsApproval ? (
                          'Approve spending first'
                        ) : allAcknowledged ? (
                          `Complete Purchase - ${parseFloat(amount).toLocaleString()} VFIDE`
                        ) : (
                          'Confirm Understanding Above'
                        )}
                      </button>

                      {allAcknowledged && !needsApproval && (
                        <div className="mt-6 space-y-2">
                          <p className="text-lg text-[#F5F3E8]">
                            Total Cost: <span className="text-[#00F0FF] font-bold text-2xl">${calculateTotal().toFixed(2)}</span>
                          </p>
                          <p className="text-sm text-[#A0A0A5]">
                            Paying with {paymentMethod.toUpperCase()}
                          </p>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* FAQ Section */}
        <section className="py-16">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-[family-name:var(--font-display)] font-bold text-center text-[#F5F3E8] mb-12">
              Frequently Asked Questions
            </h2>

            <div className="max-w-4xl mx-auto space-y-6">
              {[
                {
                  q: "What are VFIDE tokens?",
                  a: "VFIDE tokens are utility tokens that grant voting rights in the DAO, access to payment networks with no processor fees (burn fees + gas apply), and protocol participation privileges. Tokens function as access keys to platform features, not investment instruments."
                },
                {
                  q: "Why purchase VFIDE tokens?",
                  a: "Purchase if you want to: Vote on protocol governance, accept/make payments without processor fees (burn + gas apply), build ProofScore reputation, participate in treasury decisions, or qualify for council elections. Tokens provide utility value through active participation."
                },
                {
                  q: "What are the different tiers?",
                  a: "Three tiers based on commitment and price: Founding ($0.03, 180-day mandatory lock, 10% immediate), Oath ($0.05, 90-day mandatory lock, 20% immediate), Public ($0.07, optional lock with bonuses). Better price = longer commitment. All tiers grant immediate governance access."
                },
                {
                  q: "What's the commitment period?",
                  a: "A time period where tokens are locked for external transfers but fully functional for governance and payments. During commitment you CAN: vote on proposals, use for payments (Phase 2), transfer between your own vaults. You CANNOT: transfer to other users or sell. Designed to align holder interests with protocol development."
                },
                {
                  q: "How do referral bonuses work?",
                  a: "Simple structure: When someone uses your address as referral code, you (referrer) get +3% VFIDE and they (buyer) get +2% VFIDE. Bonuses come from the bonus pool and are credited instantly. No limit on total referrals - stack rewards indefinitely."
                },
                {
                  q: "Can I get a refund?",
                  a: "No. All token purchases are final. Tokens are delivered immediately to your vault upon purchase. This is standard for blockchain transactions (immutable once confirmed)."
                },
                {
                  q: "What are the risks?",
                  a: "Token value may fluctuate based on market conditions. Potential risks include: price volatility, smart contract vulnerabilities, regulatory changes, protocol adoption rate, and general crypto market conditions. Only purchase amounts you're comfortable allocating to crypto participation."
                },
                {
                  q: "When can I use tokens for payments?",
                  a: "Governance voting is available immediately upon purchase. Merchant payment network (no processor fees, burn + gas apply) launches in Phase 2 (estimated Q1 2026). You can use tokens for governance participation and ProofScore building right away."
                },
              ].map((faq, i) => (
                <div key={i} className="bg-[#2A2A2F] border border-[#3A3A3F] rounded-xl p-6">
                  <h3 className="text-xl font-bold text-[#F5F3E8] mb-3">{faq.q}</h3>
                  <p className="text-[#A0A0A5] leading-relaxed">{faq.a}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Additional Information */}
        <section className="py-16 bg-[#2A2A2F]">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div className="bg-[#1A1A1D] border border-[#3A3A3F] rounded-xl p-6">
                  <h3 className="text-xl font-bold text-[#00F0FF] mb-3">Tokenomics</h3>
                  <ul className="space-y-2 text-sm text-[#A0A0A5]">
                    <li>• Total Supply: 200,000,000 VFIDE (fixed)</li>
                    <li>• Dev Reserve: 50,000,000 (25%, 36-month vesting)</li>
                    <li>• Presale: 50,000,000 (25%)</li>
                    <li>• Treasury/Operations: 100,000,000 (50%)</li>
                    <li>• Deflationary burn mechanism (0.25-5%)</li>
                    <li>• ProofScore-based fee discounts</li>
                  </ul>
                </div>
                <div className="bg-[#1A1A1D] border border-[#3A3A3F] rounded-xl p-6">
                  <h3 className="text-xl font-bold text-[#00F0FF] mb-3">Smart Contract</h3>
                  <ul className="space-y-2 text-sm text-[#A0A0A5]">
                    <li>• Third-party audit planned pre-mainnet</li>
                    <li>• Open source and verifiable</li>
                    <li>• Non-upgradeable core logic</li>
                    <li>• Community governance controls</li>
                  </ul>
                </div>
              </div>

              <div className="bg-[#1A1A1D] border border-[#3A3A3F] rounded-xl p-6 text-center">
                <p className="text-[#A0A0A5] text-sm leading-relaxed">
                  <strong className="text-[#F5F3E8]">Important:</strong> Cryptocurrency purchases involve risk. 
                  Token values may fluctuate. Only participate if you understand blockchain technology and can allocate 
                  funds for governance participation. Not financial advice - consult qualified professionals for investment guidance.
                  Read full <a href="/legal" className="text-[#00F0FF] hover:underline">Terms of Service</a> before purchasing.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}

"use client";

import { Footer } from "@/components/layout/Footer";
import { VFIDEPresaleABI, ERC20ABI } from "@/lib/abis";
import { useState } from "react";
import { motion } from "framer-motion";
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract, useGasPrice } from "wagmi";
import { parseUnits, isAddress, formatEther } from "viem";
import { Loader2, CheckCircle, Wallet, Fuel, Sparkles } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { safeParseFloat } from "@/lib/validation";

// Contract addresses from environment - Base Sepolia deployment
const PRESALE_ADDRESS = (process.env.NEXT_PUBLIC_VFIDE_PRESALE_ADDRESS || '0x89aefb047B6CB2bB302FE2734DDa452985eF1658') as `0x${string}`;
// Note: USDC/USDT are not available on Base Sepolia testnet
// Users must use ETH for testnet purchases
const STABLECOINS_AVAILABLE = false; // Set to true when stablecoins are deployed

// Tier mapping: 0 = Founding, 1 = Oath, 2 = Public
const TIER_MAP = { founding: 0, oath: 1, public: 2 } as const;
const LOCK_PERIODS = { founding: 180 * 24 * 3600, oath: 90 * 24 * 3600, public: 0 } as const;

export default function TokenLaunchPage() {
  const { address, isConnected } = useAccount();
  const { showToast } = useToast();
  const [selectedTier, setSelectedTier] = useState<"founding" | "oath" | "public" | null>(null);
  const [amount, setAmount] = useState("");
  const [referralCode, setReferralCode] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<'usdc' | 'usdt' | 'eth'>('eth');
  
  // Contract write hooks
  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });
  
  // Approval hooks
  const { writeContract: writeApprove, data: approveHash, isPending: isApprovePending } = useWriteContract();
  const { isLoading: isApproveConfirming, isSuccess: _isApproveSuccess } = useWaitForTransactionReceipt({ hash: approveHash });

  // Gas price for fee estimate
  const { data: gasPrice } = useGasPrice();
  const estimatedGas = BigInt(150000); // Typical presale tx gas
  const gasCostWei = gasPrice ? estimatedGas * gasPrice : BigInt(0);
  const gasCostEth = safeParseFloat(formatEther(gasCostWei), 0);
  const gasCostUsd = gasCostEth * 2500; // Rough ETH price

  // Read tier availability
  const { data: _foundingRemaining } = useReadContract({
    address: PRESALE_ADDRESS,
    abi: VFIDEPresaleABI,
    functionName: 'getTierRemaining',
    args: [0],
  });

  const { data: _oathRemaining } = useReadContract({
    address: PRESALE_ADDRESS,
    abi: VFIDEPresaleABI,
    functionName: 'getTierRemaining',
    args: [1],
  });

  const { data: _publicRemaining } = useReadContract({
    address: PRESALE_ADDRESS,
    abi: VFIDEPresaleABI,
    functionName: 'getTierRemaining',
    args: [2],
  });

  // Read user info
  const { data: _userInfo } = useReadContract({
    address: PRESALE_ADDRESS,
    abi: VFIDEPresaleABI,
    functionName: 'getUserInfo',
    args: address ? [address] : undefined,
  });

  // Stablecoin allowance - disabled on testnet since no stablecoins available
  // This will be enabled when USDC/USDT are deployed on mainnet
  const { data: allowance } = useReadContract({
    address: PRESALE_ADDRESS, // Placeholder - won't be used since stablecoins disabled
    abi: ERC20ABI,
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
      abi: ERC20ABI,
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
    
    // M-3 Fix: Block self-referral
    if (hasReferrer && referralCode.toLowerCase() === address?.toLowerCase()) {
      showToast("Cannot use your own address as referrer", "error");
      return;
    }
    
    // Only ETH payments are available on testnet
    // Stablecoin payments will be enabled on mainnet
    if (paymentMethod === 'eth' || !STABLECOINS_AVAILABLE) {
      // ETH payments require oracle price feed integration
      // Currently using placeholder value - production will use Chainlink price feeds
      if (hasReferrer) {
        writeContract({
          address: PRESALE_ADDRESS,
          abi: VFIDEPresaleABI,
          functionName: 'buyTokensWithReferral',
          args: [lockPeriod, referralCode as `0x${string}`],
          value: parseUnits('0.01', 18), // Placeholder - needs oracle
        });
      } else {
        writeContract({
          address: PRESALE_ADDRESS,
          abi: VFIDEPresaleABI,
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
          abi: VFIDEPresaleABI,
          functionName: 'buyWithStableReferral',
          args: [stablecoinPlaceholder, stableAmount, tier, lockPeriod, referralCode as `0x${string}`],
        });
      } else {
        writeContract({
          address: PRESALE_ADDRESS,
          abi: VFIDEPresaleABI,
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
    const numAmount = safeParseFloat(amount, 0);
    if (isNaN(numAmount)) return 0;
    return numAmount * tiers[selectedTier].price;
  };

  const allowanceBigInt = allowance as bigint | undefined;
  const needsApproval = paymentMethod !== 'eth' && allowanceBigInt !== undefined && 
    calculateTotal() > 0 && allowanceBigInt < parseUnits(calculateTotal().toFixed(6), 6);

  return (
    <>
      
      <main className="min-h-screen bg-zinc-950 pt-20 relative overflow-hidden">
        {/* Premium Background Effects */}
        <div className="fixed inset-0 pointer-events-none">
          <div className="absolute top-1/4 -left-32 w-125 h-125 bg-cyan-500/10 rounded-full blur-[120px] animate-pulse" />
          <div className="absolute bottom-1/4 -right-32 w-100 h-100 bg-blue-500/10 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '1s' }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-150 h-150 bg-purple-500/5 rounded-full blur-[150px]" />
        </div>

        {/* Hero Header */}
        <section className="py-16 relative z-10">
          <div className="container mx-auto px-3 sm:px-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center max-w-4xl mx-auto"
            >
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="inline-flex items-center gap-2 px-4 py-2 bg-linear-to-r from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 rounded-full mb-4"
              >
                <Sparkles className="w-4 h-4 text-cyan-400" />
                <span className="text-cyan-400 text-sm font-medium">Token Presale Live</span>
              </motion.div>
              <h1 className="text-5xl md:text-6xl font-bold text-white mb-4 tracking-tight">
                Join VFIDE <span className="text-transparent bg-clip-text bg-linear-to-r from-cyan-400 to-blue-400">Governance</span>
              </h1>
              <p className="text-xl md:text-2xl text-transparent bg-clip-text bg-linear-to-r from-cyan-400 to-blue-400 font-medium mb-6">
                Participate in DAO Governance • No Processor Fees* • Protocol Development
              </p>
              <p className="text-lg text-gray-400 max-w-2xl mx-auto mb-8">
                VFIDE tokens grant voting rights, payment network access, and protocol participation.
                Three tiers available based on your commitment level and desired governance influence.
              </p>

              {/* Referral Program Highlight */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-500/10 backdrop-blur-xl border-2 border-cyan-500/50 p-6"
              >
                <div className="flex items-center justify-center gap-3 mb-3">
                  <div className="text-3xl">🎁</div>
                  <h3 className="text-2xl font-bold text-transparent bg-clip-text bg-linear-to-r from-cyan-400 to-blue-400">Referral Rewards Active</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-center">
                  <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10">
                    <div className="text-3xl font-bold text-cyan-400 mb-1">+2%</div>
                    <div className="text-white font-bold mb-1">Buyer Bonus</div>
                    <div className="text-sm text-gray-400">Use a referral code when purchasing</div>
                  </div>
                  <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10">
                    <div className="text-3xl font-bold text-cyan-400 mb-1">+3%</div>
                    <div className="text-white font-bold mb-1">Referrer Reward</div>
                    <div className="text-sm text-gray-400">Share your address to earn</div>
                  </div>
                </div>
                <p className="text-sm text-gray-400 mt-4">
                  Bonuses paid instantly in VFIDE tokens • No limit on referrals • Multi-level structure
                </p>
              </motion.div>

              {/* Clean Legal Notice */}
              <div className="mt-6 bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4">
                <p className="text-sm text-gray-400 leading-relaxed">
                  <strong className="text-white">Utility Token Notice:</strong> VFIDE tokens provide governance and payment utility. 
                  Not an investment contract. Token value may fluctuate. Purchase only if you plan to participate in governance or payments. 
                  See <a href="/legal" className="text-cyan-400 hover:underline">full terms</a>.
                </p>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Tier Selection */}
        <section className="py-16 relative z-10">
          <div className="container mx-auto px-3 sm:px-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
            >
              <h2 className="text-3xl font-bold text-center text-white mb-4">
                Step 1: Select Your Commitment Tier
              </h2>
              <p className="text-center text-gray-400 mb-12 max-w-3xl mx-auto">
                Different tiers offer different utility characteristics. Longer commitment = lower price + higher voting power.
                All tiers provide immediate governance and payment access.
              </p>
            </motion.div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
              {Object.entries(tiers).map(([key, tier], idx) => (
                <motion.div
                  key={key}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + idx * 0.1 }}
                  whileHover={{ scale: 1.02, y: -5 }}
                  onClick={() => setSelectedTier(key as "founding" | "oath" | "public")}
                  className={`relative cursor-pointer overflow-hidden rounded-2xl bg-gradient-to-br from-white/8 to-white/2 backdrop-blur-xl border-2 p-8 pt-10 transition-all ${
                    selectedTier === key 
                      ? 'border-cyan-400 shadow-lg shadow-cyan-500/20' 
                      : 'border-white/10 hover:border-white/20'
                  }`}
                  style={selectedTier === key ? { borderColor: tier.color, boxShadow: `0 0 30px ${tier.color}40` } : undefined}
                >
                  {/* Most Popular badge shown on oath tier */}
                  {key === 'oath' && (
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 px-4 py-1 bg-linear-to-r from-cyan-500 to-blue-500 text-white rounded-b-xl text-sm font-bold shadow-lg shadow-cyan-500/25">
                      MOST POPULAR
                    </div>
                  )}
                  
                  <div className="text-center mb-6">
                    <h3 className="text-3xl font-bold text-white mb-2">
                      {tier.name}
                    </h3>
                    <div className="text-5xl font-bold mb-2" style={{ color: tier.color }}>
                      {tier.priceDisplay}
                    </div>
                    <div className="text-gray-400 text-sm">per VFIDE token</div>
                  </div>

                  <div className="space-y-3 mb-6">
                    <div className="flex justify-between text-sm p-2 bg-white/5 rounded-lg">
                      <span className="text-gray-400">Commitment Period:</span>
                      <span className="text-white font-bold">{tier.commitment}</span>
                    </div>
                    <div className="flex justify-between text-sm p-2 bg-white/5 rounded-lg">
                      <span className="text-gray-400">Immediate Unlock:</span>
                      <span className="text-white font-bold">{tier.immediateUnlock}</span>
                    </div>
                    <div className="flex justify-between text-sm p-2 bg-white/5 rounded-lg">
                      <span className="text-gray-400">Max Purchase:</span>
                      <span className="text-white font-bold">{tier.maxPurchase}</span>
                    </div>
                  </div>

                  <div className="border-t border-white/10 pt-4 mb-6">
                    <h4 className="text-sm font-bold text-white mb-3">Utility Features:</h4>
                    <ul className="space-y-2">
                      {tier.features.map((feature) => (
                        <li key={feature} className="flex items-start gap-2 text-xs text-gray-400">
                          <span style={{ color: tier.color }}>✓</span>
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {selectedTier === key && (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="bg-linear-to-r from-cyan-500 to-blue-500 text-white text-center py-2 rounded-xl font-bold shadow-lg shadow-cyan-500/25"
                    >
                      SELECTED
                    </motion.div>
                  )}
                </motion.div>
              ))}
            </div>

            {/* Token Benefits */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="mt-12 max-w-4xl mx-auto relative overflow-hidden rounded-2xl bg-gradient-to-br from-white/8 to-white/2 backdrop-blur-xl border border-cyan-500/30 p-8"
            >
              <h3 className="text-2xl font-bold text-white mb-6 text-center">Token Holder Benefits</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                  { icon: '🗳️', title: 'Governance Rights', desc: 'Vote on proposals, elect council members, influence treasury allocation' },
                  { icon: '💳', title: 'Payment Access', desc: 'Accept/make payments with no processor fees* (live in Phase 2)' },
                  { icon: '⭐', title: 'ProofScore Building', desc: 'Build reputation for fee discounts and enhanced privileges' }
                ].map((benefit, idx) => (
                  <motion.div 
                    key={benefit.title}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 + idx * 0.1 }}
                    className="text-center p-4 bg-white/5 rounded-xl border border-white/10 hover:bg-white/10 transition-colors"
                  >
                    <div className="text-3xl mb-3">{benefit.icon}</div>
                    <h4 className="text-cyan-400 font-bold mb-2">{benefit.title}</h4>
                    <p className="text-sm text-gray-400">{benefit.desc}</p>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        </section>

        {/* Purchase Form */}
        {selectedTier && (
          <section className="py-16 relative z-10">
            <div className="container mx-auto px-3 sm:px-4">
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-2xl mx-auto relative overflow-hidden rounded-2xl bg-gradient-to-br from-white/8 to-white/2 backdrop-blur-xl border border-white/10 p-8"
              >
                <h2 className="text-3xl font-bold text-white mb-8 text-center">
                  Step 2: Enter Purchase Amount
                </h2>

                <div className="space-y-6">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="text-white font-bold">
                        Amount of VFIDE Tokens
                      </label>
                      <motion.button
                        type="button"
                        onClick={() => setAmount('500000')}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="text-xs text-cyan-400 hover:text-cyan-300 font-bold"
                      >
                        MAX
                      </motion.button>
                    </div>
                    <input
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="Enter amount"
                      min="0"
                      max="500000"
                      step="1"
                      aria-label="VFIDE token amount"
                      aria-describedby="amount-hint"
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:border-cyan-500/50 focus:outline-none transition-colors"
                    />
                    <div className="flex gap-2 mt-2">
                      {[1000, 10000, 50000, 100000, 500000].map((preset) => (
                        <motion.button
                          key={preset}
                          type="button"
                          onClick={() => setAmount(String(preset))}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-colors ${
                            amount === String(preset)
                              ? 'bg-linear-to-r from-cyan-500 to-blue-500 text-white shadow-lg shadow-cyan-500/25'
                              : 'bg-white/5 text-gray-400 hover:text-white border border-white/10 hover:bg-white/10'
                          }`}
                        >
                          {preset >= 1000 ? `${preset / 1000}K` : preset}
                        </motion.button>
                      ))}
                    </div>
                    <p id="amount-hint" className="text-xs text-gray-400 mt-2">
                      Maximum 500,000 VFIDE per address (including referral bonuses)
                    </p>
                  </div>

                  {/* Referral Code - Prominent */}
                  <div className="bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border-2 border-cyan-500/30 rounded-xl p-6">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-2xl">🎁</span>
                      <label className="text-white font-bold text-lg">
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
                      className="w-full px-4 py-3 bg-white/5 border border-cyan-500/20 rounded-xl text-white placeholder-gray-500 focus:border-cyan-500/50 focus:outline-none transition-colors"
                    />
                    <div className="mt-3 bg-white/5 rounded-xl p-3 border border-white/10">
                      <div className="text-sm text-white font-bold mb-1">Referral Rewards:</div>
                      <div className="text-sm text-gray-400 space-y-1">
                        <div>• <span className="text-cyan-400">You get:</span> +2% bonus VFIDE instantly</div>
                        <div>• <span className="text-cyan-400">Referrer gets:</span> +3% VFIDE when you purchase</div>
                        <div>• <span className="text-cyan-400">No limit:</span> Refer unlimited people, stack rewards</div>
                      </div>
                    </div>
                  </div>

                  {amount && parseFloat(amount) > 0 && (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="bg-gradient-to-br from-cyan-500/10 to-blue-500/5 border border-cyan-500/30 rounded-xl p-6"
                    >
                      <h3 className="text-xl font-bold text-white mb-4">Purchase Summary</h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between p-2 bg-white/5 rounded-lg">
                          <span className="text-gray-400">Tier:</span>
                          <span className="text-white font-bold">{tiers[selectedTier].name}</span>
                        </div>
                        <div className="flex justify-between p-2 bg-white/5 rounded-lg">
                          <span className="text-gray-400">VFIDE Amount:</span>
                          <span className="text-white font-bold">{parseFloat(amount).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between p-2 bg-white/5 rounded-lg">
                          <span className="text-gray-400">Price per VFIDE:</span>
                          <span className="text-white font-bold">{tiers[selectedTier].priceDisplay}</span>
                        </div>
                        {referralCode && (
                          <div className="flex justify-between p-2 bg-cyan-500/10 rounded-lg text-cyan-400">
                            <span>Referral Bonus (+2%):</span>
                            <span className="font-bold">+{(parseFloat(amount) * 0.02).toLocaleString()} VFIDE</span>
                          </div>
                        )}
                        <div className="border-t border-white/10 pt-4 mt-4">
                          <div className="flex justify-between text-lg">
                            <span className="text-white font-bold">Total Cost:</span>
                            <span className="text-transparent bg-clip-text bg-linear-to-r from-cyan-400 to-blue-400 font-bold">${calculateTotal().toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between mt-2">
                            <span className="text-white font-bold">Total VFIDE:</span>
                            <span className="text-transparent bg-clip-text bg-linear-to-r from-cyan-400 to-blue-400 font-bold">
                              {referralCode 
                                ? (parseFloat(amount) * 1.02).toLocaleString()
                                : parseFloat(amount).toLocaleString()
                              }
                            </span>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </div>
              </motion.div>
            </div>
          </section>
        )}

        {/* Simplified Acknowledgments */}
        {selectedTier && amount && parseFloat(amount) > 0 && (
          <section className="py-16 relative z-10">
            <div className="container mx-auto px-3 sm:px-4">
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-3xl mx-auto relative overflow-hidden rounded-2xl bg-gradient-to-br from-white/8 to-white/2 backdrop-blur-xl border border-white/10 p-8"
              >
                <h2 className="text-3xl font-bold text-white mb-4 text-center">
                  Step 3: Confirm Understanding
                </h2>
                <p className="text-center text-gray-400 mb-8">
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
                      className={`flex items-start gap-3 p-3 rounded-xl cursor-pointer transition-all ${
                        acknowledgments[key as keyof typeof acknowledgments]
                          ? 'bg-cyan-500/10 border border-cyan-500/30'
                          : 'bg-white/5 border border-white/10 hover:border-white/20 hover:bg-white/10'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={acknowledgments[key as keyof typeof acknowledgments]}
                        onChange={() => handleCheckboxChange(key as keyof typeof acknowledgments)}
                        className="mt-1 w-4 h-4 accent-cyan-400"
                      />
                      <span className="text-white text-sm">{label}</span>
                    </label>
                  ))}
                </div>

                {!allAcknowledged && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="mt-6 bg-cyan-500/10 border border-cyan-500/30 rounded-xl p-4"
                  >
                    <p className="text-cyan-400 text-sm text-center">
                      ✓ Please confirm all items above to continue
                    </p>
                  </motion.div>
                )}
              </motion.div>
            </div>
          </section>
        )}

        {/* Purchase Button */}
        {selectedTier && amount && parseFloat(amount) > 0 && (
          <section className="py-16 relative z-10">
            <div className="container mx-auto px-3 sm:px-4">
              <div className="max-w-2xl mx-auto">
                {/* Payment Method Selection */}
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-white/8 to-white/2 backdrop-blur-xl border border-white/10 p-6 mb-6"
                >
                  <h3 className="text-lg font-bold text-white mb-4">Payment Method</h3>
                  
                  {/* Testnet Notice */}
                  <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 mb-4">
                    <p className="text-amber-400 text-sm text-center">
                      🧪 <strong>Testnet:</strong> Only ETH payments available. Get free test ETH from{' '}
                      <a href="https://www.alchemy.com/faucets/base-sepolia" target="_blank" rel="noopener noreferrer" className="underline">Alchemy Faucet</a>
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { id: 'usdc' as const, label: 'USDC', color: '#2775CA', disabled: !STABLECOINS_AVAILABLE },
                      { id: 'usdt' as const, label: 'USDT', color: '#26A17B', disabled: !STABLECOINS_AVAILABLE },
                      { id: 'eth' as const, label: 'ETH', color: '#627EEA', disabled: false },
                    ].map((method) => (
                      <motion.button
                        key={method.id}
                        onClick={() => !method.disabled && setPaymentMethod(method.id)}
                        disabled={method.disabled}
                        whileHover={{ scale: method.disabled ? 1 : 1.02 }}
                        whileTap={{ scale: method.disabled ? 1 : 0.98 }}
                        className={`p-4 rounded-xl border-2 transition-all ${
                          method.disabled 
                            ? 'border-white/5 bg-white/5 opacity-50 cursor-not-allowed'
                            : paymentMethod === method.id
                              ? 'border-cyan-400 bg-cyan-500/10'
                              : 'border-white/10 hover:border-white/20 hover:bg-white/5'
                        }`}
                      >
                        <div className="text-lg font-bold text-white">{method.label}</div>
                        {method.disabled && <div className="text-xs text-gray-500">Coming Soon</div>}
                      </motion.button>
                    ))}
                  </div>
                </motion.div>

                {/* Connection / Purchase State */}
                <div className="text-center">
                  {!isConnected ? (
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-white/8 to-white/2 backdrop-blur-xl border border-white/10 p-8"
                    >
                      <div className="p-4 rounded-2xl bg-cyan-500/10 inline-block mb-4">
                        <Wallet className="w-10 h-10 text-cyan-400" />
                      </div>
                      <h3 className="text-xl font-bold text-white mb-2">Connect Wallet</h3>
                      <p className="text-gray-400 mb-4">Connect your wallet to purchase VFIDE tokens</p>
                      <motion.button 
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="px-8 py-3 bg-linear-to-r from-cyan-500 to-blue-500 text-white font-bold rounded-xl shadow-lg shadow-cyan-500/25 transition-all"
                      >
                        Connect Wallet
                      </motion.button>
                    </motion.div>
                  ) : isSuccess ? (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="relative overflow-hidden rounded-2xl bg-emerald-500/10 border border-emerald-500/30 p-8"
                    >
                      <CheckCircle className="w-16 h-16 mx-auto mb-4 text-emerald-400" />
                      <h3 className="text-2xl font-bold text-white mb-2">Purchase Successful!</h3>
                      <p className="text-gray-400">
                        Your VFIDE tokens have been credited to your vault.
                      </p>
                    </motion.div>
                  ) : (
                    <>
                      {/* Approval Button (for stablecoins) */}
                      {needsApproval && (
                        <motion.button
                          onClick={handleApprove}
                          disabled={!allAcknowledged || isApprovePending || isApproveConfirming}
                          whileHover={{ scale: allAcknowledged ? 1.02 : 1 }}
                          whileTap={{ scale: allAcknowledged ? 0.98 : 1 }}
                          className={`w-full px-12 py-6 rounded-xl font-bold text-xl transition-all mb-4 ${
                            allAcknowledged
                              ? 'bg-linear-to-r from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/25'
                              : 'bg-white/10 text-gray-500 cursor-not-allowed'
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
                        </motion.button>
                      )}

                      {/* Gas Fee Preview */}
                      {allAcknowledged && !needsApproval && amount && parseFloat(amount) > 0 && (
                        <motion.div 
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="relative overflow-hidden rounded-xl bg-white/5 border border-white/10 p-4 mb-4"
                        >
                          <div className="flex items-center gap-2 text-gray-400 text-sm mb-2">
                            <Fuel size={14} />
                            <span>Transaction Cost</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-500">Network fee (gas)</span>
                            <span className="text-white">~${gasCostUsd < 0.01 ? '<0.01' : gasCostUsd.toFixed(2)}</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-emerald-400 mt-2">
                            <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                            <span>~2 sec confirmation on Base</span>
                          </div>
                        </motion.div>
                      )}

                      {/* Purchase Button */}
                      <motion.button
                        onClick={handlePurchase}
                        disabled={!allAcknowledged || needsApproval || isPending || isConfirming}
                        whileHover={{ scale: allAcknowledged && !needsApproval ? 1.02 : 1 }}
                        whileTap={{ scale: allAcknowledged && !needsApproval ? 0.98 : 1 }}
                        className={`w-full px-12 py-6 rounded-xl font-bold text-xl transition-all ${
                          allAcknowledged && !needsApproval
                            ? 'bg-linear-to-r from-cyan-500 to-blue-500 text-white shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40'
                            : 'bg-white/10 text-gray-500 cursor-not-allowed'
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
                      </motion.button>

                      {allAcknowledged && !needsApproval && (
                        <motion.div 
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="mt-6 space-y-2"
                        >
                          <p className="text-lg text-white">
                            Total Cost: <span className="text-transparent bg-clip-text bg-linear-to-r from-cyan-400 to-blue-400 font-bold text-2xl">${calculateTotal().toFixed(2)}</span>
                          </p>
                          <p className="text-sm text-gray-400">
                            Paying with {paymentMethod.toUpperCase()}
                          </p>
                        </motion.div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* FAQ Section */}
        <section className="py-16 relative z-10">
          <div className="container mx-auto px-3 sm:px-4">
            <motion.h2 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-3xl font-bold text-center text-white mb-12"
            >
              Frequently Asked Questions
            </motion.h2>

            <div className="max-w-4xl mx-auto space-y-4">
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
                <motion.div 
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-white/8 to-white/2 backdrop-blur-xl border border-white/10 p-6 hover:bg-white/5 transition-colors"
                >
                  <h3 className="text-xl font-bold text-white mb-3">{faq.q}</h3>
                  <p className="text-gray-400 leading-relaxed">{faq.a}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Additional Information */}
        <section className="py-16 relative z-10">
          <div className="container mx-auto px-3 sm:px-4">
            <div className="max-w-4xl mx-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <motion.div 
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-white/8 to-white/2 backdrop-blur-xl border border-white/10 p-6"
                >
                  <h3 className="text-xl font-bold text-cyan-400 mb-3">Tokenomics</h3>
                  <ul className="space-y-2 text-sm text-gray-400">
                    <li className="flex items-center gap-2"><span className="text-cyan-400">•</span> Total Supply: 200,000,000 VFIDE (fixed)</li>
                    <li className="flex items-center gap-2"><span className="text-cyan-400">•</span> Dev Reserve: 50,000,000 (25%, 36-month vesting)</li>
                    <li className="flex items-center gap-2"><span className="text-cyan-400">•</span> Presale: 50,000,000 (25%)</li>
                    <li className="flex items-center gap-2"><span className="text-cyan-400">•</span> Treasury/Operations: 100,000,000 (50%)</li>
                    <li className="flex items-center gap-2"><span className="text-cyan-400">•</span> Deflationary burn mechanism (0.25-5%)</li>
                    <li className="flex items-center gap-2"><span className="text-cyan-400">•</span> ProofScore-based fee discounts</li>
                  </ul>
                </motion.div>
                <motion.div 
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-white/8 to-white/2 backdrop-blur-xl border border-white/10 p-6"
                >
                  <h3 className="text-xl font-bold text-cyan-400 mb-3">Smart Contract</h3>
                  <ul className="space-y-2 text-sm text-gray-400">
                    <li className="flex items-center gap-2"><span className="text-cyan-400">•</span> Third-party audit planned pre-mainnet</li>
                    <li className="flex items-center gap-2"><span className="text-cyan-400">•</span> Open source and verifiable</li>
                    <li className="flex items-center gap-2"><span className="text-cyan-400">•</span> Non-upgradeable core logic</li>
                    <li className="flex items-center gap-2"><span className="text-cyan-400">•</span> Community governance controls</li>
                  </ul>
                </motion.div>
              </div>

              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-white/8 to-white/2 backdrop-blur-xl border border-white/10 p-6 text-center"
              >
                <p className="text-gray-400 text-sm leading-relaxed">
                  <strong className="text-white">Important:</strong> Cryptocurrency purchases involve risk. 
                  Token values may fluctuate. Only participate if you understand blockchain technology and can allocate 
                  funds for governance participation. Not financial advice - consult qualified professionals for investment guidance.
                  Read full <a href="/legal" className="text-cyan-400 hover:underline">Terms of Service</a> before purchasing.
                </p>
              </motion.div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}

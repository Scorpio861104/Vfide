'use client';

import { AnimatePresence, motion } from "framer-motion";
import { Book, ChevronRight, Droplets, Globe, HelpCircle, Shield, Star, Store, Vote, Wallet, X } from "lucide-react";
import { useState } from "react";
import { useChainId } from "wagmi";
import { isTestnetChainId } from "@/lib/chains";

interface HelpTopic {
  id: string;
  title: string;
  icon: React.ReactNode;
  description: string;
  content: string[];
}

const helpTopics: HelpTopic[] = [
  {
    id: "getting-started",
    title: "Getting Started",
    icon: <Book size={24} />,
    description: "New to VFIDE? Start here!",
    content: [
      "1. Connect your Web3 wallet (MetaMask, Coinbase Wallet, etc.)",
      "2. Add Base Sepolia network to your wallet (see 'Network Setup' below)",
      "3. Get free test ETH from a faucet (see 'Get Test ETH' below)",
      "4. Set up your vault for secure fund storage",
      "5. Start building your ProofScore by completing tasks"
    ]
  },
  {
    id: "network-setup",
    title: "Network Setup",
    icon: <Globe size={24} />,
    description: "Add supported networks to your wallet",
    content: [
      "VFIDE supports Base (mainnet) and Base Sepolia (testnet):",
      "━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
      "Base Mainnet:",
      "• RPC: https://mainnet.base.org",
      "• Chain ID: 8453",
      "• Explorer: https://basescan.org",
      "",
      "Base Sepolia (Testnet):",
      "• RPC: https://sepolia.base.org",
      "• Chain ID: 84532",
      "• Explorer: https://sepolia.basescan.org",
      "━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
      "Base Sepolia mirrors mainnet behavior; only the ETH is test ETH.",
      "Tip: Click 'Switch Network' in the app and your wallet should auto-add it!"
    ]
  },
  {
    id: "get-test-eth",
    title: "Get Test ETH",
    icon: <Droplets size={24} />,
    description: "Free ETH for testing on Base Sepolia",
    content: [
      "You need test ETH to pay for transactions. It's completely free!",
      "━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
      "🏆 Coinbase Faucet (Best): portal.cdp.coinbase.com/products/faucet",
      "⚗️ Alchemy Faucet: alchemy.com/faucets/base-sepolia",
      "⚡ QuickNode Faucet: faucet.quicknode.com/base/sepolia",
      "━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
      "Steps: 1) Copy your wallet address, 2) Paste into faucet, 3) Click 'Request'",
      "You'll receive 0.1-0.5 ETH within seconds. This is enough for 100+ transactions!",
      "Tip: Use the 'Get ETH' button in the app header for quick faucet links"
    ]
  },
  {
    id: "wallet-setup",
    title: "Wallet Setup",
    icon: <Wallet size={24} />,
    description: "How to connect and use your wallet",
    content: [
      "Don't have a wallet? Download MetaMask or Coinbase Wallet (free!)",
      "Click 'Connect Wallet' in the top right corner",
      "Approve the connection in your wallet app",
      "Your wallet is now connected! You'll see your address displayed",
      "Pro tip: Enable hardware wallet or multi-sig for extra security"
    ]
  },
  {
    id: "vault-security",
    title: "Vault Security",
    icon: <Shield size={24} />,
    description: "Keep your funds safe with advanced features",
    content: [
      "Guardian Recovery: Add trusted friends/family as guardians",
      "Next of Kin: Designate an heir to inherit your vault if something happens",
      "7-day Guardian Maturity: New guardians must wait 7 days before they can help with recovery",
      "30-day Recovery Window: Recovery requests expire after 30 days",
      "Withdrawal Cooldowns: Optional delays before large withdrawals"
    ]
  },
  {
    id: "merchant-tools",
    title: "Merchant Tools",
    icon: <Store size={24} />,
    description: "Accept payments with no processor fees",
    content: [
      "Register as a merchant (takes 2 minutes)",
      "Get your unique merchant ID and payment QR code",
      "Accept payments instantly with no processor fees (burn + gas apply)",
      "Funds settle immediately—no 2-7 day wait like traditional processors",
      "Integrate with e-commerce, retail stores, or service businesses"
    ]
  },
  {
    id: "trust-score",
    title: "Trust Score (ProofScore)",
    icon: <Star size={24} />,
    description: "Build reputation and unlock rewards",
    content: [
      "Complete tasks to earn points (KYC, purchases, community participation)",
      "Higher scores unlock better features and lower fees",
      "Scores are transparent and verifiable on-chain",
      "Merchants with high scores get priority visibility",
      "Your score follows you across the entire VFIDE ecosystem"
    ]
  },
  {
    id: "governance",
    title: "Governance",
    icon: <Vote size={24} />,
    description: "Have a voice in platform decisions",
    content: [
      "Token holders vote on proposals (fees, features, partnerships)",
      "1 token = 1 vote in most decisions",
      "Council members (elected) make day-to-day operational decisions",
      "Anyone can submit proposals for community review",
      "Current fee rate (0%) was voted on by the community"
    ]
  },
  {
    id: "streaming-payroll",
    title: "Streaming Payroll",
    icon: <Droplets size={24} />,
    description: "Get paid every second - Revolutionary salary system",
    content: [
      "🌊 What is Streaming Payroll?",
      "Instead of waiting for payday, your salary streams into your wallet every single second. Work one hour, get paid for one hour - instantly!",
      "━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
      "💼 For Employees:",
      "• Watch your earned wages grow in real-time",
      "• Withdraw earned amount anytime (no minimum wait)",
      "• No more waiting 2 weeks for payday",
      "• Perfect for emergency expenses",
      "• Example: $5,000/month = $0.0019/second continuously",
      "━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
      "🏢 For Employers:",
      "• No large upfront payroll costs",
      "• Pause streams during disputes (funds stay safe)",
      "• Top-up anytime to extend runway",
      "• Cancel and recover unused balance",
      "• Attract top talent with instant wage access",
      "• Zero custody - funds go direct to employee",
      "━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
      "🎯 How It Works:",
      "1. Employer creates stream (sets rate + deposits tokens)",
      "2. Tokens stream per-second to employee",
      "3. Employee withdraws earned amount anytime",
      "4. No intermediaries, no custody, 100% transparent",
      "━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
      "💡 Use Cases:",
      "• Full-time salaries",
      "• Contractor payments",
      "• Freelancer retainers",
      "• Recurring payments",
      "• Subscription services",
      "━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
      "🚀 Benefits:",
      "✅ Instant wage access (financial wellness)",
      "✅ No payday lending needed",
      "✅ Transparent & verifiable on-chain",
      "✅ Lower fees than traditional payroll",
      "✅ Multi-token support (VFIDE, USDC, USDT, DAI, WETH)"
    ]
  }
];

export function HelpCenter() {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState<HelpTopic | null>(null);
  const chainId = useChainId();
  const isTestnet = chainId ? isTestnetChainId(chainId) : false;

  return (
    <>
      {/* Floating Help Button - positioned above mobile nav */}
      <motion.button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-24 md:bottom-6 right-6 z-40 w-14 h-14 bg-linear-to-r from-cyan-400 to-blue-500 rounded-full shadow-2xl flex items-center justify-center hover:scale-110 transition-transform"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 1, type: "spring" }}
      >
        <HelpCircle size={28} className="text-zinc-900" />
      </motion.button>

      {/* Help Panel */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[90]"
              onClick={() => {
                setIsOpen(false);
                setSelectedTopic(null);
              }}
            />

            {/* Panel */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25 }}
                className="fixed right-0 top-0 bottom-0 w-full sm:w-[90vw] md:w-[31.25rem] bg-linear-to-br from-zinc-800 to-zinc-900 border-l-2 border-cyan-400 shadow-2xl z-[91] overflow-y-auto"
            >
              {/* Header */}
              <div className="sticky top-0 bg-zinc-900 border-b border-zinc-700 p-6 flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-zinc-100" style={{ fontFamily: 'var(--font-display)' }}>
                    Help Center
                  </h2>
                  <p className="text-sm text-zinc-400">Learn how to use VFIDE</p>
                </div>
                <button
                  onClick={() => {
                    setIsOpen(false);
                    setSelectedTopic(null);
                  }}
                  className="p-2 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-700 rounded-lg transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              {/* Content */}
              <div className="p-6">
                {!selectedTopic ? (
                  // Topic List
                  <div className="space-y-3">
                    {helpTopics.map((topic) => (
                      <button
                        key={topic.id}
                        onClick={() => setSelectedTopic(topic)}
                        className="w-full p-4 bg-zinc-900 border border-zinc-700 hover:border-cyan-400 rounded-lg text-left transition-all group"
                      >
                        <div className="flex items-center gap-4">
                          <div className="shrink-0 w-12 h-12 bg-cyan-400/20 rounded-lg flex items-center justify-center text-cyan-400">
                            {topic.icon}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-zinc-100 mb-1 group-hover:text-cyan-400 transition-colors">
                              {topic.title}
                            </h3>
                            <p className="text-sm text-zinc-400">
                              {topic.description}
                            </p>
                          </div>
                          <ChevronRight size={20} className="text-zinc-400 group-hover:text-cyan-400 transition-colors" />
                        </div>
                      </button>
                    ))}

                    {/* Quick Actions */}
                    <div className="mt-8 p-4 bg-cyan-400/10 border border-cyan-400 rounded-lg">
                      <h3 className="font-bold text-cyan-400 mb-3">Quick Actions</h3>
                      <div className="space-y-2">
                        {isTestnet && (
                          <a
                            href="/testnet"
                            onClick={() => setIsOpen(false)}
                            className="block w-full px-4 py-2 bg-zinc-900 border border-zinc-700 hover:border-cyan-400 rounded-lg text-zinc-100 text-sm text-left transition-all"
                          >
                            💧 Get Test ETH (Faucet Links)
                          </a>
                        )}
                        <button
                          onClick={() => {
                            setIsOpen(false);
                            interface WindowWithTour extends Window {
                              startVFIDETour?: () => void;
                            }
                            const win = window as WindowWithTour;
                            if (typeof window !== 'undefined' && win.startVFIDETour) {
                              win.startVFIDETour();
                            }
                          }}
                          className="w-full px-4 py-2 bg-zinc-900 border border-zinc-700 hover:border-cyan-400 rounded-lg text-zinc-100 text-sm text-left transition-all"
                        >
                          🎓 Restart Platform Tour
                        </button>
                        <a
                          href="/docs"
                          onClick={() => setIsOpen(false)}
                          className="block w-full px-4 py-2 bg-zinc-900 border border-zinc-700 hover:border-cyan-400 rounded-lg text-zinc-100 text-sm text-left transition-all"
                        >
                          📚 Full Documentation
                        </a>
                      </div>
                    </div>
                  </div>
                ) : (
                  // Topic Detail
                  <div>
                    <button
                      onClick={() => setSelectedTopic(null)}
                      className="mb-4 text-cyan-400 hover:text-cyan-400 text-sm flex items-center gap-2"
                    >
                      ← Back to topics
                    </button>

                    <div className="flex items-center gap-4 mb-6">
                      <div className="w-16 h-16 bg-cyan-400/20 rounded-lg flex items-center justify-center text-cyan-400">
                        {selectedTopic.icon}
                      </div>
                      <div>
                        <h3 className="text-2xl font-bold text-zinc-100" style={{ fontFamily: 'var(--font-display)' }}>
                          {selectedTopic.title}
                        </h3>
                        <p className="text-sm text-zinc-400">
                          {selectedTopic.description}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      {selectedTopic.content.map((item, index) => (
                        <div
                          key={index}
                          className="p-4 bg-zinc-900 border border-zinc-700 rounded-lg"
                        >
                          <p className="text-zinc-100 leading-relaxed">{item}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { HelpCircle, X, Book, Wallet, Shield, Store, Star, Vote, ChevronRight } from "lucide-react";

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
      "2. Explore the platform and see how everything works",
      "3. Set up your vault for secure fund storage",
      "4. Start building your Trust Score by completing tasks",
      "5. Join the community and participate in governance"
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
  }
];

export function HelpCenter() {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState<HelpTopic | null>(null);

  return (
    <>
      {/* Floating Help Button - positioned above mobile nav */}
      <motion.button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-24 md:bottom-6 right-6 z-40 w-14 h-14 bg-gradient-to-r from-[#00F0FF] to-[#0080FF] rounded-full shadow-2xl flex items-center justify-center hover:scale-110 transition-transform"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 1, type: "spring" }}
      >
        <HelpCircle size={28} className="text-[#1A1A1D]" />
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
              className="fixed right-0 top-0 bottom-0 w-full md:w-[500px] bg-gradient-to-br from-[#2A2A2F] to-[#1A1A1D] border-l-2 border-[#00F0FF] shadow-2xl z-[91] overflow-y-auto"
            >
              {/* Header */}
              <div className="sticky top-0 bg-[#1A1A1D] border-b border-[#3A3A3F] p-6 flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-[#F5F3E8] font-[family-name:var(--font-display)]">
                    Help Center
                  </h2>
                  <p className="text-sm text-[#A0A0A5]">Learn how to use VFIDE</p>
                </div>
                <button
                  onClick={() => {
                    setIsOpen(false);
                    setSelectedTopic(null);
                  }}
                  className="p-2 text-[#A0A0A5] hover:text-[#F5F3E8] hover:bg-[#3A3A3F] rounded-lg transition-colors"
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
                        className="w-full p-4 bg-[#1A1A1D] border border-[#3A3A3F] hover:border-[#00F0FF] rounded-lg text-left transition-all group"
                      >
                        <div className="flex items-center gap-4">
                          <div className="flex-shrink-0 w-12 h-12 bg-[#00F0FF]/20 rounded-lg flex items-center justify-center text-[#00F0FF]">
                            {topic.icon}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-[#F5F3E8] mb-1 group-hover:text-[#00F0FF] transition-colors">
                              {topic.title}
                            </h3>
                            <p className="text-sm text-[#A0A0A5]">
                              {topic.description}
                            </p>
                          </div>
                          <ChevronRight size={20} className="text-[#A0A0A5] group-hover:text-[#00F0FF] transition-colors" />
                        </div>
                      </button>
                    ))}

                    {/* Quick Actions */}
                    <div className="mt-8 p-4 bg-[#00F0FF]/10 border border-[#00F0FF] rounded-lg">
                      <h3 className="font-bold text-[#00F0FF] mb-3">Quick Actions</h3>
                      <div className="space-y-2">
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
                          className="w-full px-4 py-2 bg-[#1A1A1D] border border-[#3A3A3F] hover:border-[#00F0FF] rounded-lg text-[#F5F3E8] text-sm text-left transition-all"
                        >
                          🎓 Restart Platform Tour
                        </button>
                        <a
                          href="/faq"
                          onClick={() => setIsOpen(false)}
                          className="block w-full px-4 py-2 bg-[#1A1A1D] border border-[#3A3A3F] hover:border-[#00F0FF] rounded-lg text-[#F5F3E8] text-sm text-left transition-all"
                        >
                          ❓ View FAQ
                        </a>
                      </div>
                    </div>
                  </div>
                ) : (
                  // Topic Detail
                  <div>
                    <button
                      onClick={() => setSelectedTopic(null)}
                      className="mb-4 text-[#00F0FF] hover:text-[#00D4FF] text-sm flex items-center gap-2"
                    >
                      ← Back to topics
                    </button>

                    <div className="flex items-center gap-4 mb-6">
                      <div className="w-16 h-16 bg-[#00F0FF]/20 rounded-lg flex items-center justify-center text-[#00F0FF]">
                        {selectedTopic.icon}
                      </div>
                      <div>
                        <h3 className="text-2xl font-bold text-[#F5F3E8] font-[family-name:var(--font-display)]">
                          {selectedTopic.title}
                        </h3>
                        <p className="text-sm text-[#A0A0A5]">
                          {selectedTopic.description}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      {selectedTopic.content.map((item, index) => (
                        <div
                          key={index}
                          className="p-4 bg-[#1A1A1D] border border-[#3A3A3F] rounded-lg"
                        >
                          <p className="text-[#F5F3E8] leading-relaxed">{item}</p>
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

'use client';

import { useState } from "react";
import { Footer } from "@/components/layout/Footer";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Book, Code, Shield, Zap, Users, HelpCircle, 
  GraduationCap, ChevronDown, ChevronRight, Lock,
  Search, Clock
} from "lucide-react";
import LessonModal, { LessonContent } from "@/components/modals/LessonModal";
import { lessonContentData } from "@/data/lessonContent";

type DocTab = "overview" | "learn" | "faq" | "security";

// FAQ Data
const faqs = [
  {
    category: "Fees & Pricing",
    questions: [
      {
        q: "Who pays the fees? Is it really 0% for customers?",
        a: "YES - Payment processing is 0% for both customers AND merchants. Only network gas applies (~$0.01-0.10 on Base). HOWEVER: When you TRANSFER VFIDE tokens (wallet-to-wallet), there's a ProofScore-based fee that scales from 0.25% (score ≥80%) to 5% (score ≤40%). Payments are FREE. Token transfers fund the ecosystem through burn + Sanctum charity + ecosystem allocations."
      },
      {
        q: "What are the VFIDE token transfer fees?",
        a: "Fees scale DYNAMICALLY based on your ProofScore using a linear curve: Score ≤40% pays 5% (max), Score ≥80% pays 0.25% (min). Between 40-80%, fees interpolate linearly. Example: Score 60% pays ~2.63%. Higher reputation = lower fees. Fee split: 40% burn (deflationary), 10% Sanctum (charity), 50% ecosystem (staking, council, incentives)."
      },
      {
        q: "How does this compare to traditional processors?",
        a: "Stripe charges 2.9% + 30¢ per transaction. VFIDE merchant payments: 0% processing fee. VFIDE token transfers: 0.25-5% behavioral fee (deflationary, funds ecosystem). For merchants accepting payments, VFIDE is free. For peer-to-peer transfers, fees reward trust."
      }
    ]
  },
  {
    category: "Custody & Security",
    questions: [
      {
        q: "Who controls my funds? Can VFIDE freeze my account?",
        a: "YOU control 100%. Your vault is a smart contract with withdrawal functions that ONLY accept calls from YOUR wallet address. VFIDE cannot pause, freeze, or access individual user vaults - the code doesn't allow it. True non-custodial. (Note: Emergency Breaker can halt the entire protocol in existential threats, but requires DAO approval.)"
      },
      {
        q: "What is a 'vault' and how is it different from a wallet?",
        a: "Your WALLET is your ATM card (a key). Your VAULT is your bank account (a smart contract safe). Vaults are automatically created on your first token receipt. Vault = safe that holds funds, Wallet = key to unlock."
      },
      {
        q: "What happens if I lose access to my wallet?",
        a: "Two recovery mechanisms: 1) CHAIN OF RETURN: Connect a new wallet to your EXISTING vault (guardian approval required). 2) NEXT OF KIN: Transfer your vault's funds to your inheritor's vault. Guardians help with WALLET RECOVERY, not fund withdrawal."
      }
    ]
  },
  {
    category: "ProofScore & Reputation",
    questions: [
      {
        q: "What is ProofScore and why does it matter?",
        a: "💎 ProofScore (0-100% scale, internally 0-10000) measures trust through ACTIONS and INTEGRITY, not wealth. Calculated from: Transaction activity (40%), Community endorsements (30%), Good behavior & badges (20%), Wallet age (10%). Capital held contributes 0%. Higher scores = lower fees and greater privileges."
      },
      {
        q: "How do I increase my ProofScore?",
        a: "1) Complete transactions regularly 2) Earn endorsements from trusted users 3) Earn badges through contributions 4) Maintain good behavior (no disputes/fraud) 5) Keep your account active 6) Vote in governance. Wealth does NOT increase your score."
      },
      {
        q: "What are the ProofScore tiers?",
        a: "ProofScore ranges 0-100% (0-10000 internally). Fees scale LINEARLY: ≤40% = 5% fee (max), ≥80% = 0.25% fee (min). Between these, fees decrease proportionally as score increases. At 60% you'd pay ~2.63%. No fixed tiers for fees - your exact score determines your exact fee. Governance requires ≥54%, merchant listing requires ≥56%, council eligibility requires ≥70%."
      }
    ]
  },
  {
    category: "Anti-Whale Protection",
    questions: [
      {
        q: "What are the transfer limits?",
        a: "To prevent market manipulation: Max 2M VFIDE per transfer (1% of supply), Max 4M VFIDE per wallet (2%), Max 5M VFIDE per 24 hours. Limits can be adjusted by DAO governance. Exchanges and liquidity pools are exempt."
      },
      {
        q: "Why do whale limits exist?",
        a: "Whale limits protect the ecosystem from pump-and-dump schemes, ensure fair distribution, prevent single actors from cornering supply, and maintain price stability for merchants accepting VFIDE payments."
      }
    ]
  }
];

// Learning lessons
const lessons = [
  {
    level: "beginner" as const,
    items: [
      { title: "What is VFIDE?", duration: "3 min", description: "VFIDE is a payment system like Venmo, but with crypto and no fees." },
      { title: "Your First Wallet", duration: "5 min", description: "Set up MetaMask or Coinbase Wallet in 2 minutes." },
      { title: "Understanding Your Vault", duration: "4 min", description: "Wallet = key, Vault = safe. Auto-created on first token receipt." },
      { title: "Making Your First Payment", duration: "3 min", description: "Click payment link, approve in wallet, done!" },
      { title: "ProofScore Explained", duration: "5 min", description: "Trust earned through actions, not wealth." }
    ]
  },
  {
    level: "intermediate" as const,
    items: [
      { title: "Setting Up Guardians", duration: "7 min", description: "Add trusted guardians for wallet recovery." },
      { title: "Merchant Setup", duration: "10 min", description: "Accept crypto payments with no processor fees." },
      { title: "Governance & Voting", duration: "8 min", description: "Shape the future of VFIDE through proposals." }
    ]
  },
  {
    level: "advanced" as const,
    items: [
      { title: "Advanced ProofScore", duration: "10 min", description: "Maximize your reputation with strategic actions." },
      { title: "Smart Contract Deep Dive", duration: "15 min", description: "Understand the technical architecture." },
      { title: "API Integration", duration: "20 min", description: "Build custom payment flows for your platform." }
    ]
  }
];

// Documentation sections
const docSections = [
  {
    title: "Getting Started",
    icon: Zap,
    color: "#00F0FF",
    links: [
      { name: "What is VFIDE?", href: "#learn" },
      { name: "Connect Your Wallet", href: "/dashboard" },
      { name: "Create Your Vault", href: "/vault" },
      { name: "Accept Payments", href: "/merchant" },
    ]
  },
  {
    title: "Core Concepts",
    icon: Book,
    color: "#00FF88",
    links: [
      { name: "ProofScore Reputation", href: "/dashboard" },
      { name: "Non-Custodial Vaults", href: "/vault" },
      { name: "Guardian Recovery", href: "#security" },
      { name: "Badge System", href: "/dashboard" },
    ]
  },
  {
    title: "For Merchants",
    icon: Code,
    color: "#FFD700",
    links: [
      { name: "Merchant Portal", href: "/merchant" },
      { name: "Payment Integration", href: "/merchant" },
      { name: "POS System", href: "/pay" },
    ]
  },
  {
    title: "Governance",
    icon: Users,
    color: "#A78BFA",
    links: [
      { name: "DAO Overview", href: "/governance" },
      { name: "Voting Process", href: "/governance" },
      { name: "Treasury", href: "/token-launch" },
    ]
  },
  {
    title: "Security",
    icon: Shield,
    color: "#C41E3A",
    links: [
      { name: "Security Architecture", href: "#security" },
      { name: "Guardian System", href: "#security" },
      { name: "Smart Contract Audits", href: "#security" },
    ]
  },
  {
    title: "Support",
    icon: HelpCircle,
    color: "#FFA500",
    links: [
      { name: "FAQ", href: "#faq" },
      { name: "Legal & Terms", href: "/legal" },
      { name: "GitHub", href: "https://github.com/Scorpio861104/Vfide" },
    ]
  },
];

// Security layers
const securityLayers = [
  { num: 1, name: "Emergency Breaker", color: "red", desc: "Global halt for existential threats. DAO-controlled only." },
  { num: 2, name: "Guardian Lock", color: "orange", desc: "M-of-N voting. Permanent lock until DAO override." },
  { num: 3, name: "Quarantine", color: "yellow", desc: "Time-based lock. Auto-unlock on expiry or DAO clear." },
  { num: 4, name: "Global Risk", color: "green", desc: "Ecosystem-wide monitoring and threat detection." }
];

export default function DocsPage() {
  const [activeTab, setActiveTab] = useState<DocTab>("overview");
  const [searchQuery, setSearchQuery] = useState("");
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);
  const [selectedLevel, setSelectedLevel] = useState<"beginner" | "intermediate" | "advanced">("beginner");
  const [selectedLesson, setSelectedLesson] = useState<LessonContent | null>(null);
  const [isLessonModalOpen, setIsLessonModalOpen] = useState(false);

  const tabs: { id: DocTab; label: string; icon: React.ReactNode }[] = [
    { id: "overview", label: "Documentation", icon: <Book className="w-4 h-4" /> },
    { id: "learn", label: "Learn", icon: <GraduationCap className="w-4 h-4" /> },
    { id: "faq", label: "FAQ", icon: <HelpCircle className="w-4 h-4" /> },
    { id: "security", label: "Security", icon: <Shield className="w-4 h-4" /> }
  ];

  // Filter FAQs by search
  const filteredFaqs = faqs.map(category => ({
    ...category,
    questions: category.questions.filter(
      q => q.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
           q.a.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })).filter(cat => cat.questions.length > 0);

  return (
    <>
      
      <main className="min-h-screen bg-zinc-900 pt-20">
        {/* Header */}
        <section className="py-8 sm:py-12 bg-linear-to-b from-zinc-800 to-zinc-900 border-b border-zinc-700">
          <div className="container mx-auto px-3 sm:px-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center max-w-3xl mx-auto"
            >
              <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-[family-name:var(--font-display)] font-bold text-zinc-100 mb-4">
                Documentation & Help
              </h1>
              <p className="text-base sm:text-lg text-zinc-400">
                Everything you need to know about VFIDE
              </p>
            </motion.div>
          </div>
        </section>

        {/* Tab Navigation */}
        <div className="sticky top-16 sm:top-16 z-40 bg-zinc-900/95 backdrop-blur border-b border-zinc-700">
          <div className="container mx-auto px-2 sm:px-4">
            <div className="flex gap-1 overflow-x-auto py-2 scrollbar-hide">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 rounded-lg font-medium transition-all whitespace-nowrap text-sm sm:text-base ${
                    activeTab === tab.id
                      ? "bg-cyan-400/20 text-cyan-400 border border-cyan-400/50"
                      : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="container mx-auto px-4 py-8">
          <AnimatePresence mode="wait">
            {/* Overview Tab */}
            {activeTab === "overview" && (
              <motion.div
                key="overview"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
              >
                {docSections.map((section, idx) => (
                  <motion.div
                    key={section.title}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    className="bg-zinc-800 rounded-xl p-6 border border-zinc-700 hover:border-cyan-400/50 transition-all"
                  >
                    <div className="flex items-center gap-3 mb-4">
                      <div 
                        className="w-10 h-10 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: `${section.color}20` }}
                      >
                        <section.icon className="w-5 h-5" style={{ color: section.color }} />
                      </div>
                      <h3 className="text-lg font-bold text-zinc-100">{section.title}</h3>
                    </div>
                    <div className="space-y-2">
                      {section.links.map((link) => (
                        <Link
                          key={link.name}
                          href={link.href}
                          onClick={(e) => {
                            if (link.href.startsWith("#")) {
                              e.preventDefault();
                              setActiveTab(link.href.slice(1) as DocTab);
                            }
                          }}
                          className="block text-zinc-400 hover:text-cyan-400 transition-colors py-1"
                        >
                          <ChevronRight className="w-4 h-4 inline mr-1" />
                          {link.name}
                        </Link>
                      ))}
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            )}

            {/* Learn Tab */}
            {activeTab === "learn" && (
              <motion.div
                key="learn"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                {/* Level Selector */}
                <div className="flex flex-wrap justify-center gap-2 sm:gap-4 mb-8">
                  {(["beginner", "intermediate", "advanced"] as const).map((level) => (
                    <button
                      key={level}
                      onClick={() => setSelectedLevel(level)}
                      className={`px-4 sm:px-6 py-2 sm:py-3 rounded-xl font-bold capitalize transition-all text-sm sm:text-base ${
                        selectedLevel === level
                          ? level === "beginner" ? "bg-green-600 text-white" 
                            : level === "intermediate" ? "bg-blue-600 text-white"
                            : "bg-purple-600 text-white"
                          : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                      }`}
                    >
                      {level}
                    </button>
                  ))}
                </div>

                {/* Lessons */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {lessons.find(l => l.level === selectedLevel)?.items.map((lesson, idx) => (
                    <motion.div
                      key={lesson.title}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.1 }}
                      onClick={() => {
                        const lessonContent = lessonContentData[lesson.title];
                        if (lessonContent) {
                          setSelectedLesson(lessonContent);
                          setIsLessonModalOpen(true);
                        }
                      }}
                      className="bg-zinc-800 rounded-xl p-6 border border-zinc-700 hover:border-cyan-400/50 transition-all cursor-pointer group"
                    >
                      <div className="w-12 h-12 mb-4 flex items-center justify-center bg-cyan-400/10 rounded-lg border border-cyan-400/30">
                        <Book className="w-6 h-6 text-cyan-400" />
                      </div>
                      <h3 className="text-lg font-bold text-zinc-100 mb-2 group-hover:text-cyan-400 transition-colors">
                        {lesson.title}
                      </h3>
                      <p className="text-zinc-400 text-sm mb-3">{lesson.description}</p>
                      <div className="flex items-center gap-1 text-xs text-cyan-400">
                        <Clock className="w-3 h-3" />
                        <span>{lesson.duration}</span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* FAQ Tab */}
            {activeTab === "faq" && (
              <motion.div
                key="faq"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                {/* Search */}
                <div className="max-w-xl mx-auto mb-8">
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
                    <input
                      type="text"
                      placeholder="Search FAQ..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-12 pr-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-zinc-100 focus:border-cyan-400 focus:outline-none"
                    />
                  </div>
                </div>

                {/* FAQ Accordion */}
                <div className="max-w-3xl mx-auto space-y-6">
                  {filteredFaqs.map((category) => (
                    <div key={category.category}>
                      <h3 className="text-xl font-bold text-cyan-400 mb-4">{category.category}</h3>
                      <div className="space-y-2">
                        {category.questions.map((faq, idx) => {
                          const globalIdx = faqs.flatMap(c => c.questions).indexOf(faq);
                          return (
                            <div
                              key={idx}
                              className="bg-zinc-800 rounded-xl border border-zinc-700 overflow-hidden"
                            >
                              <button
                                onClick={() => setOpenFaqIndex(openFaqIndex === globalIdx ? null : globalIdx)}
                                className="w-full px-6 py-4 text-left flex items-center justify-between"
                              >
                                <span className="font-medium text-zinc-100">{faq.q}</span>
                                <ChevronDown className={`w-5 h-5 text-zinc-400 transition-transform ${openFaqIndex === globalIdx ? "rotate-180" : ""}`} />
                              </button>
                              <AnimatePresence>
                                {openFaqIndex === globalIdx && (
                                  <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: "auto", opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    className="overflow-hidden"
                                  >
                                    <div className="px-6 pb-4 text-zinc-400">{faq.a}</div>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Security Tab */}
            {activeTab === "security" && (
              <motion.div
                key="security"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                {/* Security Architecture */}
                <div className="text-center mb-8">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-linear-to-br from-blue-500 to-purple-600 rounded-2xl mb-4">
                    <Shield className="w-8 h-8 text-white" />
                  </div>
                  <h2 className="text-2xl font-bold text-zinc-100 mb-2">4-Layer Security Architecture</h2>
                  <p className="text-zinc-400">Emergency Breaker → Guardian Lock → Quarantine → Global Risk</p>
                </div>

                {/* Security Layers */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
                  {securityLayers.map((layer) => (
                    <div key={layer.num} className="bg-zinc-800 rounded-xl p-6 border border-zinc-700 text-center">
                      <div 
                        className={`w-14 h-14 mx-auto mb-3 rounded-xl flex items-center justify-center border-2`}
                        style={{ 
                          backgroundColor: `${layer.color === "red" ? "#dc2626" : layer.color === "orange" ? "#ea580c" : layer.color === "yellow" ? "#ca8a04" : "#16a34a"}20`,
                          borderColor: layer.color === "red" ? "#dc2626" : layer.color === "orange" ? "#ea580c" : layer.color === "yellow" ? "#ca8a04" : "#16a34a"
                        }}
                      >
                        <span className="text-xl font-bold" style={{ 
                          color: layer.color === "red" ? "#dc2626" : layer.color === "orange" ? "#ea580c" : layer.color === "yellow" ? "#ca8a04" : "#16a34a"
                        }}>{layer.num}</span>
                      </div>
                      <div className="font-bold text-zinc-100 mb-2">{layer.name}</div>
                      <div className="text-xs text-zinc-400">{layer.desc}</div>
                    </div>
                  ))}
                </div>

                {/* Key Security Features */}
                <div className="bg-zinc-800 rounded-xl p-8 border border-zinc-700">
                  <h3 className="text-xl font-bold text-zinc-100 mb-6 flex items-center gap-2">
                    <Lock className="w-5 h-5 text-cyan-400" />
                    Key Security Features
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div className="flex gap-3">
                        <div className="w-8 h-8 bg-cyan-400/20 rounded-lg flex items-center justify-center shrink-0">
                          <Shield className="w-4 h-4 text-cyan-400" />
                        </div>
                        <div>
                          <div className="font-medium text-zinc-100">Non-Custodial Vaults</div>
                          <div className="text-sm text-zinc-400">Only YOU control your funds. VFIDE cannot access vaults.</div>
                        </div>
                      </div>
                      <div className="flex gap-3">
                        <div className="w-8 h-8 bg-emerald-400/20 rounded-lg flex items-center justify-center shrink-0">
                          <Users className="w-4 h-4 text-emerald-400" />
                        </div>
                        <div>
                          <div className="font-medium text-zinc-100">Guardian Recovery</div>
                          <div className="text-sm text-zinc-400">Add trusted guardians for wallet recovery. M-of-N approval required.</div>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div className="flex gap-3">
                        <div className="w-8 h-8 bg-amber-400/20 rounded-lg flex items-center justify-center shrink-0">
                          <Lock className="w-4 h-4 text-amber-400" />
                        </div>
                        <div>
                          <div className="font-medium text-zinc-100">User-Controlled Freeze</div>
                          <div className="text-sm text-zinc-400">Freeze your vault like freezing a credit card. Instant protection.</div>
                        </div>
                      </div>
                      <div className="flex gap-3">
                        <div className="w-8 h-8 bg-violet-400/20 rounded-lg flex items-center justify-center shrink-0">
                          <Zap className="w-4 h-4 text-violet-400" />
                        </div>
                        <div>
                          <div className="font-medium text-zinc-100">Abnormal Transaction Detection</div>
                          <div className="text-sm text-zinc-400">Large transfers require your explicit approval.</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Link to full security page */}
                <div className="text-center mt-8">
                  <Link
                    href="/vault"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-cyan-400/20 text-cyan-400 rounded-xl hover:bg-cyan-400/30 transition-colors"
                  >
                    <Shield className="w-5 h-5" />
                    Manage Your Vault Security
                  </Link>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      <LessonModal
        isOpen={isLessonModalOpen}
        onClose={() => {
          setIsLessonModalOpen(false);
          setSelectedLesson(null);
        }}
        lesson={selectedLesson}
      />

      <Footer />
    </>
  );
}

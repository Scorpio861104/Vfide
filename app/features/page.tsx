'use client';

import { Footer } from "@/components/layout/Footer";
import { PageWrapper } from "@/components/ui/PageLayout";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  Shield, Zap, Users, Lock, Sparkles,
  Coins, MessageCircle, Vote, Trophy, Wallet, BarChart3,
  ShoppingCart, Clock, Layers, Globe, Eye, Gift,
  ArrowRight, CheckCircle2, Star
} from "lucide-react";

// Feature categories with their features
const featureCategories = [
  {
    category: "Core Features",
    icon: Shield,
    color: "from-cyan-500 to-blue-500",
    features: [
      { name: "Multi-Wallet Support", desc: "MetaMask, Coinbase, WalletConnect, Trust, Rainbow", icon: Wallet },
      { name: "Multi-Chain", desc: "Base, Polygon, zkSync Era with seamless switching", icon: Layers },
      { name: "Secure Vault", desc: "Guardian-protected asset storage with recovery", icon: Lock },
      { name: "ProofScore", desc: "Trust-based reputation system with transparent scoring", icon: Star },
    ]
  },
  {
    category: "Social & Community",
    icon: Users,
    color: "from-purple-500 to-pink-500",
    features: [
      { name: "Activity Feed", desc: "Real-time updates from your network", icon: MessageCircle },
      { name: "Stories", desc: "24-hour ephemeral content sharing", icon: Sparkles },
      { name: "Messaging", desc: "Encrypted peer-to-peer communication", icon: MessageCircle },
      { name: "Endorsements", desc: "Build reputation through peer endorsements", icon: Trophy },
    ]
  },
  {
    category: "Governance",
    icon: Vote,
    color: "from-amber-500 to-orange-500",
    features: [
      { name: "DAO Proposals", desc: "Create and vote on protocol changes", icon: Vote },
      { name: "Council Elections", desc: "Democratic governance selection", icon: Users },
      { name: "Delegation", desc: "Delegate voting power to trusted members", icon: ArrowRight },
      { name: "Appeals", desc: "Fair dispute resolution system", icon: Shield },
    ]
  },
  {
    category: "Merchant Tools",
    icon: ShoppingCart,
    color: "from-emerald-500 to-teal-500",
    features: [
      { name: "Point of Sale", desc: "Accept crypto payments in-person", icon: ShoppingCart },
      { name: "Payment Links", desc: "Share payment requests instantly", icon: Link },
      { name: "Analytics", desc: "Track sales and customer insights", icon: BarChart3 },
      { name: "Multi-Currency", desc: "Accept any token or stablecoin", icon: Coins },
    ]
  },
  {
    category: "Advanced Features",
    icon: Zap,
    color: "from-rose-500 to-red-500",
    features: [
      { name: "Stealth Payments", desc: "Private transactions with zero-knowledge proofs", icon: Eye },
      { name: "Streaming", desc: "Continuous money flow per second", icon: Clock },
      { name: "Multi-Sig", desc: "Require multiple approvals for transactions", icon: Users },
      { name: "Time Locks", desc: "Schedule future payments and unlocks", icon: Clock },
    ]
  },
  {
    category: "Gamification",
    icon: Trophy,
    color: "from-indigo-500 to-violet-500",
    features: [
      { name: "Daily Quests", desc: "Complete tasks to earn rewards", icon: Gift },
      { name: "Achievements", desc: "Unlock badges and special perks", icon: Trophy },
      { name: "Leaderboard", desc: "Compete globally for top positions", icon: BarChart3 },
      { name: "Rewards", desc: "Earn tokens for active participation", icon: Coins },
    ]
  },
];

// Stats showcasing VFIDE's scale
const stats = [
  { value: "200+", label: "Features", icon: Sparkles },
  { value: "60+", label: "Pages", icon: Layers },
  { value: "500+", label: "Components", icon: Zap },
  { value: "3", label: "Chains", icon: Globe },
];

export default function FeaturesPage() {
  return (
    <>
      <PageWrapper variant="cosmic" showOrbs showGrid>
        <main className="pt-20 pb-20">
          {/* Hero Section */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-16"
          >
            <h1 className="text-5xl md:text-6xl font-bold text-zinc-100 mb-4">
              The Most <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">Advanced</span> DeFi Platform
            </h1>
            <p className="text-xl text-zinc-400 max-w-3xl mx-auto mb-8">
              VFIDE combines cutting-edge blockchain technology with beautiful, intuitive design
              to deliver the most comprehensive decentralized payment protocol.
            </p>
            
            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto mb-12">
              {stats.map((stat, i) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="bg-zinc-900/50 backdrop-blur-xl border border-zinc-800 rounded-xl p-6"
                >
                  <stat.icon className="w-8 h-8 text-cyan-400 mx-auto mb-2" />
                  <div className="text-3xl font-bold text-zinc-100 mb-1">{stat.value}</div>
                  <div className="text-sm text-zinc-400">{stat.label}</div>
                </motion.div>
              ))}
            </div>
          </motion.section>

          {/* Feature Categories */}
          <div className="space-y-16">
            {featureCategories.map((category, catIndex) => (
              <motion.section
                key={category.category}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: catIndex * 0.1 }}
                className="max-w-6xl mx-auto"
              >
                {/* Category Header */}
                <div className="flex items-center gap-3 mb-8">
                  <div className={`p-3 rounded-xl bg-gradient-to-br ${category.color}`}>
                    <category.icon className="w-6 h-6 text-white" />
                  </div>
                  <h2 className="text-3xl font-bold text-zinc-100">{category.category}</h2>
                </div>

                {/* Features Grid */}
                <div className="grid md:grid-cols-2 gap-6">
                  {category.features.map((feature, i) => (
                    <motion.div
                      key={feature.name}
                      initial={{ opacity: 0, x: -20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.05 }}
                      className="group relative overflow-hidden bg-zinc-900/50 backdrop-blur-xl border border-zinc-800 rounded-xl p-6 hover:border-cyan-400/50 transition-all duration-300"
                    >
                      {/* Gradient overlay on hover */}
                      <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/0 to-blue-500/0 group-hover:from-cyan-500/5 group-hover:to-blue-500/5 transition-all duration-300" />
                      
                      <div className="relative">
                        <div className="flex items-start gap-4">
                          <div className="p-2 bg-zinc-800 rounded-lg group-hover:bg-cyan-400/10 transition-colors">
                            <feature.icon className="w-5 h-5 text-cyan-400" />
                          </div>
                          <div className="flex-1">
                            <h3 className="text-lg font-semibold text-zinc-100 mb-2 group-hover:text-cyan-400 transition-colors">
                              {feature.name}
                            </h3>
                            <p className="text-sm text-zinc-400">
                              {feature.desc}
                            </p>
                          </div>
                          <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.section>
            ))}
          </div>

          {/* CTA Section */}
          <motion.section
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mt-20"
          >
            <div className="max-w-3xl mx-auto bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border border-cyan-400/20 rounded-2xl p-12">
              <h2 className="text-3xl font-bold text-zinc-100 mb-4">
                Ready to Experience the Future of DeFi?
              </h2>
              <p className="text-zinc-400 mb-8">
                Join thousands of users enjoying the most advanced, secure, and user-friendly
                decentralized payment platform.
              </p>
              <div className="flex flex-wrap gap-4 justify-center">
                <Link
                  href="/setup"
                  className="px-8 py-4 bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-cyan-500/25 transition-all inline-flex items-center gap-2"
                >
                  Get Started
                  <ArrowRight className="w-5 h-5" />
                </Link>
                <Link
                  href="/dashboard"
                  className="px-8 py-4 bg-zinc-800 text-zinc-100 font-semibold rounded-xl hover:bg-zinc-700 transition-all"
                >
                  View Dashboard
                </Link>
              </div>
            </div>
          </motion.section>
        </main>
        <Footer />
      </PageWrapper>
    </>
  );
}

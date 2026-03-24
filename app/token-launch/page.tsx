'use client';

import { Footer } from "@/components/layout/Footer";
import { motion } from "framer-motion";
import Link from "next/link";

export default function TokenLaunchPage() {
  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      <main className="flex-1 flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center max-w-lg"
        >
          <div className="text-6xl mb-6">⚡</div>
          <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
            VFIDE Token Launch
          </h1>
          <p className="text-gray-300 text-lg mb-6">
            The VFIDE token is now available through the treasury. Token distribution
            is managed directly — no presale required.
          </p>
          <p className="text-gray-400 mb-8">
            Head to your vault or the DEX to acquire VFIDE and start building
            your on-chain reputation.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/vault"
              className="px-6 py-3 bg-cyan-500 hover:bg-cyan-400 text-black font-semibold rounded-lg transition-colors"
            >
              Open Vault
            </Link>
            <Link
              href="/"
              className="px-6 py-3 border border-gray-600 hover:border-gray-400 text-gray-300 font-semibold rounded-lg transition-colors"
            >
              Back to Home
            </Link>
          </div>
        </motion.div>
      </main>
      <Footer />
    </div>
  );
}

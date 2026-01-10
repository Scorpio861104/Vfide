"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Home, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#1A1A1D] flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center max-w-2xl"
      >
        {/* 404 Display */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", delay: 0.1 }}
          className="mb-8"
        >
          <div className="text-[150px] md:text-[200px] font-bold leading-none bg-linear-to-r from-[#00F0FF] to-[#0080FF] bg-clip-text text-transparent">
            404
          </div>
        </motion.div>

        {/* Message */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <h1 className="text-3xl md:text-4xl font-[family-name:var(--font-display)] font-bold text-[#F5F3E8] mb-4">
            Page Not Found
          </h1>
          <p className="text-lg text-[#A0A0A5] mb-8">
            The page you&apos;re looking for doesn&apos;t exist or has been moved.
            Let&apos;s get you back on track.
          </p>
        </motion.div>

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="flex flex-col sm:flex-row gap-4 justify-center"
        >
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 px-8 py-3 bg-linear-to-r from-[#00F0FF] to-[#0080FF] text-[#1A1A1D] rounded-lg font-bold hover:scale-105 transition-transform"
          >
            <Home className="w-5 h-5" />
            Go Home
          </Link>
          <button
            onClick={() => window.history.back()}
            className="inline-flex items-center justify-center gap-2 px-8 py-3 border-2 border-[#00F0FF] text-[#00F0FF] rounded-lg font-bold hover:bg-[#00F0FF]/10 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Go Back
          </button>
        </motion.div>

        {/* Quick Links */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="mt-12 pt-8 border-t border-[#3A3A3F]"
        >
          <p className="text-[#A0A0A5] text-sm mb-4">Popular Pages</p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link href="/dashboard" className="text-[#00F0FF] hover:underline text-sm">
              Trust Explorer
            </Link>
            <Link href="/vault" className="text-[#00F0FF] hover:underline text-sm">
              Vault Manager
            </Link>
            <Link href="/merchant" className="text-[#00F0FF] hover:underline text-sm">
              Merchant Portal
            </Link>
            <Link href="/token-launch" className="text-[#00F0FF] hover:underline text-sm">
              Token Launch
            </Link>
            <Link href="/faq" className="text-[#00F0FF] hover:underline text-sm">
              FAQ
            </Link>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}

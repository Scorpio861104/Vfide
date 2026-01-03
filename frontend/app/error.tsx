"use client";

import { useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    if (typeof window !== 'undefined' && process.env.NODE_ENV === 'production') {
      // H-9: Error tracking deferred - integrate Sentry or similar in future release
      // Track issue: https://github.com/VFIDE-DAO/vfide-frontend/issues/new?labels=enhancement
    }
    if (process.env.NODE_ENV === 'development') {
      console.error("Application error:", error);
    }
  }, [error]);

  return (
    <div className="min-h-screen bg-[#1A1A1D] flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center max-w-2xl"
      >
        {/* Error Icon */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", delay: 0.1 }}
          className="mb-8"
        >
          <div className="w-24 h-24 mx-auto bg-[#C41E3A]/20 border-2 border-[#C41E3A] rounded-full flex items-center justify-center">
            <AlertTriangle className="w-12 h-12 text-[#C41E3A]" />
          </div>
        </motion.div>

        {/* Message */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <h1 className="text-3xl md:text-4xl font-[family-name:var(--font-display)] font-bold text-[#F5F3E8] mb-4">
            Something Went Wrong
          </h1>
          <p className="text-lg text-[#A0A0A5] mb-4">
            We encountered an unexpected error. This has been logged and we&apos;ll look into it.
          </p>
          {error.digest && (
            <p className="text-sm text-[#707075] mb-8 font-mono">
              Error ID: {error.digest}
            </p>
          )}
        </motion.div>

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="flex flex-col sm:flex-row gap-4 justify-center"
        >
          <button
            onClick={reset}
            className="inline-flex items-center justify-center gap-2 px-8 py-3 bg-gradient-to-r from-[#00F0FF] to-[#0080FF] text-[#1A1A1D] rounded-lg font-bold hover:scale-105 transition-transform"
          >
            <RefreshCw className="w-5 h-5" />
            Try Again
          </button>
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 px-8 py-3 border-2 border-[#00F0FF] text-[#00F0FF] rounded-lg font-bold hover:bg-[#00F0FF]/10 transition-colors"
          >
            <Home className="w-5 h-5" />
            Go Home
          </Link>
        </motion.div>

        {/* Help Text */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="mt-12 pt-8 border-t border-[#3A3A3F]"
        >
          <p className="text-[#A0A0A5] text-sm">
            If this problem persists, please{" "}
            <a 
              href="https://github.com/Scorpio861104/Vfide/issues" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-[#00F0FF] hover:underline"
            >
              report an issue
            </a>{" "}
            or contact support.
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
}

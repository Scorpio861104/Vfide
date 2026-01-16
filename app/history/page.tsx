"use client";

import { Footer } from "@/components/layout/Footer";
import { motion } from "framer-motion";
import { ArrowUpRight, ArrowDownLeft, Clock, CheckCircle, XCircle, Loader } from "lucide-react";
import { useAccount } from "wagmi";
import Link from "next/link";
import { useEffect, useState } from "react";

interface Transaction {
  id: string;
  type: "send" | "receive" | "vault" | "reward";
  amount: string;
  token: string;
  from: string;
  to: string;
  timestamp: Date;
  status: "pending" | "completed" | "failed";
  hash: string;
}

export default function HistoryPage() {
  const { address, isConnected } = useAccount();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isConnected && address) {
      // Fetch transaction history
      const fetchHistory = async () => {
        try {
          const response = await fetch(`/api/crypto/transactions/${address}`);
          if (response.ok) {
            const data = await response.json();
            setTransactions(data.transactions || []);
          }
        } catch (error) {
          console.error("Failed to fetch transaction history:", error);
        } finally {
          setLoading(false);
        }
      };

      fetchHistory();
    } else {
      setLoading(false);
    }
  }, [address, isConnected]);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "send":
        return <ArrowUpRight className="w-5 h-5 text-red-400" />;
      case "receive":
        return <ArrowDownLeft className="w-5 h-5 text-green-400" />;
      default:
        return <Clock className="w-5 h-5 text-[#00F0FF]" />;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      case "failed":
        return <XCircle className="w-4 h-4 text-red-400" />;
      default:
        return <Loader className="w-4 h-4 text-yellow-400 animate-spin" />;
    }
  };

  return (
    <>
      <main className="min-h-screen bg-[#1A1A1D] pt-20">
        {/* Hero */}
        <section className="py-12 bg-linear-to-b from-[#2A2A2F] to-[#1A1A1D] border-b border-[#3A3A3F]">
          <div className="container mx-auto px-3 sm:px-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-6xl mx-auto"
            >
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-[family-name:var(--font-display)] font-bold text-[#F5F3E8] mb-4">
                Transaction History
              </h1>
              <p className="text-lg text-[#A0A0A5]">
                View all your VFIDE transactions and activity
              </p>
            </motion.div>
          </div>
        </section>

        {/* Content */}
        <section className="py-12">
          <div className="container mx-auto px-4 max-w-6xl">
            {!isConnected ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-[#2A2A2F] border border-[#3A3A3F] rounded-xl p-12 text-center"
              >
                <Clock className="w-16 h-16 text-[#00F0FF] mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-[#F5F3E8] mb-4">
                  Connect Your Wallet
                </h2>
                <p className="text-[#A0A0A5] mb-6">
                  Please connect your wallet to view your transaction history
                </p>
                <Link
                  href="/dashboard"
                  className="inline-block px-6 py-3 bg-[#00F0FF] text-[#1A1A1D] font-bold rounded-lg hover:shadow-lg hover:shadow-[#00F0FF]/50 transition-all"
                >
                  Go to Dashboard
                </Link>
              </motion.div>
            ) : loading ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-12"
              >
                <Loader className="w-12 h-12 text-[#00F0FF] mx-auto mb-4 animate-spin" />
                <p className="text-[#A0A0A5]">Loading transaction history...</p>
              </motion.div>
            ) : transactions.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-[#2A2A2F] border border-[#3A3A3F] rounded-xl p-12 text-center"
              >
                <Clock className="w-16 h-16 text-[#A0A0A5] mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-[#F5F3E8] mb-4">
                  No Transactions Yet
                </h2>
                <p className="text-[#A0A0A5] mb-6">
                  Your transaction history will appear here once you start using VFIDE
                </p>
                <Link
                  href="/pay"
                  className="inline-block px-6 py-3 bg-[#00F0FF] text-[#1A1A1D] font-bold rounded-lg hover:shadow-lg hover:shadow-[#00F0FF]/50 transition-all"
                >
                  Send Payment
                </Link>
              </motion.div>
            ) : (
              <div className="space-y-3">
                {transactions.map((tx, index) => (
                  <motion.div
                    key={tx.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="bg-[#2A2A2F] border border-[#3A3A3F] rounded-xl p-4 hover:border-[#00F0FF] transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        <div className="flex-shrink-0">
                          {getTypeIcon(tx.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold text-[#F5F3E8] capitalize">
                              {tx.type}
                            </span>
                            {getStatusIcon(tx.status)}
                          </div>
                          <p className="text-sm text-[#A0A0A5] truncate">
                            {tx.type === "send" ? `To: ${tx.to}` : `From: ${tx.from}`}
                          </p>
                          <p className="text-xs text-[#A0A0A5] mt-1">
                            {new Date(tx.timestamp).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0 ml-4">
                        <p className={`font-bold text-lg ${
                          tx.type === "receive" || tx.type === "reward" 
                            ? "text-green-400" 
                            : "text-red-400"
                        }`}>
                          {tx.type === "receive" || tx.type === "reward" ? "+" : "-"}
                          {tx.amount} {tx.token}
                        </p>
                        {tx.hash && (
                          <a
                            href={`https://etherscan.io/tx/${tx.hash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-[#00F0FF] hover:underline"
                          >
                            View on Explorer →
                          </a>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

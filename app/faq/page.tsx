"use client";

import { Footer } from "@/components/layout/Footer";
import { motion } from "framer-motion";
import { ChevronDown, HelpCircle } from "lucide-react";
import { useState } from "react";

interface FAQItem {
  question: string;
  answer: string;
}

const faqs: FAQItem[] = [
  {
    question: "What is VFIDE?",
    answer: "VFIDE is a decentralized payment protocol built on integrity, not wealth. It features ProofScore - a reputation system that values trust and contribution over capital."
  },
  {
    question: "How does ProofScore work?",
    answer: "ProofScore measures trust through actions: completing quests, endorsements from peers, successful transactions, and community participation. A high ProofScore grants more influence regardless of token holdings."
  },
  {
    question: "How do I earn VFIDE tokens?",
    answer: "Earn VFIDE through daily/weekly quests, achievements, governance participation, merchant activities, and community contributions. Rewards are distributed based on both activity and ProofScore."
  },
  {
    question: "What is the Vault?",
    answer: "The Vault is a secure smart contract for storing your assets with multi-signature protection, time-locks, and guardian recovery. It provides enterprise-grade security for your digital assets."
  },
  {
    question: "How does governance work?",
    answer: "Governance voting power is weighted by ProofScore, not just token balance. This ensures the community's most trusted members have the greatest say in protocol decisions."
  },
  {
    question: "What are Guardians?",
    answer: "Guardians are trusted contacts who can help recover your vault if you lose access. They cannot access funds directly but can approve recovery requests through a multi-signature process."
  },
  {
    question: "Is VFIDE secure?",
    answer: "Yes. VFIDE uses audited smart contracts, multi-signature wallets, time-locked transactions, and comprehensive security monitoring. All code is open source and regularly audited."
  },
  {
    question: "What networks does VFIDE support?",
    answer: "VFIDE supports Ethereum mainnet, Polygon, Arbitrum, Optimism, and Base. Cross-chain bridges allow seamless asset transfers between supported networks."
  },
  {
    question: "How do I become a merchant?",
    answer: "Navigate to the Merchant Portal, complete merchant onboarding, and integrate our API. Merchants can accept VFIDE payments with low fees and instant settlement."
  },
  {
    question: "What are the fees?",
    answer: "Standard transaction fees are ~0.5%. Vault operations are free. Merchant fees are 1-2% depending on volume. ProofScore holders enjoy reduced fees."
  },
  {
    question: "Can I use VFIDE on mobile?",
    answer: "Yes. VFIDE is fully mobile-responsive with optimized interfaces for phones and tablets. Use any mobile wallet that supports WalletConnect."
  },
  {
    question: "What happens if I lose my wallet?",
    answer: "If you have guardians configured, they can help recover vault access. Without guardians, assets are unrecoverable - this is the nature of decentralized custody. Always backup your seed phrase securely."
  }
];

export default function FAQPage() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <>
      <main className="min-h-screen bg-[#1A1A1D] pt-20">
        {/* Hero */}
        <section className="py-20 bg-linear-to-b from-[#2A2A2F] to-[#1A1A1D] border-b border-[#3A3A3F]">
          <div className="container mx-auto px-3 sm:px-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center max-w-4xl mx-auto"
            >
              <HelpCircle className="w-16 h-16 text-[#00F0FF] mx-auto mb-6" />
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-[family-name:var(--font-display)] font-bold text-[#F5F3E8] mb-6">
                Frequently Asked Questions
              </h1>
              <p className="text-xl md:text-2xl text-[#A0A0A5] leading-relaxed">
                Everything you need to know about VFIDE
              </p>
            </motion.div>
          </div>
        </section>

        {/* FAQs */}
        <section className="py-16">
          <div className="container mx-auto px-4 max-w-4xl">
            <div className="space-y-4">
              {faqs.map((faq, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.05 }}
                  className="bg-[#2A2A2F] border border-[#3A3A3F] rounded-xl overflow-hidden"
                >
                  <button
                    onClick={() => setOpenIndex(openIndex === index ? null : index)}
                    className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-[#3A3A3F] transition-colors"
                  >
                    <span className="text-lg font-semibold text-[#F5F3E8] pr-4">
                      {faq.question}
                    </span>
                    <ChevronDown
                      className={`w-5 h-5 text-[#00F0FF] transition-transform flex-shrink-0 ${
                        openIndex === index ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                  {openIndex === index && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="px-6 pb-4"
                    >
                      <p className="text-[#A0A0A5] leading-relaxed">
                        {faq.answer}
                      </p>
                    </motion.div>
                  )}
                </motion.div>
              ))}
            </div>

            {/* Contact */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="mt-12 bg-[#2A2A2F] border border-[#3A3A3F] rounded-xl p-8 text-center"
            >
              <h2 className="text-2xl font-[family-name:var(--font-display)] font-bold text-[#00F0FF] mb-4">
                Still have questions?
              </h2>
              <p className="text-[#A0A0A5] mb-6">
                Check out our documentation or join our community channels
              </p>
              <div className="flex flex-wrap gap-4 justify-center">
                <a
                  href="/docs"
                  className="px-6 py-3 bg-[#00F0FF] text-[#1A1A1D] font-bold rounded-lg hover:shadow-lg hover:shadow-[#00F0FF]/50 transition-all"
                >
                  Read Docs
                </a>
                <a
                  href="https://github.com/Scorpio861104/Vfide"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-6 py-3 bg-[#2A2A2F] border-2 border-[#00F0FF] text-[#00F0FF] font-bold rounded-lg hover:bg-[#00F0FF] hover:text-[#1A1A1D] transition-all"
                >
                  GitHub
                </a>
              </div>
            </motion.div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

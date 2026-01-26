'use client';

/**
 * Theme Showcase Page
 * Demonstrates all the new VFIDE signature visual elements
 */

import { useState } from "react";
import { motion } from "framer-motion";
import { 
  FloatingHexagon, 
  HexagonShield,
  TrustRing,
  TrustRings,
  TrustBadge,
  TrustCard,
  TrustProgressBar,
  ShieldLoader,
  HexagonSpinner,
  PulseDotsLoader,
  TrustRingLoader,
  BlockchainLoader,
  SuccessCheckmark,
  SparkleOnHover,
  fireVFIDEConfetti,
  fireStarShower,
} from "@/components/ui";
import { PageWrapper, PageHeader, Section } from "@/components/ui/PageLayout";

export default function ThemeShowcasePage() {
  const [trustScore, setTrustScore] = useState(75);

  return (
    <PageWrapper>
      <PageHeader
        title="VFIDE Theme Showcase"
        subtitle="Distinctive visual elements that make VFIDE memorable"
      />

      {/* Hero with layered background */}
      <Section className="relative overflow-hidden">
        {/* Hexagon pattern overlay */}
        <div className="absolute inset-0 hex-pattern-animated opacity-50" />
        
        <div className="relative z-10 text-center py-16">
          <motion.h1
            className="text-5xl font-bold mb-4 gradient-text-jade"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            Digital Jade
          </motion.h1>
          <p className="text-zinc-400 text-lg mb-8">
            A unique color system that sets VFIDE apart
          </p>
          
          {/* Gradient swatches */}
          <div className="flex justify-center gap-4 flex-wrap">
            <div className="w-24 h-24 rounded-xl" style={{ background: "var(--accent-gradient)" }} />
            <div className="w-24 h-24 rounded-xl" style={{ background: "var(--trust-gradient)" }} />
            <div className="w-24 h-24 rounded-xl bg-gradient-to-br from-[#7B61FF] to-[#7B61FF]" />
          </div>
        </div>
      </Section>

      {/* Hexagon Shield */}
      <Section>
        <h2 className="text-2xl font-bold mb-8 text-center">Hexagon Shield - Brand Identity</h2>
        <div className="flex justify-center gap-12 flex-wrap">
          <div className="text-center">
            <HexagonShield size={100} />
            <p className="text-zinc-400 mt-4">Animated Shield</p>
          </div>
          <div className="text-center">
            <HexagonShield size={100} glowing={false} />
            <p className="text-zinc-400 mt-4">Static Shield</p>
          </div>
          <div className="text-center relative">
            <FloatingHexagon size={60} color="accent" className="top-0 left-0" />
            <FloatingHexagon size={40} color="purple" delay={1} className="top-10 left-10" />
            <FloatingHexagon size={50} color="gold" delay={2} className="top-5 left-20" />
            <div className="w-32 h-32" />
            <p className="text-zinc-400 mt-4">Floating Hexagons</p>
          </div>
        </div>
      </Section>

      {/* Trust Rings */}
      <Section>
        <h2 className="text-2xl font-bold mb-8 text-center">Trust Ring Animations</h2>
        <div className="flex justify-center gap-12 flex-wrap items-center">
          <div className="text-center">
            <TrustRing score={25} />
            <p className="text-zinc-400 mt-4">Low Trust</p>
          </div>
          <div className="text-center">
            <TrustRing score={55} />
            <p className="text-zinc-400 mt-4">Fair Trust</p>
          </div>
          <div className="text-center">
            <TrustRing score={75} />
            <p className="text-zinc-400 mt-4">Good Trust</p>
          </div>
          <div className="text-center">
            <TrustRing score={92} />
            <p className="text-zinc-400 mt-4">Excellent Trust</p>
          </div>
        </div>
        
        <div className="mt-12 flex justify-center">
          <TrustRings 
            scores={[
              { label: "Payments", value: 85, color: "green" },
              { label: "Community", value: 70, color: "blue" },
              { label: "Governance", value: 60, color: "purple" },
            ]}
            size={200}
          />
        </div>
      </Section>

      {/* Trust Level Theme */}
      <Section>
        <h2 className="text-2xl font-bold mb-8 text-center">Trust Level Theme System</h2>
        
        <div className="max-w-xl mx-auto mb-8">
          <label className="block text-zinc-400 mb-2">Adjust Trust Score: {trustScore}</label>
          <input
            type="range"
            min="0"
            max="100"
            value={trustScore}
            onChange={(e) => setTrustScore(Number(e.target.value))}
            className="w-full"
          />
        </div>

        <div className="flex justify-center gap-4 flex-wrap mb-8">
          <TrustBadge score={trustScore} size="sm" />
          <TrustBadge score={trustScore} size="md" />
          <TrustBadge score={trustScore} size="lg" />
        </div>

        <TrustCard trustScore={trustScore} className="max-w-md mx-auto">
          <h3 className="text-xl font-bold mb-2">Trust-Adaptive Card</h3>
          <p className="text-zinc-400">
            This card adapts its glow and border color based on the trust score.
          </p>
          <TrustProgressBar score={trustScore} className="mt-4" />
        </TrustCard>
      </Section>

      {/* Delightful Loaders */}
      <Section>
        <h2 className="text-2xl font-bold mb-8 text-center">Delightful Loading States</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          <div className="flex flex-col items-center gap-4 p-6 bg-zinc-900 rounded-xl">
            <ShieldLoader size={50} text="" />
            <span className="text-zinc-400 text-sm">Shield Loader</span>
          </div>
          <div className="flex flex-col items-center gap-4 p-6 bg-zinc-900 rounded-xl">
            <HexagonSpinner size={50} />
            <span className="text-zinc-400 text-sm">Hexagon Spinner</span>
          </div>
          <div className="flex flex-col items-center gap-4 p-6 bg-zinc-900 rounded-xl">
            <TrustRingLoader size={50} />
            <span className="text-zinc-400 text-sm">Trust Ring Loader</span>
          </div>
          <div className="flex flex-col items-center gap-4 p-6 bg-zinc-900 rounded-xl">
            <PulseDotsLoader size={10} />
            <span className="text-zinc-400 text-sm">Pulse Dots</span>
          </div>
        </div>
        
        <div className="mt-8 flex justify-center">
          <BlockchainLoader text="Confirming on-chain..." />
        </div>
        
        <div className="mt-8 flex justify-center">
          <SuccessCheckmark size={80} />
        </div>
      </Section>

      {/* Celebration Effects */}
      <Section>
        <h2 className="text-2xl font-bold mb-8 text-center">Celebration Effects</h2>
        <div className="flex justify-center gap-4 flex-wrap">
          <button
            onClick={() => fireVFIDEConfetti()}
            className="btn-jade"
          >
            🎉 VFIDE Confetti
          </button>
          <button
            onClick={() => fireStarShower()}
            className="btn-jade"
          >
            ⭐ Star Shower
          </button>
        </div>
        
        <div className="mt-8 flex justify-center">
          <SparkleOnHover className="p-8 bg-zinc-900 rounded-xl cursor-pointer">
            <span className="text-xl">✨ Hover for sparkles ✨</span>
          </SparkleOnHover>
        </div>
        
        <p className="text-center text-zinc-500 mt-8">
          Tip: Try the Konami code (↑↑↓↓←→←→BA) for a surprise!
        </p>
      </Section>

      {/* Cards with Hexagon Watermark */}
      <Section>
        <h2 className="text-2xl font-bold mb-8 text-center">Signature Card Styles</h2>
        <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          <div className="card-hex-watermark bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
            <h3 className="text-xl font-bold mb-2 gradient-text-jade">Hexagon Watermark</h3>
            <p className="text-zinc-400">
              Cards with subtle shield watermark in the corner for brand reinforcement.
            </p>
          </div>
          
          <div className="glass-card rounded-2xl p-6">
            <h3 className="text-xl font-bold mb-2">Glass Card</h3>
            <p className="text-zinc-400">
              Premium glassmorphism with subtle highlights and blur.
            </p>
          </div>
        </div>
      </Section>

      {/* Typography */}
      <Section>
        <h2 className="text-2xl font-bold mb-8 text-center">Typography</h2>
        <div className="max-w-2xl mx-auto space-y-6">
          <div>
            <p className="text-zinc-500 text-sm mb-1">Plus Jakarta Sans (Body)</p>
            <p className="text-3xl font-bold">The quick brown fox jumps over the lazy dog</p>
          </div>
          <div>
            <p className="text-zinc-500 text-sm mb-1">JetBrains Mono (Addresses/Code)</p>
            <p className="text-xl font-mono">0x742d35Cc6634C0532925a3b844Bc9e7595f...</p>
          </div>
          <div className="flex gap-4 flex-wrap">
            <span className="gradient-text-jade text-2xl font-bold">Digital Jade</span>
            <span className="gradient-text-trust text-2xl font-bold">Trust Gradient</span>
            <span className="gradient-text-gold text-2xl font-bold">Gold Accent</span>
          </div>
        </div>
      </Section>
    </PageWrapper>
  );
}

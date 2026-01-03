"use client";

import { motion } from 'framer-motion';
import { GlobalNav } from '@/components/layout/GlobalNav';
import { Footer } from '@/components/layout/Footer';
import { MerchantDashboard } from '@/components/merchant/MerchantDashboard';
import { PaymentInterface } from '@/components/merchant/PaymentInterface';
import { PaymentQR } from '@/components/merchant/PaymentQR';
import { SectionHeading, SurfaceCard, AccentBadge } from '@/components/ui/primitives';
import { 
  Store, 
  CreditCard, 
  QrCode, 
  Zap, 
  Shield, 
  RefreshCw, 
  DollarSign,
  Check,
  Sparkles,
  ArrowRight
} from 'lucide-react';

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { type: "spring" as const, stiffness: 100, damping: 15 }
  }
};

const scaleVariants = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: { 
    opacity: 1, 
    scale: 1,
    transition: { type: "spring" as const, stiffness: 100, damping: 15 }
  }
};

// Feature card component
function FeatureCard({ 
  icon: Icon, 
  title, 
  description, 
  color 
}: { 
  icon: React.ElementType; 
  title: string; 
  description: string; 
  color: string;
}) {
  const colorClasses: Record<string, { bg: string; border: string; text: string; glow: string }> = {
    green: { bg: 'from-emerald-500/20 to-green-500/10', border: 'border-emerald-500/30', text: 'text-emerald-400', glow: 'group-hover:shadow-emerald-500/20' },
    blue: { bg: 'from-blue-500/20 to-cyan-500/10', border: 'border-blue-500/30', text: 'text-blue-400', glow: 'group-hover:shadow-blue-500/20' },
    purple: { bg: 'from-purple-500/20 to-pink-500/10', border: 'border-purple-500/30', text: 'text-purple-400', glow: 'group-hover:shadow-purple-500/20' },
    orange: { bg: 'from-orange-500/20 to-amber-500/10', border: 'border-orange-500/30', text: 'text-orange-400', glow: 'group-hover:shadow-orange-500/20' },
  };

  const c = colorClasses[color] || colorClasses.blue;

  return (
    <motion.div variants={scaleVariants}>
      <SurfaceCard
        variant="muted"
        className={`group relative overflow-hidden bg-gradient-to-br ${c.bg} ${c.border} ${c.glow}`}
      >
        <div className="relative z-10 text-center">
          <div className={`w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br ${c.bg} border ${c.border} flex items-center justify-center`}>
            <Icon className={`w-8 h-8 ${c.text}`} />
          </div>
          <h3 className={`font-bold text-lg mb-2 ${c.text}`}>{title}</h3>
          <p className="text-sm text-gray-300 leading-relaxed">{description}</p>
        </div>
      </SurfaceCard>
    </motion.div>
  );
}

// Comparison table row
function ComparisonRow({ 
  feature, 
  vfide, 
  stripe, 
  square, 
  paypal,
  isLast = false 
}: { 
  feature: string;
  vfide: string;
  stripe: string;
  square: string;
  paypal: string;
  isLast?: boolean;
}) {
  return (
    <motion.tr 
      variants={itemVariants}
      className={`${!isLast ? 'border-b border-white/5' : ''} group hover:bg-white/[0.02] transition-colors`}
    >
      <td className="py-4 px-4 text-gray-300 font-medium">{feature}</td>
      <td className="py-4 px-4 text-center">
        <span className="inline-flex items-center gap-1.5 text-emerald-400 font-bold">
          {vfide === 'Yes' ? <Check className="w-4 h-4" /> : null}
          {vfide}
        </span>
      </td>
      <td className="py-4 px-4 text-center text-gray-500">{stripe}</td>
      <td className="py-4 px-4 text-center text-gray-500">{square}</td>
      <td className="py-4 px-4 text-center text-gray-500">{paypal}</td>
    </motion.tr>
  );
}

// Step component
function Step({ number, title, description }: { number: number; title: string; description: string }) {
  return (
    <motion.div
      variants={itemVariants}
      whileHover={{ x: 5 }}
      className="flex gap-4 items-start group"
    >
      <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center font-bold text-white shadow-lg shadow-blue-500/20 group-hover:shadow-blue-500/40 transition-shadow">
        {number}
      </div>
      <div>
        <h4 className="font-semibold text-white mb-1">{title}</h4>
        <p className="text-sm text-gray-400">{description}</p>
      </div>
    </motion.div>
  );
}

export default function MerchantPage() {
  return (
    <>
      <GlobalNav />
      
      {/* Background effects */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(124,58,237,0.15),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(59,130,246,0.1),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(16,185,129,0.08),transparent_50%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:4rem_4rem]" />
      </div>

      <motion.div 
        initial="hidden"
        animate="visible"
        variants={containerVariants}
        className="min-h-screen text-white pt-24 pb-12"
      >
        <div className="container mx-auto px-4 max-w-7xl">
          {/* Hero Header */}
          <motion.div variants={itemVariants} className="text-center mb-16">
            <motion.div
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              className="inline-flex items-center justify-center w-24 h-24 mb-6 rounded-3xl bg-gradient-to-br from-purple-500 via-blue-500 to-cyan-500 shadow-2xl shadow-purple-500/30"
            >
              <Store className="w-12 h-12 text-white" />
            </motion.div>
            <SectionHeading
              badge="VFIDE Merchant"
              title="Merchant Portal"
              subtitle="Accept VFIDE with 0% protocol fees. Choose direct or escrow modes with optional STABLE-PAY auto-conversion."
              badgeColor="purple"
            />
            <div className="flex flex-wrap justify-center gap-3 mt-8">
              <AccentBadge label="Non-Custodial" color="emerald" />
              <AccentBadge label="Instant Settlement" color="cyan" />
              <AccentBadge label="Zero Fees*" color="amber" />
            </div>
          </motion.div>

          {/* Main Dashboard Grid */}
          <motion.div variants={containerVariants} className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-16">
            {/* Merchant Dashboard Section */}
            <motion.div variants={itemVariants}>
              <SurfaceCard>
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 rounded-xl bg-gradient-to-br from-purple-500/20 to-purple-500/5 border border-purple-500/20">
                    <Store className="w-5 h-5 text-purple-400" />
                  </div>
                  <h2 className="text-xl font-bold text-white">Merchant Dashboard</h2>
                </div>
                <MerchantDashboard />
              </SurfaceCard>
            </motion.div>

            {/* Payment Interface Section */}
            <motion.div variants={itemVariants}>
              <SurfaceCard>
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500/20 to-blue-500/5 border border-blue-500/20">
                    <CreditCard className="w-5 h-5 text-blue-400" />
                  </div>
                  <h2 className="text-xl font-bold text-white">Make Payment</h2>
                </div>
                <PaymentInterface />
              </SurfaceCard>
            </motion.div>
          </motion.div>

          {/* QR Code Section */}
          <motion.div variants={itemVariants} className="mb-16">
            <SurfaceCard>
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-xl bg-gradient-to-br from-cyan-500/20 to-cyan-500/5 border border-cyan-500/20">
                  <QrCode className="w-5 h-5 text-cyan-400" />
                </div>
                <h2 className="text-xl font-bold text-white">Generate Payment QR Code</h2>
              </div>
              <PaymentQR />
            </SurfaceCard>
          </motion.div>

          {/* Features Section */}
          <motion.section variants={containerVariants} className="mb-16">
            <motion.div variants={itemVariants} className="text-center mb-10">
              <SectionHeading
                badge="Commerce engine"
                title="Why Choose VFIDE?"
                subtitle="Revolutionary payment infrastructure built for the future of commerce"
                badgeColor="cyan"
              />
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <FeatureCard
                icon={DollarSign}
                title="0% Processing Fees"
                description="No payment processor fees. Network burn fees apply (0.25-5% based on ProofScore)."
                color="green"
              />
              <FeatureCard
                icon={Zap}
                title="Flexible Settlement"
                description="Direct payments settle instantly. Escrow mode holds funds until release."
                color="blue"
              />
              <FeatureCard
                icon={RefreshCw}
                title="STABLE-PAY"
                description="Auto-convert VFIDE → stablecoins via DEX. ~0.3% swap fees, 5% slippage protection."
                color="purple"
              />
              <FeatureCard
                icon={Shield}
                title="Trust Scoring"
                description="Real-time customer risk assessment. Know who you're dealing with before payment."
                color="orange"
              />
            </div>
          </motion.section>

          {/* Comparison Table */}
          <motion.section 
            variants={containerVariants}
            className="mb-16"
          >
            <SurfaceCard variant="default" interactive={false} className="p-8">
              <motion.div variants={itemVariants} className="text-center mb-8">
                <SectionHeading
                  badge="Proof over processors"
                  title="vs Traditional Processors"
                  subtitle="See how VFIDE compares to traditional payment solutions"
                  badgeColor="emerald"
                />
              </motion.div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="text-left py-4 px-4 text-gray-400 font-medium">Feature</th>
                      <th className="text-center py-4 px-4">
                        <AccentBadge label="VFIDE" color="emerald" />
                      </th>
                      <th className="text-center py-4 px-4 text-gray-500 font-medium">Stripe</th>
                      <th className="text-center py-4 px-4 text-gray-500 font-medium">Square</th>
                      <th className="text-center py-4 px-4 text-gray-500 font-medium">PayPal</th>
                    </tr>
                  </thead>
                  <motion.tbody variants={containerVariants}>
                    <ComparisonRow feature="Processing Fee" vfide="0%*" stripe="2.9% + $0.30" square="2.6% + $0.10" paypal="2.9% + $0.30" />
                    <ComparisonRow feature="Settlement Time" vfide="Instant" stripe="2-7 days" square="1-2 days" paypal="1-3 days" />
                    <ComparisonRow feature="Chargebacks" vfide="None" stripe="Yes ($15 fee)" square="Yes" paypal="Yes" />
                    <ComparisonRow feature="Trust Scoring" vfide="Yes" stripe="Basic" square="Basic" paypal="Basic" />
                    <ComparisonRow feature="Auto-Conversion" vfide="Yes" stripe="No" square="No" paypal="No" isLast />
                  </motion.tbody>
                </table>
              </div>

              <motion.p variants={itemVariants} className="text-xs text-gray-500 mt-6 text-center">
                *0% processing fees. Network burn fees (0.25-5% based on buyer ProofScore) are separate and go to deflationary burn.
              </motion.p>
            </SurfaceCard>
          </motion.section>

          {/* Getting Started */}
          <motion.section
            variants={containerVariants}
            className=""
          >
            <SurfaceCard variant="glow" interactive={false} className="p-8">
              <motion.div variants={itemVariants} className="flex items-center gap-3 mb-8">
                <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-white">Getting Started</h2>
                <span className="ml-auto text-sm text-blue-300 flex items-center gap-1">
                  3 simple steps <ArrowRight className="w-4 h-4" />
                </span>
              </motion.div>

              <div className="space-y-6">
                <Step
                  number={1}
                  title="Register Your Business"
                  description="Achieve ProofScore ≥5,600 and register your business details (takes 2 minutes)"
                />
                <Step
                  number={2}
                  title="Configure Settings"
                  description="Enable STABLE-PAY if you want automatic stablecoin conversion for received payments"
                />
                <Step
                  number={3}
                  title="Start Accepting Payments"
                  description="Share your merchant address, generate QR codes, or integrate our API/widget"
                />
              </div>
            </SurfaceCard>
          </motion.section>
        </div>
      </motion.div>
      
      <Footer />
    </>
  );
}

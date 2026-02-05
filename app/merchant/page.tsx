'use client';

import { Footer } from '@/components/layout/Footer';
import { MerchantDashboard } from '@/components/merchant/MerchantDashboard';
import { PaymentInterface } from '@/components/merchant/PaymentInterface';
import { PaymentQR } from '@/components/merchant/PaymentQR';
import { motion } from 'framer-motion';
import {
    ArrowRight,
    Check,
    CreditCard,
    DollarSign,
    QrCode,
    RefreshCw,
    Shield,
    Search,
    Sparkles,
    Store,
    SlidersHorizontal,
    Zap
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

const merchantExcellence = [
  {
    icon: Shield,
    title: 'Escrow-first protection',
    description: 'Auto-select escrow for new buyers, high-value carts, or high-risk scores. Instant settlement unlocks after trust thresholds.',
  },
  {
    icon: Zap,
    title: 'Smart settlement routing',
    description: 'Route funds instantly for trusted QR flows or hold in escrow for delivery-proof scenarios—always visible to both parties.',
  },
  {
    icon: CreditCard,
    title: 'ProofScore guardrails',
    description: 'Dynamic risk scoring, device reputation, and buyer history give merchants a clearer safety signal than chargebacks.',
  },
  {
    icon: RefreshCw,
    title: 'Stable settlement paths',
    description: 'STABLE-PAY auto-converts with slippage caps, keeping margins stable without manual FX or payout delays.',
  },
  {
    icon: QrCode,
    title: 'Instant QR checkout',
    description: 'Sub-5 second QR settlement for in-person commerce with tamper-proof receipts and offline fallbacks.',
  },
  {
    icon: Store,
    title: 'Merchant ops console',
    description: 'Unified view of disputes, payouts, inventory tie-ins, and loyalty rewards in one workflow.',
  },
];

const merchantDiscoveryFilters = [
  'Category',
  'Location',
  'Fulfillment',
  'Trust Score',
  'Escrow Required',
  'Instant Settlement'
];

const merchantDiscoverySignals = [
  {
    title: 'ProofScore + velocity checks',
    description: 'Rank merchants with verified reputations and consistent delivery performance.'
  },
  {
    title: 'Settlement reliability',
    description: 'Highlight merchants with escrow accuracy, low dispute rates, and fast resolution.'
  },
  {
    title: 'Customer satisfaction',
    description: 'Aggregate repeat purchase and verified review signals across the network.'
  }
];

const merchantDiscoveryResults = [
  {
    name: 'Solstice Apparel',
    category: 'Fashion • Global shipping',
    summary: 'Escrow-first storefront with instant QR pickup and 4.9 trust rating.'
  },
  {
    name: 'Arcstone Gadgets',
    category: 'Electronics • 2-day delivery',
    summary: 'ProofScore 9,400+, automated warranty issuance, zero-dispute track record.'
  },
  {
    name: 'Greenline Market',
    category: 'Grocery • Local pickup',
    summary: 'Instant settlement for in-person QR checks with verified freshness guarantees.'
  }
];

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
  color: 'green' | 'blue' | 'purple' | 'orange';
}) {
  const colorClasses = {
    green: { bg: 'from-emerald-500/20 to-green-500/10', border: 'border-emerald-500/30', text: 'text-emerald-400', glow: 'group-hover:shadow-emerald-500/20' },
    blue: { bg: 'from-blue-500/20 to-cyan-500/10', border: 'border-blue-500/30', text: 'text-blue-400', glow: 'group-hover:shadow-blue-500/20' },
    purple: { bg: 'from-purple-500/20 to-pink-500/10', border: 'border-purple-500/30', text: 'text-purple-400', glow: 'group-hover:shadow-purple-500/20' },
    orange: { bg: 'from-orange-500/20 to-amber-500/10', border: 'border-orange-500/30', text: 'text-orange-400', glow: 'group-hover:shadow-orange-500/20' },
  };

  const c = colorClasses[color];

  return (
    <motion.div
      variants={scaleVariants}
      whileHover={{ y: -5, scale: 1.02 }}
      className={`group relative p-6 rounded-2xl bg-gradient-to-br ${c.bg} border ${c.border} backdrop-blur-xl transition-all duration-300 hover:shadow-xl ${c.glow}`}
    >
      {/* Glow effect */}
      <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${c.bg} opacity-0 group-hover:opacity-50 blur-xl transition-opacity duration-300`} />
      
      <div className="relative z-10 text-center">
        <div className={`w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br ${c.bg} border ${c.border} flex items-center justify-center`}>
          <Icon className={`w-8 h-8 ${c.text}`} />
        </div>
        <h3 className={`font-bold text-lg mb-2 ${c.text}`}>{title}</h3>
        <p className="text-sm text-gray-400 leading-relaxed">{description}</p>
      </div>
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
      className={`${!isLast ? 'border-b border-white/5' : ''} group hover:bg-white/2 transition-colors`}
    >
      <td className="py-3 sm:py-4 px-2 sm:px-4 text-gray-300 font-medium text-sm">{feature}</td>
      <td className="py-3 sm:py-4 px-2 sm:px-4 text-center">
        <span className="inline-flex items-center gap-1.5 text-emerald-400 font-bold text-sm">
          {vfide === 'Yes' ? <Check className="w-4 h-4" /> : null}
          {vfide}
        </span>
      </td>
      <td className="py-3 sm:py-4 px-2 sm:px-4 text-center text-gray-500 text-sm">{stripe}</td>
      <td className="py-3 sm:py-4 px-2 sm:px-4 text-center text-gray-500 text-sm">{square}</td>
      <td className="py-3 sm:py-4 px-2 sm:px-4 text-center text-gray-500 text-sm">{paypal}</td>
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
      <div className="shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center font-bold text-white shadow-lg shadow-blue-500/20 group-hover:shadow-blue-500/40 transition-shadow">
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
      
      {/* Background effects */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(124,58,237,0.15),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(59,130,246,0.1),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(16,185,129,0.08),transparent_50%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-size-[4rem_4rem]" />
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
            {/* Floating icon */}
            <motion.div
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              className="inline-flex items-center justify-center w-24 h-24 mb-6 rounded-3xl bg-gradient-to-br from-purple-500 via-blue-500 to-cyan-500 shadow-2xl shadow-purple-500/30"
            >
              <Store className="w-12 h-12 text-white" />
            </motion.div>

            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black mb-6">
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-blue-400 to-cyan-400">
                Merchant Portal
              </span>
            </h1>

            <p className="text-xl text-gray-400 max-w-3xl mx-auto leading-relaxed">
              Accept VFIDE payments with <span className="text-emerald-400 font-semibold">0% protocol fees</span> • 
              Host storefronts on VFIDE or link external platforms • <span className="text-blue-400 font-semibold">STABLE-PAY</span> auto-conversion
            </p>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
              className="flex flex-wrap justify-center gap-3 text-xs uppercase tracking-[0.3em] text-gray-500 mt-6"
            >
              <span>Collect</span>
              <ArrowRight className="w-4 h-4 text-cyan-400" />
              <span>Convert</span>
              <ArrowRight className="w-4 h-4 text-cyan-400" />
              <span>Grow</span>
            </motion.div>

            {/* Trust badges */}
            <div className="flex flex-wrap justify-center gap-4 mt-8">
              {[
                { icon: Shield, text: 'Non-Custodial' },
                { icon: Zap, text: 'Instant Settlement' },
                { icon: Sparkles, text: 'Zero Fees' }
              ].map((badge, i) => (
                <motion.div
                  key={badge.text}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  whileHover={{ y: -2, scale: 1.02 }}
                  transition={{ delay: 0.5 + i * 0.1 }}
                  className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-sm text-gray-300"
                >
                  <badge.icon className="w-4 h-4 text-emerald-400" />
                  {badge.text}
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Main Dashboard Grid */}
          <motion.div variants={containerVariants} className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-16">
            {/* Merchant Dashboard Section */}
            <motion.div variants={itemVariants}>
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-xl bg-gradient-to-br from-purple-500/20 to-purple-500/5 border border-purple-500/20">
                  <Store className="w-5 h-5 text-purple-400" />
                </div>
                <h2 className="text-xl font-bold text-white">Merchant Dashboard</h2>
              </div>
              <MerchantDashboard />
            </motion.div>

            {/* Payment Interface Section */}
            <motion.div variants={itemVariants}>
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500/20 to-blue-500/5 border border-blue-500/20">
                  <CreditCard className="w-5 h-5 text-blue-400" />
                </div>
                <h2 className="text-xl font-bold text-white">Make Payment</h2>
              </div>
              <PaymentInterface />
            </motion.div>
          </motion.div>

          {/* QR Code Section */}
          <motion.div variants={itemVariants} className="mb-16">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-xl bg-gradient-to-br from-cyan-500/20 to-cyan-500/5 border border-cyan-500/20">
                <QrCode className="w-5 h-5 text-cyan-400" />
              </div>
              <h2 className="text-xl font-bold text-white">Generate Payment QR Code</h2>
            </div>
            <PaymentQR />
          </motion.div>

          {/* Features Section */}
          <motion.section variants={containerVariants} className="mb-16">
            <motion.div variants={itemVariants} className="text-center mb-10">
              <h2 className="text-3xl font-bold mb-4">
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-blue-400">
                  Why Choose VFIDE?
                </span>
              </h2>
              <p className="text-gray-400 max-w-2xl mx-auto">
                Revolutionary payment infrastructure built for the future of commerce
              </p>
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
                description="Instant settlement for trusted/QR flows. Escrow stays available for buyer protection."
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

          <motion.section variants={containerVariants} className="mb-16">
            <motion.div variants={itemVariants} className="text-center mb-10">
              <h2 className="text-3xl font-bold mb-4">
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400">
                  Merchant Excellence Stack
                </span>
              </h2>
              <p className="text-gray-400 max-w-2xl mx-auto">
                Built to be the safest and fastest way to accept crypto without sacrificing trust, liquidity, or customer experience.
              </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {merchantExcellence.map((item) => (
                <motion.div
                  key={item.title}
                  variants={scaleVariants}
                  whileHover={{ y: -4 }}
                  className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl"
                >
                  <div className="flex items-start gap-4">
                    <div className="rounded-2xl bg-white/10 p-3 text-cyan-200">
                      <item.icon className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-white font-semibold mb-1">{item.title}</h3>
                      <p className="text-sm text-gray-400">{item.description}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.section>
          <motion.section variants={containerVariants} className="mb-16">
            <motion.div variants={itemVariants} className="text-center mb-10">
              <h2 className="text-3xl font-bold mb-4">
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-cyan-400">
                  Merchant Presence Options
                </span>
              </h2>
              <p className="text-gray-400 max-w-2xl mx-auto">
                VFIDE supports a hybrid model: run your storefront on the VFIDE network or connect existing commerce platforms with verified payouts.
              </p>
            </motion.div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <motion.div
                variants={scaleVariants}
                whileHover={{ y: -4 }}
                className="rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 to-transparent p-6 backdrop-blur-xl"
              >
                <div className="flex items-start gap-4">
                  <div className="rounded-2xl bg-emerald-500/20 p-3 text-emerald-300">
                    <Store className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-white font-semibold mb-2">VFIDE-hosted storefronts</h3>
                    <p className="text-sm text-gray-400">
                      Launch on-chain storefronts with escrow-first defaults, ProofScore trust rails, and instant QR checkout for in-person payments.
                    </p>
                  </div>
                </div>
              </motion.div>
              <motion.div
                variants={scaleVariants}
                whileHover={{ y: -4 }}
                className="rounded-2xl border border-blue-500/20 bg-gradient-to-br from-blue-500/10 to-transparent p-6 backdrop-blur-xl"
              >
                <div className="flex items-start gap-4">
                  <div className="rounded-2xl bg-blue-500/20 p-3 text-blue-300">
                    <ArrowRight className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-white font-semibold mb-2">External platform links</h3>
                    <p className="text-sm text-gray-400">
                      Keep Shopify, Woo, or POS workflows—VFIDE handles escrow, settlement routing, and payout verification on top of your stack.
                    </p>
                  </div>
                </div>
              </motion.div>
            </div>
          </motion.section>

          <motion.section variants={containerVariants} className="mb-16">
            <motion.div variants={itemVariants} className="text-center mb-10">
              <h2 className="text-3xl font-bold mb-4">
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400">
                  Merchant Discovery & Search
                </span>
              </h2>
              <p className="text-gray-400 max-w-2xl mx-auto">
                Organize every storefront with layered filters, trust signals, and escrow-aware sorting so buyers can find the right merchant in seconds.
              </p>
            </motion.div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <motion.div
                variants={scaleVariants}
                whileHover={{ y: -3 }}
                className="rounded-2xl border border-cyan-500/20 bg-gradient-to-br from-cyan-500/10 to-transparent p-6 backdrop-blur-xl"
              >
                <div className="flex items-start gap-4">
                  <div className="rounded-2xl bg-cyan-500/20 p-3 text-cyan-300">
                    <Search className="w-6 h-6" />
                  </div>
                  <div className="flex-1 space-y-4">
                    <div>
                      <h3 className="text-white font-semibold mb-2">Unified merchant search</h3>
                      <p className="text-sm text-gray-400">
                        Search by brand, product, delivery speed, or escrow requirement. Results stay ranked by trust, fulfillment, and verified demand.
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {merchantDiscoveryFilters.map((filter) => (
                        <span
                          key={filter}
                          className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-gray-300"
                        >
                          {filter}
                        </span>
                      ))}
                    </div>
                    <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-gray-300">
                      <span className="flex items-center gap-2 text-gray-400">
                        <Search className="w-4 h-4" />
                        Search merchants, products, or locations
                      </span>
                      <span className="flex items-center gap-2 text-cyan-300">
                        <SlidersHorizontal className="w-4 h-4" />
                        Advanced filters
                      </span>
                    </div>
                  </div>
                </div>
              </motion.div>

              <motion.div
                variants={scaleVariants}
                whileHover={{ y: -3 }}
                className="rounded-2xl border border-purple-500/20 bg-gradient-to-br from-purple-500/10 to-transparent p-6 backdrop-blur-xl"
              >
                <div className="flex items-start gap-4">
                  <div className="rounded-2xl bg-purple-500/20 p-3 text-purple-300">
                    <Shield className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-white font-semibold mb-2">Ranking signals that matter</h3>
                    <p className="text-sm text-gray-400 mb-4">
                      Merchants surface based on escrow performance, ProofScore trust, verified reviews, and delivery reliability.
                    </p>
                    <div className="space-y-3">
                      {merchantDiscoverySignals.map((signal) => (
                        <div key={signal.title} className="rounded-xl border border-white/10 bg-white/5 p-3">
                          <div className="text-sm font-semibold text-white">{signal.title}</div>
                          <div className="text-xs text-gray-400">{signal.description}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>

            <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
              {merchantDiscoveryResults.map((merchant) => (
                <motion.div
                  key={merchant.name}
                  variants={scaleVariants}
                  whileHover={{ y: -4 }}
                  className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-xl"
                >
                  <div className="text-white font-semibold mb-1">{merchant.name}</div>
                  <div className="text-xs uppercase tracking-[0.2em] text-cyan-300 mb-3">{merchant.category}</div>
                  <p className="text-sm text-gray-400">{merchant.summary}</p>
                </motion.div>
              ))}
            </div>
          </motion.section>

          {/* Comparison Table */}
            <motion.section 
              variants={containerVariants}
              className="mb-16 p-8 rounded-3xl bg-white/2 border border-white/10 backdrop-blur-xl ring-effect"
            >
            <motion.div variants={itemVariants} className="text-center mb-8">
              <h2 className="text-3xl font-bold mb-4">
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-cyan-400">
                  vs Traditional Processors
                </span>
              </h2>
              <p className="text-gray-400">See how VFIDE compares to traditional payment solutions</p>
            </motion.div>

            <div
              className="table-responsive -mx-4 px-4 sm:mx-0 sm:px-0"
              role="region"
              aria-label="Processor comparison table"
              tabIndex={0}
            >
              <table className="w-full min-w-150">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left py-4 px-2 sm:px-4 text-gray-400 font-medium text-sm">Feature</th>
                    <th className="text-center py-4 px-2 sm:px-4">
                      <span className="px-2 sm:px-3 py-1 rounded-full bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 text-emerald-400 font-bold border border-emerald-500/30 text-xs sm:text-sm">
                        VFIDE
                      </span>
                    </th>
                    <th className="text-center py-4 px-2 sm:px-4 text-gray-500 font-medium text-sm">Stripe</th>
                    <th className="text-center py-4 px-2 sm:px-4 text-gray-500 font-medium text-sm">Square</th>
                    <th className="text-center py-4 px-2 sm:px-4 text-gray-500 font-medium text-sm">PayPal</th>
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
          </motion.section>

          {/* Getting Started */}
            <motion.section
              variants={containerVariants}
              className="p-8 rounded-3xl bg-gradient-to-br from-blue-500/10 via-purple-500/5 to-transparent border border-blue-500/20 backdrop-blur-xl ring-effect"
            >
            <motion.div variants={itemVariants} className="flex items-center gap-3 mb-8">
              <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-white">Getting Started</h2>
              <span className="ml-auto text-sm text-blue-400 flex items-center gap-1">
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
          </motion.section>
        </div>
      </motion.div>
      
      <Footer />
    </>
  );
}

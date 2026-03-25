'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Footer } from '@/components/layout/Footer';
import { useAccount } from 'wagmi';
import { 
  CreditCard, 
  Building2, 
  Wallet,
  Shield,
  ExternalLink,
  AlertCircle,
  Globe,
  Info,
  Copy,
  Check
} from 'lucide-react';

// =============================================================================
// FIAT ON-RAMP PROVIDERS
// These are third-party services that handle KYC and fiat processing
// VFIDE never touches fiat - providers send crypto directly to user wallets
// =============================================================================

interface FiatProvider {
  id: string;
  name: string;
  logo: string;
  description: string;
  methods: ('card' | 'bank' | 'apple_pay' | 'google_pay')[];
  fees: string;
  limits: { min: number; max: number };
  processingTime: string;
  countries: number;
  kycLevel: 'light' | 'standard' | 'full';
  supportedTokens: string[];
  status: 'active' | 'coming_soon';
  getUrl: (address: string, amount?: number) => string;
}

// Provider configurations
// In production, these would use environment variables for API keys
const FIAT_PROVIDERS: FiatProvider[] = [
  {
    id: 'moonpay',
    name: 'MoonPay',
    logo: '🌙',
    description: 'Industry-leading on-ramp with global coverage',
    methods: ['card', 'bank', 'apple_pay', 'google_pay'],
    fees: '3.5% - 4.5%',
    limits: { min: 20, max: 50000 },
    processingTime: 'Minutes',
    countries: 160,
    kycLevel: 'standard',
    supportedTokens: ['ETH', 'USDC', 'USDT', 'DAI'],
    status: 'active',
    getUrl: (address: string, amount?: number) => {
      const baseUrl = 'https://buy.moonpay.com';
      const params = new URLSearchParams({
        apiKey: process.env.NEXT_PUBLIC_MOONPAY_API_KEY || '',
        currencyCode: 'eth',
        walletAddress: address,
        colorCode: '#00FFB2', // Digital Jade
        ...(amount ? { baseCurrencyAmount: amount.toString() } : {})
      });
      return `${baseUrl}?${params.toString()}`;
    }
  },
  {
    id: 'transak',
    name: 'Transak',
    logo: '⚡',
    description: 'Developer-friendly with 100+ cryptocurrencies',
    methods: ['card', 'bank'],
    fees: '1% - 5%',
    limits: { min: 15, max: 25000 },
    processingTime: 'Minutes',
    countries: 150,
    kycLevel: 'light',
    supportedTokens: ['ETH', 'USDC', 'USDT', 'DAI', 'MATIC'],
    status: 'active',
    getUrl: (address: string, amount?: number) => {
      const baseUrl = 'https://global.transak.com';
      const params = new URLSearchParams({
        apiKey: process.env.NEXT_PUBLIC_TRANSAK_API_KEY || '',
        cryptoCurrencyCode: 'ETH',
        network: 'base',
        walletAddress: address,
        themeColor: '00FFB2',
        ...(amount ? { fiatAmount: amount.toString() } : {})
      });
      return `${baseUrl}?${params.toString()}`;
    }
  },
  {
    id: 'ramp',
    name: 'Ramp Network',
    logo: '🚀',
    description: 'Lowest fees with instant bank transfers',
    methods: ['card', 'bank', 'apple_pay'],
    fees: '0.5% - 2.9%',
    limits: { min: 5, max: 20000 },
    processingTime: 'Minutes',
    countries: 170,
    kycLevel: 'light',
    supportedTokens: ['ETH', 'USDC', 'DAI'],
    status: 'active',
    getUrl: (address: string, amount?: number) => {
      const baseUrl = 'https://app.ramp.network';
      const params = new URLSearchParams({
        hostApiKey: process.env.NEXT_PUBLIC_RAMP_API_KEY || '',
        swapAsset: 'BASE_ETH',
        userAddress: address,
        ...(amount ? { fiatValue: amount.toString() } : {})
      });
      return `${baseUrl}?${params.toString()}`;
    }
  },
  {
    id: 'coinbase',
    name: 'Coinbase Onramp',
    logo: '🔵',
    description: 'Trusted by millions, seamless Coinbase integration',
    methods: ['card', 'bank'],
    fees: '1% - 2%',
    limits: { min: 10, max: 100000 },
    processingTime: 'Minutes to Days',
    countries: 100,
    kycLevel: 'standard',
    supportedTokens: ['ETH', 'USDC', 'USDT'],
    status: 'coming_soon',
    getUrl: (address: string) => {
      return `https://pay.coinbase.com/buy?addresses={"${address}":["base"]}`;
    }
  }
];

const PAYMENT_METHODS = {
  card: { icon: CreditCard, label: 'Card', color: 'text-blue-400' },
  bank: { icon: Building2, label: 'Bank', color: 'text-green-400' },
  apple_pay: { icon: Wallet, label: 'Apple Pay', color: 'text-zinc-100' },
  google_pay: { icon: Wallet, label: 'Google Pay', color: 'text-amber-400' }
};

export default function BuyPage() {
  const { address, isConnected } = useAccount();
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [amount, setAmount] = useState<string>('100');
  const [copied, setCopied] = useState(false);

  // Handle provider selection
  const handleBuy = useCallback((provider: FiatProvider) => {
    if (!address) return;
    
    const url = provider.getUrl(address, parseFloat(amount) || undefined);
    window.open(url, '_blank', 'noopener,noreferrer');
  }, [address, amount]);

  // Copy address
  const handleCopyAddress = useCallback(() => {
    if (address) {
      navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [address]);

  const activeProviders = FIAT_PROVIDERS.filter(p => p.status === 'active');
  const comingSoonProviders = FIAT_PROVIDERS.filter(p => p.status === 'coming_soon');

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-950">
      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-jade-500/10 rounded-full text-jade-400 text-sm font-medium mb-4">
            <CreditCard size={16} />
            Fiat On-Ramp
          </div>
          <h1 className="text-4xl font-bold text-white">Buy Crypto</h1>
          <p className="text-zinc-400 mt-2">Purchase ETH & stablecoins with card or bank transfer</p>
        </div>

        {/* Important Notice */}
        <div className="mb-8 p-4 bg-jade-500/10 border border-jade-500/30 rounded-xl">
          <div className="flex items-start gap-3">
            <Shield className="text-jade-400 shrink-0 mt-1" size={20} />
            <div>
              <p className="font-semibold text-jade-300">How It Works</p>
              <p className="text-jade-200/80 text-sm mt-1">
                VFIDE partners with licensed payment providers. You complete purchase with them,
                and crypto is sent directly to your wallet. VFIDE never handles fiat or your payment info.
              </p>
            </div>
          </div>
        </div>

        {/* Wallet Connection Check */}
        {!isConnected ? (
          <div className="p-8 bg-zinc-900/50 border border-zinc-700 rounded-xl text-center">
            <Wallet className="text-zinc-600 mx-auto mb-4" size={48} />
            <h3 className="text-lg font-semibold text-white mb-2">Connect Your Wallet</h3>
            <p className="text-zinc-400 mb-4">Connect your wallet to receive purchased crypto</p>
          </div>
        ) : (
          <>
            {/* Receiving Address */}
            <div className="mb-6 p-4 bg-zinc-900/50 border border-zinc-700 rounded-xl">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-zinc-400">Crypto will be sent to:</p>
                  <p className="font-mono text-white text-sm mt-1">
                    {address?.slice(0, 10)}...{address?.slice(-8)}
                  </p>
                </div>
                <button
                  onClick={handleCopyAddress}
                  className="p-2 bg-zinc-800 rounded-lg hover:bg-zinc-700"
                >
                  {copied ? <Check className="text-jade-400" size={18} /> : <Copy className="text-zinc-400" size={18} />}
                </button>
              </div>
            </div>

            {/* Amount Input */}
            <div className="mb-8 p-6 bg-zinc-900/50 border border-zinc-700 rounded-xl">
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Amount (USD)
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400">$</span>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="100"
                    className="w-full pl-8 pr-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-xl font-semibold focus:outline-none focus:border-jade-500"
                  />
                </div>
                <div className="flex gap-2">
                  {[50, 100, 250, 500].map(val => (
                    <button
                      key={val}
                      onClick={() => setAmount(val.toString())}
                      className={`px-4 py-2 rounded-lg font-medium ${
                        amount === val.toString()
                          ? 'bg-jade-500/20 text-jade-400 border border-jade-500/30'
                          : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                      }`}
                    >
                      ${val}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Provider Selection */}
            <div className="mb-8">
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Globe className="text-jade-400" size={20} />
                Choose a Provider
              </h2>
              <div className="space-y-4">
                {activeProviders.map(provider => (
                  <motion.div
                    key={provider.id}
                    whileHover={{ scale: 1.01 }}
                    className={`p-5 bg-zinc-900/50 border rounded-xl cursor-pointer transition-all ${
                      selectedProvider === provider.id
                        ? 'border-jade-400 bg-jade-500/5'
                        : 'border-zinc-700 hover:border-zinc-600'
                    }`}
                    onClick={() => setSelectedProvider(provider.id)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4">
                        <div className="text-4xl">{provider.logo}</div>
                        <div>
                          <h3 className="text-lg font-semibold text-white">{provider.name}</h3>
                          <p className="text-sm text-zinc-400 mt-1">{provider.description}</p>
                          
                          {/* Payment Methods */}
                          <div className="flex items-center gap-2 mt-3">
                            {provider.methods.map(method => {
                              const config = PAYMENT_METHODS[method];
                              const Icon = config.icon;
                              return (
                                <div key={method} className={`flex items-center gap-1 px-2 py-1 bg-zinc-800 rounded text-xs ${config.color}`}>
                                  <Icon size={12} />
                                  {config.label}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <div className="text-jade-400 font-bold">{provider.fees}</div>
                        <div className="text-xs text-zinc-400 mt-1">{provider.processingTime}</div>
                      </div>
                    </div>

                    {/* Expanded Details */}
                    <AnimatePresence>
                      {selectedProvider === provider.id && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="mt-4 pt-4 border-t border-zinc-700">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                              <div>
                                <p className="text-xs text-zinc-500">Min/Max</p>
                                <p className="text-sm text-white">${provider.limits.min} - ${provider.limits.max.toLocaleString()}</p>
                              </div>
                              <div>
                                <p className="text-xs text-zinc-500">Countries</p>
                                <p className="text-sm text-white">{provider.countries}+</p>
                              </div>
                              <div>
                                <p className="text-xs text-zinc-500">KYC Level</p>
                                <p className="text-sm text-white capitalize">{provider.kycLevel}</p>
                              </div>
                              <div>
                                <p className="text-xs text-zinc-500">Tokens</p>
                                <p className="text-sm text-white">{provider.supportedTokens.join(', ')}</p>
                              </div>
                            </div>
                            
                            <button
                              onClick={() => handleBuy(provider)}
                              className="w-full py-3 bg-gradient-to-r from-jade-500 to-teal-500 text-black font-semibold rounded-lg flex items-center justify-center gap-2"
                            >
                              Buy with {provider.name}
                              <ExternalLink size={16} />
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Coming Soon Providers */}
            {comingSoonProviders.length > 0 && (
              <div className="mb-8">
                <h3 className="text-sm font-medium text-zinc-500 mb-3">Coming Soon</h3>
                <div className="grid grid-cols-2 gap-3">
                  {comingSoonProviders.map(provider => (
                    <div key={provider.id} className="p-4 bg-zinc-900/30 border border-zinc-800 rounded-xl opacity-60">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{provider.logo}</span>
                        <div>
                          <p className="font-medium text-white">{provider.name}</p>
                          <p className="text-xs text-zinc-500">{provider.fees}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* How It Works */}
        <div className="mt-12 p-6 bg-zinc-900/50 border border-zinc-700 rounded-xl">
          <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
            <Info className="text-jade-400" size={20} />
            How Fiat On-Ramp Works
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="w-12 h-12 bg-jade-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-jade-400 font-bold">1</span>
              </div>
              <p className="font-medium text-white text-sm">Choose Provider</p>
              <p className="text-xs text-zinc-500 mt-1">Select based on fees & methods</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-jade-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-jade-400 font-bold">2</span>
              </div>
              <p className="font-medium text-white text-sm">Complete KYC</p>
              <p className="text-xs text-zinc-500 mt-1">Verify identity with provider</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-jade-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-jade-400 font-bold">3</span>
              </div>
              <p className="font-medium text-white text-sm">Pay with Card/Bank</p>
              <p className="text-xs text-zinc-500 mt-1">Secure payment processing</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-jade-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-jade-400 font-bold">4</span>
              </div>
              <p className="font-medium text-white text-sm">Receive Crypto</p>
              <p className="text-xs text-zinc-500 mt-1">Sent directly to your wallet</p>
            </div>
          </div>
        </div>

        {/* FAQ */}
        <div className="mt-8 p-6 bg-zinc-900/50 border border-zinc-700 rounded-xl">
          <h3 className="text-lg font-semibold text-white mb-4">Frequently Asked Questions</h3>
          <div className="space-y-4">
            <div>
              <p className="font-medium text-white">Does VFIDE handle my payment?</p>
              <p className="text-sm text-zinc-400 mt-1">
                No. VFIDE never handles fiat currency or payment information. You pay directly to licensed 
                third-party providers who send crypto to your wallet.
              </p>
            </div>
            <div>
              <p className="font-medium text-white">Why do I need to complete KYC?</p>
              <p className="text-sm text-zinc-400 mt-1">
                Payment providers are legally required to verify identity for fiat transactions. 
                VFIDE never sees or stores your KYC documents.
              </p>
            </div>
            <div>
              <p className="font-medium text-white">Which provider should I choose?</p>
              <p className="text-sm text-zinc-400 mt-1">
                Ramp Network has the lowest fees (0.5-2.9%). MoonPay has the best global coverage. 
                Choose based on your country and payment method.
              </p>
            </div>
          </div>
        </div>

        {/* Regulatory Disclaimer */}
        <div className="mt-8 p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl">
          <div className="flex items-start gap-3">
            <AlertCircle className="text-amber-400 shrink-0 mt-1" size={20} />
            <div>
              <p className="font-semibold text-amber-300">Important Notice</p>
              <p className="text-amber-200/80 text-sm mt-1">
                Fiat on-ramp services are provided by independent, licensed third parties. VFIDE is not 
                a money transmitter and does not process fiat payments. Availability varies by jurisdiction.
              </p>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}

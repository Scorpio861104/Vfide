"use client";

import { GlobalNav } from '@/components/layout/GlobalNav'
import { Footer } from '@/components/layout/Footer'
import { MerchantDashboard } from '@/components/merchant/MerchantDashboard'
import { PaymentInterface } from '@/components/merchant/PaymentInterface'
import { PaymentQR } from '@/components/merchant/PaymentQR'
import { Store, CreditCard, QrCode } from 'lucide-react'

export default function MerchantPage() {
  return (
    <>
      <GlobalNav />
      <div className="min-h-screen bg-gradient-to-b from-gray-950 to-black text-white pt-20">
        <div className="container mx-auto px-4 py-12 max-w-6xl">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-purple-500 to-blue-600 rounded-2xl mb-4">
              <Store className="w-10 h-10" />
            </div>
            <h1 className="text-5xl font-black mb-4 bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-blue-400 to-pink-400">
              Merchant Portal
            </h1>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto">
              Accept VFIDE payments with 0% protocol fees • Direct or Escrow modes • Optional STABLE-PAY auto-conversion
            </p>
          </div>

          {/* Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
            {/* Left Column: Merchant Dashboard */}
            <div>
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                <Store className="w-6 h-6 text-purple-400" />
                Merchant Dashboard
              </h2>
              <MerchantDashboard />
            </div>

            {/* Right Column: Payment Interface */}
            <div>
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                <CreditCard className="w-6 h-6 text-blue-400" />
                Make Payment
              </h2>
              <PaymentInterface />
            </div>
          </div>

          {/* QR Code Section - Full Width */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
              <QrCode className="w-6 h-6 text-cyan-400" />
              Generate Payment QR Code
            </h2>
            <PaymentQR />
          </div>

          {/* Features Section */}
          <div className="bg-gradient-to-br from-purple-900/10 to-blue-900/10 border border-purple-500/20 rounded-2xl p-8">
            <h3 className="text-2xl font-bold mb-6 text-center">Why Choose VFIDE Merchant Portal?</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-3 bg-green-600/20 border-2 border-green-500 rounded-xl flex items-center justify-center">
                  <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </div>
                <div className="font-bold text-green-400 mb-2">0% Processing Fees</div>
                <div className="text-xs text-gray-400">
                  No payment processor fees. Network burn fees apply (0.25-5% based on ProofScore).
                </div>
              </div>

              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-3 bg-blue-600/20 border-2 border-blue-500 rounded-xl flex items-center justify-center">
                  <svg className="w-8 h-8 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                </div>
                <div className="font-bold text-blue-400 mb-2">Flexible Settlement</div>
                <div className="text-xs text-gray-400">
                  Direct payments settle instantly. Escrow mode holds funds until release. Your choice per transaction.
                </div>
              </div>

              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-3 bg-purple-600/20 border-2 border-purple-500 rounded-xl flex items-center justify-center">
                  <svg className="w-8 h-8 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                </div>
                <div className="font-bold text-purple-400 mb-2">STABLE-PAY (Optional)</div>
                <div className="text-xs text-gray-400">
                  Auto-convert VFIDE → stablecoins via DEX. DEX swap fees ~0.3% apply. 5% slippage protection.
                </div>
              </div>

              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-3 bg-orange-600/20 border-2 border-orange-500 rounded-xl flex items-center justify-center">
                  <svg className="w-8 h-8 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                </div>
                <div className="font-bold text-orange-400 mb-2">Trust Scoring</div>
                <div className="text-xs text-gray-400">
                  Real-time customer risk assessment. Know who you&apos;re dealing with before payment.
                </div>
              </div>
            </div>
          </div>

          {/* Comparison Table */}
          <div className="mt-8 bg-gray-900/50 border border-gray-700 rounded-2xl p-8">
            <h3 className="text-2xl font-bold mb-6 text-center">vs Traditional Payment Processors</h3>
            
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="text-left py-3 px-4">Feature</th>
                    <th className="text-center py-3 px-4 text-green-400">VFIDE</th>
                    <th className="text-center py-3 px-4 text-gray-400">Stripe</th>
                    <th className="text-center py-3 px-4 text-gray-400">Square</th>
                    <th className="text-center py-3 px-4 text-gray-400">PayPal</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-gray-800">
                    <td className="py-3 px-4">Processing Fee</td>
                    <td className="text-center py-3 px-4 text-green-400 font-bold">0%*</td>
                    <td className="text-center py-3 px-4">2.9% + $0.30</td>
                    <td className="text-center py-3 px-4">2.6% + $0.10</td>
                    <td className="text-center py-3 px-4">2.9% + $0.30</td>
                  </tr>
                  <tr className="border-b border-gray-800">
                    <td className="py-3 px-4">Settlement Time</td>
                    <td className="text-center py-3 px-4 text-green-400 font-bold">Instant</td>
                    <td className="text-center py-3 px-4">2-7 days</td>
                    <td className="text-center py-3 px-4">1-2 days</td>
                    <td className="text-center py-3 px-4">1-3 days</td>
                  </tr>
                  <tr className="border-b border-gray-800">
                    <td className="py-3 px-4">Chargebacks</td>
                    <td className="text-center py-3 px-4 text-green-400 font-bold">None</td>
                    <td className="text-center py-3 px-4">Yes ($15 fee)</td>
                    <td className="text-center py-3 px-4">Yes</td>
                    <td className="text-center py-3 px-4">Yes</td>
                  </tr>
                  <tr className="border-b border-gray-800">
                    <td className="py-3 px-4">Trust Scoring</td>
                    <td className="text-center py-3 px-4 text-green-400 font-bold">Yes</td>
                    <td className="text-center py-3 px-4">Basic</td>
                    <td className="text-center py-3 px-4">Basic</td>
                    <td className="text-center py-3 px-4">Basic</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4">Auto-Conversion</td>
                    <td className="text-center py-3 px-4 text-green-400 font-bold">Yes (STABLE-PAY)</td>
                    <td className="text-center py-3 px-4">No</td>
                    <td className="text-center py-3 px-4">No</td>
                    <td className="text-center py-3 px-4">No</td>
                  </tr>
                </tbody>
              </table>
              <p className="text-xs text-gray-500 mt-4">
                *0% processing fees. Network burn fees (0.25-5% based on buyer ProofScore) are separate from processing fees and go to deflationary burn, not VFIDE.
              </p>
            </div>
          </div>

          {/* Getting Started */}
          <div className="mt-8 bg-blue-900/10 border border-blue-500/20 rounded-xl p-6">
            <h3 className="font-bold text-lg mb-3 text-blue-400">Getting Started (3 Steps)</h3>
            <div className="space-y-2 text-sm text-gray-400">
              <div><strong className="text-white">1. Register:</strong> Achieve ProofScore ≥5,600 and register your business (takes 2 minutes)</div>
              <div><strong className="text-white">2. Configure:</strong> Enable STABLE-PAY if you want automatic stablecoin conversion</div>
              <div><strong className="text-white">3. Accept Payments:</strong> Share your merchant address or integrate our API/widget</div>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </>
  )
}

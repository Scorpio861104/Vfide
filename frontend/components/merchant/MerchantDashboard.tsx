/**
 * MerchantDashboard - Complete merchant management interface
 */

'use client'

import { useState } from 'react'
import {
  useIsMerchant,
  useRegisterMerchant,
  useSetAutoConvert,
  useSetPayoutAddress,
  useProofScore,
} from '@/lib/vfide-hooks'
import { useAccount } from 'wagmi'
import { Store, DollarSign, Settings, Zap, Shield } from 'lucide-react'
import { isAddress } from 'viem'

export function MerchantDashboard() {
  const { address } = useAccount()
  const merchantInfo = useIsMerchant(address)
  const { registerMerchant, isRegistering, isSuccess: registrationSuccess } = useRegisterMerchant()
  const { setAutoConvert, isSetting: isSettingConvert, isSuccess: convertSuccess } = useSetAutoConvert()
  const { setPayoutAddress, isSetting: isSettingPayout, isSuccess: payoutSuccess } = useSetPayoutAddress()
  const { score, canMerchant } = useProofScore(address)
  
  const [businessName, setBusinessName] = useState('')
  const [category, setCategory] = useState('retail')
  const [autoConvertEnabled, setAutoConvertEnabled] = useState(false)
  const [customPayout, setCustomPayout] = useState('')

  const categories = [
    'retail', 'services', 'digital_goods', 'food_beverage', 
    'professional_services', 'education', 'entertainment', 'other'
  ]

  if (!address) {
    return (
      <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-8 text-center">
        <Store className="w-12 h-12 mx-auto mb-4 text-gray-600" />
        <p className="text-gray-400">Connect wallet to access merchant dashboard</p>
      </div>
    )
  }

  // Registration Flow
  if (!merchantInfo.isMerchant) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-br from-purple-900/20 to-blue-900/20 border-2 border-purple-500/30 rounded-xl p-8">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-blue-500 rounded-xl flex items-center justify-center">
              <Store className="w-8 h-8 text-white" />
            </div>
            <div>
              <h2 className="text-3xl font-bold">Become a Merchant</h2>
              <p className="text-gray-400">Accept VFIDE payments with 0% protocol fees</p>
            </div>
          </div>
        </div>

        {/* Requirements Check */}
        <div className="bg-gray-900/50 border border-gray-700 rounded-xl p-6">
          <h3 className="font-bold text-lg mb-4">Requirements</h3>
          <div className="space-y-3">
            <div className={`flex items-center gap-3 ${score >= 5600 ? 'text-green-400' : 'text-red-400'}`}>
              {score >= 5600 ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              )}
              <span>ProofScore ≥ 5,600 (Current: {score.toLocaleString()})</span>
            </div>
            {!canMerchant && (
              <div className="bg-orange-900/20 border border-orange-500/30 rounded-lg p-3 text-sm text-orange-400">
                Increase your ProofScore by: Receiving endorsements, participating in governance, or becoming a mentor
              </div>
            )}
          </div>
        </div>

        {/* Registration Form */}
        {canMerchant && (
          <div className="bg-gray-900/50 border border-gray-700 rounded-xl p-6">
            <h3 className="font-bold text-lg mb-4">Register Your Business</h3>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-400 mb-2 block">Business Name</label>
                <input
                  type="text"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="e.g., Acme Coffee Shop"
                  className="w-full bg-black/40 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-sm text-gray-400 mb-2 block">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-black/40 border border-gray-600 rounded-lg px-4 py-3 text-white focus:border-purple-500 focus:outline-none"
                >
                  {categories.map(cat => (
                    <option key={cat} value={cat}>
                      {cat.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={() => registerMerchant(businessName, category)}
                disabled={isRegistering || !businessName.trim()}
                className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:from-gray-700 disabled:to-gray-700 disabled:text-gray-500 text-white font-bold py-3 rounded-lg transition-all"
              >
                {isRegistering ? 'Registering...' : 'Register as Merchant'}
              </button>

              {registrationSuccess && (
                <div className="bg-green-900/20 border border-green-500 rounded-lg p-3 text-center text-green-400 text-sm">
                  ✅ Registration successful! Refreshing...
                </div>
              )}
            </div>
          </div>
        )}

        {/* Benefits */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-blue-900/10 border border-blue-500/20 rounded-lg p-4">
            <DollarSign className="w-8 h-8 text-blue-400 mb-2" />
            <div className="font-bold text-blue-400 mb-1">No Processor Fees</div>
            <div className="text-xs text-gray-400">No payment processing fees. Burn fees (0.25-5%) + zkSync gas apply.</div>
          </div>

          <div className="bg-green-900/10 border border-green-500/20 rounded-lg p-4">
            <Zap className="w-8 h-8 text-green-400 mb-2" />
            <div className="font-bold text-green-400 mb-1">Fast Settlement</div>
            <div className="text-xs text-gray-400">Direct payments settle instantly. Escrow mode holds funds until release condition met.</div>
          </div>

          <div className="bg-purple-900/10 border border-purple-500/20 rounded-lg p-4">
            <Shield className="w-8 h-8 text-purple-400 mb-2" />
            <div className="font-bold text-purple-400 mb-1">STABLE-PAY (Optional)</div>
            <div className="text-xs text-gray-400">Auto-convert to stablecoins via DEX. ~0.3% DEX swap fee + gas apply.</div>
          </div>
        </div>
      </div>
    )
  }

  // Merchant Dashboard
  return (
    <div className="space-y-6">
      {/* Status Header */}
      <div className="bg-gradient-to-br from-green-900/20 to-emerald-900/20 border-2 border-green-500/30 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-green-600 rounded-xl flex items-center justify-center">
              <Store className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="text-sm text-gray-400">Registered Merchant</div>
              <div className="text-2xl font-bold">{merchantInfo.businessName}</div>
            </div>
          </div>
          {merchantInfo.isSuspended && (
            <div className="bg-red-600 px-4 py-2 rounded-lg font-bold">
              SUSPENDED
            </div>
          )}
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <div className="text-3xl font-bold text-green-400">{merchantInfo.totalVolume}</div>
            <div className="text-xs text-gray-400">Total Volume (VFIDE)</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-blue-400">{merchantInfo.txCount}</div>
            <div className="text-xs text-gray-400">Transactions</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-purple-400">
              {merchantInfo.category.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
            </div>
            <div className="text-xs text-gray-400">Category</div>
          </div>
        </div>
      </div>

      {/* Settings Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* STABLE-PAY Settings */}
        <div className="bg-gray-900/50 border border-gray-700 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Zap className="w-6 h-6 text-yellow-400" />
            <div className="font-bold text-lg">STABLE-PAY</div>
          </div>

          <p className="text-sm text-gray-400 mb-4">
            Auto-convert VFIDE payments to stablecoins via DEX swap to protect against volatility.
            DEX swap fees (~0.3%) + gas costs apply. 5% max slippage protection included.
          </p>

          <div className="flex items-center justify-between mb-4">
            <span className="text-white">Auto-Convert Enabled</span>
            <button
              onClick={() => {
                setAutoConvert(!autoConvertEnabled)
                setAutoConvertEnabled(!autoConvertEnabled)
              }}
              disabled={isSettingConvert}
              className={`w-14 h-8 rounded-full transition-colors ${
                autoConvertEnabled ? 'bg-green-600' : 'bg-gray-600'
              } relative`}
            >
              <div
                className={`w-6 h-6 bg-white rounded-full absolute top-1 transition-transform ${
                  autoConvertEnabled ? 'translate-x-7' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {convertSuccess && (
            <div className="bg-green-900/20 border border-green-500 rounded-lg p-2 text-center text-green-400 text-xs">
              ✅ Settings updated
            </div>
          )}
        </div>

        {/* Payout Settings */}
        <div className="bg-gray-900/50 border border-gray-700 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Settings className="w-6 h-6 text-blue-400" />
            <div className="font-bold text-lg">Payout Address</div>
          </div>

          <p className="text-sm text-gray-400 mb-4">
            Set a custom address to receive payments (e.g., Treasury or RevenueSplitter).
            Leave empty to use your vault.
          </p>

          <div className="space-y-3">
            <input
              type="text"
              value={customPayout}
              onChange={(e) => setCustomPayout(e.target.value)}
              placeholder="0x... (optional)"
              className="w-full bg-black/40 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none text-sm"
            />

            <button
              onClick={() => setPayoutAddress(customPayout as `0x${string}`)}
              disabled={isSettingPayout || !isAddress(customPayout)}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:text-gray-500 text-white font-bold py-2 rounded-lg transition-colors text-sm"
            >
              {isSettingPayout ? 'Updating...' : 'Update Payout Address'}
            </button>

            {payoutSuccess && (
              <div className="bg-green-900/20 border border-green-500 rounded-lg p-2 text-center text-green-400 text-xs">
                ✅ Payout address updated
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Integration Guide */}
      <div className="bg-blue-900/10 border border-blue-500/20 rounded-xl p-6">
        <h3 className="font-bold text-lg mb-3 text-blue-400">Integration Guide</h3>
        <div className="space-y-2 text-sm text-gray-400">
          <div><strong className="text-white">1. QR Code:</strong> Generate payment QR codes with your merchant address</div>
          <div><strong className="text-white">2. API:</strong> Use MerchantPortal.processPayment() in your backend</div>
          <div><strong className="text-white">3. Widget:</strong> Embed VFIDE payment widget on your website</div>
          <div><strong className="text-white">4. PoS:</strong> Connect hardware terminals via our SDK</div>
        </div>
      </div>
    </div>
  )
}

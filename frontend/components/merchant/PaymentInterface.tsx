/**
 * PaymentInterface - Customer payment UI for paying merchants
 */

'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  usePayMerchant,
  useCustomerTrustScore,
  useIsMerchant,
  useProofScore,
  useVaultBalance,
} from '@/lib/vfide-hooks'
import { useAccount } from 'wagmi'
import { CONTRACT_ADDRESSES } from '@/lib/contracts'
import { CreditCard, AlertCircle, CheckCircle } from 'lucide-react'
import { isAddress } from 'viem'

export function PaymentInterface() {
  const { address } = useAccount()
  const [merchantAddress, setMerchantAddress] = useState('')
  const [amount, setAmount] = useState('')
  const [orderId, setOrderId] = useState('')
  
  const { payMerchant, isPaying, isSuccess, error } = usePayMerchant()
  const merchantInfo = useIsMerchant(merchantAddress as `0x${string}` | undefined)
  const trustScore = useCustomerTrustScore(address)
  const { score } = useProofScore(address)
  const { balance: vaultBalance } = useVaultBalance()

  const handlePayment = () => {
    if (!merchantAddress || !amount || !orderId) return
    
    payMerchant(
      merchantAddress as `0x${string}`,
      CONTRACT_ADDRESSES.VFIDEToken,
      amount,
      orderId
    )
  }

  const isValidMerchant = isAddress(merchantAddress) && merchantInfo.isMerchant && !merchantInfo.isSuspended

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-br from-blue-900/20 to-purple-900/20 border-2 border-blue-500/30 rounded-xl p-6">
        <div className="flex items-center gap-3">
          <CreditCard className="w-10 h-10 text-blue-400" />
          <div>
            <h2 className="text-2xl font-bold">Pay Merchant</h2>
            <p className="text-gray-400">Direct payment (instant settlement)</p>
          </div>
        </div>
      </div>

      {/* Trust Score Display */}
      {address && (
        <div className="bg-gray-900/50 border border-gray-700 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-400">Your Trust Score</div>
              <div className="text-2xl font-bold" style={{ color: trustScore.highTrust ? '#00FF88' : trustScore.lowTrust ? '#FF4444' : '#FFD700' }}>
                {score.toLocaleString()}
              </div>
            </div>
            <div className="text-right">
              <div className={`px-3 py-1 rounded-full text-sm font-bold ${
                trustScore.highTrust ? 'bg-green-900/30 text-green-400' :
                trustScore.lowTrust ? 'bg-red-900/30 text-red-400' :
                'bg-yellow-900/30 text-yellow-400'
              }`}>
                {trustScore.highTrust ? 'High Trust' : trustScore.lowTrust ? 'Low Trust' : 'Neutral'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Payment Form */}
      <div className="bg-gray-900/50 border border-gray-700 rounded-xl p-6">
        <div className="space-y-4" role="form" aria-label="Payment form">
          {/* Merchant Address */}
          <div>
            <label htmlFor="merchant-address" className="text-sm text-gray-400 mb-2 block">Merchant Address</label>
            <input
              id="merchant-address"
              type="text"
              value={merchantAddress}
              onChange={(e) => setMerchantAddress(e.target.value)}
              placeholder="0x..."
              aria-describedby="merchant-status"
              className="w-full bg-black/40 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
            />
            {merchantAddress && (
              <div className="mt-2" id="merchant-status" role="status">
                {isAddress(merchantAddress) ? (
                  merchantInfo.isMerchant ? (
                    merchantInfo.isSuspended ? (
                      <div className="flex items-center gap-2 text-red-400 text-sm">
                        <AlertCircle className="w-4 h-4" />
                        Merchant suspended
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-green-400 text-sm">
                        <CheckCircle className="w-4 h-4" />
                        {merchantInfo.businessName} ({merchantInfo.category})
                      </div>
                    )
                  ) : (
                    <div className="flex items-center gap-2 text-orange-400 text-sm">
                      <AlertCircle className="w-4 h-4" />
                      Not a registered merchant
                    </div>
                  )
                ) : (
                  <div className="text-red-400 text-sm">Invalid address</div>
                )}
              </div>
            )}
          </div>

          {/* Amount */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label htmlFor="payment-amount" className="text-sm text-gray-400">Amount (VFIDE)</label>
              <button
                type="button"
                onClick={() => setAmount(vaultBalance || '0')}
                className="text-xs text-blue-400 hover:text-blue-300 font-bold"
                aria-label="Set maximum available balance"
              >
                MAX
              </button>
            </div>
            <input
              id="payment-amount"
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              step="0.01"
              min="0"
              aria-describedby="amount-hint"
              className="w-full bg-black/40 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
            />
            <span id="amount-hint" className="sr-only">Enter the amount of VFIDE to send</span>
          </div>

          {/* Order ID */}
          <div>
            <label htmlFor="order-id" className="text-sm text-gray-400 mb-2 block">Order ID / Reference</label>
            <input
              id="order-id"
              type="text"
              value={orderId}
              onChange={(e) => setOrderId(e.target.value)}
              placeholder="INV-12345"
              className="w-full bg-black/40 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
            />
          </div>

          {/* Pay Button */}
          <button
            onClick={handlePayment}
            disabled={isPaying || !isValidMerchant || !amount || !orderId || !trustScore.eligible}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-700 disabled:to-gray-700 disabled:text-gray-500 text-white font-bold py-4 rounded-lg transition-all text-lg"
          >
            {isPaying ? 'Processing...' : !trustScore.eligible ? 'Vault Locked or Missing' : `Pay ${amount || '0'} VFIDE`}
          </button>

          {isSuccess && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-green-900/20 border-2 border-green-500 rounded-xl p-4 text-center"
            >
              <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-2" />
              <div className="text-green-400 font-bold text-lg">Payment Successful!</div>
              <div className="text-sm text-gray-400 mt-1">Order ID: {orderId}</div>
            </motion.div>
          )}
        </div>
      </div>

      {/* Features */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-blue-900/10 border border-blue-500/20 rounded-lg p-4 text-center">
          <svg className="w-6 h-6 mx-auto mb-2 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
          <div className="font-bold text-blue-400 text-sm">Direct Payment</div>
          <div className="text-xs text-gray-400">Instant settlement</div>
        </div>

        <div className="bg-green-900/10 border border-green-500/20 rounded-lg p-4 text-center">
          <svg className="w-6 h-6 mx-auto mb-2 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
          <div className="font-bold text-green-400 text-sm">Secure</div>
          <div className="text-xs text-gray-400">Trust-score verified</div>
        </div>

        <div className="bg-purple-900/10 border border-purple-500/20 rounded-lg p-4 text-center">
          <svg className="w-6 h-6 mx-auto mb-2 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          <div className="font-bold text-purple-400 text-sm">No Processor Fees</div>
          <div className="text-xs text-gray-400">Burn + gas fees apply</div>
        </div>
      </div>

      {/* Info */}
      {!trustScore.eligible && address && (
        <div className="bg-orange-900/20 border border-orange-500/30 rounded-lg p-4">
          <div className="flex items-center gap-2 text-orange-400">
            <AlertCircle className="w-5 h-5" />
            <div className="text-sm">
              <strong>Cannot process payment:</strong> Your vault is locked or doesn&apos;t exist. 
              Create a vault or check security status.
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

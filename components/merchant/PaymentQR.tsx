/**
 * PaymentQR - Generate QR codes for customers to scan and pay
 */

'use client'

import { useEffect, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { useAccount } from 'wagmi'
import { useIsMerchant } from '@/lib/vfide-hooks'
import { 
  QrCode, 
  Download, 
  Copy, 
  Check, 
  Store,
  DollarSign,
  Share2 
} from 'lucide-react'

interface PaymentQRProps {
  /** Pre-filled amount (optional) */
  defaultAmount?: string
  /** Pre-filled order ID (optional) */
  defaultOrderId?: string
}

export function PaymentQR({ defaultAmount, defaultOrderId }: PaymentQRProps) {
  const { address } = useAccount()
  const merchantInfo = useIsMerchant(address)
  const [amount, setAmount] = useState(defaultAmount || '')
  const [orderId, setOrderId] = useState(defaultOrderId || '')
  const [copied, setCopied] = useState(false)

  // Create a payment deep link (could be customized for mobile wallets)
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://vfide.com'
  const buildPaymentUrl = (merchantAddress: string) => {
    const paymentParams = new URLSearchParams({
      merchant: merchantAddress,
      source: 'qr',
      settlement: 'instant',
    })
    if (amount) paymentParams.set('amount', amount)
    if (orderId) paymentParams.set('orderId', orderId)
    return `${baseUrl}/pay?${paymentParams.toString()}`
  }
  const paymentUrl = address ? buildPaymentUrl(address) : ''

  // USD estimate (using $0.07 presale price as reference)
  const REFERENCE_PRICE = 0.07
  const usdValue = amount ? (parseFloat(amount) * REFERENCE_PRICE).toFixed(2) : '0.00'

  const copyPaymentLink = () => {
    if (!paymentUrl) return
    navigator.clipboard.writeText(paymentUrl)
    setCopied(true)
  }

  useEffect(() => {
    if (!copied) return
    const timer = setTimeout(() => setCopied(false), 2000)
    return () => clearTimeout(timer)
  }, [copied])

  const downloadQR = () => {
    const svg = document.getElementById('payment-qr-code')
    if (!svg) return

    // Convert SVG to canvas and download
    const svgData = new XMLSerializer().serializeToString(svg)
    const canvas = document.createElement('canvas')
    canvas.width = 400
    canvas.height = 400
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const img = new Image()
    img.onload = () => {
      // White background
      ctx.fillStyle = '#FFFFFF'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(img, 0, 0, 400, 400)
      
      const link = document.createElement('a')
      link.download = `vfide-payment-${orderId || 'qr'}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
    }
    img.src = 'data:image/svg+xml;base64,' + btoa(svgData)
  }

  const sharePayment = async () => {
    if (!paymentUrl) return
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Pay ${merchantInfo.businessName || 'VFIDE Merchant'}`,
          text: amount ? `Pay ${amount} VFIDE (~$${usdValue})` : 'VFIDE Payment',
          url: paymentUrl,
        })
      } catch {
        // User cancelled or share failed, fall back to copy
        copyPaymentLink()
      }
    } else {
      copyPaymentLink()
    }
  }

  if (!address) {
    return (
      <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-8 text-center">
        <QrCode className="w-12 h-12 mx-auto mb-4 text-gray-600" />
        <p className="text-gray-400">Connect wallet to generate payment QR codes</p>
      </div>
    )
  }

  if (!merchantInfo.isMerchant) {
    return (
      <div className="bg-orange-900/20 border border-orange-500/30 rounded-xl p-8 text-center">
        <Store className="w-12 h-12 mx-auto mb-4 text-orange-400" />
        <p className="text-orange-400 font-bold mb-2">Not a Registered Merchant</p>
        <p className="text-gray-400 text-sm">Register as a merchant to generate payment QR codes</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-br from-cyan-400/10 to-blue-500/10 border-2 border-cyan-400/30 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-2">
          <QrCode className="w-8 h-8 text-cyan-400" />
          <div>
            <h2 className="text-xl font-bold text-zinc-100">Payment QR Code</h2>
            <p className="text-zinc-400 text-sm">QR scans default to instant settlement</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* QR Code Display */}
        <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-6 flex flex-col items-center">
          <div className="bg-white p-4 rounded-xl mb-4">
            <QRCodeSVG
              id="payment-qr-code"
              value={paymentUrl}
              size={200}
              level="H"
              includeMargin={true}
              imageSettings={{
                src: '/favicon.ico',
                height: 24,
                width: 24,
                excavate: true,
              }}
            />
          </div>
          
          {/* Amount Display */}
          {amount && (
            <div className="text-center mb-4">
              <div className="text-3xl font-bold text-cyan-400">
                {parseFloat(amount).toLocaleString()} VFIDE
              </div>
              <div className="text-zinc-400 text-sm">
                ≈ ${parseFloat(usdValue).toLocaleString()} USD
              </div>
            </div>
          )}
          
          {/* Merchant Name */}
          <div className="text-center text-zinc-100 font-bold mb-4 flex flex-col items-center gap-1">
            <span>{merchantInfo.businessName}</span>
            <span className="text-xs text-zinc-500">Instant settlement via QR scan</span>
          </div>
          
          {/* Order ID */}
          {orderId && (
            <div className="bg-zinc-900 rounded-lg px-4 py-2 text-sm text-zinc-400">
              Order: <span className="text-zinc-100 font-mono">{orderId}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 mt-4 w-full">
            <button
              onClick={downloadQR}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-zinc-700 hover:bg-zinc-700 rounded-lg text-zinc-100 transition-colors"
            >
              <Download size={18} />
              <span>Download</span>
            </button>
            <button
              onClick={sharePayment}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-cyan-400 hover:bg-cyan-400 rounded-lg text-zinc-900 font-bold transition-colors"
            >
              <Share2 size={18} />
              <span>Share</span>
            </button>
          </div>
        </div>

        {/* Amount & Order Form */}
        <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-6 space-y-4">
          <h3 className="text-lg font-bold text-zinc-100 mb-4">Configure Payment</h3>

          {/* Amount Input */}
          <div>
            <label className="text-sm text-zinc-400 mb-2 block">Amount (VFIDE)</label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00 (leave empty for any amount)"
                step="0.01"
                min="0"
                className="w-full bg-zinc-900 border border-zinc-700 rounded-lg pl-10 pr-4 py-3 text-zinc-100 placeholder-[#6A6A6F] focus:border-cyan-400 focus:outline-none"
              />
            </div>
            {amount && (
              <div className="text-sm text-zinc-400 mt-1">
                ≈ ${usdValue} USD
              </div>
            )}
          </div>

          {/* Quick Amounts */}
          <div className="flex flex-wrap gap-2">
            {['10', '50', '100', '500', '1000'].map((preset) => (
              <button
                key={preset}
                onClick={() => setAmount(preset)}
                className={`px-3 py-1.5 rounded-lg text-sm font-bold transition-colors ${
                  amount === preset
                    ? 'bg-cyan-400 text-zinc-900'
                    : 'bg-zinc-700 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-100'
                }`}
              >
                {preset}
              </button>
            ))}
          </div>

          {/* Order ID Input */}
          <div>
            <label className="text-sm text-zinc-400 mb-2 block">Order ID / Reference (Optional)</label>
            <input
              type="text"
              value={orderId}
              onChange={(e) => setOrderId(e.target.value)}
              placeholder="INV-12345"
              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-3 text-zinc-100 placeholder-[#6A6A6F] focus:border-cyan-400 focus:outline-none"
            />
          </div>

          {/* Copy Payment Link */}
          <div className="pt-4 border-t border-zinc-700">
            <label className="text-sm text-zinc-400 mb-2 block">Payment Link</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={paymentUrl}
                readOnly
                className="flex-1 bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-3 text-zinc-400 text-sm truncate"
              />
              <button
                onClick={copyPaymentLink}
                className="px-4 py-3 bg-zinc-700 hover:bg-zinc-700 rounded-lg transition-colors"
              >
                {copied ? (
                  <Check className="text-emerald-500" size={20} />
                ) : (
                  <Copy className="text-zinc-400" size={20} />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-4">
        <h4 className="font-bold text-zinc-100 mb-2">How it works</h4>
        <ol className="text-sm text-zinc-400 space-y-1 list-decimal list-inside">
          <li>Set the payment amount (or leave empty for any amount)</li>
          <li>Optionally add an order ID for your records</li>
          <li>Customer scans QR code with their camera or wallet app</li>
          <li>Customer confirms payment and it settles instantly</li>
        </ol>
      </div>
    </div>
  )
}

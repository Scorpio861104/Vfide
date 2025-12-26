/**
 * PaymentQR - Generate QR codes for customers to scan and pay
 */

'use client'

import { useState, useEffect } from 'react'
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

  // Generate payment URL/data
  const paymentData = {
    to: address,
    amount: amount || undefined,
    orderId: orderId || undefined,
    merchant: merchantInfo.businessName || undefined,
  }

  // Create a payment deep link (could be customized for mobile wallets)
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://vfide.com'
  const paymentUrl = `${baseUrl}/pay?to=${address}${amount ? `&amount=${amount}` : ''}${orderId ? `&orderId=${encodeURIComponent(orderId)}` : ''}`

  // USD estimate (using $0.07 presale price as reference)
  const REFERENCE_PRICE = 0.07
  const usdValue = amount ? (parseFloat(amount) * REFERENCE_PRICE).toFixed(2) : '0.00'

  const copyPaymentLink = () => {
    navigator.clipboard.writeText(paymentUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

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
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Pay ${merchantInfo.businessName || 'VFIDE Merchant'}`,
          text: amount ? `Pay ${amount} VFIDE (~$${usdValue})` : 'VFIDE Payment',
          url: paymentUrl,
        })
      } catch (err) {
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
      <div className="bg-gradient-to-br from-[#00F0FF]/10 to-[#0080FF]/10 border-2 border-[#00F0FF]/30 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-2">
          <QrCode className="w-8 h-8 text-[#00F0FF]" />
          <div>
            <h2 className="text-xl font-bold text-[#F5F3E8]">Payment QR Code</h2>
            <p className="text-[#A0A0A5] text-sm">Customers scan to pay instantly</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* QR Code Display */}
        <div className="bg-[#2A2A2F] border border-[#3A3A3F] rounded-xl p-6 flex flex-col items-center">
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
              <div className="text-3xl font-bold text-[#00F0FF]">
                {parseFloat(amount).toLocaleString()} VFIDE
              </div>
              <div className="text-[#A0A0A5] text-sm">
                ≈ ${parseFloat(usdValue).toLocaleString()} USD
              </div>
            </div>
          )}
          
          {/* Merchant Name */}
          <div className="text-center text-[#F5F3E8] font-bold mb-4">
            {merchantInfo.businessName}
          </div>
          
          {/* Order ID */}
          {orderId && (
            <div className="bg-[#1A1A1D] rounded-lg px-4 py-2 text-sm text-[#A0A0A5]">
              Order: <span className="text-[#F5F3E8] font-mono">{orderId}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 mt-4 w-full">
            <button
              onClick={downloadQR}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-[#3A3A3F] hover:bg-[#4A4A4F] rounded-lg text-[#F5F3E8] transition-colors"
            >
              <Download size={18} />
              <span>Download</span>
            </button>
            <button
              onClick={sharePayment}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-[#00F0FF] hover:bg-[#00D0DD] rounded-lg text-[#1A1A1D] font-bold transition-colors"
            >
              <Share2 size={18} />
              <span>Share</span>
            </button>
          </div>
        </div>

        {/* Amount & Order Form */}
        <div className="bg-[#2A2A2F] border border-[#3A3A3F] rounded-xl p-6 space-y-4">
          <h3 className="text-lg font-bold text-[#F5F3E8] mb-4">Configure Payment</h3>

          {/* Amount Input */}
          <div>
            <label className="text-sm text-[#A0A0A5] mb-2 block">Amount (VFIDE)</label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A0A0A5]" size={18} />
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00 (leave empty for any amount)"
                step="0.01"
                min="0"
                className="w-full bg-[#1A1A1D] border border-[#3A3A3F] rounded-lg pl-10 pr-4 py-3 text-[#F5F3E8] placeholder-[#6A6A6F] focus:border-[#00F0FF] focus:outline-none"
              />
            </div>
            {amount && (
              <div className="text-sm text-[#A0A0A5] mt-1">
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
                    ? 'bg-[#00F0FF] text-[#1A1A1D]'
                    : 'bg-[#3A3A3F] text-[#A0A0A5] hover:bg-[#4A4A4F] hover:text-[#F5F3E8]'
                }`}
              >
                {preset}
              </button>
            ))}
          </div>

          {/* Order ID Input */}
          <div>
            <label className="text-sm text-[#A0A0A5] mb-2 block">Order ID / Reference (Optional)</label>
            <input
              type="text"
              value={orderId}
              onChange={(e) => setOrderId(e.target.value)}
              placeholder="INV-12345"
              className="w-full bg-[#1A1A1D] border border-[#3A3A3F] rounded-lg px-4 py-3 text-[#F5F3E8] placeholder-[#6A6A6F] focus:border-[#00F0FF] focus:outline-none"
            />
          </div>

          {/* Copy Payment Link */}
          <div className="pt-4 border-t border-[#3A3A3F]">
            <label className="text-sm text-[#A0A0A5] mb-2 block">Payment Link</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={paymentUrl}
                readOnly
                className="flex-1 bg-[#1A1A1D] border border-[#3A3A3F] rounded-lg px-4 py-3 text-[#A0A0A5] text-sm truncate"
              />
              <button
                onClick={copyPaymentLink}
                className="px-4 py-3 bg-[#3A3A3F] hover:bg-[#4A4A4F] rounded-lg transition-colors"
              >
                {copied ? (
                  <Check className="text-[#50C878]" size={20} />
                ) : (
                  <Copy className="text-[#A0A0A5]" size={20} />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div className="bg-[#1A1A1D] border border-[#3A3A3F] rounded-xl p-4">
        <h4 className="font-bold text-[#F5F3E8] mb-2">How it works</h4>
        <ol className="text-sm text-[#A0A0A5] space-y-1 list-decimal list-inside">
          <li>Set the payment amount (or leave empty for any amount)</li>
          <li>Optionally add an order ID for your records</li>
          <li>Customer scans QR code with their camera or wallet app</li>
          <li>Customer confirms payment and it settles instantly</li>
        </ol>
      </div>
    </div>
  )
}

/**
 * PaymentQR - Generate QR codes for customers to scan and pay
 */

'use client'

import { useEffect, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { useAccount, useSignMessage } from 'wagmi'
import { useIsMerchant } from '@/lib/vfide-hooks'
import { buildQrSignatureMessage } from '@/lib/payments/qrSignature'
import { 
  QrCode, 
  Download, 
  Copy, 
  Check, 
  Store,
  DollarSign,
  Share2,
  ShieldCheck,
  Loader2
} from 'lucide-react'

interface PaymentQRProps {
  /** Pre-filled amount (optional) */
  defaultAmount?: string
  /** Pre-filled order ID (optional) */
  defaultOrderId?: string
}

const QR_SETTLEMENT = 'instant'
const QR_SOURCE = 'qr'
const QR_SIGNATURE_TTL_SECONDS = 15 * 60

export function PaymentQR({ defaultAmount, defaultOrderId }: PaymentQRProps) {
  const { address } = useAccount()
  const merchantInfo = useIsMerchant(address)
  const [amount, setAmount] = useState(defaultAmount || '')
  const [orderId, setOrderId] = useState(defaultOrderId || '')
  const [copiedTarget, setCopiedTarget] = useState<'link' | 'address' | null>(null)
  const [signature, setSignature] = useState<`0x${string}` | null>(null)
  const [expiresAt, setExpiresAt] = useState<number | null>(null)
  const [signatureError, setSignatureError] = useState<string | null>(null)
  const { signMessageAsync, isPending: isSigning } = useSignMessage()

  const securePayloadReady = !!signature && !!expiresAt

  useEffect(() => {
    // Changing payment fields invalidates the previously signed payload.
    setSignature(null)
    setExpiresAt(null)
    setSignatureError(null)
  }, [amount, orderId, address])

  // Create a payment deep link (could be customized for mobile wallets)
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://vfide.com'
  const paymentUrl = address
    ? (() => {
        const paymentParams = new URLSearchParams({
          merchant: address,
          source: QR_SOURCE,
          settlement: QR_SETTLEMENT,
        })
        if (amount) paymentParams.set('amount', amount)
        if (orderId) paymentParams.set('orderId', orderId)
        if (expiresAt) paymentParams.set('exp', String(expiresAt))
        if (signature) paymentParams.set('sig', signature)
        return `${baseUrl}/pay?${paymentParams.toString()}`
      })()
    : ''

  // USD estimate – requires a live price feed; shown as N/A until one is available
  const usdValue = 'N/A'
  const merchantName = merchantInfo.businessName || 'VFIDE Merchant'

  const copyPaymentLink = () => {
    if (!paymentUrl || !securePayloadReady) return
    navigator.clipboard.writeText(paymentUrl)
    setCopiedTarget('link')
  }

  const copyMerchantAddress = () => {
    if (!address) return
    navigator.clipboard.writeText(address)
    setCopiedTarget('address')
  }

  const signQrPayload = async () => {
    if (!address) return
    setSignatureError(null)

    try {
      const nextExpiry = Math.floor(Date.now() / 1000) + QR_SIGNATURE_TTL_SECONDS
      const message = buildQrSignatureMessage({
        merchant: address,
        amount: amount || '',
        orderId: orderId || '',
        source: QR_SOURCE,
        settlement: QR_SETTLEMENT,
        expiresAt: nextExpiry,
      })

      const sig = await signMessageAsync({ message })
      setExpiresAt(nextExpiry)
      setSignature(sig as `0x${string}`)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Signature rejected'
      setSignatureError(message)
    }
  }

  useEffect(() => {
    if (!copiedTarget) return
    const timer = setTimeout(() => setCopiedTarget(null), 2000)
    return () => clearTimeout(timer)
  }, [copiedTarget])

  const downloadQR = () => {
    if (!securePayloadReady) return
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
    if (!paymentUrl || !securePayloadReady) return
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
          <div
            className="bg-white p-4 rounded-xl mb-4"
            role="img"
            aria-label={`Payment QR code for ${merchantName}${amount ? ` for ${amount} VFIDE` : ''}`}
          >
            {paymentUrl && securePayloadReady ? (
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
            ) : (
              <div className="w-[200px] h-[200px] flex flex-col items-center justify-center text-xs text-zinc-600 text-center gap-2">
                <ShieldCheck className="w-8 h-8 text-cyan-500" />
                <span>Sign payment details to generate a tamper-proof QR</span>
              </div>
            )}
          </div>
          
          {/* Amount Display */}
          {amount && (
            <div className="text-center mb-4">
              <div className="text-3xl font-bold text-cyan-400">
                {parseFloat(amount).toLocaleString()} VFIDE
              </div>
              <div className="text-zinc-400 text-sm">
                ≈ {usdValue === 'N/A' ? 'N/A' : `$${usdValue} USD`}
              </div>
            </div>
          )}
          
          {/* Merchant Name */}
          <div className="text-center text-zinc-100 font-bold mb-4 flex flex-col items-center gap-1">
            <span>{merchantName}</span>
            <span className="text-xs text-zinc-300">Instant settlement via signed QR scan</span>
          </div>

          <p className="mb-4 text-center text-sm text-zinc-300">
            Can&apos;t scan? Copy the secure payment link or merchant address below.
          </p>

          <div className={`mb-4 rounded-lg px-3 py-2 text-xs ${securePayloadReady ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30' : 'bg-amber-500/10 text-amber-300 border border-amber-500/30'}`}>
            {securePayloadReady
              ? `Signed QR active${expiresAt ? ` • expires ${new Date(expiresAt * 1000).toLocaleTimeString()}` : ''}`
              : 'Unsigned QR cannot be paid. Sign to lock payment fields.'}
          </div>

          {signatureError && (
            <div className="mb-4 w-full rounded-lg px-3 py-2 text-xs bg-red-500/10 text-red-300 border border-red-500/30">
              Signature failed: {signatureError}
            </div>
          )}

          <button
            onClick={signQrPayload}
            disabled={isSigning}
            className="w-full mb-4 flex items-center justify-center gap-2 px-4 py-3 bg-emerald-500 hover:bg-emerald-600 rounded-lg text-white font-bold transition-colors disabled:opacity-60"
          >
            {isSigning ? <Loader2 className="animate-spin" size={18} /> : <ShieldCheck size={18} />}
            {isSigning ? 'Signing...' : securePayloadReady ? 'Re-sign QR' : 'Sign & Lock QR'}
          </button>
          
          {/* Order ID */}
          {orderId && (
            <div className="bg-zinc-900 rounded-lg px-4 py-2 text-sm text-zinc-400">
              Order: <span className="text-zinc-100 font-mono">{orderId}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="grid w-full grid-cols-1 gap-3 mt-4 sm:grid-cols-3">
            <button
              type="button"
              onClick={downloadQR}
              disabled={!securePayloadReady}
              aria-label="Download payment QR code"
              className="min-h-[44px] flex items-center justify-center gap-2 px-4 py-3 bg-zinc-700 hover:bg-zinc-600 rounded-lg text-zinc-100 transition-colors disabled:opacity-60"
            >
              <Download size={18} />
              <span>Download</span>
            </button>
            <button
              type="button"
              onClick={sharePayment}
              disabled={!securePayloadReady}
              aria-label="Share payment link"
              className="min-h-[44px] flex items-center justify-center gap-2 px-4 py-3 bg-cyan-400 hover:bg-cyan-300 rounded-lg text-zinc-900 font-bold transition-colors disabled:opacity-60"
            >
              <Share2 size={18} />
              <span>Share</span>
            </button>
            <button
              type="button"
              onClick={copyMerchantAddress}
              aria-label="Copy merchant address"
              className="min-h-[44px] flex items-center justify-center gap-2 px-4 py-3 bg-zinc-700 hover:bg-zinc-600 rounded-lg text-zinc-100 transition-colors"
            >
              {copiedTarget === 'address' ? <Check className="text-emerald-400" size={18} /> : <Copy size={18} />}
              <span>{copiedTarget === 'address' ? 'Copied address' : 'Copy merchant address'}</span>
            </button>
          </div>
        </div>

        {/* Amount & Order Form */}
        <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-6 space-y-4">
          <h3 className="text-lg font-bold text-zinc-100 mb-4">Configure Payment</h3>

          {/* Amount Input */}
          <div>
            <label htmlFor="payment-amount" className="text-sm text-zinc-300 mb-2 block">Amount (VFIDE)</label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-300" size={18} />
              <input
                id="payment-amount"
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
               
                step="0.01"
                min="0"
                aria-describedby="payment-amount-help"
                className="w-full bg-zinc-900 border border-zinc-700 rounded-lg pl-10 pr-4 py-3 text-zinc-100  focus:border-cyan-400 focus:outline-none"
              />
            </div>
            <div id="payment-amount-help" className="text-sm text-zinc-300 mt-1">
              {amount ? `≈ $${usdValue} USD` : 'Leave blank to let the customer enter any amount.'}
            </div>
          </div>

          {/* Quick Amounts */}
          <div className="flex flex-wrap gap-2">
            {['10', '50', '100', '500', '1000'].map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setAmount(preset)}
                className={`min-h-[44px] px-4 py-2.5 rounded-lg text-sm font-bold transition-colors ${
                  amount === preset
                    ? 'bg-cyan-400 text-zinc-900'
                    : 'bg-zinc-700 text-zinc-100 hover:bg-zinc-600'
                }`}
              >
                {preset}
              </button>
            ))}
          </div>

          {/* Order ID Input */}
          <div>
            <label htmlFor="payment-order" className="text-sm text-zinc-300 mb-2 block">Order ID / Reference (Optional)</label>
            <input
              id="payment-order"
              type="text"
              value={orderId}
              onChange={(e) => setOrderId(e.target.value)}
             
              aria-describedby="payment-order-help"
              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-3 text-zinc-100  focus:border-cyan-400 focus:outline-none"
            />
            <div id="payment-order-help" className="mt-1 text-sm text-zinc-300">
              Add a customer-facing reference so the payment stays easy to reconcile.
            </div>
          </div>

          {/* Copy Payment Link */}
          <div className="pt-4 border-t border-zinc-700">
            <label htmlFor="payment-link" className="text-sm text-zinc-300 mb-2 block">Payment Link</label>
            <div className="flex gap-2">
              <input
                id="payment-link"
                type="text"
                value={paymentUrl}
                readOnly
                aria-label="Secure payment link"
                className="flex-1 bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-3 text-zinc-300 text-sm truncate"
              />
              <button
                type="button"
                onClick={copyPaymentLink}
                disabled={!securePayloadReady}
                aria-label="Copy payment link"
                className="min-h-[44px] px-4 py-3 bg-zinc-700 hover:bg-zinc-600 rounded-lg transition-colors disabled:opacity-60"
              >
                {copiedTarget === 'link' ? (
                  <Check className="text-emerald-400" size={20} />
                ) : (
                  <Copy className="text-zinc-100" size={20} />
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
          <li>Sign and lock the QR payload</li>
          <li>Customer scans QR code with their camera or wallet app</li>
          <li>Customer confirms payment and it settles instantly</li>
        </ol>
      </div>
    </div>
  )
}

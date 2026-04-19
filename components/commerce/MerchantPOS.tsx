/**
 * VFIDE Point of Sale System
 * Complete POS with product management, QR payments, and live calculations
 */

'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAccount, useWatchContractEvent } from 'wagmi'
import { QRCodeSVG } from 'qrcode.react'
import { formatEther } from 'viem'
import { useIsMerchant, useFeeCalculator } from '@/lib/vfide-hooks'
import { CONTRACT_ADDRESSES, isConfiguredContractAddress } from '@/lib/contracts'
import { MerchantPortalABI } from '@/lib/abis'
import { safeParseFloat } from '@/lib/validation'

interface Product {
  id: string
  name: string
  price: number // USD
  category: string
  description?: string
  image?: string
}

interface CartItem extends Product {
  quantity: number
}

export function MerchantPOS() {
  const { address } = useAccount()
  const isMerchantPortalAvailable = isConfiguredContractAddress(CONTRACT_ADDRESSES.MerchantPortal)
  const { isMerchant, businessName } = useIsMerchant(address)
  
  // Product Management — DB-backed, persisted via /api/merchant/products
  const [products, setProducts] = useState<Product[]>([])
  const [productsLoaded, setProductsLoaded] = useState(false)

  // Fetch products from DB on mount
  useEffect(() => {
    if (!address) return
    fetch(`/api/merchant/products?merchant=${encodeURIComponent(address)}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.products?.length) {
          setProducts(data.products.map((p: { id: string; name: string; price: string; category_name?: string; description?: string; images?: string[] }) => ({
            id: p.id,
            name: p.name,
            price: parseFloat(p.price),
            category: p.category_name || 'Other',
            description: p.description || undefined,
            image: p.images?.[0],
          })))
        } else if (!productsLoaded) {
          // Seed defaults on first load if no products exist yet
          setProducts([
            { id: 'default-1', name: 'Espresso', price: 3.50, category: 'Coffee', description: 'Single shot' },
            { id: 'default-2', name: 'Latte', price: 4.50, category: 'Coffee', description: '12oz with steamed milk' },
            { id: 'default-3', name: 'Croissant', price: 3.00, category: 'Food', description: 'Fresh baked' },
          ])
        }
        setProductsLoaded(true)
      })
      .catch(() => setProductsLoaded(true))
  }, [address, productsLoaded])
  
  // Cart
  const [cart, setCart] = useState<CartItem[]>([])
  
  // UI State
  const [showAddProduct, setShowAddProduct] = useState(false)
  const [showQRPayment, setShowQRPayment] = useState(false)
  const [showReceipt, setShowReceipt] = useState(false)
  const [showEmailPrompt, setShowEmailPrompt] = useState(false)
  const [customerEmail, setCustomerEmail] = useState('')
  const [activeTab, setActiveTab] = useState<'pos' | 'products' | 'sales'>('pos')
  
  // Sales tracking
  interface Sale {
    id: string
    timestamp: number
    items: CartItem[]
    subtotal: number
    vfideAmount: string
    fee: number
    customerAddress?: string
    customerEmail?: string
    emailSent?: boolean
  }
  
  const [salesHistory, setSalesHistory] = useState<Sale[]>([])
  const [currentSale, setCurrentSale] = useState<Sale | null>(null)
  
  // New Product Form
  const [newProduct, setNewProduct] = useState({
    name: '',
    price: '',
    category: '',
    description: '',
  })
  
  // Calculate totals
  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0)
  const calculator = useFeeCalculator(subtotal.toString())
  const vfideAmount = 'N/A' // requires live price feed
  
  // Multi-processor comparison
  const calculateProcessorFees = (amount: number) => {
    const stripeFee = amount * 0.029 + 0.30
    const squareFee = amount * 0.026 + 0.10
    const cloverFee = amount * 0.026 + 0.10 + 14.95 / 30 // $14.95/month averaged per day
    const paypalFee = amount * 0.0349 + 0.49
    const vfideFee = safeParseFloat(calculator.vfideFee, 0)
    
    return {
      stripe: stripeFee,
      square: squareFee,
      clover: cloverFee,
      paypal: paypalFee,
      vfide: vfideFee,
    }
  }
  
  const processorFees = calculateProcessorFees(subtotal)
  
  // Memoize product categories to avoid recalculating on every render
  const productCategories = useMemo(() => {
    const uniqueCategories = new Set(products.map(p => p.category));
    return ['All', ...Array.from(uniqueCategories)];
  }, [products]);
  
  // Track pending payment for event matching
  const pendingPaymentRef = useRef<{
    expectedAmount: string
    cartSnapshot: CartItem[]
  } | null>(null)
  
  // Store pending payment when showing QR
  useEffect(() => {
    if (showQRPayment && cart.length > 0) {
      pendingPaymentRef.current = {
        expectedAmount: vfideAmount,
        cartSnapshot: [...cart],
      }
    } else if (!showQRPayment) {
      pendingPaymentRef.current = null
    }
  }, [showQRPayment, cart, vfideAmount])
  
  // Listen for PaymentProcessed events on MerchantPortal
  useWatchContractEvent({
    address: CONTRACT_ADDRESSES.MerchantPortal,
    abi: MerchantPortalABI,
    eventName: 'PaymentProcessed',
    onLogs(logs) {
      if (!address || !showQRPayment || !pendingPaymentRef.current) return
      
      for (const log of logs) {
        const args = (log as unknown as { args: { customer?: `0x${string}`, merchant?: `0x${string}`, amount?: bigint } }).args
        // Check if this payment is for us
        if (args.merchant?.toLowerCase() === address.toLowerCase()) {
          const receivedAmount = args.amount ? safeParseFloat(formatEther(args.amount), 0) : 0
          const expectedAmount = safeParseFloat(pendingPaymentRef.current.expectedAmount, 0)
          
          // Allow 1% tolerance for rounding (only if expectedAmount > 0)
          if (expectedAmount > 0 && Math.abs(receivedAmount - expectedAmount) / expectedAmount < 0.01) {
            // Payment confirmed! Complete the sale automatically
            handlePaymentConfirmed(args.customer || '0x0000000000000000000000000000000000000000', receivedAmount.toFixed(2))
          }
        }
      }
    },
    enabled: isMerchantPortalAvailable && showQRPayment && !!address,
  })
  
  // Handle confirmed payment from blockchain event
  const handlePaymentConfirmed = useCallback((customerAddress: `0x${string}` | string, amount: string) => {
    if (!pendingPaymentRef.current) return
    
    // Capture and clear pending ref FIRST to prevent double-processing
    const pending = pendingPaymentRef.current
    pendingPaymentRef.current = null
    
    const timestamp = new Date().getTime()
    const sale: Sale = {
      id: timestamp.toString(),
      timestamp: timestamp,
      items: [...pending.cartSnapshot],
      subtotal: subtotal,
      vfideAmount: amount,
      fee: processorFees.vfide,
      customerAddress: customerAddress,
      customerEmail: undefined,
      emailSent: false,
    }
    
    setSalesHistory(prev => [sale, ...prev])
    setCurrentSale(sale)
    setShowQRPayment(false)
    setShowEmailPrompt(true) // Ask for email after payment confirmed
    clearCart()

    // Notify server for webhook dispatch (fire-and-forget)
    fetch('/api/merchant/payments/confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customer_address: customerAddress,
        amount,
        token: 'VFIDE',
        order_id: sale.id,
      }),
    }).catch(() => { /* non-critical */ })
  }, [subtotal, processorFees.vfide])

  // Add product to catalog (persisted to DB)
  const handleAddProduct = async () => {
    if (!newProduct.name || !newProduct.price) return
    
    const price = safeParseFloat(newProduct.price, 0)
    const product: Product = {
      id: Date.now().toString(),
      name: newProduct.name,
      price,
      category: newProduct.category || 'Other',
      description: newProduct.description,
    }
    
    // Optimistic update
    setProducts([...products, product])
    setNewProduct({ name: '', price: '', category: '', description: '' })
    setShowAddProduct(false)

    // Persist to DB
    try {
      const res = await fetch('/api/merchant/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: product.name,
          price: product.price,
          description: product.description || '',
          product_type: 'physical',
        }),
      })
      if (res.ok) {
        const data = await res.json()
        // Replace temp id with real DB id
        setProducts(prev => prev.map(p => p.id === product.id ? { ...p, id: data.product.id } : p))
      }
    } catch { /* optimistic update already applied */ }
  }
  
  // Add to cart
  const addToCart = (product: Product) => {
    const existing = cart.find(item => item.id === product.id)
    if (existing) {
      setCart(cart.map(item =>
        item.id === product.id
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ))
    } else {
      setCart([...cart, { ...product, quantity: 1 }])
    }
  }
  
  // Update quantity
  const updateQuantity = (id: string, change: number) => {
    setCart(cart.map(item => {
      if (item.id === id) {
        const newQty = Math.max(0, item.quantity + change)
        return { ...item, quantity: newQty }
      }
      return item
    }).filter(item => item.quantity > 0))
  }
  
  // Clear cart
  const clearCart = () => setCart([])
  
  // Complete sale - now just adds email to the current sale (payment already confirmed via event)
  const completeSale = (email?: string) => {
    if (currentSale) {
      // Update the current sale with email info
      const updatedSale: Sale = {
        ...currentSale,
        customerEmail: email,
        emailSent: !!email,
      }
      
      // Update in sales history
      setSalesHistory(prev => prev.map(s => 
        s.id === currentSale.id ? updatedSale : s
      ))
      setCurrentSale(updatedSale)
      
      // Send email if provided
      if (email) {
        sendDigitalReceipt(updatedSale, email)
      }
    }
    
    setShowEmailPrompt(false)
    setShowReceipt(true)
    setCustomerEmail('')
  }
  
  // Send digital receipt
  const sendDigitalReceipt = async (sale: Sale, email: string) => {
    const receiptPayload = {
      id: sale.id,
      merchant: businessName || 'VFIDE Merchant',
      date: new Date(sale.timestamp).toISOString(),
      subtotal: sale.subtotal,
      fee: sale.fee,
      tokenAmount: sale.vfideAmount,
      customerAddress: sale.customerAddress || '',
      items: sale.items.map((item) => ({
        id: item.id,
        name: item.name,
        quantity: item.quantity,
        unitPrice: item.price,
        total: item.quantity * item.price,
      })),
    }

    // Store the latest receipt payload so support/tools can retrieve it even without backend email wiring.
    localStorage.setItem(`vfide:merchant:receipt:${sale.id}`, JSON.stringify(receiptPayload))

    const subject = encodeURIComponent(`Your receipt from ${businessName || 'VFIDE Merchant'} (${sale.id})`)
    const lines = [
      `Receipt ID: ${sale.id}`,
      `Date: ${new Date(sale.timestamp).toLocaleString()}`,
      `Merchant: ${businessName || 'VFIDE Merchant'}`,
      '',
      'Items:',
      ...sale.items.map((item) => `- ${item.name} x${item.quantity} @ $${item.price.toFixed(2)} = $${(item.quantity * item.price).toFixed(2)}`),
      '',
      `Subtotal: $${sale.subtotal.toFixed(2)}`,
      `Network Fee: $${sale.fee.toFixed(2)}`,
      `Paid: ${sale.vfideAmount} VFIDE`,
      sale.customerAddress ? `Customer Wallet: ${sale.customerAddress}` : '',
    ].filter(Boolean)

    const body = encodeURIComponent(lines.join('\n'))
    window.open(`mailto:${encodeURIComponent(email)}?subject=${subject}&body=${body}`, '_blank', 'noopener,noreferrer')
  }
  
  // Sales analytics - Single-pass aggregation instead of multiple reduces (O(n) instead of O(n×3))
  const todaysSales = salesHistory.filter(sale => {
    const today = new Date().setHours(0, 0, 0, 0)
    return sale.timestamp >= today
  })
  
  const { revenue, fees } = todaysSales.reduce(
    (acc, sale) => ({
      revenue: acc.revenue + sale.subtotal,
      fees: acc.fees + sale.fee
    }),
    { revenue: 0, fees: 0 }
  )
  const todaysRevenue = revenue
  const todaysFees = fees
  const todaysNet = todaysRevenue - todaysFees
  
  // Generate payment QR code
  const generatePaymentURL = () => {
    const params = new URLSearchParams({
      merchant: address || '',
      amount: vfideAmount,
      source: 'qr',
      settlement: 'instant',
    })
    if (cart.length > 0) params.set('orderId', `POS-${Date.now()}`)
    return `${window.location.origin}/pay?${params.toString()}`
  }
  
  if (!isMerchant) {
    return (
      <div className="text-center py-20">
        <p className="text-xl text-zinc-100/60">Register as merchant to access POS</p>
      </div>
    )
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0A0A0A] to-zinc-900 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-zinc-100 mb-2">
            {businessName} POS
          </h1>
          <p className="text-zinc-100/60">
            Point of sale with no processor fees (burn + gas apply)
          </p>
        </div>
        
        {/* Tabs */}
        <div className="flex gap-4 mb-6">
          <button
            onClick={() => setActiveTab('pos')}
            className={`px-6 py-3 rounded-lg font-bold transition-all ${
              activeTab === 'pos'
                ? 'bg-gradient-to-r from-cyan-400 to-blue-500 text-white'
                : 'bg-zinc-950/50 text-zinc-100/60 hover:text-zinc-100'
            }`}
          >
            🛒 Point of Sale
          </button>
          <button
            onClick={() => setActiveTab('products')}
            className={`px-6 py-3 rounded-lg font-bold transition-all ${
              activeTab === 'products'
                ? 'bg-gradient-to-r from-cyan-400 to-blue-500 text-white'
                : 'bg-zinc-950/50 text-zinc-100/60 hover:text-zinc-100'
            }`}
          >
            📦 Products & Menu
          </button>
          <button
            onClick={() => setActiveTab('sales')}
            className={`px-6 py-3 rounded-lg font-bold transition-all ${
              activeTab === 'sales'
                ? 'bg-gradient-to-r from-cyan-400 to-blue-500 text-white'
                : 'bg-zinc-950/50 text-zinc-100/60 hover:text-zinc-100'
            }`}
          >
            📊 Sales & Reports
          </button>
        </div>
        
        {activeTab === 'pos' && (
          /* POS VIEW */
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Product Grid - Left Side */}
            <div className="lg:col-span-2 space-y-4">
              <div className="bg-zinc-950/80 backdrop-blur-xl rounded-xl p-6 border border-cyan-400/20">
                <h2 className="text-2xl font-bold text-zinc-100 mb-4">Products</h2>
                
                {/* Category Filter */}
                <div className="flex gap-2 mb-4 flex-wrap">
                  {productCategories.map(cat => (
                    <button
                      key={cat}
                      className="px-4 py-2 rounded-lg bg-cyan-400/10 text-cyan-400 hover:bg-cyan-400/20 transition-colors text-sm"
                    >
                      {cat}
                    </button>
                  ))}
                </div>
                
                {/* Product Grid */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {products.map(product => (
                    <motion.button
                      key={product.id}
                      onClick={() => addToCart(product)}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="bg-zinc-950 border border-cyan-400/30 rounded-xl p-4 text-left hover:border-cyan-400 transition-all"
                    >
                      <div className="text-2xl mb-2">☕</div>
                      <h3 className="font-bold text-zinc-100 mb-1">{product.name}</h3>
                      <p className="text-sm text-zinc-100/60 mb-2">{product.description}</p>
                      <p className="text-xl font-bold text-emerald-400">${product.price.toFixed(2)}</p>
                    </motion.button>
                  ))}
                </div>
              </div>
            </div>
            
            {/* Cart & Checkout - Right Side */}
            <div className="space-y-4">
              {/* Cart */}
              <div className="bg-zinc-950/80 backdrop-blur-xl rounded-xl p-6 border border-cyan-400/20">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-2xl font-bold text-zinc-100">Cart</h2>
                  {cart.length && (
                    <button
                      onClick={clearCart}
                      className="text-sm text-red-500 hover:text-red-400"
                    >
                      Clear
                    </button>
                  )}
                </div>
                
                {cart.length === 0 ? (
                  <p className="text-center text-zinc-100/40 py-8">
                    Cart is empty
                  </p>
                ) : (
                  <div className="space-y-3">
                    {cart.map(item => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between bg-zinc-950 rounded-lg p-3"
                      >
                        <div className="flex-1">
                          <h4 className="font-bold text-zinc-100">{item.name}</h4>
                          <p className="text-sm text-emerald-400">${item.price.toFixed(2)}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => updateQuantity(item.id, -1)}
                            className="w-8 h-8 bg-red-500/20 text-red-500 rounded hover:bg-red-500/30"
                          >
                            -
                          </button>
                          <span className="w-8 text-center font-bold text-zinc-100">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => updateQuantity(item.id, 1)}
                            className="w-8 h-8 bg-emerald-400/20 text-emerald-400 rounded hover:bg-emerald-400/30"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              {/* Totals */}
              {cart.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-zinc-950/80 backdrop-blur-xl rounded-xl p-6 border border-cyan-400/20 space-y-4"
                >
                  <div className="space-y-2">
                    <div className="flex justify-between text-zinc-100/60">
                      <span>Subtotal (USD)</span>
                      <span className="font-bold">${subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-zinc-100/60">
                      <span>VFIDE Fee (0%)</span>
                      <span className="font-bold text-emerald-400">$0.00</span>
                    </div>
                    <div className="h-px bg-cyan-400/20" />
                    <div className="flex justify-between text-xl font-bold">
                      <span className="text-zinc-100">Total</span>
                      <div className="text-right">
                        <div className="text-emerald-400">{vfideAmount} VFIDE</div>
                        <div className="text-sm text-zinc-100/60">${subtotal.toFixed(2)} USD</div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Processor Comparison */}
                  <div className="bg-zinc-950 border border-cyan-400/30 rounded-lg p-4 space-y-3">
                    <p className="text-xs text-zinc-100/60 mb-2">Fee Comparison</p>
                    
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between items-center">
                        <span className="text-zinc-100/70">Stripe</span>
                        <span className="text-red-500 font-mono">${processorFees.stripe.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-zinc-100/70">Square</span>
                        <span className="text-red-400 font-mono">${processorFees.square.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-zinc-100/70">Clover</span>
                        <span className="text-red-400 font-mono">${processorFees.clover.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-zinc-100/70">PayPal</span>
                        <span className="text-red-300 font-mono">${processorFees.paypal.toFixed(2)}</span>
                      </div>
                      <div className="h-px bg-cyan-400/20" />
                      <div className="flex justify-between items-center">
                        <span className="text-emerald-400 font-bold">VFIDE</span>
                        <span className="text-emerald-400 font-bold font-mono">${processorFees.vfide.toFixed(2)}</span>
                      </div>
                    </div>
                    
                    <motion.div
                      animate={{ scale: [1, 1.02, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="bg-emerald-400/10 border border-emerald-400/30 rounded px-3 py-2 text-center"
                    >
                      <p className="text-emerald-400 font-bold text-lg">
                        Save ${Math.max(processorFees.stripe, processorFees.square, processorFees.clover, processorFees.paypal).toFixed(2)}!
                      </p>
                      <p className="text-xs text-zinc-100/60">vs most expensive</p>
                    </motion.div>
                  </div>
                  
                  {/* Generate QR Button */}
                  <button
                    onClick={() => setShowQRPayment(true)}
                    className="w-full bg-gradient-to-r from-emerald-400 to-cyan-400 text-zinc-950 font-bold py-4 rounded-xl hover:scale-105 transition-transform"
                  >
                    Generate QR Payment
                  </button>
                </motion.div>
              )}
            </div>
          </div>
        )}
        
        {activeTab === 'products' && (
          /* PRODUCTS MANAGEMENT VIEW */
          <div className="bg-zinc-950/80 backdrop-blur-xl rounded-xl p-6 border border-cyan-400/20">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-zinc-100">Manage Products</h2>
              <button
                onClick={() => setShowAddProduct(true)}
                className="bg-gradient-to-r from-emerald-400 to-cyan-400 text-zinc-950 font-bold px-6 py-3 rounded-lg hover:scale-105 transition-transform"
              >
                + Add Product
              </button>
            </div>
            
            {/* Products List */}
            <div className="space-y-3">
              {products.map(product => (
                <div
                  key={product.id}
                  className="bg-zinc-950 border border-cyan-400/30 rounded-lg p-4 flex items-center justify-between"
                >
                  <div className="flex items-center gap-4">
                    <div className="text-3xl">☕</div>
                    <div>
                      <h3 className="font-bold text-zinc-100">{product.name}</h3>
                      <p className="text-sm text-zinc-100/60">{product.category} • {product.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-2xl font-bold text-emerald-400">${product.price.toFixed(2)}</span>
                    <button
                      onClick={() => setProducts(products.filter(p => p.id !== product.id))}
                      className="text-red-500 hover:text-red-400 px-3 py-2"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {activeTab === 'sales' && (
          /* SALES & REPORTS VIEW */
          <div className="space-y-6">
            {/* Today's Summary */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-zinc-950/80 backdrop-blur-xl rounded-xl p-6 border border-cyan-400/20">
                <p className="text-sm text-zinc-100/60 mb-2">Today&apos;s Sales</p>
                <p className="text-3xl font-bold text-cyan-400">{todaysSales.length}</p>
              </div>
              <div className="bg-zinc-950/80 backdrop-blur-xl rounded-xl p-6 border border-emerald-400/20">
                <p className="text-sm text-zinc-100/60 mb-2">Revenue</p>
                <p className="text-3xl font-bold text-emerald-400">${todaysRevenue.toFixed(2)}</p>
              </div>
              <div className="bg-zinc-950/80 backdrop-blur-xl rounded-xl p-6 border border-pink-400/20">
                <p className="text-sm text-zinc-100/60 mb-2">Fees Paid</p>
                <p className="text-3xl font-bold text-pink-400">${todaysFees.toFixed(2)}</p>
              </div>
              <div className="bg-zinc-950/80 backdrop-blur-xl rounded-xl p-6 border border-amber-400/20">
                <p className="text-sm text-zinc-100/60 mb-2">Net Income</p>
                <p className="text-3xl font-bold text-amber-400">${todaysNet.toFixed(2)}</p>
              </div>
            </div>
            
            {/* Sales History */}
            <div className="bg-zinc-950/80 backdrop-blur-xl rounded-xl p-6 border border-cyan-400/20">
              <h2 className="text-2xl font-bold text-zinc-100 mb-4">Recent Transactions</h2>
              
              {salesHistory.length === 0 ? (
                <p className="text-center text-zinc-100/40 py-8">No sales yet</p>
              ) : (
                <div className="space-y-3">
                  {salesHistory.slice(0, 10).map(sale => (
                    <motion.div
                      key={sale.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="bg-zinc-950 border border-cyan-400/30 rounded-lg p-4 hover:border-cyan-400 transition-colors cursor-pointer"
                      onClick={() => {
                        setCurrentSale(sale)
                        setShowReceipt(true)
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-bold text-zinc-100">
                            {new Date(sale.timestamp).toLocaleTimeString()}
                          </p>
                          <p className="text-sm text-zinc-100/60">
                            {sale.items.length} items • {sale.customerAddress}
                          </p>
                          {sale.emailSent && (
                            <p className="text-xs text-emerald-400 flex items-center gap-1 mt-1">
                              ✉️ Digital receipt sent
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-emerald-400">${sale.subtotal.toFixed(2)}</p>
                          <p className="text-xs text-zinc-100/60">{sale.vfideAmount} VFIDE</p>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      
      {/* Add Product Modal */}
      <AnimatePresence>
        {showAddProduct && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowAddProduct(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-zinc-950 border border-cyan-400/30 rounded-2xl p-8 max-w-md w-full"
            >
              <h3 className="text-2xl font-bold text-zinc-100 mb-6">Add New Product</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-zinc-100/70 mb-2">Product Name *</label>
                  <input
                    type="text"
                    value={newProduct.name}
                    onChange={(e) =>  setNewProduct({...newProduct, name: e.target.value})}
                   
                    className="w-full bg-zinc-950 border border-cyan-400/30 rounded-lg px-4 py-3 text-zinc-100 focus:border-cyan-400 outline-none"
                  />
                </div>
                
                <div>
                  <label className="block text-sm text-zinc-100/70 mb-2">Price (USD) *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newProduct.price}
                    onChange={(e) =>  setNewProduct({...newProduct, price: e.target.value})}
                   
                    className="w-full bg-zinc-950 border border-cyan-400/30 rounded-lg px-4 py-3 text-zinc-100 focus:border-cyan-400 outline-none"
                  />
                </div>
                
                <div>
                  <label className="block text-sm text-zinc-100/70 mb-2">Category</label>
                  <input
                    type="text"
                    value={newProduct.category}
                    onChange={(e) =>  setNewProduct({...newProduct, category: e.target.value})}
                   
                    className="w-full bg-zinc-950 border border-cyan-400/30 rounded-lg px-4 py-3 text-zinc-100 focus:border-cyan-400 outline-none"
                  />
                </div>
                
                <div>
                  <label className="block text-sm text-zinc-100/70 mb-2">Description</label>
                  <textarea
                    value={newProduct.description}
                    onChange={(e) =>  setNewProduct({...newProduct, description: e.target.value})}
                   
                    rows={3}
                    className="w-full bg-zinc-950 border border-cyan-400/30 rounded-lg px-4 py-3 text-zinc-100 focus:border-cyan-400 outline-none resize-none"
                  />
                </div>
                
                <div className="flex gap-3 pt-4">
                  <button
                    onClick={handleAddProduct}
                    className="flex-1 bg-gradient-to-r from-emerald-400 to-cyan-400 text-zinc-950 font-bold py-3 rounded-lg hover:scale-105 transition-transform"
                  >
                    Add Product
                  </button>
                  <button
                    onClick={() => setShowAddProduct(false)}
                    className="px-6 bg-zinc-950 border border-cyan-400/30 text-zinc-100 font-bold py-3 rounded-lg hover:border-cyan-400 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* QR Payment Modal */}
      <AnimatePresence>
        {showQRPayment && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowQRPayment(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-zinc-950 border-2 border-cyan-400/50 rounded-2xl p-8 max-w-md w-full text-center"
            >
              <h3 className="text-3xl font-bold text-zinc-100 mb-2">Scan to Pay</h3>
              <p className="text-zinc-100/60 mb-6">Customer scans with VFIDE app</p>
              
              {/* QR Code */}
              <div className="bg-white p-6 rounded-xl inline-block mb-6">
                <QRCodeSVG
                  value={generatePaymentURL()}
                  size={256}
                  level="H"
                  includeMargin
                />
              </div>
              
              {/* Payment Details */}
              <div className="bg-zinc-950 rounded-xl p-6 mb-6 space-y-3">
                <div className="flex justify-between text-zinc-100/60">
                  <span>Total Amount</span>
                  <span className="font-bold text-zinc-100">${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-zinc-100/60">
                  <span>In VFIDE</span>
                  <span className="font-bold text-emerald-400">{vfideAmount} VFIDE</span>
                </div>
                <div className="flex justify-between text-zinc-100/60">
                  <span>VFIDE Fee</span>
                  <span className="font-bold text-emerald-400">${processorFees.vfide.toFixed(2)}</span>
                </div>
                <div className="h-px bg-cyan-400/20 my-2" />
                
                <div className="space-y-1.5 text-xs">
                  <p className="text-zinc-100/40 mb-1">Other processors would charge:</p>
                  <div className="flex justify-between">
                    <span className="text-zinc-100/60">Stripe:</span>
                    <span className="text-red-500">${processorFees.stripe.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-100/60">Square:</span>
                    <span className="text-red-400">${processorFees.square.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-100/60">Clover:</span>
                    <span className="text-red-400">${processorFees.clover.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-100/60">PayPal:</span>
                    <span className="text-red-300">${processorFees.paypal.toFixed(2)}</span>
                  </div>
                </div>
                
                <motion.div
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="bg-emerald-400/20 border border-emerald-400 rounded-lg p-3 text-center"
                >
                  <p className="text-emerald-400 font-bold text-lg">
                    You Save Up To ${(Math.max(processorFees.stripe, processorFees.square, processorFees.clover, processorFees.paypal) - processorFees.vfide).toFixed(2)}!
                  </p>
                </motion.div>
              </div>
              
              {/* Waiting for payment indicator */}
              <div className="mb-4">
                <motion.div
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className="flex items-center justify-center gap-2 text-cyan-400"
                >
                  <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                  <span className="text-sm">Waiting for blockchain confirmation...</span>
                </motion.div>
                <p className="text-xs text-center text-zinc-100/40 mt-2">
                  Payment will auto-confirm when detected on-chain
                </p>
              </div>
              
              <div className="space-y-3">
                <button
                  onClick={() => setShowQRPayment(false)}
                  className="w-full bg-zinc-950 border border-cyan-400/30 text-zinc-100 font-bold py-4 rounded-xl hover:border-cyan-400 transition-colors"
                >
                  Cancel Payment
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Email Opt-in Modal */}
      <AnimatePresence>
        {showEmailPrompt && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowEmailPrompt(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-zinc-950 border-2 border-cyan-400/50 rounded-2xl p-8 max-w-md w-full"
            >
              <div className="text-center mb-6">
                <div className="text-6xl mb-4">📧</div>
                <h3 className="text-2xl font-bold text-zinc-100 mb-2">Digital Receipt</h3>
                <p className="text-zinc-100/60">
                  Would customer like a receipt via email?
                </p>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-zinc-100/70 mb-2">
                    Customer Email (Optional)
                  </label>
                  <input
                    type="email"
                    value={customerEmail}
                    onChange={(e) =>  setCustomerEmail(e.target.value)}
                   
                    className="w-full bg-zinc-950 border border-cyan-400/30 rounded-lg px-4 py-3 text-zinc-100 focus:border-cyan-400 outline-none"
                  />
                </div>
                
                <div className="bg-cyan-400/10 border border-cyan-400/30 rounded-lg p-3">
                  <p className="text-xs text-zinc-100/70">
                    ✅ Instant email delivery<br />
                    ✅ Itemized receipt with totals<br />
                    ✅ Transaction ID for records<br />
                    ✅ No spam - one-time send
                  </p>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => completeSale()}
                    className="bg-zinc-950 border border-cyan-400/30 text-zinc-100 font-bold py-3 rounded-lg hover:border-cyan-400 transition-colors"
                  >
                    Skip
                  </button>
                  <button
                    onClick={() => {
                      if (customerEmail && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail)) {
                        completeSale(customerEmail)
                      } else {
                        completeSale()
                      }
                    }}
                    className="bg-gradient-to-r from-emerald-400 to-cyan-400 text-zinc-950 font-bold py-3 rounded-lg hover:scale-105 transition-transform"
                  >
                    {customerEmail ? 'Send Receipt' : 'Continue'}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Receipt Modal */}
      <AnimatePresence>
        {showReceipt && currentSale && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowReceipt(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white text-black rounded-2xl p-8 max-w-md w-full max-h-[90vh] overflow-y-auto"
            >
              {/* Receipt Header */}
              <div className="text-center mb-6 pb-4 border-b-2 border-dashed border-gray-300">
                <h2 className="text-3xl font-bold mb-2">{businessName}</h2>
                <p className="text-sm text-gray-600">Powered by VFIDE</p>
                <p className="text-xs text-gray-500 mt-2">
                  {new Date(currentSale.timestamp).toLocaleString()}
                </p>
              </div>
              
              {/* Items */}
              <div className="mb-6 space-y-3">
                {currentSale.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between text-sm">
                    <div className="flex-1">
                      <p className="font-bold">{item.name}</p>
                      <p className="text-gray-600 text-xs">
                        ${item.price.toFixed(2)} × {item.quantity}
                      </p>
                    </div>
                    <p className="font-bold">${(item.price * item.quantity).toFixed(2)}</p>
                  </div>
                ))}
              </div>
              
              {/* Totals */}
              <div className="border-t-2 border-dashed border-gray-300 pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Subtotal</span>
                  <span className="font-bold">${currentSale.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Processing Fee</span>
                  <span className="font-bold">${currentSale.fee.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-lg font-bold pt-2 border-t border-gray-300">
                  <span>Total Paid</span>
                  <span>${currentSale.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm text-green-600">
                  <span>In VFIDE</span>
                  <span className="font-mono">{currentSale.vfideAmount} VFIDE</span>
                </div>
              </div>
              
              {/* Payment Info */}
              <div className="mt-6 p-4 bg-gray-100 rounded-lg space-y-2">
                <div>
                  <p className="text-xs text-gray-600 mb-1">Payment Method</p>
                  <p className="font-mono text-sm">VFIDE (0% merchant fee)</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 mb-1">Customer</p>
                  <p className="text-xs text-gray-500 font-mono">{currentSale.customerAddress}</p>
                </div>
                {currentSale.emailSent && currentSale.customerEmail && (
                  <div className="pt-2 border-t border-gray-300">
                    <p className="text-xs text-green-600 flex items-center gap-1">
                      ✅ Digital receipt sent to: {currentSale.customerEmail}
                    </p>
                  </div>
                )}
              </div>
              
              {/* Footer */}
              <div className="mt-6 text-center space-y-3">
                <p className="text-sm font-bold">Thank you for your business!</p>
                <p className="text-xs text-gray-500">
                  Transaction ID: {currentSale.id}
                </p>
                
                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => window.print()}
                    className="flex-1 bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    🖨️ Print
                  </button>
                  <button
                    onClick={() => setShowReceipt(false)}
                    className="flex-1 bg-gray-200 text-gray-800 font-bold py-3 rounded-lg hover:bg-gray-300 transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

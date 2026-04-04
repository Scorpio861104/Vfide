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
import { CONTRACT_ADDRESSES } from '@/lib/contracts'
import { MerchantPortalABI } from '@/lib/abis'
import { safeParseFloat } from '@/lib/validation'
import { DEFAULT_VFIDE_PRICE } from '@/lib/price-utils'
import {
  clearStoredStaffSession,
  getStoredStaffSession,
  isStaffSessionActive,
  storeStaffSession,
  type StaffSession,
} from '@/lib/sessionKeys/sessionKeyService'

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

const DEFAULT_PRODUCTS: Product[] = [
  { id: 'default-1', name: 'Espresso', price: 3.50, category: 'Coffee', description: 'Single shot' },
  { id: 'default-2', name: 'Latte', price: 4.50, category: 'Coffee', description: '12oz with steamed milk' },
  { id: 'default-3', name: 'Croissant', price: 3.00, category: 'Food', description: 'Fresh baked' },
]

export function MerchantPOS() {
  const { address } = useAccount()
  const { isMerchant, businessName } = useIsMerchant(address)
  const [staffSession, setStaffSession] = useState<StaffSession | null>(null)
  const [staffError, setStaffError] = useState<string | null>(null)
  const [selectedCategory, setSelectedCategory] = useState('All')

  const activeStaffSession = isStaffSessionActive(staffSession) ? staffSession : null
  const merchantContextAddress = activeStaffSession?.merchantAddress || address
  const canProcessSales = activeStaffSession ? activeStaffSession.permissions.processSales : true
  const canViewProducts = activeStaffSession
    ? (activeStaffSession.permissions.viewProducts || activeStaffSession.permissions.editProducts)
    : true
  const canEditProducts = activeStaffSession ? activeStaffSession.permissions.editProducts : true
  const canViewAnalytics = activeStaffSession ? activeStaffSession.permissions.viewAnalytics : true
  
  // Product Management — DB-backed, persisted via /api/merchant/products
  const [products, setProducts] = useState<Product[]>([])
  const [productsLoaded, setProductsLoaded] = useState(false)

  // Fetch products from DB on mount
  useEffect(() => {
    if (!merchantContextAddress) return

    if (typeof fetch !== 'function') {
      if (!productsLoaded) {
        setProducts(DEFAULT_PRODUCTS)
      }
      setProductsLoaded(true)
      return
    }

    fetch(`/api/merchant/products?merchant=${encodeURIComponent(merchantContextAddress)}`)
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
          setProducts(DEFAULT_PRODUCTS)
        }
        setProductsLoaded(true)
      })
      .catch(() => {
        if (!productsLoaded) {
          setProducts(DEFAULT_PRODUCTS)
        }
        setProductsLoaded(true)
      })
  }, [merchantContextAddress, productsLoaded])
  
  // Cart
  const [cart, setCart] = useState<CartItem[]>([])
  
  // UI State
  const [showAddProduct, setShowAddProduct] = useState(false)
  const [showQRPayment, setShowQRPayment] = useState(false)
  const [showReceipt, setShowReceipt] = useState(false)
  const [showEmailPrompt, setShowEmailPrompt] = useState(false)
  const [customerEmail, setCustomerEmail] = useState('')
  const [couponCode, setCouponCode] = useState('')
  const [couponStatus, setCouponStatus] = useState<string | null>(null)
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discount: number } | null>(null)
  const [activeTab, setActiveTab] = useState<'pos' | 'products' | 'sales'>('pos')

  useEffect(() => {
    if (typeof window !== 'object') return

    const storedSession = getStoredStaffSession()
    const params = new URLSearchParams(window.location.search)
    const token = params.get('staffToken')?.trim()

    if (!token) {
      setStaffSession(storedSession)
      setStaffError(null)
      return
    }

    if (storedSession?.sessionToken === token && isStaffSessionActive(storedSession)) {
      setStaffSession(storedSession)
      setStaffError(null)
      return
    }

    if (typeof fetch !== 'function') return

    fetch(`/api/merchant/staff?token=${encodeURIComponent(token)}`)
      .then(async (response) => {
        const data = await response.json().catch(() => null)
        if (!response.ok || !data?.session) {
          throw new Error(data?.error || 'Staff session not found or expired')
        }

        const resolvedSession = data.session as StaffSession
        storeStaffSession(resolvedSession)
        setStaffSession(resolvedSession)
        setStaffError(null)
      })
      .catch((error: unknown) => {
        clearStoredStaffSession()
        setStaffSession(null)
        setStaffError(error instanceof Error ? error.message : 'Staff session not found or expired')
      })
  }, [])

  useEffect(() => {
    if (activeTab === 'products' && !canViewProducts) {
      setActiveTab(canViewAnalytics ? 'sales' : 'pos')
    }
    if (activeTab === 'sales' && !canViewAnalytics) {
      setActiveTab(canViewProducts ? 'products' : 'pos')
    }
  }, [activeTab, canViewAnalytics, canViewProducts])
  
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
    staffSessionId?: string
    staffName?: string
    discountAmount?: number
    couponCode?: string
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
  const cartSubtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0)
  const discountAmount = appliedCoupon?.discount ?? 0
  const subtotal = Math.max(0, cartSubtotal - discountAmount)
  const calculator = useFeeCalculator(subtotal.toString())
  const vfideAmount = (subtotal / DEFAULT_VFIDE_PRICE).toFixed(2)
  
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

  const filteredProducts = useMemo(() => {
    if (selectedCategory === 'All') return products
    return products.filter(product => product.category === selectedCategory)
  }, [products, selectedCategory])
  
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
      if (!merchantContextAddress || !showQRPayment || !pendingPaymentRef.current) return
      
      for (const log of logs) {
        const args = (log as unknown as { args: { customer?: `0x${string}`, merchant?: `0x${string}`, amount?: bigint } }).args
        // Check if this payment is for us
        if (args.merchant?.toLowerCase() === merchantContextAddress.toLowerCase()) {
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
    enabled: showQRPayment && !!merchantContextAddress,
  })
  
  const logStaffActivity = useCallback(async (
    action: 'sale' | 'product_edit' | 'refund',
    details: Record<string, unknown>,
  ) => {
    if (!activeStaffSession?.sessionToken || typeof fetch !== 'function') return

    try {
      await fetch('/api/merchant/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'log',
          staffToken: activeStaffSession.sessionToken,
          action,
          details,
        }),
      })
    } catch {
      // non-critical audit logging
    }
  }, [activeStaffSession])

  // Handle confirmed payment from blockchain event
  const handlePaymentConfirmed = useCallback((customerAddress: `0x${string}` | string, amount: string) => {
    if (!pendingPaymentRef.current) return
    
    // Capture and clear pending ref FIRST to prevent double-processing
    const pending = pendingPaymentRef.current
    pendingPaymentRef.current = null
    
    const timestamp = new Date().getTime()
    const rawSaleSubtotal = pending.cartSnapshot.reduce((sum, item) => sum + (item.price * item.quantity), 0)
    const saleDiscount = appliedCoupon?.discount ?? 0
    const sale: Sale = {
      id: timestamp.toString(),
      timestamp: timestamp,
      items: [...pending.cartSnapshot],
      subtotal: Math.max(0, rawSaleSubtotal - saleDiscount),
      vfideAmount: amount,
      fee: processorFees.vfide,
      customerAddress: customerAddress,
      customerEmail: undefined,
      emailSent: false,
      staffSessionId: activeStaffSession?.id,
      staffName: activeStaffSession?.staffName,
      discountAmount: saleDiscount,
      couponCode: appliedCoupon?.code,
    }
    
    setSalesHistory(prev => [sale, ...prev])
    setCurrentSale(sale)
    setShowQRPayment(false)
    setShowEmailPrompt(true) // Ask for email after payment confirmed
    clearCart()

    // Notify server for webhook dispatch (fire-and-forget)
    if (typeof fetch === 'function') {
      fetch('/api/merchant/payments/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_address: customerAddress,
          amount,
          token: 'VFIDE',
          order_id: sale.id,
          staff_session_id: activeStaffSession?.id ?? null,
        }),
      }).catch(() => { /* non-critical */ })
    }

    if (activeStaffSession) {
      void logStaffActivity('sale', {
        saleId: sale.id,
        subtotal: sale.subtotal,
        itemCount: sale.items.length,
        customerAddress,
      })
    }
  }, [activeStaffSession, logStaffActivity, processorFees.vfide])

  // Add product to catalog (persisted to DB)
  const handleAddProduct = async () => {
    if (!newProduct.name || !newProduct.price) return
    if (!canEditProducts) {
      setStaffError('This staff session can view products but cannot edit them.')
      return
    }
    
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
    setStaffError(null)

    // Persist to DB
    try {
      if (typeof fetch !== 'function') {
        return
      }

      const res = await fetch('/api/merchant/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(activeStaffSession?.sessionToken ? { 'x-vfide-staff-session': activeStaffSession.sessionToken } : {}),
        },
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
        if (activeStaffSession) {
          void logStaffActivity('product_edit', {
            operation: 'create',
            productName: product.name,
            price: product.price,
          })
        }
      } else {
        setStaffError('Product was added locally, but server sync is still pending.')
      }
    } catch {
      setStaffError('Product was added locally, but server sync is still pending.')
    }
  }
  
  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) {
      setCouponStatus('Enter a promo code to apply it.')
      return
    }
    if (!merchantContextAddress || typeof fetch !== 'function' || cartSubtotal <= 0) {
      setCouponStatus('Add items to the cart before applying a promo code.')
      return
    }

    try {
      const params = new URLSearchParams({
        code: couponCode.trim().toUpperCase(),
        merchant: merchantContextAddress,
        amount: cartSubtotal.toString(),
      })
      const response = await fetch(`/api/merchant/coupons/validate?${params.toString()}`)
      const data = await response.json().catch(() => null)
      if (!response.ok || !data?.valid) {
        setAppliedCoupon(null)
        setCouponStatus(data?.reason || 'Promo code is not valid for this cart.')
        return
      }

      const resolvedDiscount = Number(data.discount ?? 0)
      setAppliedCoupon({ code: couponCode.trim().toUpperCase(), discount: resolvedDiscount })
      setCouponStatus(`Promo applied — saved $${resolvedDiscount.toFixed(2)}.`)
    } catch {
      setCouponStatus('Unable to validate promo code right now.')
    }
  }

  // Add to cart
  const addToCart = (product: Product) => {
    if (!canProcessSales) {
      setStaffError('This staff session cannot process sales.')
      return
    }

    if (appliedCoupon) {
      setAppliedCoupon(null)
      setCouponStatus('Cart updated — reapply promo code.')
    }

    setStaffError(null)
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
    if (appliedCoupon) {
      setAppliedCoupon(null)
      setCouponStatus('Cart updated — reapply promo code.')
    }

    setCart(cart.map(item => {
      if (item.id === id) {
        const newQty = Math.max(0, item.quantity + change)
        return { ...item, quantity: newQty }
      }
      return item
    }).filter(item => item.quantity > 0))
  }
  
  // Clear cart
  const clearCart = () => {
    setCart([])
    setAppliedCoupon(null)
    setCouponCode('')
    setCouponStatus(null)
  }
  
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
    // In production: await fetch('/api/send-receipt', { method: 'POST', body: JSON.stringify({ sale, email }) })
    void sale; void email; // Placeholder until API integration
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
  const staffDailySalesTotal = activeStaffSession
    ? todaysSales
        .filter(sale => sale.staffSessionId === activeStaffSession.id)
        .reduce((sum, sale) => sum + sale.subtotal, 0)
    : 0
  const exceedsSingleSaleLimit = Boolean(activeStaffSession && subtotal > activeStaffSession.permissions.maxSaleAmount)
  const exceedsDailyLimit = Boolean(
    activeStaffSession && subtotal > 0 && (staffDailySalesTotal + subtotal) > activeStaffSession.permissions.dailySaleLimit
  )
  const checkoutDisabled = !canProcessSales || subtotal <= 0 || exceedsSingleSaleLimit || exceedsDailyLimit
  
  // Generate payment QR code
  const generatePaymentURL = () => {
    const params = new URLSearchParams({
      merchant: merchantContextAddress || '',
      amount: vfideAmount,
      source: 'qr',
      settlement: 'instant',
    })
    if (cart.length > 0) params.set('orderId', `POS-${Date.now()}`)
    if (activeStaffSession?.id) params.set('staffSessionId', activeStaffSession.id)
    return `${window.location.origin}/pay?${params.toString()}`
  }
  
  if (!isMerchant && !activeStaffSession) {
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
            {(businessName || 'VFIDE Merchant')} POS
          </h1>
          <p className="text-zinc-100/60">
            Point of sale with no processor fees (burn + gas apply)
          </p>
        </div>

        {activeStaffSession && (
          <div className="mb-4 rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">
            <div className="font-semibold">
              Staff mode active: {activeStaffSession.staffName} ({activeStaffSession.role})
            </div>
            <div className="text-amber-200/80">
              Per-sale limit ${activeStaffSession.permissions.maxSaleAmount.toFixed(2)} • Daily limit ${activeStaffSession.permissions.dailySaleLimit.toFixed(2)}
            </div>
          </div>
        )}

        {staffError && (
          <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {staffError}
          </div>
        )}
        
        {/* Tabs */}
        <div className="flex gap-4 mb-6 flex-wrap">
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
          {canViewProducts && (
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
          )}
          {canViewAnalytics && (
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
          )}
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
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-4 py-2 rounded-lg transition-colors text-sm ${
                        selectedCategory === cat
                          ? 'bg-cyan-400 text-zinc-950'
                          : 'bg-cyan-400/10 text-cyan-400 hover:bg-cyan-400/20'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
                
                {/* Product Grid */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {filteredProducts.map(product => (
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
                      <span className="font-bold">${cartSubtotal.toFixed(2)}</span>
                    </div>
                    {discountAmount > 0 && (
                      <div className="flex justify-between text-emerald-300">
                        <span>Promo discount ({appliedCoupon?.code})</span>
                        <span className="font-bold">-${discountAmount.toFixed(2)}</span>
                      </div>
                    )}
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
                  
                  <div className="rounded-lg border border-cyan-400/20 bg-zinc-950 p-3">
                    <p className="mb-2 text-xs text-zinc-100/60">Promo code</p>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={couponCode}
                        onChange={(event) => setCouponCode(event.target.value.toUpperCase())}
                        placeholder="WELCOME10"
                        className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white uppercase placeholder-gray-500 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={handleApplyCoupon}
                        className="rounded-lg border border-cyan-400/30 px-4 py-2 text-sm font-semibold text-cyan-300"
                      >
                        Apply
                      </button>
                    </div>
                    {couponStatus && (
                      <p className={`mt-2 text-xs ${discountAmount > 0 ? 'text-emerald-300' : 'text-amber-300'}`}>
                        {couponStatus}
                      </p>
                    )}
                  </div>

                  {/* Generate QR Button */}
                  <button
                    onClick={() => setShowQRPayment(true)}
                    disabled={checkoutDisabled}
                    className={`w-full font-bold py-4 rounded-xl transition-transform ${
                      checkoutDisabled
                        ? 'cursor-not-allowed bg-zinc-800 text-zinc-400'
                        : 'bg-gradient-to-r from-emerald-400 to-cyan-400 text-zinc-950 hover:scale-105'
                    }`}
                  >
                    Generate QR Payment
                  </button>
                  {exceedsSingleSaleLimit && activeStaffSession && (
                    <p className="text-sm text-amber-300">
                      This sale exceeds the cashier limit of ${activeStaffSession.permissions.maxSaleAmount.toFixed(2)}.
                    </p>
                  )}
                  {exceedsDailyLimit && activeStaffSession && (
                    <p className="text-sm text-amber-300">
                      This checkout would exceed the daily limit of ${activeStaffSession.permissions.dailySaleLimit.toFixed(2)}.
                    </p>
                  )}
                </motion.div>
              )}
            </div>
          </div>
        )}
        
        {activeTab === 'products' && canViewProducts && (
          /* PRODUCTS MANAGEMENT VIEW */
          <div className="bg-zinc-950/80 backdrop-blur-xl rounded-xl p-6 border border-cyan-400/20">
            <div className="flex justify-between items-center mb-6 gap-4">
              <div>
                <h2 className="text-2xl font-bold text-zinc-100">Manage Products</h2>
                {activeStaffSession && !canEditProducts && (
                  <p className="mt-1 text-sm text-zinc-100/60">Read-only catalog access for this staff session.</p>
                )}
              </div>
              {canEditProducts && (
                <button
                  onClick={() => setShowAddProduct(true)}
                  className="bg-gradient-to-r from-emerald-400 to-cyan-400 text-zinc-950 font-bold px-6 py-3 rounded-lg hover:scale-105 transition-transform"
                >
                  + Add Product
                </button>
              )}
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
                    {canEditProducts && (
                      <button
                        onClick={() => setProducts(products.filter(p => p.id !== product.id))}
                        className="text-red-500 hover:text-red-400 px-3 py-2"
                      >
                        🗑️
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {activeTab === 'sales' && canViewAnalytics && (
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
                    onChange={(e) => setNewProduct({...newProduct, name: e.target.value})}
                    placeholder="Cappuccino"
                    className="w-full bg-zinc-950 border border-cyan-400/30 rounded-lg px-4 py-3 text-zinc-100 focus:border-cyan-400 outline-none"
                  />
                </div>
                
                <div>
                  <label className="block text-sm text-zinc-100/70 mb-2">Price (USD) *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newProduct.price}
                    onChange={(e) => setNewProduct({...newProduct, price: e.target.value})}
                    placeholder="4.50"
                    className="w-full bg-zinc-950 border border-cyan-400/30 rounded-lg px-4 py-3 text-zinc-100 focus:border-cyan-400 outline-none"
                  />
                </div>
                
                <div>
                  <label className="block text-sm text-zinc-100/70 mb-2">Category</label>
                  <input
                    type="text"
                    value={newProduct.category}
                    onChange={(e) => setNewProduct({...newProduct, category: e.target.value})}
                    placeholder="Coffee, Food, Drinks..."
                    className="w-full bg-zinc-950 border border-cyan-400/30 rounded-lg px-4 py-3 text-zinc-100 focus:border-cyan-400 outline-none"
                  />
                </div>
                
                <div>
                  <label className="block text-sm text-zinc-100/70 mb-2">Description</label>
                  <textarea
                    value={newProduct.description}
                    onChange={(e) => setNewProduct({...newProduct, description: e.target.value})}
                    placeholder="Double shot espresso with steamed milk..."
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
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    placeholder="customer@example.com"
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
                {currentSale.discountAmount ? (
                  <div className="flex justify-between text-sm text-green-600">
                    <span>Promo discount{currentSale.couponCode ? ` (${currentSale.couponCode})` : ''}</span>
                    <span className="font-bold">-${currentSale.discountAmount.toFixed(2)}</span>
                  </div>
                ) : null}
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

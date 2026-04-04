/**
 * Point of Sale Page
 * Full merchant POS system with product management and QR payments
 */

'use client'

import { Footer } from '@/components/layout/Footer'
import { MerchantPOS } from '@/components/commerce/MerchantPOS'
import SimplifiedPOS from '@/components/commerce/simplified/SimplifiedPOS'

export default function POSPage() {
  return (
    <>
      <div className="space-y-8 pt-20">
        <h1 className="sr-only">Point of Sale</h1>
        <MerchantPOS />

        <section className="container mx-auto max-w-6xl px-4 pb-4">
          <div className="mb-4">
            <h2 className="text-2xl font-bold text-white">Simplified POS</h2>
            <p className="text-sm text-gray-400">A lightweight cashier workflow optimized for quick baskets, touch devices, and voice prompts.</p>
          </div>
          <SimplifiedPOS />
        </section>
      </div>
      <Footer />
    </>
  )
}

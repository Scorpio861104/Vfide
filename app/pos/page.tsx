/**
 * Point of Sale Page
 * Full merchant POS system with product management and QR payments
 */

'use client'

import { GlobalNav } from '@/components/layout/GlobalNav'
import { Footer } from '@/components/layout/Footer'
import { MerchantPOS } from '@/components/commerce/MerchantPOS'

export default function POSPage() {
  return (
    <>
      <GlobalNav />
      <div className="pt-20">
        <MerchantPOS />
      </div>
      <Footer />
    </>
  )
}

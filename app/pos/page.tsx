'use client';

export const dynamic = 'force-dynamic';

/**
 * Point of Sale Page
 * Full merchant POS system with product management and QR payments
 */


import { Footer } from '@/components/layout/Footer'
import { MerchantPOS } from '@/components/commerce/MerchantPOS'

export default function POSPage() {
  return (
    <>
      <div className="pt-20">
        <h1 className="sr-only">Point of Sale</h1>
        <MerchantPOS />
      </div>
      <Footer />
    </>
  )
}

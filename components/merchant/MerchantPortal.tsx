'use client';

import { useState } from 'react';
import { useAccount } from 'wagmi';
import { motion } from 'framer-motion';
import { Store, CreditCard, TrendingUp, Package, Key } from 'lucide-react';

import { PaymentRequestsSection } from './extracted/PaymentRequestsSection';
import { RevenueSection } from './extracted/RevenueSection';
import { ProductsSection } from './extracted/ProductsSection';
import { OrdersSection } from './extracted/OrdersSection';
import { ReviewsSection } from './extracted/ReviewsSection';
import { ApiKeysSection } from './extracted/ApiKeysSection';

const tabs = [
  { id: 'payments', label: 'Payments', icon: CreditCard },
  { id: 'revenue', label: 'Revenue', icon: TrendingUp },
  { id: 'products', label: 'Products', icon: Package },
  { id: 'api', label: 'API Keys', icon: Key },
] as const;
type TabId = typeof tabs[number]['id'];

export default function MerchantPortal() {
  const { address } = useAccount();
  const [activeTab, setActiveTab] = useState<TabId>('payments');

  return (
    <div className="min-h-screen bg-zinc-950 pt-20">
      <div className="container mx-auto px-4 max-w-6xl py-8">
        <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="text-4xl font-bold text-white mb-2 flex items-center gap-3">
          <Store className="text-cyan-400" /> Merchant Portal
        </motion.h1>
        <p className="text-white/60 mb-8">Manage payments, products, and revenue</p>
        <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm whitespace-nowrap transition-all ${
                activeTab === tab.id ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'bg-white/5 text-gray-400 border border-white/10 hover:text-white'
              }`}><tab.icon size={16} />{tab.label}</button>
          ))}
        </div>
        {activeTab === 'payments' && <PaymentRequestsSection merchantAddress={address} />}
        {activeTab === 'revenue' && <RevenueSection />}
        {activeTab === 'products' && <ProductsSection />}
        {activeTab === 'api' && <ApiKeysSection />}
      </div>
    </div>
  );
}

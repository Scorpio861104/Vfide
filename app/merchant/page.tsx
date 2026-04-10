'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, Store } from 'lucide-react';
import { Footer } from '@/components/layout/Footer';
import { MerchantDashboard } from '@/components/merchant/MerchantDashboard';
import { PaymentInterface } from '@/components/merchant/PaymentInterface';
import { PaymentQR } from '@/components/merchant/PaymentQR';

const processors = [
  { name: 'Square', fee: '2.6% + $0.10' },
  { name: 'Stripe', fee: '2.9% + $0.30' },
  { name: 'PayPal', fee: '3.49% + $0.49' },
  { name: 'VFIDE', fee: '0%*' },
];

const onboardingSteps = [
  { title: 'Register Your Business', description: 'Set your merchant identity, settlement wallet, and storefront profile.' },
  { title: 'Configure Settings', description: 'Enable products, notifications, taxes, and payout preferences in one place.' },
  { title: 'Start Accepting Payments', description: 'Go live with payment links, QR checkout, and merchant analytics.' },
];

export default function MerchantPage() {
  return (
    <>
      <div className="min-h-screen bg-zinc-950 pt-20">
        <section className="py-20">
          <div className="container mx-auto max-w-6xl px-4 text-center">
            <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-6 text-5xl font-bold text-white md:text-6xl">
              Merchant Portal
            </motion.h1>
            <p className="mx-auto mb-8 max-w-2xl text-xl text-gray-400">
              Launch checkout, invoicing, and merchant operations without giving up margin to traditional processors.
            </p>
            <Link
              href="/merchant/setup"
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-8 py-4 text-lg font-bold text-white transition-transform hover:scale-[1.02]"
            >
              <Store size={22} />
              Open Merchant Portal
              <ArrowRight size={20} />
            </Link>
          </div>
        </section>

        <section className="border-y border-white/5 py-16">
          <div className="container mx-auto max-w-4xl px-4">
            <h2 className="mb-8 text-center text-2xl font-bold text-white">vs Traditional Processors</h2>
            <div className="space-y-3">
              {processors.map((processor) => (
                <div key={processor.name} className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div>
                    <div className="font-semibold text-white">{processor.name}</div>
                    <div className="text-sm text-gray-400">Processing Fee</div>
                  </div>
                  <div className="font-mono text-lg text-cyan-300">{processor.fee}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-16">
          <div className="container mx-auto max-w-6xl px-4">
            <div className="grid gap-6 lg:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-white/3 p-5">
                <h2 className="mb-4 text-2xl font-bold text-white">Merchant Dashboard</h2>
                <MerchantDashboard />
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/3 p-5">
                <h2 className="mb-4 text-2xl font-bold text-white">Make Payment</h2>
                <PaymentInterface />
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/3 p-5">
                <h2 className="mb-4 text-2xl font-bold text-white">Generate Payment QR Code</h2>
                <PaymentQR />
              </div>
            </div>
          </div>
        </section>

        <section className="py-20">
          <div className="container mx-auto max-w-4xl px-4">
            <h2 className="mb-12 text-center text-3xl font-bold text-white">Getting Started</h2>
            <div className="space-y-6">
              {onboardingSteps.map((step, index) => (
                <div key={step.title} className="rounded-2xl border border-white/10 bg-white/3 p-5">
                  <div className="mb-2 text-sm font-bold text-cyan-300">Step {index + 1}</div>
                  <h3 className="text-xl font-semibold text-white">{step.title}</h3>
                  <p className="mt-2 text-gray-400">{step.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
      <Footer />
    </>
  );
}

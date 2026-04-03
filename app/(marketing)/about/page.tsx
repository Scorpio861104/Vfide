import { ArrowRight } from 'lucide-react';
import Link from 'next/link';

export const metadata = { title: 'About VFIDE', description: 'Zero merchant fees. Non-custodial vaults. Built for everyone the platforms forgot.' };

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-zinc-950 pt-24">
      <div className="container mx-auto px-4 max-w-4xl py-12">
        <h1 className="text-5xl font-bold text-white mb-6">About VFIDE</h1>
        <p className="text-xl text-gray-400 mb-12 leading-relaxed">A decentralized payment protocol where merchants pay zero fees and trust is earned through real transactions.</p>
        <div className="space-y-12">
          <section><h2 className="text-2xl font-bold text-white mb-4">The Problem</h2><p className="text-gray-400 leading-relaxed">Every payment platform takes a cut. Square charges 2.6% + $0.10. Stripe takes 2.9% + $0.30. Etsy takes 6.5%. For a food truck doing $3,000/month, that is $90+ lost to middlemen.</p></section>
          <section><h2 className="text-2xl font-bold text-white mb-4">The Solution</h2><p className="text-gray-400 leading-relaxed">Merchants receive 100% of every sale. Buyers pay a small trust fee that decreases as ProofScore grows. 35% burned, 20% to charity, the rest sustains the ecosystem.</p></section>
          <section><h2 className="text-2xl font-bold text-white mb-4">Who It Serves</h2><p className="text-gray-400 leading-relaxed">Food truck owners. Freelance hairstylists. Market sellers. Craft vendors. Tattoo artists. Dog walkers. Seamstresses. Anyone who creates value and gets taxed by the platform. From Accra to Atlanta, Lagos to LA, Sao Paulo to Sacramento.</p></section>
          <section className="text-center pt-8 border-t border-white/5"><Link href="/merchant/setup" className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-xl font-bold">Start selling <ArrowRight size={18} /></Link></section>
        </div>
      </div>
    </div>
  );
}

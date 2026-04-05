'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Footer } from '@/components/layout/Footer';
import { HeroVisualization } from './components/HeroVisualization';

const COPY = {
  'en-US': {
    heading: 'VFIDE Home',
    heroTitle: 'Accept Crypto. Zero Fees.',
    heroBody: 'Trust-scored payments, non-custodial vaults, and real utility for everyone the platforms forgot.',
    primaryCta: 'Get Started',
    secondaryCta: 'Explore Flashloans P2P',
    merchantCta: 'Start Accepting Payments',
    docsCta: 'Read Documentation',
    builtFor: 'Built for Base',
  },
  'es-ES': {
    heading: 'VFIDE Home',
    heroTitle: 'Acepta criptomonedas. Cero comisiones.',
    heroBody: 'Pagos con confianza, bóvedas sin custodia y utilidad real para quienes las plataformas olvidaron.',
    primaryCta: 'Comenzar',
    secondaryCta: 'Explorar Flashloans P2P',
    merchantCta: 'Aceptar pagos con VFIDE',
    docsCta: 'Leer documentación',
    builtFor: 'Creado para Base',
  },
} as const;

export default function Home() {
  const [locale, setLocale] = useState<'en-US' | 'es-ES'>('en-US');

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem('vfide_locale');
      if (stored === 'en-US' || stored === 'es-ES') {
        setLocale(stored);
      }
    } catch {
      // ignore storage issues in restricted environments
    }
  }, []);

  const copy = COPY[locale];

  const handleLocaleChange = (value: 'en-US' | 'es-ES') => {
    setLocale(value);
    try {
      window.localStorage.setItem('vfide_locale', value);
    } catch {
      // ignore storage issues in restricted environments
    }
  };

  return (
    <>
      <div className="min-h-screen bg-zinc-950 relative overflow-hidden">
        <section className="pt-24 pb-20 relative">
          <div className="container mx-auto px-4 max-w-6xl space-y-8">
            <div className="flex items-center gap-3">
              <label htmlFor="home-language" className="text-sm text-gray-300">Language</label>
              <select
                id="home-language"
                value={locale}
                onChange={(event) => handleLocaleChange(event.target.value as 'en-US' | 'es-ES')}
                className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-white"
              >
                <option value="en-US">English</option>
                <option value="es-ES">Español</option>
              </select>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
                <h1 className="text-5xl md:text-6xl font-bold text-white leading-tight">{copy.heading}</h1>
                <div className="space-y-3">
                  <p className="text-2xl md:text-3xl font-semibold text-cyan-300">{copy.heroTitle}</p>
                  <p className="text-xl text-gray-400 max-w-xl">{copy.heroBody}</p>
                </div>
                <div className="flex flex-wrap gap-4">
                  <Link href="/token-launch" className="px-8 py-4 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-xl font-bold text-lg hover:scale-[1.02] transition-transform">
                    {copy.primaryCta}
                  </Link>
                  <Link href="/flashloans" className="px-8 py-4 bg-white/5 border border-white/10 text-white rounded-xl font-bold text-lg hover:bg-white/10 transition-colors">
                    {copy.secondaryCta}
                  </Link>
                </div>
                <div className="flex flex-wrap gap-3 text-sm text-cyan-100">
                  <span className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1">14 Contracts Deployed</span>
                  <span className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1">2.8K Vaults (Testnet)</span>
                  <span className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1">{copy.builtFor}</span>
                </div>
                <div className="flex flex-wrap gap-4">
                  <Link href="/merchant" className="text-cyan-300 font-semibold hover:text-cyan-200">{copy.merchantCta}</Link>
                  <Link href="/docs" className="text-cyan-300 font-semibold hover:text-cyan-200">{copy.docsCta}</Link>
                </div>
              </motion.div>

              <HeroVisualization />
            </div>
          </div>
        </section>
      </div>
      <Footer />
    </>
  );
}

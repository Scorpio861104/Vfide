'use client';

import { Footer } from "@/components/layout/Footer";
import { motion } from "framer-motion";
import { Shield, Users, Zap, Heart } from "lucide-react";
import { useLocale } from '@/lib/locale/LocaleProvider';

const ABOUT_COPY = {
  'en-US': {
    badge: 'Protocol Story',
    title: 'About VFIDE',
    hero: 'A decentralized payment protocol built on integrity, not wealth. Where trust is earned through actions, not purchased with capital.',
    missionTitle: 'Our Mission',
    missionBody1: 'VFIDE exists to create a financial system that values integrity over wealth. We believe that trust should be earned through actions, not bought with money.',
    missionBody2: "Our ProofScore system rewards good behavior, community participation, and honest dealings - not the size of your wallet. A user with 1 VFIDE token can have the same influence as someone with 500,000 tokens if they've demonstrated genuine trust and contribution.",
    openSourceTitle: 'Open Source & Transparent',
    openSourceBody: 'All VFIDE smart contracts are open source, professionally audited, and deployed on public blockchains. Verify everything yourself.',
    githubCta: 'View Source Code on GitHub',
  },
  'es-ES': {
    badge: 'Historia del protocolo',
    title: 'Sobre VFIDE',
    hero: 'Un protocolo de pagos descentralizado construido sobre integridad, no riqueza. Donde la confianza se gana con acciones, no con capital.',
    missionTitle: 'Nuestra misión',
    missionBody1: 'VFIDE existe para crear un sistema financiero que valore la integridad por encima de la riqueza. Creemos que la confianza debe ganarse con acciones, no comprarse con dinero.',
    missionBody2: 'Nuestro sistema ProofScore recompensa el buen comportamiento, la participación comunitaria y los tratos honestos, no el tamaño de tu billetera. Un usuario con 1 token VFIDE puede tener la misma influencia que alguien con 500,000 tokens si demuestra confianza y aporte reales.',
    openSourceTitle: 'Código abierto y transparencia',
    openSourceBody: 'Todos los contratos inteligentes de VFIDE son de código abierto, auditados profesionalmente y desplegados en blockchains públicas. Verifícalo todo por tu cuenta.',
    githubCta: 'Ver código fuente en GitHub',
  },
  'fr-FR': {
    badge: 'Histoire du protocole',
    title: 'À propos de VFIDE',
    hero: 'Un protocole de paiement décentralisé fondé sur l’intégrité, pas sur la richesse. Ici, la confiance se gagne par les actions, pas par le capital.',
    missionTitle: 'Notre mission',
    missionBody1: 'VFIDE existe pour créer un système financier qui valorise l’intégrité plutôt que la richesse. Nous pensons que la confiance doit être gagnée par les actions.',
    missionBody2: "Notre système ProofScore récompense les bons comportements, la participation communautaire et les échanges honnêtes, pas la taille du portefeuille.",
    openSourceTitle: 'Open source et transparent',
    openSourceBody: 'Tous les contrats intelligents VFIDE sont open source, audités et déployés sur des blockchains publiques.',
    githubCta: 'Voir le code source sur GitHub',
  },
  'de-DE': {
    badge: 'Protokollgeschichte',
    title: 'Über VFIDE',
    hero: 'Ein dezentrales Zahlungsprotokoll, das auf Integrität statt Vermögen basiert. Vertrauen wird durch Handeln verdient.',
    missionTitle: 'Unsere Mission',
    missionBody1: 'VFIDE schafft ein Finanzsystem, das Integrität über Vermögen stellt. Vertrauen soll durch Verhalten entstehen, nicht gekauft werden.',
    missionBody2: 'Unser ProofScore belohnt gutes Verhalten, Gemeinschaftsbeiträge und faire Interaktionen, nicht die Wallet-Größe.',
    openSourceTitle: 'Open Source & transparent',
    openSourceBody: 'Alle VFIDE Smart Contracts sind Open Source, professionell geprüft und öffentlich deployt.',
    githubCta: 'Quellcode auf GitHub ansehen',
  },
};

export default function AboutPage() {
  const { locale } = useLocale();
  const copy = (ABOUT_COPY as Record<string, typeof ABOUT_COPY['en-US']>)[locale] ?? ABOUT_COPY['en-US'];

  return (
    <>
      
      <main className="min-h-screen bg-zinc-950 md:pt-[3.5rem] text-white relative">
        {/* Ambient orbs */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -left-20 w-[600px] h-[600px] rounded-full opacity-[0.07]"
            style={{ background: 'radial-gradient(circle, #06b6d4 0%, transparent 70%)' }} />
          <div className="absolute bottom-0 -right-24 w-[500px] h-[500px] rounded-full opacity-[0.05]"
            style={{ background: 'radial-gradient(circle, #8b5cf6 0%, transparent 70%)' }} />
        </div>
        <div className="grid-pattern pointer-events-none absolute inset-0 opacity-20" />
        {/* Hero */}
        <section className="relative py-20 bg-gradient-to-b from-zinc-900/50 to-transparent border-b border-white/5">
          <div className="container mx-auto px-3 sm:px-4">
            <motion.div
              initial={{ opacity: 1, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center max-w-4xl mx-auto"
            >
              <div className="badge-live mb-6 justify-center">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" /> {copy.badge}
              </div>
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black text-zinc-100 mb-6 tracking-tight">
                {copy.title}
              </h1>
              <p className="text-xl md:text-2xl text-zinc-400 leading-relaxed">
                {copy.hero}
              </p>
            </motion.div>
          </div>
        </section>

        {/* Mission */}
        <section className="py-16">
          <div className="container mx-auto px-4 max-w-4xl">
            <motion.div
              initial={{ opacity: 1, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="bg-zinc-800 border border-zinc-700 rounded-xl p-8 mb-12"
            >
              <h2 className="text-3xl font-[family-name:var(--font-display)] font-bold text-cyan-400 mb-6">
                {copy.missionTitle}
              </h2>
              <p className="text-lg text-zinc-100 leading-relaxed mb-4">
                {copy.missionBody1}
              </p>
              <p className="text-lg text-zinc-400 leading-relaxed">
                {copy.missionBody2}
              </p>
            </motion.div>

            {/* Core Values */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
              <motion.div
                initial={{ opacity: 1, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                className="bg-zinc-800 border border-zinc-700 rounded-xl p-6"
              >
                <div className="w-12 h-12 bg-cyan-400/20 rounded-lg flex items-center justify-center mb-4">
                  <Shield className="w-6 h-6 text-cyan-400" />
                </div>
                <h3 className="text-xl font-bold text-zinc-100 mb-2">Guardian-Protected Self-Custody</h3>
                <p className="text-zinc-400">
                  Your funds live in your vault and your wallet remains the primary control surface.
                  Recovery, fraud review, and guardian protections add safety rails that users should understand before transacting.
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 1, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                className="bg-zinc-800 border border-zinc-700 rounded-xl p-6"
              >
                <div className="w-12 h-12 bg-emerald-400/20 rounded-lg flex items-center justify-center mb-4">
                  <Users className="w-6 h-6 text-emerald-400" />
                </div>
                <h3 className="text-xl font-bold text-zinc-100 mb-2">Community Governed</h3>
                <p className="text-zinc-400">
                  Every protocol decision is made by the community through DAO governance.
                  No central authority, no hidden agendas.
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 1, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 }}
                className="bg-zinc-800 border border-zinc-700 rounded-xl p-6"
              >
                <div className="w-12 h-12 bg-amber-400/20 rounded-lg flex items-center justify-center mb-4">
                  <Zap className="w-6 h-6 text-amber-400" />
                </div>
                <h3 className="text-xl font-bold text-zinc-100 mb-2">No Processor Fees</h3>
                <p className="text-zinc-400">
                  Merchants pay no payment processing fees like Stripe/PayPal. Network burn fees (0.25-5%) and Base gas apply.
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 1, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 }}
                className="bg-zinc-800 border border-zinc-700 rounded-xl p-6"
              >
                <div className="w-12 h-12 bg-red-600/20 rounded-lg flex items-center justify-center mb-4">
                  <Heart className="w-6 h-6 text-red-600" />
                </div>
                <h3 className="text-xl font-bold text-zinc-100 mb-2">For Everyone</h3>
                <p className="text-zinc-400">
                  No KYC, no geo-restrictions, no minimums. If you have a wallet, you&apos;re in.
                  Financial inclusion for all.
                </p>
              </motion.div>
            </div>

            {/* Philosophy */}
            <motion.div
              initial={{ opacity: 1, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="bg-gradient-to-r from-cyan-400/10 to-blue-500/10 border-2 border-cyan-400/30 rounded-xl p-8 text-center"
            >
              <h2 className="text-2xl font-bold text-cyan-400 mb-4">
                &quot;This is not a system for the rich. This is for the forgotten and the struggling.&quot;
              </h2>
              <p className="text-zinc-400">
                VFIDE Core Philosophy
              </p>
            </motion.div>
          </div>
        </section>

        {/* Open Source */}
        <section className="py-16 bg-zinc-800">
          <div className="container mx-auto px-4 max-w-4xl text-center">
            <h2 className="text-3xl font-bold text-zinc-100 mb-4">{copy.openSourceTitle}</h2>
            <p className="text-zinc-400 mb-8">
              {copy.openSourceBody}
            </p>
            <a
              href="https://github.com/Scorpio861104/Vfide"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block px-8 py-3 bg-gradient-to-r from-cyan-400 to-blue-500 text-zinc-900 rounded-lg font-bold hover:scale-105 transition-transform"
            >
              {copy.githubCta}
            </a>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}

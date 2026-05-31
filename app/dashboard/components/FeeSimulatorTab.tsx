'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Calculator } from 'lucide-react';
import { useLocale } from '@/lib/locale/LocaleProvider';

import { GlassCard, containerVariants, itemVariants } from './shared';

const FEE_SIM_COPY = {
  'en-US': {
    title: 'Fee Simulator',
    subtitle: 'See how your ProofScore affects transaction fees',
    transferLabel: 'Transfer Amount (VFIDE)',
    scoreLabel: 'Simulated ProofScore',
    feeRate: 'Fee Rate',
    feeAmount: 'Fee Amount',
    receive: 'You Receive',
    tip: 'Tip',
    unlock: 'Increase your score to 8000 to unlock the minimum 0.25% rate!',
  },
  'es-ES': {
    title: 'Simulador de comisiones',
    subtitle: 'Observa cómo tu ProofScore afecta las comisiones de transacción',
    transferLabel: 'Monto de transferencia (VFIDE)',
    scoreLabel: 'ProofScore simulado',
    feeRate: 'Tasa',
    feeAmount: 'Comisión',
    receive: 'Recibes',
    tip: 'Tip',
    unlock: 'Aumenta tu score a 8000 para desbloquear la tasa mínima de 0.25%!',
  },
};

function calculateFee(score: number) {
  if (score <= 4000) return 5.0;
  if (score >= 8000) return 0.25;
  return 5.0 - ((score - 4000) * 4.75) / 4000;
}

export function FeeSimulatorTab({ currentScore }: { currentScore: number }) {
  const [amount, setAmount] = useState(1000);
  const [simulatedScore, setSimulatedScore] = useState(currentScore);
  const { locale } = useLocale();
  const copy = (FEE_SIM_COPY as Record<string, typeof FEE_SIM_COPY['en-US']>)[locale] ?? FEE_SIM_COPY['en-US'];

  const feePercent = calculateFee(simulatedScore);
  const feeAmount = (amount * feePercent) / 100;
  const netAmount = amount - feeAmount;

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="mx-auto max-w-2xl space-y-6">
      <motion.div variants={itemVariants}>
        <GlassCard className="p-8" hover={false}>
          <h2 className="mb-2 flex items-center gap-3 text-2xl font-bold text-white">
            <Calculator className="text-cyan-400" size={28} />
            {copy.title}
          </h2>
          <p className="mb-8 text-white/60">{copy.subtitle}</p>

          <div className="space-y-8">
            <div>
              <label className="mb-3 block font-medium text-white/80">{copy.transferLabel}</label>
              <input
                type="number"
                value={amount}
                onChange={(e) =>  setAmount(Number(e.target.value))}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-4 text-xl font-bold text-white transition-colors focus:border-cyan-500/50 focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-3 block font-medium text-white/80">
                {copy.scoreLabel}: <span className="text-cyan-400">{simulatedScore}</span>
              </label>
              <input
                type="range"
                min={0}
                max={10000}
                value={simulatedScore}
                onChange={(e) =>  setSimulatedScore(Number(e.target.value))}
                className="h-3 w-full cursor-pointer appearance-none rounded-full bg-white/10 accent-cyan-500"
              />
              <div className="mt-2 flex justify-between text-xs text-white/40">
                <span>0</span>
                <span>4000 (5%)</span>
                <span>8000 (0.25%)</span>
                <span>10000</span>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 rounded-2xl border border-white/10 bg-white/5 p-6 sm:grid-cols-3">
              <div className="text-center">
                <p className="mb-1 text-sm text-white/60">{copy.feeRate}</p>
                <p className="text-2xl font-bold text-amber-400">{feePercent.toFixed(2)}%</p>
              </div>
              <div className="text-center sm:border-x sm:border-white/10">
                <p className="mb-1 text-sm text-white/60">{copy.feeAmount}</p>
                <p className="text-2xl font-bold text-red-400">-{feeAmount.toFixed(2)}</p>
              </div>
              <div className="text-center">
                <p className="mb-1 text-sm text-white/60">{copy.receive}</p>
                <p className="text-2xl font-bold text-emerald-400">{netAmount.toFixed(2)}</p>
              </div>
            </div>

            <div className="rounded-xl border border-cyan-500/30 bg-cyan-500/10 p-4">
              <p className="text-sm text-cyan-400">
                💡 <strong>{copy.tip}:</strong> Your current score of {currentScore} gives you a {calculateFee(currentScore).toFixed(2)}% fee rate.
                {currentScore < 8000 && ` ${copy.unlock}`}
              </p>
            </div>
          </div>
        </GlassCard>
      </motion.div>
    </motion.div>
  );
}

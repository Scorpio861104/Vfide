'use client';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { Calculator, TrendingDown, DollarSign, Zap } from 'lucide-react';

export function FeeSimulatorTab({ currentScore }: { currentScore: number }) {
  const [amount, setAmount] = useState(1000);
  const [simulatedScore, setSimulatedScore] = useState(currentScore);
  
  const calculateFee = (score: number) => {
    if (score <= 4000) return 5.00;
    if (score >= 8000) return 0.25;
    return 5.00 - ((score - 4000) * 4.75 / 4000);
  };
  
  const feePercent = calculateFee(simulatedScore);
  const feeAmount = (amount * feePercent) / 100;
  const netAmount = amount - feeAmount;
  
  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="max-w-2xl mx-auto space-y-6">
      <motion.div variants={itemVariants}>
        <GlassCard className="p-8" hover={false}>
          <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-3">
            <Calculator className="text-cyan-400" size={28} />
            Fee Simulator
          </h2>
          <p className="text-white/60 mb-8">See how your ProofScore affects transaction fees</p>
          
          <div className="space-y-8">
            <div>
              <label className="block text-white/80 font-medium mb-3">Transfer Amount (VFIDE)</label>
              <input type="number" value={amount} onChange={(e) => setAmount(Number(e.target.value))} className="w-full px-4 py-4 bg-white/5 border border-white/10 rounded-xl text-white text-xl font-bold focus:outline-none focus:border-cyan-500/50 transition-colors" />
            </div>
            
            <div>
              <label className="block text-white/80 font-medium mb-3">
                Simulated ProofScore: <span className="text-cyan-400">{simulatedScore}</span>
              </label>
              <input type="range" min={0} max={10000} value={simulatedScore} onChange={(e) => setSimulatedScore(Number(e.target.value))} className="w-full h-3 bg-white/10 rounded-full appearance-none cursor-pointer accent-cyan-500" />
              <div className="flex justify-between text-white/40 text-xs mt-2">
                <span>0</span>
                <span>4000 (5%)</span>
                <span>8000 (0.25%)</span>
                <span>10000</span>
              </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-6 bg-white/5 rounded-2xl border border-white/10">
              <div className="text-center">
                <p className="text-white/60 text-sm mb-1">Fee Rate</p>
                <p className="text-2xl font-bold text-amber-400">{feePercent.toFixed(2)}%</p>
              </div>
              <div className="text-center border-x border-white/10">
                <p className="text-white/60 text-sm mb-1">Fee Amount</p>
                <p className="text-2xl font-bold text-red-400">-{feeAmount.toFixed(2)}</p>
              </div>
              <div className="text-center">
                <p className="text-white/60 text-sm mb-1">You Receive</p>
                <p className="text-2xl font-bold text-emerald-400">{netAmount.toFixed(2)}</p>
              </div>
            </div>
            
            <div className="p-4 bg-cyan-500/10 border border-cyan-500/30 rounded-xl">
              <p className="text-cyan-400 text-sm">
                💡 <strong>Tip:</strong> Your current score of {currentScore} gives you a {calculateFee(currentScore).toFixed(2)}% fee rate.
                {currentScore < 8000 && ` Increase your score to 8000 to unlock the minimum 0.25% rate!`}
              </p>
            </div>
          </div>
        </GlassCard>
      </motion.div>
    </motion.div>
  );
}


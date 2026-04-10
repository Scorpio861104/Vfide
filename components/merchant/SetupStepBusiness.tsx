'use client';

import { motion } from 'framer-motion';
import { Store, ArrowRight } from 'lucide-react';
import { CATEGORIES } from './merchant-setup-types';

interface SetupStepBusinessProps {
  businessName: string; setBusinessName: (v: string) => void;
  category: string; setCategory: (v: string) => void;
  city: string; setCity: (v: string) => void;
  country: string; setCountry: (v: string) => void;
  tagline: string; setTagline: (v: string) => void;
  onNext: () => void;
  isValid: boolean;
}

export function SetupStepBusiness({
  businessName, setBusinessName, category, setCategory,
  city, setCity, country, setCountry, tagline, setTagline,
  onNext, isValid,
}: SetupStepBusinessProps) {
  return (
    <motion.div key="step1" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <Store className="text-cyan-400" size={24} /> Your business
        </h2>
        <p className="text-gray-400 mt-1">Tell us about your business. You can change these later.</p>
      </div>

      <div className="space-y-5">
        <div>
          <label className="text-sm text-gray-400 mb-1.5 block">Business name *</label>
          <input type="text" value={businessName} onChange={(e) =>  setBusinessName(e.target.value)}
            placeholder="e.g., Ama's Fabrics" maxLength={100} autoFocus
            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:border-cyan-500/50 focus:outline-none focus:ring-2 focus:ring-cyan-500/20" />
        </div>

        <div>
          <label className="text-sm text-gray-400 mb-1.5 block">Category *</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {CATEGORIES.map(cat => (
              <button key={cat.value} type="button" onClick={() => setCategory(cat.value)}
                className={`p-3 rounded-xl text-center text-sm transition-all border ${
                  category === cat.value ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-400' : 'bg-white/3 border-white/10 text-gray-400 hover:border-white/20'
                }`}>
                <div className="text-lg mb-1">{cat.emoji}</div>
                <div className="text-xs leading-tight">{cat.label}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm text-gray-400 mb-1.5 block">City</label>
            <input type="text" value={city} onChange={(e) =>  setCity(e.target.value)} placeholder="Accra" maxLength={100}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:border-cyan-500/50 focus:outline-none" />
          </div>
          <div>
            <label className="text-sm text-gray-400 mb-1.5 block">Country</label>
            <input type="text" value={country} onChange={(e) =>  setCountry(e.target.value)} placeholder="Ghana" maxLength={100}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:border-cyan-500/50 focus:outline-none" />
          </div>
        </div>

        <div>
          <label className="text-sm text-gray-400 mb-1.5 block">Tagline</label>
          <input type="text" value={tagline} onChange={(e) =>  setTagline(e.target.value)} placeholder="Handwoven kente cloth since 1998" maxLength={200}
            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:border-cyan-500/50 focus:outline-none" />
        </div>
      </div>

      <div className="mt-8 flex justify-end">
        <button disabled={!isValid} onClick={onNext}
          className={`px-8 py-3 rounded-xl font-bold flex items-center gap-2 transition-all ${
            isValid ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white hover:scale-[1.02]' : 'bg-white/5 text-gray-500 cursor-not-allowed'
          }`}>
          Add products <ArrowRight size={18} />
        </button>
      </div>
    </motion.div>
  );
}

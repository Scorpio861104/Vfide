'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import { Package, Camera, Plus, X, ArrowLeft, ArrowRight, Rocket, Loader2 } from 'lucide-react';
import { type QuickProduct } from './merchant-setup-types';

interface SetupStepProductsProps {
  products: QuickProduct[];
  updateProduct: (id: string, field: keyof QuickProduct, value: string | File | null) => void;
  removeProduct: (id: string) => void;
  addProduct: () => void;
  onBack: () => void;
  onSubmit: () => void;
  isValid: boolean;
  isSubmitting: boolean;
}

export function SetupStepProducts({
  products, updateProduct, removeProduct, addProduct,
  onBack, onSubmit, isValid, isSubmitting,
}: SetupStepProductsProps) {
  const handleImageCapture = (productId: string) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = 'environment';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) updateProduct(productId, 'imageFile', file);
    };
    input.click();
  };

  return (
    <motion.div key="step2" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <Package className="text-cyan-400" size={24} /> Add your products
        </h2>
        <p className="text-gray-400 mt-1">Add at least one product. You can add more after setup.</p>
      </div>

      <div className="space-y-4">
        {products.map((product, idx) => (
          <motion.div key={product.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="bg-white/3 border border-white/10 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <button onClick={() => handleImageCapture(product.id)}
                className="w-16 h-16 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0 overflow-hidden hover:border-cyan-500/30 transition-colors">
                {product.imagePreview ? (
                  <Image src={product.imagePreview} alt="" className="w-full h-full object-cover"  width={48} height={48} />
                ) : (
                  <Camera size={20} className="text-gray-500" />
                )}
              </button>

              <div className="flex-1 space-y-2">
                <input type="text" value={product.name} onChange={(e) =>  updateProduct(product.id, 'name', e.target.value)}
                  maxLength={200}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm  focus:border-cyan-500/50 focus:outline-none" />
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">$</span>
                    <input type="number" step="0.01" min="0" value={product.price}
                      onChange={(e) =>  updateProduct(product.id, 'price', e.target.value)}
                      className="w-full pl-7 pr-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm  focus:border-cyan-500/50 focus:outline-none" />
                  </div>
                  <input type="text" value={product.description} onChange={(e) =>  updateProduct(product.id, 'description', e.target.value)}
                    maxLength={200}
                    className="flex-[2] px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm  focus:border-cyan-500/50 focus:outline-none" />
                </div>
              </div>

              <button onClick={() => removeProduct(product.id)} className="text-gray-500 hover:text-red-400 transition-colors p-1">
                <X size={16} />
              </button>
            </div>
          </motion.div>
        ))}

        <button onClick={addProduct}
          className="w-full py-3 border-2 border-dashed border-white/10 rounded-xl text-gray-400 hover:text-cyan-400 hover:border-cyan-500/30 transition-all flex items-center justify-center gap-2">
          <Plus size={18} /> Add another product
        </button>
      </div>

      <div className="mt-8 flex justify-between">
        <button onClick={onBack} className="px-6 py-3 text-gray-400 hover:text-white flex items-center gap-2 transition-colors">
          <ArrowLeft size={18} /> Back
        </button>
        <button disabled={!isValid || isSubmitting} onClick={onSubmit}
          className={`px-8 py-3 rounded-xl font-bold flex items-center gap-2 transition-all ${
            isValid && !isSubmitting ? 'bg-gradient-to-r from-emerald-500 to-green-500 text-white hover:scale-[1.02]' : 'bg-white/5 text-gray-500 cursor-not-allowed'
          }`}>
          {isSubmitting ? <><Loader2 size={18} className="animate-spin" /> Creating store...</> : <><Rocket size={18} /> Go live</>}
        </button>
      </div>
    </motion.div>
  );
}

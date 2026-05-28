'use client';

/**
 * MerchantQuickSetup — 3-step wizard to create a storefront in under 2 minutes
 */
'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useAccount } from 'wagmi';
import { AnimatePresence } from 'framer-motion';
import { Check, ShieldAlert, TrendingUp } from 'lucide-react';
import { useRegisterMerchant } from '@/hooks/useMerchantHooks';
import { useProofScore } from '@/hooks/useProofScore';
import { toast } from '@/lib/toast';

import { type QuickProduct, type Step, generateId, slugify } from './merchant-setup-types';
import { SetupStepBusiness } from './SetupStepBusiness';
import { SetupStepProducts } from './SetupStepProducts';
import { SetupStepSuccess } from './SetupStepSuccess';

export function MerchantQuickSetup({ onComplete }: { onComplete?: (slug: string) => void }) {
  const { address, isConnected } = useAccount();
  const { registerMerchant: registerOnChain } = useRegisterMerchant();
  // Pre-flight ProofScore gate — contract requires MIN_MERCHANT = 5600
  const { score, canMerchant, isLoading: scoreLoading } = useProofScore(address);

  const [step, setStep] = useState<Step>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [completedSlug, setCompletedSlug] = useState<string | null>(null);

  // Step 1 state
  const [businessName, setBusinessName] = useState('');
  const [category, setCategory] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('');
  const [tagline, setTagline] = useState('');

  // Step 2 state
  const [products, setProducts] = useState<QuickProduct[]>([]);
  const productsRef = useRef<QuickProduct[]>([]);

  const step1Valid = businessName.trim().length >= 2 && category !== '';

  const addProduct = useCallback(() => {
    setProducts(prev => [...prev, { id: generateId(), name: '', price: '', description: '', imagePreview: null, imageFile: null }]);
  }, []);

  const updateProduct = useCallback((id: string, field: keyof QuickProduct, value: string | File | null) => {
    setProducts(prev => prev.map(p => {
      if (p.id !== id) return p;
      if (field === 'imageFile' && value instanceof File) {
        if (p.imagePreview?.startsWith('blob:')) {
          URL.revokeObjectURL(p.imagePreview);
        }
        return { ...p, imageFile: value, imagePreview: URL.createObjectURL(value) };
      }
      return { ...p, [field]: value };
    }));
  }, []);

  const removeProduct = useCallback((id: string) => {
    setProducts(prev => {
      const target = prev.find(p => p.id === id);
      if (target?.imagePreview?.startsWith('blob:')) {
        URL.revokeObjectURL(target.imagePreview);
      }
      return prev.filter(p => p.id !== id);
    });
  }, []);

  useEffect(() => {
    productsRef.current = products;
  }, [products]);

  useEffect(() => {
    return () => {
      for (const product of productsRef.current) {
        if (product.imagePreview?.startsWith('blob:')) {
          URL.revokeObjectURL(product.imagePreview);
        }
      }
    };
  }, []);

  const validProducts = products.filter(p => p.name.trim() && parseFloat(p.price) > 0);
  const step2Valid = validProducts.length >= 1;

  const handleSubmit = async () => {
    if (!address || !isConnected) { toast.error('Please connect your wallet first.'); return; }
    setIsSubmitting(true);
    try {
      try { await registerOnChain(businessName.trim(), category); }
      catch (err) {
        const msg = err instanceof Error ? err.message : '';
        if (!msg.includes('already') && !msg.includes('registered')) {
          toast.error('On-chain registration failed: ' + msg.slice(0, 80));
          setIsSubmitting(false);
          return;
        }
      }

      const slug = slugify(businessName.trim());
      const profileRes = await fetch('/api/merchant/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ display_name: businessName.trim(), slug, tagline: tagline.trim() || null, city: city.trim() || null, country: country.trim() || null, category }),
      });

      if (!profileRes.ok) {
        const data = await profileRes.json().catch(() => ({}));
        toast.error((data as { error?: string }).error || 'Failed to create profile.');
        setIsSubmitting(false);
        return;
      }

      for (const product of validProducts) {
        let imageUrl: string | null = null;
        if (product.imageFile) {
          const formData = new FormData();
          formData.append('file', product.imageFile);
          formData.append('purpose', 'merchant-product');

          const uploadRes = await fetch('/api/media/upload', {
            method: 'POST',
            body: formData,
          });

          if (!uploadRes.ok) {
            const uploadData = await uploadRes.json().catch(() => ({}));
            toast.error((uploadData as { error?: string }).error || `Failed to upload image for ${product.name}`);
            setIsSubmitting(false);
            return;
          }

          const uploadData = await uploadRes.json();
          imageUrl = typeof uploadData?.url === 'string' ? uploadData.url : null;
        }

        const images = imageUrl ? [{ url: imageUrl, alt: product.name }] : [];
        await fetch('/api/merchant/products', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: product.name.trim(), price: parseFloat(product.price), description: product.description.trim() || undefined, product_type: 'physical', images, status: 'active' }),
        });
      }

      setCompletedSlug(slug);
      setStep(3);
      toast.success('Your store is live!');
      onComplete?.(slug);
    } catch { toast.error('Something went wrong. Please try again.'); }
    setIsSubmitting(false);
  };

  // Show a gate if score is known and below MIN_MERCHANT
  if (!scoreLoading && score !== null && !canMerchant) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[320px] text-center px-6 py-10">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center mb-5">
          <ShieldAlert size={28} className="text-amber-400" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">ProofScore needed</h2>
        <p className="text-gray-400 text-sm max-w-xs mb-1">
          Selling requires a ProofScore of <span className="text-amber-300 font-semibold">5,600</span>.
          Yours is <span className="text-white font-semibold">{score?.toLocaleString() ?? '—'}</span>.
        </p>
        <div className="w-full max-w-xs bg-white/[0.04] rounded-full h-2 mb-4 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-amber-500 to-emerald-400 transition-all"
            style={{ width: `${Math.min(100, ((score ?? 0) / 5600) * 100).toFixed(1)}%` }}
          />
        </div>
        <p className="text-gray-500 text-xs max-w-xs mb-5">
          Make a few payments and build trust — each transaction moves you closer.
        </p>
        <a
          href="/proofscore"
          className="inline-flex items-center gap-2 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-sm font-semibold px-5 py-2.5 hover:bg-amber-500/25 transition-colors"
        >
          <TrendingUp size={14} /> See your ProofScore
        </a>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Progress bar */}
      <div className="flex items-center gap-2 mb-8">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex-1 flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
              s < step ? 'bg-emerald-500 text-white' :
              s === step ? 'bg-gradient-to-r from-accent to-blue-500 text-white shadow-lg shadow-accent/25' :
              'bg-white/5 text-gray-500 border border-white/10'
            }`}>
              {s < step ? <Check size={14} /> : s}
            </div>
            {s < 3 && <div className={`flex-1 h-0.5 rounded-full transition-all ${s < step ? 'bg-emerald-500' : 'bg-white/10'}`} />}
          </div>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {step === 1 && (
          <SetupStepBusiness
            businessName={businessName} setBusinessName={setBusinessName}
            category={category} setCategory={setCategory}
            city={city} setCity={setCity}
            country={country} setCountry={setCountry}
            tagline={tagline} setTagline={setTagline}
            isValid={step1Valid}
            onNext={() => { if (products.length === 0) addProduct(); setStep(2); }}
          />
        )}
        {step === 2 && (
          <SetupStepProducts
            products={products}
            updateProduct={updateProduct}
            removeProduct={removeProduct}
            addProduct={addProduct}
            onBack={() => setStep(1)}
            onSubmit={handleSubmit}
            isValid={step2Valid}
            isSubmitting={isSubmitting}
          />
        )}
        {step === 3 && completedSlug && (
          <SetupStepSuccess businessName={businessName} slug={completedSlug} />
        )}
      </AnimatePresence>
    </div>
  );
}

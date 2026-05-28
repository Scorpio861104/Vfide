'use client';

/**
 * MerchantProfileWizard — set up or edit a merchant's VFIDE profile.
 *
 * Three steps:
 *   1. Basics — name (required), category, bio
 *   2. Identity — avatar upload, links
 *   3. Review — privacy disclosure + final submit
 *
 * Used by:
 *   - /merchant/profile/setup    (first-time onboarding flow)
 *   - /merchant/profile/edit     (existing merchant updating their profile)
 *
 * Both routes mount this component. The hook handles the difference internally
 * (addMerchant vs setMetaHash on chain).
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { useAccount } from 'wagmi';
import { ArrowLeft, ArrowRight, Check, Store, Upload, X, AlertCircle, ExternalLink } from 'lucide-react';
import { useMerchantProfile, type ProfileSubmitInput } from '@/hooks/useMerchantProfile';
import { Identicon } from '@/components/identity/Identicon';
import { GlassCard } from '@/components/ui/GlassCard';
import { CATEGORIES } from '@/lib/profile/validate';
import { toast } from '@/lib/toast';

interface Props {
  /** Optional pre-fill for editing an existing profile. */
  initialValues?: Partial<ProfileSubmitInput>;
  /** Where to send the user after a successful submit. */
  onComplete?: () => void;
  /** Optional custom intro text per route ("Set up your business" vs "Edit your profile"). */
  introTitle?: string;
  introBody?: string;
}

const STEPS = ['basics', 'identity', 'review'] as const;
type Step = typeof STEPS[number];

const MAX_NAME = 48;
const MAX_BIO = 280;
const MAX_LINKS = 3;

export function MerchantProfileWizard({
  initialValues,
  onComplete,
  introTitle,
  introBody,
}: Props) {
  const { address } = useAccount();
  const {
    submit,
    isSubmitting,
    currentStep: hookStep,
    error,
    resetError,
    registrationStatus,
    isTxConfirmed,
  } = useMerchantProfile();

  const isEditing = registrationStatus === 'active' || registrationStatus === 'suspended';

  // Step state
  const [step, setStep] = useState<Step>('basics');

  // Form state — pre-filled from initialValues if editing
  const [name, setName] = useState(initialValues?.name ?? '');
  const [bio, setBio] = useState(initialValues?.bio ?? '');
  const [category, setCategory] = useState(initialValues?.category ?? '');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(
    initialValues?.avatarUrl ?? null,
  );
  const [existingAvatarUrl] = useState<string | null>(initialValues?.avatarUrl ?? null);
  const [links, setLinks] = useState<Array<{ label: string; url: string }>>(
    initialValues?.links ?? [],
  );

  // Privacy acknowledgment (required on review step before submit)
  const [acknowledgedPrivacy, setAcknowledgedPrivacy] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Cleanup blob URLs we create for preview
  useEffect(() => {
    return () => {
      if (avatarPreview?.startsWith('blob:')) {
        URL.revokeObjectURL(avatarPreview);
      }
    };
  }, [avatarPreview]);

  // ── Validation ────────────────────────────────────────────────────
  const nameTrimmed = name.trim();
  const nameValid = nameTrimmed.length >= 1 && nameTrimmed.length <= MAX_NAME;
  const bioValid = bio.length <= MAX_BIO;
  const linksValid = links.every(
    (l) =>
      l.label.length <= 24 &&
      (l.url === '' || l.url.startsWith('https://')),
  );

  const step1Valid = nameValid;
  const step2Valid = bioValid && linksValid;
  const canSubmit = step1Valid && step2Valid && acknowledgedPrivacy && !isSubmitting;

  // ── File handlers ─────────────────────────────────────────────────
  const handleAvatarSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error('Avatar must be under 2 MB. Please choose a smaller file.');
      return;
    }
    if (!['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/svg+xml'].includes(file.type)) {
      toast.error('Please upload a JPEG, PNG, WebP, or SVG image.');
      return;
    }

    // Revoke previous blob URL if any
    if (avatarPreview?.startsWith('blob:')) {
      URL.revokeObjectURL(avatarPreview);
    }
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  }, [avatarPreview]);

  const removeAvatar = useCallback(() => {
    if (avatarPreview?.startsWith('blob:')) {
      URL.revokeObjectURL(avatarPreview);
    }
    setAvatarFile(null);
    setAvatarPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [avatarPreview]);

  // ── Link handlers ─────────────────────────────────────────────────
  const addLink = () => setLinks((prev) => [...prev, { label: '', url: '' }]);
  const updateLink = (i: number, patch: Partial<{ label: string; url: string }>) =>
    setLinks((prev) => prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  const removeLink = (i: number) =>
    setLinks((prev) => prev.filter((_, idx) => idx !== i));

  // ── Submit ────────────────────────────────────────────────────────
  const handleSubmit = useCallback(async () => {
    resetError();
    try {
      await submit({
        name: nameTrimmed,
        avatarFile: avatarFile ?? undefined,
        // If the user didn't pick a new file but already had an avatar URL, preserve it
        avatarUrl: !avatarFile && existingAvatarUrl ? existingAvatarUrl : undefined,
        bio: bio.trim() || undefined,
        category: category || undefined,
        links: links.length > 0 ? links : undefined,
      });
    } catch {
      // Error is captured in the hook; the UI will display it from `error`.
    }
  }, [submit, resetError, nameTrimmed, avatarFile, existingAvatarUrl, bio, category, links]);

  useEffect(() => {
    if (isTxConfirmed && onComplete) {
      onComplete();
    }
  }, [isTxConfirmed, onComplete]);

  // ── Render ────────────────────────────────────────────────────────
  if (!address) {
    return (
      <GlassCard hover={false} className="p-6 text-center text-gray-400">
        Connect your wallet to set up your merchant profile.
      </GlassCard>
    );
  }

  if (registrationStatus === 'delisted') {
    return (
      <GlassCard gradient="red" hover={false} className="p-6 text-center">
        <AlertCircle className="mx-auto mb-3 text-red-400" size={32} />
        <h3 className="text-lg font-bold text-red-300">Account delisted</h3>
        <p className="mt-2 text-sm text-gray-400">
          This merchant account has been delisted and cannot update its profile. If you
          believe this was in error, contact protocol governance.
        </p>
      </GlassCard>
    );
  }

  if (isTxConfirmed) {
    return (
      <GlassCard gradient="green" glow="rgba(16,185,129,0.2)" hover={false} className="p-8 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20 backdrop-blur-md">
          <Check className="text-emerald-400" size={32} />
        </div>
        <h3 className="text-2xl font-bold text-emerald-300">
          {isEditing ? 'Profile updated' : 'Welcome to VFIDE'}
        </h3>
        <p className="mx-auto mt-3 max-w-md text-sm text-gray-400">
          {isEditing
            ? 'Your profile is now live on-chain. Customers will see the updated identity within a few seconds.'
            : 'You\'re registered as a VFIDE merchant. Your business name and identity are now visible on-chain.'}
        </p>
      </GlassCard>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      {/* Step indicator */}
      <div className="mb-8 flex items-center justify-between">
        {STEPS.map((s, idx) => {
          const stepNum = idx + 1;
          const isCurrent = step === s;
          const isComplete = STEPS.indexOf(step) > idx;
          return (
            <div key={s} className="flex items-center flex-1">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold transition-colors ${
                  isComplete
                    ? 'bg-emerald-500 text-white'
                    : isCurrent
                    ? 'bg-accent text-white'
                    : 'bg-white/10 text-gray-500'
                }`}
              >
                {isComplete ? <Check size={16} /> : stepNum}
              </div>
              {idx < STEPS.length - 1 && (
                <div
                  className={`mx-2 h-px flex-1 ${isComplete ? 'bg-emerald-500' : 'bg-white/10'}`}
                />
              )}
            </div>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        {/* ─── Step 1: Basics ───────────────────────────────────────── */}
        {step === 'basics' && (
          <motion.div key="basics" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}>
            <GlassCard hover={false} className="p-6 md:p-8">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                  <Store className="text-accent" size={24} />
                  {introTitle ?? (isEditing ? 'Edit your business profile' : 'Tell customers who you are')}
                </h2>
                <p className="mt-1 text-gray-400">
                  {introBody ?? 'Your business name and details are how customers recognize you on VFIDE.'}
                </p>
              </div>

              <div className="space-y-5">
                <div>
                  <label className="mb-1.5 block text-sm text-gray-400">
                    Business name <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    maxLength={MAX_NAME}
                    autoFocus
                    placeholder="Maya's Hair Studio"
                    className="glass-input w-full px-4 py-3"
                  />
                  <div className="mt-1 flex items-center justify-between">
                    <p className="text-xs text-gray-500">
                      This is what shows on every payment screen and review.
                    </p>
                    <span className={`text-xs ${nameTrimmed.length > MAX_NAME - 5 ? 'text-amber-400' : 'text-gray-500'}`}>
                      {nameTrimmed.length}/{MAX_NAME}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm text-gray-400">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="glass-input w-full px-4 py-3"
                  >
                    <option value="" className="bg-zinc-900">Select a category (optional)</option>
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c} className="bg-zinc-900">
                        {c.charAt(0).toUpperCase() + c.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm text-gray-400">Short description</label>
                  <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    maxLength={MAX_BIO}
                    rows={3}
                    placeholder="Braids, locs, and cuts in downtown Lagos. Walk-ins welcome Tue–Sat."
                    className="glass-input w-full px-4 py-3 resize-none"
                  />
                  <div className="mt-1 flex items-center justify-between">
                    <p className="text-xs text-gray-500">A line or two about what you do.</p>
                    <span className={`text-xs ${bio.length > MAX_BIO - 20 ? 'text-amber-400' : 'text-gray-500'}`}>
                      {bio.length}/{MAX_BIO}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-8 flex justify-end">
                <button
                  onClick={() => setStep('identity')}
                  disabled={!step1Valid}
                  className="glass-button inline-flex items-center gap-2 px-5 py-2.5"
                >
                  Continue <ArrowRight size={16} />
                </button>
              </div>
            </GlassCard>
          </motion.div>
        )}

        {/* ─── Step 2: Identity ─────────────────────────────────────── */}
        {step === 'identity' && (
          <motion.div key="identity" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}>
            <GlassCard hover={false} className="p-6 md:p-8">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-white">Visual identity</h2>
                <p className="mt-1 text-gray-400">
                  Add a logo or photo customers will see. Optional — we&apos;ll generate one
                  from your wallet if you skip this.
                </p>
              </div>

              <div className="space-y-6">
                {/* Avatar */}
                <div>
                  <label className="mb-2 block text-sm text-gray-400">Logo or photo</label>
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      {avatarPreview ? (
                        <Image
                          src={avatarPreview}
                          alt="Avatar preview"
                          width={80}
                          height={80}
                          className="rounded-2xl object-cover ring-1 ring-white/10"
                          unoptimized
                        />
                      ) : (
                        address && (
                          <div className="rounded-2xl overflow-hidden ring-1 ring-white/10">
                            <Identicon address={address} size={80} />
                          </div>
                        )
                      )}
                    </div>
                    <div className="flex-1">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/svg+xml"
                        onChange={handleAvatarSelect}
                        className="hidden"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          type="button"
                          className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm px-4 py-2 text-sm font-medium text-white hover:bg-white/10 hover:border-white/20 transition-colors"
                        >
                          <Upload size={14} /> {avatarPreview ? 'Replace' : 'Upload image'}
                        </button>
                        {avatarPreview && avatarFile && (
                          <button
                            onClick={removeAvatar}
                            type="button"
                            className="inline-flex items-center gap-1.5 rounded-xl border border-red-500/30 bg-red-500/10 backdrop-blur-sm px-3 py-2 text-sm text-red-300 hover:bg-red-500/20 transition-colors"
                          >
                            <X size={14} /> Remove
                          </button>
                        )}
                      </div>
                      <p className="mt-2 text-xs text-gray-500">
                        JPEG, PNG, WebP, or SVG. Max 2 MB. Square images look best.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Links */}
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <label className="block text-sm text-gray-400">Links</label>
                    <span className="text-xs text-gray-500">{links.length}/{MAX_LINKS}</span>
                  </div>
                  <div className="space-y-2">
                    {links.map((link, i) => (
                      <div key={i} className="flex gap-2">
                        <input
                          type="text"
                          value={link.label}
                          onChange={(e) => updateLink(i, { label: e.target.value })}
                          maxLength={24}
                          placeholder="Instagram"
                          className="glass-input w-32 px-3 py-2 text-sm"
                        />
                        <input
                          type="url"
                          value={link.url}
                          onChange={(e) => updateLink(i, { url: e.target.value })}
                          placeholder="https://..."
                          className="glass-input flex-1 px-3 py-2 text-sm"
                        />
                        <button
                          onClick={() => removeLink(i)}
                          type="button"
                          className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm px-2 text-gray-400 hover:bg-red-500/10 hover:text-red-400 transition-colors"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                    {links.length < MAX_LINKS && (
                      <button
                        onClick={addLink}
                        type="button"
                        className="rounded-xl border border-dashed border-white/10 bg-white/5 backdrop-blur-sm px-3 py-2 text-sm text-gray-400 hover:border-accent/30 hover:text-accent hover:bg-accent/5 transition-colors"
                      >
                        + Add link
                      </button>
                    )}
                  </div>
                  <p className="mt-2 text-xs text-gray-500">
                    Up to {MAX_LINKS} HTTPS URLs (Instagram, your website, etc.).
                  </p>
                </div>
              </div>

              <div className="mt-8 flex items-center justify-between">
                <button
                  onClick={() => setStep('basics')}
                  className="glass-button-ghost inline-flex items-center gap-2 px-4 py-2 text-sm"
                >
                  <ArrowLeft size={14} /> Back
                </button>
                <button
                  onClick={() => setStep('review')}
                  disabled={!step2Valid}
                  className="glass-button inline-flex items-center gap-2 px-5 py-2.5"
                >
                  Continue <ArrowRight size={16} />
                </button>
              </div>
            </GlassCard>
          </motion.div>
        )}

        {/* ─── Step 3: Review + Privacy + Submit ─────────────────────── */}
        {step === 'review' && (
          <motion.div key="review" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}>
            <GlassCard hover={false} className="p-6 md:p-8">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-white">Review &amp; publish</h2>
                <p className="mt-1 text-gray-400">
                  One last look before this goes on-chain. You can edit anything later.
                </p>
              </div>

              {/* Preview — glassmorphic inner card */}
              <GlassCard gradient="cyan" hover={false} className="mb-6 p-5">
                <div className="flex items-start gap-4">
                  <div className="shrink-0">
                    {avatarPreview ? (
                      <Image
                        src={avatarPreview}
                        alt=""
                        width={64}
                        height={64}
                        className="rounded-2xl object-cover ring-1 ring-white/10"
                        unoptimized
                      />
                    ) : (
                      address && (
                        <div className="rounded-2xl overflow-hidden ring-1 ring-white/10">
                          <Identicon address={address} size={64} />
                        </div>
                      )
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-lg font-bold text-white">{nameTrimmed || '—'}</div>
                    {category && (
                      <div className="text-xs text-accent capitalize">{category}</div>
                    )}
                    {bio && <p className="mt-1 text-sm text-gray-300">{bio}</p>}
                    {links.filter((l) => l.url).length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {links
                          .filter((l) => l.url)
                          .map((l, i) => (
                            <span
                              key={i}
                              className="inline-flex items-center gap-1 rounded-md bg-white/10 backdrop-blur-sm px-2 py-1 text-xs text-accent border border-white/10"
                            >
                              <ExternalLink size={10} /> {l.label || l.url}
                            </span>
                          ))}
                      </div>
                    )}
                  </div>
                </div>
              </GlassCard>

              {/* Privacy disclosure — amber-tinted glass */}
              <GlassCard gradient="gold" hover={false} className="mb-6 p-4">
                <div className="mb-2 flex items-center gap-2 text-amber-300">
                  <AlertCircle size={16} />
                  <span className="text-sm font-semibold">Please read before publishing</span>
                </div>
                <p className="text-sm text-gray-200 leading-relaxed">
                  Your business name, avatar, and details will be visible on the public Base
                  blockchain. Anyone can see them, link them to your wallet activity, and observe
                  your transaction patterns over time. This is how every payment system works —
                  Stripe, Square, and Venmo show merchant names on customer receipts too — but
                  blockchain visibility is more permanent.
                </p>
                <p className="mt-2 text-sm text-gray-200 leading-relaxed">
                  Customer identities are <strong className="text-white">not</strong> public by
                  default. Only merchants who choose to register a profile become publicly
                  identifiable on VFIDE.
                </p>
                <label className="mt-3 flex items-start gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={acknowledgedPrivacy}
                    onChange={(e) => setAcknowledgedPrivacy(e.target.checked)}
                    className="mt-1 h-4 w-4 cursor-pointer accent-accent"
                  />
                  <span className="text-sm text-gray-100">
                    I understand my business identity will be publicly visible.
                  </span>
                </label>
              </GlassCard>

              {/* In-flight + error — glassmorphic status panels */}
              {hookStep !== 'idle' && !error && (
                <div className="mb-4 rounded-xl border border-accent/30 bg-accent/10 backdrop-blur-md px-4 py-3 text-sm text-accent">
                  {hookStep === 'uploading-avatar' && 'Uploading avatar…'}
                  {hookStep === 'storing-profile' && 'Saving profile…'}
                  {hookStep === 'awaiting-signature' && 'Please confirm the transaction in your wallet.'}
                  {hookStep === 'confirming-tx' && 'Confirming on-chain…'}
                </div>
              )}
              {error && (
                <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 backdrop-blur-md px-4 py-3 text-sm text-red-300">
                  {error}
                </div>
              )}

              <div className="flex items-center justify-between">
                <button
                  onClick={() => setStep('identity')}
                  disabled={isSubmitting}
                  className="glass-button-ghost inline-flex items-center gap-2 px-4 py-2 text-sm disabled:opacity-50"
                >
                  <ArrowLeft size={14} /> Back
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={!canSubmit}
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-accent backdrop-blur-sm px-6 py-2.5 font-semibold text-white shadow-lg shadow-emerald-500/30 transition-all hover:shadow-emerald-500/50 hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
                >
                  <Check size={16} />
                  {isSubmitting
                    ? 'Publishing…'
                    : isEditing
                    ? 'Update profile'
                    : 'Publish & register'}
                </button>
              </div>
            </GlassCard>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

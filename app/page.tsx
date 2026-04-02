'use client';

import Link from "next/link";
import { motion, useScroll, useTransform } from "framer-motion";
import { useRef, useEffect, useState, lazy, Suspense } from "react";
import {
  DEFAULT_LOCALE,
  HOME_TRANSLATIONS,
  LOCALE_OPTIONS,
  getBrowserLocale,
  persistLocale,
  pickLocaleCopy,
  type SupportedLocale,
} from "@/lib/i18n";
import { 
  Shield, Zap, Users, TrendingDown, Lock, Sparkles,
  ArrowRight, ChevronRight, Play, CheckCircle2, Star
} from "lucide-react";

// Lazy load Footer for better initial load performance
const Footer = lazy(() => import("@/components/layout/Footer").then(mod => ({ default: mod.Footer })));

const TESTNET_VAULT_COUNT = "2.8K";
const TESTNET_VAULT_LABEL = `${TESTNET_VAULT_COUNT} Vaults (Testnet)`;

function usePrefersReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const updatePreference = () => setPrefersReducedMotion(mediaQuery.matches);

    updatePreference();

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', updatePreference);
      return () => mediaQuery.removeEventListener('change', updatePreference);
    }

    mediaQuery.addListener(updatePreference);
    return () => mediaQuery.removeListener(updatePreference);
  }, []);

  return prefersReducedMotion;
}

// Animated counter hook
function useAnimatedCounter(end: number, duration: number = 2000, start: number = 0) {
  const [count, setCount] = useState(start);
  const [isVisible, setIsVisible] = useState(false);
  
  useEffect(() => {
    if (!isVisible) return;
    if (duration <= 0) {
      setCount(end);
      return;
    }

    let startTime: number;
    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      setCount(Math.floor(start + (end - start) * eased));
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [isVisible, end, duration, start]);
  
  return { count, setIsVisible };
}

// Floating orbs background component
function FloatingOrbs() {
  const prefersReducedMotion = usePrefersReducedMotion();

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div className={`absolute top-1/4 -left-32 w-96 h-96 bg-cyan-400/10 rounded-full blur-[120px] ${prefersReducedMotion ? '' : 'animate-pulse'}`} />
      <div
        className={`absolute bottom-1/4 -right-32 w-96 h-96 bg-blue-500/10 rounded-full blur-[120px] ${prefersReducedMotion ? '' : 'animate-pulse'}`}
        style={prefersReducedMotion ? undefined : { animationDelay: '1s' }}
      />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-150 h-150 bg-violet-400/5 rounded-full blur-[150px]" />
    </div>
  );
}

// Hero 3D shield visualization
function HeroVisualization() {
  const prefersReducedMotion = usePrefersReducedMotion();

  return (
    <div className="relative w-full h-75 sm:h-100 md:h-125 flex items-center justify-center">
      <div className="absolute inset-0 flex items-center justify-center">
        {/* Outer glow ring */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1, delay: 0.5 }}
          className="absolute w-60 h-60 sm:w-80 sm:h-80 md:w-100 md:h-100"
        >
          <div className="absolute inset-0 rounded-full border border-cyan-400/20 animate-pulse" />
          <div className="absolute inset-4 rounded-full border border-cyan-400/15" />
          <div className="absolute inset-8 rounded-full border border-cyan-400/10" />
        </motion.div>
        
        {/* Central shield */}
        <motion.div
          initial={{ opacity: 0, y: 30, rotateY: -20 }}
          animate={{ opacity: 1, y: 0, rotateY: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="relative z-10"
          style={{ perspective: '1000px' }}
        >
          <svg 
            width="140" 
            height="170"
            className="sm:w-45 sm:h-55"
            viewBox="0 0 100 120" 
            style={{ width: '140px', height: '170px' }}
            preserveAspectRatio="xMidYMid meet"
          >
            <defs>
              <linearGradient id="hero-shield-gradient" x1="50" y1="0" x2="50" y2="120" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#1a1a2e" />
                <stop offset="100%" stopColor="#0a0a15" />
              </linearGradient>
              <linearGradient id="hero-accent-gradient" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#00F0FF" />
                <stop offset="100%" stopColor="#0080FF" />
              </linearGradient>
              <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="2" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            
            {/* Shield body */}
            <path 
              d="M50 5 L90 20 V55 C90 85 70 105 50 115 C30 105 10 85 10 55 V20 L50 5Z" 
              fill="url(#hero-shield-gradient)" 
              stroke="url(#hero-accent-gradient)" 
              strokeWidth="1.5"
            />
            
            {/* V letterform */}
            <path 
              d="M30 35 L50 85 L70 35" 
              fill="none" 
              stroke="#F8F8FC" 
              strokeWidth="6" 
              strokeLinecap="round" 
              strokeLinejoin="round"
              filter="url(#glow)"
            />
            
            {/* Accent details */}
            <circle cx="50" cy="98" r="3" fill="#00F0FF" filter="url(#glow)" />
            <path d="M35 25 L65 25" stroke="#00F0FF" strokeWidth="1" opacity="0.6" />
          </svg>
        </motion.div>
        
        {/* Orbiting elements */}
        <motion.div
          animate={prefersReducedMotion ? undefined : { rotate: 360 }}
          transition={prefersReducedMotion ? undefined : { duration: 40, repeat: Infinity, ease: "linear" }}
          className="absolute w-72 h-72 md:w-96 md:h-96"
        >
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3 h-3 bg-cyan-400 rounded-full shadow-[0_0_20px_rgba(0,240,255,0.8)]" />
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-2 h-2 bg-emerald-400 rounded-full shadow-[0_0_15px_rgba(0,255,136,0.8)]" />
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-2 h-2 bg-violet-400 rounded-full shadow-[0_0_15px_rgba(167,139,250,0.8)]" />
        </motion.div>
      </div>
    </div>
  );
}

// Feature card with glass effect
interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  color: string;
  delay?: number;
}

function FeatureCard({ icon, title, description, color, delay = 0 }: FeatureCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.6, delay }}
      whileHover={{ y: -8, transition: { duration: 0.3 } }}
      className="group relative"
    >
      <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl -z-10"
        style={{ background: `linear-gradient(135deg, ${color}20, transparent)` }} 
      />
      <div className="glass-card rounded-2xl p-5 sm:p-6 md:p-8 h-full relative overflow-hidden">
        {/* Top accent line */}
        <div 
          className="absolute top-0 left-0 right-0 h-px opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ background: `linear-gradient(90deg, transparent, ${color}, transparent)` }}
        />
        
        <div 
          className="w-14 h-14 rounded-xl flex items-center justify-center mb-5 transition-transform group-hover:scale-110 duration-300"
          style={{ background: `${color}15` }}
        >
          <div style={{ color }}>{icon}</div>
        </div>
        
        <h2 className="text-xl font-semibold text-zinc-50 mb-3 group-hover:text-white transition-colors">
          {title}
        </h2>
        
        <p className="text-zinc-400 leading-relaxed group-hover:text-zinc-300 transition-colors">
          {description}
        </p>
      </div>
    </motion.div>
  );
}

// Live stat component
interface StatItemProps {
  value: number;
  label: string;
  prefix?: string;
  suffix?: string;
  color: string;
}

function StatItem({ value, label, prefix = "", suffix = "", color }: StatItemProps) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const { count, setIsVisible } = useAnimatedCounter(value, prefersReducedMotion ? 0 : 2000);
  
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      onViewportEnter={() => setIsVisible(true)}
      className="text-center relative"
    >
      <div 
        className="text-3xl sm:text-4xl md:text-5xl font-bold mb-2 counter"
        style={{ color }}
      >
        {prefix}{count.toLocaleString()}{suffix}
      </div>
      <div className="text-sm text-zinc-500 uppercase tracking-wider">{label}</div>
    </motion.div>
  );
}

// How it works step
interface StepProps {
  number: string;
  title: string;
  description: string;
  time: string;
  index: number;
}

function Step({ number, title, description, time, index }: StepProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -30 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6, delay: index * 0.15 }}
      className="relative flex gap-6 group"
    >
      {/* Connection line */}
      {index < 2 && (
        <div className="absolute left-7 top-16 bottom-0 w-px bg-gradient-to-b from-cyan-400/30 to-transparent" />
      )}
      
      {/* Step number */}
      <motion.div 
        whileHover={{ scale: 1.1, rotate: 5 }}
        className="relative z-10 w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center text-zinc-950 font-bold text-xl shrink-0 shadow-[0_0_30px_rgba(0,240,255,0.3)]"
      >
        {number}
      </motion.div>
      
      {/* Content */}
      <div className="flex-1 pb-8">
        <h2 className="text-xl font-semibold text-zinc-50 mb-2 group-hover:text-cyan-400 transition-colors">
          {title}
        </h2>
        <p className="text-zinc-400 mb-3 leading-relaxed">
          {description}
        </p>
        <div className="inline-flex items-center gap-2 text-sm text-cyan-400 font-medium">
          <Zap className="w-4 h-4" />
          {time}
        </div>
      </div>
    </motion.div>
  );
}

// Trust indicators
function TrustBadge({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      whileHover={{ y: -2, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className="flex items-center gap-2 px-4 py-2 rounded-full bg-zinc-900/80 border border-zinc-800 text-sm text-zinc-400 transition-colors"
    >
      {children}
    </motion.div>
  );
}

export default function Home() {
  const prefersReducedMotion = usePrefersReducedMotion();
  const [locale, setLocale] = useState<SupportedLocale>(DEFAULT_LOCALE);
  const homeCopy = pickLocaleCopy(HOME_TRANSLATIONS, locale);
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"]
  });
  
  const heroOpacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);
  const heroY = useTransform(scrollYProgress, [0, 0.5], [0, 100]);
  const heroScale = useTransform(scrollYProgress, [0, 0.5], [1, 0.96]);
  const heroGlow = useTransform(scrollYProgress, [0, 0.5], [1, 0.7]);
  const orbY = useTransform(scrollYProgress, [0, 1], [0, -80]);
  const orbOpacity = useTransform(scrollYProgress, [0, 1], [1, 0.6]);

  useEffect(() => {
    setLocale(getBrowserLocale());
  }, []);

  return (
    <>
      {/* Hero Section */}
      <section 
        ref={heroRef}
        className="relative min-h-screen flex items-center justify-center overflow-hidden bg-zinc-950 pt-20"
      >
        <h1 className="sr-only">VFIDE Home</h1>
        <motion.div style={{ y: prefersReducedMotion ? 0 : orbY, opacity: prefersReducedMotion ? 1 : orbOpacity }} className="absolute inset-0">
          <motion.div style={{ opacity: heroGlow }}>
            <FloatingOrbs />
          </motion.div>
        </motion.div>
        
        {/* Grid pattern */}
        <div className="absolute inset-0 grid-pattern opacity-50" />
        
        <motion.div 
          style={{ opacity: heroOpacity, y: prefersReducedMotion ? 0 : heroY, scale: prefersReducedMotion ? 1 : heroScale }}
          className="relative z-10 container mx-auto px-3 sm:px-4"
        >
          <div className="grid lg:grid-cols-2 gap-12 items-center max-w-7xl mx-auto">
            {/* Left: Text content */}
            <div className="text-center lg:text-left">
              <div className="mb-4 flex justify-center lg:justify-start">
                <div className="flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900/80 px-3 py-2 text-sm text-zinc-300">
                  <label htmlFor="home-language" className="font-medium">{homeCopy.languageLabel}</label>
                  <select
                    id="home-language"
                    aria-label={homeCopy.languageLabel}
                    value={locale}
                    onChange={(e) => setLocale(persistLocale(e.target.value))}
                    className="rounded-md border border-zinc-700 bg-zinc-950 px-2 py-1 text-sm text-white"
                  >
                    {LOCALE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-cyan-400/10 border border-cyan-400/20 text-cyan-400 text-sm font-medium mb-8"
              >
                <Sparkles className="w-4 h-4" />
                {homeCopy.liveBadge}
              </motion.div>
              
              <motion.h1
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1 }}
                className="text-5xl sm:text-6xl lg:text-7xl font-display font-bold text-zinc-50 mb-6 leading-[1.1]"
              >
                {homeCopy.heroTitle}
                <br />
                <span className="gradient-text">{homeCopy.heroAccent}</span>
              </motion.h1>
              
                <motion.p
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.2 }}
                  className="text-xl text-zinc-400 mb-10 max-w-xl mx-auto lg:mx-0 leading-relaxed"
                >
                  {homeCopy.heroDescription.split('zero processing fees').map((segment, index, parts) => (
                    <span key={`${locale}-${index}`}>
                      {segment}
                      {index < parts.length - 1 ? <strong className="text-zinc-50">zero processing fees</strong> : null}
                    </span>
                  ))}
                </motion.p>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.25 }}
                  className="flex flex-wrap items-center justify-center lg:justify-start gap-3 text-xs uppercase tracking-[0.3em] text-zinc-500 mb-8"
                >
                  <span>{homeCopy.valueProps[0]}</span>
                  <ChevronRight className="w-4 h-4 text-cyan-400" />
                  <span>{homeCopy.valueProps[1]}</span>
                  <ChevronRight className="w-4 h-4 text-cyan-400" />
                  <span>{homeCopy.valueProps[2]}</span>
                </motion.div>
              
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.3 }}
                  className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start mb-10"
                >
                  <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }}>
                    <Link 
                      href="/token-launch"
                      className="group inline-flex items-center justify-center gap-2 btn-primary ring-effect text-lg"
                    >
                      {homeCopy.primaryCta}
                      <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </Link>
                  </motion.div>
                  <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }}>
                    <Link 
                      href="/flashlight"
                      className="group inline-flex items-center justify-center gap-2 btn-secondary ring-effect text-lg"
                    >
                      <Play className="w-5 h-5" />
                      {homeCopy.secondaryCta}
                    </Link>
                  </motion.div>
                </motion.div>
              
              {/* Trust indicators */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.5 }}
                className="flex flex-wrap gap-3 justify-center lg:justify-start"
              >
                <TrustBadge>
                  <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                  {homeCopy.contractsBadge}
                </TrustBadge>
                <TrustBadge>
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  {homeCopy.auditBadge}
                </TrustBadge>
                <TrustBadge>
                  <Sparkles className="w-4 h-4 text-cyan-400" />
                  {TESTNET_VAULT_LABEL}
                </TrustBadge>
                <TrustBadge>
                  <Zap className="w-4 h-4 text-cyan-400" />
                  {homeCopy.settlementBadge}
                </TrustBadge>
              </motion.div>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.6 }}
                className="mt-6 text-xs uppercase tracking-[0.2em] text-zinc-600"
              >
                {homeCopy.chainBadge}
              </motion.div>
            </div>
            
            {/* Right: Visualization */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              whileHover={{ y: -6 }}
              className="lg:block"
            >
              <HeroVisualization />
            </motion.div>
          </div>
        </motion.div>
        
        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
          className="absolute bottom-10 left-1/2 -translate-x-1/2"
        >
          <motion.div
            animate={prefersReducedMotion ? undefined : { y: [0, 10, 0] }}
            transition={prefersReducedMotion ? undefined : { duration: 2, repeat: Infinity }}
            className="w-6 h-10 rounded-full border-2 border-zinc-700 flex items-start justify-center p-2"
          >
            <div className="w-1 h-2 bg-cyan-400 rounded-full" />
          </motion.div>
        </motion.div>
      </section>

      {/* Live Stats Section */}
      <section className="relative py-20 bg-zinc-950 overflow-hidden">
        <div className="absolute inset-0 aurora-bg" />
        
        <div className="relative z-10 container mx-auto px-3 sm:px-4 max-w-6xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <span className="text-sm text-zinc-500 uppercase tracking-widest">Live Network</span>
          </motion.div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 md:gap-12">
            <StatItem value={2847} label="Vaults Created" color="#00F0FF" />
            <StatItem value={12} prefix="$" suffix="M" label="Total Volume" color="#22C55E" />
            <StatItem value={12459} label="Transactions" color="#FFD700" />
            <StatItem value={847} suffix="K" label="VFIDE Burned" color="#EF4444" />
          </div>
          
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center text-sm text-zinc-600 mt-12"
          >
            <span className="inline-flex items-center gap-2">
              <span className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse" />
              Live data • Updates in real-time
            </span>
          </motion.p>
        </div>
      </section>

      {/* Why VFIDE Section */}
      <section className="py-24 bg-zinc-950 relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-zinc-800 to-transparent" />
        
        <div className="container mx-auto px-3 sm:px-4 max-w-7xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-display font-bold text-zinc-50 mb-4">
              Why VFIDE?
            </h2>
            <p className="text-lg text-zinc-500 max-w-2xl mx-auto">
              Built for the future of commerce. Designed for trust.
            </p>
          </motion.div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <FeatureCard
              icon={<TrendingDown className="w-7 h-7" />}
              title="Zero Processing Fees"
              description="No merchant processing fees like Stripe (2.9%). Token transfers have behavioral fees (0.25-5% based on your ProofScore) that fund ecosystem growth."
              color="#00F0FF"
              delay={0}
            />
            <FeatureCard
              icon={<Lock className="w-7 h-7" />}
              title="You Own Your Funds"
              description="Your vault, your control. VFIDE never holds or accesses your funds. True non-custodial ownership."
              color="#00FF88"
              delay={0.1}
            />
            <FeatureCard
              icon={<Zap className="w-7 h-7" />}
              title="Instant Settlement"
              description="Funds settle immediately in your vault. No waiting days for payment processing."
              color="#FFD700"
              delay={0.2}
            />
            <FeatureCard
              icon={<Shield className="w-7 h-7" />}
              title="ProofScore Trust System"
              description="Build reputation through actions, not wealth. Higher trust scores (0-100%) unlock lower fees and greater privileges."
              color="#A78BFA"
              delay={0.3}
            />
            <FeatureCard
              icon={<Users className="w-7 h-7" />}
              title="Community Governed"
              description="Vote on protocol changes using your tokens and ProofScore. True decentralized governance."
              color="#00F0FF"
              delay={0.4}
            />
            <FeatureCard
              icon={<CheckCircle2 className="w-7 h-7" />}
              title="Global &amp; Permissionless"
              description="No KYC, no geo-restrictions. If you have a wallet, you're in. Works anywhere."
              color="#22C55E"
              delay={0.5}
            />
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-24 bg-zinc-950 relative">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-zinc-800 to-transparent" />
        
        <div className="container mx-auto px-4 max-w-3xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <span className="text-xs sm:text-sm text-cyan-400 uppercase tracking-widest">
              3-step launch
            </span>
            <h2 className="text-4xl md:text-5xl font-display font-bold text-zinc-50 mb-4">
              Get Started in Seconds
            </h2>
            <p className="text-lg text-zinc-500">
              No signup, no verification, no waiting
            </p>
          </motion.div>
          
          <div className="relative">
            <Step
              number="1"
              title="Connect Your Wallet"
              description="Use MetaMask, Coinbase Wallet, or any Web3 wallet. No email, no KYC required."
              time="10 seconds"
              index={0}
            />
            <Step
              number="2"
              title="Your Vault is Auto-Created"
              description="On your first token receipt, a personal vault is automatically created. Your wallet is the key—only you control it."
              time="Instant"
              index={1}
            />
            <Step
              number="3"
              title="Start Accepting Payments"
              description="Share your payment link or QR code. Customers pay with any crypto. Zero processor fees."
              time="Ready now"
              index={2}
            />
          </div>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mt-12"
          >
            <Link 
              href="/merchant"
              className="group inline-flex items-center justify-center gap-2 btn-primary ring-effect text-lg"
            >
              Start Accepting Payments
              <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <p className="mt-4 text-sm text-zinc-500">
              No signup required • Non-custodial • Permissionless
            </p>
          </motion.div>
        </div>
      </section>

      {/* Testimonial / Social Proof */}
      <section className="py-24 bg-zinc-950 relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-zinc-800 to-transparent" />
        
        <div className="container mx-auto px-3 sm:px-4 max-w-4xl text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="glass-card rounded-3xl p-6 sm:p-8 md:p-12 relative"
          >
            <div className="flex justify-center gap-1 mb-6">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-6 h-6 fill-amber-400 text-amber-400" />
              ))}
            </div>
            
            <blockquote className="text-xl sm:text-2xl md:text-3xl font-medium text-zinc-50 mb-8 leading-relaxed">
              &ldquo;Finally, a payment system that doesn&apos;t take a cut of every transaction. 
              VFIDE lets me keep what I earn.&rdquo;
            </blockquote>
            
            <div className="flex items-center justify-center gap-4">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center text-zinc-950 font-bold">
                M
              </div>
              <div className="text-left">
                <div className="text-zinc-50 font-medium">Merchant User</div>
                <div className="text-sm text-zinc-500">Beta Tester</div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-32 bg-zinc-950 relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-200 h-200 bg-cyan-400/5 rounded-full blur-[150px]" />
        </div>
        
        <div className="relative z-10 container mx-auto px-3 sm:px-4 text-center max-w-3xl">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-display font-bold text-zinc-50 mb-6"
          >
            {homeCopy.finalTitle}
          </motion.h2>
          
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-xl text-zinc-400 mb-10"
          >
            {homeCopy.finalDescription}
          </motion.p>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <Link 
              href="/token-launch"
              className="group inline-flex items-center justify-center gap-2 btn-primary ring-effect text-lg"
            >
              {homeCopy.launchApp}
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link 
              href="/docs"
              className="group inline-flex items-center justify-center gap-2 btn-secondary ring-effect text-lg"
            >
              {homeCopy.docsCta}
            </Link>
          </motion.div>
          
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.4 }}
            className="mt-12 text-xs text-zinc-600 max-w-xl mx-auto"
          >
            VFIDE tokens are utility tokens for governance and payments, not investment securities. 
            Cryptocurrency involves significant risk. See <Link href="/legal" className="text-cyan-400 hover:underline">full terms</Link>.
          </motion.p>
        </div>
      </section>

      <Suspense fallback={<div className="min-h-[400px] bg-zinc-950" />}>
        <Footer />
      </Suspense>
    </>
  );
}

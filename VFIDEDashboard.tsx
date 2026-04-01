import { useState, useEffect, useRef, useCallback } from "react";
import type { CSSProperties, ElementType, ReactNode } from "react";
import {
  SidebarNav,
  TopBar,
  HeroRow,
  ChartActivityRow,
  EcosystemStatsRow,
  FooterStatus,
} from "@/components/dashboard/VFIDEDashboardSections";

// Design tokens
const T = {
  bg: "#06060A",
  bgCard: "rgba(16,16,24,0.9)",
  bgElevated: "rgba(22,22,32,0.95)",
  accent: "#00F0FF",
  accentDark: "#0080FF",
  gold: "#FFD700",
  green: "#00FF88",
  purple: "#A78BFA",
  red: "#EF4444",
  textPrimary: "#F0F0F8",
  textSecondary: "#8888A0",
  textMuted: "#55556A",
  border: "rgba(255,255,255,0.06)",
  borderAccent: "rgba(0,240,255,0.15)",
  glass: "rgba(255,255,255,0.03)",
  glassHover: "rgba(255,255,255,0.06)",
};

function useAnimatedValue(target: number, duration = 1400) {
  const [val, setVal] = useState(0);
  const ref = useRef<number | null>(null);

  useEffect(() => {
    const start = val;
    const startTime = performance.now();
    const tick = (now: number) => {
      const p = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setVal(Math.floor(start + (target - start) * eased));
      if (p < 1) ref.current = requestAnimationFrame(tick);
    };

    ref.current = requestAnimationFrame(tick);
    return () => {
      if (ref.current !== null) {
        cancelAnimationFrame(ref.current);
      }
    };
  }, [duration, target]);

  return val;
}

function ProofScoreHero({ score }: { score: number }) {
  const displayScore = useAnimatedValue(score);
  const size = 220;
  const stroke = 8;
  const r = (size - stroke * 2) / 2;
  const circ = 2 * Math.PI * r;
  const progress = score / 10000;
  const [animProgress, setAnimProgress] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => setAnimProgress(progress), 100);
    return () => clearTimeout(timer);
  }, [progress]);

  const tierInfo = score >= 8000
    ? { tier: "ELITE", color: T.gold, glow: "rgba(255,215,0,0.4)" }
    : score >= 7000
      ? { tier: "VERIFIED", color: T.purple, glow: "rgba(167,139,250,0.4)" }
      : score >= 5000
        ? { tier: "TRUSTED", color: T.green, glow: "rgba(0,255,136,0.4)" }
        : { tier: "NEUTRAL", color: T.accent, glow: "rgba(0,240,255,0.4)" };

  return (
    <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center", width: size, height: size }}>
      <div style={{
        position: "absolute", width: size * 0.7, height: size * 0.7,
        borderRadius: "50%", background: tierInfo.glow, filter: "blur(40px)",
        opacity: 0.5, animation: "pulseGlow 3s ease-in-out infinite",
      }} />
      <svg width={size} height={size} style={{ position: "absolute", animation: "spinSlow 60s linear infinite", opacity: 0.15 }}>
        {[...Array(36)].map((_, i) => {
          const angle = (i * 10 * Math.PI) / 180;
          const x1 = size / 2 + (r + 12) * Math.cos(angle);
          const y1 = size / 2 + (r + 12) * Math.sin(angle);
          const x2 = size / 2 + (r + (i % 3 === 0 ? 20 : 16)) * Math.cos(angle);
          const y2 = size / 2 + (r + (i % 3 === 0 ? 20 : 16)) * Math.sin(angle);
          return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={tierInfo.color} strokeWidth={i % 3 === 0 ? 1.5 : 0.5} />;
        })}
      </svg>
      <svg width={size} height={size} style={{ position: "absolute", transform: "rotate(-90deg)" }}>
        <defs>
          <linearGradient id="scoreGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={tierInfo.color} />
            <stop offset="50%" stopColor={T.accent} />
            <stop offset="100%" stopColor={T.accentDark} />
          </linearGradient>
          <filter id="ringGlow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth={stroke} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke="url(#scoreGrad)" strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={circ * (1 - animProgress)}
          filter="url(#ringGlow)"
          style={{ transition: "stroke-dashoffset 1.8s cubic-bezier(0.4,0,0.2,1)" }}
        />
      </svg>
      <div style={{ textAlign: "center", position: "relative", zIndex: 2 }}>
        <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 44, fontWeight: 700, color: T.textPrimary, letterSpacing: "-0.03em", lineHeight: 1 }}>
          {displayScore.toLocaleString()}
        </div>
        <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.15em", color: tierInfo.color, marginTop: 6, textTransform: "uppercase" }}>
          {tierInfo.tier}
        </div>
        <div style={{ fontSize: 11, color: T.textMuted, marginTop: 2 }}>ProofScore</div>
      </div>
    </div>
  );
}

type ChartTooltipItem = {
  color?: string;
  name?: string;
  value: number;
};

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: ChartTooltipItem[];
  label?: string | number;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: T.bgElevated, border: `1px solid ${T.border}`,
      borderRadius: 10, padding: "10px 14px", backdropFilter: "blur(20px)",
      boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
    }}>
      <div style={{ fontSize: 11, color: T.textMuted, marginBottom: 4 }}>Day {label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ fontSize: 13, color: p.color, fontWeight: 600 }}>
          {p.name}: {p.value.toLocaleString()}
        </div>
      ))}
    </div>
  );
}

function Card({
  children,
  style,
  hover = true,
  onClick,
  glow,
}: {
  children: ReactNode;
  style?: CSSProperties;
  hover?: boolean;
  onClick?: () => void;
  glow?: string;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: T.bgCard,
        border: `1px solid ${hovered && hover ? T.borderAccent : T.border}`,
        borderRadius: 16,
        backdropFilter: "blur(20px) saturate(180%)",
        transition: "all 0.4s cubic-bezier(0.4,0,0.2,1)",
        transform: hovered && hover ? "translateY(-2px)" : "none",
        boxShadow: hovered && hover
          ? `0 12px 40px -8px rgba(0,0,0,0.5), 0 0 30px -10px ${glow || "rgba(0,240,255,0.12)"}`
          : "0 4px 20px -4px rgba(0,0,0,0.3)",
        cursor: onClick ? "pointer" : "default",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function IconBadge({
  icon: Icon,
  color,
  bg,
  size = 36,
}: {
  icon: ElementType<{ size?: number; color?: string; strokeWidth?: number }>;
  color: string;
  bg?: string;
  size?: number;
}) {
  return (
    <div style={{
      width: size, height: size, borderRadius: 10,
      background: bg || `${color}12`, display: "flex",
      alignItems: "center", justifyContent: "center",
      border: `1px solid ${color}20`,
    }}>
      <Icon size={size * 0.48} color={color} strokeWidth={2} />
    </div>
  );
}

export default function VFIDEDashboard() {
  const [balanceVisible, setBalanceVisible] = useState(true);
  const [copied, setCopied] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [activeNav, setActiveNav] = useState("Dashboard");

  useEffect(() => { setMounted(true); }, []);

  const handleCopy = useCallback(() => {
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, []);

  const stagger = (i: number): CSSProperties => ({
    opacity: mounted ? 1 : 0,
    transform: mounted ? "translateY(0)" : "translateY(20px)",
    transition: `all 0.6s cubic-bezier(0.4,0,0.2,1) ${i * 0.08}s`,
  });

  return (
    <div style={{
      minHeight: "100vh", background: T.bg, color: T.textPrimary,
      fontFamily: "'Inter', -apple-system, sans-serif",
      display: "flex", overflow: "hidden",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
        @keyframes pulseGlow { 0%,100% { opacity:0.35; transform:scale(1); } 50% { opacity:0.6; transform:scale(1.08); } }
        @keyframes spinSlow { from { transform:rotate(0deg); } to { transform:rotate(360deg); } }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 3px; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.15); }
      `}</style>

      <SidebarNav
        T={T}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        activeNav={activeNav}
        setActiveNav={setActiveNav}
      />

      <main style={{ flex: 1, overflow: "auto", padding: "24px 32px 40px" }}>
        <TopBar T={T} stagger={stagger} copied={copied} handleCopy={handleCopy} />

        <HeroRow
          T={T}
          stagger={stagger}
          Card={Card}
          ProofScoreHero={ProofScoreHero}
          balanceVisible={balanceVisible}
          setBalanceVisible={setBalanceVisible}
        />

        <ChartActivityRow T={T} stagger={stagger} Card={Card} ChartTooltip={ChartTooltip} />

        <EcosystemStatsRow T={T} stagger={stagger} Card={Card} IconBadge={IconBadge} />

        <FooterStatus T={T} stagger={stagger} />
      </main>
    </div>
  );
}

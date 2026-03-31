import { useState, useEffect, useRef, useCallback } from "react";
import {
  Shield, Wallet, ArrowUpRight, ArrowDownLeft, Send, Lock,
  Vote, Zap, Store, Trophy, Eye, EyeOff, Copy, Check,
  ChevronRight, Bell, Settings, Search, TrendingUp,
  ArrowLeftRight, Users, Flame, BarChart3, ExternalLink,
  Activity, Clock, Sparkles, Star, Globe, Menu, X,
  CreditCard, PiggyBank, Scale, Compass, Award, Target,
  ChevronDown, Landmark, FileText, BookOpen
} from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

// ─── DESIGN TOKENS ───
const T = {
  bg: "#06060A",
  bgPanel: "rgba(12,12,18,0.85)",
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

// ─── MOCK DATA ───
const MOCK_SCORE = 7420;
const MOCK_BALANCE = "12,847.32";
const MOCK_BALANCE_USD = "$4,218.45";
const MOCK_VAULT_LOCKED = "8,200.00";
const MOCK_FEE_RATE = "0.38%";
const MOCK_TIER = "VERIFIED";
const MOCK_ADDRESS = "0x7a3B...f92E";

const chartData = Array.from({ length: 30 }, (_, i) => ({
  day: i + 1,
  score: 6800 + Math.floor(Math.random() * 800) + i * 18,
  volume: 200 + Math.floor(Math.random() * 500) + i * 8,
}));

const activityData = [
  { type: "receive", label: "Payment received", from: "0xaB4...21c", amount: "+142.50 VFIDE", time: "2 min ago", color: T.green },
  { type: "escrow", label: "Escrow released", from: "Merchant #0x9f2", amount: "+800.00 VFIDE", time: "18 min ago", color: T.purple },
  { type: "fee", label: "Network fee (burned)", from: "Transfer", amount: "-3.42 VFIDE", time: "24 min ago", color: T.red },
  { type: "send", label: "Payment sent", from: "0x3eF...8bA", amount: "-250.00 VFIDE", time: "1 hr ago", color: T.accent },
  { type: "reward", label: "DAO duty reward", from: "PayrollPool", amount: "+45.00 VFIDE", time: "3 hr ago", color: T.gold },
  { type: "score", label: "ProofScore +120", from: "Seer Oracle", amount: "7,300 → 7,420", time: "6 hr ago", color: T.accent },
];

const quickActions = [
  { icon: Send, label: "Send", desc: "Pay anyone", color: T.accent, bg: "rgba(0,240,255,0.08)" },
  { icon: ArrowDownLeft, label: "Receive", desc: "Get paid", color: T.green, bg: "rgba(0,255,136,0.08)" },
  { icon: Lock, label: "Vault", desc: "Deposit", color: T.purple, bg: "rgba(167,139,250,0.08)" },
  { icon: ArrowLeftRight, label: "Escrow", desc: "Trade safe", color: T.gold, bg: "rgba(255,215,0,0.08)" },
];

const navItems = [
  { icon: BarChart3, label: "Dashboard", active: true },
  { icon: Wallet, label: "Pay" },
  { icon: Lock, label: "Vault" },
  { icon: Store, label: "Merchant" },
  { icon: Vote, label: "DAO" },
  { icon: Shield, label: "Guardians" },
  { icon: Users, label: "Social" },
  { icon: Trophy, label: "Quests" },
  { icon: Compass, label: "Explorer" },
];

const ecosystemStats = [
  { label: "Total Burned", value: "2.4M", icon: Flame, color: T.red },
  { label: "Sanctum Fund", value: "$182K", icon: PiggyBank, color: T.green },
  { label: "Active Vaults", value: "14.2K", icon: Lock, color: T.purple },
  { label: "Avg Fee Rate", value: "1.2%", icon: TrendingUp, color: T.accent },
];

// ─── ANIMATED COUNTER ───
function useAnimatedValue(target, duration = 1400) {
  const [val, setVal] = useState(0);
  const ref = useRef(null);
  useEffect(() => {
    const start = val;
    const startTime = performance.now();
    const tick = (now) => {
      const p = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setVal(Math.floor(start + (target - start) * eased));
      if (p < 1) ref.current = requestAnimationFrame(tick);
    };
    ref.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(ref.current);
  }, [target]);
  return val;
}

// ─── PROOF SCORE RING ───
function ProofScoreHero({ score }) {
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
      {/* Outer glow */}
      <div style={{
        position: "absolute", width: size * 0.7, height: size * 0.7,
        borderRadius: "50%", background: tierInfo.glow, filter: "blur(40px)",
        opacity: 0.5, animation: "pulseGlow 3s ease-in-out infinite",
      }} />
      {/* Rotating decorative ring */}
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
      {/* Main ring SVG */}
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
        {/* Track */}
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth={stroke} />
        {/* Progress */}
        <circle
          cx={size/2} cy={size/2} r={r} fill="none"
          stroke="url(#scoreGrad)" strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={circ * (1 - animProgress)}
          filter="url(#ringGlow)"
          style={{ transition: "stroke-dashoffset 1.8s cubic-bezier(0.4,0,0.2,1)" }}
        />
        {/* Dot at tip */}
        {animProgress > 0.05 && (() => {
          const angle = animProgress * 2 * Math.PI - Math.PI / 2;
          const dotSize = 5;
          return <circle cx={size/2 + r * Math.cos(angle)} cy={size/2 + r * Math.sin(angle)} r={dotSize} fill={tierInfo.color} filter="url(#ringGlow)" style={{ transition: "all 1.8s cubic-bezier(0.4,0,0.2,1)" }} />;
        })()}
      </svg>
      {/* Center content */}
      <div style={{ textAlign: "center", position: "relative", zIndex: 2 }}>
        <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 44, fontWeight: 700, color: T.textPrimary, letterSpacing: "-0.03em", lineHeight: 1 }}>
          {displayScore.toLocaleString()}
        </div>
        <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.15em", color: tierInfo.color, marginTop: 6, textTransform: "uppercase" }}>
          {tierInfo.tier}
        </div>
        <div style={{ fontSize: 11, color: T.textMuted, marginTop: 2 }}>
          ProofScore
        </div>
      </div>
    </div>
  );
}

// ─── CUSTOM TOOLTIP ───
function ChartTooltip({ active, payload, label }) {
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

// ─── CARD WRAPPER ───
function Card({ children, style, hover = true, onClick, glow }) {
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

// ─── ICON BADGE ───
function IconBadge({ icon: Icon, color, bg, size = 36 }) {
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

// ─── MAIN DASHBOARD ───
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

  const stagger = (i) => ({
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
      {/* Global Styles */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
        @keyframes pulseGlow { 0%,100% { opacity:0.35; transform:scale(1); } 50% { opacity:0.6; transform:scale(1.08); } }
        @keyframes spinSlow { from { transform:rotate(0deg); } to { transform:rotate(360deg); } }
        @keyframes shimmer { 0% { background-position: -400px 0; } 100% { background-position: 400px 0; } }
        @keyframes fadeSlideUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
        @keyframes borderPulse { 0%,100% { border-color: rgba(0,240,255,0.1); } 50% { border-color: rgba(0,240,255,0.25); } }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 3px; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.15); }
      `}</style>

      {/* ─── SIDEBAR ─── */}
      <nav style={{
        width: sidebarOpen ? 220 : 68, minHeight: "100vh",
        background: "rgba(8,8,14,0.95)", borderRight: `1px solid ${T.border}`,
        display: "flex", flexDirection: "column", padding: "20px 0",
        transition: "width 0.3s cubic-bezier(0.4,0,0.2,1)",
        position: "relative", zIndex: 10,
        backdropFilter: "blur(20px)",
      }}>
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "0 16px", marginBottom: 32 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: `linear-gradient(135deg, ${T.accent}, ${T.accentDark})`,
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: `0 4px 20px -4px ${T.accent}60`,
            flexShrink: 0,
          }}>
            <Shield size={20} color="#06060A" strokeWidth={2.5} />
          </div>
          {sidebarOpen && (
            <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 20, letterSpacing: "-0.02em" }}>
              VFIDE
            </span>
          )}
        </div>

        {/* Nav items */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 2, padding: "0 8px" }}>
          {navItems.map((item) => {
            const isActive = item.label === activeNav;
            return (
              <button
                key={item.label}
                onClick={() => setActiveNav(item.label)}
                style={{
                  display: "flex", alignItems: "center", gap: 12,
                  padding: sidebarOpen ? "10px 12px" : "10px",
                  borderRadius: 10, border: "none", cursor: "pointer",
                  background: isActive ? `${T.accent}10` : "transparent",
                  color: isActive ? T.accent : T.textSecondary,
                  fontSize: 13, fontWeight: isActive ? 600 : 500,
                  transition: "all 0.2s ease",
                  justifyContent: sidebarOpen ? "flex-start" : "center",
                  position: "relative",
                  width: "100%",
                }}
                onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = T.glassHover; }}
                onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = "transparent"; }}
              >
                {isActive && <div style={{ position: "absolute", left: 0, top: "50%", transform: "translateY(-50%)", width: 3, height: 20, borderRadius: 2, background: T.accent }} />}
                <item.icon size={18} strokeWidth={isActive ? 2.2 : 1.8} />
                {sidebarOpen && <span>{item.label}</span>}
              </button>
            );
          })}
        </div>

        {/* Bottom actions */}
        <div style={{ padding: "0 8px", display: "flex", flexDirection: "column", gap: 2 }}>
          <button style={{ display: "flex", alignItems: "center", gap: 12, padding: sidebarOpen ? "10px 12px" : "10px", borderRadius: 10, border: "none", cursor: "pointer", background: "transparent", color: T.textMuted, fontSize: 13, fontWeight: 500, justifyContent: sidebarOpen ? "flex-start" : "center", width: "100%", transition: "color 0.2s" }} onMouseEnter={(e) => e.currentTarget.style.color = T.textSecondary} onMouseLeave={(e) => e.currentTarget.style.color = T.textMuted}>
            <Settings size={18} strokeWidth={1.8} />
            {sidebarOpen && <span>Settings</span>}
          </button>
        </div>

        {/* Collapse toggle */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          style={{
            position: "absolute", right: -12, top: 48,
            width: 24, height: 24, borderRadius: "50%",
            background: T.bgElevated, border: `1px solid ${T.border}`,
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", color: T.textMuted, zIndex: 20,
            transition: "all 0.2s", fontSize: 0,
          }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = T.borderAccent; e.currentTarget.style.color = T.accent; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.color = T.textMuted; }}
        >
          <ChevronRight size={12} style={{ transform: sidebarOpen ? "rotate(180deg)" : "none", transition: "transform 0.3s" }} />
        </button>
      </nav>

      {/* ─── MAIN CONTENT ─── */}
      <main style={{ flex: 1, overflow: "auto", padding: "24px 32px 40px" }}>
        {/* Top bar */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32, ...stagger(0) }}>
          <div>
            <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 26, fontWeight: 700, letterSpacing: "-0.02em" }}>
              Dashboard
            </h1>
            <p style={{ fontSize: 13, color: T.textSecondary, marginTop: 4 }}>
              Welcome back — your trust score is climbing.
            </p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button style={{ width: 38, height: 38, borderRadius: 10, background: T.bgCard, border: `1px solid ${T.border}`, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: T.textSecondary, transition: "all 0.2s", position: "relative" }} onMouseEnter={(e)=>{e.currentTarget.style.borderColor=T.borderAccent;e.currentTarget.style.color=T.accent;}} onMouseLeave={(e)=>{e.currentTarget.style.borderColor=T.border;e.currentTarget.style.color=T.textSecondary;}}>
              <Bell size={16} />
              <div style={{ position: "absolute", top: 8, right: 8, width: 6, height: 6, borderRadius: "50%", background: T.red }} />
            </button>
            <button style={{ width: 38, height: 38, borderRadius: 10, background: T.bgCard, border: `1px solid ${T.border}`, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: T.textSecondary, transition: "all 0.2s" }} onMouseEnter={(e)=>{e.currentTarget.style.borderColor=T.borderAccent;e.currentTarget.style.color=T.accent;}} onMouseLeave={(e)=>{e.currentTarget.style.borderColor=T.border;e.currentTarget.style.color=T.textSecondary;}}>
              <Search size={16} />
            </button>
            {/* Connected wallet badge */}
            <div style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "7px 14px", borderRadius: 10,
              background: T.bgCard, border: `1px solid ${T.border}`,
            }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: T.green, boxShadow: `0 0 8px ${T.green}60` }} />
              <span style={{ fontSize: 13, fontFamily: "'JetBrains Mono', monospace", color: T.textSecondary, fontWeight: 500 }}>
                {MOCK_ADDRESS}
              </span>
              <button onClick={handleCopy} style={{ background: "none", border: "none", cursor: "pointer", color: T.textMuted, display: "flex", padding: 2, transition: "color 0.2s" }} onMouseEnter={(e)=>e.currentTarget.style.color=T.accent} onMouseLeave={(e)=>e.currentTarget.style.color=T.textMuted}>
                {copied ? <Check size={13} color={T.green} /> : <Copy size={13} />}
              </button>
            </div>
          </div>
        </div>

        {/* ─── HERO ROW: ProofScore + Balance + Quick Actions ─── */}
        <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: 24, marginBottom: 24 }}>
          {/* ProofScore Card */}
          <div style={stagger(1)}>
            <Card style={{ padding: 32, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minWidth: 280 }} glow={T.purple + "30"}>
              <ProofScoreHero score={MOCK_SCORE} />
              <div style={{ marginTop: 20, textAlign: "center" }}>
                <div style={{ fontSize: 12, color: T.textMuted, marginBottom: 4 }}>Current Fee Rate</div>
                <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 12px", borderRadius: 8, background: `${T.green}12`, border: `1px solid ${T.green}20` }}>
                  <TrendingUp size={12} color={T.green} />
                  <span style={{ fontSize: 14, fontWeight: 600, color: T.green, fontFamily: "'JetBrains Mono', monospace" }}>{MOCK_FEE_RATE}</span>
                </div>
                <div style={{ fontSize: 11, color: T.textMuted, marginTop: 8, maxWidth: 200 }}>
                  Higher trust = lower fees. Keep transacting to build score.
                </div>
              </div>
            </Card>
          </div>

          {/* Balance + Quick Actions stack */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16, ...stagger(2) }}>
            {/* Balance Card */}
            <Card style={{ padding: 24, flex: 1 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
                <div>
                  <div style={{ fontSize: 12, color: T.textSecondary, fontWeight: 500, letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: 8 }}>
                    Total Balance
                  </div>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
                    <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 42, fontWeight: 700, letterSpacing: "-0.03em", lineHeight: 1 }}>
                      {balanceVisible ? MOCK_BALANCE : "••••••"}
                    </span>
                    <span style={{ fontSize: 16, color: T.textMuted, fontWeight: 500 }}>VFIDE</span>
                  </div>
                  <div style={{ fontSize: 14, color: T.textSecondary, marginTop: 4 }}>
                    {balanceVisible ? MOCK_BALANCE_USD : "••••"} USD
                  </div>
                </div>
                <button
                  onClick={() => setBalanceVisible(!balanceVisible)}
                  style={{ background: "none", border: "none", cursor: "pointer", color: T.textMuted, padding: 4, transition: "color 0.2s" }}
                  onMouseEnter={(e) => e.currentTarget.style.color = T.textSecondary}
                  onMouseLeave={(e) => e.currentTarget.style.color = T.textMuted}
                >
                  {balanceVisible ? <Eye size={18} /> : <EyeOff size={18} />}
                </button>
              </div>
              {/* Vault locked bar */}
              <div style={{ display: "flex", gap: 16, marginTop: 8 }}>
                <div style={{ flex: 1, padding: "12px 16px", borderRadius: 12, background: T.glass, border: `1px solid ${T.border}` }}>
                  <div style={{ fontSize: 11, color: T.textMuted, marginBottom: 4 }}>Vault Locked</div>
                  <div style={{ fontSize: 18, fontWeight: 600, fontFamily: "'JetBrains Mono', monospace" }}>
                    {balanceVisible ? MOCK_VAULT_LOCKED : "••••"}
                  </div>
                </div>
                <div style={{ flex: 1, padding: "12px 16px", borderRadius: 12, background: T.glass, border: `1px solid ${T.border}` }}>
                  <div style={{ fontSize: 11, color: T.textMuted, marginBottom: 4 }}>Available</div>
                  <div style={{ fontSize: 18, fontWeight: 600, fontFamily: "'JetBrains Mono', monospace", color: T.green }}>
                    {balanceVisible ? "4,647.32" : "••••"}
                  </div>
                </div>
                <div style={{ flex: 1, padding: "12px 16px", borderRadius: 12, background: T.glass, border: `1px solid ${T.border}` }}>
                  <div style={{ fontSize: 11, color: T.textMuted, marginBottom: 4 }}>Network</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
                    <div style={{ width: 7, height: 7, borderRadius: "50%", background: T.green, boxShadow: `0 0 6px ${T.green}50` }} />
                    <span style={{ fontSize: 14, fontWeight: 600 }}>Base</span>
                  </div>
                </div>
              </div>
            </Card>

            {/* Quick Actions */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
              {quickActions.map((action, i) => (
                <Card key={action.label} style={{ padding: "16px 12px", textAlign: "center", cursor: "pointer" }} glow={action.color + "25"}>
                  <div style={{ width: 40, height: 40, borderRadius: 12, background: action.bg, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 10px", border: `1px solid ${action.color}18` }}>
                    <action.icon size={18} color={action.color} strokeWidth={2} />
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>{action.label}</div>
                  <div style={{ fontSize: 11, color: T.textMuted }}>{action.desc}</div>
                </Card>
              ))}
            </div>
          </div>
        </div>

        {/* ─── SECOND ROW: Chart + Activity ─── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: 24, marginBottom: 24 }}>
          {/* Trust Score Chart */}
          <div style={stagger(3)}>
            <Card style={{ padding: 24 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 600 }}>Trust Score Trend</div>
                  <div style={{ fontSize: 12, color: T.textMuted, marginTop: 2 }}>30-day ProofScore history</div>
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  {["7D", "30D", "90D"].map((p, i) => (
                    <button key={p} style={{ padding: "4px 10px", borderRadius: 6, border: "none", background: i === 1 ? `${T.accent}15` : "transparent", color: i === 1 ? T.accent : T.textMuted, fontSize: 11, fontWeight: 600, cursor: "pointer", transition: "all 0.2s" }}>
                      {p}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ height: 220 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="scoreAreaGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={T.accent} stopOpacity={0.25} />
                        <stop offset="100%" stopColor={T.accent} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: T.textMuted, fontSize: 10 }} interval={4} />
                    <YAxis domain={['auto', 'auto']} axisLine={false} tickLine={false} tick={{ fill: T.textMuted, fontSize: 10 }} />
                    <Tooltip content={<ChartTooltip />} cursor={{ stroke: T.accent, strokeWidth: 1, strokeDasharray: "4 4" }} />
                    <Area type="monotone" dataKey="score" stroke={T.accent} strokeWidth={2} fill="url(#scoreAreaGrad)" name="Score" dot={false} activeDot={{ r: 4, fill: T.accent, stroke: T.bg, strokeWidth: 2 }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>

          {/* Activity Feed */}
          <div style={stagger(4)}>
            <Card style={{ padding: 20, height: "100%", display: "flex", flexDirection: "column" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <div style={{ fontSize: 15, fontWeight: 600 }}>Recent Activity</div>
                <button style={{ fontSize: 12, color: T.accent, background: "none", border: "none", cursor: "pointer", fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>
                  View all <ChevronRight size={12} />
                </button>
              </div>
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 2 }}>
                {activityData.map((item, i) => (
                  <div
                    key={i}
                    style={{
                      display: "flex", alignItems: "center", gap: 12,
                      padding: "10px 12px", borderRadius: 10,
                      transition: "background 0.2s",
                      cursor: "pointer",
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = T.glassHover}
                    onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                  >
                    <div style={{
                      width: 32, height: 32, borderRadius: 8,
                      background: `${item.color}10`, border: `1px solid ${item.color}18`,
                      display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                    }}>
                      {item.type === "receive" && <ArrowDownLeft size={14} color={item.color} />}
                      {item.type === "send" && <ArrowUpRight size={14} color={item.color} />}
                      {item.type === "escrow" && <Lock size={14} color={item.color} />}
                      {item.type === "fee" && <Flame size={14} color={item.color} />}
                      {item.type === "reward" && <Star size={14} color={item.color} />}
                      {item.type === "score" && <TrendingUp size={14} color={item.color} />}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: T.textPrimary }}>{item.label}</div>
                      <div style={{ fontSize: 11, color: T.textMuted, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.from}</div>
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <div style={{
                        fontSize: 13, fontWeight: 600,
                        fontFamily: "'JetBrains Mono', monospace",
                        color: item.amount.startsWith("+") ? T.green : item.amount.startsWith("-") ? T.red : T.textSecondary,
                      }}>{item.amount}</div>
                      <div style={{ fontSize: 10, color: T.textMuted }}>{item.time}</div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>

        {/* ─── ECOSYSTEM STATS ─── */}
        <div style={stagger(5)}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
            {ecosystemStats.map((stat) => (
              <Card key={stat.label} style={{ padding: "16px 20px" }} glow={stat.color + "20"}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div>
                    <div style={{ fontSize: 11, color: T.textMuted, fontWeight: 500, letterSpacing: "0.04em", textTransform: "uppercase", marginBottom: 6 }}>{stat.label}</div>
                    <div style={{ fontSize: 22, fontWeight: 700, fontFamily: "'Space Grotesk', sans-serif", letterSpacing: "-0.02em" }}>{stat.value}</div>
                  </div>
                  <IconBadge icon={stat.icon} color={stat.color} size={40} />
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* ─── FOOTER STATUS ─── */}
        <div style={{ marginTop: 32, display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 0", borderTop: `1px solid ${T.border}`, ...stagger(6) }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 11, color: T.textMuted }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: T.green, boxShadow: `0 0 6px ${T.green}50` }} />
              Base Mainnet
            </div>
            <span>Block #18,442,391</span>
            <span>Gas: 0.001 gwei</span>
          </div>
          <div style={{ fontSize: 11, color: T.textMuted, display: "flex", alignItems: "center", gap: 6 }}>
            <Shield size={11} />
            VFIDE Protocol v1.0
          </div>
        </div>
      </main>
    </div>
  );
}

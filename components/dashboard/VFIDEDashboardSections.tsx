import type { ComponentType, CSSProperties, Dispatch, ReactNode, SetStateAction } from "react";
import {
  Shield,
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  Send,
  Lock,
  Vote,
  Store,
  Trophy,
  Eye,
  EyeOff,
  Copy,
  Check,
  ChevronRight,
  Bell,
  Settings,
  Search,
  TrendingUp,
  ArrowLeftRight,
  Users,
  Flame,
  BarChart3,
  Star,
  Compass,
  PiggyBank,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

interface DashboardTheme {
  bg: string;
  bgCard: string;
  bgElevated: string;
  accent: string;
  accentDark: string;
  gold: string;
  green: string;
  purple: string;
  red: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  border: string;
  borderAccent: string;
  glass: string;
  glassHover: string;
}

type StaggerFn = (index: number) => CSSProperties;

type CardProps = {
  children: ReactNode;
  style?: CSSProperties;
  hover?: boolean;
  onClick?: () => void;
  glow?: string;
};

type CardComponent = ComponentType<CardProps>;
type ProofScoreHeroComponent = ComponentType<{ score: number }>;
type IconBadgeComponent = ComponentType<{ icon: LucideIcon; color: string; bg?: string; size?: number }>;
type ChartTooltipComponent = ComponentType<{
  active?: boolean;
  payload?: Array<{ color?: string; name?: string; value: number }>;
  label?: string | number;
}>;

interface ChartPoint {
  day: number;
  score: number;
  volume: number;
}

interface ActivityItem {
  type: "receive" | "escrow" | "fee" | "send" | "reward" | "score";
  label: string;
  from: string;
  amount: string;
  time: string;
  color: string;
}

interface QuickAction {
  icon: LucideIcon;
  label: string;
  desc: string;
  color: string;
  bg: string;
}

interface NavItem {
  icon: LucideIcon;
  label: string;
}

interface EcosystemStat {
  label: string;
  value: string;
  icon: LucideIcon;
  color: string;
}

const MOCK_SCORE = 7420;
const MOCK_BALANCE = "12,847.32";
const MOCK_BALANCE_USD = "$4,218.45";
const MOCK_VAULT_LOCKED = "8,200.00";
const MOCK_FEE_RATE = "0.38%";
const MOCK_ADDRESS = "0x7a3B...f92E";

const chartData: ChartPoint[] = Array.from({ length: 30 }, (_, i) => ({
  day: i + 1,
  score: 6800 + Math.floor(Math.random() * 800) + i * 18,
  volume: 200 + Math.floor(Math.random() * 500) + i * 8,
}));

const activityData: ActivityItem[] = [
  { type: "receive", label: "Payment received", from: "0xaB4...21c", amount: "+142.50 VFIDE", time: "2 min ago", color: "#00FF88" },
  { type: "escrow", label: "Escrow released", from: "Merchant #0x9f2", amount: "+800.00 VFIDE", time: "18 min ago", color: "#A78BFA" },
  { type: "fee", label: "Network fee (burned)", from: "Transfer", amount: "-3.42 VFIDE", time: "24 min ago", color: "#EF4444" },
  { type: "send", label: "Payment sent", from: "0x3eF...8bA", amount: "-250.00 VFIDE", time: "1 hr ago", color: "#00F0FF" },
  { type: "reward", label: "DAO duty reward", from: "PayrollPool", amount: "+45.00 VFIDE", time: "3 hr ago", color: "#FFD700" },
  { type: "score", label: "ProofScore +120", from: "Seer Oracle", amount: "7,300 → 7,420", time: "6 hr ago", color: "#00F0FF" },
];

const quickActions: QuickAction[] = [
  { icon: Send, label: "Send", desc: "Pay anyone", color: "#00F0FF", bg: "rgba(0,240,255,0.08)" },
  { icon: ArrowDownLeft, label: "Receive", desc: "Get paid", color: "#00FF88", bg: "rgba(0,255,136,0.08)" },
  { icon: Lock, label: "Vault", desc: "Deposit", color: "#A78BFA", bg: "rgba(167,139,250,0.08)" },
  { icon: ArrowLeftRight, label: "Escrow", desc: "Trade safe", color: "#FFD700", bg: "rgba(255,215,0,0.08)" },
];

const navItems: NavItem[] = [
  { icon: BarChart3, label: "Dashboard" },
  { icon: Wallet, label: "Pay" },
  { icon: Lock, label: "Vault" },
  { icon: Store, label: "Merchant" },
  { icon: Vote, label: "DAO" },
  { icon: Shield, label: "Guardians" },
  { icon: Users, label: "Social" },
  { icon: Trophy, label: "Quests" },
  { icon: Compass, label: "Explorer" },
];

const ecosystemStats: EcosystemStat[] = [
  { label: "Total Burned", value: "2.4M", icon: Flame, color: "#EF4444" },
  { label: "Sanctum Fund", value: "$182K", icon: PiggyBank, color: "#00FF88" },
  { label: "Active Vaults", value: "14.2K", icon: Lock, color: "#A78BFA" },
  { label: "Avg Fee Rate", value: "1.2%", icon: TrendingUp, color: "#00F0FF" },
];

interface SidebarNavProps {
  T: DashboardTheme;
  sidebarOpen: boolean;
  setSidebarOpen: Dispatch<SetStateAction<boolean>>;
  activeNav: string;
  setActiveNav: Dispatch<SetStateAction<string>>;
}

export function SidebarNav({ T, sidebarOpen, setSidebarOpen, activeNav, setActiveNav }: SidebarNavProps) {
  return (
    <nav style={{
      width: sidebarOpen ? 220 : 68, minHeight: "100vh",
      background: "rgba(8,8,14,0.95)", borderRight: `1px solid ${T.border}`,
      display: "flex", flexDirection: "column", padding: "20px 0",
      transition: "width 0.3s cubic-bezier(0.4,0,0.2,1)",
      position: "relative", zIndex: 10,
      backdropFilter: "blur(20px)",
    }}>
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

      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 2, padding: "0 8px" }}>
        {navItems.map((item) => {
          const isActive = item.label === activeNav;
          return (
            <button
              key={item.label}
              type="button"
              aria-label={`Navigate to ${item.label}`}
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

      <div style={{ padding: "0 8px", display: "flex", flexDirection: "column", gap: 2 }}>
        <button type="button" aria-label="Open dashboard settings" style={{ display: "flex", alignItems: "center", gap: 12, padding: sidebarOpen ? "10px 12px" : "10px", borderRadius: 10, border: "none", cursor: "pointer", background: "transparent", color: T.textMuted, fontSize: 13, fontWeight: 500, justifyContent: sidebarOpen ? "flex-start" : "center", width: "100%", transition: "color 0.2s" }} onMouseEnter={(e) => e.currentTarget.style.color = T.textSecondary} onMouseLeave={(e) => e.currentTarget.style.color = T.textMuted}>
          <Settings size={18} strokeWidth={1.8} />
          {sidebarOpen && <span>Settings</span>}
        </button>
      </div>

      <button
        type="button"
        aria-label="Toggle sidebar"
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
  );
}

interface TopBarProps {
  T: DashboardTheme;
  stagger: StaggerFn;
  copied: boolean;
  handleCopy: () => void;
}

export function TopBar({ T, stagger, copied, handleCopy }: TopBarProps) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32, ...stagger(0) }}>
      <div>
        <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 26, fontWeight: 700, letterSpacing: "-0.02em" }}>
          Dashboard
        </h1>
        <p style={{ fontSize: 13, color: T.textSecondary, marginTop: 4 }}>
          Welcome back - your trust score is climbing.
        </p>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <button type="button" aria-label="Notifications" style={{ width: 38, height: 38, borderRadius: 10, background: T.bgCard, border: `1px solid ${T.border}`, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: T.textSecondary, transition: "all 0.2s", position: "relative" }} onMouseEnter={(e)=>{e.currentTarget.style.borderColor=T.borderAccent;e.currentTarget.style.color=T.accent;}} onMouseLeave={(e)=>{e.currentTarget.style.borderColor=T.border;e.currentTarget.style.color=T.textSecondary;}}>
          <Bell size={16} />
          <div style={{ position: "absolute", top: 8, right: 8, width: 6, height: 6, borderRadius: "50%", background: T.red }} />
        </button>
        <button type="button" aria-label="Search dashboard" style={{ width: 38, height: 38, borderRadius: 10, background: T.bgCard, border: `1px solid ${T.border}`, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: T.textSecondary, transition: "all 0.2s" }} onMouseEnter={(e)=>{e.currentTarget.style.borderColor=T.borderAccent;e.currentTarget.style.color=T.accent;}} onMouseLeave={(e)=>{e.currentTarget.style.borderColor=T.border;e.currentTarget.style.color=T.textSecondary;}}>
          <Search size={16} />
        </button>
        <div style={{
          display: "flex", alignItems: "center", gap: 8,
          padding: "7px 14px", borderRadius: 10,
          background: T.bgCard, border: `1px solid ${T.border}`,
        }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: T.green, boxShadow: `0 0 8px ${T.green}60` }} />
          <span style={{ fontSize: 13, fontFamily: "'JetBrains Mono', monospace", color: T.textSecondary, fontWeight: 500 }}>
            {MOCK_ADDRESS}
          </span>
          <button type="button" aria-label={copied ? "Wallet address copied" : "Copy wallet address"} onClick={handleCopy} style={{ background: "none", border: "none", cursor: "pointer", color: T.textMuted, display: "flex", padding: 2, transition: "color 0.2s" }} onMouseEnter={(e)=>e.currentTarget.style.color=T.accent} onMouseLeave={(e)=>e.currentTarget.style.color=T.textMuted}>
            {copied ? <Check size={13} color={T.green} /> : <Copy size={13} />}
          </button>
        </div>
      </div>
    </div>
  );
}

interface HeroRowProps {
  T: DashboardTheme;
  stagger: StaggerFn;
  Card: CardComponent;
  ProofScoreHero: ProofScoreHeroComponent;
  balanceVisible: boolean;
  setBalanceVisible: Dispatch<SetStateAction<boolean>>;
}

export function HeroRow({ T, stagger, Card, ProofScoreHero, balanceVisible, setBalanceVisible }: HeroRowProps) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: 24, marginBottom: 24 }}>
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

      <div style={{ display: "flex", flexDirection: "column", gap: 16, ...stagger(2) }}>
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
              type="button"
              aria-label={balanceVisible ? "Hide balance" : "Show balance"}
              onClick={() => setBalanceVisible(!balanceVisible)}
              style={{ background: "none", border: "none", cursor: "pointer", color: T.textMuted, padding: 4, transition: "color 0.2s" }}
              onMouseEnter={(e) => e.currentTarget.style.color = T.textSecondary}
              onMouseLeave={(e) => e.currentTarget.style.color = T.textMuted}
            >
              {balanceVisible ? <Eye size={18} /> : <EyeOff size={18} />}
            </button>
          </div>
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

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
          {quickActions.map((action) => (
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
  );
}

interface ChartActivityRowProps {
  T: DashboardTheme;
  stagger: StaggerFn;
  Card: CardComponent;
  ChartTooltip: ChartTooltipComponent;
}

export function ChartActivityRow({ T, stagger, Card, ChartTooltip }: ChartActivityRowProps) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: 24, marginBottom: 24 }}>
      <div style={stagger(3)}>
        <Card style={{ padding: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 600 }}>Trust Score Trend</div>
              <div style={{ fontSize: 12, color: T.textMuted, marginTop: 2 }}>30-day ProofScore history</div>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              {["7D", "30D", "90D"].map((p, i) => (
                <button type="button" aria-label={`View ${p} chart range`} key={p} style={{ padding: "4px 10px", borderRadius: 6, border: "none", background: i === 1 ? `${T.accent}15` : "transparent", color: i === 1 ? T.accent : T.textMuted, fontSize: 11, fontWeight: 600, cursor: "pointer", transition: "all 0.2s" }}>
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
                <YAxis domain={["auto", "auto"]} axisLine={false} tickLine={false} tick={{ fill: T.textMuted, fontSize: 10 }} />
                <Tooltip content={<ChartTooltip />} cursor={{ stroke: T.accent, strokeWidth: 1, strokeDasharray: "4 4" }} />
                <Area type="monotone" dataKey="score" stroke={T.accent} strokeWidth={2} fill="url(#scoreAreaGrad)" name="Score" dot={false} activeDot={{ r: 4, fill: T.accent, stroke: T.bg, strokeWidth: 2 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <div style={stagger(4)}>
        <Card style={{ padding: 20, height: "100%", display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div style={{ fontSize: 15, fontWeight: 600 }}>Recent Activity</div>
            <button type="button" aria-label="View all recent activity" style={{ fontSize: 12, color: T.accent, background: "none", border: "none", cursor: "pointer", fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>
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
  );
}

interface EcosystemStatsRowProps {
  T: DashboardTheme;
  stagger: StaggerFn;
  Card: CardComponent;
  IconBadge: IconBadgeComponent;
}

export function EcosystemStatsRow({ T, stagger, Card, IconBadge }: EcosystemStatsRowProps) {
  return (
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
  );
}

interface FooterStatusProps {
  T: DashboardTheme;
  stagger: StaggerFn;
}

export function FooterStatus({ T, stagger }: FooterStatusProps) {
  return (
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
  );
}

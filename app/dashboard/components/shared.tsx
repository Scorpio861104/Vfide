'use client';
import { GlassCard } from "@/components/ui/GlassCard";
import { motion } from 'framer-motion';

export function StatCard({ 
  icon: Icon, 
  label, 
  value, 
  subValue, 
  color = "cyan",
  href,
  loading = false
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  subValue?: string;
  color?: "cyan" | "green" | "gold" | "purple";
  href?: string;
  loading?: boolean;
}) {
  const colorMap = {
    cyan: { bg: "bg-cyan-500/20", text: "text-cyan-400", glow: "shadow-cyan-500/20" },
    green: { bg: "bg-emerald-500/20", text: "text-emerald-400", glow: "shadow-emerald-500/20" },
    gold: { bg: "bg-amber-500/20", text: "text-amber-400", glow: "shadow-amber-500/20" },
    purple: { bg: "bg-purple-500/20", text: "text-purple-400", glow: "shadow-purple-500/20" },
  };
  
  const styles = colorMap[color];
  
  const content = (
    <GlassCard className={`p-5 ${href ? 'cursor-pointer hover:border-white/20' : ''}`}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-white/60 text-sm font-medium">{label}</span>
        <div className={`p-2 rounded-xl ${styles.bg} shadow-lg ${styles.glow}`}>
          <Icon className={styles.text} size={18} />
        </div>
      </div>
      {loading ? (
        <>
          <Skeleton height={32} className="w-24 mb-1 bg-white/10" />
          <Skeleton height={14} className="w-16 bg-white/5" />
        </>
      ) : (
        <>
          <div className="text-2xl font-bold text-white mb-1">{value}</div>
          {subValue && (
            <div className={`text-sm ${styles.text} flex items-center gap-1`}>
              {href && <ChevronRight size={14} />}
              {subValue}
            </div>
          )}
        </>
      )}
    </GlassCard>
  );

  return href ? <Link href={href}>{content}</Link> : content;
}

export function QuickAction({ 
  icon: Icon, 
  label, 
  href, 
  variant = "default" 
}: {
  icon: React.ElementType;
  label: string;
  href: string;
  variant?: "primary" | "default";
}) {
  const isPrimary = variant === "primary";
  
  return (
    <Link href={href}>
      <motion.div
        whileHover={{ scale: 1.05, y: -2 }}
        whileTap={{ scale: 0.98 }}
        className={`p-4 rounded-2xl font-semibold transition-all flex flex-col items-center gap-3 text-center ${isPrimary 
          ? 'bg-gradient-to-br from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/25' 
          : 'bg-white/5 border border-white/10 text-white/80 hover:bg-white/10 hover:text-white hover:border-white/20'} ring-effect`}
      >
        <div className={`p-3 rounded-xl ${isPrimary ? 'bg-white/20' : 'bg-gradient-to-br from-white/10 to-white/5'}`}>
          <Icon size={24} />
        </div>
        <span className="text-sm">{label}</span>
      </motion.div>
    </Link>
  );
}


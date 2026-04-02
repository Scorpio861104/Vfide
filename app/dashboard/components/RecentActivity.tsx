'use client';
import { motion } from 'framer-motion';
import { ArrowUpRight, ArrowDownLeft, Shield, Star, Award, Vote } from 'lucide-react';

export function RecentActivitySection() {
  const { address } = useAccount();
  const [activities, setActivities] = useState<Array<{type: string; desc: string; time: string; icon: typeof ArrowUpRight; color: string}>>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchActivity = async () => {
      if (!address) return;
      setIsLoading(true);
      try {
        const res = await fetch(`/api/activities/${address}`);
        if (res.ok) {
          const data = await res.json();
          // Map API response to activity format
          setActivities((data.activities || []).slice(0, 4).map((a: { type: string; description: string; timestamp: string }) => ({
            desc: a.description,
            time: formatTimeAgo(new Date(a.timestamp).getTime()),
            icon: a.type === 'send' ? ArrowUpRight : a.type === 'receive' ? ArrowDownLeft : a.type === 'badge' ? Award : Vote,
            color: a.type === 'send' ? 'cyan' : a.type === 'receive' ? 'emerald' : a.type === 'badge' ? 'amber' : 'purple',
          })));
        }
      } catch {
        // API failed - show empty state
      } finally {
        setIsLoading(false);
      }
    };
    fetchActivity();
  }, [address]);

  return (
    <GlassCard className="p-6" hover={false}>
      <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
        <Activity className="text-cyan-400" size={24} />
        Recent Activity
      </h2>
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="animate-pulse flex items-center gap-4 p-4 bg-white/5 rounded-xl">
              <div className="w-10 h-10 bg-white/10 rounded-xl" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-white/10 rounded w-3/4" />
                <div className="h-3 bg-white/5 rounded w-1/4" />
              </div>
            </div>
          ))}
        </div>
      ) : activities.length === 0 ? (
        <p className="text-white/60 text-center py-8">No recent activity. Start transacting to see your history!</p>
      ) : (
        <div className="space-y-3">
          {activities.map((activity, index) => (
            <motion.div key={`${activity.type}-${activity.time}-${index}`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.1 }} className="flex items-center gap-2 sm:gap-4 p-3 sm:p-4 bg-white/5 rounded-xl hover:bg-white/8 transition-colors">
              <div className={`p-2 rounded-xl shrink-0 ${
                activity.color === 'cyan' ? 'bg-cyan-500/20 text-cyan-400' :
                activity.color === 'emerald' ? 'bg-emerald-500/20 text-emerald-400' :
                activity.color === 'amber' ? 'bg-amber-500/20 text-amber-400' :
                'bg-purple-500/20 text-purple-400'
              }`}>
                <activity.icon size={16} className="sm:w-5 sm:h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white text-xs sm:text-sm truncate">{activity.desc}</p>
                <p className="text-white/40 text-xs">{activity.time}</p>
              </div>
              <ChevronRight className="text-white/20" size={16} />
            </motion.div>
          ))}
        </div>
      )}
      <div className="mt-4 text-center">
        <Link href="/explorer" className="text-cyan-400 hover:text-cyan-300 text-sm font-medium inline-flex items-center gap-1">
          View All Activity <ChevronRight size={14} />
        </Link>
      </div>
    </GlassCard>
  );
}

// Helper function for time formatting
export function formatTimeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}


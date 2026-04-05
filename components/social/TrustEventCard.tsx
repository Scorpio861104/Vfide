/**
 * Trust Event Cards — ProofScore events as social content
 *
 * In VFIDE, trust is public. When someone earns a badge, repays a loan,
 * gets endorsed, or hits a ProofScore milestone, the community sees it.
 * These aren't notifications — they're celebrations.
 *
 * Types:
 *   - badge_earned: "Kofi earned the Verified Merchant badge"
 *   - loan_repaid: "Ama repaid her loan to Kwame — on time"
 *   - endorsement: "Fatima endorsed by 3 merchants this week"
 *   - milestone: "Abdul reached ProofScore 7,000"
 *   - guardian_added: "Nana added as vault guardian for Yaa"
 *   - streak: "Kofi's 30-day activity streak"
 *   - first_sale: "Amara made her first sale on VFIDE"
 *   - sanctum_donation: "Community donated ₵5,000 to Accra Schools Fund"
 */
'use client';

import { motion } from 'framer-motion';
import { Award, Shield, Banknote, Users, Star, Flame, ShoppingCart, Heart, Check, TrendingUp, ArrowRight } from 'lucide-react';

export type TrustEventType =
  | 'badge_earned'
  | 'loan_repaid'
  | 'endorsement'
  | 'milestone'
  | 'guardian_added'
  | 'streak'
  | 'first_sale'
  | 'sanctum_donation';

export interface TrustEvent {
  id: string;
  type: TrustEventType;
  actor: { address: string; name?: string; proofScore: number };
  target?: { address: string; name?: string };
  data: Record<string, string | number>;
  timestamp: number;
}

const EVENT_CONFIG: Record<TrustEventType, {
  icon: React.ReactNode;
  color: string;
  bgGradient: string;
  verb: (e: TrustEvent) => string;
  detail?: (e: TrustEvent) => string | undefined;
}> = {
  badge_earned: {
    icon: <Award size={20} />,
    color: '#F59E0B',
    bgGradient: 'from-amber-500/10 to-amber-500/3',
    verb: (e) => `earned the ${e.data.badgeName} badge`,
    detail: (e) => e.data.badgeRarity ? `${e.data.badgeRarity} · +${Number(e.data.scoreBoost) / 10} ProofScore` : undefined,
  },
  loan_repaid: {
    icon: <Banknote size={20} />,
    color: '#10B981',
    bgGradient: 'from-emerald-500/10 to-emerald-500/3',
    verb: (e) => `repaid ${e.data.amount} VFIDE to ${e.target?.name || shortAddr(e.target?.address || '')}`,
    detail: (e) => e.data.onTime === 'true' ? 'On time — trust grows' : 'Completed via payment plan',
  },
  endorsement: {
    icon: <Star size={20} />,
    color: '#8B5CF6',
    bgGradient: 'from-purple-500/10 to-purple-500/3',
    verb: (e) => Number(e.data.count) > 1
      ? `received ${e.data.count} endorsements this week`
      : `endorsed by ${e.target?.name || shortAddr(e.target?.address || '')}`,
    detail: (e) => e.data.reason ? `"${e.data.reason}"` : undefined,
  },
  milestone: {
    icon: <TrendingUp size={20} />,
    color: '#06B6D4',
    bgGradient: 'from-cyan-500/10 to-cyan-500/3',
    verb: (e) => `reached ProofScore ${Number(e.data.score).toLocaleString()}`,
    detail: () => 'Trust built through consistent commerce and community participation',
  },
  guardian_added: {
    icon: <Shield size={20} />,
    color: '#6366F1',
    bgGradient: 'from-indigo-500/10 to-indigo-500/3',
    verb: (e) => `became a vault guardian for ${e.target?.name || shortAddr(e.target?.address || '')}`,
    detail: () => 'Protecting someone else\'s funds — that\'s trust',
  },
  streak: {
    icon: <Flame size={20} />,
    color: '#F97316',
    bgGradient: 'from-orange-500/10 to-orange-500/3',
    verb: (e) => `${e.data.days}-day activity streak`,
    detail: (e) => Number(e.data.days) >= 30 ? 'Consistent presence builds trust' : undefined,
  },
  first_sale: {
    icon: <ShoppingCart size={20} />,
    color: '#EC4899',
    bgGradient: 'from-pink-500/10 to-pink-500/3',
    verb: () => 'made their first sale on VFIDE!',
    detail: () => 'Welcome to the community',
  },
  sanctum_donation: {
    icon: <Heart size={20} />,
    color: '#EC4899',
    bgGradient: 'from-pink-500/10 to-pink-500/3',
    verb: (e) => `Community donated ${e.data.currency || '$'}${Number(e.data.amount).toLocaleString()} to ${e.data.campaign}`,
    detail: (e) => `via Sanctum Fund — ${e.data.charityName}`,
  },
};

function shortAddr(a: string) { return a ? `${a.slice(0, 6)}...${a.slice(-4)}` : ''; }

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < 60000) return 'just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`;
  return `${Math.floor(diff / 86400000)}d`;
}

interface TrustEventCardProps {
  event: TrustEvent;
  onCelebrate?: (eventId: string) => void;
  celebrated?: boolean;
}

export function TrustEventCard({ event, onCelebrate, celebrated = false }: TrustEventCardProps) {
  const config = EVENT_CONFIG[event.type];
  if (!config) return null;

  const actorName = event.actor.name || shortAddr(event.actor.address);
  const verb = config.verb(event);
  const detail = config.detail?.(event);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className={`p-4 bg-gradient-to-r ${config.bgGradient} border border-white/5 rounded-2xl`}
    >
      <div className="flex items-start gap-3">
        {/* Event icon */}
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: `${config.color}15`, color: config.color, boxShadow: `0 0 12px ${config.color}20` }}>
          {config.icon}
        </div>

        <div className="flex-1 min-w-0">
          {/* Main line */}
          <p className="text-sm">
            <span className="text-white font-medium">{actorName}</span>
            <span className="text-gray-400"> {verb}</span>
          </p>

          {/* Detail line */}
          {detail && (
            <p className="text-xs text-gray-500 mt-1">{detail}</p>
          )}

          {/* Footer: time + celebrate button */}
          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center gap-3 text-xs text-gray-600">
              <span>{timeAgo(event.timestamp)}</span>
              <span className="flex items-center gap-0.5">
                <Shield size={10} style={{ color: config.color }} />
                {event.actor.proofScore.toLocaleString()}
              </span>
            </div>

            {onCelebrate && (
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => onCelebrate(event.id)}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                  celebrated
                    ? 'bg-amber-500/20 text-amber-400'
                    : 'bg-white/3 text-gray-500 hover:text-amber-400 hover:bg-amber-500/10'
                }`}
              >
                {celebrated ? <Check size={12} /> : <span>🎉</span>}
                {celebrated ? 'Celebrated' : 'Celebrate'}
              </motion.button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ── Trust Event Feed (multiple cards) ────────────────────────────────────

interface TrustFeedProps {
  events: TrustEvent[];
  maxItems?: number;
}

export function TrustFeed({ events, maxItems = 10 }: TrustFeedProps) {
  const displayed = events.slice(0, maxItems);

  if (displayed.length === 0) return null;

  return (
    <div className="space-y-2">
      {displayed.map(event => (
        <TrustEventCard key={event.id} event={event} />
      ))}
    </div>
  );
}

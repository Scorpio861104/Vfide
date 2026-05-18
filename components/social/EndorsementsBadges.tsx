'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Award,
  Shield,
  CheckCircle,
  TrendingUp as _TrendingUp,
  Star,
  AlertCircle,
} from 'lucide-react';
import { formatAddress } from '@/lib/messageEncryption';
import { safeLocalStorage } from '@/lib/utils';

interface Endorsement {
  id: string;
  from: string;
  to: string;
  message: string;
  category: 'technical' | 'trustworthy' | 'helpful' | 'innovative' | 'collaborative';
  timestamp: number;
  txHash?: string;
}

interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  earnedAt: number;
}

interface EndorsementsBadgesProps {
  userAddress: string;
  showGiveEndorsement?: boolean;
  onGiveEndorsement?: () => void;
}

export function EndorsementsBadges({ userAddress, showGiveEndorsement, onGiveEndorsement }: EndorsementsBadgesProps) {
  const [endorsements, setEndorsements] = useState<Endorsement[]>([]);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [isClient, setIsClient] = useState(false);

  // Handle SSR
  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!userAddress || !isClient || typeof window === 'undefined') return;
    
    // Load endorsements from localStorage
    try {
      const storedEndorsements = safeLocalStorage.getItem(`vfide_endorsements_${userAddress}`);
      if (storedEndorsements) {
        const endorsementsData: Endorsement[] = JSON.parse(storedEndorsements);
        setEndorsements(endorsementsData);
      }
    } catch {
      setEndorsements([]);
    }

    // Load badges
    try {
      const storedBadges = safeLocalStorage.getItem(`vfide_badges_${userAddress}`);
      if (storedBadges) {
        setBadges(JSON.parse(storedBadges));
      }
    } catch {
      setBadges([]);
    }
  }, [userAddress, isClient]);

  // Memoize stats calculation for performance
  const endorsementStats = useMemo(() => {
    const stats = {
      technical: 0,
      trustworthy: 0,
      helpful: 0,
      innovative: 0,
      collaborative: 0,
    };
    
    endorsements.forEach(e => {
      stats[e.category]++;
    });
    
    return stats;
  }, [endorsements]);

  const getCategoryColor = (category: Endorsement['category']) => {
    const colors = {
      technical: '#00F0FF',
      trustworthy: '#50C878',
      helpful: '#FFD700',
      innovative: '#A78BFA',
      collaborative: '#FF8C42',
    };
    return colors[category];
  };

  const getCategoryIcon = (category: Endorsement['category']) => {
    const icons = {
      technical: '⚡',
      trustworthy: '🛡️',
      helpful: '🤝',
      innovative: '💡',
      collaborative: '👥',
    };
    return icons[category];
  };

  const getRarityColor = (rarity: Badge['rarity']) => {
    const colors = {
      common: '#6B6B78',
      rare: '#00F0FF',
      epic: '#A78BFA',
      legendary: '#FFD700',
    };
    return colors[rarity];
  };

  const totalEndorsements = Object.values(endorsementStats).reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-6">
      {/* Endorsements Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-cyan-400" />
            <h3 className="font-bold text-zinc-100">
              Endorsements ({totalEndorsements})
            </h3>
          </div>
          {showGiveEndorsement && onGiveEndorsement && (
            <button
              onClick={onGiveEndorsement}
              className="px-3 py-1 bg-cyan-400 text-zinc-950 rounded-lg text-sm font-semibold hover:bg-cyan-400 transition-colors"
            >
              Give Endorsement
            </button>
          )}
        </div>

        {totalEndorsements === 0 ? (
          <div className="p-6 bg-zinc-950 border border-zinc-800 rounded-xl text-center">
            <AlertCircle className="w-12 h-12 text-zinc-500 mx-auto mb-2 opacity-50" />
            <p className="text-zinc-500">No endorsements yet</p>
          </div>
        ) : (
          <>
            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
              {Object.entries(endorsementStats).map(([category, count]) => {
                const color = getCategoryColor(category as Endorsement['category']);
                const icon = getCategoryIcon(category as Endorsement['category']);
                return (
                  <div
                    key={category}
                    className="p-3 bg-zinc-950 border border-zinc-800 rounded-lg"
                  >
                    <div className="text-2xl mb-1">{icon}</div>
                    <div className="text-2xl font-bold" style={{ color }}>
                      {count}
                    </div>
                    <div className="text-xs text-zinc-500 capitalize">
                      {category}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Recent Endorsements */}
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-zinc-400 mb-2">
                Recent Endorsements
              </h4>
              {endorsements.slice(0, 5).map((endorsement) => {
                const color = getCategoryColor(endorsement.category);
                return (
                  <motion.div
                    key={endorsement.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3 bg-zinc-950 border border-zinc-800 rounded-lg hover:border-zinc-700 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-lg shrink-0"
                        style={{ backgroundColor: `${color}20` }}
                      >
                        {getCategoryIcon(endorsement.category)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span
                            className="text-xs font-bold px-2 py-0.5 rounded capitalize"
                            style={{
                              backgroundColor: `${color}20`,
                              color: color,
                            }}
                          >
                            {endorsement.category}
                          </span>
                          <span className="text-xs text-zinc-500">
                            from {formatAddress(endorsement.from)}
                          </span>
                        </div>
                        <p className="text-sm text-zinc-400">
                          {endorsement.message}
                        </p>
                        <p className="text-xs text-zinc-500 mt-1">
                          {new Date(endorsement.timestamp).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Badges Section */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Shield className="w-5 h-5 text-amber-400" />
          <h3 className="font-bold text-zinc-100">
            Badges ({badges.length})
          </h3>
        </div>

        {badges.length === 0 ? (
          <div className="p-6 bg-zinc-950 border border-zinc-800 rounded-xl text-center">
            <Star className="w-12 h-12 text-zinc-500 mx-auto mb-2 opacity-50" />
            <p className="text-zinc-500">No badges earned yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {badges.map((badge) => {
              const color = getRarityColor(badge.rarity);
              return (
                <motion.div
                  key={badge.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="p-4 bg-zinc-950 border rounded-lg hover:border-zinc-700 transition-all hover:scale-105"
                  style={{ borderColor: `${color}40` }}
                >
                  <div
                    className="text-4xl mb-2 text-center"
                    style={{
                      filter: `drop-shadow(0 0 8px ${color}40)`,
                    }}
                  >
                    {badge.icon}
                  </div>
                  <h4 className="font-bold text-zinc-100 text-sm text-center mb-1">
                    {badge.name}
                  </h4>
                  <p className="text-xs text-zinc-500 text-center mb-2">
                    {badge.description}
                  </p>
                  <div className="flex items-center justify-between">
                    <span
                      className="text-xs font-bold px-2 py-0.5 rounded capitalize"
                      style={{
                        backgroundColor: `${color}20`,
                        color: color,
                      }}
                    >
                      {badge.rarity}
                    </span>
                    <span className="text-xs text-zinc-500">
                      {new Date(badge.earnedAt).toLocaleDateString()}
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Guardian Status */}
      {endorsements.filter(e => e.category === 'trustworthy').length >= 5 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-gradient-to-r from-emerald-500/20 to-cyan-400/20 border border-emerald-500/30 rounded-xl"
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-500 to-cyan-400 flex items-center justify-center">
              <Shield className="w-6 h-6 text-zinc-950" />
            </div>
            <div>
              <h4 className="font-bold text-zinc-100 flex items-center gap-2">
                Guardian Status
                <CheckCircle className="w-4 h-4 text-emerald-500" />
              </h4>
              <p className="text-sm text-zinc-400">
                Highly trusted community member with 5+ trustworthy endorsements
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}

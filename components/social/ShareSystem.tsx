'use client';

import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Share2,
  Download,
  Copy,
  CheckCircle2,
  Mail,
  MessageCircle,
  Twitter,
  Linkedin,
} from 'lucide-react';
import { useAccount } from 'wagmi';

interface ShareableAchievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  unlockedDate: Date;
  shareUrl: string;
  qrCode?: string;
}

interface ReferralCard {
  code: string;
  link: string;
  expiresAt?: Date;
  uses: number;
  maxUses?: number;
  reward: number;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
}

interface ShareMetrics {
  platform: 'twitter' | 'linkedin' | 'email' | 'whatsapp' | 'telegram' | 'discord';
  shares: number;
  clicks: number;
  conversions: number;
}

interface ShareSystemProps {
  userId?: string;
  onShare?: (platform: string, content: string) => void;
}

const emptyReferrals: ReferralCard[] = [];
const emptyShareMetrics: ShareMetrics[] = [];

export function ShareSystem({ userId: _userId = 'current_user', onShare }: ShareSystemProps) {
  const { address } = useAccount();
  const [activeTab, setActiveTab] = useState<'achievements' | 'referrals' | 'certificates' | 'metrics'>('achievements');
  const [selectedAchievement, setSelectedAchievement] = useState<ShareableAchievement | null>(null);
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [achievements, setAchievements] = useState<ShareableAchievement[]>([]);
  const [referrals] = useState<ReferralCard[]>(emptyReferrals);
  const [shareMetrics] = useState<ShareMetrics[]>(emptyShareMetrics);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let isMounted = true;

    const loadAchievements = async () => {
      if (!address) {
        if (isMounted) {
          setAchievements([]);
          setIsLoading(false);
        }
        return;
      }

      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/badges?userAddress=${address}`);
        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          throw new Error(data.error || 'Failed to load badges');
        }
        const data = await response.json();
        const rows = Array.isArray(data?.badges) ? data.badges : [];
        const mapped = rows.map((row: Record<string, unknown>, idx: number) => ({
          id: String(row?.badge_id ?? row?.id ?? idx),
          title: String(row?.badge_name ?? row?.name ?? 'Badge'),
          description: String(row?.badge_description ?? row?.description ?? ''),
          icon: String(row?.badge_icon ?? '🏅'),
          rarity: (row?.badge_rarity ?? 'common') as ShareableAchievement['rarity'],
          unlockedDate: new Date(row?.earned_at ?? row?.created_at ?? Date.now()),
          shareUrl: '/badges',
        })) as ShareableAchievement[];

        if (isMounted) {
          setAchievements(mapped);
        }
      } catch {
        if (isMounted) {
          setAchievements([]);
          setError('Unable to load achievements.');
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    loadAchievements();
    return () => {
      isMounted = false;
    };
  }, [address]);

  const handleCopyLink = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(type);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const handleShareToSocial = (
    platform: 'twitter' | 'linkedin' | 'email' | 'whatsapp' | 'telegram' | 'discord',
    content: string
  ) => {
    const shareUrls: Record<string, string> = {
      twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(content)}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent('https://vfide.io')}`,
      email: `mailto:?subject=Check out my VFIDE achievement&body=${encodeURIComponent(content)}`,
      whatsapp: `https://wa.me/?text=${encodeURIComponent(content)}`,
      telegram: `https://t.me/share/url?text=${encodeURIComponent(content)}`,
      discord: `https://discord.com/channels/@me`,
    };

    if (shareUrls[platform]) {
      window.open(shareUrls[platform], '_blank', 'noopener,noreferrer');
      onShare?.(platform, content);
    }
  };

  const generateCertificate = (achievement: ShareableAchievement) => {
    if (!canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#0F0F12';
    ctx.fillRect(0, 0, 1200, 800);
    ctx.strokeStyle = '#00F0FF';
    ctx.lineWidth = 6;
    ctx.strokeRect(40, 40, 1120, 720);
    ctx.fillStyle = '#F8F8FC';
    ctx.font = 'bold 52px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('VFIDE Achievement Certificate', 600, 140);
    ctx.font = '72px sans-serif';
    ctx.fillText(achievement.icon, 600, 260);
    ctx.font = 'bold 40px sans-serif';
    ctx.fillText(achievement.title, 600, 360);
    ctx.font = '24px sans-serif';
    ctx.fillStyle = '#A0A0A5';
    ctx.fillText(achievement.description.slice(0, 80), 600, 430);
    ctx.fillText(`Unlocked: ${achievement.unlockedDate.toLocaleDateString()}`, 600, 700);

    const link = document.createElement('a');
    link.href = canvasRef.current.toDataURL('image/png');
    link.download = `${achievement.id}_certificate.png`;
    link.click();
  };

  const tabs = [
    { key: 'achievements', label: 'Achievements', icon: '🏆', count: achievements.length },
    { key: 'referrals', label: 'Referrals', icon: '🤝', count: referrals.length },
    { key: 'certificates', label: 'Certificates', icon: '📜', count: achievements.length },
    { key: 'metrics', label: 'Share Metrics', icon: '📊', count: undefined },
  ];

  const totalShares = shareMetrics.reduce((sum, m) => sum + m.shares, 0);
  const totalClicks = shareMetrics.reduce((sum, m) => sum + m.clicks, 0);
  const totalConversions = shareMetrics.reduce((sum, m) => sum + m.conversions, 0);
  const conversionRate = totalClicks > 0 ? Math.round((totalConversions / totalClicks) * 100) : 0;

  return (
    <div className="min-h-screen bg-linear-to-b from-zinc-950 via-[#1A1A2E] to-zinc-950">
      <canvas ref={canvasRef} width={1200} height={800} style={{ display: 'none' }} />

      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="sticky top-0 z-20 bg-zinc-950/80 backdrop-blur-xl border-b border-zinc-700 px-4 md:px-8 py-6"
      >
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-2 mb-4">
            <Share2 className="w-6 h-6 text-cyan-400" />
            <h1 className="text-3xl md:text-4xl font-bold text-zinc-100">Share Center</h1>
          </div>

          <div className="flex gap-2 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as typeof activeTab)}
                className={`px-4 py-2 rounded-lg font-semibold text-sm whitespace-nowrap transition-all flex items-center gap-2 ${
                  activeTab === tab.key
                    ? 'bg-cyan-400 text-zinc-950'
                    : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                }`}
              >
                <span>{tab.icon}</span>
                {tab.label}
                {tab.count !== undefined && tab.count > 0 && (
                  <span className="ml-1 px-2 py-0.5 bg-pink-400 text-white rounded-full text-xs font-bold">
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </motion.div>

      <div className="px-4 md:px-8 py-8 max-w-6xl mx-auto space-y-6">
        {activeTab === 'achievements' && (
          <div className="space-y-6">
            {error && (
              <div className="rounded-lg border border-pink-400/40 bg-pink-500/10 px-4 py-3 text-sm text-pink-200">
                {error}
              </div>
            )}
            {isLoading ? (
              <div className="text-zinc-500">Loading achievements...</div>
            ) : achievements.length === 0 ? (
              <div className="text-zinc-500">No achievements to share yet.</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {achievements.map((achievement, idx) => (
                  <motion.div
                    key={achievement.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: idx * 0.05 }}
                    className="bg-zinc-900 border border-zinc-700 rounded-lg p-6 hover:border-cyan-400 transition-colors"
                    onClick={() => setSelectedAchievement(achievement)}
                  >
                    <div className="text-5xl mb-4">{achievement.icon}</div>
                    <h3 className="text-lg font-bold text-zinc-100 mb-2">{achievement.title}</h3>
                    <p className="text-sm text-zinc-400 mb-4 line-clamp-2">{achievement.description}</p>

                    <div className="flex items-center justify-between gap-2">
                      <button
                        onClick={(event) => {
                          event.stopPropagation();
                          handleCopyLink(achievement.shareUrl, achievement.id);
                        }}
                        className="px-3 py-2 rounded-lg bg-zinc-800 text-zinc-200 text-xs font-semibold flex items-center gap-2"
                      >
                        {copiedText === achievement.id ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                        {copiedText === achievement.id ? 'Copied' : 'Copy Link'}
                      </button>
                      <button
                        onClick={(event) => {
                          event.stopPropagation();
                          handleShareToSocial('twitter', `${achievement.title} on VFIDE: ${achievement.shareUrl}`);
                        }}
                        className="px-3 py-2 rounded-lg bg-cyan-500 text-white text-xs font-semibold"
                      >
                        Share
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'referrals' && (
          <div className="rounded-lg border border-zinc-700 bg-zinc-900 p-6 text-zinc-500">
            Referral codes will appear here once they are available.
          </div>
        )}

        {activeTab === 'certificates' && (
          <div className="space-y-4">
            {selectedAchievement ? (
              <div className="rounded-lg border border-zinc-700 bg-zinc-900 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-zinc-100">{selectedAchievement.title}</h3>
                    <p className="text-sm text-zinc-400">Generate a certificate for this achievement.</p>
                  </div>
                  <button
                    onClick={() => generateCertificate(selectedAchievement)}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-500 text-white text-sm font-semibold"
                  >
                    <Download className="w-4 h-4" />
                    Download
                  </button>
                </div>
              </div>
            ) : (
              <div className="rounded-lg border border-zinc-700 bg-zinc-900 p-6 text-zinc-500">
                Select an achievement to generate a certificate.
              </div>
            )}
          </div>
        )}

        {activeTab === 'metrics' && (
          <div className="grid md:grid-cols-4 gap-4">
            <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-4">
              <div className="text-xs text-zinc-500">Total Shares</div>
              <div className="text-2xl font-bold text-zinc-100">{totalShares}</div>
            </div>
            <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-4">
              <div className="text-xs text-zinc-500">Total Clicks</div>
              <div className="text-2xl font-bold text-zinc-100">{totalClicks}</div>
            </div>
            <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-4">
              <div className="text-xs text-zinc-500">Conversions</div>
              <div className="text-2xl font-bold text-zinc-100">{totalConversions}</div>
            </div>
            <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-4">
              <div className="text-xs text-zinc-500">Conversion Rate</div>
              <div className="text-2xl font-bold text-zinc-100">{conversionRate}%</div>
            </div>
            {shareMetrics.length === 0 && (
              <div className="md:col-span-4 text-zinc-500">No share metrics available yet.</div>
            )}
          </div>
        )}
      </div>

      <div className="hidden">
        <Mail />
        <MessageCircle />
        <Twitter />
        <Linkedin />
      </div>
    </div>
  );
}

'use client';

import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Share2,
  Copy,
  CheckCircle2,
  Download,
  X,
  Briefcase,
} from 'lucide-react';
import { safeWindowOpen } from '@/lib/security/urlValidation';

// ==================== TYPES ====================

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

interface _AchievementCertificate {
  id: string;
  holderName: string;
  achievementTitle: string;
  proofScore: number;
  unlockedDate: Date;
  certificateNumber: string;
  badgeData: string;
}

interface ShareMetrics {
  platform: 'twitter' | 'linkedin' | 'email' | 'whatsapp' | 'telegram' | 'discord';
  shares: number;
  clicks: number;
  conversions: number;
}

// ==================== DATA ====================

const achievementsData: ShareableAchievement[] = [];

const shareMetricsData: ShareMetrics[] = [];

// ==================== COMPONENTS ====================

interface ShareSystemProps {
  userId?: string;
  onShare?: (platform: string, content: string) => void;
}

export function ShareSystem({ userId: _userId = 'current_user', onShare }: ShareSystemProps) {
  const [activeTab, setActiveTab] = useState<'achievements' | 'certificates' | 'metrics'>('achievements');
  const [selectedAchievement, setSelectedAchievement] = useState<ShareableAchievement | null>(null);
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [_showShareMenu, _setShowShareMenu] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [_showCertificateModal, _setShowCertificateModal] = useState(false);

  const handleCopyLink = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(type);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const handleShareToSocial = (platform: 'twitter' | 'linkedin' | 'email' | 'whatsapp' | 'telegram' | 'discord', content: string) => {
    const shareUrls: Record<string, string> = {
      twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(content)}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent('vfide.app')}`,
      email: `mailto:?subject=Check out my VFIDE achievement&body=${encodeURIComponent(content)}`,
      whatsapp: `https://wa.me/?text=${encodeURIComponent(content)}`,
      telegram: `https://t.me/share/url?text=${encodeURIComponent(content)}`,
      discord: `https://discord.com/channels/@me`,
    };

    if (shareUrls[platform]) {
      safeWindowOpen(shareUrls[platform], {
        allowRelative: false,
        allowedHosts: ['twitter.com', 'x.com', 'linkedin.com', 'wa.me', 't.me', 'discord.com'],
      });
      onShare?.(platform, content);
    }
  };

  const generateCertificate = (achievement: ShareableAchievement) => {
    if (!canvasRef.current) return;

    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    // Certificate background
    ctx.fillStyle = '#1A1A2E';
    ctx.fillRect(0, 0, 1200, 800);

    // Border
    ctx.strokeStyle = '#FFD700';
    ctx.lineWidth = 8;
    ctx.strokeRect(40, 40, 1120, 720);

    // Title
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 60px serif';
    ctx.textAlign = 'center';
    ctx.fillText('Certificate of Achievement', 600, 150);

    // Achievement Icon
    ctx.font = 'bold 100px sans-serif';
    ctx.fillText(achievement.icon, 600, 280);

    // Achievement Title
    ctx.fillStyle = '#00F0FF';
    ctx.font = 'bold 48px sans-serif';
    ctx.fillText(achievement.title, 600, 380);

    // Description
    ctx.fillStyle = '#D0D0D8';
    ctx.font = '24px sans-serif';
    ctx.fillText(achievement.description, 600, 440);

    // Footer
    ctx.fillStyle = '#A0A0A5';
    ctx.font = '18px sans-serif';
    ctx.fillText(`Unlocked: ${achievement.unlockedDate.toLocaleDateString()}`, 600, 720);

    // Download as image
    const link = document.createElement('a');
    link.href = canvasRef.current.toDataURL('image/png');
    link.download = `${achievement.id}_certificate.png`;
    link.click();
  };

  const tabs = [
    { key: 'achievements', label: 'Achievements', icon: '🏆', count: achievementsData.length },
    { key: 'certificates', label: 'Certificates', icon: '📜', count: achievementsData.length },
    { key: 'metrics', label: 'Share Metrics', icon: '📊', count: undefined },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-950 via-[#1A1A2E] to-zinc-950">
      {/* Hidden Canvas for Certificate Generation */}
      <canvas ref={canvasRef} width={1200} height={800} style={{ display: 'none' }} />

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="sticky top-0 z-20 bg-zinc-950/80 backdrop-blur-xl border-b border-zinc-700 px-4 md:px-8 py-6"
      >
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <Share2 className="w-8 h-8 text-cyan-400" />
            <h1 className="text-3xl md:text-4xl font-bold text-zinc-100">Share Your Success</h1>
          </div>

          {/* Tab Navigation */}
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
                {tab.count !== undefined && <span className="text-xs ml-1">({tab.count})</span>}
              </button>
            ))}
          </div>
        </div>
      </motion.div>

      <div className="px-4 md:px-8 py-8 max-w-6xl mx-auto">
        <AnimatePresence mode="wait">
          {/* Achievements Tab */}
          {activeTab === 'achievements' && (
            <motion.div
              key="achievements"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {achievementsData.map((achievement, idx) => (
                  <motion.div
                    key={achievement.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: idx * 0.1 }}
                    className={`bg-gradient-to-br rounded-lg p-6 border-2 transition-all group cursor-pointer ${
                      selectedAchievement?.id === achievement.id
                        ? 'border-cyan-400 from-cyan-400/20 to-transparent'
                        : `border-${
                            achievement.rarity === 'legendary'
                              ? 'yellow'
                              : achievement.rarity === 'epic'
                                ? 'purple'
                                : achievement.rarity === 'rare'
                                  ? 'cyan'
                                  : 'gray'
                          }-500/30 from-zinc-900 to-zinc-800`
                    }`}
                    onClick={() => setSelectedAchievement(achievement)}
                  >
                    <div className="text-6xl mb-4">{achievement.icon}</div>

                    <h3 className="text-xl font-bold text-zinc-100 mb-2">{achievement.title}</h3>

                    <p className="text-zinc-400 text-sm mb-4 line-clamp-2">{achievement.description}</p>

                    <div className="flex items-center justify-between mb-4">
                      <span
                        className={`text-xs font-bold px-3 py-1 rounded-full ${
                          achievement.rarity === 'legendary'
                            ? 'bg-yellow-500/20 text-yellow-400'
                            : achievement.rarity === 'epic'
                              ? 'bg-purple-500/20 text-purple-400'
                              : achievement.rarity === 'rare'
                                ? 'bg-cyan-400/20 text-cyan-400'
                                : 'bg-gray-500/20 text-gray-400'
                        }`}
                      >
                        {achievement.rarity.toUpperCase()}
                      </span>
                      <span className="text-xs text-zinc-500">{achievement.unlockedDate.toLocaleDateString()}</span>
                    </div>

                    {selectedAchievement?.id === achievement.id && (
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-4 pt-4 border-t border-zinc-700 space-y-3"
                      >
                        <div className="space-y-2">
                          <div className="flex items-center justify-between bg-zinc-950 rounded px-3 py-2">
                            <code className="text-xs text-cyan-400 font-mono">{achievement.shareUrl}</code>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCopyLink(achievement.shareUrl, `achievement_${achievement.id}`);
                              }}
                              className="ml-2 p-1 hover:bg-zinc-800 rounded transition-colors"
                            >
                              {copiedText === `achievement_${achievement.id}` ? (
                                <CheckCircle2 className="w-4 h-4 text-green-500" />
                              ) : (
                                <Copy className="w-4 h-4 text-zinc-400" />
                              )}
                            </button>
                          </div>

                          <div className="grid grid-cols-3 gap-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleShareToSocial(
                                  'twitter',
                                  `🏆 Just unlocked "${achievement.title}" on VFIDE! ${achievement.shareUrl}`,
                                );
                              }}
                              className="p-2 bg-sky-500/20 text-sky-500 rounded hover:bg-sky-500/30 transition-colors flex items-center justify-center gap-1 text-xs font-semibold"
                            >
                              <X className="w-4 h-4" />
                              Twitter
                            </button>

                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleShareToSocial('linkedin', `Unlocked: ${achievement.title}`);
                              }}
                              className="p-2 bg-blue-700/20 text-blue-700 rounded hover:bg-blue-700/30 transition-colors flex items-center justify-center gap-1 text-xs font-semibold"
                            >
                              <Briefcase className="w-4 h-4" />
                              LinkedIn
                            </button>

                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                generateCertificate(achievement);
                              }}
                              className="p-2 bg-amber-400/20 text-amber-400 rounded hover:bg-amber-400/30 transition-colors flex items-center justify-center gap-1 text-xs font-semibold"
                            >
                              <Download className="w-4 h-4" />
                              Download
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Certificates Tab */}
          {activeTab === 'certificates' && (
            <motion.div
              key="certificates"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              {achievementsData.map((achievement, idx) => (
                <motion.div
                  key={`cert_${achievement.id}`}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: idx * 0.1 }}
                  className="bg-gradient-to-r from-amber-400/10 via-[#1A1A2E] to-zinc-950 border-2 border-amber-400/30 rounded-lg overflow-hidden"
                >
                  {/* Certificate Preview */}
                  <div className="bg-zinc-900 p-8 border-b border-amber-400/20">
                    <div className="flex items-center justify-between mb-6">
                      <div>
                        <div className="text-amber-400 text-sm font-semibold mb-1">Certificate of Achievement</div>
                        <h3 className="text-2xl font-bold text-zinc-100">{achievement.title}</h3>
                      </div>
                      <div className="text-6xl">{achievement.icon}</div>
                    </div>

                    <p className="text-zinc-400 mb-6">{achievement.description}</p>

                    <div className="grid grid-cols-3 gap-4 text-sm mb-6 pb-6 border-b border-zinc-700">
                      <div>
                        <div className="text-zinc-500">Unlocked Date</div>
                        <div className="text-zinc-100 font-semibold">{achievement.unlockedDate.toLocaleDateString()}</div>
                      </div>
                      <div>
                        <div className="text-zinc-500">Rarity</div>
                        <div className="text-amber-400 font-semibold">{achievement.rarity.toUpperCase()}</div>
                      </div>
                      <div>
                        <div className="text-zinc-500">Certificate ID</div>
                        <div className="text-cyan-400 font-mono text-xs">#ACH{achievement.id.slice(-6).toUpperCase()}</div>
                      </div>
                    </div>

                    <div className="text-xs text-zinc-500 text-center">
                      This certificate verifies achievement on VFIDE • Issued {new Date().toLocaleDateString()}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="bg-zinc-950 p-6 flex gap-3">
                    <button
                      onClick={() => generateCertificate(achievement)}
                      className="flex-1 px-4 py-3 bg-amber-400 text-zinc-950 rounded-lg hover:bg-amber-400 transition-colors font-semibold flex items-center justify-center gap-2"
                    >
                      <Download className="w-5 h-5" />
                      Download Certificate
                    </button>

                    <button className="flex-1 px-4 py-3 bg-zinc-800 border border-amber-400/30 text-zinc-100 rounded-lg hover:border-amber-400 transition-colors font-semibold flex items-center justify-center gap-2">
                      <Share2 className="w-5 h-5" />
                      Share
                    </button>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}

          {/* Metrics Tab */}
          {activeTab === 'metrics' && (
            <motion.div
              key="metrics"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-6">
                  <div className="text-cyan-400 text-3xl font-bold mb-2">
                    {shareMetricsData.reduce((sum, m) => sum + m.shares, 0)}
                  </div>
                  <div className="text-zinc-400 text-sm">Total Shares</div>
                </div>

                <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-6">
                  <div className="text-violet-400 text-3xl font-bold mb-2">
                    {shareMetricsData.reduce((sum, m) => sum + m.clicks, 0)}
                  </div>
                  <div className="text-zinc-400 text-sm">Total Clicks</div>
                </div>

                <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-6">
                  <div className="text-emerald-500 text-3xl font-bold mb-2">
                    {shareMetricsData.reduce((sum, m) => sum + m.conversions, 0)}
                  </div>
                  <div className="text-zinc-400 text-sm">Conversions</div>
                </div>

                <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-6">
                  <div className="text-pink-400 text-3xl font-bold mb-2">
                    {Math.round(
                      (shareMetricsData.reduce((sum, m) => sum + m.conversions, 0) /
                        shareMetricsData.reduce((sum, m) => sum + m.clicks, 0)) *
                        100,
                    )}
                    %
                  </div>
                  <div className="text-zinc-400 text-sm">Conversion Rate</div>
                </div>
              </div>

              <div className="space-y-4">
                {shareMetricsData.map((metric, idx) => {
                  const platformColors: Record<string, string> = {
                    twitter: 'from-[#1D9BF0]/20 border-sky-500/30',
                    linkedin: 'from-[#0A66C2]/20 border-blue-700/30',
                    email: 'from-[#EA4335]/20 border-red-500/30',
                    whatsapp: 'from-[#25D366]/20 border-green-500/30',
                    telegram: 'from-[#0088cc]/20 border-sky-600/30',
                    discord: 'from-[#5865F2]/20 border-indigo-500/30',
                  };

                  return (
                    <motion.div
                      key={metric.platform}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.1 }}
                      className={`bg-gradient-to-r ${platformColors[metric.platform]} border rounded-lg p-6`}
                    >
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-bold text-zinc-100 capitalize">{metric.platform}</h3>
                        <span className="text-2xl font-bold text-cyan-400">{metric.shares}</span>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <div className="text-xs text-zinc-400 mb-2">Clicks</div>
                          <div className="w-full bg-zinc-950 rounded h-2">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${Math.min((metric.clicks / 1000) * 100, 100)}%` }}
                              transition={{ duration: 1, delay: idx * 0.1 + 0.3 }}
                              className="bg-gradient-to-r from-violet-400 to-cyan-400 rounded h-full"
                            />
                          </div>
                          <div className="text-sm font-semibold text-zinc-100 mt-1">{metric.clicks}</div>
                        </div>

                        <div>
                          <div className="text-xs text-zinc-400 mb-2">Conversions</div>
                          <div className="w-full bg-zinc-950 rounded h-2">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${Math.min((metric.conversions / 50) * 100, 100)}%` }}
                              transition={{ duration: 1, delay: idx * 0.1 + 0.4 }}
                              className="bg-gradient-to-r from-emerald-500 to-cyan-400 rounded h-full"
                            />
                          </div>
                          <div className="text-sm font-semibold text-zinc-100 mt-1">{metric.conversions}</div>
                        </div>
                      </div>

                      <div className="mt-4 pt-4 border-t border-zinc-700 text-xs text-zinc-400">
                        Conversion Rate: {Math.round((metric.conversions / metric.clicks) * 100)}%
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default ShareSystem;

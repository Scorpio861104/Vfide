'use client';

import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Share2,
  Copy,
  CheckCircle2,
  Download,
  Mail,
  MessageCircle,
  Twitter,
  Linkedin,
} from 'lucide-react';

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

interface ReferralCard {
  code: string;
  link: string;
  expiresAt?: Date;
  uses: number;
  maxUses?: number;
  reward: number;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
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

// ==================== MOCK DATA ====================

const mockAchievements: ShareableAchievement[] = [
  {
    id: 'ach1',
    title: 'Governance Master',
    description: 'Participated in 50+ DAO proposals and helped shape the future of VFIDE',
    icon: '🗳️',
    rarity: 'rare',
    unlockedDate: new Date('2024-02-15'),
    shareUrl: 'vfide.app/share/ach_governance_master',
    qrCode: 'data:image/qr',
  },
  {
    id: 'ach2',
    title: 'Payment Pioneer',
    description: 'Processed 100+ transactions through VFIDE payment portal',
    icon: '💳',
    rarity: 'uncommon',
    unlockedDate: new Date('2024-01-20'),
    shareUrl: 'vfide.app/share/ach_payment_pioneer',
    qrCode: 'data:image/qr',
  },
  {
    id: 'ach3',
    title: 'Vault Master',
    description: 'Maintained 500k+ vault balance for 30+ consecutive days',
    icon: '🔒',
    rarity: 'epic',
    unlockedDate: new Date('2024-02-10'),
    shareUrl: 'vfide.app/share/ach_vault_master',
    qrCode: 'data:image/qr',
  },
];

const mockReferralCards: ReferralCard[] = [
  {
    code: 'ALICE2024',
    link: 'vfide.app/join?ref=ALICE2024',
    expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
    uses: 12,
    maxUses: 50,
    reward: 2500,
    tier: 'silver',
  },
  {
    code: 'ALEX_PRO',
    link: 'vfide.app/join?ref=ALEX_PRO',
    uses: 45,
    maxUses: 100,
    reward: 8500,
    tier: 'gold',
  },
];

const mockShareMetrics: ShareMetrics[] = [
  { platform: 'twitter', shares: 342, clicks: 1203, conversions: 28 },
  { platform: 'linkedin', shares: 156, clicks: 567, conversions: 34 },
  { platform: 'email', shares: 89, clicks: 345, conversions: 42 },
  { platform: 'whatsapp', shares: 203, clicks: 789, conversions: 19 },
];

// ==================== COMPONENTS ====================

interface ShareSystemProps {
  userId?: string;
  onShare?: (platform: string, content: string) => void;
}

export function ShareSystem({ userId: _userId = 'current_user', onShare }: ShareSystemProps) {
  const [activeTab, setActiveTab] = useState<'achievements' | 'referrals' | 'certificates' | 'metrics'>('achievements');
  const [selectedAchievement, setSelectedAchievement] = useState<ShareableAchievement | null>(null);
  const [_selectedReferral, _setSelectedReferral] = useState<ReferralCard | null>(null);
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [_showShareMenu, _setShowShareMenu] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [_showCertificateModal, _setShowCertificateModal] = useState(false);

  const handleCopyLink = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(type);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const handleShareToSocial = (platform: 'twitter' | 'linkedin' | 'email' | 'whatsapp', content: string) => {
    const shareUrls: Record<string, string> = {
      twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(content)}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent('vfide.app')}`,
      email: `mailto:?subject=Check out my VFIDE achievement&body=${encodeURIComponent(content)}`,
      whatsapp: `https://wa.me/?text=${encodeURIComponent(content)}`,
    };

    if (shareUrls[platform]) {
      window.open(shareUrls[platform], '_blank');
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
    { key: 'achievements', label: 'Achievements', icon: '🏆', count: mockAchievements.length },
    { key: 'referrals', label: 'Referrals', icon: '🤝', count: mockReferralCards.length },
    { key: 'certificates', label: 'Certificates', icon: '📜', count: mockAchievements.length },
    { key: 'metrics', label: 'Share Metrics', icon: '📊', count: undefined },
  ];

  return (
    <div className="min-h-screen bg-linear-to-b from-[#0A0A0F] via-[#1A1A2E] to-[#0A0A0F]">
      {/* Hidden Canvas for Certificate Generation */}
      <canvas ref={canvasRef} width={1200} height={800} style={{ display: 'none' }} />

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="sticky top-0 z-20 bg-[#0A0A0F]/80 backdrop-blur-xl border-b border-[#3A3A4F] px-4 md:px-8 py-6"
      >
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <Share2 className="w-8 h-8 text-[#00F0FF]" />
            <h1 className="text-3xl md:text-4xl font-bold text-[#F5F3E8]">Share Your Success</h1>
          </div>

          {/* Tab Navigation */}
          <div className="flex gap-2 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as typeof activeTab)}
                className={`px-4 py-2 rounded-lg font-semibold text-sm whitespace-nowrap transition-all flex items-center gap-2 ${
                  activeTab === tab.key
                    ? 'bg-[#00F0FF] text-[#0A0A0F]'
                    : 'bg-[#2A2A3E] text-[#A0A0A5] hover:bg-[#3A3A4F]'
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
                {mockAchievements.map((achievement, idx) => (
                  <motion.div
                    key={achievement.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: idx * 0.1 }}
                    className={`bg-linear-to-br rounded-lg p-6 border-2 transition-all group cursor-pointer ${
                      selectedAchievement?.id === achievement.id
                        ? 'border-[#00F0FF] from-[#00F0FF]/20 to-transparent'
                        : `border-${
                            achievement.rarity === 'legendary'
                              ? 'yellow'
                              : achievement.rarity === 'epic'
                                ? 'purple'
                                : achievement.rarity === 'rare'
                                  ? 'cyan'
                                  : 'gray'
                          }-500/30 from-[#1A1A2E] to-[#2A2A3E]`
                    }`}
                    onClick={() => setSelectedAchievement(achievement)}
                  >
                    <div className="text-6xl mb-4">{achievement.icon}</div>

                    <h3 className="text-xl font-bold text-[#F5F3E8] mb-2">{achievement.title}</h3>

                    <p className="text-[#A0A0A5] text-sm mb-4 line-clamp-2">{achievement.description}</p>

                    <div className="flex items-center justify-between mb-4">
                      <span
                        className={`text-xs font-bold px-3 py-1 rounded-full ${
                          achievement.rarity === 'legendary'
                            ? 'bg-yellow-500/20 text-yellow-400'
                            : achievement.rarity === 'epic'
                              ? 'bg-purple-500/20 text-purple-400'
                              : achievement.rarity === 'rare'
                                ? 'bg-[#00F0FF]/20 text-[#00F0FF]'
                                : 'bg-gray-500/20 text-gray-400'
                        }`}
                      >
                        {achievement.rarity.toUpperCase()}
                      </span>
                      <span className="text-xs text-[#6B6B78]">{achievement.unlockedDate.toLocaleDateString()}</span>
                    </div>

                    {selectedAchievement?.id === achievement.id && (
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-4 pt-4 border-t border-[#3A3A4F] space-y-3"
                      >
                        <div className="space-y-2">
                          <div className="flex items-center justify-between bg-[#0A0A0F] rounded px-3 py-2">
                            <code className="text-xs text-[#00F0FF] font-mono">{achievement.shareUrl}</code>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCopyLink(achievement.shareUrl, `achievement_${achievement.id}`);
                              }}
                              className="ml-2 p-1 hover:bg-[#2A2A3E] rounded transition-colors"
                            >
                              {copiedText === `achievement_${achievement.id}` ? (
                                <CheckCircle2 className="w-4 h-4 text-green-500" />
                              ) : (
                                <Copy className="w-4 h-4 text-[#A0A0A5]" />
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
                              className="p-2 bg-[#1D9BF0]/20 text-[#1D9BF0] rounded hover:bg-[#1D9BF0]/30 transition-colors flex items-center justify-center gap-1 text-xs font-semibold"
                            >
                              <Twitter className="w-4 h-4" />
                              Twitter
                            </button>

                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleShareToSocial('linkedin', `Unlocked: ${achievement.title}`);
                              }}
                              className="p-2 bg-[#0A66C2]/20 text-[#0A66C2] rounded hover:bg-[#0A66C2]/30 transition-colors flex items-center justify-center gap-1 text-xs font-semibold"
                            >
                              <Linkedin className="w-4 h-4" />
                              LinkedIn
                            </button>

                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                generateCertificate(achievement);
                              }}
                              className="p-2 bg-[#FFD700]/20 text-[#FFD700] rounded hover:bg-[#FFD700]/30 transition-colors flex items-center justify-center gap-1 text-xs font-semibold"
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

          {/* Referrals Tab */}
          {activeTab === 'referrals' && (
            <motion.div
              key="referrals"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              {mockReferralCards.map((referral, idx) => {
                const tierColors: Record<string, string> = {
                  bronze: 'from-amber-700 to-amber-900 border-amber-600',
                  silver: 'from-slate-400 to-slate-600 border-slate-500',
                  gold: 'from-yellow-400 to-yellow-600 border-yellow-500',
                  platinum: 'from-blue-300 to-blue-500 border-blue-400',
                };

                return (
                  <motion.div
                    key={referral.code}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    className={`bg-linear-to-r ${tierColors[referral.tier]} border-2 rounded-lg p-8 text-white`}
                  >
                    <div className="grid md:grid-cols-2 gap-8">
                      {/* Left: Referral Info */}
                      <div>
                        <div className="text-sm font-semibold opacity-80 mb-2">REFERRAL CODE</div>
                        <h3 className="text-3xl font-bold mb-4 font-mono">{referral.code}</h3>

                        <div className="space-y-3 mb-6">
                          <div>
                            <div className="text-xs opacity-75">Full Referral Link</div>
                            <code className="text-sm font-mono break-all">{referral.link}</code>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <div className="text-xs opacity-75">Uses</div>
                              <div className="text-2xl font-bold">
                                {referral.uses}
                                {referral.maxUses && <span className="text-sm">/{referral.maxUses}</span>}
                              </div>
                            </div>

                            <div>
                              <div className="text-xs opacity-75">Reward</div>
                              <div className="text-2xl font-bold">${referral.reward}</div>
                            </div>
                          </div>

                          {referral.expiresAt && (
                            <div>
                              <div className="text-xs opacity-75">Expires</div>
                              <div className="text-sm">{referral.expiresAt.toLocaleDateString()}</div>
                            </div>
                          )}
                        </div>

                        <div className="w-full bg-white/10 rounded h-2 mb-2">
                          <div
                            className="bg-white/30 rounded h-full"
                            style={{ width: `${(referral.uses / (referral.maxUses || 100)) * 100}%` }}
                          />
                        </div>
                        <div className="text-xs opacity-75">
                          {referral.maxUses ? Math.max(0, referral.maxUses - referral.uses) : '∞'} uses remaining
                        </div>
                      </div>

                      {/* Right: Share Buttons */}
                      <div className="flex flex-col justify-between">
                        <div>
                          <div className="text-sm font-semibold opacity-80 mb-4">SHARE YOUR CODE</div>

                          <div className="space-y-2">
                            {[
                              { platform: 'twitter', label: 'Twitter', icon: Twitter },
                              { platform: 'linkedin', label: 'LinkedIn', icon: Linkedin },
                              { platform: 'email', label: 'Email', icon: Mail },
                              { platform: 'whatsapp', label: 'WhatsApp', icon: MessageCircle },
                            ].map(({ platform, label, icon: Icon }) => (
                              <button
                                key={platform}
                                onClick={() =>
                                  handleShareToSocial(
                                    platform as any,
                                    `Join me on VFIDE! Use code ${referral.code} to get started: ${referral.link}`,
                                  )
                                }
                                className="w-full px-4 py-2 bg-white/20 hover:bg-white/30 rounded transition-colors flex items-center gap-2 font-semibold text-sm"
                              >
                                <Icon className="w-4 h-4" />
                                Share on {label}
                              </button>
                            ))}
                          </div>
                        </div>

                        <button
                          onClick={() => handleCopyLink(referral.link, `referral_${referral.code}`)}
                          className="w-full px-4 py-3 bg-white/30 hover:bg-white/40 rounded font-bold flex items-center justify-center gap-2 transition-colors"
                        >
                          {copiedText === `referral_${referral.code}` ? (
                            <>
                              <CheckCircle2 className="w-5 h-5" />
                              Copied!
                            </>
                          ) : (
                            <>
                              <Copy className="w-5 h-5" />
                              Copy Link
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
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
              {mockAchievements.map((achievement, idx) => (
                <motion.div
                  key={`cert_${achievement.id}`}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: idx * 0.1 }}
                  className="bg-linear-to-r from-[#FFD700]/10 via-[#1A1A2E] to-[#0A0A0F] border-2 border-[#FFD700]/30 rounded-lg overflow-hidden"
                >
                  {/* Certificate Preview */}
                  <div className="bg-[#1A1A2E] p-8 border-b border-[#FFD700]/20">
                    <div className="flex items-center justify-between mb-6">
                      <div>
                        <div className="text-[#FFD700] text-sm font-semibold mb-1">Certificate of Achievement</div>
                        <h3 className="text-2xl font-bold text-[#F5F3E8]">{achievement.title}</h3>
                      </div>
                      <div className="text-6xl">{achievement.icon}</div>
                    </div>

                    <p className="text-[#A0A0A5] mb-6">{achievement.description}</p>

                    <div className="grid grid-cols-3 gap-4 text-sm mb-6 pb-6 border-b border-[#3A3A4F]">
                      <div>
                        <div className="text-[#6B6B78]">Unlocked Date</div>
                        <div className="text-[#F5F3E8] font-semibold">{achievement.unlockedDate.toLocaleDateString()}</div>
                      </div>
                      <div>
                        <div className="text-[#6B6B78]">Rarity</div>
                        <div className="text-[#FFD700] font-semibold">{achievement.rarity.toUpperCase()}</div>
                      </div>
                      <div>
                        <div className="text-[#6B6B78]">Certificate ID</div>
                        <div className="text-[#00F0FF] font-mono text-xs">#ACH{achievement.id.slice(-6).toUpperCase()}</div>
                      </div>
                    </div>

                    <div className="text-xs text-[#6B6B78] text-center">
                      This certificate verifies achievement on VFIDE • Issued {new Date().toLocaleDateString()}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="bg-[#0A0A0F] p-6 flex gap-3">
                    <button
                      onClick={() => generateCertificate(achievement)}
                      className="flex-1 px-4 py-3 bg-[#FFD700] text-[#0A0A0F] rounded-lg hover:bg-[#FFC700] transition-colors font-semibold flex items-center justify-center gap-2"
                    >
                      <Download className="w-5 h-5" />
                      Download Certificate
                    </button>

                    <button className="flex-1 px-4 py-3 bg-[#2A2A3E] border border-[#FFD700]/30 text-[#F5F3E8] rounded-lg hover:border-[#FFD700] transition-colors font-semibold flex items-center justify-center gap-2">
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
                <div className="bg-[#1A1A2E] border border-[#3A3A4F] rounded-lg p-6">
                  <div className="text-[#00F0FF] text-3xl font-bold mb-2">
                    {mockShareMetrics.reduce((sum, m) => sum + m.shares, 0)}
                  </div>
                  <div className="text-[#A0A0A5] text-sm">Total Shares</div>
                </div>

                <div className="bg-[#1A1A2E] border border-[#3A3A4F] rounded-lg p-6">
                  <div className="text-[#A78BFA] text-3xl font-bold mb-2">
                    {mockShareMetrics.reduce((sum, m) => sum + m.clicks, 0)}
                  </div>
                  <div className="text-[#A0A0A5] text-sm">Total Clicks</div>
                </div>

                <div className="bg-[#1A1A2E] border border-[#3A3A4F] rounded-lg p-6">
                  <div className="text-[#50C878] text-3xl font-bold mb-2">
                    {mockShareMetrics.reduce((sum, m) => sum + m.conversions, 0)}
                  </div>
                  <div className="text-[#A0A0A5] text-sm">Conversions</div>
                </div>

                <div className="bg-[#1A1A2E] border border-[#3A3A4F] rounded-lg p-6">
                  <div className="text-[#FF6B9D] text-3xl font-bold mb-2">
                    {Math.round(
                      (mockShareMetrics.reduce((sum, m) => sum + m.conversions, 0) /
                        mockShareMetrics.reduce((sum, m) => sum + m.clicks, 0)) *
                        100,
                    )}
                    %
                  </div>
                  <div className="text-[#A0A0A5] text-sm">Conversion Rate</div>
                </div>
              </div>

              <div className="space-y-4">
                {mockShareMetrics.map((metric, idx) => {
                  const platformColors: Record<string, string> = {
                    twitter: 'from-[#1D9BF0]/20 border-[#1D9BF0]/30',
                    linkedin: 'from-[#0A66C2]/20 border-[#0A66C2]/30',
                    email: 'from-[#EA4335]/20 border-[#EA4335]/30',
                    whatsapp: 'from-[#25D366]/20 border-[#25D366]/30',
                    telegram: 'from-[#0088cc]/20 border-[#0088cc]/30',
                    discord: 'from-[#5865F2]/20 border-[#5865F2]/30',
                  };

                  return (
                    <motion.div
                      key={metric.platform}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.1 }}
                      className={`bg-linear-to-r ${platformColors[metric.platform]} border rounded-lg p-6`}
                    >
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-bold text-[#F5F3E8] capitalize">{metric.platform}</h3>
                        <span className="text-2xl font-bold text-[#00F0FF]">{metric.shares}</span>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <div className="text-xs text-[#A0A0A5] mb-2">Clicks</div>
                          <div className="w-full bg-[#0A0A0F] rounded h-2">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${Math.min((metric.clicks / 1000) * 100, 100)}%` }}
                              transition={{ duration: 1, delay: idx * 0.1 + 0.3 }}
                              className="bg-linear-to-r from-[#A78BFA] to-[#00F0FF] rounded h-full"
                            />
                          </div>
                          <div className="text-sm font-semibold text-[#F5F3E8] mt-1">{metric.clicks}</div>
                        </div>

                        <div>
                          <div className="text-xs text-[#A0A0A5] mb-2">Conversions</div>
                          <div className="w-full bg-[#0A0A0F] rounded h-2">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${Math.min((metric.conversions / 50) * 100, 100)}%` }}
                              transition={{ duration: 1, delay: idx * 0.1 + 0.4 }}
                              className="bg-linear-to-r from-[#50C878] to-[#00F0FF] rounded h-full"
                            />
                          </div>
                          <div className="text-sm font-semibold text-[#F5F3E8] mt-1">{metric.conversions}</div>
                        </div>
                      </div>

                      <div className="mt-4 pt-4 border-t border-[#3A3A4F] text-xs text-[#A0A0A5]">
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

'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Trophy, TrendingUp, Zap, Gift } from 'lucide-react';
import { Footer } from '@/components/layout/Footer';
import { PageWrapper } from '@/components/ui/PageLayout';
import { useAccount } from 'wagmi';
import { useGamification, ACHIEVEMENTS, LEVEL_PERKS } from '@/lib/gamification';
import { UserStatsWidget, AchievementsList } from '@/components/gamification/GamificationWidgets';
import { ConnectButton } from '@rainbow-me/rainbowkit';

export default function AchievementsPage() {
  const { address, isConnected } = useAccount();
  const { progress } = useGamification(address);
  const [activeTab, setActiveTab] = useState<'achievements' | 'perks' | 'stats'>('achievements');

  if (!isConnected || !address) {
    return (
      <>
        <PageWrapper variant="cosmic" showOrbs showGrid>
          <main className="pt-20 pb-20">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gradient-to-br from-zinc-900 to-zinc-950 border border-zinc-700 rounded-2xl p-8 md:p-12 text-center ring-effect"
              >
                <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
                  <Trophy className="w-10 h-10 text-zinc-950" />
                </div>
                <h2 className="text-3xl md:text-4xl font-bold text-zinc-100 mb-4">
                  View Your Achievements
                </h2>
                <p className="text-lg text-zinc-400 mb-8 max-w-2xl mx-auto">
                  Connect your wallet to track your progress, unlock achievements, and level up in the VFIDE ecosystem.
                </p>
                <div className="flex justify-center">
                  <ConnectButton />
                </div>
              </motion.div>
            </div>
          </main>
          <Footer />
        </PageWrapper>
      </>
    );
  }

  return (
    <>
      <PageWrapper variant="cosmic" showOrbs showGrid>
        <main className="pt-20 pb-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {/* Header */}
            <motion.section
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-8"
            >
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <h1 className="text-3xl md:text-5xl font-bold text-zinc-100 mb-2 md:mb-3 flex items-center gap-2 md:gap-3">
                    <Trophy className="w-8 h-8 md:w-10 md:h-10 text-amber-400" />
                    Achievements
                  </h1>
                  <p className="text-zinc-400 text-sm md:text-lg flex items-center gap-2">
                    <Zap className="w-3 h-3 md:w-4 md:h-4 text-cyan-400" />
                    Track your progress and unlock rewards
                  </p>
                  <div
                    className="flex flex-wrap gap-2 text-xs uppercase tracking-[0.2em] text-zinc-500 mt-3"
                    aria-label="Achievement progression: Play, then Progress, then Reward"
                  >
                    <span>Play</span>
                    <span className="text-amber-400">→</span>
                    <span>Progress</span>
                    <span className="text-amber-400">→</span>
                    <span>Reward</span>
                  </div>
                </div>
              </div>
            </motion.section>

            {/* Tabs */}
            <div className="flex gap-2 mb-6 flex-wrap">
              <button
                onClick={() => setActiveTab('achievements')}
                className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                  activeTab === 'achievements'
                    ? 'bg-gradient-to-r from-cyan-400 to-violet-400 text-zinc-950'
                    : 'bg-zinc-900 text-zinc-400 hover:text-zinc-100'
                }`}
              >
                <Trophy className="w-4 h-4 inline mr-2" />
                Achievements
              </button>
              <button
                onClick={() => setActiveTab('perks')}
                className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                  activeTab === 'perks'
                    ? 'bg-gradient-to-r from-amber-400 to-orange-500 text-zinc-950'
                    : 'bg-zinc-900 text-zinc-400 hover:text-zinc-100'
                }`}
              >
                <Gift className="w-4 h-4 inline mr-2" />
                Level Perks
              </button>
              <button
                onClick={() => setActiveTab('stats')}
                className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                  activeTab === 'stats'
                    ? 'bg-gradient-to-r from-cyan-400 to-violet-400 text-zinc-950'
                    : 'bg-zinc-900 text-zinc-400 hover:text-zinc-100'
                }`}
              >
                <TrendingUp className="w-4 h-4 inline mr-2" />
                Stats
              </button>
            </div>

            <div className="grid lg:grid-cols-3 gap-6">
              {/* Sidebar - User Stats */}
              <div className="lg:col-span-1">
                <UserStatsWidget userAddress={address} />
                
                {/* Quick Stats */}
                {progress && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="mt-4 bg-zinc-900 border border-zinc-700 rounded-xl p-4"
                  >
                    <h3 className="text-lg font-bold text-zinc-100 mb-4">Activity Stats</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-zinc-400">Messages Sent</span>
                        <span className="text-sm font-bold text-zinc-100">{progress.stats.messagesSent}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-zinc-400">Friends Added</span>
                        <span className="text-sm font-bold text-zinc-100">{progress.stats.friendsAdded}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-zinc-400">Groups Created</span>
                        <span className="text-sm font-bold text-zinc-100">{progress.stats.groupsCreated}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-zinc-400">Payments Sent</span>
                        <span className="text-sm font-bold text-zinc-100">{progress.stats.paymentsSent}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-zinc-400">Days Active</span>
                        <span className="text-sm font-bold text-zinc-100">{progress.stats.daysActive}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-zinc-400">Longest Streak</span>
                        <span className="text-sm font-bold text-orange-400">{progress.stats.longestStreak}🔥</span>
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>

              {/* Main Content */}
              <div className="lg:col-span-2">
                {activeTab === 'achievements' && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
                    <AchievementsList userAddress={address} />
                  </motion.div>
                )}

                {activeTab === 'perks' && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="space-y-4"
                  >
                    <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-6 mb-4">
                      <h3 className="text-xl font-bold text-zinc-100 mb-2">Level Perks</h3>
                      <p className="text-sm text-zinc-400">
                        Every level you earn unlocks real platform benefits — fee discounts, governance voting weight, and feature access. 
                        These perks are yours because of <span className="text-cyan-400 font-semibold">your own activity</span>, not investment returns.
                      </p>
                      {progress && (
                        <div className="mt-3 flex items-center gap-2 text-sm">
                          <Zap className="w-4 h-4 text-amber-400" />
                          <span className="text-zinc-400">You are currently <span className="text-amber-400 font-bold">Level {progress.level}</span></span>
                        </div>
                      )}
                    </div>

                    <div className="space-y-3">
                      {LEVEL_PERKS.map((perk, idx) => {
                        const unlocked = progress ? progress.level >= perk.level : false;
                        const categoryColors: Record<string, string> = {
                          fee: 'border-emerald-500/40 bg-emerald-500/5',
                          governance: 'border-violet-500/40 bg-violet-500/5',
                          feature: 'border-cyan-500/40 bg-cyan-500/5',
                          status: 'border-amber-400/40 bg-amber-400/5',
                        };
                        const categoryLabels: Record<string, string> = {
                          fee: 'Fee Discount',
                          governance: 'Governance',
                          feature: 'Feature Access',
                          status: 'Status',
                        };
                        return (
                          <motion.div
                            key={idx}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.04 }}
                            className={`flex items-center gap-4 rounded-xl border p-4 transition-all ${
                              unlocked
                                ? categoryColors[perk.category]
                                : 'border-zinc-800 bg-zinc-950 opacity-50'
                            }`}
                          >
                            <div className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-xl ${
                              unlocked ? 'bg-zinc-900' : 'bg-zinc-900 grayscale'
                            }`}>
                              {perk.icon}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className={`font-bold text-sm ${unlocked ? 'text-zinc-100' : 'text-zinc-500'}`}>
                                  {perk.title}
                                </span>
                                <span className={`text-xs px-2 py-0.5 rounded-full ${
                                  unlocked ? 'bg-zinc-800 text-zinc-300' : 'bg-zinc-900 text-zinc-600'
                                }`}>
                                  {categoryLabels[perk.category]}
                                </span>
                              </div>
                              <p className={`text-xs mt-0.5 ${unlocked ? 'text-zinc-400' : 'text-zinc-600'}`}>
                                {perk.description}
                              </p>
                            </div>
                            <div className="shrink-0 text-right">
                              <div className={`text-xs font-bold mb-0.5 ${unlocked ? 'text-amber-400' : 'text-zinc-600'}`}>
                                Level {perk.level}
                              </div>
                              {unlocked ? (
                                <span className="text-xs text-emerald-400 font-semibold">✓ Unlocked</span>
                              ) : (
                                <span className="text-xs text-zinc-600">Locked</span>
                              )}
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>

                    <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-4 text-sm text-zinc-400">
                      <div className="flex items-start gap-2">
                        <span className="text-amber-400 shrink-0 mt-0.5">ℹ️</span>
                        <span>
                          Level perks are earned through <strong className="text-zinc-200">your own platform activity</strong> — 
                          completing quests, maintaining streaks, sending messages, and participating in governance. 
                          They are utility benefits, not investment returns.
                        </span>
                      </div>
                    </div>
                  </motion.div>
                )}

                {activeTab === 'stats' && progress && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="space-y-4"
                  >
                    <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-6">
                      <h3 className="text-xl font-bold text-zinc-100 mb-6">Your Progress</h3>
                      
                      {/* Level Progress */}
                      <div className="mb-6">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm text-zinc-400">Level Progress</span>
                          <span className="text-sm font-semibold text-cyan-400">
                            Level {progress.level}
                          </span>
                        </div>
                        <div className="h-3 bg-zinc-950 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-cyan-400 to-violet-400"
                            style={{ width: `${progress.xpToNextLevel > 0 ? ((progress.xp / (progress.xp + progress.xpToNextLevel)) * 100) : 100}%` }}
                          />
                        </div>
                      </div>

                      {/* Achievement Completion */}
                      <div className="mb-6">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm text-zinc-400">Achievements</span>
                          <span className="text-sm font-semibold text-amber-400">
                            {progress.achievements.length}/{Object.keys(ACHIEVEMENTS).length}
                          </span>
                        </div>
                        <div className="h-3 bg-zinc-950 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-amber-400 to-orange-500"
                            style={{ width: `${(progress.achievements.length / Object.keys(ACHIEVEMENTS).length) * 100}%` }}
                          />
                        </div>
                      </div>

                      {/* Category Breakdown */}
                      <div>
                        <h4 className="text-sm font-semibold text-zinc-100 mb-3">Category Breakdown</h4>
                        <div className="space-y-2">
                          {['social', 'vault', 'engagement', 'milestone'].map(category => {
                            const categoryAchievements = Object.values(ACHIEVEMENTS).filter(a => a.category === category);
                            const unlocked = categoryAchievements.filter(a => progress.achievements.includes(a.id)).length;
                            
                            return (
                              <div key={category} className="flex items-center justify-between">
                                <span className="text-sm text-zinc-400 capitalize">{category}</span>
                                <span className="text-sm text-zinc-100">
                                  {unlocked}/{categoryAchievements.length}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </PageWrapper>
    </>
  );
}

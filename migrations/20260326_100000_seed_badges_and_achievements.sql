-- Migration: Seed all 28 on-chain badge definitions and achievement milestones
-- Created: 2026-03-26T10:00:00.000Z
--
-- Adds:
--   1. badge_key column to badges table (referenced by achievement claim route)
--   2. All 28 badge definitions matching BadgeRegistry.sol
--   3. Core achievement_milestones seeded with badge rewards

BEGIN;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Add badge_key to badges table (used by achievement claim route)
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE badges ADD COLUMN IF NOT EXISTS badge_key VARCHAR(100);
CREATE UNIQUE INDEX IF NOT EXISTS idx_badges_badge_key ON badges (badge_key) WHERE badge_key IS NOT NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Seed all 28 badge definitions (matches BadgeRegistry.sol + lib/badge-registry.ts)
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO badges (badge_type, badge_key, badge_name, name, description, icon, rarity, requirements) VALUES
  -- Pioneer & Foundation
  ('on_chain', 'PIONEER',              'Pioneer',              'Pioneer',              'First 10,000 users who joined VFIDE',                                    '🏁',    'legendary', '{"points":30,"permanent":true,"requirement":"First 10,000 users"}'),
  ('on_chain', 'FOUNDING_MEMBER',      'Founding Member',      'Founding Member',      'Among the first 1,000 to reach 800+ ProofScore',                          '👑',    'legendary', '{"points":50,"permanent":true,"requirement":"First 1,000 to reach 800+ ProofScore"}'),
  ('on_chain', 'EARLY_TESTER',         'Early Tester',         'Early Tester',         'Participated in testnet before mainnet launch',                            '🔬',    'rare',      '{"points":25,"permanent":true,"requirement":"Testnet participation before mainnet"}'),

  -- Activity & Participation
  ('on_chain', 'ACTIVE_TRADER',        'Active Trader',        'Active Trader',        '50+ commerce transactions in 90 days',                                    '📊',    'uncommon',  '{"points":20,"duration_days":90,"requirement":"50+ transactions in 90 days"}'),
  ('on_chain', 'GOVERNANCE_VOTER',     'Governance Voter',     'Governance Voter',     'Voted on 10+ DAO proposals',                                              '🗳️',   'uncommon',  '{"points":25,"duration_days":180,"requirement":"10+ governance votes"}'),
  ('on_chain', 'POWER_USER',           'Power User',           'Power User',           'Engaged in 3+ different ecosystem features',                              '⚡',    'rare',      '{"points":40,"duration_days":90,"requirement":"3+ activity types"}'),
  ('on_chain', 'DAILY_CHAMPION',       'Daily Champion',       'Daily Champion',       '30 consecutive days of activity',                                         '🔥',    'common',    '{"points":15,"duration_days":30,"requirement":"30-day streak"}'),

  -- Trust & Community
  ('on_chain', 'TRUSTED_ENDORSER',     'Trusted Endorser',     'Trusted Endorser',     '5+ endorsements of users who maintained >700 ProofScore',                 '🤝',    'rare',      '{"points":30,"permanent":true,"requirement":"5+ quality endorsements"}'),
  ('on_chain', 'COMMUNITY_BUILDER',    'Community Builder',    'Community Builder',    'Recruited 10 users who each reached 600+ ProofScore',                     '🏗️',   'epic',      '{"points":35,"permanent":true,"requirement":"10 qualified referrals"}'),
  ('on_chain', 'PEACEMAKER',           'Peacemaker',           'Peacemaker',           'Resolved 3+ disputes through mediation',                                  '☮️',   'rare',      '{"points":25,"permanent":true,"requirement":"3+ successful mediations"}'),
  ('on_chain', 'MENTOR',               'Mentor',               'Mentor',               'Helped 5+ new users reach 540+ ProofScore',                               '🎓',    'rare',      '{"points":30,"duration_days":365,"requirement":"5 users mentored to 540+ score"}'),

  -- Commerce & Merchants
  ('on_chain', 'VERIFIED_MERCHANT',    'Verified Merchant',    'Verified Merchant',    '100+ successful transactions with zero disputes and 700+ ProofScore',      '✅',    'rare',      '{"points":40,"duration_days":365,"requirement":"100+ transactions, 0 disputes, 700+ score"}'),
  ('on_chain', 'ELITE_MERCHANT',       'Elite Merchant',       'Elite Merchant',       '1,000+ transactions, $100k+ volume, 4.8+ rating',                         '⭐',    'epic',      '{"points":60,"duration_days":180,"requirement":"1,000+ txs, $100k volume, 4.8 rating"}'),
  ('on_chain', 'INSTANT_SETTLEMENT',   'Instant Settlement',   'Instant Settlement',   'Qualifies for instant merchant rebates — 800+ ProofScore',                 '⚡💰',  'rare',      '{"points":20,"duration_days":90,"requirement":"800+ ProofScore as active merchant"}'),
  ('on_chain', 'ZERO_DISPUTE',         'Zero Dispute',         'Zero Dispute',         '200+ transactions with zero disputes',                                    '🛡️',   'rare',      '{"points":25,"duration_days":180,"requirement":"200+ transactions with 0 disputes"}'),

  -- Security & Integrity
  ('on_chain', 'FRAUD_HUNTER',         'Fraud Hunter',         'Fraud Hunter',         'Reported 3+ confirmed fraud cases protecting the community',               '🕵️',   'epic',      '{"points":50,"permanent":true,"requirement":"3+ confirmed fraud reports"}'),
  ('on_chain', 'CLEAN_RECORD',         'Clean Record',         'Clean Record',         '1 year with zero negative events',                                        '📜',    'common',    '{"points":20,"duration_days":365,"requirement":"365 days no punishments/disputes"}'),
  ('on_chain', 'REDEMPTION',           'Redemption',           'Redemption',           'Recovered from past mistakes through 6+ months of good behavior',          '🌟',    'rare',      '{"points":30,"permanent":true,"requirement":"6+ months good behavior after penalty"}'),
  ('on_chain', 'GUARDIAN',             'Guardian',             'Guardian',             'ProofScore never dropped below 700 for 2+ years',                         '🛡️👁️', 'epic',     '{"points":40,"permanent":true,"requirement":"2+ years above 700 ProofScore"}'),

  -- Achievements & Milestones
  ('on_chain', 'ELITE_ACHIEVER',       'Elite Achiever',       'Elite Achiever',       'Reached ProofScore 900+ (top 5%)',                                        '🏆',    'epic',      '{"points":50,"permanent":true,"requirement":"ProofScore 900+"}'),
  ('on_chain', 'CENTURY_ENDORSER',     'Century Endorser',     'Century Endorser',     'Received 100+ endorsements from the community',                           '💯',    'epic',      '{"points":35,"permanent":true,"requirement":"100+ endorsements received"}'),
  ('on_chain', 'WHALE_SLAYER',         'Whale Slayer',         'Whale Slayer',         'Won a DAO vote against a whale with 10x your token holdings',              '🐋⚔️', 'epic',      '{"points":25,"permanent":true,"requirement":"Win DAO vote vs 10x whale"}'),
  ('on_chain', 'DIVERSIFICATION_MASTER','Diversification Master','Diversification Master','Used all VFIDE ecosystem features',                                    '🎯',    'rare',      '{"points":30,"permanent":true,"requirement":"Use all features: DAO, commerce, vault, badges"}'),

  -- Education & Contribution
  ('on_chain', 'EDUCATOR',             'Educator',             'Educator',             'Created 5+ educational content pieces',                                   '👨‍🏫', 'rare',     '{"points":30,"duration_days":180,"requirement":"5+ DAO-approved guides or videos"}'),
  ('on_chain', 'CONTRIBUTOR',          'Contributor',          'Contributor',          'Made a meaningful code, design, or content contribution to VFIDE',         '💻',    'epic',      '{"points":40,"permanent":true,"requirement":"GitHub PR merged or DAO-approved contribution"}'),
  ('on_chain', 'BUG_BOUNTY',           'Bug Bounty',           'Bug Bounty',           'Reported a security vulnerability (20–100 points by severity)',            '🐛',    'epic',      '{"points":50,"permanent":true,"requirement":"Report confirmed security vulnerability"}'),
  ('on_chain', 'TRANSLATOR',           'Translator',           'Translator',           'Translated VFIDE docs/UI to a new language',                              '🌐',    'rare',      '{"points":25,"permanent":true,"requirement":"Complete translation package for new language"}'),

  -- Headhunter Competition
  ('on_chain', 'HEADHUNTER',           'Headhunter',           'Headhunter',           'Top 20 quarterly recruiter — governance badge with +25% voting weight and proposal rights', '🎯', 'epic', '{"points":35,"duration_days":90,"requirement":"Top 20 on quarterly recruiter leaderboard"}')

ON CONFLICT DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Seed core achievement milestones with badge rewards
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO achievement_milestones
  (milestone_key, title, description, category, requirement_type, requirement_value, reward_xp, reward_vfide, reward_badge, icon, rarity)
VALUES
  -- Commerce milestones
  ('commerce:first_tx',       'First Transaction',        'Complete your first commerce transaction',                         'commerce',     'count', 1,    50,  0, 'ACTIVE_TRADER',    '💸', 'common'),
  ('commerce:tx_10',          'Getting Active',           'Complete 10 commerce transactions',                               'commerce',     'count', 10,   100, 0, NULL,               '📈', 'common'),
  ('commerce:tx_50',          'Active Trader',            'Complete 50 commerce transactions in 90 days',                    'commerce',     'count', 50,   250, 0, 'ACTIVE_TRADER',    '📊', 'uncommon'),
  ('commerce:tx_200',         'Zero Dispute Master',      'Reach 200 transactions with zero disputes',                       'commerce',     'count', 200,  500, 0, 'ZERO_DISPUTE',     '🛡️', 'rare'),
  ('commerce:merchant_100',   'Verified Merchant',        'Complete 100 successful merchant transactions',                   'commerce',     'count', 100,  400, 0, 'VERIFIED_MERCHANT','✅', 'rare'),

  -- Governance milestones
  ('governance:first_vote',   'First Vote',               'Cast your first governance vote',                                 'governance',   'count', 1,    75,  0, NULL,               '🗳️', 'common'),
  ('governance:votes_10',     'Governance Voter',         'Vote on 10 DAO proposals',                                        'governance',   'count', 10,   200, 0, 'GOVERNANCE_VOTER', '🗳️', 'uncommon'),
  ('governance:votes_50',     'Democracy Champion',       'Vote on 50 DAO proposals',                                        'governance',   'count', 50,   500, 0, 'GOVERNANCE_VOTER', '🏛️', 'rare'),

  -- Streak milestones
  ('streak:days_7',           '7-Day Streak',             'Log activity 7 days in a row',                                    'streaks',      'days',  7,    70,  0, NULL,               '🔥', 'common'),
  ('streak:days_30',          'Daily Champion',           'Maintain activity for 30 consecutive days',                       'streaks',      'days',  30,   300, 0, 'DAILY_CHAMPION',   '🔥', 'uncommon'),
  ('streak:days_100',         'Century of Days',          'Log activity 100 days in a row',                                  'streaks',      'days',  100,  1000,0, NULL,               '📅', 'rare'),

  -- Trust & Community milestones
  ('social:first_endorse',    'First Endorsement',        'Give your first endorsement to another user',                     'social',       'count', 1,    50,  0, NULL,               '🤝', 'common'),
  ('social:endorsements_5',   'Trusted Endorser',         'Give 5 quality endorsements to high-trust users',                 'social',       'count', 5,    200, 0, 'TRUSTED_ENDORSER', '🤝', 'rare'),
  ('social:endorse_received_100', 'Century Endorser',     'Receive 100 endorsements from the community',                     'social',       'count', 100,  500, 0, 'CENTURY_ENDORSER', '💯', 'epic'),
  ('referral:qualified_5',    'Mentor',                   'Help 5 new users reach 540+ ProofScore',                          'referral',     'count', 5,    400, 0, 'MENTOR',           '🎓', 'rare'),
  ('referral:qualified_10',   'Community Builder',        'Recruit 10 users who reach 600+ ProofScore',                      'referral',     'count', 10,   700, 0, 'COMMUNITY_BUILDER','🏗️', 'epic'),

  -- Security milestones
  ('security:fraud_report_1', 'Fraud Spotter',            'Report your first confirmed fraud case',                          'security',     'count', 1,    200, 0, NULL,               '🕵️', 'uncommon'),
  ('security:fraud_report_3', 'Fraud Hunter',             'Report 3 confirmed fraud cases',                                  'security',     'count', 3,    500, 0, 'FRAUD_HUNTER',     '🕵️', 'epic'),
  ('security:clean_365',      'Clean Record',             'Maintain zero negative events for 365 days',                      'security',     'days',  365,  300, 0, 'CLEAN_RECORD',     '📜', 'uncommon'),

  -- Achievement milestones
  ('score:elite_achiever',    'Elite Achiever',           'Reach ProofScore 900+ (top 5%)',                                  'achievement',  'score', 9000, 1000,0, 'ELITE_ACHIEVER',   '🏆', 'epic'),

  -- Education milestones
  ('education:content_1',     'First Contribution',       'Create your first educational content piece',                     'education',    'count', 1,    150, 0, NULL,               '📝', 'common'),
  ('education:content_5',     'Educator',                 'Create 5 educational content pieces (DAO approved)',              'education',    'count', 5,    400, 0, 'EDUCATOR',         '👨‍🏫','rare'),
  ('education:translator',    'Translator',               'Complete a translation package for a new language',               'education',    'count', 1,    300, 0, 'TRANSLATOR',       '🌐', 'rare'),
  ('education:contributor',   'Contributor',              'Get a code/design/content contribution accepted by the DAO',      'education',    'count', 1,    500, 0, 'CONTRIBUTOR',      '💻', 'epic'),

  -- Onboarding milestones
  ('onboarding:complete',     'Onboarding Complete',      'Complete all 10 onboarding steps',                                'onboarding',   'count', 10,   200, 0, NULL,               '🎉', 'common'),
  ('onboarding:power_user',   'Power User',               'Use 3+ different ecosystem features',                             'onboarding',   'count', 3,    300, 0, 'POWER_USER',       '⚡', 'rare'),

  -- Headhunter milestones
  ('headhunter:top20',        'Headhunter',               'Finish in the top 20 on the quarterly recruiter leaderboard',     'headhunter',   'rank',  20,   750, 0, 'HEADHUNTER',       '🎯', 'epic')

ON CONFLICT (milestone_key) DO NOTHING;

COMMIT;

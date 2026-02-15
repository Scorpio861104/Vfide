-- Testnet social seed data (Base Sepolia)
-- Safe to run multiple times (idempotent inserts)

-- Users
INSERT INTO users (wallet_address, username, display_name, avatar_url, bio, proof_score, is_verified)
VALUES
  ('0x1111111111111111111111111111111111111111', 'luna', 'Luna Tech', '🌙', 'Protocol engineer building on VFIDE', 7200, TRUE),
  ('0x2222222222222222222222222222222222222222', 'kate', 'Crypto Kate', '👑', 'Payments ops and community growth', 6800, TRUE),
  ('0x3333333333333333333333333333333333333333', 'felix', 'Felix Dev', '🦊', 'Smart contract developer', 6500, FALSE),
  ('0x4444444444444444444444444444444444444444', 'sara', 'Sara Chen', '👩‍🎤', 'Merchant success lead', 7000, TRUE),
  ('0x5555555555555555555555555555555555555555', 'alex', 'Alex Rivera', '👨‍💼', 'DeFi strategist and governance participant', 7600, TRUE)
ON CONFLICT (wallet_address) DO NOTHING;

-- Badges
INSERT INTO badges (name, description, icon, rarity, requirements)
VALUES
  ('Community Builder', 'Active contributor in social and governance', '🏗️', 'rare', '{"type":"activity"}'),
  ('Payment Pioneer', 'Processed multiple merchant payments', '💳', 'uncommon', '{"type":"payments"}'),
  ('Vault Guardian', 'Secured a vault with guardians', '🛡️', 'common', '{"type":"security"}')
ON CONFLICT DO NOTHING;

-- User badges
INSERT INTO user_badges (user_id, badge_id)
SELECT u.id, b.id
FROM users u
JOIN badges b ON b.name = 'Community Builder'
WHERE u.wallet_address IN ('0x1111111111111111111111111111111111111111', '0x5555555555555555555555555555555555555555')
ON CONFLICT DO NOTHING;

INSERT INTO user_badges (user_id, badge_id)
SELECT u.id, b.id
FROM users u
JOIN badges b ON b.name = 'Payment Pioneer'
WHERE u.wallet_address = '0x4444444444444444444444444444444444444444'
ON CONFLICT DO NOTHING;

-- Friendships
INSERT INTO friendships (user_id, friend_id, status)
SELECT u1.id, u2.id, 'accepted'
FROM users u1
JOIN users u2 ON u2.wallet_address = '0x2222222222222222222222222222222222222222'
WHERE u1.wallet_address = '0x1111111111111111111111111111111111111111'
ON CONFLICT DO NOTHING;

INSERT INTO friendships (user_id, friend_id, status)
SELECT u1.id, u2.id, 'pending'
FROM users u1
JOIN users u2 ON u2.wallet_address = '0x3333333333333333333333333333333333333333'
WHERE u1.wallet_address = '0x1111111111111111111111111111111111111111'
ON CONFLICT DO NOTHING;

INSERT INTO friendships (user_id, friend_id, status)
SELECT u1.id, u2.id, 'accepted'
FROM users u1
JOIN users u2 ON u2.wallet_address = '0x5555555555555555555555555555555555555555'
WHERE u1.wallet_address = '0x4444444444444444444444444444444444444444'
ON CONFLICT DO NOTHING;

-- Messages
INSERT INTO messages (sender_id, recipient_id, content, is_read)
SELECT s.id, r.id, 'Welcome to VFIDE! Let’s build together.', TRUE
FROM users s
JOIN users r ON r.wallet_address = '0x1111111111111111111111111111111111111111'
WHERE s.wallet_address = '0x2222222222222222222222222222222222222222'
ON CONFLICT DO NOTHING;

INSERT INTO messages (sender_id, recipient_id, content, is_read)
SELECT s.id, r.id, 'Merchant portal looks great. Let’s sync.', FALSE
FROM users s
JOIN users r ON r.wallet_address = '0x4444444444444444444444444444444444444444'
WHERE s.wallet_address = '0x5555555555555555555555555555555555555555'
ON CONFLICT DO NOTHING;

-- Activities (social posts)
INSERT INTO activities (user_id, type, activity_type, title, description, data, created_at)
SELECT u.id,
       'social',
       'social_post',
       'Community Post',
       'Shared update',
       jsonb_build_object(
         'content', 'Shipping today: live payments + social feed improvements. 🚀',
         'tags', jsonb_build_array('#vfide', '#build'),
         'likes', 12,
         'comments', 3,
         'shares', 1,
         'views', 120
       ),
       NOW() - INTERVAL '2 hours'
FROM users u WHERE u.wallet_address = '0x1111111111111111111111111111111111111111';

INSERT INTO activities (user_id, type, activity_type, title, description, data, created_at)
SELECT u.id,
       'social',
       'social_post',
       'Community Post',
       'Shared update',
       jsonb_build_object(
         'content', 'New merchant payouts settling instantly on Base Sepolia. ✅',
         'tags', jsonb_build_array('#payments', '#merchant'),
         'likes', 8,
         'comments', 1,
         'shares', 0,
         'views', 80
       ),
       NOW() - INTERVAL '5 hours'
FROM users u WHERE u.wallet_address = '0x4444444444444444444444444444444444444444';

INSERT INTO activities (user_id, type, activity_type, title, description, data, created_at)
SELECT u.id,
       'social',
       'social_post',
       'Community Post',
       'Shared update',
       jsonb_build_object(
         'content', 'Governance proposal draft: reduced fees for high ProofScore merchants.',
         'tags', jsonb_build_array('#governance', '#proofscore'),
         'likes', 15,
         'comments', 4,
         'shares', 2,
         'views', 200
       ),
       NOW() - INTERVAL '1 day'
FROM users u WHERE u.wallet_address = '0x5555555555555555555555555555555555555555';

-- Stories
INSERT INTO activities (user_id, type, activity_type, title, description, data, created_at)
SELECT u.id,
       'social',
       'social_story',
       'Story',
       NULL,
       jsonb_build_object(
         'type', 'text',
         'content', 'Testing VFIDE social on Base Sepolia—everything works like mainnet.',
         'backgroundColor', '#0F172A',
         'textColor', '#E2E8F0'
       ),
       NOW() - INTERVAL '3 hours'
FROM users u WHERE u.wallet_address = '0x2222222222222222222222222222222222222222';

-- Notifications
INSERT INTO notifications (user_id, type, title, message, data)
SELECT u.id,
       'social',
       'New Follower',
       'You have a new follower on VFIDE.',
       jsonb_build_object('href', '/social-hub', 'priority', 'medium')
FROM users u WHERE u.wallet_address = '0x1111111111111111111111111111111111111111'
ON CONFLICT DO NOTHING;

-- Presence
INSERT INTO user_presence (user_id, status, last_seen_at, last_activity_at)
SELECT u.id, 'online', NOW(), NOW()
FROM users u
WHERE u.wallet_address IN (
  '0x1111111111111111111111111111111111111111',
  '0x2222222222222222222222222222222222222222',
  '0x4444444444444444444444444444444444444444'
)
ON CONFLICT (user_id) DO UPDATE
SET status = EXCLUDED.status,
    last_seen_at = EXCLUDED.last_seen_at,
    last_activity_at = EXCLUDED.last_activity_at;

-- Seed Data for Extended Tables
-- Run this after seed-data.sql

-- Insert Groups
INSERT INTO groups (name, description, creator_id, avatar_url, is_private, member_count) VALUES
('DAO Contributors', 'Main contributor group for the Vfide DAO', 1, 'https://api.dicebear.com/7.x/shapes/svg?seed=dao', false, 8),
('Council Members', 'Private group for council coordination', 2, 'https://api.dicebear.com/7.x/shapes/svg?seed=council', true, 5),
('DeFi Enthusiasts', 'Discussion about DeFi and trading', 3, 'https://api.dicebear.com/7.x/shapes/svg?seed=defi', false, 12),
('NFT Collectors', 'Share and discuss NFT collections', 6, 'https://api.dicebear.com/7.x/shapes/svg?seed=nft', false, 7);

-- Insert Group Members
INSERT INTO group_members (group_id, user_id, role) VALUES
(1, 1, 'admin'),
(1, 2, 'moderator'),
(1, 3, 'member'),
(1, 4, 'member'),
(1, 5, 'member'),
(1, 6, 'member'),
(1, 7, 'member'),
(1, 8, 'member'),
(2, 2, 'admin'),
(2, 4, 'member'),
(2, 7, 'member'),
(2, 9, 'member'),
(2, 12, 'member'),
(3, 3, 'admin'),
(3, 1, 'member'),
(3, 5, 'member'),
(3, 8, 'member'),
(3, 10, 'member'),
(3, 11, 'member'),
(4, 6, 'admin'),
(4, 2, 'member'),
(4, 8, 'member'),
(4, 13, 'member'),
(4, 14, 'member');

-- Insert Group Invites
INSERT INTO group_invites (group_id, code, created_by, expires_at, max_uses, current_uses, description) VALUES
(1, 'JOIN_DAO_2024', 1, NOW() + INTERVAL '30 days', 100, 8, 'Join the main DAO contributor group'),
(3, 'DEFI_TALK_XYZ', 3, NOW() + INTERVAL '7 days', 50, 12, 'DeFi discussion invite'),
(4, 'NFT_GANG_ABC', 6, NULL, NULL, 7, 'NFT collectors unlimited invite');

-- Insert Gamification Data
INSERT INTO user_gamification (user_id, level, xp, total_xp, messages_sent, friends_added, groups_created, payments_sent, days_active, current_streak, longest_streak, last_active_date) VALUES
(1, 12, 350, 2350, 145, 8, 2, 23, 45, 7, 15, CURRENT_DATE),
(2, 15, 750, 3750, 234, 12, 1, 67, 62, 12, 18, CURRENT_DATE),
(3, 10, 200, 1700, 98, 6, 3, 15, 34, 3, 8, CURRENT_DATE),
(4, 8, 450, 1250, 67, 4, 0, 8, 28, 5, 10, CURRENT_DATE - INTERVAL '1 day'),
(5, 11, 600, 2100, 156, 9, 1, 34, 51, 9, 14, CURRENT_DATE),
(6, 9, 300, 1500, 87, 5, 1, 12, 31, 4, 9, CURRENT_DATE),
(7, 13, 150, 2950, 189, 11, 0, 45, 58, 11, 16, CURRENT_DATE),
(8, 7, 550, 1050, 54, 3, 0, 6, 22, 2, 7, CURRENT_DATE - INTERVAL '2 days'),
(9, 14, 400, 3400, 201, 13, 2, 56, 67, 13, 19, CURRENT_DATE),
(10, 6, 200, 800, 45, 2, 0, 4, 18, 1, 5, CURRENT_DATE - INTERVAL '3 days');

-- Insert Achievements
INSERT INTO achievements (name, description, icon, xp_reward, category, requirement_type, requirement_count) VALUES
('First Message', 'Send your first message', '💬', 10, 'social', 'messages', 1),
('Social Butterfly', 'Add 5 friends', '🦋', 50, 'social', 'friends', 5),
('Group Leader', 'Create a group', '👑', 100, 'social', 'groups', 1),
('Active Voter', 'Vote on 10 proposals', '🗳️', 200, 'governance', 'votes', 10),
('Conversation Starter', 'Send 50 messages', '💭', 100, 'social', 'messages', 50),
('Network Builder', 'Add 10 friends', '🌐', 150, 'social', 'friends', 10),
('Payment Pioneer', 'Send 5 payments', '💸', 75, 'trading', 'payments', 5),
('Consistent Contributor', 'Active for 7 days straight', '🔥', 250, 'activity', 'streak', 7),
('DAO Veteran', 'Active for 30 days', '⭐', 500, 'activity', 'days', 30),
('Governance Champion', 'Vote on 50 proposals', '🏆', 1000, 'governance', 'votes', 50);

-- Insert User Achievements
INSERT INTO user_achievements (user_id, achievement_id) VALUES
(1, 1), (1, 2), (1, 3), (1, 4), (1, 5), (1, 6), (1, 7), (1, 8), (1, 9),
(2, 1), (2, 2), (2, 3), (2, 4), (2, 5), (2, 6), (2, 7), (2, 8), (2, 9), (2, 10),
(3, 1), (3, 2), (3, 3), (3, 5), (3, 6), (3, 8),
(4, 1), (4, 2), (4, 5),
(5, 1), (5, 2), (5, 3), (5, 5), (5, 6), (5, 7), (5, 8),
(6, 1), (6, 2), (6, 3), (6, 5),
(7, 1), (7, 2), (7, 4), (7, 5), (7, 6), (7, 8), (7, 9),
(8, 1), (8, 2),
(9, 1), (9, 2), (9, 4), (9, 5), (9, 6), (9, 7), (9, 8), (9, 9),
(10, 1);

-- Insert Message Reactions
INSERT INTO message_reactions (message_id, user_id, emoji) VALUES
(1, 2, '👍'),
(1, 3, '❤️'),
(1, 4, '🔥'),
(2, 1, '😂'),
(2, 5, '👍'),
(3, 2, '💯'),
(4, 1, '🎉'),
(4, 3, '👏'),
(5, 6, '❤️');

-- Insert Notification Preferences
INSERT INTO notification_preferences (user_id, email_enabled, push_enabled, messages, friend_requests, endorsements, proposals, badges, activities, marketing) VALUES
(1, true, true, true, true, true, true, true, true, false),
(2, true, true, true, true, true, true, true, true, true),
(3, true, false, true, true, false, true, true, false, false),
(4, false, true, true, true, true, false, true, false, false),
(5, true, true, true, true, true, true, true, true, false),
(6, true, false, true, false, true, true, false, false, false),
(7, true, true, true, true, true, true, true, true, false),
(8, false, false, true, true, false, false, false, false, false),
(9, true, true, true, true, true, true, true, true, true),
(10, true, false, true, true, true, true, true, false, false);

-- Insert Token Balances (example data)
INSERT INTO token_balances (user_id, token_address, balance, last_updated) VALUES
(1, '0x0000000000000000000000000000000000000000', '5000000000000000000', NOW()), -- 5 ETH
(1, '0x1234567890123456789012345678901234567890', '100000000000000000000', NOW()), -- 100 VFIDE
(2, '0x0000000000000000000000000000000000000000', '12000000000000000000', NOW()), -- 12 ETH
(2, '0x1234567890123456789012345678901234567890', '500000000000000000000', NOW()), -- 500 VFIDE
(3, '0x0000000000000000000000000000000000000000', '8000000000000000000', NOW()), -- 8 ETH
(3, '0x1234567890123456789012345678901234567890', '250000000000000000000', NOW()); -- 250 VFIDE

-- Insert Payment Requests
INSERT INTO payment_requests (from_user_id, to_user_id, amount, token_address, description, status, expires_at) VALUES
(1, 2, '1000000000000000000', '0x0000000000000000000000000000000000000000', 'Payment for services', 'pending', NOW() + INTERVAL '7 days'),
(3, 4, '50000000000000000000', '0x1234567890123456789012345678901234567890', 'Group contribution', 'paid', NOW() + INTERVAL '7 days'),
(5, 6, '2000000000000000000', '0x0000000000000000000000000000000000000000', 'Reimbursement', 'pending', NOW() + INTERVAL '3 days');

-- Insert User Rewards
INSERT INTO user_rewards (user_id, reward_type, amount, token_address, description, is_claimed) VALUES
(1, 'referral', '10000000000000000000', '0x1234567890123456789012345678901234567890', 'Referral bonus for inviting 5 users', true),
(2, 'governance', '50000000000000000000', '0x1234567890123456789012345678901234567890', 'Active governance participation', false),
(3, 'activity', '25000000000000000000', '0x1234567890123456789012345678901234567890', 'Daily activity rewards', false),
(4, 'referral', '10000000000000000000', '0x1234567890123456789012345678901234567890', 'Referral bonus', false),
(5, 'governance', '100000000000000000000', '0x1234567890123456789012345678901234567890', 'Proposal creation reward', true);

-- Insert Analytics Events (sample data)
INSERT INTO analytics_events (user_id, event_type, event_name, properties, session_id) VALUES
(1, 'page_view', 'dashboard_visit', '{"page": "/dashboard", "duration": 45}', 'session_123'),
(1, 'action', 'message_sent', '{"recipient": "user_2", "length": 42}', 'session_123'),
(2, 'page_view', 'proposals_visit', '{"page": "/proposals", "duration": 120}', 'session_456'),
(2, 'action', 'vote_cast', '{"proposal_id": 1, "vote": "for"}', 'session_456'),
(3, 'action', 'friend_request_sent', '{"to_user": "user_4"}', 'session_789');

-- Update group member counts
UPDATE groups SET member_count = (SELECT COUNT(*) FROM group_members WHERE group_id = groups.id);

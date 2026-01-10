-- VFIDE Testnet Seed Data
-- Creates realistic demo data for marketing and YouTube showcases
-- This makes the testnet feel alive and production-ready

-- ============================================================================
-- DEMO USERS (Popular crypto influencers and community members)
-- ============================================================================

INSERT INTO users (id, wallet_address, username, display_name, bio, proof_score, reputation_score, is_council_member, is_verified, created_at) VALUES
-- Council Members (Top tier)
('00000000-0000-0000-0000-000000000001', '0x5473c147f55Bc49544Af42FB1814bA823ecf1eED', 'vfide_founder', 'VFIDE Founder', 'Building the future of decentralized governance and commerce. Welcome to VFIDE! 🚀', 5000, 10000, true, true, NOW() - INTERVAL '90 days'),
('00000000-0000-0000-0000-000000000002', '0x1111111111111111111111111111111111111111', 'crypto_innovator', 'Sarah Chen', 'DeFi researcher & governance enthusiast. Council Member. 🏛️', 4500, 8500, true, true, NOW() - INTERVAL '85 days'),
('00000000-0000-0000-0000-000000000003', '0x2222222222222222222222222222222222222222', 'blockchain_dev', 'Marcus Rodriguez', 'Full-stack blockchain developer. Building the future. 💻', 4200, 8000, true, true, NOW() - INTERVAL '80 days'),
('00000000-0000-0000-0000-000000000004', '0x3333333333333333333333333333333333333333', 'dao_expert', 'Emily Thompson', 'DAO governance expert. Making decentralization real. ⚡', 4000, 7500, true, true, NOW() - INTERVAL '75 days'),
('00000000-0000-0000-0000-000000000005', '0x4444444444444444444444444444444444444444', 'web3_pioneer', 'Alex Kim', 'Web3 pioneer & community builder. VFIDE council. 🌐', 3800, 7000, true, true, NOW() - INTERVAL '70 days'),

-- Active Community Members
('00000000-0000-0000-0000-000000000006', '0x5555555555555555555555555555555555555555', 'defi_trader', 'James Wilson', 'DeFi trader & liquidity provider. Always hunting alpha. 📈', 3500, 6000, false, true, NOW() - INTERVAL '60 days'),
('00000000-0000-0000-0000-000000000007', '0x6666666666666666666666666666666666666666', 'nft_collector', 'Lisa Martinez', 'NFT collector & digital artist. Creating the metaverse. 🎨', 3200, 5500, false, true, NOW() - INTERVAL '55 days'),
('00000000-0000-0000-0000-000000000008', '0x7777777777777777777777777777777777777777', 'crypto_analyst', 'David Park', 'Crypto analyst covering emerging protocols. DYOR! 📊', 3000, 5000, false, true, NOW() - INTERVAL '50 days'),
('00000000-0000-0000-0000-000000000009', '0x8888888888888888888888888888888888888888', 'community_mod', 'Rachel Green', 'Community moderator & engagement specialist. 🤝', 2800, 4500, false, true, NOW() - INTERVAL '45 days'),
('00000000-0000-0000-0000-000000000010', '0x9999999999999999999999999999999999999999', 'merchant_demo', 'Tech Store Owner', 'Running an e-commerce store on VFIDE. Accepting crypto! 🏪', 2500, 4000, false, true, NOW() - INTERVAL '40 days'),

-- New Users (Show growth)
('00000000-0000-0000-0000-000000000011', '0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', 'crypto_newbie', 'First Timer', 'Just joined VFIDE! Learning about DAOs and governance. 🌱', 500, 500, false, false, NOW() - INTERVAL '7 days'),
('00000000-0000-0000-0000-000000000012', '0xBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB', 'developer_jane', 'Jane Developer', 'Building dApps and contributing to open source. 👩‍💻', 1200, 1500, false, false, NOW() - INTERVAL '14 days'),
('00000000-0000-0000-0000-000000000013', '0xCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC', 'trader_mike', 'Mike the Trader', 'Active trader exploring governance opportunities. 💰', 1500, 1800, false, false, NOW() - INTERVAL '21 days'),
('00000000-0000-0000-0000-000000000014', '0xDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDD', 'student_dao', 'DAO Student', 'University student researching decentralized governance. 📚', 800, 900, false, false, NOW() - INTERVAL '10 days'),
('00000000-0000-0000-0000-000000000015', '0xEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEE', 'artist_crypto', 'Crypto Artist', 'Digital artist exploring blockchain commerce. 🎭', 1000, 1100, false, false, NOW() - INTERVAL '12 days')
ON CONFLICT (wallet_address) DO NOTHING;

-- ============================================================================
-- FRIENDSHIPS (Show social connections)
-- ============================================================================

INSERT INTO friendships (user_id, friend_id, status, created_at) VALUES
-- Council members are friends
('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', 'accepted', NOW() - INTERVAL '80 days'),
('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000003', 'accepted', NOW() - INTERVAL '75 days'),
('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000003', 'accepted', NOW() - INTERVAL '70 days'),
('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000004', 'accepted', NOW() - INTERVAL '65 days'),
('00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000005', 'accepted', NOW() - INTERVAL '60 days'),

-- Community connections
('00000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000007', 'accepted', NOW() - INTERVAL '50 days'),
('00000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000008', 'accepted', NOW() - INTERVAL '45 days'),
('00000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000009', 'accepted', NOW() - INTERVAL '40 days'),
('00000000-0000-0000-0000-000000000008', '00000000-0000-0000-0000-000000000009', 'accepted', NOW() - INTERVAL '35 days'),
('00000000-0000-0000-0000-000000000009', '00000000-0000-0000-0000-000000000010', 'accepted', NOW() - INTERVAL '30 days'),

-- Pending friend requests (show active engagement)
('00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000001', 'pending', NOW() - INTERVAL '2 days'),
('00000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-000000000006', 'pending', NOW() - INTERVAL '1 day')
ON CONFLICT DO NOTHING;

-- ============================================================================
-- GOVERNANCE PROPOSALS (Show active governance)
-- ============================================================================

INSERT INTO proposals (id, proposal_id, proposer_address, proposer_id, title, description, status, votes_for, votes_against, votes_abstain, start_block, end_block, created_at, updated_at) VALUES
-- Active proposal (people can vote on this!)
('10000000-0000-0000-0000-000000000001', 1, '0x5473c147f55Bc49544Af42FB1814bA823ecf1eED', '00000000-0000-0000-0000-000000000001',
'Increase Community Treasury Allocation',
'Proposal to allocate an additional 5% of protocol revenue to the community treasury to fund more grants and development initiatives. This will accelerate ecosystem growth and attract top talent.',
'active', 1250000000000000000000000, 350000000000000000000000, 100000000000000000000000,
1000000, 1050000, NOW() - INTERVAL '3 days', NOW() - INTERVAL '1 hour'),

-- Recently passed
('10000000-0000-0000-0000-000000000002', 2, '0x2222222222222222222222222222222222222222', '00000000-0000-0000-0000-000000000003',
'Launch VFIDE Merchant Incentive Program',
'Establish a merchant incentive program offering 0% transaction fees for the first 90 days to bootstrap the commerce ecosystem. Includes marketing support and technical assistance.',
'succeeded', 2100000000000000000000000, 200000000000000000000000, 50000000000000000000000,
950000, 1000000, NOW() - INTERVAL '10 days', NOW() - INTERVAL '2 days'),

-- Executed (showing governance works)
('10000000-0000-0000-0000-000000000003', 3, '0x1111111111111111111111111111111111111111', '00000000-0000-0000-0000-000000000002',
'Implement Proof Score Multiplier for Early Adopters',
'Reward early community members with a 2x Proof Score multiplier for all activities for the next 30 days. This recognizes their contribution to bootstrapping the network.',
'executed', 1800000000000000000000000, 150000000000000000000000, 80000000000000000000000,
900000, 950000, NOW() - INTERVAL '20 days', NOW() - INTERVAL '15 days'),

-- Upcoming
('10000000-0000-0000-0000-000000000004', 4, '0x3333333333333333333333333333333333333333', '00000000-0000-0000-0000-000000000004',
'Integrate Additional DeFi Protocols',
'Proposal to integrate 3 additional major DeFi protocols (Uniswap V4, Aave, Curve) to expand VFIDE\'s interoperability and provide more utility for token holders.',
'pending', 0, 0, 0,
1100000, 1150000, NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day')
ON CONFLICT (proposal_id) DO NOTHING;

-- ============================================================================
-- MESSAGES (Show active communication)
-- ============================================================================

INSERT INTO messages (sender_id, recipient_id, content, message_type, is_read, created_at) VALUES
-- Welcome messages from founder
('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000011', 
'Welcome to VFIDE! 🎉 Excited to have you in our community. Check out the active proposals and feel free to vote on what matters to you. If you have questions, the community is here to help!', 
'text', false, NOW() - INTERVAL '6 days'),

-- Community discussions
('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000003',
'Just reviewed the merchant incentive proposal. I think this could be huge for adoption. What''s your take?',
'text', true, NOW() - INTERVAL '5 days'),

('00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000002',
'Agreed! The 0% fees for 90 days is aggressive but necessary. We need to onboard quality merchants quickly.',
'text', true, NOW() - INTERVAL '5 days'),

-- Merchant inquiries
('00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000001',
'Hi! I run an online tech store and interested in accepting payments through VFIDE. Is there a merchant guide available?',
'text', true, NOW() - INTERVAL '4 days'),

('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000010',
'Absolutely! Check out /merchant for the full portal. You can set up escrow, accept multiple tokens, and manage subscriptions. Let me know if you need help getting started! 🏪',
'text', true, NOW() - INTERVAL '4 days'),

-- New user questions
('00000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-000000000006',
'How does the Proof Score system work? I see you have 3500 points!',
'text', true, NOW() - INTERVAL '3 days'),

('00000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000012',
'Proof Score is earned by participating! Vote on proposals, get endorsements, complete transactions, earn badges. It''s your reputation in the ecosystem. The more you contribute, the more you earn! 📈',
'text', true, NOW() - INTERVAL '3 days')
ON CONFLICT DO NOTHING;

-- ============================================================================
-- ENDORSEMENTS (Show social proof)
-- ============================================================================

INSERT INTO endorsements (endorser_id, endorsed_id, skill, message, proof_score_boost, created_at) VALUES
('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', 'Governance Strategy', 'Sarah has incredible insights on DAO governance. Her proposals are always well-researched and community-focused.', 100, NOW() - INTERVAL '60 days'),
('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000003', 'Smart Contract Development', 'Marcus is a brilliant blockchain developer. His code is clean, secure, and innovative.', 100, NOW() - INTERVAL '55 days'),
('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000004', 'Community Leadership', 'Emily is an exceptional community leader. She brings people together and drives meaningful discussions.', 100, NOW() - INTERVAL '50 days'),
('00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000005', 'Technical Architecture', 'Alex has deep understanding of Web3 architecture. His technical guidance has been invaluable.', 100, NOW() - INTERVAL '45 days'),
('00000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000007', 'NFT Expertise', 'Lisa knows NFTs inside and out. She''s helped me understand the market dynamics.', 50, NOW() - INTERVAL '40 days'),
('00000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000008', 'Market Analysis', 'David''s market analysis is always spot-on. Great insights on tokenomics.', 50, NOW() - INTERVAL '35 days'),
('00000000-0000-0000-0000-000000000008', '00000000-0000-0000-0000-000000000009', 'Community Management', 'Rachel keeps our community engaged and positive. She''s the glue that holds us together!', 50, NOW() - INTERVAL '30 days'),
('00000000-0000-0000-0000-000000000009', '00000000-0000-0000-0000-000000000010', 'E-commerce Integration', 'Great merchant on VFIDE! Fast shipping, quality products, excellent crypto checkout experience.', 50, NOW() - INTERVAL '25 days')
ON CONFLICT DO NOTHING;

-- ============================================================================
-- COUNCIL MEMBERS (Current term)
-- ============================================================================

INSERT INTO council_members (wallet_address, user_id, term_number, votes_received, election_date, term_start, term_end, is_active, created_at) VALUES
('0x5473c147f55Bc49544Af42FB1814bA823ecf1eED', '00000000-0000-0000-0000-000000000001', 1, 2500000000000000000000000, NOW() - INTERVAL '90 days', NOW() - INTERVAL '90 days', NOW() + INTERVAL '90 days', true, NOW() - INTERVAL '90 days'),
('0x1111111111111111111111111111111111111111', '00000000-0000-0000-0000-000000000002', 1, 2200000000000000000000000, NOW() - INTERVAL '90 days', NOW() - INTERVAL '90 days', NOW() + INTERVAL '90 days', true, NOW() - INTERVAL '90 days'),
('0x2222222222222222222222222222222222222222', '00000000-0000-0000-0000-000000000003', 1, 2000000000000000000000000, NOW() - INTERVAL '90 days', NOW() - INTERVAL '90 days', NOW() + INTERVAL '90 days', true, NOW() - INTERVAL '90 days'),
('0x3333333333333333333333333333333333333333', '00000000-0000-0000-0000-000000000004', 1, 1800000000000000000000000, NOW() - INTERVAL '90 days', NOW() - INTERVAL '90 days', NOW() + INTERVAL '90 days', true, NOW() - INTERVAL '90 days'),
('0x4444444444444444444444444444444444444444', '00000000-0000-0000-0000-000000000005', 1, 1600000000000000000000000, NOW() - INTERVAL '90 days', NOW() - INTERVAL '90 days', NOW() + INTERVAL '90 days', true, NOW() - INTERVAL '90 days')
ON CONFLICT (wallet_address) DO NOTHING;

-- ============================================================================
-- ACTIVITIES (Show platform is alive)
-- ============================================================================

INSERT INTO activities (user_id, activity_type, title, description, metadata, created_at) VALUES
('00000000-0000-0000-0000-000000000001', 'proposal_created', 'Created Proposal #1', 'Increase Community Treasury Allocation', '{"proposalId": 1}', NOW() - INTERVAL '3 days'),
('00000000-0000-0000-0000-000000000002', 'vote_cast', 'Voted on Proposal #1', 'Voted YES on community treasury proposal', '{"proposalId": 1, "vote": "for"}', NOW() - INTERVAL '2 days'),
('00000000-0000-0000-0000-000000000003', 'endorsement_given', 'Endorsed vfide_founder', 'Endorsed for Leadership', '{"skill": "Leadership"}', NOW() - INTERVAL '2 days'),
('00000000-0000-0000-0000-000000000011', 'badge_earned', 'Earned Welcome Badge', 'Completed first wallet connection', '{"badgeId": 1}', NOW() - INTERVAL '6 days'),
('00000000-0000-0000-0000-000000000012', 'vote_cast', 'Voted on Proposal #1', 'First governance participation!', '{"proposalId": 1, "vote": "for"}', NOW() - INTERVAL '1 day'),
('00000000-0000-0000-0000-000000000006', 'payment_made', 'Made Payment', 'Purchased from Tech Store', '{"amount": "100", "merchant": "merchant_demo"}', NOW() - INTERVAL '5 hours'),
('00000000-0000-0000-0000-000000000007', 'badge_earned', 'Earned NFT Collector Badge', 'Collected 10 unique NFTs', '{"badgeId": 5}', NOW() - INTERVAL '3 hours'),
('00000000-0000-0000-0000-000000000013', 'delegation_made', 'Delegated Voting Power', 'Delegated to crypto_innovator', '{"delegate": "crypto_innovator"}', NOW() - INTERVAL '2 hours'),
('00000000-0000-0000-0000-000000000010', 'payment_received', 'Received Payment', 'Sale completed via VFIDE escrow', '{"amount": "100", "buyer": "defi_trader"}', NOW() - INTERVAL '5 hours'),
('00000000-0000-0000-0000-000000000014', 'post_created', 'Shared Research', 'Posted analysis on DAO governance models', '{}', NOW() - INTERVAL '1 hour')
ON CONFLICT DO NOTHING;

-- ============================================================================
-- BADGES (Achievement system)
-- ============================================================================

INSERT INTO badges (id, badge_id, name, description, image_url, criteria, category, rarity, proof_score_value, created_at) VALUES
('20000000-0000-0000-0000-000000000001', 1, 'Welcome to VFIDE', 'Connected your wallet and joined the community', '/badges/welcome.svg', 'Connect wallet', 'onboarding', 'common', 10, NOW() - INTERVAL '90 days'),
('20000000-0000-0000-0000-000000000002', 2, 'First Voter', 'Cast your first governance vote', '/badges/first-vote.svg', 'Vote on a proposal', 'governance', 'common', 50, NOW() - INTERVAL '90 days'),
('20000000-0000-0000-0000-000000000003', 3, 'Active Participant', 'Voted on 10 proposals', '/badges/active-voter.svg', 'Vote on 10 proposals', 'governance', 'uncommon', 200, NOW() - INTERVAL '90 days'),
('20000000-0000-0000-0000-000000000004', 4, 'Governance Expert', 'Voted on 50 proposals', '/badges/governance-expert.svg', 'Vote on 50 proposals', 'governance', 'rare', 500, NOW() - INTERVAL '90 days'),
('20000000-0000-0000-0000-000000000005', 5, 'NFT Collector', 'Own 10 unique NFTs', '/badges/nft-collector.svg', 'Collect 10 NFTs', 'social', 'uncommon', 150, NOW() - INTERVAL '90 days'),
('20000000-0000-0000-0000-000000000006', 6, 'Merchant Pioneer', 'First sale on VFIDE commerce', '/badges/merchant.svg', 'Complete first sale', 'commerce', 'uncommon', 250, NOW() - INTERVAL '90 days'),
('20000000-0000-0000-0000-000000000007', 7, 'Council Member', 'Elected to VFIDE Council', '/badges/council.svg', 'Get elected to council', 'governance', 'epic', 1000, NOW() - INTERVAL '90 days'),
('20000000-0000-0000-0000-000000000008', 8, 'Proposal Creator', 'Created your first proposal', '/badges/proposer.svg', 'Create a proposal', 'governance', 'uncommon', 300, NOW() - INTERVAL '90 days'),
('20000000-0000-0000-0000-000000000009', 9, 'Social Butterfly', 'Have 20 friends', '/badges/social.svg', 'Connect with 20 users', 'social', 'uncommon', 100, NOW() - INTERVAL '90 days'),
('20000000-0000-0000-0000-000000000010', 10, 'Early Adopter', 'Joined in the first month', '/badges/early-adopter.svg', 'Join within first 30 days', 'special', 'legendary', 2000, NOW() - INTERVAL '90 days')
ON CONFLICT (badge_id) DO NOTHING;

-- ============================================================================
-- USER BADGES (Who earned what)
-- ============================================================================

INSERT INTO user_badges (user_id, badge_id, earned_at) VALUES
-- Founder has all badges
('00000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', NOW() - INTERVAL '90 days'),
('00000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000002', NOW() - INTERVAL '89 days'),
('00000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000003', NOW() - INTERVAL '85 days'),
('00000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000007', NOW() - INTERVAL '90 days'),
('00000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000010', NOW() - INTERVAL '90 days'),

-- Council members have council badge
('00000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000001', NOW() - INTERVAL '85 days'),
('00000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000007', NOW() - INTERVAL '85 days'),
('00000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000010', NOW() - INTERVAL '85 days'),

('00000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000001', NOW() - INTERVAL '80 days'),
('00000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000007', NOW() - INTERVAL '80 days'),
('00000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000010', NOW() - INTERVAL '80 days'),

-- Active users have various badges
('00000000-0000-0000-0000-000000000006', '20000000-0000-0000-0000-000000000001', NOW() - INTERVAL '60 days'),
('00000000-0000-0000-0000-000000000006', '20000000-0000-0000-0000-000000000002', NOW() - INTERVAL '58 days'),
('00000000-0000-0000-0000-000000000006', '20000000-0000-0000-0000-000000000003', NOW() - INTERVAL '50 days'),

('00000000-0000-0000-0000-000000000007', '20000000-0000-0000-0000-000000000001', NOW() - INTERVAL '55 days'),
('00000000-0000-0000-0000-000000000007', '20000000-0000-0000-0000-000000000005', NOW() - INTERVAL '45 days'),

-- New users just have welcome badge
('00000000-0000-0000-0000-000000000011', '20000000-0000-0000-0000-000000000001', NOW() - INTERVAL '6 days')
ON CONFLICT DO NOTHING;

-- ============================================================================
-- NOTIFICATIONS (Show active system)
-- ============================================================================

INSERT INTO notifications (user_id, type, title, message, link, is_read, metadata, created_at) VALUES
('00000000-0000-0000-0000-000000000001', 'proposal_created', 'New Proposal Created', 'Proposal #1: Increase Community Treasury Allocation is now live', '/governance/proposals/1', true, '{"proposalId": 1}', NOW() - INTERVAL '3 days'),
('00000000-0000-0000-0000-000000000002', 'endorsement_received', 'You received an endorsement!', 'vfide_founder endorsed you for Governance Strategy', '/profile/crypto_innovator', true, '{}', NOW() - INTERVAL '60 days'),
('00000000-0000-0000-0000-000000000011', 'system_announcement', 'Welcome to VFIDE Testnet! 🎉', 'Thank you for joining! Explore governance, commerce, and social features. Your journey starts now!', '/dashboard', false, '{}', NOW() - INTERVAL '6 days'),
('00000000-0000-0000-0000-000000000012', 'badge_earned', 'Badge Earned: First Voter', 'Congratulations! You earned the First Voter badge for casting your first vote.', '/badges', false, '{"badgeId": 2}', NOW() - INTERVAL '1 day'),
('00000000-0000-0000-0000-000000000006', 'friend_request_accepted', 'Friend Request Accepted', 'crypto_analyst accepted your friend request', '/social/friends', true, '{}', NOW() - INTERVAL '40 days'),
('00000000-0000-0000-0000-000000000010', 'payment_received', 'Payment Received', 'You received 100 USDC from defi_trader', '/merchant/transactions', true, '{"amount": "100", "token": "USDC"}', NOW() - INTERVAL '5 hours'),
('00000000-0000-0000-0000-000000000013', 'vote_cast', 'Your delegate voted', 'crypto_innovator voted YES on Proposal #1 with your delegated power', '/governance/proposals/1', false, '{"proposalId": 1}', NOW() - INTERVAL '1 day')
ON CONFLICT DO NOTHING;

-- ============================================================================
-- ESCROWS (Show active commerce)
-- ============================================================================

INSERT INTO escrows (escrow_id, buyer_address, seller_address, amount, status, description, created_at, completed_at) VALUES
(1, '0x5555555555555555555555555555555555555555', '0x9999999999999999999999999999999999999999', 100000000, 'completed', 'Gaming laptop purchase', NOW() - INTERVAL '10 days', NOW() - INTERVAL '5 days'),
(2, '0x6666666666666666666666666666666666666666', '0x9999999999999999999999999999999999999999', 50000000, 'completed', 'Wireless headphones', NOW() - INTERVAL '8 days', NOW() - INTERVAL '4 days'),
(3, '0x7777777777777777777777777777777777777777', '0x9999999999999999999999999999999999999999', 200000000, 'active', 'Custom PC build', NOW() - INTERVAL '2 days', NULL),
(4, '0x8888888888888888888888888888888888888888', '0x9999999999999999999999999999999999999999', 75000000, 'active', 'Mechanical keyboard', NOW() - INTERVAL '1 day', NULL)
ON CONFLICT (escrow_id) DO NOTHING;

-- ============================================================================
-- Update user last_seen to show recent activity
-- ============================================================================

UPDATE users SET last_seen_at = NOW() - INTERVAL '5 minutes' WHERE id IN (
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000006'
);

UPDATE users SET last_seen_at = NOW() - INTERVAL '30 minutes' WHERE id IN (
    '00000000-0000-0000-0000-000000000003',
    '00000000-0000-0000-0000-000000000007',
    '00000000-0000-0000-0000-000000000012'
);

UPDATE users SET last_seen_at = NOW() - INTERVAL '2 hours' WHERE id IN (
    '00000000-0000-0000-0000-000000000004',
    '00000000-0000-0000-0000-000000000008'
);

-- ============================================================================
-- ANALYTICS / PLATFORM STATS (For displaying growth)
-- ============================================================================

-- Create a stats view for easy querying
CREATE OR REPLACE VIEW platform_stats AS
SELECT 
    (SELECT COUNT(*) FROM users) as total_users,
    (SELECT COUNT(*) FROM users WHERE created_at > NOW() - INTERVAL '7 days') as new_users_week,
    (SELECT COUNT(*) FROM users WHERE created_at > NOW() - INTERVAL '30 days') as new_users_month,
    (SELECT COUNT(*) FROM proposals) as total_proposals,
    (SELECT COUNT(*) FROM proposals WHERE status = 'active') as active_proposals,
    (SELECT COUNT(*) FROM messages) as total_messages,
    (SELECT COUNT(*) FROM escrows WHERE status = 'completed') as completed_escrows,
    (SELECT SUM(amount) FROM escrows WHERE status = 'completed') as total_volume,
    (SELECT COUNT(*) FROM friendships WHERE status = 'accepted') as total_friendships,
    (SELECT COUNT(*) FROM badges) as total_badges,
    (SELECT COUNT(*) FROM user_badges) as badges_earned,
    (SELECT COUNT(*) FROM activities WHERE created_at > NOW() - INTERVAL '24 hours') as activities_24h;

-- Success message
SELECT 'VFIDE Testnet seed data loaded successfully! 🎉' as status,
       (SELECT COUNT(*) FROM users) as users_created,
       (SELECT COUNT(*) FROM proposals) as proposals_created,
       (SELECT COUNT(*) FROM messages) as messages_created,
       (SELECT COUNT(*) FROM activities) as activities_created,
       (SELECT COUNT(*) FROM badges) as badges_created;

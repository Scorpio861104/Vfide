// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

/**
 * @title BadgeRegistry
 * @notice Central registry of all VFIDE badge types and metadata
 * @dev Philosophy: Every badge is earned through actions, never purchased with wealth
 */
library BadgeRegistry {
    
    // ============ PIONEER & FOUNDATION ============
    // Historical recognition for early supporters
    
    /// @notice First 10,000 users to join VFIDE (+30 points, permanent)
    bytes32 public constant PIONEER = keccak256("PIONEER");
    
    /// @notice Participated in initial presale (+40 points, permanent)
    bytes32 public constant GENESIS_PRESALE = keccak256("GENESIS_PRESALE");
    
    /// @notice First 1,000 users to reach 800+ ProofScore (+50 points, permanent)
    bytes32 public constant FOUNDING_MEMBER = keccak256("FOUNDING_MEMBER");
    
    // ============ ACTIVITY & PARTICIPATION ============
    // Engagement recognition
    
    /// @notice 50+ commerce transactions in 90 days (+20 points, renewable: 90 days)
    bytes32 public constant ACTIVE_TRADER = keccak256("ACTIVE_TRADER");
    
    /// @notice Voted on 10+ DAO proposals (+25 points, renewable: 180 days)
    bytes32 public constant GOVERNANCE_VOTER = keccak256("GOVERNANCE_VOTER");
    
    /// @notice Achieved diversification bonus (3+ activity types) (+40 points, renewable: 90 days)
    bytes32 public constant POWER_USER = keccak256("POWER_USER");
    
    /// @notice Transaction every day for 30 consecutive days (+15 points, renewable: 30 days)
    bytes32 public constant DAILY_CHAMPION = keccak256("DAILY_CHAMPION");
    
    // ============ TRUST & COMMUNITY ============
    // Social proof
    
    /// @notice 5+ good endorsements of users who maintained >700 score (+30 points, permanent)
    bytes32 public constant TRUSTED_ENDORSER = keccak256("TRUSTED_ENDORSER");
    
    /// @notice Recruited 10 users who reached 600+ ProofScore (+35 points, permanent)
    bytes32 public constant COMMUNITY_BUILDER = keccak256("COMMUNITY_BUILDER");
    
    /// @notice Resolved 3+ disputes through mediation (+25 points, permanent)
    bytes32 public constant PEACEMAKER = keccak256("PEACEMAKER");
    
    /// @notice Helped 5+ new users reach 540+ ProofScore (+30 points, renewable: 365 days)
    bytes32 public constant MENTOR = keccak256("MENTOR");
    
    // ============ COMMERCE & MERCHANTS ============
    // Business excellence
    
    /// @notice 100+ successful transactions as merchant, zero disputes (+40 points, renewable: 365 days)
    bytes32 public constant VERIFIED_MERCHANT = keccak256("VERIFIED_MERCHANT");
    
    /// @notice 1,000+ transactions, >$100k volume, 4.8+ rating (+60 points, renewable: 180 days)
    bytes32 public constant ELITE_MERCHANT = keccak256("ELITE_MERCHANT");
    
    /// @notice Qualified for instant merchant rebates (800+ score) (+20 points, renewable: 90 days)
    bytes32 public constant INSTANT_SETTLEMENT = keccak256("INSTANT_SETTLEMENT");
    
    /// @notice 200+ transactions with ZERO disputes (+25 points, renewable: 180 days)
    bytes32 public constant ZERO_DISPUTE = keccak256("ZERO_DISPUTE");
    
    // ============ SECURITY & INTEGRITY ============
    // Protection & honesty
    
    /// @notice Reported 3+ confirmed fraud cases (+50 points, permanent)
    bytes32 public constant FRAUD_HUNTER = keccak256("FRAUD_HUNTER");
    
    /// @notice 1 year with zero negative events (+20 points, renewable: 365 days)
    bytes32 public constant CLEAN_RECORD = keccak256("CLEAN_RECORD");
    
    /// @notice Recovered from penalty through 6+ months good behavior (+30 points, one-time)
    bytes32 public constant REDEMPTION = keccak256("REDEMPTION");
    
    /// @notice ProofScore never dropped below 700 for 2+ years (+40 points, permanent)
    bytes32 public constant GUARDIAN = keccak256("GUARDIAN");
    
    // ============ ACHIEVEMENTS & MILESTONES ============
    // Notable accomplishments
    
    /// @notice Reached ProofScore 900+ (top 5%) (+50 points, permanent)
    bytes32 public constant ELITE_ACHIEVER = keccak256("ELITE_ACHIEVER");
    
    /// @notice Received 100+ endorsements over time (+35 points, permanent)
    bytes32 public constant CENTURY_ENDORSER = keccak256("CENTURY_ENDORSER");
    
    /// @notice Won DAO vote against whale (10x your holdings) (+25 points, permanent)
    bytes32 public constant WHALE_SLAYER = keccak256("WHALE_SLAYER");
    
    /// @notice Participated in ALL ecosystem features (+30 points, permanent)
    bytes32 public constant DIVERSIFICATION_MASTER = keccak256("DIVERSIFICATION_MASTER");
    
    // ============ EDUCATION & CONTRIBUTION ============
    // Knowledge sharing
    
    /// @notice Created 5+ educational content pieces (+30 points, renewable: 180 days)
    bytes32 public constant EDUCATOR = keccak256("EDUCATOR");
    
    /// @notice Made meaningful code/design/content contribution (+40 points, permanent)
    bytes32 public constant CONTRIBUTOR = keccak256("CONTRIBUTOR");
    
    /// @notice Reported security vulnerability (+20-100 points, permanent)
    bytes32 public constant BUG_BOUNTY = keccak256("BUG_BOUNTY");
    
    /// @notice Translated docs/UI to new language (+25 points, permanent)
    bytes32 public constant TRANSLATOR = keccak256("TRANSLATOR");
    
    // ============ HELPER FUNCTIONS ============
    
    /**
     * @notice Get human-readable badge name
     * @param badge The badge ID (bytes32)
     * @return name The display name
     */
    function getName(bytes32 badge) public pure returns (string memory) {
        if (badge == PIONEER) return "Pioneer";
        if (badge == GENESIS_PRESALE) return "Genesis Presale";
        if (badge == FOUNDING_MEMBER) return "Founding Member";
        if (badge == ACTIVE_TRADER) return "Active Trader";
        if (badge == GOVERNANCE_VOTER) return "Governance Voter";
        if (badge == POWER_USER) return "Power User";
        if (badge == DAILY_CHAMPION) return "Daily Champion";
        if (badge == TRUSTED_ENDORSER) return "Trusted Endorser";
        if (badge == COMMUNITY_BUILDER) return "Community Builder";
        if (badge == PEACEMAKER) return "Peacemaker";
        if (badge == MENTOR) return "Mentor";
        if (badge == VERIFIED_MERCHANT) return "Verified Merchant";
        if (badge == ELITE_MERCHANT) return "Elite Merchant";
        if (badge == INSTANT_SETTLEMENT) return "Instant Settlement";
        if (badge == ZERO_DISPUTE) return "Zero Dispute";
        if (badge == FRAUD_HUNTER) return "Fraud Hunter";
        if (badge == CLEAN_RECORD) return "Clean Record";
        if (badge == REDEMPTION) return "Redemption";
        if (badge == GUARDIAN) return "Guardian";
        if (badge == ELITE_ACHIEVER) return "Elite Achiever";
        if (badge == CENTURY_ENDORSER) return "Century Endorser";
        if (badge == WHALE_SLAYER) return "Whale Slayer";
        if (badge == DIVERSIFICATION_MASTER) return "Diversification Master";
        if (badge == EDUCATOR) return "Educator";
        if (badge == CONTRIBUTOR) return "Contributor";
        if (badge == BUG_BOUNTY) return "Bug Bounty";
        if (badge == TRANSLATOR) return "Translator";
        return "Unknown Badge";
    }
    
    /**
     * @notice Check if a badge ID is valid
     * @param badge The badge ID (bytes32)
     * @return True if the badge is a known valid badge
     */
    function isValidBadge(bytes32 badge) public pure returns (bool) {
        return badge == PIONEER
            || badge == GENESIS_PRESALE
            || badge == FOUNDING_MEMBER
            || badge == ACTIVE_TRADER
            || badge == GOVERNANCE_VOTER
            || badge == POWER_USER
            || badge == DAILY_CHAMPION
            || badge == TRUSTED_ENDORSER
            || badge == COMMUNITY_BUILDER
            || badge == PEACEMAKER
            || badge == MENTOR
            || badge == VERIFIED_MERCHANT
            || badge == ELITE_MERCHANT
            || badge == INSTANT_SETTLEMENT
            || badge == ZERO_DISPUTE
            || badge == FRAUD_HUNTER
            || badge == CLEAN_RECORD
            || badge == REDEMPTION
            || badge == GUARDIAN
            || badge == ELITE_ACHIEVER
            || badge == CENTURY_ENDORSER
            || badge == WHALE_SLAYER
            || badge == DIVERSIFICATION_MASTER
            || badge == EDUCATOR
            || badge == CONTRIBUTOR
            || badge == BUG_BOUNTY
            || badge == TRANSLATOR;
    }
    
    /**
     * @notice Get badge category
     * @param badge The badge ID
     * @return category Category name
     */
    function getCategory(bytes32 badge) public pure returns (string memory) {
        // Pioneer & Foundation
        if (badge == PIONEER || badge == GENESIS_PRESALE || badge == FOUNDING_MEMBER) {
            return "Pioneer & Foundation";
        }
        
        // Activity & Participation
        if (badge == ACTIVE_TRADER || badge == GOVERNANCE_VOTER || 
            badge == POWER_USER || badge == DAILY_CHAMPION) {
            return "Activity & Participation";
        }
        
        // Trust & Community
        if (badge == TRUSTED_ENDORSER || badge == COMMUNITY_BUILDER || 
            badge == PEACEMAKER || badge == MENTOR) {
            return "Trust & Community";
        }
        
        // Commerce & Merchants
        if (badge == VERIFIED_MERCHANT || badge == ELITE_MERCHANT || 
            badge == INSTANT_SETTLEMENT || badge == ZERO_DISPUTE) {
            return "Commerce & Merchants";
        }
        
        // Security & Integrity
        if (badge == FRAUD_HUNTER || badge == CLEAN_RECORD || 
            badge == REDEMPTION || badge == GUARDIAN) {
            return "Security & Integrity";
        }
        
        // Achievements & Milestones
        if (badge == ELITE_ACHIEVER || badge == CENTURY_ENDORSER || 
            badge == WHALE_SLAYER || badge == DIVERSIFICATION_MASTER) {
            return "Achievements & Milestones";
        }
        
        // Education & Contribution
        if (badge == EDUCATOR || badge == CONTRIBUTOR || 
            badge == BUG_BOUNTY || badge == TRANSLATOR) {
            return "Education & Contribution";
        }
        
        return "Unknown";
    }
    
    /**
     * @notice Check if badge is permanent (non-expiring)
     * @param badge The badge ID
     * @return isPermanent True if badge never expires
     */
    function isPermanent(bytes32 badge) public pure returns (bool) {
        return (
            badge == PIONEER ||
            badge == GENESIS_PRESALE ||
            badge == FOUNDING_MEMBER ||
            badge == TRUSTED_ENDORSER ||
            badge == COMMUNITY_BUILDER ||
            badge == PEACEMAKER ||
            badge == FRAUD_HUNTER ||
            badge == REDEMPTION ||
            badge == GUARDIAN ||
            badge == ELITE_ACHIEVER ||
            badge == CENTURY_ENDORSER ||
            badge == WHALE_SLAYER ||
            badge == DIVERSIFICATION_MASTER ||
            badge == CONTRIBUTOR ||
            badge == BUG_BOUNTY ||
            badge == TRANSLATOR
        );
    }
    
    /**
     * @notice Get recommended badge weight (points)
     * @param badge The badge ID
     * @return weight Recommended points value
     */
    function getRecommendedWeight(bytes32 badge) public pure returns (uint16) {
        if (badge == PIONEER) return 30;
        if (badge == GENESIS_PRESALE) return 40;
        if (badge == FOUNDING_MEMBER) return 50;
        if (badge == ACTIVE_TRADER) return 20;
        if (badge == GOVERNANCE_VOTER) return 25;
        if (badge == POWER_USER) return 40;
        if (badge == DAILY_CHAMPION) return 15;
        if (badge == TRUSTED_ENDORSER) return 30;
        if (badge == COMMUNITY_BUILDER) return 35;
        if (badge == PEACEMAKER) return 25;
        if (badge == MENTOR) return 30;
        if (badge == VERIFIED_MERCHANT) return 40;
        if (badge == ELITE_MERCHANT) return 60;
        if (badge == INSTANT_SETTLEMENT) return 20;
        if (badge == ZERO_DISPUTE) return 25;
        if (badge == FRAUD_HUNTER) return 50;
        if (badge == CLEAN_RECORD) return 20;
        if (badge == REDEMPTION) return 30;
        if (badge == GUARDIAN) return 40;
        if (badge == ELITE_ACHIEVER) return 50;
        if (badge == CENTURY_ENDORSER) return 35;
        if (badge == WHALE_SLAYER) return 25;
        if (badge == DIVERSIFICATION_MASTER) return 30;
        if (badge == EDUCATOR) return 30;
        if (badge == CONTRIBUTOR) return 40;
        if (badge == BUG_BOUNTY) return 50; // Variable in practice
        if (badge == TRANSLATOR) return 25;
        return 0;
    }
    
    /**
     * @notice Get recommended badge duration
     * @param badge The badge ID
     * @return duration Time in seconds (0 = permanent)
     */
    function getRecommendedDuration(bytes32 badge) public pure returns (uint256) {
        if (badge == ACTIVE_TRADER) return 90 days;
        if (badge == GOVERNANCE_VOTER) return 180 days;
        if (badge == POWER_USER) return 90 days;
        if (badge == DAILY_CHAMPION) return 30 days;
        if (badge == MENTOR) return 365 days;
        if (badge == VERIFIED_MERCHANT) return 365 days;
        if (badge == ELITE_MERCHANT) return 180 days;
        if (badge == INSTANT_SETTLEMENT) return 90 days;
        if (badge == ZERO_DISPUTE) return 180 days;
        if (badge == CLEAN_RECORD) return 365 days;
        if (badge == EDUCATOR) return 180 days;
        
        return 0; // Permanent
    }
}

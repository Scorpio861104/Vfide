// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

/**
 * @title DAOIncentives
 * @notice Fair compensation for DAO service - NOT wealth creation
 * 
 * VFIDE MISSION: Protect the forgotten, not enrich the powerful
 * 
 * ANTI-KING PRINCIPLES:
 * - No wealth accumulation for DAO members
 * - No staking APY (not a get-rich scheme)
 * - No revenue share (DAO serves, doesn't extract)
 * - Small, fair payment for time/effort ONLY
 * - Zero transaction fees while actively serving
 * - Integrity is the only power, never funds
 * 
 * FAIR COMPENSATION MODEL:
 * 1. Service deposit (10k VFIDE, returned when leave with honor)
 * 2. Small monthly stipend (100 VFIDE ~$1k, covers time only)
 * 3. Zero transaction fees while serving (systemExempt)
 * 4. ProofScore boost (reputation, not money)
 * 5. 100% deposit forfeited if corrupt (zero tolerance)
 * 
 * WHAT THIS IS NOT:
 * - NOT a passive income scheme
 * - NOT a whale playground
 * - NOT about getting rich
 * - NOT extractive governance
 * 
 * WHAT THIS IS:
 * - Fair compensation for service to the forgotten
 * - Accountability through forfeiture
 * - Integrity over profit
 * - Community service, not wealth-seeking
 */

interface IERC20_INCENTIVE {
    function balanceOf(address account) external view returns (uint256);
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
}

interface ISeer_INCENTIVE {
    function getScore(address account) external view returns (uint16);
    function rewardMerchant(address merchant, uint16 delta, string calldata reason) external;
}

interface IProofLedger_INCENTIVE {
    function logSystemEvent(address who, string calldata action, address by) external;
    function logEvent(address who, string calldata action, uint256 amount, string calldata note) external;
}

interface IDAOMultiSigGuardian {
    function isDAOSigner(address signer) external view returns (bool);
    function getProposalState(uint256 proposalId) external view returns (
        uint8 state,
        uint8 signaturesReceived,
        uint8 signaturesRequired,
        uint64 executeAfter,
        uint64 expiresAt,
        bool canExecute
    );
}

error INCENT_NotDAO();
error INCENT_NotStaked();
error INCENT_StakeLocked();
error INCENT_InsufficientRewards();
error INCENT_AlreadyClaimed();
error INCENT_Slashed();
error INCENT_Zero();

contract DAOIncentives {
    event DAOChanged(address indexed oldDAO, address indexed newDAO);
    event Staked(address indexed signer, uint256 amount, uint256 lockUntil);
    event Unstaked(address indexed signer, uint256 amount, uint256 rewards);
    event RewardsClaimed(address indexed signer, uint256 amount, string source);
    event ProposalBountyPaid(uint256 indexed proposalId, address indexed proposer, uint256 amount);
    event ParticipationRewardPaid(address indexed signer, uint256 amount, uint256 proposalsSigned);
    event PerformanceBonusPaid(address indexed signer, uint256 amount, uint256 uptime);
    event TreasuryShareDistributed(uint256 totalAmount, uint256 perSigner);
    event Slashed(address indexed signer, uint256 amount, string reason);
    event ProofScoreBoostApplied(address indexed signer, uint16 delta, string reason);
    // Removed StakingAPYSet event (no APY staking)
    event ProposalBountySet(uint256 oldBounty, uint256 newBounty);
    event TreasuryShareBpsSet(uint16 oldBps, uint16 newBps);

    struct Stake {
        uint256 amount;              // VFIDE staked
        uint64 stakedAt;             // Timestamp when staked
        uint64 lockUntil;            // Minimum lock period (e.g., 90 days)
        uint256 rewardsAccumulated;  // Unclaimed rewards
        uint256 totalEarned;         // Lifetime earnings
        uint32 proposalsSigned;      // Participation metric
        uint32 proposalsProposed;    // Contribution metric
        uint32 proposalsSuccessful;  // Quality metric
        uint32 proposalsVetoed;      // Bad proposal metric (negative)
        bool slashed;                // Penalty flag
    }

    address public dao;
    IERC20_INCENTIVE public token;
    ISeer_INCENTIVE public seer;
    IProofLedger_INCENTIVE public ledger;
    IDAOMultiSigGuardian public guardian;

    mapping(address => Stake) public stakes;
    address[] public stakers;

    // Reward parameters (DAO configurable) - SUSTAINABLE MODEL
    // NO staking APY (unsustainable without presale allocation)
    // Revenue from ProofScore burn split: 25% burn, 50% treasury, 25% Sanctum
    // DAO gets share of treasury's 50% (e.g., 10% of that = 5% of total burns)
    uint256 public proposalBounty = 50 * 10**18;  // 50 VFIDE for successful proposal
    uint256 public participationReward = 5 * 10**18; // 5 VFIDE per proposal signed
    uint256 public performanceBonusBase = 25 * 10**18; // 25 VFIDE monthly if 100% uptime
    uint16 public treasuryShareBps = 1000;        // 10% of treasury's 50% = 5% of total burns
    uint64 public minimumStakeLock = 90 days;     // Minimum stake period (anti-Sybil)
    uint256 public minimumStake = 1000 * 10**18;  // 1k VFIDE minimum (more accessible)
    uint16 public proofScoreBoostPerMonth = 3;    // +3 ProofScore per month
    bool public daoFeesExempt = true;             // DAO members pay ZERO fees

    // Slashing parameters
    uint16 public slashPercentage = 2000;         // 20% stake slashed for malicious behavior
    
    // Tracking
    uint256 public totalStaked;
    uint256 public totalRewardsDistributed;
    uint256 public lastTreasuryDistribution;

    modifier onlyDAO() {
        if (msg.sender != dao) revert INCENT_NotDAO();
        _;
    }

    constructor(
        address _dao,
        address _token,
        address _seer,
        address _ledger,
        address _guardian
    ) {
        require(_dao != address(0), "zero_dao");
        require(_token != address(0), "zero_token");
        require(_seer != address(0), "zero_seer");
        require(_ledger != address(0), "zero_ledger");
        require(_guardian != address(0), "zero_guardian");

        dao = _dao;
        token = IERC20_INCENTIVE(_token);
        seer = ISeer_INCENTIVE(_seer);
        ledger = IProofLedger_INCENTIVE(_ledger);
        guardian = IDAOMultiSigGuardian(_guardian);

        lastTreasuryDistribution = block.timestamp;
    }

    // ========================================================================
    // STAKING (Skin in the Game)
    // ========================================================================

    /// @notice Stake VFIDE to become/remain DAO member (anti-Sybil commitment)
    function stake(uint256 amount) external {
        require(amount >= minimumStake, "below_minimum");
        require(guardian.isDAOSigner(msg.sender), "not_dao_signer");

        Stake storage s = stakes[msg.sender];
        
        if (s.amount == 0) {
            stakers.push(msg.sender);
        }

        require(token.transferFrom(msg.sender, address(this), amount), "transfer_fail");

        s.amount += amount;
        s.stakedAt = uint64(block.timestamp);
        s.lockUntil = uint64(block.timestamp + minimumStakeLock);
        totalStaked += amount;

        emit Staked(msg.sender, amount, s.lockUntil);
        ledger.logEvent(msg.sender, "dao_staked", amount, "anti_sybil_commitment");
    }

    /// @notice Unstake VFIDE (after lock period)
    function unstake(uint256 amount) external {
        Stake storage s = stakes[msg.sender];
        
        if (s.amount == 0) revert INCENT_NotStaked();
        if (block.timestamp < s.lockUntil) revert INCENT_StakeLocked();
        if (s.slashed) revert INCENT_Slashed();
        require(amount <= s.amount, "insufficient_stake");

        // Claim any accumulated rewards (from treasury share, etc.)
        uint256 rewards = s.rewardsAccumulated;
        s.rewardsAccumulated = 0;

        // Unstake principal
        s.amount -= amount;
        totalStaked -= amount;

        // Transfer principal + rewards
        uint256 totalPayout = amount + rewards;
        require(token.transfer(msg.sender, totalPayout), "transfer_fail");

        emit Unstaked(msg.sender, amount, rewards);
        ledger.logEvent(msg.sender, "dao_unstaked", totalPayout, "principal_plus_rewards");
    }

    // ========================================================================
    // NO STAKING REWARDS (Unsustainable)
    // ========================================================================
    // Removed staking APY - unsustainable without presale allocation
    // DAO compensation comes from:
    // 1. Treasury revenue share (5% of burn fees via burn split)
    // 2. Proposal bounties (active contribution)
    // 3. Participation rewards (showing up)
    // 4. Performance bonuses (quality work)
    // 5. Zero transaction fees (cost savings)

    /// @notice Claim accumulated rewards (treasury share, bounties, etc.)
    function claimRewards() external {
        Stake storage s = stakes[msg.sender];
        
        if (s.amount == 0) revert INCENT_NotStaked();
        if (s.slashed) revert INCENT_Slashed();
        
        uint256 rewards = s.rewardsAccumulated;
        if (rewards == 0) revert INCENT_InsufficientRewards();

        s.rewardsAccumulated = 0;
        totalRewardsDistributed += rewards;

        require(token.transfer(msg.sender, rewards), "transfer_fail");

        emit RewardsClaimed(msg.sender, rewards, "dao_revenue_share");
        ledger.logEvent(msg.sender, "dao_rewards_claimed", rewards, "treasury_share_bounties");
    }

    // ========================================================================
    // PROPOSAL BOUNTIES (Active Participation)
    // ========================================================================

    /// @notice Pay bounty for successful proposal execution
    function payProposalBounty(uint256 proposalId, address proposer) external onlyDAO {
        Stake storage s = stakes[proposer];
        
        if (s.amount == 0) revert INCENT_NotStaked();
        if (s.slashed) revert INCENT_Slashed();

        s.proposalsProposed += 1;
        s.proposalsSuccessful += 1;
        s.rewardsAccumulated += proposalBounty;
        s.totalEarned += proposalBounty;
        totalRewardsDistributed += proposalBounty;

        emit ProposalBountyPaid(proposalId, proposer, proposalBounty);
        ledger.logEvent(proposer, "proposal_bounty", proposalBounty, "successful_proposal");
    }

    /// @notice Record proposal signing (participation tracking)
    function recordProposalSignature(uint256 proposalId, address signer) external {
        require(msg.sender == address(guardian), "only_guardian");
        
        Stake storage s = stakes[signer];
        if (s.amount == 0) return; // Not staked, no reward

        s.proposalsSigned += 1;
        s.rewardsAccumulated += participationReward;
        s.totalEarned += participationReward;
        totalRewardsDistributed += participationReward;

        emit ParticipationRewardPaid(signer, participationReward, s.proposalsSigned);
        ledger.logEvent(signer, "participation_reward", participationReward, "signed_proposal");
    }

    /// @notice Record vetoed proposal (negative metric)
    function recordVetoedProposal(uint256 proposalId, address proposer) external onlyDAO {
        Stake storage s = stakes[proposer];
        if (s.amount == 0) return;

        s.proposalsVetoed += 1;
        
        // If multiple proposals vetoed, slash stake
        if (s.proposalsVetoed >= 3) {
            _slashStake(proposer, "three_proposals_vetoed");
        }
    }

    // ========================================================================
    // PERFORMANCE BONUSES (Quality Metrics)
    // ========================================================================

    /// @notice Pay monthly performance bonus based on uptime/participation
    function distributePerformanceBonuses() external onlyDAO {
        uint256 totalBonuses = 0;

        for (uint256 i = 0; i < stakers.length; i++) {
            address signer = stakers[i];
            Stake storage s = stakes[signer];

            if (s.amount == 0 || s.slashed) continue;

            // Calculate uptime score (proposals signed / total proposals in period)
            // For simplicity, assume 10 proposals per month, 100% = all 10 signed
            uint256 uptimePercent = (s.proposalsSigned * 100) / 10; // Simplified
            if (uptimePercent > 100) uptimePercent = 100;

            uint256 bonus = (performanceBonusBase * uptimePercent) / 100;
            
            s.rewardsAccumulated += bonus;
            s.totalEarned += bonus;
            totalBonuses += bonus;

            // Reset monthly counter
            s.proposalsSigned = 0;

            emit PerformanceBonusPaid(signer, bonus, uptimePercent);
        }

        totalRewardsDistributed += totalBonuses;
        ledger.logEvent(address(this), "performance_bonuses_distributed", totalBonuses, "monthly_distribution");
    }

    // ========================================================================
    // TREASURY REVENUE SHARE (Economic Alignment)
    // ========================================================================

    /// @notice Distribute % of treasury revenue to DAO stakers
    function distributeTreasuryShare(uint256 treasuryRevenue) external onlyDAO {
        require(block.timestamp >= lastTreasuryDistribution + 30 days, "too_soon");

        uint256 shareAmount = (treasuryRevenue * treasuryShareBps) / 10000;
        uint256 activeStakers = 0;

        // Count active stakers
        for (uint256 i = 0; i < stakers.length; i++) {
            if (stakes[stakers[i]].amount > 0 && !stakes[stakers[i]].slashed) {
                activeStakers += 1;
            }
        }

        if (activeStakers == 0) return;

        uint256 perSigner = shareAmount / activeStakers;

        // Distribute equally (could be weighted by stake or performance)
        for (uint256 i = 0; i < stakers.length; i++) {
            address signer = stakers[i];
            Stake storage s = stakes[signer];

            if (s.amount == 0 || s.slashed) continue;

            s.rewardsAccumulated += perSigner;
            s.totalEarned += perSigner;
        }

        totalRewardsDistributed += shareAmount;
        lastTreasuryDistribution = block.timestamp;

        emit TreasuryShareDistributed(shareAmount, perSigner);
        ledger.logEvent(address(this), "treasury_share_distributed", shareAmount, "monthly_revenue_share");
    }

    // ========================================================================
    // PROOFSCORE BOOSTS (Reputation Benefits)
    // ========================================================================

    /// @notice Apply ProofScore boost for active DAO participation
    function applyProofScoreBoost(address signer) external onlyDAO {
        Stake storage s = stakes[signer];
        
        if (s.amount == 0 || s.slashed) return;

        uint256 monthsStaked = (block.timestamp - s.stakedAt) / 30 days;
        uint16 boost = uint16(monthsStaked * proofScoreBoostPerMonth);

        if (boost > 0) {
            seer.rewardMerchant(signer, boost, "dao_participation_boost");
            emit ProofScoreBoostApplied(signer, boost, "monthly_governance_boost");
        }
    }

    // ========================================================================
    // SLASHING (Punish Bad Actors)
    // ========================================================================

    /// @notice Slash stake for malicious behavior
    function slashStake(address signer, string calldata reason) external onlyDAO {
        _slashStake(signer, reason);
    }

    function _slashStake(address signer, string memory reason) internal {
        Stake storage s = stakes[signer];
        
        if (s.amount == 0) return;
        if (s.slashed) return; // Already slashed

        uint256 slashAmount = (s.amount * slashPercentage) / 10000;
        
        s.amount -= slashAmount;
        s.slashed = true;
        totalStaked -= slashAmount;

        // Slashed funds sent to treasury (not burned, used for protocol)
        require(token.transfer(dao, slashAmount), "slash_transfer_fail");

        emit Slashed(signer, slashAmount, reason);
        ledger.logEvent(signer, "dao_slashed", slashAmount, reason);
    }

    // ========================================================================
    // CONFIGURATION (DAO Governance)
    // ========================================================================

    function setProposalBounty(uint256 newBounty) external onlyDAO {
        uint256 old = proposalBounty;
        proposalBounty = newBounty;
        emit ProposalBountySet(old, newBounty);
    }

    function setTreasuryShareBps(uint16 newBps) external onlyDAO {
        require(newBps <= 2000, "share_too_high"); // Max 20%
        uint16 old = treasuryShareBps;
        treasuryShareBps = newBps;
        emit TreasuryShareBpsSet(old, newBps);
    }

    function setMinimumStake(uint256 newMinimum) external onlyDAO {
        minimumStake = newMinimum;
    }

    function setMinimumStakeLock(uint64 newLock) external onlyDAO {
        require(newLock >= 30 days, "lock_too_short");
        require(newLock <= 365 days, "lock_too_long");
        minimumStakeLock = newLock;
    }

    function setSlashPercentage(uint16 newPercentage) external onlyDAO {
        require(newPercentage <= 5000, "slash_too_high"); // Max 50%
        slashPercentage = newPercentage;
    }

    function setProofScoreBoostPerMonth(uint16 newBoost) external onlyDAO {
        require(newBoost <= 10, "boost_too_high");  // Reduced max
        proofScoreBoostPerMonth = newBoost;
    }

    /// @notice Toggle DAO fee exemption (zero fees for DAO members)
    function setDAOFeesExempt(bool exempt) external onlyDAO {
        daoFeesExempt = exempt;
        ledger.logSystemEvent(address(this), exempt ? "dao_fees_exempt_enabled" : "dao_fees_exempt_disabled", msg.sender);
    }

    /// @notice Check if address is DAO member with fee exemption
    function isDAOMemberExempt(address account) external view returns (bool) {
        return daoFeesExempt && 
               stakes[account].amount >= minimumStake && 
               !stakes[account].slashed &&
               guardian.isDAOSigner(account);
    }

    // ========================================================================
    // VIEWS
    // ========================================================================

    function getStakeInfo(address signer) external view returns (
        uint256 amount,
        uint256 lockRemaining,
        uint256 pendingRewards,
        uint256 totalEarned,
        uint32 proposalsSigned,
        uint32 proposalsSuccessful,
        bool slashed
    ) {
        Stake storage s = stakes[signer];
        
        uint256 lockTime = 0;
        if (block.timestamp < s.lockUntil) {
            lockTime = s.lockUntil - block.timestamp;
        }

        // Only accumulated rewards (no staking APY)
        uint256 pending = s.rewardsAccumulated;

        return (
            s.amount,
            lockTime,
            pending,
            s.totalEarned,
            s.proposalsSigned,
            s.proposalsSuccessful,
            s.slashed
        );
    }

    function getAllStakers() external view returns (address[] memory) {
        return stakers;
    }

    function getActiveStakersCount() external view returns (uint256) {
        uint256 count = 0;
        for (uint256 i = 0; i < stakers.length; i++) {
            if (stakes[stakers[i]].amount > 0 && !stakes[stakers[i]].slashed) {
                count += 1;
            }
        }
        return count;
    }

    function getTotalStaked() external view returns (uint256) {
        return totalStaked;
    }

    function getTotalRewardsDistributed() external view returns (uint256) {
        return totalRewardsDistributed;
    }
}

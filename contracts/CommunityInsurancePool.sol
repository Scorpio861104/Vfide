// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import "./SharedInterfaces.sol";

/**
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║                     COMMUNITY INSURANCE POOL                              ║
 * ╠═══════════════════════════════════════════════════════════════════════════╣
 * ║  Stake VFIDE to insure high-trust users. If they lose a dispute,          ║
 * ║  the pool covers the loss. Insurers earn premiums from insured users.     ║
 * ║                                                                           ║
 * ║  Trust-based insurance:                                                   ║
 * ║  - Only high-score users can be insured (reduces risk)                    ║
 * ║  - Insurers earn yield proportional to risk taken                         ║
 * ║  - Claims are verified through dispute resolution                         ║
 * ║  - Bad actors are permanently blacklisted                                 ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 */

error CIP_InsufficientStake();
error CIP_NotInsurable();
error CIP_AlreadyInsured();
error CIP_NotInsured();
error CIP_ClaimNotEligible();
error CIP_CooldownActive();
error CIP_InvalidAmount();
error CIP_Unauthorized();
error CIP_BlacklistedUser();
error CIP_PoolInsolvent();

interface IERC20Minimal {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

interface ISeerScore {
    function getScore(address user) external view returns (uint256);
    function getDisputeHistory(address user) external view returns (uint256 won, uint256 lost);
}

contract CommunityInsurancePool {
    
    // ═══════════════════════════════════════════════════════════════════════
    //                              CONSTANTS
    // ═══════════════════════════════════════════════════════════════════════
    
    uint256 public constant MIN_SCORE_FOR_INSURANCE = 6000;  // 60/100 minimum score
    uint256 public constant MAX_COVERAGE_RATIO = 5;          // 5x stake max coverage
    uint256 public constant PREMIUM_RATE_BP = 100;           // 1% annual premium
    uint256 public constant CLAIM_COOLDOWN = 30 days;
    uint256 public constant UNSTAKE_DELAY = 7 days;
    uint256 public constant MAX_CLAIM_RATIO = 80;            // Max 80% of pool per claim
    
    uint256 private constant BP = 10000;
    
    // ═══════════════════════════════════════════════════════════════════════
    //                               STRUCTS
    // ═══════════════════════════════════════════════════════════════════════
    
    struct Insurer {
        uint256 stakedAmount;
        uint256 stakingTimestamp;
        uint256 accumulatedPremiums;
        uint256 lastClaimTimestamp;     // When they were last hit by a claim
        uint256 pendingUnstake;
        uint256 unstakeRequestTime;
    }
    
    struct InsuredUser {
        bool isInsured;
        uint256 coverageAmount;         // Max claim amount
        uint256 premiumPaidUntil;       // Timestamp until which premium is paid
        uint256 lastClaimAt;
        uint256 totalClaimsPaid;
    }
    
    struct Claim {
        address claimant;
        uint256 amount;
        uint256 createdAt;
        bool approved;
        bool rejected;
        bytes32 disputeId;              // Reference to dispute resolution
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    //                              STATE
    // ═══════════════════════════════════════════════════════════════════════
    
    IERC20Minimal public vfide;
    ISeerScore public seer;
    address public dao;
    address public disputeResolver;     // EscrowManager or similar
    
    uint256 public totalStaked;
    uint256 public totalCoverage;
    uint256 public totalPremiumsCollected;
    uint256 public claimNonce;
    
    mapping(address => Insurer) public insurers;
    mapping(address => InsuredUser) public insuredUsers;
    mapping(uint256 => Claim) public claims;
    mapping(address => bool) public blacklisted;
    
    address[] public insurerList;
    mapping(address => uint256) private insurerIndex;
    
    event Staked(address indexed insurer, uint256 amount, uint256 totalStaked);
    event UnstakeRequested(address indexed insurer, uint256 amount);
    event Unstaked(address indexed insurer, uint256 amount);
    event CoverageActivated(address indexed user, uint256 coverageAmount, uint256 premiumPaid);
    event CoverageCancelled(address indexed user);
    event ClaimFiled(uint256 indexed claimId, address indexed claimant, uint256 amount);
    event ClaimApproved(uint256 indexed claimId, uint256 paidAmount);
    event ClaimRejected(uint256 indexed claimId);
    event PremiumsDistributed(uint256 totalAmount, uint256 insurerCount);
    event UserBlacklisted(address indexed user, string reason);
    
    // ═══════════════════════════════════════════════════════════════════════
    //                           CONSTRUCTOR
    // ═══════════════════════════════════════════════════════════════════════
    
    constructor(address _vfide, address _seer, address _disputeResolver, address _dao) {
        require(_vfide != address(0) && _seer != address(0) && _dao != address(0));
        vfide = IERC20Minimal(_vfide);
        seer = ISeerScore(_seer);
        disputeResolver = _disputeResolver;
        dao = _dao;
    }
    
    modifier onlyDAO() {
        if (msg.sender != dao) revert CIP_Unauthorized();
        _;
    }
    
    modifier onlyDisputeResolver() {
        if (msg.sender != disputeResolver) revert CIP_Unauthorized();
        _;
    }
    
    modifier notBlacklisted(address user) {
        if (blacklisted[user]) revert CIP_BlacklistedUser();
        _;
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    //                         INSURER FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Stake VFIDE to become an insurer and earn premiums
     * @param amount Amount of VFIDE to stake
     */
    function stake(uint256 amount) external notBlacklisted(msg.sender) {
        if (amount == 0) revert CIP_InvalidAmount();
        
        Insurer storage insurer = insurers[msg.sender];
        
        // First time staking
        if (insurer.stakedAmount == 0) {
            insurerIndex[msg.sender] = insurerList.length;
            insurerList.push(msg.sender);
        }
        
        insurer.stakedAmount += amount;
        insurer.stakingTimestamp = block.timestamp;
        totalStaked += amount;
        
        require(vfide.transferFrom(msg.sender, address(this), amount), "CIP: transfer failed");
        
        emit Staked(msg.sender, amount, totalStaked);
    }
    
    /**
     * @notice Request to unstake (subject to delay)
     * @param amount Amount to unstake
     */
    function requestUnstake(uint256 amount) external {
        Insurer storage insurer = insurers[msg.sender];
        if (amount == 0 || amount > insurer.stakedAmount) revert CIP_InvalidAmount();
        
        insurer.pendingUnstake = amount;
        insurer.unstakeRequestTime = block.timestamp;
        
        emit UnstakeRequested(msg.sender, amount);
    }
    
    /**
     * @notice Complete unstake after delay
     */
    function completeUnstake() external {
        Insurer storage insurer = insurers[msg.sender];
        if (insurer.pendingUnstake == 0) revert CIP_InvalidAmount();
        if (block.timestamp < insurer.unstakeRequestTime + UNSTAKE_DELAY) revert CIP_CooldownActive();
        
        uint256 amount = insurer.pendingUnstake;
        
        // Check pool solvency after unstake
        uint256 newTotalStaked = totalStaked - amount;
        if (newTotalStaked < totalCoverage / MAX_COVERAGE_RATIO) {
            revert CIP_PoolInsolvent();
        }
        
        insurer.stakedAmount -= amount;
        insurer.pendingUnstake = 0;
        totalStaked -= amount;
        
        // Remove from insurer list if fully unstaked
        if (insurer.stakedAmount == 0) {
            _removeInsurer(msg.sender);
        }
        
        require(vfide.transfer(msg.sender, amount), "CIP: transfer failed");
        
        emit Unstaked(msg.sender, amount);
    }
    
    /**
     * @notice Claim accumulated premiums
     */
    function claimPremiums() external {
        Insurer storage insurer = insurers[msg.sender];
        uint256 premiums = insurer.accumulatedPremiums;
        if (premiums == 0) revert CIP_InvalidAmount();
        
        insurer.accumulatedPremiums = 0;
        require(vfide.transfer(msg.sender, premiums), "CIP: transfer failed");
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    //                      INSURED USER FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Get insurance coverage by paying premium
     * @param coverageAmount Maximum coverage amount
     * @param durationMonths Number of months to insure
     */
    function getInsured(
        uint256 coverageAmount,
        uint256 durationMonths
    ) external notBlacklisted(msg.sender) {
        if (coverageAmount == 0 || durationMonths == 0 || durationMonths > 12) {
            revert CIP_InvalidAmount();
        }
        
        // Check eligibility
        uint256 score = seer.getScore(msg.sender);
        if (score < MIN_SCORE_FOR_INSURANCE) revert CIP_NotInsurable();
        
        // Check pool can cover
        if (totalCoverage + coverageAmount > totalStaked * MAX_COVERAGE_RATIO) {
            revert CIP_PoolInsolvent();
        }
        
        InsuredUser storage user = insuredUsers[msg.sender];
        if (user.isInsured && block.timestamp < user.premiumPaidUntil) {
            revert CIP_AlreadyInsured();
        }
        
        // Calculate premium (1% annual, pro-rated)
        uint256 annualPremium = coverageAmount * PREMIUM_RATE_BP / BP;
        uint256 premium = annualPremium * durationMonths / 12;
        
        // Adjust premium based on score (higher score = lower premium)
        if (score >= 9000) {
            premium = premium * 70 / 100; // 30% discount
        } else if (score >= 8000) {
            premium = premium * 85 / 100; // 15% discount
        }
        
        // Update user
        user.isInsured = true;
        user.coverageAmount = coverageAmount;
        user.premiumPaidUntil = block.timestamp + (durationMonths * 30 days);
        
        totalCoverage += coverageAmount;
        totalPremiumsCollected += premium;
        
        // Collect premium
        require(vfide.transferFrom(msg.sender, address(this), premium), "CIP: premium transfer failed");
        
        // Distribute to insurers (proportional to stake)
        _distributePremiums(premium);
        
        emit CoverageActivated(msg.sender, coverageAmount, premium);
    }
    
    /**
     * @notice Cancel insurance (no refund for remaining period)
     */
    function cancelInsurance() external {
        InsuredUser storage user = insuredUsers[msg.sender];
        if (!user.isInsured) revert CIP_NotInsured();
        
        totalCoverage -= user.coverageAmount;
        user.isInsured = false;
        user.coverageAmount = 0;
        
        emit CoverageCancelled(msg.sender);
    }
    
    /**
     * @notice File a claim after losing a dispute
     * @param amount Claimed loss amount
     * @param disputeId Reference to the dispute resolution
     */
    function fileClaim(uint256 amount, bytes32 disputeId) external {
        InsuredUser storage user = insuredUsers[msg.sender];
        
        if (!user.isInsured || block.timestamp > user.premiumPaidUntil) {
            revert CIP_NotInsured();
        }
        if (amount > user.coverageAmount) revert CIP_InvalidAmount();
        if (user.lastClaimAt != 0 && block.timestamp < user.lastClaimAt + CLAIM_COOLDOWN) {
            revert CIP_CooldownActive();
        }
        
        uint256 claimId = claimNonce++;
        claims[claimId] = Claim({
            claimant: msg.sender,
            amount: amount,
            createdAt: block.timestamp,
            approved: false,
            rejected: false,
            disputeId: disputeId
        });
        
        emit ClaimFiled(claimId, msg.sender, amount);
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    //                        CLAIM RESOLUTION
    // ═══════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Approve a claim (called by dispute resolver or DAO)
     */
    function approveClaim(uint256 claimId) external onlyDisputeResolver {
        Claim storage claim = claims[claimId];
        if (claim.claimant == address(0) || claim.approved || claim.rejected) {
            revert CIP_ClaimNotEligible();
        }
        
        InsuredUser storage user = insuredUsers[claim.claimant];
        
        // Cap payout at pool capacity
        uint256 maxPayout = totalStaked * MAX_CLAIM_RATIO / 100;
        uint256 payout = claim.amount > maxPayout ? maxPayout : claim.amount;
        
        claim.approved = true;
        user.lastClaimAt = block.timestamp;
        user.totalClaimsPaid += payout;
        
        // Reduce coverage
        if (payout >= user.coverageAmount) {
            user.isInsured = false;
            totalCoverage -= user.coverageAmount;
            user.coverageAmount = 0;
        } else {
            user.coverageAmount -= payout;
            totalCoverage -= payout;
        }
        
        // Deduct from staked pool proportionally
        _deductFromPool(payout);
        
        require(vfide.transfer(claim.claimant, payout), "CIP: payout failed");
        
        emit ClaimApproved(claimId, payout);
    }
    
    /**
     * @notice Reject a claim (fraudulent or ineligible)
     */
    function rejectClaim(uint256 claimId) external onlyDisputeResolver {
        Claim storage claim = claims[claimId];
        if (claim.claimant == address(0) || claim.approved || claim.rejected) {
            revert CIP_ClaimNotEligible();
        }
        
        claim.rejected = true;
        
        // Blacklist if fraudulent
        blacklisted[claim.claimant] = true;
        insuredUsers[claim.claimant].isInsured = false;
        
        emit ClaimRejected(claimId);
        emit UserBlacklisted(claim.claimant, "Fraudulent insurance claim");
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    //                         INTERNAL FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════
    
    function _distributePremiums(uint256 amount) internal {
        if (totalStaked == 0) return;
        
        for (uint256 i = 0; i < insurerList.length; i++) {
            address insurerAddr = insurerList[i];
            Insurer storage insurer = insurers[insurerAddr];
            
            if (insurer.stakedAmount > 0) {
                uint256 share = amount * insurer.stakedAmount / totalStaked;
                insurer.accumulatedPremiums += share;
            }
        }
        
        emit PremiumsDistributed(amount, insurerList.length);
    }
    
    function _deductFromPool(uint256 amount) internal {
        if (totalStaked == 0) return;
        
        // Proportionally reduce each insurer's stake
        for (uint256 i = 0; i < insurerList.length; i++) {
            address insurerAddr = insurerList[i];
            Insurer storage insurer = insurers[insurerAddr];
            
            if (insurer.stakedAmount > 0) {
                uint256 deduction = amount * insurer.stakedAmount / totalStaked;
                if (deduction > insurer.stakedAmount) {
                    deduction = insurer.stakedAmount;
                }
                insurer.stakedAmount -= deduction;
                insurer.lastClaimTimestamp = block.timestamp;
            }
        }
        
        totalStaked -= amount;
    }
    
    function _removeInsurer(address addr) internal {
        uint256 index = insurerIndex[addr];
        uint256 lastIndex = insurerList.length - 1;
        
        if (index != lastIndex) {
            address lastInsurer = insurerList[lastIndex];
            insurerList[index] = lastInsurer;
            insurerIndex[lastInsurer] = index;
        }
        
        insurerList.pop();
        delete insurerIndex[addr];
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    //                          VIEW FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════
    
    function getPoolStats() external view returns (
        uint256 _totalStaked,
        uint256 _totalCoverage,
        uint256 _utilizationRatio,
        uint256 _insurerCount,
        uint256 _premiumsCollected
    ) {
        _totalStaked = totalStaked;
        _totalCoverage = totalCoverage;
        _utilizationRatio = totalStaked > 0 ? (totalCoverage * BP) / (totalStaked * MAX_COVERAGE_RATIO) : 0;
        _insurerCount = insurerList.length;
        _premiumsCollected = totalPremiumsCollected;
    }
    
    function getInsurerInfo(address addr) external view returns (
        uint256 stakedAmount,
        uint256 accumulatedPremiums,
        uint256 pendingUnstake,
        uint256 canUnstakeAt
    ) {
        Insurer storage insurer = insurers[addr];
        stakedAmount = insurer.stakedAmount;
        accumulatedPremiums = insurer.accumulatedPremiums;
        pendingUnstake = insurer.pendingUnstake;
        canUnstakeAt = insurer.pendingUnstake > 0 ? insurer.unstakeRequestTime + UNSTAKE_DELAY : 0;
    }
    
    function getInsuredInfo(address addr) external view returns (
        bool isInsured,
        uint256 coverageAmount,
        uint256 premiumPaidUntil,
        uint256 totalClaimsPaid,
        bool isEligibleForClaim
    ) {
        InsuredUser storage user = insuredUsers[addr];
        isInsured = user.isInsured && block.timestamp <= user.premiumPaidUntil;
        coverageAmount = user.coverageAmount;
        premiumPaidUntil = user.premiumPaidUntil;
        totalClaimsPaid = user.totalClaimsPaid;
        isEligibleForClaim = isInsured && 
            (user.lastClaimAt == 0 || block.timestamp >= user.lastClaimAt + CLAIM_COOLDOWN);
    }
    
    function calculatePremium(
        address user,
        uint256 coverageAmount,
        uint256 durationMonths
    ) external view returns (uint256 premium, bool eligible) {
        uint256 score = seer.getScore(user);
        if (score < MIN_SCORE_FOR_INSURANCE || blacklisted[user]) {
            return (0, false);
        }
        
        uint256 annualPremium = coverageAmount * PREMIUM_RATE_BP / BP;
        premium = annualPremium * durationMonths / 12;
        
        if (score >= 9000) {
            premium = premium * 70 / 100;
        } else if (score >= 8000) {
            premium = premium * 85 / 100;
        }
        
        eligible = totalCoverage + coverageAmount <= totalStaked * MAX_COVERAGE_RATIO;
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    //                              ADMIN
    // ═══════════════════════════════════════════════════════════════════════
    
    function setDisputeResolver(address _resolver) external onlyDAO {
        disputeResolver = _resolver;
    }
    
    function removeFromBlacklist(address user) external onlyDAO {
        blacklisted[user] = false;
    }
    
    function emergencyWithdraw(address to) external onlyDAO {
        // Only callable if pool is empty (all unstaked)
        require(totalStaked == 0, "CIP: pool not empty");
        uint256 balance = vfide.balanceOf(address(this));
        if (balance > 0) {
            require(vfide.transfer(to, balance));
        }
    }
}

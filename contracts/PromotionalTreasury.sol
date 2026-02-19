// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import "./VFIDEToken.sol";
import "./SharedInterfaces.sol";

// Note: AccessControl is now defined in SharedInterfaces.sol for zkSync compatibility

interface IERC20Metadata {
    function decimals() external view returns (uint8);
}

/**
 * @title PromotionalTreasury
 * @notice Fixed allocation promotional rewards system with automatic depletion
 * @dev When treasury is empty, promotions automatically end - no inflation, no extensions
 * 
 * ALLOCATION BREAKDOWN (from 200M total supply):
 * - 2M VFIDE (~1%) allocated for ALL promotional activities
 * - Once depleted, promotions permanently end
 * - No minting, no refills, just fair distribution
 */
contract PromotionalTreasury is AccessControl, ReentrancyGuard {
    using SafeERC20 for IERC20;
    
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    
    VFIDEToken public immutable vfideToken;
    IERC20 public rewardToken;
    uint8 public rewardTokenDecimals = 18;

    // Howey-safe mode disables promotional token distributions
    bool public howeySafeMode = true;
    
    // Fixed allocation: 2,000,000 VFIDE for ALL promotions
    uint256 public constant TOTAL_PROMOTIONAL_ALLOCATION = 2_000_000 * 10**18;
    
    // Track remaining budget per category
    uint256 public educationBudgetRemaining;      // 300K VFIDE - Learn & onboard
    uint256 public referralBudgetRemaining;       // 500K VFIDE - Single-level referrals
    uint256 public userMilestoneBudgetRemaining;  // 400K VFIDE - Usage milestones
    uint256 public merchantBudgetRemaining;       // 600K VFIDE - Merchant performance
    uint256 public pioneerBudgetRemaining;        // 200K VFIDE - Pioneer badges
    
    // Total distributed tracking
    uint256 public totalDistributed;
    
    // Individual caps to prevent farming
    mapping(address => uint256) public educationRewardsClaimed;
    mapping(address => uint256) public referralRewardsClaimed;
    mapping(address => uint256) public userMilestoneRewardsClaimed;
    mapping(address => uint256) public merchantRewardsClaimed;
    
    // Referral tracking
    mapping(address => address) public referredBy;
    mapping(address => uint256) public referralCount;
    mapping(address => bool) public hasUsedReferralCode;
    uint256 public constant MAX_REFERRALS_PER_USER = 20;
    
    // Pioneer tracking (first 10,000 users)
    mapping(address => bool) public isPioneer;
    mapping(address => uint256) public pioneerNumber;
    uint256 public totalPioneers;
    uint256 public constant MAX_PIONEERS = 10_000;
    
    // Merchant milestone tracking
    mapping(address => uint256) public merchantVolumeProcessed;
    mapping(address => bool) public merchantMilestoneClaimed;
    
    // Individual reward caps (prevents single user from draining treasury)
    uint256 public constant MAX_EDUCATION_PER_USER = 30 * 10**18;      // 30 VFIDE
    uint256 public constant MAX_REFERRAL_PER_USER = 1000 * 10**18;     // 1,000 VFIDE (20 refs × 50)
    uint256 public constant MAX_USER_MILESTONE_PER_USER = 175 * 10**18; // 175 VFIDE
    uint256 public constant MAX_MERCHANT_REWARDS = 1500 * 10**18;      // 1,500 VFIDE per merchant
    
    // Reward amounts
    uint256 public constant EDUCATION_COMPLETE_PROFILE = 10 * 10**18;
    uint256 public constant EDUCATION_PROOF_SCORE_TUTORIAL = 10 * 10**18;
    uint256 public constant EDUCATION_PAYMENT_TUTORIAL = 10 * 10**18;
    uint256 public constant REFERRAL_SIGNUP_BONUS = 25 * 10**18;
    uint256 public constant REFERRAL_TRANSACTION_BONUS = 25 * 10**18;
    uint256 public constant FIRST_TRANSACTION_BONUS = 25 * 10**18;
    uint256 public constant FIRST_MERCHANT_PAYMENT = 25 * 10**18;
    uint256 public constant FIRST_ENDORSEMENT_GIVEN = 15 * 10**18;
    uint256 public constant FIRST_ENDORSEMENT_RECEIVED = 15 * 10**18;
    uint256 public constant VAULT_CREATED = 50 * 10**18;
    uint256 public constant THREE_MERCHANTS_VISITED = 50 * 10**18;
    uint256 public constant TEN_MERCHANTS_VISITED = 100 * 10**18;
    
    // Merchant volume milestones
    uint256 public constant MERCHANT_1K_VOLUME = 50 * 10**18;   // $1K processed
    uint256 public constant MERCHANT_5K_VOLUME = 200 * 10**18;  // $5K processed
    uint256 public constant MERCHANT_10K_VOLUME = 500 * 10**18; // $10K processed
    
    // Pioneer badge bonus (one-time)
    uint256 public constant PIONEER_BADGE_BONUS = 20 * 10**18;
    
    // Milestone tracking
    mapping(address => bool) public completedProfile;
    mapping(address => bool) public completedProofScoreTutorial;
    mapping(address => bool) public completedPaymentTutorial;
    mapping(address => bool) public madeFirstTransaction;
    mapping(address => bool) public madeFirstMerchantPayment;
    mapping(address => bool) public gaveFirstEndorsement;
    mapping(address => bool) public receivedFirstEndorsement;
    mapping(address => bool) public createdVault;
    mapping(address => uint256) public uniqueMerchantsVisited;
    mapping(address => bool) public claimedThreeMerchants;
    mapping(address => bool) public claimedTenMerchants;
    
    // Events
    event EducationRewardClaimed(address indexed user, string milestone, uint256 amount);
    event ReferralRewardClaimed(address indexed referrer, address indexed referee, uint256 amount);
    event UserMilestoneRewardClaimed(address indexed user, string milestone, uint256 amount);
    event MerchantMilestoneRewardClaimed(address indexed merchant, uint256 volume, uint256 amount);
    event PioneerBadgeAwarded(address indexed user, uint256 pioneerNumber, uint256 bonus);
    event PromotionalBudgetDepleted(string category);
    event BudgetReplenished(string category, uint256 amount);
    event HoweySafeModeUpdated(bool enabled);
    event RewardTokenUpdated(address indexed oldToken, address indexed newToken);

    error PT_HoweySafeMode();
    
    constructor(address _vfideToken, address _admin) {
        require(_vfideToken != address(0), "Invalid token address");
        require(_admin != address(0), "Invalid admin address");
        
        vfideToken = VFIDEToken(_vfideToken);
        rewardToken = IERC20(_vfideToken);
        rewardTokenDecimals = _readTokenDecimals(_vfideToken);
        
        // Initialize budgets
        educationBudgetRemaining = 300_000 * 10**18;
        referralBudgetRemaining = 500_000 * 10**18;
        userMilestoneBudgetRemaining = 400_000 * 10**18;
        merchantBudgetRemaining = 600_000 * 10**18;
        pioneerBudgetRemaining = 200_000 * 10**18;
        
        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(ADMIN_ROLE, _admin);
    }

    function setRewardToken(address token) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(token != address(0), "Invalid token address");
        address oldToken = address(rewardToken);
        rewardToken = IERC20(token);
        rewardTokenDecimals = _readTokenDecimals(token);
        emit RewardTokenUpdated(oldToken, token);
    }

    function setHoweySafeMode(bool enabled) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(enabled, "PT: howey safe only");
        howeySafeMode = true;
        emit HoweySafeModeUpdated(true);
    }

    function _requireHoweyDisabled() internal view {
        if (howeySafeMode) revert PT_HoweySafeMode();
    }
    
    /**
     * @notice Check if promotional treasury is funded
     */
    function isPromotionActive() public view returns (bool) {
        return totalDistributed < TOTAL_PROMOTIONAL_ALLOCATION;
    }
    
    /**
     * @notice Get remaining budget for all categories
     */
    function getRemainingBudgets() external view returns (
        uint256 education,
        uint256 referral,
        uint256 userMilestone,
        uint256 merchant,
        uint256 pioneer,
        uint256 total
    ) {
        return (
            educationBudgetRemaining,
            referralBudgetRemaining,
            userMilestoneBudgetRemaining,
            merchantBudgetRemaining,
            pioneerBudgetRemaining,
            TOTAL_PROMOTIONAL_ALLOCATION - totalDistributed
        );
    }
    
    /**
     * @notice Award pioneer badge to first 10,000 users
     */
    function awardPioneerBadge(address user) external onlyRole(ADMIN_ROLE) {
        require(!isPioneer[user], "Already a pioneer");
        require(totalPioneers < MAX_PIONEERS, "All pioneer slots filled");
        require(pioneerBudgetRemaining >= PIONEER_BADGE_BONUS, "Pioneer budget depleted");
        
        totalPioneers++;
        isPioneer[user] = true;
        pioneerNumber[user] = totalPioneers;
        
        _distributeReward(user, PIONEER_BADGE_BONUS, "pioneer");
        pioneerBudgetRemaining -= PIONEER_BADGE_BONUS;
        
        emit PioneerBadgeAwarded(user, totalPioneers, PIONEER_BADGE_BONUS);
    }
    
    /**
     * @notice Claim education milestone rewards
     */
    function claimEducationReward(string memory milestone) external nonReentrant {
        require(educationRewardsClaimed[msg.sender] < MAX_EDUCATION_PER_USER, "Education cap reached");
        
        uint256 rewardAmount = 0;
        
        if (keccak256(bytes(milestone)) == keccak256(bytes("complete_profile"))) {
            require(!completedProfile[msg.sender], "Already claimed");
            completedProfile[msg.sender] = true;
            rewardAmount = EDUCATION_COMPLETE_PROFILE;
            
        } else if (keccak256(bytes(milestone)) == keccak256(bytes("proof_score_tutorial"))) {
            require(!completedProofScoreTutorial[msg.sender], "Already claimed");
            completedProofScoreTutorial[msg.sender] = true;
            rewardAmount = EDUCATION_PROOF_SCORE_TUTORIAL;
            
        } else if (keccak256(bytes(milestone)) == keccak256(bytes("payment_tutorial"))) {
            require(!completedPaymentTutorial[msg.sender], "Already claimed");
            completedPaymentTutorial[msg.sender] = true;
            rewardAmount = EDUCATION_PAYMENT_TUTORIAL;
        } else {
            revert("Invalid milestone");
        }
        
        require(educationBudgetRemaining >= rewardAmount, "Education budget depleted");
        
        educationRewardsClaimed[msg.sender] += rewardAmount;
        _distributeReward(msg.sender, rewardAmount, "education");
        educationBudgetRemaining -= rewardAmount;
        
        emit EducationRewardClaimed(msg.sender, milestone, rewardAmount);
        
        if (educationBudgetRemaining == 0) {
            emit PromotionalBudgetDepleted("education");
        }
    }
    
    /**
     * @notice Register referral relationship (called when user signs up with code)
     * H-23 Fix: Added check to prevent circular referral chains
     */
    function registerReferral(address referee, address referrer) external onlyRole(ADMIN_ROLE) {
        require(referee != address(0) && referrer != address(0), "Invalid addresses");
        require(referee != referrer, "Cannot refer yourself");
        require(!hasUsedReferralCode[referee], "Already used referral code");
        require(referralCount[referrer] < MAX_REFERRALS_PER_USER, "Referrer cap reached");
        
        // H-23 Fix: Prevent circular referral chains (A refers B who refers A)
        require(referredBy[referrer] != referee, "Circular referral detected");
        
        referredBy[referee] = referrer;
        hasUsedReferralCode[referee] = true;
        referralCount[referrer]++;
        
        // Give signup bonus to both (if budget available)
        if (referralBudgetRemaining >= REFERRAL_SIGNUP_BONUS * 2) {
            _distributeReward(referrer, REFERRAL_SIGNUP_BONUS, "referral");
            _distributeReward(referee, REFERRAL_SIGNUP_BONUS, "referral");
            
            referralRewardsClaimed[referrer] += REFERRAL_SIGNUP_BONUS;
            referralBudgetRemaining -= REFERRAL_SIGNUP_BONUS * 2;
            
            emit ReferralRewardClaimed(referrer, referee, REFERRAL_SIGNUP_BONUS);
        }
    }
    
    /**
     * @notice Claim referral transaction bonus (when referee makes first transaction)
     * DEEP-C-2 FIX: Prevent double-claiming for same referee
     */
    mapping(address => bool) public referralTxBonusClaimed;
    
    function claimReferralTransactionBonus(address referee) external nonReentrant {
        address referrer = referredBy[referee];
        require(referrer == msg.sender, "Not the referrer");
        require(!referralTxBonusClaimed[referee], "Already claimed for this referee"); // DEEP-C-2 FIX
        require(referralRewardsClaimed[referrer] < MAX_REFERRAL_PER_USER, "Referral cap reached");
        require(referralBudgetRemaining >= REFERRAL_TRANSACTION_BONUS, "Referral budget depleted");
        
        referralTxBonusClaimed[referee] = true; // DEEP-C-2 FIX
        _distributeReward(referrer, REFERRAL_TRANSACTION_BONUS, "referral");
        referralRewardsClaimed[referrer] += REFERRAL_TRANSACTION_BONUS;
        referralBudgetRemaining -= REFERRAL_TRANSACTION_BONUS;
        
        emit ReferralRewardClaimed(referrer, referee, REFERRAL_TRANSACTION_BONUS);
        
        if (referralBudgetRemaining == 0) {
            emit PromotionalBudgetDepleted("referral");
        }
    }
    
    /**
     * @notice Claim user milestone rewards
     */
    function claimUserMilestone(string memory milestone) external nonReentrant {
        require(userMilestoneRewardsClaimed[msg.sender] < MAX_USER_MILESTONE_PER_USER, "Milestone cap reached");
        
        uint256 rewardAmount = 0;
        
        if (keccak256(bytes(milestone)) == keccak256(bytes("first_transaction"))) {
            require(!madeFirstTransaction[msg.sender], "Already claimed");
            madeFirstTransaction[msg.sender] = true;
            rewardAmount = FIRST_TRANSACTION_BONUS;
            
        } else if (keccak256(bytes(milestone)) == keccak256(bytes("first_merchant_payment"))) {
            require(!madeFirstMerchantPayment[msg.sender], "Already claimed");
            madeFirstMerchantPayment[msg.sender] = true;
            rewardAmount = FIRST_MERCHANT_PAYMENT;
            
        } else if (keccak256(bytes(milestone)) == keccak256(bytes("first_endorsement_given"))) {
            require(!gaveFirstEndorsement[msg.sender], "Already claimed");
            gaveFirstEndorsement[msg.sender] = true;
            rewardAmount = FIRST_ENDORSEMENT_GIVEN;
            
        } else if (keccak256(bytes(milestone)) == keccak256(bytes("first_endorsement_received"))) {
            require(!receivedFirstEndorsement[msg.sender], "Already claimed");
            receivedFirstEndorsement[msg.sender] = true;
            rewardAmount = FIRST_ENDORSEMENT_RECEIVED;
            
        } else if (keccak256(bytes(milestone)) == keccak256(bytes("vault_created"))) {
            require(!createdVault[msg.sender], "Already claimed");
            createdVault[msg.sender] = true;
            rewardAmount = VAULT_CREATED;
            
        } else if (keccak256(bytes(milestone)) == keccak256(bytes("three_merchants"))) {
            require(!claimedThreeMerchants[msg.sender], "Already claimed");
            require(uniqueMerchantsVisited[msg.sender] >= 3, "Visit 3 merchants first");
            claimedThreeMerchants[msg.sender] = true;
            rewardAmount = THREE_MERCHANTS_VISITED;
            
        } else if (keccak256(bytes(milestone)) == keccak256(bytes("ten_merchants"))) {
            require(!claimedTenMerchants[msg.sender], "Already claimed");
            require(uniqueMerchantsVisited[msg.sender] >= 10, "Visit 10 merchants first");
            claimedTenMerchants[msg.sender] = true;
            rewardAmount = TEN_MERCHANTS_VISITED;
        } else {
            revert("Invalid milestone");
        }
        
        require(userMilestoneBudgetRemaining >= rewardAmount, "User milestone budget depleted");
        
        userMilestoneRewardsClaimed[msg.sender] += rewardAmount;
        _distributeReward(msg.sender, rewardAmount, "user_milestone");
        userMilestoneBudgetRemaining -= rewardAmount;
        
        emit UserMilestoneRewardClaimed(msg.sender, milestone, rewardAmount);
        
        if (userMilestoneBudgetRemaining == 0) {
            emit PromotionalBudgetDepleted("user_milestone");
        }
    }
    
    /**
     * @notice Track merchant visit for exploration rewards
     */
    function recordMerchantVisit(address user, address /*merchant*/) external onlyRole(ADMIN_ROLE) {
        uniqueMerchantsVisited[user]++;
    }
    
    /**
     * @notice Claim merchant volume milestone rewards
     */
    function claimMerchantMilestone(uint256 volumeProcessed) external nonReentrant {
        require(merchantRewardsClaimed[msg.sender] < MAX_MERCHANT_REWARDS, "Merchant cap reached");
        require(!merchantMilestoneClaimed[msg.sender], "Milestone already claimed");
        
        merchantVolumeProcessed[msg.sender] = volumeProcessed;
        merchantMilestoneClaimed[msg.sender] = true;
        
        uint256 rewardAmount = 0;
        
        if (volumeProcessed >= 10_000 * 10**18) {
            rewardAmount = MERCHANT_10K_VOLUME;
        } else if (volumeProcessed >= 5_000 * 10**18) {
            rewardAmount = MERCHANT_5K_VOLUME;
        } else if (volumeProcessed >= 1_000 * 10**18) {
            rewardAmount = MERCHANT_1K_VOLUME;
        } else {
            revert("Insufficient volume");
        }
        
        require(merchantBudgetRemaining >= rewardAmount, "Merchant budget depleted");
        
        merchantRewardsClaimed[msg.sender] += rewardAmount;
        _distributeReward(msg.sender, rewardAmount, "merchant");
        merchantBudgetRemaining -= rewardAmount;
        
        emit MerchantMilestoneRewardClaimed(msg.sender, volumeProcessed, rewardAmount);
        
        if (merchantBudgetRemaining == 0) {
            emit PromotionalBudgetDepleted("merchant");
        }
    }
    
    /**
     * @notice Internal reward distribution
     */
    function _distributeReward(address user, uint256 amount, string memory /*category*/) internal {
        _requireHoweyDisabled();
        require(amount > 0, "Invalid amount");
        require(totalDistributed + amount <= TOTAL_PROMOTIONAL_ALLOCATION, "Total budget exceeded");
        
        totalDistributed += amount;
        rewardToken.safeTransfer(user, _scaleRewardAmount(amount));
    }

    function _scaleRewardAmount(uint256 amount) internal view returns (uint256) {
        if (rewardTokenDecimals == 18) {
            return amount;
        }
        if (rewardTokenDecimals > 18) {
            return amount * (10 ** (rewardTokenDecimals - 18));
        }
        return amount / (10 ** (18 - rewardTokenDecimals));
    }

    function _readTokenDecimals(address token) internal view returns (uint8) {
        try IERC20Metadata(token).decimals() returns (uint8 dec) {
            return dec;
        } catch {
            return 18;
        }
    }
    
    /**
     * @notice Emergency: Replenish specific category (only if DAO approves)
     */
    function replenishBudget(string memory category, uint256 amount) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(amount > 0, "Invalid amount");
        
        if (keccak256(bytes(category)) == keccak256(bytes("education"))) {
            educationBudgetRemaining += amount;
        } else if (keccak256(bytes(category)) == keccak256(bytes("referral"))) {
            referralBudgetRemaining += amount;
        } else if (keccak256(bytes(category)) == keccak256(bytes("user_milestone"))) {
            userMilestoneBudgetRemaining += amount;
        } else if (keccak256(bytes(category)) == keccak256(bytes("merchant"))) {
            merchantBudgetRemaining += amount;
        } else if (keccak256(bytes(category)) == keccak256(bytes("pioneer"))) {
            pioneerBudgetRemaining += amount;
        } else {
            revert("Invalid category");
        }
        
        emit BudgetReplenished(category, amount);
    }
    
    /**
     * @notice Get user's promotional stats
     */
    function getUserStats(address user) external view returns (
        bool _isPioneer,
        uint256 _pioneerNumber,
        uint256 _educationClaimed,
        uint256 _referralClaimed,
        uint256 _milestoneClaimed,
        uint256 _referralsMade,
        bool _canReferMore
    ) {
        return (
            isPioneer[user],
            pioneerNumber[user],
            educationRewardsClaimed[user],
            referralRewardsClaimed[user],
            userMilestoneRewardsClaimed[user],
            referralCount[user],
            referralCount[user] < MAX_REFERRALS_PER_USER
        );
    }
}

// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import "./SharedInterfaces.sol";

/**
 * @title VFIDEBenefits
 * @notice Rewards VFIDE users for commerce activity with FREE ProofScore boosts
 * 
 * Philosophy:
 * - Free incentives only - no circular cashback funded by fees
 * - ProofScore is free reputation that costs nothing to award
 * - Merchants get 100% of payments (0% platform fee)
 * 
 * Commerce flow:
 * 1. Buyer opens escrow with VFIDE
 * 2. Buyer funds escrow
 * 3. Merchant delivers goods/services
 * 4. Buyer releases funds → Merchant gets 100%
 * 5. VFIDEBenefits awards FREE ProofScore to both parties
 */
contract VFIDEBenefits {
    // ═══════════════════════════════════════════════════════════════════════
    //                              ERRORS
    // ═══════════════════════════════════════════════════════════════════════
    error BEN_NotDAO();
    error BEN_NotAuthorized();
    error BEN_Zero();
    error BEN_InvalidRate();

    // ═══════════════════════════════════════════════════════════════════════
    //                              EVENTS
    // ═══════════════════════════════════════════════════════════════════════
    event BenefitConfigured(uint16 buyerScorePerTx, uint16 merchantScorePerTx);
    event ProofScoreAwarded(address indexed user, uint16 points, string reason);
    event AuthorizedCallerSet(address indexed caller, bool authorized);

    // ═══════════════════════════════════════════════════════════════════════
    //                              CONSTANTS
    // ═══════════════════════════════════════════════════════════════════════
    uint16 public constant MAX_SCORE_PER_TX = 50; // Cap score per transaction

    // ═══════════════════════════════════════════════════════════════════════
    //                              STATE
    // ═══════════════════════════════════════════════════════════════════════
    address public immutable dao;
    ISeer public immutable seer;
    IProofLedger public immutable ledger;
    IEcosystemVault public ecosystemVault;

    // Reward rates (FREE ProofScore boosts)
    uint16 public buyerScorePerTx = 2;      // Buyer gets +2 ProofScore per completed tx
    uint16 public merchantScorePerTx = 5;   // Merchant gets +5 ProofScore per completed tx

    // Authorized callers (CommerceEscrow)
    mapping(address => bool) public authorizedCallers;

    // Stats tracking
    uint256 public totalTransactionsRewarded;
    mapping(address => uint256) public userTransactionCount;

    // ═══════════════════════════════════════════════════════════════════════
    //                              MODIFIERS
    // ═══════════════════════════════════════════════════════════════════════
    modifier onlyDAO() {
        _checkDAO();
        _;
    }

    function _checkDAO() internal view {
        if (msg.sender != dao) revert BEN_NotDAO();
    }

    modifier onlyAuthorized() {
        _checkAuthorized();
        _;
    }

    function _checkAuthorized() internal view {
        if (!authorizedCallers[msg.sender] && msg.sender != dao) revert BEN_NotAuthorized();
    }

    // ═══════════════════════════════════════════════════════════════════════
    //                              CONSTRUCTOR
    // ═══════════════════════════════════════════════════════════════════════
    constructor(
        address _dao,
        address _seer,
        address _ledger
    ) {
        if (_dao == address(0) || _seer == address(0)) revert BEN_Zero();
        
        dao = _dao;
        seer = ISeer(_seer);
        ledger = IProofLedger(_ledger);
    }

    // ═══════════════════════════════════════════════════════════════════════
    //                         CONFIGURATION (DAO)
    // ═══════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Set ProofScore reward rates (DAO only)
     * @param _buyerScore ProofScore points for buyer per completed tx
     * @param _merchantScore ProofScore points for merchant per completed tx
     */
    function setBenefitRates(
        uint16 _buyerScore,
        uint16 _merchantScore
    ) external onlyDAO {
        if (_buyerScore > MAX_SCORE_PER_TX) revert BEN_InvalidRate();
        if (_merchantScore > MAX_SCORE_PER_TX) revert BEN_InvalidRate();
        
        buyerScorePerTx = _buyerScore;
        merchantScorePerTx = _merchantScore;
        
        emit BenefitConfigured(_buyerScore, _merchantScore);
    }

    /**
     * @notice Set authorized caller (CommerceEscrow contract)
     */
    function setAuthorizedCaller(address caller, bool authorized) external onlyDAO {
        if (caller == address(0)) revert BEN_Zero();
        authorizedCallers[caller] = authorized;
        emit AuthorizedCallerSet(caller, authorized);
    }

    /**
     * @notice Set EcosystemVault for merchant bonuses
     */
    function setEcosystemVault(address _ecosystemVault) external onlyDAO {
        ecosystemVault = IEcosystemVault(_ecosystemVault);
    }

    // ═══════════════════════════════════════════════════════════════════════
    //                    TRANSACTION REWARDS (called by Escrow)
    // ═══════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Reward both parties after successful escrow release
     * @dev Called by CommerceEscrow.release()
     * @param buyer Buyer address
     * @param merchant Merchant address  
     * @param amount Transaction amount (for logging)
     */
    function rewardTransaction(
        address buyer,
        address merchant,
        uint256 amount
    ) external onlyAuthorized {
        if (buyer == address(0) || merchant == address(0)) revert BEN_Zero();
        // Track stats
        totalTransactionsRewarded++;
        userTransactionCount[buyer]++;
        userTransactionCount[merchant]++;

        // Award FREE ProofScore to buyer
        if (buyerScorePerTx > 0) {
            try seer.reward(buyer, buyerScorePerTx, "commerce_buyer") {
                // slither-disable-next-line reentrancy-events
                emit ProofScoreAwarded(buyer, buyerScorePerTx, "commerce_buyer");
            } catch {}
        }
        
        // Award FREE ProofScore to merchant
        if (merchantScorePerTx > 0) {
            try seer.reward(merchant, merchantScorePerTx, "commerce_merchant") {
                // slither-disable-next-line reentrancy-events
                emit ProofScoreAwarded(merchant, merchantScorePerTx, "commerce_merchant");
            } catch {}
        }
        
        // Trigger EcosystemVault activity tracking (merchant ranking rewards are permanently disabled)
        if (address(ecosystemVault) != address(0)) {
            try ecosystemVault.recordMerchantTransaction(merchant) {} catch {}
            try ecosystemVault.checkHeadhunterReward(merchant) {} catch {}
        }
        
        // Log the event
        if (address(ledger) != address(0)) {
            try ledger.logEvent(buyer, "CommerceReward", amount, "escrow_complete") {} catch {}
        }
    }

    // ═══════════════════════════════════════════════════════════════════════
    //                         VIEW FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Get user's commerce stats
     */
    function getUserStats(address user) external view returns (
        uint256 transactionCount,
        uint16 currentScore
    ) {
        transactionCount = userTransactionCount[user];
        currentScore = seer.getScore(user);
    }

    /**
     * @notice Preview rewards for a transaction
     */
    function previewRewards() external view returns (
        uint16 buyerScore,
        uint16 merchantScore
    ) {
        buyerScore = buyerScorePerTx;
        merchantScore = merchantScorePerTx;
    }
}

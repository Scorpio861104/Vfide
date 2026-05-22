// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import "../SharedInterfaces.sol";

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
// ReentrancyGuard intentionally omitted: this contract records incentives and delegates reward hooks only.
/// @notice VFIDEBenefits
/// @title VFIDEBenefits
/// @author Vfide
contract VFIDEBenefits {
    // ═══════════════════════════════════════════════════════════════════════
    //                              ERRORS
    // ═══════════════════════════════════════════════════════════════════════
    /// @notice BEN_NotDAO
    error BEN_NotDAO();
    /// @notice BEN_NotAuthorized
    error BEN_NotAuthorized();
    /// @notice BEN_Zero
    error BEN_Zero();
    /// @notice BEN_InvalidRate
    error BEN_InvalidRate();

    // ═══════════════════════════════════════════════════════════════════════
    //                              EVENTS
    // ═══════════════════════════════════════════════════════════════════════
    /// @notice BenefitConfigured
    /// @param buyerScorePerTx buyerScorePerTx
    /// @param merchantScorePerTx merchantScorePerTx
    event BenefitConfigured(uint16 buyerScorePerTx, uint16 merchantScorePerTx);
    /// @notice ProofScoreAwarded
    /// @param user user
    /// @param points points
    /// @param reason reason
    event ProofScoreAwarded(address indexed user, uint16 points, string reason);
    /// @notice AuthorizedCallerSet
    /// @param caller caller
    /// @param authorized authorized
    event AuthorizedCallerSet(address indexed caller, bool authorized);

    // ═══════════════════════════════════════════════════════════════════════
    //                              CONSTANTS
    // ═══════════════════════════════════════════════════════════════════════
    /// @notice MAX_SCORE_PER_TX
    uint16 public constant MAX_SCORE_PER_TX = 50; // Cap score per transaction

    // ═══════════════════════════════════════════════════════════════════════
    //                              STATE
    // ═══════════════════════════════════════════════════════════════════════
    /// @notice dao
    address public immutable dao;
    /// @notice seer
    ISeer public immutable seer;
    /// @notice ledger
    IProofLedger public immutable ledger;
    /// @notice ecosystemVault
    IEcosystemVault public ecosystemVault;

    // Reward rates (FREE ProofScore boosts)
    /// @notice buyerScorePerTx
    uint16 public buyerScorePerTx = 2;      // Buyer gets +2 ProofScore per completed tx
    /// @notice merchantScorePerTx
    uint16 public merchantScorePerTx = 5;   // Merchant gets +5 ProofScore per completed tx

    // Authorized callers (CommerceEscrow)
    /// @notice authorizedCallers
    mapping(address => bool) public authorizedCallers;

    // Stats tracking
    /// @notice totalTransactionsRewarded
    uint256 public totalTransactionsRewarded;
    /// @notice userTransactionCount
    mapping(address => uint256) public userTransactionCount;

    // ═══════════════════════════════════════════════════════════════════════
    //                              MODIFIERS
    // ═══════════════════════════════════════════════════════════════════════
    /// @notice onlyDAO
    modifier onlyDAO() {
        _checkDAO();
        _;
    }

    /// @notice _checkDAO
    function _checkDAO() internal view {
        if (msg.sender != dao) revert BEN_NotDAO();
    }

    /// @notice onlyAuthorized
    modifier onlyAuthorized() {
        _checkAuthorized();
        _;
    }

    /// @notice _checkAuthorized
    function _checkAuthorized() internal view {
        if (!authorizedCallers[msg.sender] && msg.sender != dao) revert BEN_NotAuthorized();
    }

    // ═══════════════════════════════════════════════════════════════════════
    //                              CONSTRUCTOR
    // ═══════════════════════════════════════════════════════════════════════
    /// @notice constructor
    /// @param _dao _dao
    /// @param _seer _seer
    /// @param _ledger _ledger
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
     * @param caller caller
     * @param authorized authorized
     */
    function setAuthorizedCaller(address caller, bool authorized) external onlyDAO {
        if (caller == address(0)) revert BEN_Zero();
        authorizedCallers[caller] = authorized;
        emit AuthorizedCallerSet(caller, authorized);
    }

    /**
     * @notice Set EcosystemVault for merchant bonuses
     * @param _ecosystemVault _ecosystemVault
     */
    function setEcosystemVault(address _ecosystemVault) external onlyDAO {
        ecosystemVault = IEcosystemVault(_ecosystemVault);
    }

    // ═══════════════════════════════════════════════════════════════════════
    //                    TRANSACTION REWARDS (called by Escrow)
    // ═══════════════════════════════════════════════════════════════════════
    
    // slither-disable-next-line reentrancy-events
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
        ++totalTransactionsRewarded;
        ++userTransactionCount[buyer];
        ++userTransactionCount[merchant];

        // Award FREE ProofScore to buyer
        if (buyerScorePerTx > 0) {
            try seer.reward(buyer, buyerScorePerTx, "commerce_buyer") {
                emit ProofScoreAwarded(buyer, buyerScorePerTx, "commerce_buyer");
            } catch {}
        }
        
        // Award FREE ProofScore to merchant
        if (merchantScorePerTx > 0) {
            try seer.reward(merchant, merchantScorePerTx, "commerce_merchant") {
                emit ProofScoreAwarded(merchant, merchantScorePerTx, "commerce_merchant");
            } catch {}
        }
        
        // Trigger EcosystemVault activity tracking (merchant ranking rewards are permanently disabled)
        if (address(ecosystemVault) != address(0)) {
            try ecosystemVault.recordMerchantTransaction(merchant) {} catch {}
        }
        
        // Log the event
        if (address(ledger) != address(0)) {
            try ledger.logEvent(buyer, "CommerceReward", amount, "escrow_complete") {} catch { emit LedgerLogFailed(buyer, "CommerceReward"); }
        }
    }

    // ═══════════════════════════════════════════════════════════════════════
    //                         VIEW FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Get user's commerce stats
     * @param user user
     * @return transactionCount transactionCount
     * @return currentScore currentScore
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
     * @return buyerScore buyerScore
     * @return merchantScore merchantScore
     */
    function previewRewards() external view returns (
        uint16 buyerScore,
        uint16 merchantScore
    ) {
        buyerScore = buyerScorePerTx;
        merchantScore = merchantScorePerTx;
    }
}

struct MerchantScore {
        uint16 score; // Merchant-specific score (0-1000)
        uint64 lastUpdate; // Timestamp of the last score update
    }
    mapping(address => MerchantScore) public merchantScores;

    /**
     * StoreScore: Tracks metrics specific to merchant stores
     */
    struct StoreScore {
        uint16 customerSatisfaction; // Score based on customer feedback (0-1000)
        uint16 transactionVolume;    // Score based on transaction activity (0-1000)
        uint16 compliance;           // Score based on adherence to platform rules (0-1000)
        uint64 lastUpdate;           // Timestamp of the last score update
    }

    mapping(address => StoreScore) public storeScores;

    event StoreScoreUpdated(
        address indexed store,
        uint16 customerSatisfaction,
        uint16 transactionVolume,
        uint16 compliance
    );

    function processTransaction(address merchant, uint256 amount) external {
        // ...existing transaction logic...

        // Check Merchant Score eligibility
        MerchantScore memory mScore = merchantScores[merchant];
        if (mScore.score >= 800) {
            uint256 burnFee = calculateBurnFee(amount);
            reimburseBurnFee(merchant, burnFee);
            emit BurnFeeReimbursed(merchant, burnFee);
        }
    }

    /**
     * Notify merchants of reimbursement status
     */
    event ReimbursementNotified(address indexed merchant, uint256 amount);

    /**
     * Enhanced Reimbursement for High-Score Merchants
     */
    function reimburseBurnFee(address merchant, uint256 amount) internal {
        require(merchant != address(0), "Invalid merchant address");
        require(amount > 0, "Invalid reimbursement amount");

        // Transfer the reimbursement amount to the merchant
        IERC20(vfideToken).transfer(merchant, amount);

        // Log the reimbursement
        _logEv(merchant, "burn_fee_reimbursed", amount, "High Merchant Score");
        emit BurnFeeReimbursed(merchant, amount);

        // Notify merchant of reimbursement
        emit ReimbursementNotified(merchant, amount);

        // Bonus reimbursement for exceptional scores
        MerchantScore memory mScore = merchantScores[merchant];
        if (mScore.score >= 950) {
            uint256 bonus = amount / 10; // 10% bonus
            IERC20(vfideToken).transfer(merchant, bonus);
            _logEv(merchant, "bonus_reimbursed", bonus, "Exceptional Merchant Score");
            emit ReimbursementNotified(merchant, bonus);
        }
    }

    event BurnFeeReimbursed(address indexed merchant, uint256 amount);

    /**
     * Update StoreScore metrics
     */
    function updateStoreScore(
        address store,
        uint16 customerSatisfaction,
        uint16 transactionVolume,
        uint16 compliance
    ) external onlyAdmin {
        require(store != address(0), "Invalid store address");
        require(customerSatisfaction <= 1000, "Invalid satisfaction score");
        require(transactionVolume <= 1000, "Invalid transaction volume score");
        require(compliance <= 1000, "Invalid compliance score");

        StoreScore storage score = storeScores[store];
        score.customerSatisfaction = customerSatisfaction;
        score.transactionVolume = transactionVolume;
        score.compliance = compliance;
        score.lastUpdate = uint64(block.timestamp);

        emit StoreScoreUpdated(store, customerSatisfaction, transactionVolume, compliance);
    }

    /**
     * Get overall StoreScore
     */
    function getStoreScore(address store) public view returns (uint16) {
        StoreScore memory score = storeScores[store];
        uint16 overallScore = (score.customerSatisfaction * 40 / 100) +
                              (score.transactionVolume * 40 / 100) +
                              (score.compliance * 20 / 100);
        return overallScore;
    }
}
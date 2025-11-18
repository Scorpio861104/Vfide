// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

/**
 * ProofScoreBurnRouter — VFIDE Ecosystem Burns & Sanctum Router
 * ----------------------------------------------------------
 * Per VFIDE Ecosystem Overview Sections 8.2 & 8.3:
 * - Burns to reduce supply and signal long-term commitment
 * - Sanctum fund receives percentage for charity/impact (e.g., 25% Sanctum, 75% burn)
 * - Dynamic fees based on ProofScore
 * - Implements computeFees interface for VFIDEToken integration
 * - All actions logged for transparency
 */

interface ISeer_BURN { 
    function getScore(address user) external view returns (uint16);
    function highTrustThreshold() external view returns (uint16);
    function lowTrustThreshold() external view returns (uint16);
}

error BURN_Zero();
error BURN_NotDAO();

abstract contract Ownable {
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    address public owner;
    constructor() { owner = msg.sender; emit OwnershipTransferred(address(0), msg.sender); }
    modifier onlyOwner() { require(msg.sender == owner, "not owner"); _; }
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "zero");
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }
}

contract ProofScoreBurnRouter is Ownable {
    event ModulesSet(address seer, address sanctumSink, address burnSink);
    event PolicySet(uint16 baseBurnBps, uint16 baseSanctumBps, uint16 highTrustReduction, uint16 lowTrustPenalty);
    event FeesComputed(address indexed from, address indexed to, uint256 burnAmount, uint256 sanctumAmount, uint16 score);

    ISeer_BURN public seer;
    address public sanctumSink;  // SanctumVault address
    address public burnSink;     // Optional burn sink (if zero, hard burn to address(0))

    // Policy: basis points (100 = 1%)
    // Per overview: suggested split ~25% Sanctum, 75% burn (total ~2-3% of transfers)
    uint16 public baseBurnBps    = 200;  // 2.0% base burn
    uint16 public baseSanctumBps = 50;   // 0.5% base Sanctum
    
    // ProofScore adjustments
    uint16 public highTrustReduction = 50;  // -0.5% for high trust (reduce burn)
    uint16 public lowTrustPenalty    = 150; // +1.5% for low trust (increase burn)
    
    uint16 public maxTotalBps = 500; // 5% max total fees

    constructor(address _seer, address _sanctumSink, address _burnSink) {
        require(_seer != address(0), "zero seer");
        seer = ISeer_BURN(_seer);
        sanctumSink = _sanctumSink;
        burnSink = _burnSink;
        emit ModulesSet(_seer, _sanctumSink, _burnSink);
    }

    // ─────────────────────────── Admin

    function setModules(address _seer, address _sanctumSink, address _burnSink) external onlyOwner {
        if (_seer == address(0)) revert BURN_Zero();
        seer = ISeer_BURN(_seer);
        sanctumSink = _sanctumSink;
        burnSink = _burnSink;
        emit ModulesSet(_seer, _sanctumSink, _burnSink);
    }

    function setPolicy(
        uint16 _baseBurnBps,
        uint16 _baseSanctumBps,
        uint16 _highTrustReduction,
        uint16 _lowTrustPenalty,
        uint16 _maxTotalBps
    ) external onlyOwner {
        require(_maxTotalBps <= 1000, "max too high"); // Max 10%
        require(_baseBurnBps + _baseSanctumBps <= _maxTotalBps, "base exceeds max");
        
        baseBurnBps = _baseBurnBps;
        baseSanctumBps = _baseSanctumBps;
        highTrustReduction = _highTrustReduction;
        lowTrustPenalty = _lowTrustPenalty;
        maxTotalBps = _maxTotalBps;
        
        emit PolicySet(_baseBurnBps, _baseSanctumBps, _highTrustReduction, _lowTrustPenalty);
    }

    /**
     * Dynamic Fee Adjustment
     * Adjust fees based on market conditions
     */
    function adjustFees(uint16 marketVolatility) external onlyOwner {
        require(marketVolatility <= 1000, "Volatility too high"); // Max 10%

        // Adjust base fees dynamically
        baseBurnBps = 200 + (marketVolatility / 10); // Example: Increase by up to 1%
        baseSanctumBps = 50 + (marketVolatility / 20); // Example: Increase by up to 0.5%

        // Ensure total fees do not exceed maxTotalBps
        require(baseBurnBps + baseSanctumBps <= maxTotalBps, "Adjusted fees exceed max");

        emit PolicySet(baseBurnBps, baseSanctumBps, highTrustReduction, lowTrustPenalty);
    }

    /**
     * Refined Dynamic Fee Adjustment
     * Adjust fees based on market conditions with capped increases
     */
    function adjustFeesWithCap(uint16 marketVolatility) external onlyOwner {
        require(marketVolatility <= 1000, "Volatility too high"); // Max 10%

        // Calculate adjustments with gradual scaling
        uint16 volatilityAdjustment = marketVolatility / 10; // Scale: 0.1% per 10% volatility

        // Apply adjustments with caps
        uint16 adjustedBurnBps = 200 + volatilityAdjustment; // Base 2.0% + adjustment
        uint16 adjustedSanctumBps = 50 + (volatilityAdjustment / 2); // Base 0.5% + adjustment

        // Ensure total fees do not exceed maxTotalBps
        require(adjustedBurnBps + adjustedSanctumBps <= maxTotalBps, "Adjusted fees exceed max");

        // Update fees
        baseBurnBps = adjustedBurnBps;
        baseSanctumBps = adjustedSanctumBps;

        emit PolicySet(baseBurnBps, baseSanctumBps, highTrustReduction, lowTrustPenalty);
    }

    /**
     * Liquidity Pool Incentives
     * Redirect a portion of fees to liquidity pools
     */
    function allocateToLiquidityPool(address liquidityPool, uint256 amount) external onlyOwner {
        require(liquidityPool != address(0), "Invalid pool address");
        require(amount > 0, "Amount must be greater than zero");

        // Transfer funds to the liquidity pool
        (bool success, ) = liquidityPool.call{value: amount}("");
        require(success, "Liquidity pool transfer failed");
    }

    /**
     * Emergency Fund Allocation
     * Reserve a portion of the burn fee for liquidity or emergencies
     */
    function allocateEmergencyFund(address emergencyFund, uint256 amount) external onlyOwner {
        require(emergencyFund != address(0), "Invalid fund address");
        require(amount > 0, "Amount must be greater than zero");

        // Transfer funds to the emergency fund
        (bool success, ) = emergencyFund.call{value: amount}("");
        require(success, "Emergency fund transfer failed");
    }

    // ─────────────────────────── Core Interface (for VFIDEToken)

    /**
     * Compute dynamic burn and Sanctum fees based on ProofScore
     * Called by VFIDEToken during transfers
     * 
     * @param from Sender address
     * @param to Recipient address  
     * @param amount Transfer amount
     * @return burnAmount Amount to burn
     * @return sanctumAmount Amount to Sanctum fund
     * @return sanctumSink_ Sanctum vault address
     * @return burnSink_ Burn sink address (zero = hard burn)
     */
    function computeFees(
        address from,
        address to,
        uint256 amount
    ) external view returns (
        uint256 burnAmount,
        uint256 sanctumAmount,
        address sanctumSink_,
        address burnSink_
    ) {
        if (amount == 0) return (0, 0, sanctumSink, burnSink);

        // Delegate fee computation to Seer
        (burnAmount, sanctumAmount) = seer.computeBurnAndSanctumFees(from, amount);

        sanctumSink_ = sanctumSink;
        burnSink_ = burnSink;
    }

    // ─────────────────────────── View Helpers

    /**
     * Preview fees for a given user and amount
     */
    function previewFees(address user, uint256 amount) external view returns (
        uint256 burnAmount,
        uint256 sanctumAmount,
        uint256 netAmount,
        uint16 score
    ) {
        score = seer.getScore(user);

        // Delegate fee preview to Seer
        (burnAmount, sanctumAmount) = seer.previewBurnAndSanctumFees(user, amount);
        netAmount = amount - burnAmount - sanctumAmount;
    }

    /**
     * Get effective burn rate for a user
     */
    function getEffectiveBurnRate(address user) external view returns (uint16 burnBps, uint16 sanctumBps) {
        // Delegate effective burn rate calculation to Seer
        (burnBps, sanctumBps) = seer.getEffectiveBurnAndSanctumRates(user);
    }

    /**
     * Calculate split ratio (for transparency)
     */
    function getSplitRatio() external view returns (uint256 burnPercent, uint256 sanctumPercent) {
        uint256 total = baseBurnBps + baseSanctumBps;
        if (total == 0) return (0, 0);
        
        burnPercent = (baseBurnBps * 100) / total;
        sanctumPercent = (baseSanctumBps * 100) / total;
    }
}
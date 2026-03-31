// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import "./SharedInterfaces.sol";

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

error BURN_Zero();
error BURN_NotDAO();

contract ProofScoreBurnRouter is Ownable, Pausable {
    event ModulesSet(address seer, address sanctumSink, address burnSink, address ecosystemSink);
    event PolicySet(uint16 baseBurnBps, uint16 baseSanctumBps, uint16 baseEcosystemBps, uint16 highTrustReduction, uint16 lowTrustPenalty);
    event FeesComputed(address indexed from, address indexed to, uint256 burnAmount, uint256 sanctumAmount, uint256 ecosystemAmount, uint16 score);
    event SustainabilitySet(uint256 dailyBurnCap, uint256 minimumSupplyFloor, uint16 ecosystemMinBps);
    event MicroTxFeeCeilingSet(uint16 maxBps, uint256 maxAmount);
    event BurnCapReached(uint256 dailyBurned, uint256 dailyCap, uint256 redirectedToEcosystem);
    // L-03: Emitted when seer returns score 0 for a user, which silently applies max fees.
    // Monitoring systems should alert on this — it may indicate a misconfigured seer address.
    event SeerScoreZeroWarning(address indexed user, address indexed seerAddr);

    ISeer public seer;
    address public sanctumSink;   // SanctumVault address
    address public burnSink;      // Optional burn sink (if zero, hard burn to address(0))
    address public ecosystemSink; // EcosystemVault address
    
    // BR-04 FIX: Pending modules with timelock to prevent instant sink replacement
    uint64 public constant MODULE_CHANGE_DELAY = 7 days;
    struct PendingModules {
        address seer_;
        address sanctumSink_;
        address burnSink_;
        address ecosystemSink_;
    }
    PendingModules public pendingModules;
    uint64 public pendingModulesAt;

    // Policy: basis points (100 = 1%)
    uint16 public constant DEFAULT_BURN_BPS = 150;  // 1.5% base burn
    uint16 public constant DEFAULT_SANCTUM_BPS = 5;  // 0.05% base Sanctum
    uint16 public constant DEFAULT_ECOSYSTEM_BPS = 20;  // 0.2% base Ecosystem
    
    uint16 public baseBurnBps = DEFAULT_BURN_BPS;
    uint16 public baseSanctumBps = DEFAULT_SANCTUM_BPS;
    uint16 public baseEcosystemBps = DEFAULT_ECOSYSTEM_BPS;
    
    // Linear fee curve parameters (0-10000 scale)
    // Fee = linear interpolation between minFeeBps and maxFeeBps based on score
    // WHITEPAPER: Low Trust ≤40% (4000), High Trust ≥80% (8000)
    uint16 public constant LOW_SCORE_THRESHOLD = 4000;  // ≤4000 pays max fee (40%)
    uint16 public constant HIGH_SCORE_THRESHOLD = 8000; // ≥8000 pays min fee (80%)
    uint16 public minTotalBps = 25;   // 0.25% minimum fee for score ≥8000
    uint16 public maxTotalBps = 500;  // 5% maximum fee for score ≤4000
    uint16 public microTxFeeCeilingBps = 100; // 1.00% max fee for small payments
    uint256 public microTxMaxAmount = 10 * 1e18;
    
    // BR-05 FIX: Rate limit fee policy changes (max 1 per day)
    uint64 public lastFeePolicyChange;
    uint64 public constant FEE_POLICY_COOLDOWN = 1 days;

    // ═══════════════════════════════════════════════════════════════════════════
    // SUSTAINABILITY CONTROLS - Protects token economy in high/low volume periods
    // ═══════════════════════════════════════════════════════════════════════════
    
    // Daily burn cap to prevent excessive deflation during high volume
    // When cap is reached, excess burns redirect to ecosystem fund
    uint256 public dailyBurnCap = 500_000 * 1e18;  // 0.25% of supply per day max
    
    // Minimum supply floor - burns pause when supply approaches this threshold
    // Ensures long-term token availability
    uint256 public minimumSupplyFloor = 50_000_000 * 1e18;  // 25% of initial supply (50M)
    
    // Minimum ecosystem fee even for high-score users (ensures sustainability)
    uint16 public ecosystemMinBps = 5;  // 0.05% always goes to ecosystem
    
    // Daily tracking for burn cap
    uint256 public currentDayStart;
    uint256 public dailyBurnedAmount;
    
    // Reference to token for supply checking
    address public token;
    
    // ═══════════════════════════════════════════════════════════════════════════
    // VOLUME-ADAPTIVE FEES - Adjusts fees based on market activity
    // ═══════════════════════════════════════════════════════════════════════════
    
    // Low volume threshold - below this, fees increase to maintain ecosystem funding
    uint256 public lowVolumeThreshold = 100_000 * 1e18;   // 100K VFIDE/day = low
    
    // High volume threshold - above this, fees decrease to not over-extract
    uint256 public highVolumeThreshold = 5_000_000 * 1e18; // 5M VFIDE/day = high
    
    // Fee multiplier range (in basis points: 10000 = 1x, 15000 = 1.5x, 5000 = 0.5x)
    uint16 public lowVolumeFeeMultiplier = 12000;  // 1.2x fees when volume is low
    uint16 public highVolumeFeeMultiplier = 8000;  // 0.8x fees when volume is high
    
    // Whether adaptive fees are enabled
    bool public adaptiveFeesEnabled = false;
    
    // Daily volume tracking
    uint256 public dailyVolumeTracked;

    // Note: Scores now on 0-10000 scale for better sensitivity
    struct ScoreSnapshot {
        uint16 score;
        uint64 timestamp;
    }
    mapping(address => ScoreSnapshot[]) public scoreHistory;
    uint64 public constant SCORE_WINDOW = 7 days; // 7-day time-weighted average
    uint256 public constant MAX_SCORE_SNAPSHOTS = 32; // Hard cap to bound score-history iteration gas
    mapping(address => uint64) public lastScoreUpdate;
    mapping(address => uint64) public scoreHistoryLatestTs;
    mapping(address => uint256) public scoreHistoryHead;
    mapping(address => uint16) public cachedTimeWeightedScore;

    function _dayStart(uint256 timestamp) internal pure returns (uint256) {
        return (timestamp / 1 days) * 1 days;
    }

    constructor(address _seer, address _sanctumSink, address _burnSink, address _ecosystemSink) {
        _validateModules(_seer, _sanctumSink, _burnSink, _ecosystemSink);
        seer = ISeer(_seer);
        sanctumSink = _sanctumSink;
        burnSink = _burnSink;
        ecosystemSink = _ecosystemSink;
        currentDayStart = _dayStart(block.timestamp);
        emit ModulesSet(_seer, _sanctumSink, _burnSink, _ecosystemSink);
    }
    
    /**
     * @notice Set token reference for supply checking
     */
    function setToken(address _token) external onlyOwner {
        require(_token != address(0), "zero token");
        token = _token;
    }
    
    /**
     * @notice Configure sustainability parameters
     * @param _dailyBurnCap Maximum tokens to burn per day (0 = unlimited)
     * @param _minimumSupplyFloor Supply floor below which burns pause (0 = no floor)
     * @param _ecosystemMinBps Minimum ecosystem fee in basis points
     */
    function setSustainability(
        uint256 _dailyBurnCap,
        uint256 _minimumSupplyFloor,
        uint16 _ecosystemMinBps
    ) external onlyOwner {
        require(_ecosystemMinBps <= 100, "eco min too high"); // Max 1% minimum
        dailyBurnCap = _dailyBurnCap;
        minimumSupplyFloor = _minimumSupplyFloor;
        ecosystemMinBps = _ecosystemMinBps;
        emit SustainabilitySet(_dailyBurnCap, _minimumSupplyFloor, _ecosystemMinBps);
    }
    
    /**
     * @notice Configure volume-adaptive fee parameters
     * @param _lowVolumeThreshold Below this daily volume = low (fees increase)
     * @param _highVolumeThreshold Above this daily volume = high (fees decrease)
     * @param _lowVolMultiplier Multiplier for low volume (10000 = 1x, 12000 = 1.2x)
     * @param _highVolMultiplier Multiplier for high volume (10000 = 1x, 8000 = 0.8x)
     * @param _enabled Whether adaptive fees are enabled
     */
    function setAdaptiveFees(
        uint256 _lowVolumeThreshold,
        uint256 _highVolumeThreshold,
        uint16 _lowVolMultiplier,
        uint16 _highVolMultiplier,
        bool _enabled
    ) external onlyOwner {
        require(_lowVolumeThreshold <= _highVolumeThreshold, "low > high");
        require(_lowVolMultiplier <= 20000, "low mult max 2x"); // Max 2x
        require(_highVolMultiplier >= 5000, "high mult min 0.5x"); // Min 0.5x
        
        lowVolumeThreshold = _lowVolumeThreshold;
        highVolumeThreshold = _highVolumeThreshold;
        lowVolumeFeeMultiplier = _lowVolMultiplier;
        highVolumeFeeMultiplier = _highVolMultiplier;
        adaptiveFeesEnabled = _enabled;
    }
    
    /**
     * @notice Get current volume multiplier based on daily activity
     * @return multiplier in basis points (10000 = 1x)
     */
    function getVolumeMultiplier() public view returns (uint16) {
        if (!adaptiveFeesEnabled) return 10000; // 1x
        
        uint256 volume = dailyVolumeTracked;
        // Reset if new day
        if (block.timestamp >= currentDayStart + 1 days) {
            volume = 0;
        }
        
        if (volume <= lowVolumeThreshold) {
            return lowVolumeFeeMultiplier;  // Higher fees during low volume
        } else if (volume >= highVolumeThreshold) {
            return highVolumeFeeMultiplier; // Lower fees during high volume
        } else {
            // Linear interpolation between thresholds
            uint256 range = highVolumeThreshold - lowVolumeThreshold;
            uint256 volAboveLow = volume - lowVolumeThreshold;
            uint256 multRange = lowVolumeFeeMultiplier - highVolumeFeeMultiplier;
            return uint16(lowVolumeFeeMultiplier - (volAboveLow * multRange) / range);
        }
    }
    
    /**
     * @notice Get remaining daily burn capacity
     */
    function remainingDailyBurnCapacity() public view returns (uint256) {
        // Check if new day
        if (block.timestamp >= currentDayStart + 1 days) {
            return dailyBurnCap;
        }
        if (dailyBurnedAmount >= dailyBurnCap) {
            return 0;
        }
        return dailyBurnCap - dailyBurnedAmount;
    }
    
    /**
     * @notice Check if burns should be paused (supply floor reached)
     */
    function burnsPaused() public view returns (bool) {
        if (token == address(0) || minimumSupplyFloor == 0) return false;
        uint256 currentSupply = IVFIDEToken(token).totalSupply();
        return currentSupply <= minimumSupplyFloor;
    }

    /**
     * @notice Check whether the configured seer appears responsive.
     * @dev Returns false if seer is unset or returns score 0 for a sample address,
     *      which would silently apply maximum fees to all users (L-03 finding).
     *      Use this in monitoring / keeper scripts before relying on fee computation.
     * @param sampleUser Any user known to have a non-zero ProofScore (e.g. treasury)
     * @return healthy True if seer is set and returns a non-zero score for sampleUser
     */
    function seerHealthy(address sampleUser) external view returns (bool healthy) {
        if (address(seer) == address(0)) return false;
        try seer.getScore(sampleUser) returns (uint16 score) {
            healthy = score > 0;
        } catch {
            healthy = false;
        }
    }

    /**
     * @notice Emit SeerScoreZeroWarning if seer returns 0 for a user.
     * @dev Call this from off-chain monitoring or a keeper when computeFees appears to
     *      apply unexpectedly high fees. Emitting here (rather than in the view) keeps
     *      computeFees gas-free while still producing an on-chain alert trail.
     * @param user Address to probe
     */
    function warnIfSeerMisconfigured(address user) external onlyOwner {
        uint16 score = seer.getScore(user);
        if (score == 0) {
            emit SeerScoreZeroWarning(user, address(seer));
        }
    }

    // ─────────────────────────── Admin

    /// @notice BR-04 FIX: Propose new modules (takes effect after timelock)
    function proposeModules(address _seer, address _sanctumSink, address _burnSink, address _ecosystemSink) external onlyOwner {
        _validateModules(_seer, _sanctumSink, _burnSink, _ecosystemSink);
        pendingModules = PendingModules({
            seer_: _seer,
            sanctumSink_: _sanctumSink,
            burnSink_: _burnSink,
            ecosystemSink_: _ecosystemSink
        });
        pendingModulesAt = uint64(block.timestamp) + MODULE_CHANGE_DELAY;
    }

    /// @notice BR-04 FIX: Apply pending modules after timelock expires
    function applyModules() external onlyOwner {
        require(pendingModulesAt != 0 && block.timestamp >= pendingModulesAt, "BR: timelock");
        _validateModules(
            pendingModules.seer_,
            pendingModules.sanctumSink_,
            pendingModules.burnSink_,
            pendingModules.ecosystemSink_
        );
        seer = ISeer(pendingModules.seer_);
        sanctumSink = pendingModules.sanctumSink_;
        burnSink = pendingModules.burnSink_;
        ecosystemSink = pendingModules.ecosystemSink_;
        emit ModulesSet(address(seer), sanctumSink, burnSink, ecosystemSink);
        delete pendingModules;
        delete pendingModulesAt;
    }

    /// @notice Cancel pending modules change
    function cancelProposeModules() external onlyOwner {
        delete pendingModules;
        delete pendingModulesAt;
    }

    // ─────────────────────────── Admin (LEGACY entrypoint disabled)
    
    function setModules(address, address, address, address) external pure {
        revert("BR: use proposeModules/applyModules");
    }

    function updateScore(address user) external {
        // F-26 FIX: Only Seer can write score history. Removing owner authorization
        // prevents the owner from injecting arbitrary score snapshots to manipulate fees.
        require(msg.sender == address(seer), "only seer");
        
        uint16 currentScore = seer.getScore(user);
        uint64 now_ = uint64(block.timestamp);
        
        ScoreSnapshot memory snap = ScoreSnapshot({
            score: currentScore,
            timestamp: now_
        });
        
        lastScoreUpdate[user] = now_;
        scoreHistoryLatestTs[user] = now_;
        
        uint256 len = scoreHistory[user].length;
        if (len < MAX_SCORE_SNAPSHOTS) {
            scoreHistory[user].push(snap);
        } else {
            uint256 head = scoreHistoryHead[user];
            scoreHistory[user][head] = snap;
            scoreHistoryHead[user] = (head + 1) % MAX_SCORE_SNAPSHOTS;
        }

        // BR-02 FIX: Recompute the weighted score when history changes so
        // transfer-path fee calculation can use an O(1) cached value.
        cachedTimeWeightedScore[user] = _computeTimeWeightedScore(user, now_);
    }

    function _computeTimeWeightedScore(address user, uint64 now_) internal view returns (uint16) {
        uint256 len = scoreHistory[user].length;
        if (len == 0) {
            // No history yet — use cached score (I-13: avoids gas amplification)
            return seer.getCachedScore(user);
        }

        uint64 windowStart = now_ > SCORE_WINDOW ? now_ - SCORE_WINDOW : 0;

        uint64 latestTs = scoreHistoryLatestTs[user];

        // If latest snapshot is older than window, fall back to cached Seer score (I-13)
        if (latestTs < windowStart) {
            return seer.getCachedScore(user);
        }

        // Calculate weighted average using all in-window snapshots
        uint256 totalWeight = 0;
        uint256 weightedSum = 0;

        for (uint256 i = 0; i < len; i++) {
            uint64 snapshotTime = scoreHistory[user][i].timestamp;
            if (snapshotTime < windowStart) continue;

            // For time-weighted, use simple equal weighting since circular buffer
            // doesn't guarantee ordering. Each snapshot contributes equally.
            // Weight by time since snapshot (more recent = higher weight)
            uint64 age = now_ - snapshotTime;
            uint64 weight = age < SCORE_WINDOW ? SCORE_WINDOW - age : 1;

            totalWeight += weight;
            weightedSum += uint256(scoreHistory[user][i].score) * weight;
        }

        if (totalWeight == 0) {
            return seer.getCachedScore(user);
        }

        return uint16(weightedSum / totalWeight);
    }

    function getTimeWeightedScore(address user) public view returns (uint16) {
        if (scoreHistory[user].length == 0) {
            // No history yet — use cached score (I-13: avoids gas amplification)
            return seer.getCachedScore(user);
        }

        uint64 now_ = uint64(block.timestamp);
        uint64 windowStart = now_ > SCORE_WINDOW ? now_ - SCORE_WINDOW : 0;

        // If the cached weighted score is stale, fall back to Seer's current cached score.
        if (scoreHistoryLatestTs[user] < windowStart) {
            return seer.getCachedScore(user);
        }

        return cachedTimeWeightedScore[user];
    }

    /**
     * @notice Calculate fee using continuous linear interpolation
     * @param score User's ProofScore (0-10000)
     * @return totalBps Total fee in basis points
     * 
     * WHITEPAPER Fee curve:
     * - Score ≤4000 (LOW_SCORE_THRESHOLD / 40%): maxTotalBps (5% = 500 bps)
     * - Score ≥8000 (HIGH_SCORE_THRESHOLD / 80%): minTotalBps (0.25% = 25 bps)
     * - Score 4000-8000: Linear interpolation
     * 
     * Formula: fee = maxFee - ((score - lowThreshold) * (maxFee - minFee)) / (highThreshold - lowThreshold)
     */
    function _calculateLinearFee(uint16 score) internal view returns (uint256) {
        if (score <= LOW_SCORE_THRESHOLD) {
            return maxTotalBps; // 5% max fee for low trust (≤40%)
        }
        if (score >= HIGH_SCORE_THRESHOLD) {
            return minTotalBps; // 0.25% min fee for high trust (≥80%)
        }
        
        // Linear interpolation between thresholds
        // fee = maxFee - ((score - 4000) * (500 - 25)) / (8000 - 4000)
        // fee = 500 - ((score - 4000) * 475) / 4000
        uint256 range = HIGH_SCORE_THRESHOLD - LOW_SCORE_THRESHOLD; // 4000
        uint256 feeRange = maxTotalBps - minTotalBps; // 475
        uint256 scoreAboveLow = score - LOW_SCORE_THRESHOLD;
        
        uint256 baseFee = maxTotalBps - (scoreAboveLow * feeRange) / range;
        
        // Apply volume multiplier for adaptive fees
        uint16 volMult = getVolumeMultiplier();
        if (volMult != 10000) {
            baseFee = (baseFee * volMult) / 10000;
            // Ensure fee stays within bounds
            if (baseFee > maxTotalBps) baseFee = maxTotalBps;
            if (baseFee < minTotalBps) baseFee = minTotalBps;
        }
        
        return baseFee;
    }

    /**
     * @notice Update fee curve parameters (DAO controlled)
     */
    function setFeePolicy(
        uint16 _minTotalBps,
        uint16 _maxTotalBps
    ) external onlyOwner {
        // BR-05 FIX: Enforce per-day rate limit on fee policy changes
        require(block.timestamp >= lastFeePolicyChange + FEE_POLICY_COOLDOWN, "BR: fee policy cooldown active");
        require(_minTotalBps <= _maxTotalBps, "min > max");
        require(_maxTotalBps <= 1000, "max cannot exceed 10%");
        // F-27 FIX: Limit rate of change to prevent instantly multiplying fees for value extraction attacks
        if (maxTotalBps > 0) { // Not first-time setup
            require(_maxTotalBps <= maxTotalBps * 2, "BURN: max increase >2x");
            require(_minTotalBps >= minTotalBps / 2 || _minTotalBps == 0, "BURN: min decrease >50%");
        }

        minTotalBps = _minTotalBps;
        maxTotalBps = _maxTotalBps;
        lastFeePolicyChange = uint64(block.timestamp);
        
        emit PolicySet(baseBurnBps, baseSanctumBps, baseEcosystemBps, 0, 0);
    }

    function setMicroTxFeeCeiling(uint16 _maxBps, uint256 _maxAmount) external onlyOwner {
        require(_maxBps <= 500, "BURN: micro ceiling too high");
        microTxFeeCeilingBps = _maxBps;
        microTxMaxAmount = _maxAmount;
        emit MicroTxFeeCeilingSet(_maxBps, _maxAmount);
    }

    // ─────────────────────────── Core Interface (for VFIDEToken)

    /**
     * Compute dynamic burn, Sanctum, and Ecosystem fees based on ProofScore
     * Called by VFIDEToken during transfers
     * 
     * @param from Sender address
     * @param amount Transfer amount
     * @return burnAmount Amount to burn (Deflationary)
     * @return sanctumAmount Amount to Sanctum fund (Charity)
     * @return ecosystemAmount Amount to Ecosystem fund (work compensation + operations)
     * @return sanctumSink_ Sanctum vault address
     * @return ecosystemSink_ Ecosystem vault address
     * @return burnSink_ Burn sink address (zero = hard burn)
     */
    function computeFees(
        address from,
        address /*to*/,
        uint256 amount
    ) public view returns (
        uint256 burnAmount,
        uint256 sanctumAmount,
        uint256 ecosystemAmount,
        address sanctumSink_,
        address ecosystemSink_,
        address burnSink_
    ) {
        if (amount == 0) return (0, 0, 0, sanctumSink, ecosystemSink, burnSink);

        // Get time-weighted ProofScore for sender (primary actor)
        uint16 scoreFrom = getTimeWeightedScore(from);
        
        // Calculate TOTAL fee using continuous linear curve
        // Score ≤4000: max fee (5%), Score ≥8000: min fee (0.25%)
        // Score 4000-8000: linear interpolation
        uint256 totalBps = _calculateLinearFee(scoreFrom);

        // Cap fee for low-value payments to avoid punitive costs on daily commerce.
        if (microTxMaxAmount > 0 && amount <= microTxMaxAmount && totalBps > microTxFeeCeilingBps) {
            totalBps = microTxFeeCeilingBps;
        }
        
        // Split total fee: 40% burn, 10% sanctum, 50% ecosystem
        // Sustainable split to fund: council, fixed work compensation, and operations
        uint256 burnBps = (totalBps * 40) / 100;       // 40% of total (deflationary)
        uint256 sanctumBps = (totalBps * 10) / 100;    // 10% of total (charity)
        uint256 ecosystemBps = totalBps - burnBps - sanctumBps; // 50% remainder (operations)
        
        // Ensure ecosystem always gets minimum (sustainability)
        if (ecosystemBps < ecosystemMinBps) {
            uint256 shortfall = ecosystemMinBps - ecosystemBps;
            ecosystemBps = ecosystemMinBps;
            // Take shortfall from burn portion
            if (burnBps >= shortfall) {
                burnBps -= shortfall;
            } else {
                burnBps = 0;
            }
        }
        
        // Compute burn/sanctum directly from totalBps to avoid chained divide-then-multiply paths.
        // three amounts are derived consistently.  Ecosystem absorbs any rounding dust.
        uint256 totalFee = (amount * totalBps) / 10000;
        burnAmount    = (amount * burnBps) / 10000;
        sanctumAmount = (amount * sanctumBps) / 10000;
        ecosystemAmount = totalFee - burnAmount - sanctumAmount;
        
        // ═══ SUSTAINABILITY CHECKS ═══
        
        // Check if supply floor is reached - redirect burns to ecosystem
        if (burnsPaused() && burnAmount > 0) {
            ecosystemAmount += burnAmount;
            burnAmount = 0;
        }
        
        // Check daily burn cap (view approximation - actual tracking happens on-chain)
        if (dailyBurnCap > 0 && burnAmount > 0) {
            // F-30 FIX: mirror recordBurn() day-boundary behavior in view path.
            // This avoids frontend/quote discrepancies exactly at day rollover boundaries.
            uint256 effectiveDaily = dailyBurnedAmount;
            if (block.timestamp >= currentDayStart + 1 days) {
                effectiveDaily = 0;
            }

            
            // If burn would exceed cap, redirect excess to ecosystem
            if (effectiveDaily + burnAmount > dailyBurnCap) {
                uint256 allowedBurn = 0;
                if (effectiveDaily < dailyBurnCap) {
                    allowedBurn = dailyBurnCap - effectiveDaily;
                }
                uint256 excess = burnAmount - allowedBurn;
                ecosystemAmount += excess;
                burnAmount = allowedBurn;
            }
        }
        
        uint256 totalFees = burnAmount + sanctumAmount + ecosystemAmount;
        require(totalFees <= amount, "BURN: fees exceed amount");
        
        sanctumSink_ = sanctumSink;
        ecosystemSink_ = ecosystemSink;
        burnSink_ = burnSink;
    }

    /**
     * @notice BR-01 FIX: Compute fees and atomically reserve daily burn usage.
     * @dev Called by VFIDEToken in transfer path to remove same-block TOCTOU on burn cap.
     */
    function computeFeesAndReserve(
        address from,
        address to,
        uint256 amount
    ) external whenNotPaused returns (
        uint256 burnAmount,
        uint256 sanctumAmount,
        uint256 ecosystemAmount,
        address sanctumSink_,
        address ecosystemSink_,
        address burnSink_
    ) {
        require(msg.sender == token, "only token");

        // Reuse canonical fee computation via internal call, then reserve burn in the same tx.
        (burnAmount, sanctumAmount, ecosystemAmount, sanctumSink_, ecosystemSink_, burnSink_) =
            computeFees(from, to, amount);

        if (burnAmount > 0) {
            _resetDayIfNeeded();
            dailyBurnedAmount += burnAmount;
        }
    }
    
    /**
     * @notice Update daily burn tracking (called by token after transfer)
     * @dev This allows accurate daily cap enforcement
     */
    function recordBurn(uint256 burnAmount) external whenNotPaused {
        require(msg.sender == token, "only token");
        _resetDayIfNeeded();
        dailyBurnedAmount += burnAmount;
    }
    
    /**
     * @notice Record transfer volume (called by token after transfer)
     * @dev Used for adaptive fee calculations
     */
    function recordVolume(uint256 amount) external whenNotPaused {
        require(msg.sender == token, "only token");
        _resetDayIfNeeded();
        dailyVolumeTracked += amount;
    }

    /// @dev Atomically reset both counters when a new day starts
    function _resetDayIfNeeded() internal {
        if (block.timestamp >= currentDayStart + 1 days) {
            currentDayStart = _dayStart(block.timestamp);
            dailyBurnedAmount = 0;
            dailyVolumeTracked = 0;
        }
    }

    function _validateModules(address _seer, address _sanctumSink, address _burnSink, address _ecosystemSink) internal pure {
        if (_seer == address(0) || _sanctumSink == address(0) || _ecosystemSink == address(0)) {
            revert BURN_Zero();
        }
        require(_sanctumSink != _ecosystemSink, "BR: duplicate sinks");
        if (_burnSink != address(0)) {
            require(_sanctumSink != _burnSink, "BR: duplicate sinks");
            require(_burnSink != _ecosystemSink, "BR: duplicate sinks");
        }
    }
    
    /**
     * @notice Get sustainability status for dashboard
     */
    function getSustainabilityStatus() external view returns (
        uint256 dailyBurned,
        uint256 burnCapacity,
        uint256 dailyVolume,
        uint16 volumeMultiplier,
        bool burnsPausedFlag,
        uint256 supplyFloor,
        uint256 currentSupply
    ) {
        dailyBurned = dailyBurnedAmount;
        burnCapacity = remainingDailyBurnCapacity();
        dailyVolume = dailyVolumeTracked;
        volumeMultiplier = getVolumeMultiplier();
        burnsPausedFlag = burnsPaused();
        supplyFloor = minimumSupplyFloor;
        currentSupply = token != address(0) ? IVFIDEToken(token).totalSupply() : 0;
    }

    // ─────────────────────────── View Helpers

    /**
     * Preview fees for a given user and amount
     */
    function previewFees(address user, uint256 amount) external view returns (
        uint256 burnAmount,
        uint256 sanctumAmount,
        uint256 ecosystemAmount,
        uint256 netAmount,
        uint16 score
    ) {
        score = seer.getScore(user);
        
        (burnAmount, sanctumAmount, ecosystemAmount,,,) = computeFees(user, address(0), amount);
        netAmount = amount - burnAmount - sanctumAmount - ecosystemAmount;
    }

    /**
     * Get effective fee rates for a user (using linear curve)
     */
    function getEffectiveBurnRate(address user) external view returns (uint16 burnBps, uint16 sanctumBps, uint16 ecosystemBps) {
        uint16 score = seer.getScore(user);
        
        // Calculate total fee using linear curve
        uint256 totalBps = _calculateLinearFee(score);
        
        // Split: 40% burn, 10% sanctum, 50% ecosystem
        burnBps = uint16((totalBps * 40) / 100);
        sanctumBps = uint16((totalBps * 10) / 100);
        ecosystemBps = uint16(totalBps - burnBps - sanctumBps);
    }

    /**
     * Get total fee percentage for a given score (for frontend display)
     */
    function getFeeForScore(uint16 score) external view returns (uint256 totalBps, uint256 feePercent) {
        totalBps = _calculateLinearFee(score);
        // Return as percentage with 2 decimal precision (e.g., 175 = 1.75%)
        feePercent = totalBps;
    }

    function pause() external onlyOwner { _pause(); }
    function unpause() external onlyOwner { _unpause(); }

    /**
     * Calculate split ratio (for transparency)
     */
    function getSplitRatio() external pure returns (uint256 burnPercent, uint256 sanctumPercent, uint256 ecosystemPercent) {
        // Mirrors computeFees split: 40% burn / 10% sanctum / 50% ecosystem.
        return (40, 10, 50);
    }}
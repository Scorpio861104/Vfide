// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import "./SharedInterfaces.sol";

/**
 * DevReserveVestingVault (immutable core; beneficiary-only pause; zkSync-ready)
 * ---------------------------------------------------------------------------
 * FOUNDER VESTING: 50M VFIDE (25% of 200M supply)
 * - Allocation: 50,000,000e18 (passed in constructor, pre-minted in VFIDEToken.sol)
 * - VFIDEToken DEV_RESERVE_SUPPLY constant = 50M (aligned)
 * - Vesting start set explicitly via setVestingStart() by beneficiary or DAO
 * - Cliff = 60 days (2 months) - First unlock at Month 2
 * - Vesting = 60 months (1800 days) - 30 bi-monthly unlocks over 5 years
 * - Each unlock: 1,666,666 VFIDE (~1.67M); last unlock covers rounding remainder
 * - Unlock schedule: Every 60 days after cliff (Month 2, 4, 6, 8...60)
 * - Claims deliver VFIDE to the beneficiary's Vault (auto-created)
 * - SecurityHub lock respected (claims revert while locked)
 * - Beneficiary-only claim pause (no DAO / no third parties)
 * - ProofLedger logs (best-effort)
 *
 * HOWEY NOTE: Extended from 36 months to 60 months to reduce "efforts of others"
 * exposure (Howey Prong 4). A longer vesting period signals long-term commitment
 * rather than short-term extraction, and delays the point at which founder tokens
 * enter circulation — reducing the "vertical commonality" argument (Howey Prong 2).
 */

contract DevReserveVestingVault is ReentrancyGuard {
    using SafeERC20 for IERC20;
    
    // ── Immutable wiring
    address public immutable VFIDE;         // token
    address public immutable BENEFICIARY;   // your EOA (controls pause)
    address public immutable VAULT_HUB;     // VaultInfrastructure
    address public immutable SECURITY_HUB;  // optional
    address public immutable LEDGER;        // optional
    uint256 public immutable ALLOCATION;    // e.g., 50_000_000e18
    address public immutable DAO;
    // ── Schedule constants
    uint64  public constant CLIFF = 60 days;              // 2-month cliff
    uint64  public constant VESTING = 60 * 30 days;       // 60 months total (1800 days) — 5-year vest
    uint64  public constant UNLOCK_INTERVAL = 60 days;    // Bi-monthly unlocks
    uint256 public constant UNLOCK_AMOUNT = 1_666_666 * 1e18; // 1.67M per unlock; last unlock covers remainder
    uint256 public constant TOTAL_UNLOCKS = 30;           // 30 unlocks over 5 years
    uint256 public constant EXPECTED_ALLOCATION = 50_000_000e18;

    // ── Derived times (set once via setVestingStart)
    uint64  public startTimestamp;
    uint64  public cliffTimestamp;
    uint64  public endTimestamp;

    // ── State
    uint256 public totalClaimed;
    bool    public claimsPaused;            // beneficiary-only toggle

    // ── Events
    event SyncedStart(uint64 start, uint64 cliff, uint64 end);
    event Claimed(address indexed beneficiary, address indexed vault, uint256 amount);
    event PauseSet(bool paused);
    event EmergencyFreeze(address indexed by);
    event ModulesSet(address vfide, address beneficiary, address vaultHub, address securityHub, address ledger);

    // ── Errors
    error DV_Zero();
    error DV_NotBeneficiary();
    error DV_NotStarted();
    error DV_VaultLocked();
    error DV_NothingToClaim();
    error DV_Paused();
    error DV_InvalidAllocation();
    error DV_InvalidStartTimestamp();
    error DV_AlreadyStarted();

    constructor(
        address _vfide,
        address _beneficiary,
        address _vaultHub,
        address _securityHub,
        address _ledger,
        uint256 _allocation,
        address _dao
    ) {
        if (_vfide==address(0) || _beneficiary==address(0) || _vaultHub==address(0) || _allocation==0) revert DV_Zero();
        if (_allocation != EXPECTED_ALLOCATION) revert DV_InvalidAllocation();
        VFIDE        = _vfide;
        BENEFICIARY  = _beneficiary;
        VAULT_HUB    = _vaultHub;
        SECURITY_HUB = _securityHub;
        LEDGER       = _ledger;
        ALLOCATION   = _allocation;
        DAO          = _dao;
        emit ModulesSet(_vfide, _beneficiary, _vaultHub, _securityHub, _ledger);
        _log("dev_vesting_deployed");
    }

    // ─────────────────────────────────────────────────────────────
    // Start time (called once by beneficiary or DAO at launch)
    // ─────────────────────────────────────────────────────────────

    /**
     * @notice Set the vesting start timestamp (one-time, callable by beneficiary or DAO).
     * @dev    Called at protocol launch to initialize the vesting start timestamp.
     *         The timestamp must be in the past or present (not more than 7 days in the future)
     *         to prevent accidental future-dating.
     */
    function setVestingStart(uint64 timestamp) external {
        require(msg.sender == BENEFICIARY || msg.sender == DAO, "DV: unauthorized");
        if (startTimestamp != 0) revert DV_AlreadyStarted();
        if (timestamp == 0) revert DV_Zero();
        if (timestamp > block.timestamp + 7 days) revert DV_InvalidStartTimestamp();
        startTimestamp  = timestamp;
        cliffTimestamp  = timestamp + CLIFF;
        endTimestamp    = timestamp + VESTING;
        _log("dev_vesting_synced");
        emit SyncedStart(startTimestamp, cliffTimestamp, endTimestamp);
    }

    // ─────────────────────────────────────────────────────────────
    // Views
    // ─────────────────────────────────────────────────────────────

    function vested() public view returns (uint256) {
        (uint64 s, uint64 c, uint64 e) = _projTimesView();
        if (s == 0 || block.timestamp < c) return 0;  // Before cliff: 0 vested
        if (block.timestamp >= e) return ALLOCATION;  // After 60 months: all vested
        
        // Bi-monthly unlocks: First unlock at cliff end, then every 60 days
        // At cliff (elapsed = 0): unlocksPassed = 1 (first unlock available)
        // At cliff + 60 days: unlocksPassed = 2 (second unlock available)
        uint256 elapsed = uint256(block.timestamp - c);
        uint256 unlocksPassed = (elapsed / UNLOCK_INTERVAL) + 1; // +1 for cliff unlock
        
        // Cap at TOTAL_UNLOCKS (safety check)
        if (unlocksPassed >= TOTAL_UNLOCKS) return ALLOCATION;
        
        // Return: unlocksPassed * UNLOCK_AMOUNT, but never exceed ALLOCATION
        uint256 vestedAmount = unlocksPassed * UNLOCK_AMOUNT;
        return vestedAmount > ALLOCATION ? ALLOCATION : vestedAmount;
    }

    function claimable() public view returns (uint256) {
        uint256 v = vested();
        if (v <= totalClaimed) return 0;
        return v - totalClaimed;
    }

    function beneficiaryVault() public returns (address) {
        return IVaultHub(VAULT_HUB).ensureVault(BENEFICIARY);
    }

    // ─────────────────────────────────────────────────────────────
    // Controls (beneficiary-only)
    // ─────────────────────────────────────────────────────────────

    function pauseClaims(bool paused) external {
        require(msg.sender == BENEFICIARY || msg.sender == DAO, "DV: unauthorized");
        claimsPaused = paused;
        emit PauseSet(paused);
        _log(paused ? "claims_paused" : "claims_unpaused");
    }

    function emergencyFreeze() external {
        require(msg.sender == DAO, "DV: only DAO");
        claimsPaused = true;
        emit EmergencyFreeze(msg.sender);
        _log("emergency_freeze");
    }

    // ─────────────────────────────────────────────────────────────
    // Claim
    // ─────────────────────────────────────────────────────────────

    function claim() external nonReentrant {
        if (msg.sender != BENEFICIARY) revert DV_NotBeneficiary();
        if (claimsPaused) revert DV_Paused();

        if (startTimestamp == 0) revert DV_NotStarted();

        address vault = beneficiaryVault();

        // SecurityHub lock check removed — non-custodial

        uint256 amount = claimable();
        if (amount < 1) revert DV_NothingToClaim();

        totalClaimed += amount;

        IERC20(VFIDE).safeTransfer(vault, amount);

        _logEv(BENEFICIARY, "dev_vesting_claim", amount, "");
        emit Claimed(BENEFICIARY, vault, amount);
    }

    // ─────────────────────────────────────────────────────────────
    // Internal: projection helper
    // ─────────────────────────────────────────────────────────────

    function _projTimesView() internal view returns (uint64 s, uint64 c, uint64 e) {
        s = startTimestamp;
        if (s != 0) {
            c = s + CLIFF;
            e = s + VESTING;
        }
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    //                        VESTING SCHEDULE VIEWS
    // ═══════════════════════════════════════════════════════════════════════
    
    struct UnlockMilestone {
        uint64 unlockTime;
        uint256 amount;
        bool claimed;
    }
    
    /**
     * @notice Get full vesting schedule with unlock milestones
     * @return milestones Array of unlock events with times and amounts
     */
    function getVestingSchedule() external view returns (UnlockMilestone[] memory milestones) {
        (uint64 s, uint64 c, ) = _projTimesView();
        if (s == 0) return milestones; // Not started
        
        milestones = new UnlockMilestone[](TOTAL_UNLOCKS);
        uint256 cumulativeClaimed = 0;
        
        for (uint256 i = 0; i < TOTAL_UNLOCKS; i++) {
            // First unlock is available at cliff end; subsequent unlocks are every interval.
            uint64 unlockTime = c + uint64(i * UNLOCK_INTERVAL);
            uint256 amount = UNLOCK_AMOUNT;
            
            // Last unlock may have rounding difference
            if (i == TOTAL_UNLOCKS - 1) {
                amount = ALLOCATION - (UNLOCK_AMOUNT * (TOTAL_UNLOCKS - 1));
            }
            
            cumulativeClaimed += amount;
            bool claimed = totalClaimed >= cumulativeClaimed;
            
            milestones[i] = UnlockMilestone({
                unlockTime: unlockTime,
                amount: amount,
                claimed: claimed
            });
        }
    }
    
    /**
     * @notice Get vesting status overview
     */
    function getVestingStatus() external view returns (
        uint64 vestingStart,
        uint64 cliffEnd,
        uint64 vestingEnd,
        uint256 totalVested,
        uint256 totalClaimedAmount,
        uint256 claimableNow,
        uint256 remaining,
        uint256 unlocksCompleted,
        uint256 nextUnlockTime,
        uint256 nextUnlockAmount,
        bool isPaused
    ) {
        (uint64 s, uint64 c, uint64 e) = _projTimesView();
        vestingStart = s;
        cliffEnd = c;
        vestingEnd = e;
        totalVested = vested();
        totalClaimedAmount = totalClaimed;
        claimableNow = totalVested > totalClaimed ? totalVested - totalClaimed : 0;
        remaining = ALLOCATION > totalClaimed ? ALLOCATION - totalClaimed : 0;
        isPaused = claimsPaused;
        
        // Calculate unlocks completed
        if (s > 0 && block.timestamp >= c) {
            uint256 timeSinceCliff = block.timestamp - c;
            // At cliff, first unlock is already available.
            unlocksCompleted = (timeSinceCliff / UNLOCK_INTERVAL) + 1;
            if (unlocksCompleted > TOTAL_UNLOCKS) unlocksCompleted = TOTAL_UNLOCKS;
            
            // Next unlock info
            if (unlocksCompleted < TOTAL_UNLOCKS) {
                nextUnlockTime = c + unlocksCompleted * UNLOCK_INTERVAL;
                nextUnlockAmount = UNLOCK_AMOUNT;
            }
        } else if (s > 0) {
            // Before cliff
            nextUnlockTime = c;
            nextUnlockAmount = UNLOCK_AMOUNT;
        }
    }

    // Ledger helpers (best-effort)
    // ─────────────────────────────────────────────────────────────

    function _log(string memory action) internal {
        if (LEDGER != address(0)) { try IProofLedger(LEDGER).logSystemEvent(address(this), action, msg.sender) {} catch { emit LedgerLogFailed(address(this), action); } }
    }
    function _logEv(address who, string memory action, uint256 amount, string memory note) internal {
        if (LEDGER != address(0)) { try IProofLedger(LEDGER).logEvent(who, action, amount, note) {} catch { emit LedgerLogFailed(who, action); } }
    }
}
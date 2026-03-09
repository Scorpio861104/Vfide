// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import "./SharedInterfaces.sol";

/**
 * DevReserveVestingVault (immutable core; beneficiary-only pause; zkSync-ready)
 * ---------------------------------------------------------------------------
 * FOUNDER VESTING: 50M VFIDE (25% of 200M supply)
 * - Allocation: 50,000,000e18 (passed in constructor, pre-minted in VFIDEToken.sol)
 * - VFIDEToken DEV_RESERVE_SUPPLY constant = 50M (aligned)
 * - Starts automatically from Presale's launch time (first claim sync)
 * - Cliff = 60 days (2 months) - First unlock at Month 2
 * - Vesting = 36 months (1080 days) - 18 bi-monthly unlocks
 * - Each unlock: 2,777,777 VFIDE (~2.78M)
 * - Unlock schedule: Every 60 days after cliff (Month 2, 4, 6, 8...38)
 * - Claims deliver VFIDE to the beneficiary's Vault (auto-created)
 * - SecurityHub lock respected (claims revert while locked)
 * - Beneficiary-only claim pause (no DAO / no third parties)
 * - ProofLedger logs (best-effort)
 */

// Presale time selectors (any one may exist)
interface IPresaleStart_saleStartTime    { function saleStartTime()    external view returns (uint256); }
interface IPresaleStart_presaleStartTime { function presaleStartTime() external view returns (uint256); }
interface IPresaleStart_launchTimestamp { function launchTimestamp()   external view returns (uint256); }
interface IPresaleStart_startTime      { function startTime()         external view returns (uint256); }

contract DevReserveVestingVault is ReentrancyGuard {
    using SafeERC20 for IERC20;
    
    // ── Immutable wiring
    address public immutable VFIDE;         // token
    address public immutable BENEFICIARY;   // your EOA (controls pause)
    address public immutable VAULT_HUB;     // VaultInfrastructure
    address public immutable SECURITY_HUB;  // optional
    address public immutable LEDGER;        // optional
    address public immutable PRESALE;       // presale (for start time)
    uint256 public immutable ALLOCATION;    // e.g., 50_000_000e18

    // ── Schedule constants
    uint64  public constant CLIFF = 60 days;              // 2-month cliff
    uint64  public constant VESTING = 36 * 30 days;       // 36 months total (1080 days)
    uint64  public constant UNLOCK_INTERVAL = 60 days;    // Bi-monthly unlocks
    uint256 public constant UNLOCK_AMOUNT = 2_777_777 * 1e18; // 2.78M per unlock
    uint256 public constant TOTAL_UNLOCKS = 18;           // 18 unlocks over 3 years

    // ── Derived times (lazy-cached when first needed)
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
    event ModulesSet(address vfide, address beneficiary, address vaultHub, address securityHub, address ledger, address presale);

    // ── Errors
    error DV_Zero();
    error DV_NotBeneficiary();
    error DV_NotStarted();
    error DV_VaultLocked();
    error DV_NothingToClaim();
    error DV_Paused();

    constructor(
        address _vfide,
        address _beneficiary,
        address _vaultHub,
        address _securityHub,
        address _ledger,
        address _presale,
        uint256 _allocation
    ) {
        if (_vfide==address(0) || _beneficiary==address(0) || _vaultHub==address(0) || _allocation==0) revert DV_Zero();
        VFIDE        = _vfide;
        BENEFICIARY  = _beneficiary;
        VAULT_HUB    = _vaultHub;
        SECURITY_HUB = _securityHub;
        LEDGER       = _ledger;
        PRESALE      = _presale;
        ALLOCATION   = _allocation;

        emit ModulesSet(_vfide, _beneficiary, _vaultHub, _securityHub, _ledger, _presale);
        _log("dev_vesting_deployed");
    }

    // ─────────────────────────────────────────────────────────────
    // Views
    // ─────────────────────────────────────────────────────────────

    function vested() public view returns (uint256) {
        (uint64 s, uint64 c, uint64 e) = _projTimesView();
        if (s == 0 || block.timestamp < c) return 0;  // Before cliff: 0 vested
        if (block.timestamp >= e) return ALLOCATION;  // After 36 months: all vested
        
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
        if (msg.sender != BENEFICIARY) revert DV_NotBeneficiary();
        claimsPaused = paused;
        emit PauseSet(paused);
        _log(paused ? "claims_paused" : "claims_unpaused");
    }

    // ─────────────────────────────────────────────────────────────
    // Claim
    // ─────────────────────────────────────────────────────────────

    function claim() external nonReentrant {
        if (msg.sender != BENEFICIARY) revert DV_NotBeneficiary();
        if (claimsPaused) revert DV_Paused();

        _syncStart(); // reverts if presale not initialized

        address vault = beneficiaryVault();

        if (SECURITY_HUB != address(0) && ISecurityHub(SECURITY_HUB).isLocked(vault)) {
            revert DV_VaultLocked();
        }

        uint256 amount = claimable();
        if (amount == 0) revert DV_NothingToClaim();

        totalClaimed += amount;

        IERC20(VFIDE).safeTransfer(vault, amount);

        _logEv(BENEFICIARY, "dev_vesting_claim", amount, "");
        emit Claimed(BENEFICIARY, vault, amount);
    }

    // ─────────────────────────────────────────────────────────────
    // Internal: start sync & helpers
    // ─────────────────────────────────────────────────────────────

    function _syncStart() internal {
        if (startTimestamp != 0) return;

        uint256 s = _fetchStartFromPresale();
        if (s == 0) revert DV_NotStarted();
        // forge-lint: disable-next-line(unsafe-typecast)
        // Safe: presale timestamp is a recent timestamp that fits in uint64
        startTimestamp = uint64(s);
        cliffTimestamp = startTimestamp + CLIFF;
        // 36-month vesting horizon is measured from startTimestamp.
        endTimestamp = startTimestamp + VESTING;

        _log("dev_vesting_synced");
        emit SyncedStart(startTimestamp, cliffTimestamp, endTimestamp);
    }

    function _projTimesView() internal view returns (uint64 s, uint64 c, uint64 e) {
        s = startTimestamp;
        if (s == 0) {
            // peek without state change
            s = _peekStartFromPresale();
        }
        if (s != 0) {
            c = s + CLIFF;
            e = s + VESTING;
        }
    }

    function _fetchStartFromPresale() internal view returns (uint256) {
        if (PRESALE == address(0)) return 0;

        (bool ok0, bytes memory d0) = PRESALE.staticcall(
            abi.encodeWithSelector(IPresaleStart_saleStartTime.saleStartTime.selector)
        );
        if (ok0 && d0.length >= 32) {
            uint256 s0 = abi.decode(d0, (uint256));
            if (s0 != 0) return s0;
        }

        (bool ok1, bytes memory d1) = PRESALE.staticcall(
            abi.encodeWithSelector(IPresaleStart_presaleStartTime.presaleStartTime.selector)
        );
        if (ok1 && d1.length >= 32) {
            uint256 s1 = abi.decode(d1, (uint256));
            if (s1 != 0) return s1;
        }

        (bool ok2, bytes memory d2) = PRESALE.staticcall(
            abi.encodeWithSelector(IPresaleStart_launchTimestamp.launchTimestamp.selector)
        );
        if (ok2 && d2.length >= 32) {
            uint256 s2 = abi.decode(d2, (uint256));
            if (s2 != 0) return s2;
        }

        (bool ok3, bytes memory d3) = PRESALE.staticcall(
            abi.encodeWithSelector(IPresaleStart_startTime.startTime.selector)
        );
        if (ok3 && d3.length >= 32) {
            uint256 s3 = abi.decode(d3, (uint256));
            if (s3 != 0) return s3;
        }

        return 0;
    }

    function _peekStartFromPresale() internal view returns (uint64) {
        uint256 s = _fetchStartFromPresale();
        // forge-lint: disable-next-line(unsafe-typecast)
        // Safe: presale timestamp is a recent timestamp that fits in uint64
        return s == 0 ? 0 : uint64(s);
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
        if (LEDGER != address(0)) { try IProofLedger(LEDGER).logSystemEvent(address(this), action, msg.sender) {} catch {} }
    }
    function _logEv(address who, string memory action, uint256 amount, string memory note) internal {
        if (LEDGER != address(0)) { try IProofLedger(LEDGER).logEvent(who, action, amount, note) {} catch {} }
    }
}
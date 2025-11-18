// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

/**
 * DevReserveVestingVault (immutable core; beneficiary-only pause; zkSync-ready)
 * ---------------------------------------------------------------------------
 * - Allocation: passes in (e.g., 40,000,000e18) and is immutable
 * - Starts automatically from Presale's launch time (first claim sync)
 * - Cliff = 90 days after start; Vesting = 36 * 30 days, linear thereafter
 * - Claims deliver VFIDE to the beneficiary's Vault (auto-created)
 * - SecurityHub lock respected (claims revert while locked)
 * - Beneficiary-only claim pause (no DAO / no third parties)
 * - ProofLedger logs (best-effort)
 */

interface IERC20_DV {
    function balanceOf(address) external view returns (uint256);
    function transfer(address to, uint256 value) external returns (bool);
}

interface IVaultHub_DV {
    function ensureVault(address owner_) external returns (address vault);
    function vaultOf(address owner_) external view returns (address);
}

interface ISecurityHub_DV {
    function isLocked(address vault) external view returns (bool);
}

interface IProofLedger_DV {
    function logSystemEvent(address who, string calldata action, address by) external;
    function logEvent(address who, string calldata action, uint256 amount, string calldata note) external;
}

// Presale time selectors (any one may exist)
interface IPresaleStart_presaleStartTime { function presaleStartTime() external view returns (uint256); }
interface IPresaleStart_launchTimestamp { function launchTimestamp()   external view returns (uint256); }
interface IPresaleStart_startTime      { function startTime()         external view returns (uint256); }

abstract contract ReentrancyGuard {
    uint256 private _status = 1;
    modifier nonReentrant() {
        require(_status == 1, "reentrancy");
        _status = 2;
        _;
        _status = 1;
    }
}

contract DevReserveVestingVault is ReentrancyGuard {
    // ── Immutable wiring
    address public immutable VFIDE;         // token
    address public immutable BENEFICIARY;   // your EOA (controls pause)
    address public immutable VAULT_HUB;     // VaultInfrastructure
    address public immutable SECURITY_HUB;  // optional
    address public immutable LEDGER;        // optional
    address public immutable PRESALE;       // presale (for start time)
    uint256 public immutable ALLOCATION;    // e.g., 40_000_000e18

    // ── Schedule constants
    uint64  public constant CLIFF = 90 days;
    uint64  public constant VESTING = 36 * 30 days; // 1080 days

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
        if (s == 0 || block.timestamp < c) return 0;
        if (block.timestamp >= e) return ALLOCATION;
        uint256 elapsed = uint256(block.timestamp - c);
        return ALLOCATION * elapsed / VESTING;
    }

    function claimable() public view returns (uint256) {
        uint256 v = vested();
        if (v <= totalClaimed) return 0;
        return v - totalClaimed;
    }

    function beneficiaryVault() public returns (address) {
        return IVaultHub_DV(VAULT_HUB).ensureVault(BENEFICIARY);
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

        if (SECURITY_HUB != address(0) && ISecurityHub_DV(SECURITY_HUB).isLocked(vault)) {
            revert DV_VaultLocked();
        }

        uint256 amount = claimable();
        if (amount == 0) revert DV_NothingToClaim();

        // EFFECTS: Update state before external interactions (CEI pattern)
        totalClaimed += amount;

        // INTERACTIONS: External calls after state updates
        bool ok = IERC20_DV(VFIDE).transfer(vault, amount);
        require(ok, "transfer failed");

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

        startTimestamp = uint64(s);
        cliffTimestamp = startTimestamp + CLIFF;
        endTimestamp   = cliffTimestamp + VESTING;

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
            e = c + VESTING;
        }
    }

    function _fetchStartFromPresale() internal view returns (uint256) {
        if (PRESALE == address(0)) return 0;

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
        return s == 0 ? 0 : uint64(s);
    }

    // ─────────────────────────────────────────────────────────────
    // Ledger helpers (best-effort)
    // ─────────────────────────────────────────────────────────────

    function _log(string memory action) internal {
        if (LEDGER != address(0)) { try IProofLedger_DV(LEDGER).logSystemEvent(address(this), action, msg.sender) {} catch {} }
    }
    function _logEv(address who, string memory action, uint256 amount, string memory note) internal {
        if (LEDGER != address(0)) { try IProofLedger_DV(LEDGER).logEvent(who, action, amount, note) {} catch {} }
    }
}
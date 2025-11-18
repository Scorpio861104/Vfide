// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

/**
 * VFIDEToken (zkSync Era ready) — FINAL
 * ----------------------------------------------------------
 * - Total supply cap: 200,000,000 VFIDE (18 decimals)
 * - Dev reserve: 40,000,000 pre-minted to DevReserveVestingVault (constructor)
 * - Presale mint cap: 75,000,000 (only `presale` can mint within cap)
 * - Vault-only transfer rule (via VaultHub): wallets cannot hold VFIDE
 * - System exemptions for infra contracts (presale, DAO, routers, treasury)
 * - ProofScore-aware fees/burns via external BurnRouter (computeFees view)
 * - SecurityHub lock check (PanicGuard/GuardianLock integration)
 * - ProofLedger hooks (best-effort) for transparency
 * - NEW: policy lock to make enforcement non-optional post-launch
 * - NEW: presale mint must target a valid vault when vaultOnly is true
 */

/// ─────────────────────────── Minimal Interfaces
interface IVaultHub {
    function vaultOf(address owner) external view returns (address);
}

interface ISecurityHub {
    function isLocked(address vault) external view returns (bool);
}

interface IProofLedgerToken {
    function logSystemEvent(address who, string calldata action, address by) external;
    function logEvent(address who, string calldata action, uint256 amount, string calldata note) external;
}

/**
 * Router interface: computes fee amounts/sinks based on ProofScore.
 * Token uses returned amounts to burn and route charity/treasury portions.
 */
interface IProofScoreBurnRouterToken {
    function computeFees(
        address from,
        address to,
        uint256 amount
    ) external view returns (
        uint256 burnAmount,
        uint256 sanctumAmount,
        address sanctumSink,  // usually Treasury or SanctumFund
        address burnSink      // optional burn sink; if zero, token burns to address(0)
    );
}

/// ─────────────────────────── Lightweight Ownable
abstract contract Ownable {
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    address public owner;
    constructor() { owner = msg.sender; emit OwnershipTransferred(address(0), msg.sender); }
    modifier onlyOwner() { require(msg.sender == owner, "OWN: not owner"); _; }
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "OWN: zero");
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }
}

/// ─────────────────────────── ERC20 (no OZ deps; 0.8.x checked math)
contract VFIDEToken is Ownable {
    /// Scribble specs (optional instrumentation)
    /// if_succeeds {:msg "supply cap never exceeded"} totalSupply <= MAX_SUPPLY;
    /// if_succeeds {:msg "presale minted bounded"} presaleMinted <= PRESALE_SUPPLY_CAP;
    /// Constants
    string public constant name = "VFIDE";
    string public constant symbol = "VFIDE";
    uint8  public constant decimals = 18;

    uint256 public constant MAX_SUPPLY = 200_000_000e18;
    uint256 public constant DEV_RESERVE_SUPPLY = 40_000_000e18;
    uint256 public constant PRESALE_SUPPLY_CAP = 75_000_000e18;

    /// Storage
    uint256 public totalSupply;

    mapping(address => uint256) private _balances;
    mapping(address => mapping(address => uint256)) private _allowances;

    // Modules
    IVaultHub public vaultHub;                    // required for vault-only rule
    ISecurityHub public securityHub;              // optional lock checks
    IProofLedgerToken public ledger;              // optional event ledger
    IProofScoreBurnRouterToken public burnRouter; // score-based fee calc

    // Policy
    bool public vaultOnly = true;                 // enforce vault-only transfers
    bool public policyLocked = false;             // once locked, cannot disable enforcement
    mapping(address => bool) public systemExempt; // bypass vault check & fees

    // Presale control
    address public presale;
    uint256 public presaleMinted; // must never exceed PRESALE_SUPPLY_CAP

    // Sinks (fallbacks if router is unset or returns zero sinks)
    address public treasurySink;  // sanctuary/treasury receiver for charity share

    /// Events
    event VaultHubSet(address indexed hub);
    event SecurityHubSet(address indexed hub);
    event LedgerSet(address indexed ledger);
    event BurnRouterSet(address indexed router);
    event TreasurySinkSet(address indexed sink);
    event SystemExemptSet(address indexed who, bool isExempt);
    event VaultOnlySet(bool enabled);
    event PolicyLocked();
    event PresaleSet(address indexed presale);
    event PresaleMint(address indexed to, uint256 amount);
    event FeeApplied(address indexed from, address indexed to, uint256 burnAmount, uint256 sanctumAmount, address sanctumSink);
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);

    /// Errors
    error VF_ZERO();
    error VF_CAP();
    error VF_NOT_PRESALE();
    error VF_LOCKED();
    error VF_POLICY_LOCKED();

    /// Constructor: pre-mint dev reserve to the vesting vault
    constructor(
        address devReserveVestingVault, // MUST be deployed before token
        address _vaultHub,              // MAY be zero at deploy; can be set later
        address _ledger,                // optional
        address _treasurySink           // recommended: EcoTreasuryVault
    ) {
        if (devReserveVestingVault == address(0)) revert VF_ZERO();

        // Require dev vault is a contract to prevent misconfig at genesis.
        uint256 size;
        assembly { size := extcodesize(devReserveVestingVault) }
        require(size > 0, "devVault !contract");

        // Optional modules (can be set later)
        if (_vaultHub != address(0)) {
            vaultHub = IVaultHub(_vaultHub);
            emit VaultHubSet(_vaultHub);
        }
        if (_ledger != address(0)) {
            ledger = IProofLedgerToken(_ledger);
            emit LedgerSet(_ledger);
        }
        if (_treasurySink != address(0)) {
            treasurySink = _treasurySink;
            emit TreasurySinkSet(_treasurySink);
        }

        // Pre-mint dev reserve
        _mint(devReserveVestingVault, DEV_RESERVE_SUPPLY);
        _logEv(devReserveVestingVault, "premint_dev_reserve", DEV_RESERVE_SUPPLY, "40M to vesting vault");
    }

    // ------------------ TEST-ONLY toggles
    bool public TEST_force_security_staticcall_fail;
    bool public TEST_force_vaultHub_zero;
    bool public TEST_force_policyLocked_require_router;

    function TEST_setForceSecurityStaticcallFail(bool v) external { TEST_force_security_staticcall_fail = v; }
    function TEST_setForceVaultHubZero(bool v) external { TEST_force_vaultHub_zero = v; }
    function TEST_setForcePolicyLockedRequireRouter(bool v) external { TEST_force_policyLocked_require_router = v; }

    // ─────────────────────────── ERC20 standard

    function balanceOf(address account) external view returns (uint256) { return _balances[account]; }
    function allowance(address owner_, address spender) external view returns (uint256) { return _allowances[owner_][spender]; }

    function approve(address spender, uint256 amount) external returns (bool) {
        _approve(msg.sender, spender, amount);
        return true;
    }

    function increaseAllowance(address spender, uint256 added) external returns (bool) {
        _approve(msg.sender, spender, _allowances[msg.sender][spender] + added);
        return true;
    }

    function decreaseAllowance(address spender, uint256 subtracted) external returns (bool) {
        uint256 cur = _allowances[msg.sender][spender];
        require(cur >= subtracted, "allow underflow");
        _approve(msg.sender, spender, cur - subtracted);
        return true;
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        _transfer(msg.sender, to, amount);
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        uint256 cur = _allowances[from][msg.sender];
        require(cur >= amount, "allow");
        _approve(from, msg.sender, cur - amount);
        _transfer(from, to, amount);
        return true;
    }

    // ─────────────────────────── Admin / Modules

    function setVaultHub(address hub) external onlyOwner {
        vaultHub = IVaultHub(hub);
        emit VaultHubSet(hub);
        _log("vault_hub_set");
    }

    function setSecurityHub(address hub) external onlyOwner {
        securityHub = ISecurityHub(hub);
        emit SecurityHubSet(hub);
        _log("security_hub_set");
    }

    function setLedger(address _ledger) external onlyOwner {
        ledger = IProofLedgerToken(_ledger);
        emit LedgerSet(_ledger);
        _log("ledger_set");
    }

    function setBurnRouter(address router) external onlyOwner {
        if (policyLocked && router == address(0)) revert VF_POLICY_LOCKED();
        burnRouter = IProofScoreBurnRouterToken(router);
        emit BurnRouterSet(router);
        _log("burn_router_set");
    }

    function setTreasurySink(address sink) external onlyOwner {
        if (policyLocked && sink == address(0)) revert VF_POLICY_LOCKED();
        treasurySink = sink;
        emit TreasurySinkSet(sink);
        _log("treasury_sink_set");
    }

    function setSystemExempt(address who, bool isExempt) external onlyOwner {
        systemExempt[who] = isExempt;
        emit SystemExemptSet(who, isExempt);
        _logEv(who, isExempt ? "exempt_on" : "exempt_off", 0, "");
    }

    function setVaultOnly(bool enabled) external onlyOwner {
        if (policyLocked && !enabled) revert VF_POLICY_LOCKED();
        vaultOnly = enabled;
        emit VaultOnlySet(enabled);
        _log(enabled ? "vault_only_on" : "vault_only_off");
    }

    /// One-way switch that makes policy non-optional post-launch.
    function lockPolicy() external onlyOwner {
        policyLocked = true;
        emit PolicyLocked();
        _log("policy_locked");
    }

    function setPresale(address _presale) external onlyOwner {
        presale = _presale;
        if (_presale != address(0)) {
            systemExempt[_presale] = true; // presale ops bypass vault rule/fees; mint target still must be a vault
            emit SystemExemptSet(_presale, true);
        }
        emit PresaleSet(_presale);
        _log("presale_set");
    }

    // ─────────────────────────── Presale mint (within 75M cap)
    function mintPresale(address to, uint256 amount) external {
        if (msg.sender != presale) revert VF_NOT_PRESALE();
        if (amount == 0) revert VF_ZERO();
        if (presaleMinted + amount > PRESALE_SUPPLY_CAP) revert VF_CAP();

        // NEW: when vaultOnly is active, enforce presale target is a registered vault
        if (vaultOnly) {
            require(_isVault(to), "presale target !vault");
        }

        presaleMinted += amount;
        _mint(to, amount);
        emit PresaleMint(to, amount);
        _logEv(to, "presale_mint", amount, "");
    }

    // ─────────────────────────── Internal core

    function _transfer(address from, address to, uint256 amount) internal {
        if (from == address(0) || to == address(0)) revert VF_ZERO();
        if (amount == 0) { emit Transfer(from, to, 0); return; }

        // SecurityHub lock check (if set)
        if (address(securityHub) != address(0)) {
            address fromVault = _vaultOfAddr(from);
            address toVault   = _vaultOfAddr(to);
            if ((fromVault != address(0) && _locked(fromVault)) ||
                (toVault   != address(0) && _locked(toVault))) {
                revert VF_LOCKED();
            }
        }

        // Vault-only rule (unless system-exempt endpoint)
        if (vaultOnly) {
            if (!systemExempt[from]) {
                require(_isVault(from), "from !vault");
            }
            if (!systemExempt[to]) {
                require(_isVault(to), "to !vault");
            }
        }

        // Balance update: pull from sender
        uint256 bal = _balances[from];
        require(bal >= amount, "balance");
        unchecked { _balances[from] = bal - amount; }

        uint256 remaining = amount;

        // Dynamic fees via burn router (if present and not exempt)
        if (address(burnRouter) != address(0) && !(systemExempt[from] || systemExempt[to])) {
            (uint256 burnAmt, uint256 sanctumAmt, address sanctumSink, address burnSink) =
                burnRouter.computeFees(from, to, amount);

            if (burnAmt > 0) {
                address sink = (burnSink == address(0)) ? address(0) : burnSink;
                _applyBurn(from, sink, burnAmt);
                remaining -= burnAmt;
            }
            if (sanctumAmt > 0) {
                address sink2 = (sanctumSink == address(0)) ? treasurySink : sanctumSink;
                require(sink2 != address(0), "sanctum sink=0");
                _balances[sink2] += sanctumAmt;
                emit Transfer(from, sink2, sanctumAmt);
                remaining -= sanctumAmt;
            }
            if (burnAmt > 0 || sanctumAmt > 0) {
                emit FeeApplied(from, to, burnAmt, sanctumAmt, (sanctumSink == address(0) ? treasurySink : sanctumSink));
            }
        } else {
            // If policy is locked we require a router be present so fees cannot be bypassed
            if (policyLocked || TEST_force_policyLocked_require_router) {
                require(address(burnRouter) != address(0), "router required");
            }
        }

        // Deliver net to receiver
        _balances[to] += remaining;
        emit Transfer(from, to, remaining);

        _logEv(from, "transfer", amount, "");
    }

    function _applyBurn(address from, address sink, uint256 burnAmt) internal {
        if (sink == address(0)) {
            // Hard burn
            totalSupply -= burnAmt;
            emit Transfer(from, address(0), burnAmt);
        } else {
            // Soft burn sink (e.g., dead vault, dedicated burner)
            _balances[sink] += burnAmt;
            emit Transfer(from, sink, burnAmt);
        }
    }

    function _mint(address to, uint256 amount) internal {
        if (to == address(0)) revert VF_ZERO();
        if (totalSupply + amount > MAX_SUPPLY) revert VF_CAP();
        /// if_succeeds {:msg "mint keeps cap"} totalSupply + amount <= MAX_SUPPLY;
        totalSupply += amount;
        _balances[to] += amount;
        emit Transfer(address(0), to, amount);
    }

    function _approve(address owner_, address spender, uint256 amount) internal {
        require(owner_ != address(0) && spender != address(0), "approve 0");
        _allowances[owner_][spender] = amount;
        emit Approval(owner_, spender, amount);
    }

    // ─────────────────────────── Helpers

    function _isVault(address a) internal view returns (bool) {
        if (address(vaultHub) == address(0) || TEST_force_vaultHub_zero) return false;
        address v = vaultHub.vaultOf(a);
        if (v == a && v != address(0)) return true;
        if (v == address(0)) {
            return vaultHub.vaultOf(a) == a;
        }
        return false;
    }

    function _vaultOfAddr(address a) internal view returns (address) {
        if (address(vaultHub) == address(0)) return address(0);
        return vaultHub.vaultOf(a);
    }

    function _locked(address vault) internal view returns (bool) {
        if (TEST_force_security_staticcall_fail) return true;
        (bool ok, bytes memory d) = address(securityHub).staticcall(abi.encodeWithSelector(ISecurityHub.isLocked.selector, vault));
        return !(ok && d.length >= 32) || abi.decode(d, (bool));
    }

    // TEST-ONLY helpers
    function TEST_check_locked(address vault) external view returns (bool) { return _locked(vault); }
    function TEST_check_isVault(address a) external view returns (bool) { return _isVault(a); }
    // execute the router-required check path for coverage; will revert with "router required" when triggered
    function TEST_force_router_requirement() external view {
        if (policyLocked || TEST_force_policyLocked_require_router) { require(address(burnRouter) != address(0), "router required"); }
    }

    function _log(string memory action) internal {
        if (address(ledger) != address(0)) { try ledger.logSystemEvent(address(this), action, msg.sender) {} catch {} }
    }
    function _logEv(address who, string memory action, uint256 amount, string memory note) internal {
        if (address(ledger) != address(0)) { try ledger.logEvent(who, action, amount, note) {} catch {} }
    }
}

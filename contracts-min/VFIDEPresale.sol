// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

/**
 * VFIDEPresale (zkSync Era ready) — FINAL
 * ----------------------------------------------------------
 * - Three USD-priced tiers ($0.03 / $0.05 / $0.07)
 * - Multi-stable support via StablecoinRegistry (USDC/USDT/DAI etc.)
 * - Auto-creates buyer's Vault; all VFIDE minted to the vault (never wallets)
 * - Referral bonuses ON: 2% to referrer, 1% to buyer (count toward 75M cap)
 * - Per-address cap (includes bonuses): default 1,500,000 VFIDE
 * - SecurityHub lock check
 * - ProofLedger logs (best-effort)
 * - Exposes presaleStartTime() with one-time launch setter
 */

/// ─────────────────────────── Minimal external interfaces
interface IVFIDEToken {
    function mintPresale(address to, uint256 amount) external;
    function PRESALE_SUPPLY_CAP() external view returns (uint256);
    function presaleMinted() external view returns (uint256);
}

interface IVaultHub {
    function ensureVault(address owner_) external returns (address vault);
    function vaultOf(address owner_) external view returns (address);
}

interface ISecurityHub {
    function isLocked(address vault) external view returns (bool);
}

interface IStablecoinRegistry {
    function isAllowed(address token) external view returns (bool);
    function decimalsOf(address token) external view returns (uint8);
    function treasury() external view returns (address);
}

interface IERC20Like {
    function transferFrom(address from, address to, uint256 value) external returns (bool);
}

interface IProofLedger {
    function logSystemEvent(address who, string calldata action, address by) external;
    function logEvent(address who, string calldata action, uint256 amount, string calldata note) external;
}

/// ─────────────────────────── Lightweight Ownable
abstract contract Ownable {
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    address public owner;
    constructor() { owner = msg.sender; emit OwnershipTransferred(address(0), msg.sender); }
    modifier onlyOwner(){ require(msg.sender==owner, "OWN:not-owner"); _; }
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner!=address(0), "OWN:zero");
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }
}

contract VFIDEPresale is Ownable {
    /// Events
    event ModulesSet(address vfide, address vaultHub, address registry, address ledger, address securityHub);
    event ActiveSet(bool active);
    event TierEnabled(uint8 tier, bool enabled);
    event PricesSet(uint32 p0, uint32 p1, uint32 p2); // microUSD per VFIDE
    event MaxPerAddressSet(uint256 maxAmount);
    event ReferralBpsSet(uint16 buyerBps, uint16 referrerBps);
    event Purchase(
        address indexed buyer,
        address indexed vault,
        address stable,
        uint8 tier,
        uint256 vfideAmountBase,
        uint256 buyerBonus,
        uint256 refBonus,
        uint256 stablePaid,
        address referrer
    );
    event Launched(uint256 startTime);

    /// Errors
    error PR_Zero();
    error PR_Inactive();
    error PR_BadTier();
    error PR_NotAllowedStable();
    error PR_VaultLocked();
    error PR_ExceedsPerAddressCap();
    error PR_CalcOverflow();
    error PR_StartSet();

    /// External modules
    IVFIDEToken public vfide;
    IVaultHub public vaultHub;
    IStablecoinRegistry public registry;
    IProofLedger public ledger;           // optional
    ISecurityHub public securityHub;      // optional

    /// State & config
    bool public active = true;

    // microUSD price per VFIDE (1e6 = $1.00). Defaults: 3¢ / 5¢ / 7¢
    // p[0] = Founding Scroll, p[1] = Oath Takers, p[2] = Public
    uint32[3] public pricesMicroUSD = [uint32(30_000), uint32(50_000), uint32(70_000)];

    // Tier enable flags (all on by default)
    bool[3] public tierEnabled = [true, true, true];

    // Per-address max (default 1,500,000 VFIDE) — includes bonuses
    uint256 public maxPerAddress = 1_500_000e18;

    // Referral bonuses (in basis points of vfideOut)
    // Default: 1% to buyer, 2% to referrer (100 = 1%)
    uint16 public buyerBonusBps = 100;
    uint16 public referrerBonusBps = 200;

    // Per-vault purchased tracking (includes bonuses)
    mapping(address => uint256) public purchasedByVault;

    // Presale start time (for DevReserveVestingVault to read)
    uint256 public presaleStartTime;

    constructor(address _vfide, address _vaultHub, address _registry, address _ledger, address _securityHub) {
        if (_vfide==address(0) || _vaultHub==address(0) || _registry==address(0)) revert PR_Zero();
        vfide = IVFIDEToken(_vfide);
        vaultHub = IVaultHub(_vaultHub);
        registry = IStablecoinRegistry(_registry);
        ledger = IProofLedger(_ledger);
        securityHub = ISecurityHub(_securityHub);
        emit ModulesSet(_vfide, _vaultHub, _registry, _ledger, _securityHub);
    }

    // ─────────────────────────── Admin

    function setModules(address _vfide, address _vaultHub, address _registry, address _ledger, address _security) external onlyOwner {
        if (_vfide==address(0) || _vaultHub==address(0) || _registry==address(0)) revert PR_Zero();
        vfide = IVFIDEToken(_vfide);
        vaultHub = IVaultHub(_vaultHub);
        registry = IStablecoinRegistry(_registry);
        ledger = IProofLedger(_ledger);
        securityHub = ISecurityHub(_security);
        emit ModulesSet(_vfide, _vaultHub, _registry, _ledger, _security);
        _log("presale_modules_set");
    }

    function setActive(bool _active) external onlyOwner { 
        active=_active; 
        emit ActiveSet(_active); 
        _log(_active ? "presale_on" : "presale_off"); 
    }

    function setTierEnabled(uint8 tier, bool enabled) external onlyOwner {
        if (tier>2) revert PR_BadTier();
        tierEnabled[tier] = enabled;
        emit TierEnabled(tier, enabled);
        _log("tier_enabled_set");
    }

    function setPrices(uint32 price0, uint32 price1, uint32 price2) external onlyOwner {
        pricesMicroUSD = [price0, price1, price2];
        emit PricesSet(price0, price1, price2);
        _log("prices_set");
    }

    function setMaxPerAddress(uint256 maxAmt) external onlyOwner {
        maxPerAddress = maxAmt;
        emit MaxPerAddressSet(maxAmt);
        _log("max_per_addr_set");
    }

    function setReferralBps(uint16 _buyerBps, uint16 _refBps) external onlyOwner {
        require(_buyerBps <= 2_000 && _refBps <= 3_000, "ref too high");
        buyerBonusBps = _buyerBps;
        referrerBonusBps = _refBps;
        emit ReferralBpsSet(_buyerBps, _refBps);
        _log("ref_bps_set");
    }

    /// One-time launch setter for vesting sync
    function launchPresale(uint256 startTime) external onlyOwner {
        if (presaleStartTime != 0) revert PR_StartSet();
        require(startTime != 0, "start=0");
        presaleStartTime = startTime;
        emit Launched(startTime);
        _log("presale_launched");
    }

    function launchNow() external onlyOwner {
        if (presaleStartTime != 0) revert PR_StartSet();
        presaleStartTime = block.timestamp;
        emit Launched(presaleStartTime);
        _log("presale_launched");
    }

    // ─────────────────────────── Purchase

    /**
     * @param stable   Stablecoin used to pay (must be registry-allowed)
     * @param tier     0 = Founding ($0.03), 1 = Oath ($0.05), 2 = Public ($0.07)
     * @param vfideOut Amount of VFIDE desired (18 decimals) — excludes bonuses
     * @param referrer Optional referrer address (ignored if zero)
     */
    function buy(address stable, uint8 tier, uint256 vfideOut, address referrer) external {
        if (!active) revert PR_Inactive();
        if (vfideOut == 0) revert PR_Zero();
        if (tier > 2 || !tierEnabled[tier]) revert PR_BadTier();
        if (!registry.isAllowed(stable)) revert PR_NotAllowedStable();

        // ensure vault (auto-create) and resolve it
        address vault = vaultHub.ensureVault(msg.sender);

        // security lock check
        if (address(securityHub)!=address(0) && securityHub.isLocked(vault)) revert PR_VaultLocked();

        // compute bonuses
        uint256 buyerBonus = (vfideOut * buyerBonusBps) / 10_000;
        uint256 refBonus   = (referrer != address(0)) ? (vfideOut * referrerBonusBps) / 10_000 : 0;

        // total minted tokens from presale pool
        uint256 totalMint = vfideOut + buyerBonus + refBonus;

        // check global cap BEFORE taking payment
        uint256 mintedSoFar = vfide.presaleMinted();
        uint256 cap = vfide.PRESALE_SUPPLY_CAP();
        require(mintedSoFar + totalMint <= cap, "cap exceeded");

        // per-address cap (includes bonuses)
        uint256 prior = purchasedByVault[vault];
        if (prior + totalMint > maxPerAddress) revert PR_ExceedsPerAddressCap();
        purchasedByVault[vault] = prior + totalMint;

        // compute stablecoin amount based on USD price (only for base vfideOut; bonuses are free)
        uint8 sdec = registry.decimalsOf(stable);
        uint256 payAmt = _calcPayAmount(vfideOut, pricesMicroUSD[tier], sdec);
        if (payAmt == 0) revert PR_CalcOverflow();

        // collect payment to treasury
        address treas = registry.treasury();
        require(treas != address(0), "treasury=0");
        require(IERC20Like(stable).transferFrom(msg.sender, treas, payAmt), "transferFrom failed");

        // mint VFIDE directly to the buyer's vault (+ bonus to buyer)
        vfide.mintPresale(vault, vfideOut + buyerBonus);

        // optional referral mint (if referrer provided)
        if (refBonus > 0) {
            // Referrer receives to their own vault (auto-created if needed)
            address refVault = vaultHub.ensureVault(referrer);
            // If ref vault is locked, skip ref bonus mint to avoid reverts (fair + safe)
            if (address(securityHub)==address(0) || !securityHub.isLocked(refVault)) {
                vfide.mintPresale(refVault, refBonus);
            } else {
                // rollback the per-address booked ref bonus since it didn't mint
                purchasedByVault[vault] -= refBonus; // only buyer’s cap was incremented; ref’s wasn't
                totalMint = vfideOut + buyerBonus;   // for event/logging
            }
        }

        emit Purchase(msg.sender, vault, stable, tier, vfideOut, buyerBonus, refBonus, payAmt, referrer);
        _logEv(msg.sender, "presale_buy", totalMint, _tierNote(tier));
    }

    // ─────────────────────────── Views / helpers

    function quote(address stable, uint8 tier, uint256 vfideOut) external view returns (uint256 stableRequired) {
        if (!registry.isAllowed(stable)) revert PR_NotAllowedStable();
        if (tier>2 || !tierEnabled[tier]) revert PR_BadTier();
        uint8 sdec = registry.decimalsOf(stable);
        return _calcPayAmount(vfideOut, pricesMicroUSD[tier], sdec);
    }

    function _calcPayAmount(uint256 vfideAmount, uint32 priceMicroUsd, uint8 stableDecs) internal pure returns (uint256) {
        // pay = vfideAmount(1e18) * priceMicro(1e6) * 10^stableDecs / (1e18 * 1e6)
        unchecked {
            return (vfideAmount * uint256(priceMicroUsd) * (10 ** stableDecs)) / 1e18 / 1e6;
        }
    }

    function _tierNote(uint8 tier) internal pure returns (string memory) {
        if (tier==0) return "tier_founding_0.03";
        if (tier==1) return "tier_oath_0.05";
        return "tier_public_0.07";
    }

    // ─────────────────────────── Ledger helpers

    function _log(string memory action) internal {
        if (address(ledger)!=address(0)) { try ledger.logSystemEvent(address(this), action, msg.sender) {} catch {} }
    }
    function _logEv(address who, string memory action, uint256 amount, string memory note) internal {
        if (address(ledger)!=address(0)) { try ledger.logEvent(who, action, amount, note) {} catch {} }
    }
}
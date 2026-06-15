// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

// Pulls in IERC20, SafeERC20, and ReentrancyGuard via the SharedInterfaces.sol re-export
// (the codebase convention — core contracts use the local reimplementations defined there).
import { IERC20, SafeERC20, ReentrancyGuard } from "./SharedInterfaces.sol";

/**
 * @title StabilityBond
 * @author Vfide
 * @notice Voluntary, non-custodial token lock. A participant CHOOSES to lock their OWN VFIDE for a fixed
 *         term (3 / 6 / 12 / 24 months) in exchange for off-chain ecosystem benefits (read by the Seer
 *         via {bondsOf} / {activeBondedAmount}). Tokens release ONLY back to the original owner at
 *         maturity.
 *
 * @dev NON-CUSTODIAL GUARANTEE — there is intentionally NO admin, NO pause, NO seize, NO early-release-
 *      by-other, NO owner role of any kind. No third party — not a deployer, not the DAO, not another
 *      contract — can move, freeze, or early-release a bonded balance. Early withdrawal is disallowed
 *      because the owner *opted into* the term; this restriction binds ONLY the consenting owner, so it
 *      does not violate VFIDE's non-custodial invariant (unlike a forced cooldown on a non-consenting
 *      holder).
 *
 *      Production hardening over the draft:
 *        - SafeERC20 for all token movement.
 *        - ReentrancyGuard on bond()/withdraw() (defense in depth; checks-effects-interactions already
 *          ordered).
 *        - Fee-on-transfer-safe accounting: the bonded amount is the *measured* balance delta, not the
 *          requested amount, so a (hypothetical) transfer tax can never create an under-collateralized
 *          bond. (VFIDE has no transfer tax today; this makes the contract robust regardless.)
 *        - Per-owner aggregate tracking for O(1) Seer reads and explicit overflow-safety notes.
 *
 *      ⚠️ AUDIT STATUS: prepared for professional audit. Must pass `hardhat compile`, the full hardhat
 *      test suite, and a third-party audit BEFORE deployment. It custodies user-locked funds.
 */
contract StabilityBond is ReentrancyGuard {
    using SafeERC20 for IERC20;

    IERC20 public immutable vfide;

    struct Bond {
        uint256 amount;      // measured tokens locked (balance-delta, fee-on-transfer safe)
        uint64 maturityAt;   // unix seconds when withdrawal becomes allowed
        uint8 termMonths;    // 3 | 6 | 12 | 24
        bool withdrawn;      // true once released back to owner
    }

    /// @dev Append-only per owner; a bond is identified by (owner, index). Never reordered, so ids are stable.
    mapping(address => Bond[]) private _bonds;

    /// @notice Sum of currently-locked (not-yet-withdrawn) bond amounts per owner. For O(1) Seer reads.
    mapping(address => uint256) public totalBonded;

    event Bonded(address indexed owner, uint256 indexed bondId, uint256 amount, uint8 termMonths, uint64 maturityAt);
    event Withdrawn(address indexed owner, uint256 indexed bondId, uint256 amount);

    error ZeroAmount();
    error InvalidTerm();
    error BadBondId();
    error AlreadyWithdrawn();
    error NotMatured();
    error NothingReceived();

    constructor(address vfideToken) {
        if (vfideToken == address(0)) revert ZeroAmount();
        vfide = IERC20(vfideToken);
    }

    function _monthsToSeconds(uint8 termMonths) internal pure returns (uint64) {
        if (termMonths == 3)  return 90 days;
        if (termMonths == 6)  return 180 days;
        if (termMonths == 12) return 365 days;
        if (termMonths == 24) return 730 days;
        revert InvalidTerm();
    }

    /**
     * @notice Lock `amount` of YOUR OWN VFIDE for `termMonths`. Releases back to you at maturity.
     * @dev Records the *measured* balance delta as the bonded amount (fee-on-transfer safe). Reverts if
     *      the contract received nothing.
     * @return bondId stable id of the created bond for msg.sender.
     */
    function bond(uint256 amount, uint8 termMonths) external nonReentrant returns (uint256 bondId) {
        if (amount == 0) revert ZeroAmount();
        uint64 maturityAt = uint64(block.timestamp) + _monthsToSeconds(termMonths);

        uint256 balBefore = vfide.balanceOf(address(this));
        vfide.safeTransferFrom(msg.sender, address(this), amount);
        uint256 received = vfide.balanceOf(address(this)) - balBefore;
        if (received == 0) revert NothingReceived();

        _bonds[msg.sender].push(Bond({ amount: received, maturityAt: maturityAt, termMonths: termMonths, withdrawn: false }));
        bondId = _bonds[msg.sender].length - 1;
        totalBonded[msg.sender] += received;

        emit Bonded(msg.sender, bondId, received, termMonths, maturityAt);
    }

    /**
     * @notice After maturity, withdraw YOUR bond back to YOURSELF. Nobody else can call this for you.
     * @dev Checks-effects-interactions: marks withdrawn and decrements the aggregate BEFORE transferring.
     */
    function withdraw(uint256 bondId) external nonReentrant {
        Bond[] storage list = _bonds[msg.sender];
        if (bondId >= list.length) revert BadBondId();
        Bond storage b = list[bondId];
        if (b.withdrawn) revert AlreadyWithdrawn();
        if (block.timestamp < b.maturityAt) revert NotMatured();

        b.withdrawn = true;
        uint256 amt = b.amount;
        totalBonded[msg.sender] -= amt;

        vfide.safeTransfer(msg.sender, amt);
        emit Withdrawn(msg.sender, bondId, amt);
    }

    // ───────────────────────── views (Seer reads these; no state change) ─────────────────────────

    function bondsOf(address owner) external view returns (Bond[] memory) {
        return _bonds[owner];
    }

    function bondCount(address owner) external view returns (uint256) {
        return _bonds[owner].length;
    }

    /// @notice Currently-locked total (excludes withdrawn). Mirrors {totalBonded}; explicit for the Seer.
    function activeBondedAmount(address owner) external view returns (uint256) {
        return totalBonded[owner];
    }

    /// @notice Whether `owner` has at least one active (not withdrawn, not matured) bond of `termMonths`.
    function hasActiveBondOfTerm(address owner, uint8 termMonths) external view returns (bool) {
        Bond[] storage list = _bonds[owner];
        for (uint256 i = 0; i < list.length; i++) {
            Bond storage b = list[i];
            if (!b.withdrawn && b.termMonths == termMonths && block.timestamp < b.maturityAt) return true;
        }
        return false;
    }

    // NOTE: there is intentionally NO admin function, NO pause, NO seize, NO early-release-by-other,
    // NO owner role. That absence IS the non-custodial guarantee — and it is permanent (immutable code).
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * StabilityBond — DRAFT, PRE-AUDIT. DO NOT DEPLOY AS-IS.
 *
 * Voluntary, non-custodial token lock (Phase 4). A participant chooses to lock their own VFIDE for a
 * fixed term (3/6/12/24 months) in exchange for off-chain ecosystem benefits (read by the Seer via
 * bondsOf). Tokens release only back to the original owner at maturity. No third party can move,
 * seize, or early-release a bonded balance.
 *
 * This file has not been compiled, tested, or audited in this environment. It is a starting point for
 * the project's hardhat + professional-audit pipeline.
 */

interface IERC20 {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function transfer(address to, uint256 amount) external returns (bool);
}

contract StabilityBond {
    IERC20 public immutable vfide;

    struct Bond {
        uint256 amount;
        uint64 maturityAt;
        uint8 termMonths;
        bool withdrawn;
    }

    mapping(address => Bond[]) private _bonds;

    event Bonded(address indexed owner, uint256 indexed bondId, uint256 amount, uint8 termMonths, uint64 maturityAt);
    event Withdrawn(address indexed owner, uint256 indexed bondId, uint256 amount);

    constructor(address vfideToken) {
        vfide = IERC20(vfideToken);
    }

    function _monthsToSeconds(uint8 termMonths) internal pure returns (uint64) {
        if (termMonths == 3) return 90 days;
        if (termMonths == 6) return 180 days;
        if (termMonths == 12) return 365 days;
        if (termMonths == 24) return 730 days;
        revert("StabilityBond: invalid term");
    }

    function bond(uint256 amount, uint8 termMonths) external returns (uint256 bondId) {
        require(amount > 0, "StabilityBond: zero amount");
        uint64 maturityAt = uint64(block.timestamp) + _monthsToSeconds(termMonths);
        require(vfide.transferFrom(msg.sender, address(this), amount), "StabilityBond: transferFrom failed");
        _bonds[msg.sender].push(Bond({ amount: amount, maturityAt: maturityAt, termMonths: termMonths, withdrawn: false }));
        bondId = _bonds[msg.sender].length - 1;
        emit Bonded(msg.sender, bondId, amount, termMonths, maturityAt);
    }

    function withdraw(uint256 bondId) external {
        Bond storage b = _bonds[msg.sender][bondId];
        require(!b.withdrawn, "StabilityBond: already withdrawn");
        require(block.timestamp >= b.maturityAt, "StabilityBond: not matured");
        b.withdrawn = true;
        require(vfide.transfer(msg.sender, b.amount), "StabilityBond: transfer failed");
        emit Withdrawn(msg.sender, bondId, b.amount);
    }

    function bondsOf(address owner) external view returns (Bond[] memory) {
        return _bonds[owner];
    }
}

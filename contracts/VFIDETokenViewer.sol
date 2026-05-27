// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

// ─────────────────────────────────────────────────────────────────────────────
// VFIDETokenViewer
//
// Read-only satellite for VFIDEToken. Holds zero write functions and holds
// no assets. Cannot affect protocol state in any way.
//
// Extraction rationale: removes ~700 bytes from VFIDEToken to bring it
// below the EIP-170 24,576-byte hard limit and the 24,000-byte internal buffer.
// ─────────────────────────────────────────────────────────────────────────────

/// @dev Minimal VFIDEToken interface for view-only queries.
interface IVFIDEToken_V {
    function dailyTransferLimit() external view returns (uint256);
    function dailyResetTime(address account) external view returns (uint256);
    function dailyTransferred(address account) external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
    function whaleLimitExempt(address account) external view returns (bool);
    function systemExempt(address account) external view returns (bool);
    function maxTransferAmount() external view returns (uint256);
    function burnRouter() external view returns (address);
    function isFeeBypassed() external view returns (bool);
    function getExpectedNetAmount(address from, address to, uint256 amount) external view returns (uint256);
}

/// @title VFIDETokenViewer
/// @notice Read-only satellite contract for VFIDEToken view queries.
///         This contract has zero write functions and holds no assets.
///         It cannot affect protocol state in any way.
/// @author Vfide
contract VFIDETokenViewer {
    /// @notice token — the VFIDEToken this viewer reads from.
    address public immutable token;

    constructor(address _token) {
        require(_token != address(0), "VTKNV: zero token");
        token = _token;
    }

    // ─────────────────────────────────────────────────────────────────────
    //  Daily Limit Query
    // ─────────────────────────────────────────────────────────────────────

    /// @notice remainingDailyLimit — returns how much of the daily transfer cap
    ///         remains for `account` within the current 24-hour window.
    function remainingDailyLimit(address account) external view returns (uint256) {
        IVFIDEToken_V tkn = IVFIDEToken_V(token);
        uint256 limit = tkn.dailyTransferLimit();
        if (limit == 0) return type(uint256).max;

        uint256 windowStart = tkn.dailyResetTime(account);
        if (windowStart == 0 || block.timestamp >= windowStart + 1 days) {
            return limit;
        }
        uint256 spent = tkn.dailyTransferred(account);
        if (spent >= limit) return 0;
        return limit - spent;
    }

    // ─────────────────────────────────────────────────────────────────────
    //  Transfer Eligibility
    // ─────────────────────────────────────────────────────────────────────

    /// @notice canTransfer — returns whether a transfer would succeed.
    function canTransfer(address from, address to, uint256 amount) external view returns (bool canDo, string memory reason) {
        IVFIDEToken_V tkn = IVFIDEToken_V(token);
        if (tkn.balanceOf(from) < amount) return (false, "BALANCE");

        bool exempt = tkn.whaleLimitExempt(from) || tkn.whaleLimitExempt(to)
                   || tkn.systemExempt(from)      || tkn.systemExempt(to)
                   || from == address(0)           || to == address(0);

        uint256 max = tkn.maxTransferAmount();
        if (!exempt && max > 0 && amount > max) {
            return (false, "MAX_TRANSFER");
        }
        return (true, "");
    }

    // ─────────────────────────────────────────────────────────────────────
    //  Fee Preview
    // ─────────────────────────────────────────────────────────────────────

    /// @notice previewTransferFees — estimates fees that would apply to a transfer.
    function previewTransferFees(address from, address to, uint256 amount) external view returns (
        uint256 burnAmount,
        uint256 sanctumAmount,
        uint256 ecosystemAmount,
        uint256 netReceived
    ) {
        IVFIDEToken_V tkn = IVFIDEToken_V(token);
        if (tkn.systemExempt(from) || tkn.systemExempt(to)
            || tkn.burnRouter() == address(0) || tkn.isFeeBypassed()) {
            return (0, 0, 0, amount);
        }
        netReceived    = tkn.getExpectedNetAmount(from, to, amount);
        ecosystemAmount = amount - netReceived;
        burnAmount     = 0;
        sanctumAmount  = 0;
    }
}

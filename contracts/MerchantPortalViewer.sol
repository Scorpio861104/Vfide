// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

// ─────────────────────────────────────────────────────────────────────────────
// MerchantPortalViewer
//
// Read-only satellite for MerchantPortal. Holds zero write functions and holds
// no assets. Cannot affect protocol state in any way.
//
// Extraction rationale: removes ~1,200 bytes from MerchantPortal to bring it
// below the EIP-170 24,576-byte hard limit and the 24,000-byte internal buffer.
// ─────────────────────────────────────────────────────────────────────────────

/// @dev Minimal ISeer interface needed for view queries.
interface ISeer_MPV {
    function getCachedScore(address account) external view returns (uint16);
    function highTrustThreshold() external view returns (uint16);
    function lowTrustThreshold() external view returns (uint16);
}

/// @dev Minimal IVaultHub interface needed for view queries.
interface IVaultHub_MPV {
    function vaultOf(address owner) external view returns (address);
}

/// @dev Minimal IMerchantPortal interface — only public state accessors.
interface IMerchantPortal_MPV {
    // State vars exposed as view functions by the compiler
    function seer()     external view returns (address);
    function vaultHub() external view returns (address);
    // Mapping accessors
    function merchants(address merchant) external view returns (
        bool registered,
        bool suspended,
        string memory businessName,
        string memory category,
        uint64 registeredAt,
        uint256 totalVolume,
        uint256 txCount,
        address payoutAddress
    );
    function refundRequests(bytes32 refundId) external view returns (
        address customer,
        address merchant,
        address token,
        uint256 amount,
        string memory orderId,
        uint64 requestTime,
        bool approved,
        bool completed
    );
    function customerRefunds(address customer, uint256 index) external view returns (bytes32);
    function merchantRefunds(address merchant, uint256 index) external view returns (bytes32);
}

/// @title MerchantPortalViewer
/// @notice Read-only satellite contract for MerchantPortal view queries.
///         This contract has zero write functions and holds no assets.
///         It cannot affect protocol state in any way.
/// @author Vfide
contract MerchantPortalViewer {
    /// @notice portal — the MerchantPortal this viewer reads from.
    address public immutable portal;

    constructor(address _portal) {
        require(_portal != address(0), "MPV: zero portal");
        portal = _portal;
    }

    // ─────────────────────────────────────────────────────────────────────
    //  Merchant Stats
    // ─────────────────────────────────────────────────────────────────────

    /// @notice getMerchantStats — returns aggregated merchant metrics.
    function getMerchantStats(address merchant) external view returns (
        bool registered,
        bool suspended,
        uint256 totalVolume,
        uint256 txCount,
        uint256 avgTxSize,
        uint16 trustScore
    ) {
        IMerchantPortal_MPV mp = IMerchantPortal_MPV(portal);
        (registered, suspended, , , , totalVolume, txCount, ) = mp.merchants(merchant);
        avgTxSize = txCount > 0 ? totalVolume / txCount : 0;
        address seerAddr = mp.seer();
        trustScore = seerAddr != address(0) ? ISeer_MPV(seerAddr).getCachedScore(merchant) : 5000;
    }

    // ─────────────────────────────────────────────────────────────────────
    //  Customer Trust
    // ─────────────────────────────────────────────────────────────────────

    /// @notice getCustomerTrustScore — returns customer trust metadata.
    function getCustomerTrustScore(address customer) external view returns (
        uint16 score,
        bool highTrust,
        bool lowTrust,
        bool eligible
    ) {
        IMerchantPortal_MPV mp = IMerchantPortal_MPV(portal);
        address seerAddr = mp.seer();
        if (seerAddr == address(0)) {
            return (500, false, false, true);
        }
        ISeer_MPV seerC = ISeer_MPV(seerAddr);
        score = seerC.getCachedScore(customer);
        highTrust = score >= seerC.highTrustThreshold();
        lowTrust  = score <= seerC.lowTrustThreshold();
        address vault = IVaultHub_MPV(mp.vaultHub()).vaultOf(customer);
        eligible = vault != address(0);
    }

    // ─────────────────────────────────────────────────────────────────────
    //  Refund Queries
    // ─────────────────────────────────────────────────────────────────────

    /// @notice getRefundStatus — returns stored refund request data.
    function getRefundStatus(bytes32 refundId) external view returns (
        address customer,
        address merchant,
        address token,
        uint256 amount,
        string memory orderId,
        uint64 requestTime,
        bool approved,
        bool completed
    ) {
        return IMerchantPortal_MPV(portal).refundRequests(refundId);
    }

    /// @notice getCustomerRefunds — returns all refund IDs for a customer.
    ///         Iterates via index — callers should use getMerchantRefundsLength first.
    function getCustomerRefunds(address customer, uint256 maxResults) external view returns (bytes32[] memory ids) {
        IMerchantPortal_MPV mp = IMerchantPortal_MPV(portal);
        uint256 len = 0;
        // Count available (bounded iteration)
        try mp.customerRefunds(customer, 0) returns (bytes32) {} catch { return new bytes32[](0); }
        for (uint256 i = 0; i < maxResults; i++) {
            try mp.customerRefunds(customer, i) returns (bytes32) { len++; } catch { break; }
        }
        ids = new bytes32[](len);
        for (uint256 i = 0; i < len; i++) {
            ids[i] = mp.customerRefunds(customer, i);
        }
    }

    /// @notice getMerchantRefunds — returns all refund IDs for a merchant.
    function getMerchantRefunds(address merchant, uint256 maxResults) external view returns (bytes32[] memory ids) {
        IMerchantPortal_MPV mp = IMerchantPortal_MPV(portal);
        uint256 len = 0;
        try mp.merchantRefunds(merchant, 0) returns (bytes32) {} catch { return new bytes32[](0); }
        for (uint256 i = 0; i < maxResults; i++) {
            try mp.merchantRefunds(merchant, i) returns (bytes32) { len++; } catch { break; }
        }
        ids = new bytes32[](len);
        for (uint256 i = 0; i < len; i++) {
            ids[i] = mp.merchantRefunds(merchant, i);
        }
    }
}

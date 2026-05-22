// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

/// @notice ICommerceEscrow
/// @title ICommerceEscrow
/// @author Vfide
interface ICommerceEscrow {
    enum State {
        NONE,
        OPEN,
        FUNDED,
        RELEASED,
        REFUNDED,
        DISPUTED,
        RESOLVED
    }

    struct Escrow {
        address buyerOwner;
        address merchantOwner;
        address buyerVault;
        address sellerVault;
        uint256 amount;
        State state;
        bytes32 metaHash;
    }

    /// @notice dao
    /// @return _address _address
    function dao() external view returns (address);
    /// @notice escrows
    /// @param id id
    /// @return buyerOwner buyerOwner
    /// @return merchantOwner merchantOwner
    /// @return buyerVault buyerVault
    /// @return sellerVault sellerVault
    /// @return amount amount
    /// @return state state
    /// @return metaHash metaHash
    function escrows(uint256 id) external view returns (
        address buyerOwner,
        address merchantOwner,
        address buyerVault,
        address sellerVault,
        uint256 amount,
        State   state,
        bytes32 metaHash
    );

    /// @notice open
    /// @param merchantOwner merchantOwner
    /// @param amount amount
    /// @param metaHash metaHash
    /// @return id id
    function open(address merchantOwner, uint256 amount, bytes32 metaHash) external returns (uint256 id);
    /// @notice markFunded
    /// @param id id
    function markFunded(uint256 id) external;
    /// @notice release
    /// @param id id
    function release(uint256 id) external;
    /// @notice refund
    /// @param id id
    function refund(uint256 id) external;
    /// @notice dispute
    /// @param id id
    /// @param reason reason
    function dispute(uint256 id, string calldata reason) external;
    /// @notice resolve
    /// @param id id
    /// @param buyerWins buyerWins
    function resolve(uint256 id, bool buyerWins) external;
}

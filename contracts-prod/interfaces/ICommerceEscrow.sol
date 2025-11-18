// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

interface ICommerceEscrow {
    enum State { NONE, OPEN, FUNDED, RELEASED, REFUNDED, DISPUTED, RESOLVED }

    struct Escrow {
        address buyerOwner;
        address merchantOwner;
        address buyerVault;
        address sellerVault;
        uint256 amount;
        State   state;
        bytes32 metaHash;
    }

    function dao() external view returns (address);
    function escrows(uint256 id) external view returns (
        address buyerOwner,
        address merchantOwner,
        address buyerVault,
        address sellerVault,
        uint256 amount,
        State   state,
        bytes32 metaHash
    );

    function open(address merchantOwner, uint256 amount, bytes32 metaHash) external returns (uint256 id);
    function markFunded(uint256 id) external;
    function release(uint256 id) external;
    function refund(uint256 id) external;
    function dispute(uint256 id, string calldata reason) external;
    function resolve(uint256 id, bool buyerWins) external;
}
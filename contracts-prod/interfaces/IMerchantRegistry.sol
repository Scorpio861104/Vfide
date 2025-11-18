// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

interface IMerchantRegistry {
    enum Status { NONE, ACTIVE, SUSPENDED, DELISTED }
    struct Merchant {
        address owner;
        address vault;
        Status  status;
        uint32  refunds;
        uint32  disputes;
        bytes32 metaHash;
    }

    function dao() external view returns (address);
    function minScore() external view returns (uint16);
    function merchants(address owner) external view returns (Merchant memory);

    function addMerchant(bytes32 metaHash) external;
    function suspend(address owner, string calldata reason) external;
    function activate(address owner, string calldata reason) external;
    function delist(address owner, string calldata reason) external;
    function info(address owner) external view returns (Merchant memory);
}
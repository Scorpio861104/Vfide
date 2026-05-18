// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

interface ISanctumFund {
    function charitySplitBps() external view returns (uint16);
    function maxSplitBps() external view returns (uint16);
    function isCharity(address who) external view returns (bool);
    function charityMeta(address who) external view returns (bytes32);

    function addCharity(address charity, bytes32 metaHash) external;
    function removeCharity(address charity) external;
    function disburse(address token, address charity, uint256 amount, string calldata reason) external;
}
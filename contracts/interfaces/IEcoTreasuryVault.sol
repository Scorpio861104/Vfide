// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

interface IEcoTreasuryVault {
    function dao() external view returns (address);
    function vfideToken() external view returns (address);
    function balanceOf(address token) external view returns (uint256);

    function noteVFIDE(uint256 amount, address from) external;
    function depositStable(address token, uint256 amount) external;
    function send(address token, address to, uint256 amount, string calldata reason) external;
}
// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

interface IVFIDEToken {
    function balanceOf(address account) external view returns (uint256);
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function approve(address spender, uint256 amount) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);
    function totalSupply() external view returns (uint256);

    function setSecurityHub(address hub) external;
    function setVaultHub(address hub) external;
    function setLedger(address ledger) external;
    function setBurnRouter(address router) external;
    function setTreasurySink(address treasury) external;
    function setSanctumSink(address sanctum) external;
    function proposeSystemExempt(address who, bool isExempt) external;
    function confirmSystemExempt(address who) external;
    function proposeWhitelist(address addr, bool status) external;
    function confirmWhitelist(address addr) external;
    function setVaultOnly(bool enabled) external;
    function setCircuitBreaker(bool active, uint256 duration) external;
    function setBlacklist(address user, bool status) external;
    function lockPolicy() external;
    function vaultOnly() external view returns (bool);
    function policyLocked() external view returns (bool);
    function circuitBreaker() external view returns (bool);
    function isCircuitBreakerActive() external view returns (bool);
    function circuitBreakerExpiry() external view returns (uint256);

    function setAntiWhale(uint256 maxTransfer, uint256 maxWallet, uint256 dailyLimit, uint256 cooldown) external;
    function setWhaleLimitExempt(address addr, bool exempt) external;
    function maxTransferAmount() external view returns (uint256);
    function maxWalletBalance() external view returns (uint256);
    function dailyTransferLimit() external view returns (uint256);
    function transferCooldown() external view returns (uint256);
    function whaleLimitExempt(address) external view returns (bool);
    function remainingDailyLimit(address account) external view returns (uint256);
    function cooldownRemaining(address account) external view returns (uint256);

    function delegate(address delegatee) external;
    function delegates(address account) external view returns (address);
    function getCurrentVotes(address account) external view returns (uint256);
    function getPriorVotes(address account, uint256 blockNumber) external view returns (uint224);
    function batchTransfer(address[] calldata recipients, uint256[] calldata amounts) external returns (bool);
    function batchApprove(address[] calldata spenders, uint256[] calldata amounts) external returns (bool);
}
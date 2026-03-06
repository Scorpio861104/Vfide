// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

contract MockVFIDETokenForOwnerControlPanel {
    bool public policyLocked;
    bool public circuitBreaker;

    function setVaultHub(address) external {}
    function setSecurityHub(address) external {}
    function setLedger(address) external {}
    function setBurnRouter(address) external {}
    function setTreasurySink(address) external {}
    function setSanctumSink(address) external {}
    function setSystemExempt(address, bool) external {}
    function setWhitelist(address, bool) external {}
    function setVaultOnly(bool) external {}
    function setBlacklist(address, bool) external {}
    function setWhaleLimitExempt(address, bool) external {}
    function setAntiWhale(uint256, uint256, uint256, uint256) external {}

    function lockPolicy() external {
        policyLocked = true;
    }

    function setCircuitBreaker(bool active, uint256) external {
        circuitBreaker = active;
    }

    function isCircuitBreakerActive() external view returns (bool) {
        return circuitBreaker;
    }

    function maxTransferAmount() external pure returns (uint256) { return 0; }
    function maxWalletBalance() external pure returns (uint256) { return 0; }
    function dailyTransferLimit() external pure returns (uint256) { return 0; }
    function transferCooldown() external pure returns (uint256) { return 0; }
    function whaleLimitExempt(address) external pure returns (bool) { return false; }
    function remainingDailyLimit(address) external pure returns (uint256) { return 0; }
    function cooldownRemaining(address) external pure returns (uint256) { return 0; }
    function setFeePolicy(uint16, uint16) external {}
    function feePolicy() external pure returns (uint16, uint16) { return (0, 0); }
    function previewTransferFee(address, uint256) external pure returns (uint256, uint256) { return (0, 0); }
}

contract MockEcosystemVaultAdminForOwnerControlPanel {
    address public router;
    address public stablecoin;
    bool public autoswapEnabled;
    uint16 public slippageBps;

    bool public autoWorkEnabled;
    uint256 public autoMerchantTx;
    uint256 public autoMerchantReferral;
    uint256 public autoUserReferral;

    function configureAutoSwap(address _router, address _stablecoin, bool _enabled, uint16 _maxSlippageBps) external {
        router = _router;
        stablecoin = _stablecoin;
        autoswapEnabled = _enabled;
        slippageBps = _maxSlippageBps;
    }

    function configureAutoWorkPayout(
        bool enabled,
        uint256 merchantTxReward,
        uint256 merchantReferralReward,
        uint256 userReferralReward
    ) external {
        autoWorkEnabled = enabled;
        autoMerchantTx = merchantTxReward;
        autoMerchantReferral = merchantReferralReward;
        autoUserReferral = userReferralReward;
    }

    function setManager(address, bool) external {}
    function setAllocations(uint16, uint16, uint16) external {}

    function autoSwapEnabled() external view returns (bool) { return autoswapEnabled; }
    function swapRouter() external view returns (address) { return router; }
    function preferredStablecoin() external view returns (address) { return stablecoin; }
    function maxSlippageBps() external view returns (uint16) { return slippageBps; }

    function autoWorkPayoutEnabled() external view returns (bool) { return autoWorkEnabled; }
    function autoMerchantTxReward() external view returns (uint256) { return autoMerchantTx; }
    function autoMerchantReferralReward() external view returns (uint256) { return autoMerchantReferral; }
    function autoUserReferralReward() external view returns (uint256) { return autoUserReferral; }
}

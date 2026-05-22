// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

/// @notice MockVFIDETokenForOwnerControlPanel
/// @title MockVFIDETokenForOwnerControlPanel
/// @author Vfide
contract MockVFIDETokenForOwnerControlPanel {
    /// @notice policyLocked
    bool public policyLocked;
    /// @notice circuitBreaker
    bool public circuitBreaker;

    /// @notice setVaultHub
    /// @param _address _address
    function setVaultHub(address) external {}
    /// @notice setSecurityHub
    /// @param _address _address
    function setSecurityHub(address) external {}
    /// @notice setLedger
    /// @param _address _address
    function setLedger(address) external {}
    /// @notice setBurnRouter
    /// @param _address _address
    function setBurnRouter(address) external {}
    /// @notice setTreasurySink
    /// @param _address _address
    function setTreasurySink(address) external {}
    /// @notice setSanctumSink
    /// @param _address _address
    function setSanctumSink(address) external {}
    /// @notice proposeSystemExempt
    /// @param _address _address
    /// @param _bool _bool
    function proposeSystemExempt(address, bool) external {}
    /// @notice cancelPendingExempt
    function cancelPendingExempt() external {}
    /// @notice confirmSystemExempt
    function confirmSystemExempt() external {}
    /// @notice proposeWhitelist
    /// @param _address _address
    /// @param _bool _bool
    function proposeWhitelist(address, bool) external {}
    /// @notice cancelPendingWhitelist
    function cancelPendingWhitelist() external {}
    /// @notice confirmWhitelist
    function confirmWhitelist() external {}
    /// @notice setVaultOnly
    /// @param _bool _bool
    function setVaultOnly(bool) external {}
    /// @notice setBlacklist
    /// @param _address _address
    /// @param _bool _bool
    function setBlacklist(address, bool) external {}
    /// @notice setWhaleLimitExempt
    /// @param _address _address
    /// @param _bool _bool
    function setWhaleLimitExempt(address, bool) external {}
    /// @notice setAntiWhale
    /// @param _uint256 _uint256
    /// @param _uint256 _uint256
    /// @param _uint256 _uint256
    /// @param _uint256 _uint256
    function setAntiWhale(uint256, uint256, uint256, uint256) external {}

    /// @notice lockPolicy
    function lockPolicy() external {
        policyLocked = true;
    }

    /// @notice setCircuitBreaker
    /// @param active active
    /// @param _uint256 _uint256
    function setCircuitBreaker(bool active, uint256) external {
        circuitBreaker = active;
    }

    /// @notice isCircuitBreakerActive
    /// @return _bool _bool
    function isCircuitBreakerActive() external view returns (bool) {
        return circuitBreaker;
    }

    /// @notice maxTransferAmount
    /// @return _uint256 _uint256
    function maxTransferAmount() external pure returns (uint256) { return 0; }
    /// @notice maxWalletBalance
    /// @return _uint256 _uint256
    function maxWalletBalance() external pure returns (uint256) { return 0; }
    /// @notice dailyTransferLimit
    /// @return _uint256 _uint256
    function dailyTransferLimit() external pure returns (uint256) { return 0; }
    /// @notice transferCooldown
    /// @return _uint256 _uint256
    function transferCooldown() external pure returns (uint256) { return 0; }
    /// @notice whaleLimitExempt
    /// @param _address _address
    /// @return _bool _bool
    function whaleLimitExempt(address) external pure returns (bool) { return false; }
    /// @notice remainingDailyLimit
    /// @param _address _address
    /// @return _uint256 _uint256
    function remainingDailyLimit(address) external pure returns (uint256) { return 0; }
    /// @notice cooldownRemaining
    /// @param _address _address
    /// @return _uint256 _uint256
    function cooldownRemaining(address) external pure returns (uint256) { return 0; }
    /// @notice setFeePolicy
    /// @param _uint16 _uint16
    /// @param _uint16 _uint16
    function setFeePolicy(uint16, uint16) external {}
    /// @notice feePolicy
    /// @return _uint16 _uint16
    /// @return _uint16 _uint16
    function feePolicy() external pure returns (uint16, uint16) { return (0, 0); }
    /// @notice previewTransferFee
    /// @param _address _address
    /// @param _uint256 _uint256
    /// @return _uint256 _uint256
    /// @return _uint256 _uint256
    function previewTransferFee(address, uint256) external pure returns (uint256, uint256) { return (0, 0); }
}

/// @notice MockEcosystemVaultAdminForOwnerControlPanel
/// @title MockEcosystemVaultAdminForOwnerControlPanel
/// @author Vfide
contract MockEcosystemVaultAdminForOwnerControlPanel {
    /// @notice router
    address public router;
    /// @notice stablecoin
    address public stablecoin;
    /// @notice autoswapEnabled
    bool public autoswapEnabled;
    /// @notice slippageBps
    uint16 public slippageBps;

    /// @notice autoWorkEnabled
    bool public autoWorkEnabled;
    /// @notice autoMerchantTx
    uint256 public autoMerchantTx;
    /// @notice autoMerchantReferral
    uint256 public autoMerchantReferral;
    /// @notice autoUserReferral
    uint256 public autoUserReferral;

    /// @notice configureAutoSwap
    /// @param _router _router
    /// @param _stablecoin _stablecoin
    /// @param _enabled _enabled
    /// @param _maxSlippageBps _maxSlippageBps
    function configureAutoSwap(address _router, address _stablecoin, bool _enabled, uint16 _maxSlippageBps) external {
        router = _router;
        stablecoin = _stablecoin;
        autoswapEnabled = _enabled;
        slippageBps = _maxSlippageBps;
    }

    /// @notice configureAutoWorkPayout
    /// @param enabled enabled
    /// @param merchantTxReward merchantTxReward
    /// @param merchantReferralReward merchantReferralReward
    /// @param userReferralReward userReferralReward
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

    /// @notice setManager
    /// @param _address _address
    /// @param _bool _bool
    function setManager(address, bool) external {}
    /// @notice setAllocations
    /// @param _uint16 _uint16
    /// @param _uint16 _uint16
    /// @param _uint16 _uint16
    function setAllocations(uint16, uint16, uint16) external {}

    /// @notice autoSwapEnabled
    /// @return _bool _bool
    function autoSwapEnabled() external view returns (bool) { return autoswapEnabled; }
    /// @notice swapRouter
    /// @return _address _address
    function swapRouter() external view returns (address) { return router; }
    /// @notice preferredStablecoin
    /// @return _address _address
    function preferredStablecoin() external view returns (address) { return stablecoin; }
    /// @notice maxSlippageBps
    /// @return _uint16 _uint16
    function maxSlippageBps() external view returns (uint16) { return slippageBps; }

    /// @notice autoWorkPayoutEnabled
    /// @return _bool _bool
    function autoWorkPayoutEnabled() external view returns (bool) { return autoWorkEnabled; }
    /// @notice autoMerchantTxReward
    /// @return _uint256 _uint256
    function autoMerchantTxReward() external view returns (uint256) { return autoMerchantTx; }
    /// @notice autoMerchantReferralReward
    /// @return _uint256 _uint256
    function autoMerchantReferralReward() external view returns (uint256) { return autoMerchantReferral; }
    /// @notice autoUserReferralReward
    /// @return _uint256 _uint256
    function autoUserReferralReward() external view returns (uint256) { return autoUserReferral; }
}

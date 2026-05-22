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
    function setVaultHub(address) external {}
    /// @notice setSecurityHub
    function setSecurityHub(address) external {}
    /// @notice setLedger
    function setLedger(address) external {}
    /// @notice setBurnRouter
    function setBurnRouter(address) external {}
    /// @notice setTreasurySink
    function setTreasurySink(address) external {}
    /// @notice setSanctumSink
    function setSanctumSink(address) external {}
    /// @notice proposeSystemExempt
    function proposeSystemExempt(address, bool) external {}
    /// @notice cancelPendingExempt
    function cancelPendingExempt() external {}
    /// @notice confirmSystemExempt
    function confirmSystemExempt() external {}
    /// @notice proposeWhitelist
    function proposeWhitelist(address, bool) external {}
    /// @notice cancelPendingWhitelist
    function cancelPendingWhitelist() external {}
    /// @notice confirmWhitelist
    function confirmWhitelist() external {}
    /// @notice setVaultOnly
    function setVaultOnly(bool) external {}
    /// @notice setBlacklist
    function setBlacklist(address, bool) external {}
    /// @notice setWhaleLimitExempt
    function setWhaleLimitExempt(address, bool) external {}
    /// @notice setAntiWhale
    function setAntiWhale(uint256, uint256, uint256, uint256) external {}

    /// @notice lockPolicy
    function lockPolicy() external {
        policyLocked = true;
    }

    /// @notice setCircuitBreaker
    /// @param active active
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
    function maxTransferAmount() external pure returns (uint256) {
        return 0;
    }
    /// @notice maxWalletBalance
    /// @return _uint256 _uint256
    function maxWalletBalance() external pure returns (uint256) {
        return 0;
    }
    /// @notice dailyTransferLimit
    /// @return _uint256 _uint256
    function dailyTransferLimit() external pure returns (uint256) {
        return 0;
    }
    /// @notice transferCooldown
    /// @return _uint256 _uint256
    function transferCooldown() external pure returns (uint256) {
        return 0;
    }
    /// @notice whaleLimitExempt
    /// @return _bool _bool
    function whaleLimitExempt(address) external pure returns (bool) {
        return false;
    }
    /// @notice remainingDailyLimit
    /// @return _uint256 _uint256
    function remainingDailyLimit(address) external pure returns (uint256) {
        return 0;
    }
    /// @notice cooldownRemaining
    /// @return _uint256 _uint256
    function cooldownRemaining(address) external pure returns (uint256) {
        return 0;
    }
    /// @notice setFeePolicy
    function setFeePolicy(uint16, uint16) external {}
    /// @notice feePolicy
    /// @return _uint16 _uint16
    /// @return _uint16 _uint16
    function feePolicy() external pure returns (uint16, uint16) {
        return (0, 0);
    }
    /// @notice previewTransferFee
    /// @return _uint256 _uint256
    /// @return _uint256 _uint256
    function previewTransferFee(address, uint256) external pure returns (uint256, uint256) {
        return (0, 0);
    }
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
    function configureAutoSwap(
        address _router,
        address _stablecoin,
        bool _enabled,
        uint16 _maxSlippageBps
    ) external {
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
    function setManager(address, bool) external {}
    /// @notice setAllocations
    function setAllocations(uint16, uint16, uint16) external {}

    /// @notice autoSwapEnabled
    /// @return _bool _bool
    function autoSwapEnabled() external view returns (bool) {
        return autoswapEnabled;
    }
    /// @notice swapRouter
    /// @return _address _address
    function swapRouter() external view returns (address) {
        return router;
    }
    /// @notice preferredStablecoin
    /// @return _address _address
    function preferredStablecoin() external view returns (address) {
        return stablecoin;
    }
    /// @notice maxSlippageBps
    /// @return _uint16 _uint16
    function maxSlippageBps() external view returns (uint16) {
        return slippageBps;
    }

    /// @notice autoWorkPayoutEnabled
    /// @return _bool _bool
    function autoWorkPayoutEnabled() external view returns (bool) {
        return autoWorkEnabled;
    }
    /// @notice autoMerchantTxReward
    /// @return _uint256 _uint256
    function autoMerchantTxReward() external view returns (uint256) {
        return autoMerchantTx;
    }
    /// @notice autoMerchantReferralReward
    /// @return _uint256 _uint256
    function autoMerchantReferralReward() external view returns (uint256) {
        return autoMerchantReferral;
    }
    /// @notice autoUserReferralReward
    /// @return _uint256 _uint256
    function autoUserReferralReward() external view returns (uint256) {
        return autoUserReferral;
    }
}

// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {OApp, Origin, MessagingFee} from "@layerzerolabs/lz-evm-oapp-v2/contracts/oapp/OApp.sol";
import {OAppOptionsType3} from "@layerzerolabs/lz-evm-oapp-v2/contracts/oapp/libs/OAppOptionsType3.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title VFIDEBridge
 * @notice LayerZero OFT implementation for cross-chain VFIDE token transfers
 * @dev Implements burn-on-source, mint-on-destination pattern with security controls
 * 
 * Features:
 * - Omnichain Fungible Token standard
 * - Burn on source, mint on destination
 * - Fee management and refund handling
 * - Trusted remotes configuration
 * - Emergency pause capability
 * - Rate limiting and daily caps
 * 
 * Supported Chains:
 * - Base (Chain ID: 8453)
 * - Polygon (Chain ID: 137)
 * - zkSync Era (Chain ID: 324)
 */
contract VFIDEBridge is OApp, OAppOptionsType3, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;

    /// @notice VFIDE token contract
    IERC20 public immutable vfideToken;

    /// @notice Bridge security module for rate limiting
    address public securityModule;

    /// @notice Mapping of trusted remote bridges per chain
    mapping(uint32 => bytes32) public trustedRemotes;

    /// @notice Minimum bridge amount (100 VFIDE)
    uint256 public constant MIN_BRIDGE_AMOUNT = 100 * 1e18;

    /// @notice Maximum bridge amount per transaction (100,000 VFIDE)
    uint256 public maxBridgeAmount = 100_000 * 1e18;

    /// @notice Bridge fee in basis points (10 = 0.1%)
    uint256 public bridgeFee = 10;

    /// @notice Fee collector address
    address public feeCollector;

    /// @notice Total bridged out from this chain
    uint256 public totalBridgedOut;

    /// @notice Total bridged in to this chain
    uint256 public totalBridgedIn;

    /// @notice User bridge statistics
    mapping(address => BridgeStats) public userStats;

    struct BridgeStats {
        uint256 totalSent;
        uint256 totalReceived;
        uint256 lastBridgeTime;
        uint256 bridgeCount;
    }

    /// @notice Bridge transaction record
    struct BridgeTransaction {
        address sender;
        address receiver;
        uint256 amount;
        uint32 dstChainId;
        uint256 timestamp;
        bool executed;
    }

    /// @notice Bridge transaction history
    mapping(bytes32 => BridgeTransaction) public bridgeTransactions;

    /// @notice Timelock delay for sensitive configuration changes (48 hours)
    uint64 public constant CONFIG_TIMELOCK_DELAY = 48 hours;

    /// @notice Pending trusted remote changes (chainId => remote + effectiveAt)
    struct PendingRemote {
        bytes32 remote;
        uint64 effectiveAt;
    }
    mapping(uint32 => PendingRemote) public pendingTrustedRemotes;

    /// @notice Pending security module change
    address public pendingSecurityModule;
    uint64 public pendingSecurityModuleAt;

    // Events
    event BridgeSent(
        address indexed sender,
        uint32 indexed dstChainId,
        address indexed receiver,
        uint256 amount,
        uint256 fee,
        bytes32 txId
    );

    event BridgeReceived(
        address indexed receiver,
        uint32 indexed srcChainId,
        uint256 amount,
        bytes32 txId
    );

    event TrustedRemoteSet(uint32 indexed chainId, bytes32 remote);
    event TrustedRemoteScheduled(uint32 indexed chainId, bytes32 remote, uint64 effectiveAt);
    event SecurityModuleUpdated(address indexed oldModule, address indexed newModule);
    event SecurityModuleScheduled(address indexed pendingModule, uint64 effectiveAt);
    event MaxBridgeAmountUpdated(uint256 oldAmount, uint256 newAmount);
    event BridgeFeeUpdated(uint256 oldFee, uint256 newFee);
    event FeeCollectorUpdated(address indexed oldCollector, address indexed newCollector);

    error InvalidAmount();
    error InvalidDestination();
    error InvalidRemote();
    error RateLimitExceeded();
    error InvalidFee();
    error TransferFailed();

    /**
     * @notice Constructor
     * @param _vfideToken VFIDE token address
     * @param _endpoint LayerZero endpoint address
     * @param _owner Contract owner address
     */
    constructor(
        address _vfideToken,
        address _endpoint,
        address _owner
    ) OApp(_endpoint, _owner) Ownable(_owner) {
        require(_vfideToken != address(0), "Invalid token");
        vfideToken = IERC20(_vfideToken);
        feeCollector = _owner;
    }

    /**
     * @notice Bridge tokens to another chain
     * @param _dstChainId Destination chain ID (LayerZero format)
     * @param _to Receiver address on destination chain
     * @param _amount Amount to bridge
     * @param _options LayerZero options
     * @return receipt MessagingReceipt from LayerZero
     */
    function bridge(
        uint32 _dstChainId,
        address _to,
        uint256 _amount,
        bytes calldata _options
    ) external payable nonReentrant whenNotPaused returns (bytes32) {
        if (_amount < MIN_BRIDGE_AMOUNT || _amount > maxBridgeAmount) revert InvalidAmount();
        if (_to == address(0)) revert InvalidDestination();
        if (trustedRemotes[_dstChainId] == bytes32(0)) revert InvalidRemote();

        // Check rate limits if security module is set
        if (securityModule != address(0)) {
            require(
                IBridgeSecurityModule(securityModule).checkRateLimit(msg.sender, _amount),
                "Rate limit exceeded"
            );
        }

        // Calculate bridge fee
        uint256 fee = (_amount * bridgeFee) / 10000;
        uint256 amountAfterFee = _amount - fee;

        // Transfer tokens from sender
        vfideToken.safeTransferFrom(msg.sender, address(this), _amount);

        // Transfer fee to collector
        if (fee > 0) {
            vfideToken.safeTransfer(feeCollector, fee);
        }

        // Prepare message payload
        bytes memory payload = abi.encode(_to, amountAfterFee);

        // Generate transaction ID
        bytes32 txId = keccak256(
            abi.encodePacked(msg.sender, _to, _amount, _dstChainId, block.timestamp)
        );

        // Record transaction
        bridgeTransactions[txId] = BridgeTransaction({
            sender: msg.sender,
            receiver: _to,
            amount: amountAfterFee,
            dstChainId: _dstChainId,
            timestamp: block.timestamp,
            executed: false
        });

        // Update statistics
        userStats[msg.sender].totalSent += amountAfterFee;
        userStats[msg.sender].lastBridgeTime = block.timestamp;
        userStats[msg.sender].bridgeCount++;
        totalBridgedOut += amountAfterFee;

        // Send message via LayerZero
        _lzSend(
            _dstChainId,
            payload,
            _options,
            MessagingFee(msg.value, 0),
            payable(msg.sender)
        );

        // Burn tokens (they'll be minted on destination)
        // Note: Token contract must support burn or transfer to dead address
        vfideToken.safeTransfer(address(0xdead), amountAfterFee);

        emit BridgeSent(msg.sender, _dstChainId, _to, amountAfterFee, fee, txId);

        return txId;
    }

    /**
     * @notice Internal function to handle incoming LayerZero messages
     * @param _origin Message origin info
     * @param _guid Message GUID
     * @param payload Message payload
     */
    function _lzReceive(
        Origin calldata _origin,
        bytes32 _guid,
        bytes calldata payload,
        address /*_executor*/,
        bytes calldata /*_extraData*/
    ) internal override {
        // Verify trusted remote
        bytes32 remote = trustedRemotes[_origin.srcEid];
        require(remote != bytes32(0) && remote == _origin.sender, "Invalid remote");

        // Decode payload
        (address receiver, uint256 amount) = abi.decode(payload, (address, uint256));

        // Generate transaction ID
        bytes32 txId = _guid;

        // Update statistics
        userStats[receiver].totalReceived += amount;
        totalBridgedIn += amount;

        // Mint tokens to receiver
        // Note: This requires the bridge contract to have minting permissions
        // Alternative: Pre-fund bridge with tokens
        vfideToken.safeTransfer(receiver, amount);

        emit BridgeReceived(receiver, _origin.srcEid, amount, txId);
    }

    /**
     * @notice Quote bridge fee
     * @param _dstChainId Destination chain ID
     * @param _amount Amount to bridge
     * @param _options LayerZero options
     * @return nativeFee Native fee required
     */
    function quoteBridge(
        uint32 _dstChainId,
        uint256 _amount,
        bytes calldata _options
    ) external view returns (uint256 nativeFee) {
        bytes memory payload = abi.encode(msg.sender, _amount);
        MessagingFee memory fee = _quote(_dstChainId, payload, _options, false);
        return fee.nativeFee;
    }

    /**
     * @notice Schedule a trusted remote update (takes effect after 48h timelock)
     * @param _chainId Chain ID
     * @param _remote Remote bridge address
     */
    function setTrustedRemote(uint32 _chainId, bytes32 _remote) external onlyOwner {
        uint64 effectiveAt = uint64(block.timestamp) + CONFIG_TIMELOCK_DELAY;
        pendingTrustedRemotes[_chainId] = PendingRemote({remote: _remote, effectiveAt: effectiveAt});
        emit TrustedRemoteScheduled(_chainId, _remote, effectiveAt);
    }

    /**
     * @notice Apply a scheduled trusted remote update after the timelock has elapsed
     * @param _chainId Chain ID to apply the pending update for
     */
    function applyTrustedRemote(uint32 _chainId) external onlyOwner {
        PendingRemote memory pending = pendingTrustedRemotes[_chainId];
        require(pending.effectiveAt != 0, "VFIDEBridge: no pending update");
        require(block.timestamp >= pending.effectiveAt, "VFIDEBridge: timelock not elapsed");
        trustedRemotes[_chainId] = pending.remote;
        delete pendingTrustedRemotes[_chainId];
        emit TrustedRemoteSet(_chainId, pending.remote);
    }

    /**
     * @notice Schedule a security module update (takes effect after 48h timelock)
     * @param _securityModule New security module address
     */
    function setSecurityModule(address _securityModule) external onlyOwner {
        uint64 effectiveAt = uint64(block.timestamp) + CONFIG_TIMELOCK_DELAY;
        pendingSecurityModule = _securityModule;
        pendingSecurityModuleAt = effectiveAt;
        emit SecurityModuleScheduled(_securityModule, effectiveAt);
    }

    /**
     * @notice Apply a scheduled security module update after the timelock has elapsed
     */
    function applySecurityModule() external onlyOwner {
        require(pendingSecurityModuleAt != 0, "VFIDEBridge: no pending update");
        require(block.timestamp >= pendingSecurityModuleAt, "VFIDEBridge: timelock not elapsed");
        address oldModule = securityModule;
        securityModule = pendingSecurityModule;
        delete pendingSecurityModule;
        delete pendingSecurityModuleAt;
        emit SecurityModuleUpdated(oldModule, securityModule);
    }

    /**
     * @notice Update max bridge amount
     * @param _maxAmount New max amount
     */
    function setMaxBridgeAmount(uint256 _maxAmount) external onlyOwner {
        uint256 oldAmount = maxBridgeAmount;
        maxBridgeAmount = _maxAmount;
        emit MaxBridgeAmountUpdated(oldAmount, _maxAmount);
    }

    /**
     * @notice Update bridge fee
     * @param _fee New fee in basis points
     */
    function setBridgeFee(uint256 _fee) external onlyOwner {
        if (_fee > 100) revert InvalidFee(); // Max 1%
        uint256 oldFee = bridgeFee;
        bridgeFee = _fee;
        emit BridgeFeeUpdated(oldFee, _fee);
    }

    /**
     * @notice Update fee collector
     * @param _feeCollector New fee collector address
     */
    function setFeeCollector(address _feeCollector) external onlyOwner {
        require(_feeCollector != address(0), "Invalid collector");
        address oldCollector = feeCollector;
        feeCollector = _feeCollector;
        emit FeeCollectorUpdated(oldCollector, _feeCollector);
    }

    /**
     * @notice Pause bridge operations
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @notice Unpause bridge operations
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    /**
     * @notice Emergency withdraw tokens
     * @param _token Token address
     * @param _amount Amount to withdraw
     */
    function emergencyWithdraw(address _token, uint256 _amount) external onlyOwner {
        IERC20(_token).safeTransfer(owner(), _amount);
    }

    /**
     * @notice Get user bridge statistics
     * @param _user User address
     * @return stats Bridge statistics
     */
    function getUserStats(address _user) external view returns (BridgeStats memory) {
        return userStats[_user];
    }
}

/**
 * @notice Interface for BridgeSecurityModule
 */
interface IBridgeSecurityModule {
    function checkRateLimit(address user, uint256 amount) external returns (bool);
}

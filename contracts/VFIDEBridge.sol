// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {OApp, Origin, MessagingFee, MessagingReceipt} from "@layerzerolabs/lz-evm-oapp-v2/contracts/oapp/OApp.sol";
import {OAppOptionsType3} from "@layerzerolabs/lz-evm-oapp-v2/contracts/oapp/libs/OAppOptionsType3.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title VFIDEBridge
 * @notice LayerZero OFT implementation for cross-chain VFIDE token transfers
 * @dev Implements lock-on-source, release-on-destination pattern with security controls
 *
 * Features:
 * - Omnichain Fungible Token standard
 * - Lock on source, release on destination
 * - Fee management and refund handling
 * - Trusted remotes configuration
 * - Emergency pause capability
 * - Rate limiting and daily caps
 *
 * Supported Chains:
 * - Base (Chain ID: 8453)
 * - Polygon (Chain ID: 137)
 * - zkSync Era (Chain ID: 324)
 * @author Vfide
 */
contract VFIDEBridge is OApp, OAppOptionsType3, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;

    /// @notice MSG_TYPE_BRIDGE_TRANSFER
    uint16 internal constant MSG_TYPE_BRIDGE_TRANSFER = 1;
    /// @notice MSG_TYPE_BRIDGE_CONFIRMATION
    uint16 internal constant MSG_TYPE_BRIDGE_CONFIRMATION = 2;
    /// @notice MSG_TYPE_BRIDGE_FAILURE
    uint16 internal constant MSG_TYPE_BRIDGE_FAILURE = 3;

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

    /// @notice Maximum total bridge volume per 24h window.
    uint256 public dailyBridgeLimit = 500_000 * 1e18;

    /// @notice Total bridge volume for the active 24h window.
    uint256 public dailyBridgeVolume;

    /// @notice Timestamp when the current daily window started.
    uint64 public dailyBridgeResetTime;

    /// @notice Bridge fee in basis points (10 = 0.1%)
    uint256 public bridgeFee = 10;

    /// @notice Fee collector address
    address public feeCollector;

    /// @notice Secondary cosigner required to activate any manual refund window.
    /// @dev Owner proposes a refund window and cosigner must approve it.
    ///      Setting this to zero disables owner-driven manual refund windows.
    address public refundWindowCosigner;

    /// @notice Pending refund window proposals awaiting cosigner approval.
    mapping(bytes32 => bool) public pendingRefundWindowProposal;

    /// @notice Total bridged out from this chain
    uint256 public totalBridgedOut;

    /// @notice Total bridged in to this chain
    uint256 public totalBridgedIn;

    /// @notice Aggregate amount bridged out but not yet delivery-confirmed/refunded.
    uint256 public pendingOutboundAmount;

    /// @notice Monotonic nonce for unique outgoing bridge transaction IDs
    uint256 public bridgeTxNonce;

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

    /// @notice Processed inbound LayerZero message GUIDs (replay protection)
    mapping(bytes32 => bool) public processedInboundGuids;

    /// @notice Timelock delay for sensitive configuration changes (48 hours)
    uint64 public constant CONFIG_TIMELOCK_DELAY = 48 hours;

    /// @notice Pending trusted remote changes (chainId => remote + effectiveAt)
    struct PendingRemote {
        bytes32 remote;
        uint64 effectiveAt;
    }
    /// @notice pendingTrustedRemotes
    mapping(uint32 => PendingRemote) public pendingTrustedRemotes;

    /// @notice Pending security module change
    address public pendingSecurityModule;
    /// @notice pendingSecurityModuleAt
    uint64 public pendingSecurityModuleAt;

    /// @notice Pending bridge config changes
    uint256 public pendingMaxBridgeAmount;
    /// @notice pendingMaxBridgeAmountAt
    uint64 public pendingMaxBridgeAmountAt;

    /// @notice pendingDailyBridgeLimit
    uint256 public pendingDailyBridgeLimit;
    /// @notice pendingDailyBridgeLimitAt
    uint64 public pendingDailyBridgeLimitAt;

    /// @notice pendingBridgeFee
    uint256 public pendingBridgeFee;
    /// @notice pendingBridgeFeeAt
    uint64 public pendingBridgeFeeAt;

    /// @notice pendingFeeCollector
    address public pendingFeeCollector;
    /// @notice pendingFeeCollectorAt
    uint64 public pendingFeeCollectorAt;

    /// @notice Pending emergency withdrawal request
    struct PendingEmergencyWithdraw {
        address token;
        uint256 amount;
        uint64 effectiveAt;
    }
    /// @notice pendingEmergencyWithdraw
    PendingEmergencyWithdraw public pendingEmergencyWithdraw;

    /// @notice Emergency bypass for token exemption probe failures (fail-closed by default)
    bool public exemptCheckBypass;
    /// @notice exemptCheckBypassExpiry
    uint256 public exemptCheckBypassExpiry;
    /// @notice EXEMPT_CHECK_BYPASS_DELAY
    uint64 public constant EXEMPT_CHECK_BYPASS_DELAY = 24 hours;
    /// @notice pendingExemptCheckBypassActive
    bool public pendingExemptCheckBypassActive;
    /// @notice pendingExemptCheckBypassDuration
    uint256 public pendingExemptCheckBypassDuration;
    /// @notice pendingExemptCheckBypassAt
    uint64 public pendingExemptCheckBypassAt;
    /// @notice MAX_EXEMPT_CHECK_BYPASS_DURATION
    uint256 public constant MAX_EXEMPT_CHECK_BYPASS_DURATION = 7 days;

    // Events
    /// @notice BridgeSent
    /// @param sender sender
    /// @param dstChainId dstChainId
    /// @param receiver receiver
    /// @param amount amount
    /// @param fee fee
    /// @param txId txId
    event BridgeSent(address indexed sender, uint32 indexed dstChainId, address indexed receiver, uint256 amount, uint256 fee, bytes32 txId);
    /// @notice BridgeFeeRecorded
    /// @param txId txId
    /// @param bridgeFee bridgeFee
    /// @param tokenTransferFee tokenTransferFee
    event BridgeFeeRecorded(bytes32 indexed txId, uint256 bridgeFee, uint256 tokenTransferFee);

    /// @notice BridgeReceived
    /// @param receiver receiver
    /// @param srcChainId srcChainId
    /// @param amount amount
    /// @param txId txId
    event BridgeReceived(address indexed receiver, uint32 indexed srcChainId, uint256 amount, bytes32 txId);
    /// @notice DeliveryConfirmationSkipped
    /// @param dstChainId dstChainId
    /// @param txId txId
    /// @param reason reason
    event DeliveryConfirmationSkipped(uint32 indexed dstChainId, bytes32 indexed txId, string reason);
    /// @notice BridgeDeliveryConfirmed
    /// @param txId txId
    event BridgeDeliveryConfirmed(bytes32 indexed txId);
    /// @notice BridgeDeliveryFailed
    /// @param txId txId
    /// @param srcChainId srcChainId
    /// @param reason reason
    event BridgeDeliveryFailed(bytes32 indexed txId, uint32 indexed srcChainId, string reason);

    /// @notice TrustedRemoteSet
    /// @param chainId chainId
    /// @param remote remote
    event TrustedRemoteSet(uint32 indexed chainId, bytes32 remote);
    /// @notice TrustedRemoteScheduled
    /// @param chainId chainId
    /// @param remote remote
    /// @param effectiveAt effectiveAt
    event TrustedRemoteScheduled(uint32 indexed chainId, bytes32 remote, uint64 effectiveAt);
    /// @notice TrustedRemoteCancelled
    /// @param chainId chainId
    event TrustedRemoteCancelled(uint32 indexed chainId);
    /// @notice SecurityModuleUpdated
    /// @param oldModule oldModule
    /// @param newModule newModule
    event SecurityModuleUpdated(address indexed oldModule, address indexed newModule);
    /// @notice SecurityModuleScheduled
    /// @param pendingModule pendingModule
    /// @param effectiveAt effectiveAt
    event SecurityModuleScheduled(address indexed pendingModule, uint64 effectiveAt);
    /// @notice SecurityModuleCancelled
    event SecurityModuleCancelled();
    /// @notice MaxBridgeAmountUpdated
    /// @param oldAmount oldAmount
    /// @param newAmount newAmount
    event MaxBridgeAmountUpdated(uint256 oldAmount, uint256 newAmount);
    /// @notice MaxBridgeAmountScheduled
    /// @param pendingAmount pendingAmount
    /// @param effectiveAt effectiveAt
    event MaxBridgeAmountScheduled(uint256 pendingAmount, uint64 effectiveAt);
    /// @notice MaxBridgeAmountCancelled
    event MaxBridgeAmountCancelled();
    /// @notice DailyBridgeLimitUpdated
    /// @param oldLimit oldLimit
    /// @param newLimit newLimit
    event DailyBridgeLimitUpdated(uint256 oldLimit, uint256 newLimit);
    /// @notice DailyBridgeLimitScheduled
    /// @param pendingLimit pendingLimit
    /// @param effectiveAt effectiveAt
    event DailyBridgeLimitScheduled(uint256 pendingLimit, uint64 effectiveAt);
    /// @notice DailyBridgeLimitCancelled
    event DailyBridgeLimitCancelled();
    /// @notice DailyBridgeWindowReset
    /// @param startedAt startedAt
    event DailyBridgeWindowReset(uint64 startedAt);
    /// @notice BridgeFeeUpdated
    /// @param oldFee oldFee
    /// @param newFee newFee
    event BridgeFeeUpdated(uint256 oldFee, uint256 newFee);
    /// @notice BridgeFeeScheduled
    /// @param pendingFee pendingFee
    /// @param effectiveAt effectiveAt
    event BridgeFeeScheduled(uint256 pendingFee, uint64 effectiveAt);
    /// @notice BridgeFeeCancelled
    event BridgeFeeCancelled();
    /// @notice BridgeRefunded
    /// @param sender sender
    /// @param txId txId
    /// @param amount amount
    event BridgeRefunded(address indexed sender, bytes32 indexed txId, uint256 amount);
    /// @notice BridgeRefundWindowOpened
    /// @param txId txId
    /// @param refundableAfter refundableAfter
    event BridgeRefundWindowOpened(bytes32 indexed txId, uint256 refundableAfter);
    /// @notice Emitted when owner proposes a refund window pending cosigner approval.
    /// @param txId txId
    event BridgeRefundWindowProposed(bytes32 indexed txId);
    /// @notice Emitted when cosigner approves and activates a proposed refund window.
    /// @param txId txId
    /// @param refundableAfter refundableAfter
    event BridgeRefundWindowCosigned(bytes32 indexed txId, uint256 refundableAfter);
    /// @notice Emitted when the refund window cosigner address is updated.
    /// @param cosigner cosigner
    event RefundWindowCosignerSet(address indexed cosigner);
    /// @notice Emitted when anyone opens a stale refund window after the bridge tx ages out.
    /// @param txId txId
    /// @param refundableAfter refundableAfter
    event StaleBridgeRefundWindowOpened(bytes32 indexed txId, uint256 refundableAfter);
    /// @notice Emitted when anyone finalizes a stale refund to the original sender after the claim grace window.
    /// @param txId txId
    /// @param sender sender
    /// @param amount amount
    event StaleBridgeRefundFinalized(bytes32 indexed txId, address indexed sender, uint256 amount);
    /// F-25 FIX: Refund window — if destination bridge fails to execute, sender can claim refund after 7 days
    /// @notice BRIDGE_REFUND_DELAY
    uint256 public constant BRIDGE_REFUND_DELAY = 7 days;
    /// @notice STALE_BRIDGE_REFUND_DELAY
    uint256 public constant STALE_BRIDGE_REFUND_DELAY = 30 days;
    /// @notice BRIDGE_REFUND_CLAIM_GRACE
    uint256 public constant BRIDGE_REFUND_CLAIM_GRACE = 7 days;
    /// @notice bridgeRefundableAfter
    mapping(bytes32 => uint256) public bridgeRefundableAfter; // txId => timestamp after which refund is claimable

    /// H-1 FIX: Timelocked VFIDE emergency recovery — allows owner to rescue locked VFIDE after 30 days
    /// @notice VFIDE_RECOVERY_DELAY
    uint64 public constant VFIDE_RECOVERY_DELAY = 30 days;
    /// @notice pendingVFIDERecoveryTo
    address public pendingVFIDERecoveryTo;
    /// @notice pendingVFIDERecoveryAmount
    uint256 public pendingVFIDERecoveryAmount;
    /// @notice pendingVFIDERecoveryAt
    uint64 public pendingVFIDERecoveryAt;
    /// @notice VFIDERecoveryScheduled
    /// @param to to
    /// @param amount amount
    /// @param effectiveAt effectiveAt
    event VFIDERecoveryScheduled(address indexed to, uint256 amount, uint64 effectiveAt);
    /// @notice VFIDERecoveryExecuted
    /// @param to to
    /// @param amount amount
    event VFIDERecoveryExecuted(address indexed to, uint256 amount);
    /// @notice VFIDERecoveryCancelled
    event VFIDERecoveryCancelled();
    /// @notice FeeCollectorUpdated
    /// @param oldCollector oldCollector
    /// @param newCollector newCollector
    event FeeCollectorUpdated(address indexed oldCollector, address indexed newCollector);
    /// @notice FeeCollectorScheduled
    /// @param pendingCollector pendingCollector
    /// @param effectiveAt effectiveAt
    event FeeCollectorScheduled(address indexed pendingCollector, uint64 effectiveAt);
    /// @notice FeeCollectorCancelled
    event FeeCollectorCancelled();
    /// @notice EmergencyWithdrawScheduled
    /// @param token token
    /// @param amount amount
    /// @param effectiveAt effectiveAt
    event EmergencyWithdrawScheduled(address indexed token, uint256 amount, uint64 effectiveAt);
    /// @notice EmergencyWithdrawExecuted
    /// @param token token
    /// @param amount amount
    event EmergencyWithdrawExecuted(address indexed token, uint256 amount);
    /// @notice EmergencyWithdrawCancelled
    event EmergencyWithdrawCancelled();
    /// @notice ExemptCheckBypassSet
    /// @param active active
    /// @param expiry expiry
    event ExemptCheckBypassSet(bool active, uint256 expiry);
    /// @notice ExemptCheckBypassScheduled
    /// @param duration duration
    /// @param effectiveAt effectiveAt
    event ExemptCheckBypassScheduled(uint256 duration, uint64 effectiveAt);
    /// @notice ExemptCheckBypassScheduleCancelled
    event ExemptCheckBypassScheduleCancelled();

    /// @notice InvalidAmount
    error InvalidAmount();
    /// @notice InvalidDestination
    error InvalidDestination();
    /// @notice InvalidRemote
    error InvalidRemote();
    /// @notice DuplicateMessage
    error DuplicateMessage();
    /// @notice RateLimitExceeded
    error RateLimitExceeded();
    /// @notice InvalidFee
    error InvalidFee();
    /// @notice TransferFailed
    error TransferFailed();
    /// @notice ConfirmationSendFailed
    error ConfirmationSendFailed();

    /**
     * @notice Constructor
     * @param _vfideToken VFIDE token address
     * @param _endpoint LayerZero endpoint address
     * @param _owner Contract owner address
     */
    constructor(address _vfideToken, address _endpoint, address _owner) OApp(_endpoint, _owner) Ownable(_owner) {
        require(_vfideToken != address(0), "Invalid token");
        require(_endpoint != address(0), "Invalid endpoint");
        require(_owner != address(0), "Invalid owner");
        vfideToken = IERC20(_vfideToken);
        feeCollector = _owner;
        dailyBridgeResetTime = uint64(block.timestamp);
    }

    /**
     * @notice Bridge tokens to another chain
     * @param _dstChainId Destination chain ID (LayerZero format)
     * @param _to Receiver address on destination chain
     * @param _amount Amount to bridge
     * @param _options LayerZero options
     * @return receipt MessagingReceipt from LayerZero
     */
    function bridge(uint32 _dstChainId, address _to, uint256 _amount, bytes calldata _options) external payable nonReentrant whenNotPaused returns (bytes32) {
        if (_amount < MIN_BRIDGE_AMOUNT || _amount > maxBridgeAmount) revert InvalidAmount();
        if (_to == address(0)) revert InvalidDestination();
        if (trustedRemotes[_dstChainId] == bytes32(0)) revert InvalidRemote();
        require(_bridgeIsSystemExempt(), "VFIDEBridge: configure token systemExempt for bridge");

        _rollDailyBridgeWindow();
        uint256 nextDailyVolume = dailyBridgeVolume + _amount;
        if (nextDailyVolume > dailyBridgeLimit) revert RateLimitExceeded();
        dailyBridgeVolume = nextDailyVolume;

        // Check rate limits if security module is set
        if (securityModule != address(0)) {
            require(IBridgeSecurityModule(securityModule).checkRateLimit(msg.sender, _amount), "Rate limit exceeded");
        }

        // Calculate bridge fee
        uint256 fee = (_amount * bridgeFee) / 10000;
        uint256 amountAfterFee = _amount - fee;

        // Transfer tokens from sender
        uint256 balanceBefore = vfideToken.balanceOf(address(this));
        vfideToken.safeTransferFrom(msg.sender, address(this), _amount);
        uint256 balanceAfter = vfideToken.balanceOf(address(this));
        uint256 received = balanceAfter > balanceBefore ? balanceAfter - balanceBefore : 0;
        uint256 tokenTransferFee = _amount > received ? _amount - received : 0;

        // Transfer fee to collector
        if (fee > 0) {
            vfideToken.safeTransfer(feeCollector, fee);
        }

        // Prepare message payload.
        bytes memory payload = abi.encode(MSG_TYPE_BRIDGE_TRANSFER, _to, amountAfterFee);
        bytes memory options = combineOptions(_dstChainId, MSG_TYPE_BRIDGE_TRANSFER, _options);

        // Send message via LayerZero first so the transaction ID is the real transport GUID.
        MessagingReceipt memory receipt = _lzSend(_dstChainId, payload, options, MessagingFee(msg.value, 0), payable(msg.sender));
        bytes32 txId = receipt.guid;
        ++bridgeTxNonce;

        // Record transaction
        bridgeTransactions[txId] = BridgeTransaction({sender: msg.sender, receiver: _to, amount: amountAfterFee, dstChainId: _dstChainId, timestamp: block.timestamp, executed: false});

        // Update statistics
        userStats[msg.sender].totalSent += amountAfterFee;
        userStats[msg.sender].lastBridgeTime = block.timestamp;
        ++userStats[msg.sender].bridgeCount;
        totalBridgedOut += amountAfterFee;
        pendingOutboundAmount += amountAfterFee;

        // Lock tokens on source chain; destination bridge releases pre-funded liquidity.
        // This avoids mint-dependency failures and prevents burn-without-delivery scenarios.

        emit BridgeSent(msg.sender, _dstChainId, _to, amountAfterFee, fee, txId);
        emit BridgeFeeRecorded(txId, fee, tokenTransferFee);
        // C-1 FIX: Refund window is NOT opened automatically. Owner must call openBridgeRefundWindow()
        // after manually verifying non-delivery. Automatic opening allowed a double-spend when
        // delivery confirmation failed silently (destination released funds, source opened refund window).

        return txId;
    }

    /// @notice _bridgeIsSystemExempt
    /// @return _bool _bool
    function _bridgeIsSystemExempt() internal view returns (bool) {
        (bool ok, bytes memory data) = address(vfideToken).staticcall(abi.encodeWithSignature("systemExempt(address)", address(this)));
        if (!ok || data.length < 32) {
            // Balanced fail-closed behavior: allow a temporary owner-controlled bypass.
            if (isExemptCheckBypassActive()) {
                return true;
            }
            return false;
        }
        return abi.decode(data, (bool));
    }

    /// @notice Enable/disable temporary bypass when token exemption probe fails.
    /// @dev Enabling is timelocked; disabling is immediate for fail-closed recovery.
    /// @param active active
    /// @param duration duration
    function setExemptCheckBypass(bool active, uint256 duration) external onlyOwner {
        if (active) {
            require(duration > 0 && duration <= MAX_EXEMPT_CHECK_BYPASS_DURATION, "VFIDEBridge: invalid duration");
            pendingExemptCheckBypassActive = true;
            pendingExemptCheckBypassDuration = duration;
            pendingExemptCheckBypassAt = uint64(block.timestamp) + EXEMPT_CHECK_BYPASS_DELAY;
            emit ExemptCheckBypassScheduled(duration, pendingExemptCheckBypassAt);
        } else {
            exemptCheckBypass = false;
            exemptCheckBypassExpiry = 0;
            delete pendingExemptCheckBypassActive;
            delete pendingExemptCheckBypassDuration;
            delete pendingExemptCheckBypassAt;
            emit ExemptCheckBypassSet(false, 0);
            return;
        }
    }

    /// @notice Apply a scheduled exempt check bypass activation after timelock.
    function applyExemptCheckBypass() external onlyOwner {
        require(pendingExemptCheckBypassAt != 0 && pendingExemptCheckBypassActive, "VFIDEBridge: no pending bypass");
        require(block.timestamp >= pendingExemptCheckBypassAt, "VFIDEBridge: bypass timelock active");
        exemptCheckBypass = true;
        exemptCheckBypassExpiry = block.timestamp + pendingExemptCheckBypassDuration;
        delete pendingExemptCheckBypassActive;
        delete pendingExemptCheckBypassDuration;
        delete pendingExemptCheckBypassAt;
        emit ExemptCheckBypassSet(true, exemptCheckBypassExpiry);
    }

    /// @notice Cancel a scheduled exempt check bypass activation.
    function cancelExemptCheckBypass() external onlyOwner {
        require(pendingExemptCheckBypassAt != 0, "VFIDEBridge: no pending bypass");
        delete pendingExemptCheckBypassActive;
        delete pendingExemptCheckBypassDuration;
        delete pendingExemptCheckBypassAt;
        emit ExemptCheckBypassScheduleCancelled();
    }

    /// @notice Returns true only while bypass is enabled and not expired.
    /// @return _bool _bool
    function isExemptCheckBypassActive() public view returns (bool) {
        if (!exemptCheckBypass) return false;
        if (exemptCheckBypassExpiry > 0 && block.timestamp >= exemptCheckBypassExpiry) return false;
        return true;
    }

    /**
     * @notice Internal function to handle incoming LayerZero messages
     * @param _origin Message origin info
     * @param _guid Message GUID
     * @param payload Message payload
     */
    function _lzReceive(Origin calldata _origin, bytes32 _guid, bytes calldata payload, address /*_executor*/, bytes calldata /*_extraData*/) internal override {
        // Verify trusted remote
        bytes32 remote = trustedRemotes[_origin.srcEid];
        require(remote != bytes32(0) && remote == _origin.sender, "Invalid remote");

        // Replay protection (defense in depth)
        if (processedInboundGuids[_guid]) revert DuplicateMessage();
        processedInboundGuids[_guid] = true;

        uint16 messageType = _decodeMessageType(payload);

        // M-3 FIX: Delivery confirmations are processed even when bridge is paused so that
        // source-chain refund windows can be cleared and pendingOutboundAmount stays accurate.
        if (messageType == MSG_TYPE_BRIDGE_CONFIRMATION) {
            (, bytes32 confirmedTxId) = abi.decode(payload, (uint16, bytes32));
            _confirmBridgeDelivery(confirmedTxId);
            return;
        }

        // N-H13 FIX: Destination bridge can notify source about deterministic delivery failure
        // (e.g. insufficient destination liquidity), so refund windows open automatically.
        if (messageType == MSG_TYPE_BRIDGE_FAILURE) {
            (, bytes32 failedTxId) = abi.decode(payload, (uint16, bytes32));
            _markBridgeFailed(failedTxId, _origin.srcEid, "insufficient destination liquidity");
            return;
        }

        // New inbound bridge transfers respect the pause state
        if (paused()) revert EnforcedPause();

        if (messageType != MSG_TYPE_BRIDGE_TRANSFER) revert InvalidRemote();

        // Decode payload
        (, address receiver, uint256 amount) = abi.decode(payload, (uint16, address, uint256));

        if (receiver == address(0)) revert InvalidDestination();
        if (amount == 0) revert InvalidAmount();
        require(amount <= maxBridgeAmount, "VFIDEBridge: exceeds max bridge amount");

        // Generate transaction ID
        bytes32 txId = _guid;

        // Release tokens to receiver from destination bridge liquidity.
        uint256 bridgeBalance = vfideToken.balanceOf(address(this));
        uint256 availableLiquidity_ = bridgeBalance > pendingOutboundAmount ? bridgeBalance - pendingOutboundAmount : 0;
        if (availableLiquidity_ < amount) {
            _sendBridgeFailureNotification(_origin.srcEid, _guid);
            emit BridgeDeliveryFailed(_guid, _origin.srcEid, "insufficient destination liquidity");
            return;
        }

        // Defense in depth: avoid releasing bridged funds directly to addresses
        // currently flagged for escrow by the token's fraud controls.
        if (_receiverRequiresEscrow(receiver)) {
            _sendBridgeFailureNotification(_origin.srcEid, _guid);
            emit BridgeDeliveryFailed(_guid, _origin.srcEid, "receiver requires escrow");
            return;
        }

        // Update statistics
        userStats[receiver].totalReceived += amount;
        totalBridgedIn += amount;
        vfideToken.safeTransfer(receiver, amount);

        _sendDeliveryConfirmation(_origin.srcEid, _guid);

        // slither-disable-next-line reentrancy-events
        emit BridgeReceived(receiver, _origin.srcEid, amount, txId);
    }

    /// @notice _receiverRequiresEscrow
    /// @param receiver receiver
    /// @return _bool _bool
    function _receiverRequiresEscrow(address receiver) internal view returns (bool) {
        (bool ok, bytes memory data) = address(vfideToken).staticcall(abi.encodeWithSignature("requiresEscrow(address)", receiver));
        if (!ok || data.length < 32) {
            return false;
        }
        return abi.decode(data, (bool));
    }

    /**
     * @notice Quote bridge fee
     * @param _dstChainId Destination chain ID
     * @param _amount Amount to bridge
     * @param _options LayerZero options
     * @return nativeFee Native fee required
     */
    function quoteBridge(uint32 _dstChainId, uint256 _amount, bytes calldata _options) external view returns (uint256 nativeFee) {
        bytes memory payload = abi.encode(MSG_TYPE_BRIDGE_TRANSFER, msg.sender, _amount);
        MessagingFee memory fee = _quote(_dstChainId, payload, combineOptions(_dstChainId, MSG_TYPE_BRIDGE_TRANSFER, _options), false);
        return fee.nativeFee;
    }

    /// @notice quoteDeliveryConfirmation
    /// @param _dstChainId _dstChainId
    /// @return nativeFee nativeFee
    function quoteDeliveryConfirmation(uint32 _dstChainId) external view returns (uint256 nativeFee) {
        bytes memory payload = abi.encode(MSG_TYPE_BRIDGE_CONFIRMATION, bytes32(0));
        MessagingFee memory fee = _quote(_dstChainId, payload, enforcedOptions[_dstChainId][MSG_TYPE_BRIDGE_CONFIRMATION], false);
        return fee.nativeFee;
    }

    /// @notice Check available bridge liquidity on this chain
    /// @return _uint256 _uint256
    function availableLiquidity() external view returns (uint256) {
        uint256 bridgeBalance = vfideToken.balanceOf(address(this));
        if (bridgeBalance <= pendingOutboundAmount) return 0;
        return bridgeBalance - pendingOutboundAmount;
    }

    /**
     * @notice C-05: Pool health view — shows net bridge position to detect cross-chain supply imbalance.
     * @dev    In a lock/release bridge model (vs burn/mint), the total VFIDE locked here should equal
     *         the total VFIDE released on all destination chains. If netFlow diverges from the on-chain
     *         balance this indicates a discrepancy (bridge attack, stuck txs, or manual sweeps).
     * @return lockedBalance  VFIDE currently held in this bridge contract (tokens locked by outbound bridges).
     * @return totalOut       Cumulative VFIDE locked out across all bridge() calls (lifetime).
     * @return totalIn        Cumulative VFIDE released in on this chain across all receive() calls (lifetime).
     * @return netFlow        totalOut - totalIn: positive = more locked than released (expected on source chain).
     * @return isHealthy      True if lockedBalance >= (totalOut - totalIn), i.e. contract holds at least what it owes.
     */
    function getPoolHealth() external view returns (uint256 lockedBalance, uint256 totalOut, uint256 totalIn, int256 netFlow, bool isHealthy) {
        lockedBalance = vfideToken.balanceOf(address(this));
        totalOut = totalBridgedOut;
        totalIn = totalBridgedIn;
        netFlow = int256(totalOut) - int256(totalIn);
        // Healthy if balance covers the outstanding net outflow.
        // Use explicit branch to avoid ambiguity around uint256-casting a negative int256.
        if (netFlow <= 0) {
            isHealthy = true; // more released in than locked out — no deficit on this chain
        } else {
            isHealthy = lockedBalance >= uint256(netFlow);
        }
    }

    /// @notice Amount currently locked on source-side bridge and still awaiting delivery confirmation or refund.
    /// @return _uint256 _uint256
    function getPendingOutboundAmount() external view returns (uint256) {
        return pendingOutboundAmount;
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
     * @notice Cancel a pending trusted remote update
     * @param _chainId Chain ID to cancel the pending update for
     */
    function cancelTrustedRemote(uint32 _chainId) external onlyOwner {
        require(pendingTrustedRemotes[_chainId].effectiveAt != 0, "VFIDEBridge: no pending update");
        delete pendingTrustedRemotes[_chainId];
        emit TrustedRemoteCancelled(_chainId);
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
        _setPeer(_chainId, pending.remote);
        delete pendingTrustedRemotes[_chainId];
        emit TrustedRemoteSet(_chainId, pending.remote);
    }

    /**
     * @notice Schedule a security module update (takes effect after 48h timelock)
     * @param _securityModule New security module address
     */
    function setSecurityModule(address _securityModule) external onlyOwner {
        // Intentional: zero address is allowed to disable module checks after timelock.
        uint64 effectiveAt = uint64(block.timestamp) + CONFIG_TIMELOCK_DELAY;
        // slither-disable-next-line missing-zero-check
        pendingSecurityModule = _securityModule;
        pendingSecurityModuleAt = effectiveAt;
        emit SecurityModuleScheduled(_securityModule, effectiveAt);
    }

    /**
     * @notice Cancel a pending security module update
     */
    function cancelSecurityModule() external onlyOwner {
        require(pendingSecurityModuleAt != 0, "VFIDEBridge: no pending update");
        delete pendingSecurityModule;
        delete pendingSecurityModuleAt;
        emit SecurityModuleCancelled();
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
        if (_maxAmount < MIN_BRIDGE_AMOUNT) revert InvalidAmount();
        uint64 effectiveAt = uint64(block.timestamp) + CONFIG_TIMELOCK_DELAY;
        pendingMaxBridgeAmount = _maxAmount;
        pendingMaxBridgeAmountAt = effectiveAt;
        emit MaxBridgeAmountScheduled(_maxAmount, effectiveAt);
    }

    /**
     * @notice Cancel a pending max bridge amount update
     */
    function cancelMaxBridgeAmount() external onlyOwner {
        require(pendingMaxBridgeAmountAt != 0, "VFIDEBridge: no pending update");
        delete pendingMaxBridgeAmount;
        delete pendingMaxBridgeAmountAt;
        emit MaxBridgeAmountCancelled();
    }

    /**
     * @notice Apply a scheduled max bridge amount update after timelock
     */
    function applyMaxBridgeAmount() external onlyOwner {
        require(pendingMaxBridgeAmountAt != 0, "VFIDEBridge: no pending update");
        require(block.timestamp >= pendingMaxBridgeAmountAt, "VFIDEBridge: timelock not elapsed");
        uint256 oldAmount = maxBridgeAmount;
        uint256 newAmount = pendingMaxBridgeAmount;
        maxBridgeAmount = newAmount;
        delete pendingMaxBridgeAmount;
        delete pendingMaxBridgeAmountAt;
        emit MaxBridgeAmountUpdated(oldAmount, newAmount);
    }

    /// @notice setDailyBridgeLimit
    /// @param _limit _limit
    function setDailyBridgeLimit(uint256 _limit) external onlyOwner {
        if (_limit < MIN_BRIDGE_AMOUNT) revert InvalidAmount();
        uint64 effectiveAt = uint64(block.timestamp) + CONFIG_TIMELOCK_DELAY;
        pendingDailyBridgeLimit = _limit;
        pendingDailyBridgeLimitAt = effectiveAt;
        emit DailyBridgeLimitScheduled(_limit, effectiveAt);
    }

    /// @notice cancelDailyBridgeLimit
    function cancelDailyBridgeLimit() external onlyOwner {
        require(pendingDailyBridgeLimitAt != 0, "VFIDEBridge: no pending update");
        delete pendingDailyBridgeLimit;
        delete pendingDailyBridgeLimitAt;
        emit DailyBridgeLimitCancelled();
    }

    /// @notice applyDailyBridgeLimit
    function applyDailyBridgeLimit() external onlyOwner {
        require(pendingDailyBridgeLimitAt != 0, "VFIDEBridge: no pending update");
        require(block.timestamp >= pendingDailyBridgeLimitAt, "VFIDEBridge: timelock not elapsed");
        uint256 oldLimit = dailyBridgeLimit;
        uint256 newLimit = pendingDailyBridgeLimit;
        dailyBridgeLimit = newLimit;
        delete pendingDailyBridgeLimit;
        delete pendingDailyBridgeLimitAt;
        emit DailyBridgeLimitUpdated(oldLimit, newLimit);
    }

    /**
     * @notice Update bridge fee
     * @param _fee New fee in basis points
     */
    function setBridgeFee(uint256 _fee) external onlyOwner {
        if (_fee > 100) revert InvalidFee(); // Max 1%
        uint64 effectiveAt = uint64(block.timestamp) + CONFIG_TIMELOCK_DELAY;
        pendingBridgeFee = _fee;
        pendingBridgeFeeAt = effectiveAt;
        emit BridgeFeeScheduled(_fee, effectiveAt);
    }

    /**
     * @notice Cancel a pending bridge fee update
     */
    function cancelBridgeFee() external onlyOwner {
        require(pendingBridgeFeeAt != 0, "VFIDEBridge: no pending update");
        delete pendingBridgeFee;
        delete pendingBridgeFeeAt;
        emit BridgeFeeCancelled();
    }

    /**
     * @notice Apply a scheduled bridge fee update after timelock
     */
    function applyBridgeFee() external onlyOwner {
        require(pendingBridgeFeeAt != 0, "VFIDEBridge: no pending update");
        require(block.timestamp >= pendingBridgeFeeAt, "VFIDEBridge: timelock not elapsed");
        uint256 oldFee = bridgeFee;
        uint256 newFee = pendingBridgeFee;
        bridgeFee = newFee;
        delete pendingBridgeFee;
        delete pendingBridgeFeeAt;
        emit BridgeFeeUpdated(oldFee, newFee);
    }

    /**
     * @notice Update fee collector
     * @param _feeCollector New fee collector address
     */
    function setFeeCollector(address _feeCollector) external onlyOwner {
        require(_feeCollector != address(0), "Invalid collector");
        uint64 effectiveAt = uint64(block.timestamp) + CONFIG_TIMELOCK_DELAY;
        pendingFeeCollector = _feeCollector;
        pendingFeeCollectorAt = effectiveAt;
        emit FeeCollectorScheduled(_feeCollector, effectiveAt);
    }

    /**
     * @notice Cancel a pending fee collector update
     */
    function cancelFeeCollector() external onlyOwner {
        require(pendingFeeCollectorAt != 0, "VFIDEBridge: no pending update");
        delete pendingFeeCollector;
        delete pendingFeeCollectorAt;
        emit FeeCollectorCancelled();
    }

    /**
     * @notice Apply a scheduled fee collector update after timelock
     */
    function applyFeeCollector() external onlyOwner {
        require(pendingFeeCollectorAt != 0, "VFIDEBridge: no pending update");
        require(block.timestamp >= pendingFeeCollectorAt, "VFIDEBridge: timelock not elapsed");
        address oldCollector = feeCollector;
        address newCollector = pendingFeeCollector;
        feeCollector = newCollector;
        delete pendingFeeCollector;
        delete pendingFeeCollectorAt;
        emit FeeCollectorUpdated(oldCollector, newCollector);
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

    // ── Two-step ownership (overrides OApp/Ownable single-step transferOwnership)
    /// @notice _pendingBridgeOwner
    address private _pendingBridgeOwner;
    /// @notice M-04 FIX: Track when ownership transfer was initiated so it can expire.
    uint64 private _pendingOwnerInitiatedAt;
    /// @notice Ownership transfer must be accepted within 7 days or it expires.
    uint64 public constant OWNERSHIP_TRANSFER_EXPIRY = 7 days;

    /// @notice OwnershipTransferStarted
    /// @param previousOwner previousOwner
    /// @param newOwner newOwner
    event OwnershipTransferStarted(address indexed previousOwner, address indexed newOwner);

    /// @notice pendingOwner
    /// @return _address _address
    function pendingOwner() public view returns (address) {
        return _pendingBridgeOwner;
    }

    /// @notice Initiate ownership transfer — new owner must accept within 7 days
    /// @param newOwner newOwner
    function transferOwnership(address newOwner) public override onlyOwner {
        require(newOwner != address(0), "VFIDEBridge: zero address");
        _pendingBridgeOwner = newOwner;
        _pendingOwnerInitiatedAt = uint64(block.timestamp);
        emit OwnershipTransferStarted(owner(), newOwner);
    }

    /// @notice Complete ownership transfer (called by pending owner)
    /// @dev M-04 FIX: Enforces 7-day expiry — pending owner must accept before it lapses.
    function acceptOwnership() external {
        require(msg.sender == _pendingBridgeOwner, "VFIDEBridge: not pending owner");
        require(block.timestamp <= _pendingOwnerInitiatedAt + OWNERSHIP_TRANSFER_EXPIRY, "VFIDEBridge: ownership transfer expired");
        _transferOwnership(msg.sender);
        _pendingBridgeOwner = address(0);
        _pendingOwnerInitiatedAt = 0;
    }

    /// @notice Cancel a pending ownership transfer
    function cancelOwnershipTransfer() external onlyOwner {
        _pendingBridgeOwner = address(0);
        _pendingOwnerInitiatedAt = 0;
    }

    /**
     * @notice Emergency withdraw tokens
     * @param _token Token address
     * @param _amount Amount to withdraw
     */
    function emergencyWithdraw(address _token, uint256 _amount) external onlyOwner {
        require(_token != address(0), "Invalid token");
        require(_token != address(vfideToken), "VFIDEBridge: cannot withdraw VFIDE");
        require(_amount > 0, "Invalid amount");
        uint64 effectiveAt = uint64(block.timestamp) + CONFIG_TIMELOCK_DELAY;
        pendingEmergencyWithdraw = PendingEmergencyWithdraw({token: _token, amount: _amount, effectiveAt: effectiveAt});
        emit EmergencyWithdrawScheduled(_token, _amount, effectiveAt);
    }

    /**
     * @notice Execute the queued emergency withdrawal after timelock
     */
    function applyEmergencyWithdraw() external onlyOwner {
        PendingEmergencyWithdraw memory pending = pendingEmergencyWithdraw;
        require(pending.effectiveAt != 0, "VFIDEBridge: no pending withdraw");
        require(block.timestamp >= pending.effectiveAt, "VFIDEBridge: timelock not elapsed");
        delete pendingEmergencyWithdraw;
        IERC20(pending.token).safeTransfer(owner(), pending.amount);
        emit EmergencyWithdrawExecuted(pending.token, pending.amount);
    }

    /**
     * @notice Cancel a pending emergency withdrawal
     */
    function cancelEmergencyWithdraw() external onlyOwner {
        require(pendingEmergencyWithdraw.effectiveAt != 0, "VFIDEBridge: no pending withdraw");
        delete pendingEmergencyWithdraw;
        emit EmergencyWithdrawCancelled();
    }

    /**
     * @notice H-1 FIX: Schedule emergency VFIDE rescue with a 30-day timelock.
     * @dev Only callable by owner. Allows recovery of VFIDE locked in the bridge in cases
     *      of permanent bridge failure. The 30-day delay gives users time to exit first.
     * @param to    Recipient of the recovered VFIDE.
     * @param amount VFIDE amount to recover.
     */
    function scheduleVFIDERecovery(address to, uint256 amount) external onlyOwner {
        require(to != address(0), "VFIDEBridge: zero address");
        require(amount > 0, "VFIDEBridge: zero amount");
        require(pendingVFIDERecoveryAt == 0, "VFIDEBridge: recovery already pending");
        uint64 effectiveAt = uint64(block.timestamp) + VFIDE_RECOVERY_DELAY;
        pendingVFIDERecoveryTo = to;
        pendingVFIDERecoveryAmount = amount;
        pendingVFIDERecoveryAt = effectiveAt;
        emit VFIDERecoveryScheduled(to, amount, effectiveAt);
    }

    /// @notice Execute a previously scheduled VFIDE recovery after the 30-day delay.
    function executeVFIDERecovery() external onlyOwner {
        require(pendingVFIDERecoveryAt != 0, "VFIDEBridge: no pending recovery");
        require(block.timestamp >= pendingVFIDERecoveryAt, "VFIDEBridge: delay not elapsed");
        address to = pendingVFIDERecoveryTo;
        uint256 amount = pendingVFIDERecoveryAmount;
        delete pendingVFIDERecoveryTo;
        delete pendingVFIDERecoveryAmount;
        delete pendingVFIDERecoveryAt;
        vfideToken.safeTransfer(to, amount);
        emit VFIDERecoveryExecuted(to, amount);
    }

    /// @notice Cancel a pending VFIDE recovery.
    function cancelVFIDERecovery() external onlyOwner {
        require(pendingVFIDERecoveryAt != 0, "VFIDEBridge: no pending recovery");
        delete pendingVFIDERecoveryTo;
        delete pendingVFIDERecoveryAmount;
        delete pendingVFIDERecoveryAt;
        emit VFIDERecoveryCancelled();
    }

    /**
     * @notice Get user bridge statistics
     * @param _user User address
     * @return stats Bridge statistics
     */
    function getUserStats(address _user) external view returns (BridgeStats memory) {
        return userStats[_user];
    }

    /**
     * @notice F-25 FIX: Claim a refund for a stuck bridge transaction.
     * @dev If the destination bridge never executed the transfer (insufficient liquidity),
     *      the original sender can reclaim their locked tokens after BRIDGE_REFUND_DELAY.
     * @param txId The transaction ID returned by bridge()
     */
    function claimBridgeRefund(bytes32 txId) external nonReentrant whenNotPaused {
        // F-65 FIX: Refund path must preserve whole-amount semantics. Enforce bridge
        // systemExempt invariant here as well so refunds cannot be fee-debited.
        require(_bridgeIsSystemExempt(), "VFIDEBridge: configure token systemExempt for bridge");
        BridgeTransaction storage btx = bridgeTransactions[txId];
        require(btx.sender == msg.sender, "VFIDEBridge: not sender");
        require(!btx.executed, "VFIDEBridge: already executed");
        require(bridgeRefundableAfter[txId] > 0, "VFIDEBridge: not refundable");
        require(block.timestamp >= bridgeRefundableAfter[txId], "VFIDEBridge: refund too early");

        btx.executed = true; // Prevent double-claim
        uint256 amount = btx.amount;
        totalBridgedOut -= amount;
        if (pendingOutboundAmount >= amount) {
            pendingOutboundAmount -= amount;
        }
        userStats[msg.sender].totalSent -= amount;
        delete bridgeRefundableAfter[txId];

        vfideToken.safeTransfer(msg.sender, amount);
        emit BridgeRefunded(msg.sender, txId, amount);
    }

    /**
     * @notice C-1 FIX: Admin manually opens a refund window after confirming the bridge delivery failed.
     * @dev Must only be called when the owner has verified the destination bridge did NOT execute the
     *      transfer (e.g., destination had insufficient liquidity and no confirmation was sent back).
     *      Calling this when delivery already succeeded would allow double-spend — use adminMarkBridgeExecuted
     *      when delivery succeeded.
     *
     *      This call only *proposes* the refund window. The configured cosigner must then
     *      call approveRefundWindow(txId) to activate it, reducing single-admin trust risk.
     *
     * @param txId The bridge transaction ID to open a refund window for.
     */
    function openBridgeRefundWindow(bytes32 txId) external onlyOwner {
        require(refundWindowCosigner != address(0), "VFIDEBridge: cosigner required");
        BridgeTransaction storage btx = bridgeTransactions[txId];
        require(btx.sender != address(0), "VFIDEBridge: unknown tx");
        require(!btx.executed, "VFIDEBridge: already executed");
        require(bridgeRefundableAfter[txId] == 0, "VFIDEBridge: window already open");
        require(!pendingRefundWindowProposal[txId], "VFIDEBridge: proposal already pending");

        pendingRefundWindowProposal[txId] = true;
        emit BridgeRefundWindowProposed(txId);
    }

    /**
     * @notice Permissionless liveness path for bridge transactions whose confirmation never arrived.
     * @dev After a long stale period, anyone can open the standard refund window so the sender is
     *      no longer dependent on owner intervention to recover locked funds.
     * @param txId txId
     */
    function openStaleBridgeRefundWindow(bytes32 txId) external {
        BridgeTransaction storage btx = bridgeTransactions[txId];
        require(btx.sender != address(0), "VFIDEBridge: unknown tx");
        require(!btx.executed, "VFIDEBridge: already executed");
        require(bridgeRefundableAfter[txId] == 0, "VFIDEBridge: window already open");
        require(!pendingRefundWindowProposal[txId], "VFIDEBridge: proposal already pending");
        require(block.timestamp >= btx.timestamp + STALE_BRIDGE_REFUND_DELAY, "VFIDEBridge: tx not stale");

        bridgeRefundableAfter[txId] = block.timestamp + BRIDGE_REFUND_DELAY;
        emit StaleBridgeRefundWindowOpened(txId, bridgeRefundableAfter[txId]);
        emit BridgeRefundWindowOpened(txId, bridgeRefundableAfter[txId]);
    }

    /**
     * @notice Cosigner approves a pending refund window proposal, activating the user refund path.
     * @dev Only callable by refundWindowCosigner. Validates the transaction is still unexecuted and
     *      the window has not already been opened by another path.
     * @param txId The bridge transaction ID previously proposed by the owner.
     */
    function approveRefundWindow(bytes32 txId) external {
        require(msg.sender == refundWindowCosigner, "VFIDEBridge: not cosigner");
        require(pendingRefundWindowProposal[txId], "VFIDEBridge: no pending proposal");
        BridgeTransaction storage btx = bridgeTransactions[txId];
        require(btx.sender != address(0), "VFIDEBridge: unknown tx");
        require(!btx.executed, "VFIDEBridge: already executed");
        require(bridgeRefundableAfter[txId] == 0, "VFIDEBridge: window already open");

        delete pendingRefundWindowProposal[txId];
        bridgeRefundableAfter[txId] = block.timestamp + BRIDGE_REFUND_DELAY;
        emit BridgeRefundWindowCosigned(txId, bridgeRefundableAfter[txId]);
        emit BridgeRefundWindowOpened(txId, bridgeRefundableAfter[txId]);
    }

    /**
     * @notice Anyone can finalize a stale refund to the original sender if the sender never claims it.
     * @dev This clears stranded outbound accounting even when the original sender is inactive.
     * @param txId txId
     */
    function finalizeStaleBridgeRefund(bytes32 txId) external nonReentrant whenNotPaused {
        require(_bridgeIsSystemExempt(), "VFIDEBridge: configure token systemExempt for bridge");
        BridgeTransaction storage btx = bridgeTransactions[txId];
        require(btx.sender != address(0), "VFIDEBridge: unknown tx");
        require(!btx.executed, "VFIDEBridge: already executed");

        uint256 refundableAfter = bridgeRefundableAfter[txId];
        require(refundableAfter > 0, "VFIDEBridge: not refundable");
        require(block.timestamp >= refundableAfter + BRIDGE_REFUND_CLAIM_GRACE, "VFIDEBridge: sender claim grace active");

        btx.executed = true;
        uint256 amount = btx.amount;
        totalBridgedOut -= amount;
        if (pendingOutboundAmount >= amount) {
            pendingOutboundAmount -= amount;
        }
        userStats[btx.sender].totalSent -= amount;
        delete pendingRefundWindowProposal[txId];
        delete bridgeRefundableAfter[txId];

        vfideToken.safeTransfer(btx.sender, amount);
        emit StaleBridgeRefundFinalized(txId, btx.sender, amount);
        emit BridgeRefunded(btx.sender, txId, amount);
    }

    /**
     * @notice Set or clear the refund window cosigner address.
     * @dev Setting to address(0) disables owner-driven manual refund windows.
     *      Only callable by owner. No timelock — cosigner is a security enhancement, not a
     *      privileged role that can steal funds.
     * @param cosigner cosigner
     */
    function setRefundWindowCosigner(address cosigner) external onlyOwner {
        // slither-disable-next-line missing-zero-check
        refundWindowCosigner = cosigner;
        emit RefundWindowCosignerSet(cosigner);
    }

    /**
     * @notice F-25 FIX: Admin can cancel a refund window after confirming the bridge delivery succeeded.
     * @dev Updated for C-1 FIX: no longer requires a pre-existing refund window so it can be
     *      used proactively to mark delivery before any refund window is opened.
     *      Also cancels any pending refund window proposal to prevent activation after delivery.
     * @param txId txId
     */
    function adminMarkBridgeExecuted(bytes32 txId) external onlyOwner {
        BridgeTransaction storage btx = bridgeTransactions[txId];
        require(btx.sender != address(0), "VFIDEBridge: unknown tx");
        require(!btx.executed, "VFIDEBridge: already executed");
        btx.executed = true;
        if (pendingOutboundAmount >= btx.amount) {
            pendingOutboundAmount -= btx.amount;
        }
        delete pendingRefundWindowProposal[txId]; // cancel any pending proposal
        delete bridgeRefundableAfter[txId];
        emit BridgeDeliveryConfirmed(txId);
    }

    /// @notice receive
    receive() external payable {}

    /// @notice _sendDeliveryConfirmation
    /// @param _dstChainId _dstChainId
    /// @param txId txId
    function _sendDeliveryConfirmation(uint32 _dstChainId, bytes32 txId) internal virtual {
        bytes memory payload = abi.encode(MSG_TYPE_BRIDGE_CONFIRMATION, txId);
        bytes memory options = enforcedOptions[_dstChainId][MSG_TYPE_BRIDGE_CONFIRMATION];
        MessagingFee memory fee = _quote(_dstChainId, payload, options, false);

        if (address(this).balance < fee.nativeFee) {
            emit DeliveryConfirmationSkipped(_dstChainId, txId, "insufficient native fee");
            return;
        }

        try this.__sendDeliveryConfirmation(_dstChainId, payload, options, fee.nativeFee) {} catch {
            // slither-disable-next-line reentrancy-events
            emit DeliveryConfirmationSkipped(_dstChainId, txId, "send failed");
        }
    }

    /// @notice _sendBridgeFailureNotification
    /// @param _dstChainId _dstChainId
    /// @param txId txId
    function _sendBridgeFailureNotification(uint32 _dstChainId, bytes32 txId) internal virtual {
        bytes memory payload = abi.encode(MSG_TYPE_BRIDGE_FAILURE, txId);
        // Reuse confirmation options/fee profile for failure notifications.
        bytes memory options = enforcedOptions[_dstChainId][MSG_TYPE_BRIDGE_CONFIRMATION];
        MessagingFee memory fee = _quote(_dstChainId, payload, options, false);

        if (address(this).balance < fee.nativeFee) {
            emit DeliveryConfirmationSkipped(_dstChainId, txId, "insufficient native fee (failure notify)");
            return;
        }

        try this.__sendDeliveryConfirmation(_dstChainId, payload, options, fee.nativeFee) {} catch {
            emit DeliveryConfirmationSkipped(_dstChainId, txId, "failure notify send failed");
        }
    }

    /// @dev External self-call target used to preserve try/catch semantics for LayerZero send failures.
    /// @notice __sendDeliveryConfirmation
    /// @param _dstChainId _dstChainId
    /// @param payload payload
    /// @param options options
    /// @param nativeFee nativeFee
    function __sendDeliveryConfirmation(uint32 _dstChainId, bytes calldata payload, bytes calldata options, uint256 nativeFee) external {
        require(msg.sender == address(this), "VFIDEBridge: self only");
        _lzSend(_dstChainId, payload, options, MessagingFee(nativeFee, 0), payable(address(this)));
    }

    /// @notice _confirmBridgeDelivery
    /// @param txId txId
    function _confirmBridgeDelivery(bytes32 txId) internal {
        BridgeTransaction storage btx = bridgeTransactions[txId];
        if (btx.sender == address(0) || btx.executed) {
            return;
        }

        btx.executed = true;
        if (pendingOutboundAmount >= btx.amount) {
            pendingOutboundAmount -= btx.amount;
        }
        delete bridgeRefundableAfter[txId];
        emit BridgeDeliveryConfirmed(txId);
    }

    /// @notice _markBridgeFailed
    /// @param txId txId
    /// @param srcChainId srcChainId
    /// @param reason reason
    function _markBridgeFailed(bytes32 txId, uint32 srcChainId, string memory reason) internal {
        BridgeTransaction storage btx = bridgeTransactions[txId];
        if (btx.sender == address(0) || btx.executed) {
            return;
        }
        if (bridgeRefundableAfter[txId] == 0) {
            bridgeRefundableAfter[txId] = block.timestamp + BRIDGE_REFUND_DELAY;
            emit BridgeRefundWindowOpened(txId, bridgeRefundableAfter[txId]);
        }
        emit BridgeDeliveryFailed(txId, srcChainId, reason);
    }

    /// @notice _rollDailyBridgeWindow
    function _rollDailyBridgeWindow() internal {
        if (dailyBridgeResetTime == 0 || block.timestamp >= uint256(dailyBridgeResetTime) + 1 days) {
            dailyBridgeVolume = 0;
            dailyBridgeResetTime = uint64(block.timestamp);
            emit DailyBridgeWindowReset(dailyBridgeResetTime);
        }
    }

    /// @notice _decodeMessageType
    /// @param payload payload
    /// @return messageType messageType
    function _decodeMessageType(bytes calldata payload) internal pure returns (uint16 messageType) {
        // audit-ok(assembly): Reviewed: idiomatic low-level pattern (extcodesize/extcodehash/create2 or vendored audited code) — must not be modified
        assembly {
            messageType := and(calldataload(payload.offset), 0xffff)
        }
    }

    /// @notice renounceOwnership
    function renounceOwnership() public view override onlyOwner {
        revert("VFIDEBridge: renounce disabled");
    }
}

/**
 * @notice Interface for BridgeSecurityModule
 * @title IBridgeSecurityModule
 * @author Vfide
 */
interface IBridgeSecurityModule {
    /// @notice checkRateLimit
    /// @param user user
    /// @param amount amount
    /// @return _bool _bool
    function checkRateLimit(address user, uint256 amount) external returns (bool);
}

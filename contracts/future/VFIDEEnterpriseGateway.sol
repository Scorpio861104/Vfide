// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import { IERC20, ISeer, ISwapRouter, IVaultHub, ReentrancyGuard, SafeERC20 } from "../SharedInterfaces.sol";

error ENT_NotOracle();
error ENT_NotDAO();
error ENT_OrderExists();
error ENT_OrderNotFound();
error ENT_NotPending();
error ENT_TransferFailed();
error ENT_Zero();
error ENT_InsufficientAvailable();

/**
 * VFIDEEnterpriseGateway (Amazon/Enterprise Integration)
 */
contract VFIDEEnterpriseGateway is ReentrancyGuard {
    using SafeERC20 for IERC20;

    function _requireDistinctOracle(address candidateOracle, address candidateMerchantWallet, string memory context) internal pure {
        require(candidateOracle != candidateMerchantWallet, context);
    }
    event OrderCreated(bytes32 indexed orderId, address indexed buyer, uint256 amount, string meta);
    event OrderCancelled(bytes32 indexed orderId, address indexed buyer, uint256 amount);
    event OrderSettled(bytes32 indexed orderId, address indexed buyer, uint256 amount);
    event OrderRefunded(bytes32 indexed orderId, address indexed buyer, uint256 amount, string reason);
    event SeerRewardFailed(bytes32 indexed orderId, address indexed buyer, uint16 delta, bytes reason);
    event OracleSet(address indexed oracle);
    event MerchantWalletSet(address indexed merchantWallet);
    event MerchantWalletChangeScheduled(address indexed merchantWallet, uint64 effectiveAt);
    event MerchantWalletChangeCancelled(address indexed merchantWallet);

    enum Status { NONE, PENDING, SETTLED, REFUNDED }

    struct Order {
        address buyer;
        address payer;  // Actual source of funds (vault or EOA)
        uint256 amount;
        Status status;
        uint256 timestamp;
    }

    address public dao;
    address public oracle; // The Enterprise API Key (Amazon)
    address public merchantWallet; // Where funds go (Amazon's Wallet)
    uint64 public constant MERCHANT_WALLET_CHANGE_DELAY = 48 hours;
    /// @dev H-26 FIX: Payer can self-cancel after this window if oracle hasn't acted.
    uint64 public constant ORDER_PAYER_CANCEL_WINDOW = 7 days;
    address public pendingMerchantWallet;
    uint64 public pendingMerchantWalletAt;
    
    IERC20 public token;
    ISeer public seer;
    IVaultHub public vaultHub;

    mapping(bytes32 => Order) public orders;
    uint256 public totalPendingOrderAmount;

    modifier onlyDAO() {
        _onlyDAO();
        _;
    }

    function _onlyDAO() internal view {
        if (msg.sender != dao) revert ENT_NotDAO();
    }

    modifier onlyOracle() {
        _onlyOracle();
        _;
    }

    function _onlyOracle() internal view {
        if (msg.sender != oracle) revert ENT_NotOracle();
    }

    constructor(
        address _dao,
        address _token,
        address _seer,
        address _vaultHub,
        address _oracle,
        address _merchantWallet
    ) {
        if (
            _dao == address(0)
                || _token == address(0)
                || _seer == address(0)
                || _vaultHub == address(0)
                || _oracle == address(0)
                || _merchantWallet == address(0)
        ) {
            revert ENT_Zero();
        }
        require(_oracle != _dao, "ENT: oracle must differ from DAO");
        _requireDistinctOracle(_oracle, _merchantWallet, "ENT: oracle must differ from merchant");
        dao = _dao;
        token = IERC20(_token);
        seer = ISeer(_seer);
        vaultHub = IVaultHub(_vaultHub);
        oracle = _oracle;
        merchantWallet = _merchantWallet;
    }

    function setOracle(address _oracle) external onlyDAO {
        if (_oracle == address(0)) revert ENT_Zero();
        require(_oracle != dao, "ENT: oracle must differ from DAO");
        _requireDistinctOracle(_oracle, merchantWallet, "ENT: oracle must differ from merchant");
        if (pendingMerchantWallet != address(0)) {
            _requireDistinctOracle(_oracle, pendingMerchantWallet, "ENT: oracle must differ from pending merchant");
        }
        oracle = _oracle;
        emit OracleSet(_oracle);
    }

    function setMerchantWallet(address _wallet) external onlyDAO {
        if (_wallet == address(0)) revert ENT_Zero();
        _requireDistinctOracle(oracle, _wallet, "ENT: oracle must differ from merchant");
        pendingMerchantWallet = _wallet;
        pendingMerchantWalletAt = uint64(block.timestamp) + MERCHANT_WALLET_CHANGE_DELAY;
        emit MerchantWalletChangeScheduled(_wallet, pendingMerchantWalletAt);
    }

    function applyMerchantWallet() external onlyDAO {
        if (pendingMerchantWalletAt == 0 || block.timestamp < pendingMerchantWalletAt) revert ENT_NotPending();
        _requireDistinctOracle(oracle, pendingMerchantWallet, "ENT: oracle must differ from merchant");
        merchantWallet = pendingMerchantWallet;
        emit MerchantWalletSet(merchantWallet);
        delete pendingMerchantWallet;
        delete pendingMerchantWalletAt;
    }

    function cancelMerchantWalletChange() external onlyDAO {
        address pending = pendingMerchantWallet;
        delete pendingMerchantWallet;
        delete pendingMerchantWalletAt;
        emit MerchantWalletChangeCancelled(pending);
    }

    /**
     * @notice User creates an order. Funds are locked in this contract.
     * @param orderId Unique ID from Enterprise system (e.g., Amazon Order ID hash)
     * @param amount Amount of VFIDE to pay
     * @param meta Metadata (e.g., "Amazon Order #123")
     */
    // slither-disable-next-line reentrancy-no-eth
    function createOrder(bytes32 orderId, uint256 amount, string calldata meta) external nonReentrant {
        if (orders[orderId].status != Status.NONE) revert ENT_OrderExists();
        if (amount == 0) revert ENT_Zero();

        // Determine payer: caller vault when present, otherwise EOA.
        // This preserves vault-custody flows while remaining backward compatible.
        address userVault = vaultHub.vaultOf(msg.sender);
        address payer = userVault != address(0) ? userVault : msg.sender;
        
        // If user has a vault, we expect them to pay via vault (or approve from vault)
        // For simplicity in this gateway, we pull from msg.sender (EOA) or Vault if msg.sender is Vault
        // But standard flow: User approves Gateway. Gateway pulls.
        
        // Pull funds
        // FIX: Measure actual received amount to support Fee-on-Transfer tokens
        uint256 balanceBefore = token.balanceOf(address(this));
        token.safeTransferFrom(payer, address(this), amount);
        uint256 received = token.balanceOf(address(this)) - balanceBefore;

        orders[orderId] = Order({
            buyer: msg.sender, // The EOA initiating
            payer: payer,      // Actual source of funds (vault or EOA)
            amount: received,  // Record actual amount received
            status: Status.PENDING,
            timestamp: block.timestamp
        });
        totalPendingOrderAmount += received;

        emit OrderCreated(orderId, msg.sender, received, meta);
    }

    // ═══════════════════════════════════════════════════════════════════════
    //                    STABLECOIN SETTLEMENT (FOR MERCHANTS)
    // ═══════════════════════════════════════════════════════════════════════
    
    event StableSettlementConfigured(address swapRouter, address stablecoin, bool enabled);
    event OrderSettledToStable(bytes32 indexed orderId, address indexed buyer, uint256 vfideAmount, uint256 stableAmount);
    
    // DEX router for VFIDE → Stablecoin swaps
    address public swapRouter;
    address public settlementStablecoin;  // e.g., USDC
    bool public stableSettlementEnabled;
    uint16 public maxSlippageBps = 100;   // 1% max slippage
    // H-37 FIX: External reference price floor (DAO-set from off-chain oracle / Chainlink feed).
    // Represents the minimum acceptable stablecoin amount per 1e18 VFIDE (18 decimals).
    // Prevents tautological slippage where getAmountsOut + swap both use the same manipulated AMM state.
    uint256 public oracleFloorAmountPerVfide; // e.g. 0.95 USDC = 0.95e6 if stablecoin is 6-decimal
    
    /**
     * @notice Configure stablecoin settlement for merchants who need stable revenue
     * @param _router DEX router (Uniswap, SyncSwap, etc.)
     * @param _stablecoin Stablecoin to settle in (USDC, USDT, etc.)
     * @param _enabled Whether to auto-convert to stable
     * @param _maxSlippageBps Maximum slippage tolerance
     */
    function configureStableSettlement(
        address _router,
        address _stablecoin,
        bool _enabled,
        uint16 _maxSlippageBps
    ) external onlyDAO {
        require(_maxSlippageBps <= 500, "ENT: slippage too high"); // Max 5%
        if (_enabled) {
            if (_router == address(0) || _stablecoin == address(0)) revert ENT_Zero();
            require(_stablecoin != address(token), "ENT: invalid stablecoin");
        }
        swapRouter = _router;
        settlementStablecoin = _stablecoin;
        stableSettlementEnabled = _enabled;
        maxSlippageBps = _maxSlippageBps;
        emit StableSettlementConfigured(_router, _stablecoin, _enabled);
    }

    /// @notice H-37 FIX: DAO sets the external oracle floor price for swap validation.
    /// @param floorPerVfide Minimum stablecoin units per 1e18 VFIDE (0 = disabled).
    function setOracleFloor(uint256 floorPerVfide) external onlyDAO {
        oracleFloorAmountPerVfide = floorPerVfide;
    }

    /**
     * @notice Oracle (Amazon) confirms delivery/fulfillment. Funds released to Merchant.
     * @dev Triggers Trust Score reward for the buyer.
     * @dev If stableSettlementEnabled, converts VFIDE to stablecoin before sending to merchant
     */
    function settleOrder(bytes32 orderId) external onlyOracle nonReentrant {
        _settle(orderId);
    }

    /**
     * @notice Batch settlement for gas efficiency.
     */
    function settleBatch(bytes32[] calldata orderIds) external onlyOracle nonReentrant {
        for (uint256 i = 0; i < orderIds.length; i++) {
            _settle(orderIds[i]);
        }
    }

    function _settle(bytes32 orderId) internal {
        Order storage o = orders[orderId];
        if (o.status != Status.PENDING) revert ENT_NotPending();

        o.status = Status.SETTLED;
        totalPendingOrderAmount -= o.amount;
        
        uint256 stableReceived = 0;

        // If stable settlement enabled, swap VFIDE → Stablecoin
        if (stableSettlementEnabled && swapRouter != address(0) && settlementStablecoin != address(0)) {
            stableReceived = _swapToStable(o.amount);
            if (stableReceived > 0) {
                // Transfer stablecoin to merchant
                IERC20(settlementStablecoin).safeTransfer(merchantWallet, stableReceived);
                emit OrderSettledToStable(orderId, o.buyer, o.amount, stableReceived);
            } else {
                // Fallback to VFIDE if swap fails
                token.safeTransfer(merchantWallet, o.amount);
                emit OrderSettled(orderId, o.buyer, o.amount);
            }
        } else {
            // Standard VFIDE settlement
            token.safeTransfer(merchantWallet, o.amount);
            emit OrderSettled(orderId, o.buyer, o.amount);
        }

        // 2. Reward Buyer (Trust Mining)
        // Reward scales with amount? For now, fixed reward for verified commerce.
        // Let's say 10 points for a verified enterprise purchase.
        try seer.reward(o.buyer, 10, "enterprise_purchase") {} catch (bytes memory reason) {
            emit SeerRewardFailed(orderId, o.buyer, 10, reason);
        }
    }
    
    /**
     * @notice Internal: Swap VFIDE to stablecoin via DEX
     * @dev Uses simple swap interface - can be adapted for different DEXes
     * DEEP-C-1 FIX: Revoke approval after swap to prevent leftover allowance exploitation
     */
    function _swapToStable(uint256 vfideAmount) internal returns (uint256) {
        if (vfideAmount == 0) return 0;
        
        // Approve router
        token.forceApprove(swapRouter, vfideAmount);
        
        // Get expected output amount (use oracle or on-chain price if available)
        uint256 minAmountOut = 0;
        try ISwapRouter(swapRouter).getAmountsOut(vfideAmount, _getSwapPath()) returns (uint256[] memory amountsOut) {
            if (amountsOut.length == 0) {
                token.forceApprove(swapRouter, 0);
                return 0;
            }
            uint256 expectedOut = amountsOut[amountsOut.length - 1];
            minAmountOut = expectedOut * (10000 - maxSlippageBps) / 10000;
            // H-37 FIX: Apply external oracle floor to prevent tautological AMM slippage.
            if (oracleFloorAmountPerVfide > 0) {
                uint256 oracleFloor = vfideAmount * oracleFloorAmountPerVfide / 1e18;
                if (oracleFloor > minAmountOut) {
                    minAmountOut = oracleFloor;
                }
            }
            if (minAmountOut == 0) {
                token.forceApprove(swapRouter, 0);
                return 0;
            }
        } catch {
            token.forceApprove(swapRouter, 0);
            return 0;
        }
        
        // Perform swap with slippage protection
        try ISwapRouter(swapRouter).swapExactTokensForTokens(
            vfideAmount,
            minAmountOut,            _getSwapPath(),
            address(this),
            block.timestamp + 300 // 5 min deadline
        ) returns (uint256[] memory amounts) {
            // DEEP-C-1 FIX: Revoke leftover approval
            token.forceApprove(swapRouter, 0);
            return amounts[amounts.length - 1];
        } catch {
            // DEEP-C-1 FIX: Revoke approval on failure too
            token.forceApprove(swapRouter, 0);
            // Swap failed, return 0 to fallback to VFIDE settlement
            return 0;
        }
    }
    
    function _getSwapPath() internal view returns (address[] memory) {
        address[] memory path = new address[](2);
        path[0] = address(token);
        path[1] = settlementStablecoin;
        return path;
    }

    /**
     * @notice Emergency rescue for stuck tokens or blacklisted merchant wallet.
     */
    function rescueFunds(address _token, uint256 _amount, address _to) external onlyDAO nonReentrant {
        if (_token == address(0) || _to == address(0) || _amount == 0) revert ENT_Zero();

        if (_token == address(token)) {
            uint256 available = token.balanceOf(address(this)) - totalPendingOrderAmount;
            if (_amount > available) revert ENT_InsufficientAvailable();
        }

        IERC20(_token).safeTransfer(_to, _amount);
    }

    /**
     * @notice Oracle (Amazon) or DAO initiates refund.
     */
    function refundOrder(bytes32 orderId, string calldata reason) external nonReentrant {
        // Allow Oracle (Amazon return) or DAO (Dispute resolution)
        if (msg.sender != oracle && msg.sender != dao) revert ENT_NotOracle();
        
        Order storage o = orders[orderId];
        if (o.status != Status.PENDING) revert ENT_NotPending();

        o.status = Status.REFUNDED;
        totalPendingOrderAmount -= o.amount;

        // Return funds to original payer (vault or EOA)
        token.safeTransfer(o.payer, o.amount);

        emit OrderRefunded(orderId, o.payer, o.amount, reason);
    }

    /**
     * @notice Payer self-cancels a stale order after ORDER_PAYER_CANCEL_WINDOW.
     * @dev H-26 FIX: prevents funds being locked forever if oracle goes silent.
     */
    function cancelOrder(bytes32 orderId) external nonReentrant {
        Order storage o = orders[orderId];
        if (o.status != Status.PENDING) revert ENT_NotPending();
        require(
            msg.sender == o.buyer || msg.sender == o.payer,
            "ENT: only buyer/payer"
        );
        require(
            block.timestamp >= o.timestamp + ORDER_PAYER_CANCEL_WINDOW,
            "ENT: cancel window not elapsed"
        );

        o.status = Status.REFUNDED;
        totalPendingOrderAmount -= o.amount;
        token.safeTransfer(o.payer, o.amount);

        emit OrderCancelled(orderId, o.buyer, o.amount);
    }
}


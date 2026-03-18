// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import "./SharedInterfaces.sol"; // M-24 Fix: Use shared IERC20 and SafeERC20

interface IVaultHub_COM {
    function vaultOf(address owner) external view returns (address);
}
interface ISeer_COM {
    function getScore(address) external view returns (uint16);
    function minForMerchant() external view returns (uint16);
}
interface IProofLedger_COM {
    function logSystemEvent(address who, string calldata action, address by) external;
    function logEvent(address who, string calldata action, uint256 amount, string calldata note) external;
}
interface ISecurityHub_COM {
    function isLocked(address vault) external view returns (bool);
}

error COM_NotDAO();
error COM_Zero();
error COM_NotMerchant();
error COM_AlreadyMerchant();
error COM_NotActive();
error COM_Suspended();
error COM_Delisted();
error COM_NotBuyer();
error COM_NotSeller();
error COM_BadAmount();
error COM_BadState();
error COM_TooEarly();
error COM_NotFunded();
error COM_SecLocked();
error COM_NotAllowed();
error COM_BadRating();

contract MerchantRegistry {
    event ModulesSet(address dao, address token, address hub, address seer, address sec, address ledger);
    event PolicySet(uint16 minScore, uint8 autoSuspendRefunds, uint8 autoSuspendDisputes);
    event MerchantAdded(address indexed owner, address indexed vault, bytes32 metaHash);
    event MerchantStatus(address indexed owner, Status status, string reason);
    event AutoFlagged(address indexed owner, string reason);

    enum Status { NONE, ACTIVE, SUSPENDED, DELISTED }

    address public immutable dao;
    IERC20 public immutable token;
    IVaultHub_COM public immutable vaultHub;
    ISeer_COM public immutable seer;
    ISecurityHub_COM public immutable security;
    IProofLedger_COM public immutable ledger;

    struct Merchant {
        address owner;
        address vault;
        Status  status;
        uint32  refunds;
        uint32  disputes;
        bytes32 metaHash;
    }

    mapping(address => Merchant) public merchants;
    uint16 public minScore;
    uint8  public autoSuspendRefunds = 5;
    uint8  public autoSuspendDisputes = 3;

    modifier onlyDAO() { if (msg.sender != dao) revert COM_NotDAO(); _; }

    constructor(address _dao, address _token, address _hub, address _seer, address _sec, address _ledger) {
        if (_dao==address(0)||_token==address(0)||_hub==address(0)||_seer==address(0)) revert COM_Zero();
        dao=_dao; token=IERC20(_token); vaultHub=IVaultHub_COM(_hub); seer=ISeer_COM(_seer);
        security = ISecurityHub_COM(_sec);
        ledger = IProofLedger_COM(_ledger);
        minScore = ISeer_COM(_seer).minForMerchant();
        emit ModulesSet(_dao, _token, _hub, _seer, _sec, _ledger);
    }

    function addMerchant(bytes32 metaHash) external {
        if (merchants[msg.sender].status != Status.NONE) revert COM_AlreadyMerchant();
        address v = vaultHub.vaultOf(msg.sender);
        if (v == address(0)) revert COM_NotAllowed();
        uint16 score = seer.getScore(msg.sender);
        if (score < minScore) revert COM_NotAllowed();

        merchants[msg.sender] = Merchant({
            owner: msg.sender,
            vault: v,
            status: Status.ACTIVE,
            refunds: 0,
            disputes: 0,
            metaHash: metaHash
        });

        // H-17 Fix: Wrap ledger call in try-catch so ledger failure doesn't block registrations
        try ledger.logSystemEvent(msg.sender, "MerchantAdded", msg.sender) {} catch {}
        // slither-disable-next-line reentrancy-events
        emit MerchantAdded(msg.sender, v, metaHash);
    }

    // C-6 Fix: Track authorized callers for _noteRefund/_noteDispute
    address public authorizedEscrow;
    
    function setAuthorizedEscrow(address _escrow) external onlyDAO {
        if (_escrow == address(0)) revert COM_Zero();
        authorizedEscrow = _escrow;
    }

    function clearAuthorizedEscrow() external onlyDAO {
        authorizedEscrow = address(0);
    }
    
    function _noteRefund(address owner) external {
        // C-6 Fix: Only authorized escrow contract can call this
        require(msg.sender == authorizedEscrow || msg.sender == dao, "COM: not authorized");
        Merchant storage m = merchants[owner];
        if (m.status == Status.NONE) revert COM_NotMerchant();
        unchecked { m.refunds += 1; }
        if (m.refunds >= autoSuspendRefunds) {
            m.status = Status.SUSPENDED;
            emit AutoFlagged(owner, "refund_threshold");
        }
    }

    function _noteDispute(address owner) external {
        // C-6 Fix: Only authorized escrow contract can call this
        require(msg.sender == authorizedEscrow || msg.sender == dao, "COM: not authorized");
        Merchant storage m = merchants[owner];
        if (m.status == Status.NONE) revert COM_NotMerchant();
        unchecked { m.disputes += 1; }
        if (m.disputes >= autoSuspendDisputes) {
            m.status = Status.SUSPENDED;
            emit AutoFlagged(owner, "dispute_threshold");
        }
    }

    function info(address owner) external view returns (Merchant memory) { return merchants[owner]; }
}


/**
 * @title CommerceEscrow
 * @notice Standard e-commerce escrow for MerchantPortal payments.
 * @dev I-14 Architecture Note: Two escrow systems exist by design:
 *   - CommerceEscrow (this): For standard e-commerce payments through
 *     the MerchantPortal. Simpler state-machine (OPEN→FUNDED→RELEASED).
 *   - EscrowManager (EscrowManager.sol): For high-value/custom trades
 *     requiring arbiter dispute resolution and ProofScore-dynamic locks.
 *
 * Key differences from EscrowManager:
 *   - DAO-only dispute resolution (no arbiter)
 *   - Fixed timeouts (no ProofScore gating)
 *   - Integrated with MerchantRegistry for merchant verification
 */
// C-07 Fix: Add ReentrancyGuard to CommerceEscrow
contract CommerceEscrow {
    using SafeERC20 for IERC20;
    
    enum State { NONE, OPEN, FUNDED, RELEASED, REFUNDED, DISPUTED, RESOLVED }

    address public dao;
    IERC20     public token;
    IVaultHub_COM  public vaultHub;
    MerchantRegistry public merchants;
    ISecurityHub_COM public security;

    // C-07 Fix: Reentrancy guard
    uint256 private _reentrancyStatus = 1;
    modifier nonReentrant() {
        require(_reentrancyStatus == 1, "ReentrancyGuard: reentrant call");
        _reentrancyStatus = 2;
        _;
        _reentrancyStatus = 1;
    }

    struct Escrow {
        address buyerOwner;
        address merchantOwner;
        address buyerVault;
        address sellerVault;
        uint256 amount;
        State   state;
        bytes32 metaHash;
    }

    // H-16 Fix: Track per-escrow deposited amounts
    mapping(uint256 => uint256) public escrowDeposited;

    uint256 public escrowCount;
    mapping(uint256 => Escrow) public escrows;

    modifier onlyDAO() { if (msg.sender != dao) revert COM_NotDAO(); _; }

    constructor(address _dao, address _token, address _hub, address _merchants, address _sec, address /*_ledger*/) {
        if (_dao==address(0)||_token==address(0)||_hub==address(0)||_merchants==address(0)) revert COM_Zero();
        dao=_dao; token=IERC20(_token); vaultHub=IVaultHub_COM(_hub); merchants=MerchantRegistry(_merchants);
        security = ISecurityHub_COM(_sec);
    }

    function open(address merchantOwner, uint256 amount, bytes32 metaHash) external returns (uint256 id) {
        if (amount == 0) revert COM_BadAmount();
        MerchantRegistry.Merchant memory m = merchants.info(merchantOwner);
        if (m.status == MerchantRegistry.Status.NONE) revert COM_NotMerchant();
        if (m.status == MerchantRegistry.Status.SUSPENDED) revert COM_Suspended();
        if (m.status == MerchantRegistry.Status.DELISTED) revert COM_Delisted();

        address buyerV = vaultHub.vaultOf(msg.sender);
        if (buyerV == address(0)) revert COM_NotBuyer();
        id = ++escrowCount;
        escrows[id] = Escrow({
            buyerOwner: msg.sender,
            merchantOwner: merchantOwner,
            buyerVault: buyerV,
            sellerVault: m.vault,
            amount: amount,
            state: State.OPEN,
            metaHash: metaHash
        });
    }

    // H-16 Fix: Add access control (buyer or merchant only) and per-escrow deposit tracking
    function markFunded(uint256 id) external {
        Escrow storage e = escrows[id];
        if (e.state != State.OPEN) revert COM_BadState();
        // H-16 Fix: Only buyer or merchant can mark funded
        if (msg.sender != e.buyerOwner && msg.sender != e.merchantOwner && msg.sender != dao) revert COM_NotAllowed();
        // H-16 Fix: Transfer tokens from buyer vault into escrow (per-escrow accounting)
        token.safeTransferFrom(e.buyerVault, address(this), e.amount);
        escrowDeposited[id] = e.amount;
        e.state = State.FUNDED;
    }

    // C-07 Fix: Add nonReentrant to all token-transferring functions
    function release(uint256 id) external nonReentrant {
        Escrow storage e = escrows[id];
        if (e.state != State.FUNDED) revert COM_BadState();
        if (msg.sender != e.buyerOwner && msg.sender != dao) revert COM_NotAllowed();
        e.state = State.RELEASED;
        token.safeTransfer(e.sellerVault, e.amount);
    }

    function refund(uint256 id) external nonReentrant {
        Escrow storage e = escrows[id];
        if (e.state != State.FUNDED && e.state != State.DISPUTED) revert COM_BadState();
        if (msg.sender != e.merchantOwner && msg.sender != dao) revert COM_NotAllowed();
        e.state = State.REFUNDED;
        // C-7 Fix: Update merchant state BEFORE external token transfer (CEI pattern)
        merchants._noteRefund(e.merchantOwner);
        token.safeTransfer(e.buyerVault, e.amount);
    }

    function dispute(uint256 id, string calldata /*reason*/) external {
        Escrow storage e = escrows[id];
        if (e.state != State.FUNDED) revert COM_BadState();
        if (msg.sender != e.buyerOwner && msg.sender != e.merchantOwner) revert COM_NotAllowed();
        e.state = State.DISPUTED;
        merchants._noteDispute(e.merchantOwner);
    }

    // C-07 Fix: Add nonReentrant
    function resolve(uint256 id, bool buyerWins) external nonReentrant onlyDAO {
        Escrow storage e = escrows[id];
        if (e.state != State.DISPUTED) revert COM_BadState();
        e.state = State.RESOLVED;
        if (buyerWins) {
            token.safeTransfer(e.buyerVault, e.amount);
        } else {
            token.safeTransfer(e.sellerVault, e.amount);
        }
    }
}


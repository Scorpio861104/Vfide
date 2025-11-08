// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

// Copied from /contracts/VFIDECommerce.sol (trimmed/adjusted for contracts-min usage)

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
interface IERC20_COM {
    function balanceOf(address) external view returns (uint256);
    function transfer(address to, uint256 value) external returns (bool);
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

    address public dao;
    IERC20_COM     public token;
    IVaultHub_COM  public vaultHub;
    ISeer_COM      public seer;
    ISecurityHub_COM public security;
    IProofLedger_COM public ledger;

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

    // TEST-ONLY toggles (only for coverage/test harness)
    bool public TEST_onlyDAO_off;
    bool public TEST_forceAlreadyMerchant;
    bool public TEST_forceNoVault;
    bool public TEST_forceLowScore;
    bool public TEST_forceZeroSender_refund;
    bool public TEST_forceZeroSender_dispute;

    function TEST_setOnlyDAOOff(bool v) external { TEST_onlyDAO_off = v; }
    function TEST_setForceAlreadyMerchant(bool v) external { TEST_forceAlreadyMerchant = v; }
    function TEST_setForceNoVault(bool v) external { TEST_forceNoVault = v; }
    function TEST_setForceLowScore(bool v) external { TEST_forceLowScore = v; }
    function TEST_setForceZeroSenderRefund(bool v) external { TEST_forceZeroSender_refund = v; }
    function TEST_setForceZeroSenderDispute(bool v) external { TEST_forceZeroSender_dispute = v; }

    modifier onlyDAO() { if (msg.sender != dao && !TEST_onlyDAO_off) revert COM_NotDAO(); _; }

    constructor(address _dao, address _token, address _hub, address _seer, address _sec, address _ledger) {
        if (_dao==address(0)||_token==address(0)||_hub==address(0)||_seer==address(0)) revert COM_Zero();
        dao=_dao; token=IERC20_COM(_token); vaultHub=IVaultHub_COM(_hub); seer=ISeer_COM(_seer);
        security = ISecurityHub_COM(_sec);
        ledger = IProofLedger_COM(_ledger);
        minScore = ISeer_COM(_seer).minForMerchant();
        emit ModulesSet(_dao, _token, _hub, _seer, _sec, _ledger);
    }

    function addMerchant(bytes32 metaHash) external {
    if (merchants[msg.sender].status != Status.NONE || TEST_forceAlreadyMerchant) revert COM_AlreadyMerchant();
    address v = vaultHub.vaultOf(msg.sender);
    if (v == address(0) || TEST_forceNoVault) revert COM_NotAllowed();
    if (seer.getScore(msg.sender) < minScore || TEST_forceLowScore) revert COM_NotAllowed();
        merchants[msg.sender] = Merchant({
            owner: msg.sender,
            vault: v,
            status: Status.ACTIVE,
            refunds: 0,
            disputes: 0,
            metaHash: metaHash
        });
        emit MerchantAdded(msg.sender, v, metaHash);
    }

    function _noteRefund(address owner) external {
    if (msg.sender == address(0) || TEST_forceZeroSender_refund) revert COM_Zero();
        Merchant storage m = merchants[owner];
        if (m.status == Status.NONE) revert COM_NotMerchant();
        unchecked { m.refunds += 1; }
        if (m.refunds >= autoSuspendRefunds) {
            m.status = Status.SUSPENDED;
            emit AutoFlagged(owner, "refund_threshold");
        }
    }

    function _noteDispute(address owner) external {
    if (msg.sender == address(0) || TEST_forceZeroSender_dispute) revert COM_Zero();
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

contract CommerceEscrow {
    enum State { NONE, OPEN, FUNDED, RELEASED, REFUNDED, DISPUTED, RESOLVED }

    address public dao;
    IERC20_COM     public token;
    IVaultHub_COM  public vaultHub;
    MerchantRegistry public merchants;
    ISecurityHub_COM public security;

    struct Escrow {
        address buyerOwner;
        address merchantOwner;
        address buyerVault;
        address sellerVault;
        uint256 amount;
        State   state;
        bytes32 metaHash;
    }

    uint256 public escrowCount;
    mapping(uint256 => Escrow) public escrows;

    modifier onlyDAO() { if (msg.sender != dao) revert COM_NotDAO(); _; }

    constructor(address _dao, address _token, address _hub, address _merchants, address _sec, address /*_ledger*/) {
        if (_dao==address(0)||_token==address(0)||_hub==address(0)||_merchants==address(0)) revert COM_Zero();
        dao=_dao; token=IERC20_COM(_token); vaultHub=IVaultHub_COM(_hub); merchants=MerchantRegistry(_merchants);
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

    function markFunded(uint256 id) external {
        Escrow storage e = escrows[id];
        if (e.state != State.OPEN) revert COM_BadState();
        uint256 bal = token.balanceOf(address(this));
        if (bal < e.amount) revert COM_NotFunded();
        e.state = State.FUNDED;
    }

    function release(uint256 id) external {
        Escrow storage e = escrows[id];
        if (e.state != State.FUNDED) revert COM_BadState();
        if (msg.sender != e.buyerOwner && msg.sender != dao) revert COM_NotAllowed();
        e.state = State.RELEASED;
        require(token.transfer(e.sellerVault, e.amount), "transfer fail");
    }

    function refund(uint256 id) external {
        Escrow storage e = escrows[id];
        if (e.state != State.FUNDED && e.state != State.DISPUTED) revert COM_BadState();
        if (msg.sender != e.merchantOwner && msg.sender != dao) revert COM_NotAllowed();
        e.state = State.REFUNDED;
        require(token.transfer(e.buyerVault, e.amount), "transfer fail");
        merchants._noteRefund(e.merchantOwner);
    }

    function dispute(uint256 id, string calldata reason) external {
        Escrow storage e = escrows[id];
        if (e.state != State.FUNDED) revert COM_BadState();
        if (msg.sender != e.buyerOwner && msg.sender != e.merchantOwner) revert COM_NotAllowed();
        e.state = State.DISPUTED;
        merchants._noteDispute(e.merchantOwner);
    }

    function resolve(uint256 id, bool buyerWins) external onlyDAO {
        Escrow storage e = escrows[id];
        if (e.state != State.DISPUTED) revert COM_BadState();
        e.state = State.RESOLVED;
        if (buyerWins) {
            require(token.transfer(e.buyerVault, e.amount), "transfer fail");
        } else {
            require(token.transfer(e.sellerVault, e.amount), "transfer fail");
        }
    }
}

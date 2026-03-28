// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import "../../../contracts/SharedInterfaces.sol";

// Copied from /contracts/VFIDECommerce.sol and modified for testing

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

contract MerchantRegistryTestable {
    event ModulesSet(address dao, address token, address hub, address seer, address sec, address ledger);
    event PolicySet(uint16 minScore, uint8 autoSuspendRefunds, uint8 autoSuspendDisputes);
    event MerchantAdded(address indexed owner, address indexed vault, bytes32 metaHash);
    event MerchantStatus(address indexed owner, Status status, string reason);
    event AutoFlagged(address indexed owner, string reason);

    enum Status { NONE, ACTIVE, SUSPENDED, DELISTED }

    address public immutable dao;
    IERC20 public immutable token;
    IVaultHub public immutable vaultHub;
    ISeer public immutable seer;
    ISecurityHub public immutable security;
    IProofLedger public immutable ledger;

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

    // TEST FLAGS
    bool public _test_onlyDAOOff;
    bool public _test_forceAlreadyMerchant;
    bool public _test_forceNoVault;
    bool public _test_forceLowScore;
    bool public _test_forceZeroSenderRefund;
    bool public _test_forceZeroSenderDispute;

    modifier onlyDAO() { 
        if (!_test_onlyDAOOff && msg.sender != dao) revert COM_NotDAO(); 
        _; 
    }

    constructor(address _dao, address _token, address _hub, address _seer, address _sec, address _ledger) {
        if (_dao==address(0)||_token==address(0)||_hub==address(0)||_seer==address(0)) revert COM_Zero();
        dao=_dao; token=IERC20(_token); vaultHub=IVaultHub(_hub); seer=ISeer(_seer);
        security = ISecurityHub(_sec);
        ledger = IProofLedger(_ledger);
        // minScore = ISeer(_seer).minForMerchant();
        emit ModulesSet(_dao, _token, _hub, _seer, _sec, _ledger);
    }

    function TEST_setOnlyDAOOff(bool v) external { _test_onlyDAOOff = v; }
    function TEST_setForceAlreadyMerchant(bool v) external { _test_forceAlreadyMerchant = v; }
    function TEST_setForceNoVault(bool v) external { _test_forceNoVault = v; }
    function TEST_setForceLowScore(bool v) external { _test_forceLowScore = v; }
    function TEST_setForceZeroSenderRefund(bool v) external { _test_forceZeroSenderRefund = v; }
    function TEST_setForceZeroSenderDispute(bool v) external { _test_forceZeroSenderDispute = v; }

    function setPolicy(uint16 _minScore, uint8 _autoSuspendRefunds, uint8 _autoSuspendDisputes) external onlyDAO {
        minScore = _minScore;
        autoSuspendRefunds = _autoSuspendRefunds;
        autoSuspendDisputes = _autoSuspendDisputes;
        emit PolicySet(_minScore, _autoSuspendRefunds, _autoSuspendDisputes);
    }

    function addMerchant(bytes32 metaHash) external {
        if (_test_forceAlreadyMerchant || merchants[msg.sender].status != Status.NONE) revert COM_AlreadyMerchant();
        
        address v = vaultHub.vaultOf(msg.sender);
        if (_test_forceNoVault) v = address(0);
        
        if (v == address(0)) revert COM_NotAllowed();
        
        uint16 score = seer.getScore(msg.sender);
        if (_test_forceLowScore) score = 0;
        
        if (score < minScore) revert COM_BadRating();

        merchants[msg.sender] = Merchant({
            owner: msg.sender,
            vault: v,
            status: Status.ACTIVE,
            refunds: 0,
            disputes: 0,
            metaHash: metaHash
        });

        ledger.logSystemEvent(msg.sender, "MerchantAdded", msg.sender);
        emit MerchantAdded(msg.sender, v, metaHash);
    }

    function reportRefund(address owner) external {
        if (_test_forceZeroSenderRefund) {
            // Simulate zero sender check failure? 
            // The original code: if (msg.sender == address(0)) revert COM_Zero();
            // If we want to force it to revert, we can't easily change msg.sender.
            // But maybe the test expects us to bypass the check?
            // Or maybe the test expects us to FAIL the check?
            // "TEST_setForceZeroSenderRefund" sounds like it forces the condition "msg.sender == 0" to be true?
            // If so, it should revert.
            revert COM_Zero();
        }
        if (msg.sender == address(0)) revert COM_Zero();
        
        Merchant storage m = merchants[owner];
        if (m.status == Status.NONE) revert COM_NotMerchant();
        unchecked { m.refunds += 1; }
        if (m.refunds >= autoSuspendRefunds) {
            m.status = Status.SUSPENDED;
            emit AutoFlagged(owner, "refund_threshold");
        }
    }

    function reportDispute(address owner) external {
        if (_test_forceZeroSenderDispute) {
            revert COM_Zero();
        }
        if (msg.sender == address(0)) revert COM_Zero();
        
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

contract CommerceEscrowTestable {
    enum State { NONE, OPEN, FUNDED, RELEASED, REFUNDED, DISPUTED, RESOLVED }

    address public dao;
    IERC20     public token;
    IVaultHub  public vaultHub;
    MerchantRegistryTestable public merchants;
    ISecurityHub public security;

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
        dao=_dao; token=IERC20(_token); vaultHub=IVaultHub(_hub); merchants=MerchantRegistryTestable(_merchants);
        security = ISecurityHub(_sec);
    }

    function open(address merchantOwner, uint256 amount, bytes32 metaHash) external returns (uint256 id) {
        if (amount == 0) revert COM_BadAmount();
        MerchantRegistryTestable.Merchant memory m = merchants.info(merchantOwner);
        if (m.status == MerchantRegistryTestable.Status.NONE) revert COM_NotMerchant();
        if (m.status == MerchantRegistryTestable.Status.SUSPENDED) revert COM_Suspended();
        if (m.status == MerchantRegistryTestable.Status.DELISTED) revert COM_Delisted();

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
        merchants.reportRefund(e.merchantOwner);
    }

    function dispute(uint256 id, string calldata reason) external {
        Escrow storage e = escrows[id];
        if (e.state != State.FUNDED) revert COM_BadState();
        if (msg.sender != e.buyerOwner && msg.sender != e.merchantOwner) revert COM_NotAllowed();
        e.state = State.DISPUTED;
        merchants.reportDispute(e.merchantOwner);
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

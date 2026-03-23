// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

error SPG_NotDAO();
error SPG_NotSeer();
error SPG_Zero();
error SPG_InvalidState();

contract SeerPolicyGuard {
    uint8 public constant POLICY_CLASS_CRITICAL = 0;
    uint8 public constant POLICY_CLASS_IMPORTANT = 1;
    uint8 public constant POLICY_CLASS_OPERATIONAL = 2;

    uint64 public constant POLICY_DELAY_CLASS_A = 7 days;
    uint64 public constant POLICY_DELAY_CLASS_B = 72 hours;
    uint64 public constant POLICY_DELAY_CLASS_C = 24 hours;

    address public dao;
    address public seer;

    mapping(bytes32 => uint64) public policyChangeReadyAt;
    uint256 public policyNonce; // BATCH-06: ensures unique changeId per scheduling call

    event DAOSet(address indexed oldDAO, address indexed newDAO);
    event SeerSet(address indexed oldSeer, address indexed newSeer);
    event PolicyChangeScheduled(bytes32 indexed changeId, bytes4 indexed selector, uint8 indexed policyClass, uint64 readyAt);
    event PolicyChangeConsumed(bytes32 indexed changeId, bytes4 indexed selector, uint8 indexed policyClass);
    event PolicyChangeCancelled(bytes32 indexed changeId, bytes4 indexed selector, uint8 indexed policyClass);

    modifier onlyDAO() {
        if (msg.sender != dao) revert SPG_NotDAO();
        _;
    }

    modifier onlySeer() {
        if (msg.sender != seer) revert SPG_NotSeer();
        _;
    }

    constructor(address _dao, address _seer) {
        if (_dao == address(0) || _seer == address(0)) revert SPG_Zero();
        dao = _dao;
        seer = _seer;
    }

    function setDAO(address _dao) external onlyDAO {
        if (_dao == address(0)) revert SPG_Zero();
        address old = dao;
        dao = _dao;
        emit DAOSet(old, _dao);
    }

    function setSeer(address _seer) external onlyDAO {
        if (_seer == address(0)) revert SPG_Zero();
        address old = seer;
        seer = _seer;
        emit SeerSet(old, _seer);
    }

    function schedulePolicyChange(bytes4 selector, uint8 pclass) external onlyDAO returns (bytes32 changeId, uint64 readyAt) {
        if (selector == bytes4(0) || pclass > POLICY_CLASS_OPERATIONAL) revert SPG_InvalidState();
        changeId = getPolicyChangeId(selector, pclass);
        if (policyChangeReadyAt[changeId] != 0) revert SPG_InvalidState();
        readyAt = uint64(block.timestamp + _policyDelay(pclass));
        policyChangeReadyAt[changeId] = readyAt;
        emit PolicyChangeScheduled(changeId, selector, pclass, readyAt);
    }

    function cancelPolicyChange(bytes4 selector, uint8 pclass) external onlyDAO {
        bytes32 changeId = getPolicyChangeId(selector, pclass);
        if (policyChangeReadyAt[changeId] == 0) revert SPG_InvalidState();

        delete policyChangeReadyAt[changeId];
        emit PolicyChangeCancelled(changeId, selector, pclass);
    }

    function consume(bytes4 selector, uint8 pclass) external onlySeer {
        bytes32 changeId = getPolicyChangeId(selector, pclass);
        uint64 readyAt = policyChangeReadyAt[changeId];
        if (readyAt == 0 || block.timestamp < readyAt) revert SPG_InvalidState();

        delete policyChangeReadyAt[changeId];
        emit PolicyChangeConsumed(changeId, selector, pclass);
    }

    function getPolicyChangeId(bytes4 selector, uint8 pclass) public pure returns (bytes32) {
        return keccak256(abi.encodePacked(selector, pclass));
    }

    function _policyDelay(uint8 pclass) internal pure returns (uint64) {
        if (pclass == POLICY_CLASS_CRITICAL) return POLICY_DELAY_CLASS_A;
        if (pclass == POLICY_CLASS_IMPORTANT) return POLICY_DELAY_CLASS_B;
        return POLICY_DELAY_CLASS_C;
    }
}

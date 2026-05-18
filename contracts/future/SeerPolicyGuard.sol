// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

error SPG_NotDAO();
error SPG_NotSeer();
error SPG_Zero();
error SPG_InvalidState();
error SPG_NoPending();
error SPG_TimelockActive();

contract SeerPolicyGuard {
    uint8 public constant POLICY_CLASS_CRITICAL = 0;
    uint8 public constant POLICY_CLASS_IMPORTANT = 1;
    uint8 public constant POLICY_CLASS_OPERATIONAL = 2;

    uint64 public constant POLICY_DELAY_CLASS_A = 7 days;
    uint64 public constant POLICY_DELAY_CLASS_B = 72 hours;
    uint64 public constant POLICY_DELAY_CLASS_C = 24 hours;
    /// @notice N-L35 FIX: DAO rotation uses the same 48h delay as SeerGuardian
    ///         to prevent an instant capture of the policy guard via DAO takeover.
    uint64 public constant DAO_ROTATION_DELAY = 48 hours;

    address public dao;
    address public seer;
    bool public seerMigrationInProgress;
    address public pendingSeer;
    // N-L35 FIX: two-step DAO rotation state
    address public pendingDAO;
    uint64 public pendingDAOAt;
    uint256 private _guardLock;

    mapping(bytes32 => uint64) public policyChangeReadyAt;

    event DAOSet(address indexed oldDAO, address indexed newDAO);
    event DAOChangeQueued(address indexed pendingDAO, uint64 effectiveAt);
    event DAOChangeCancelled(address indexed cancelledDAO);
    event SeerSet(address indexed oldSeer, address indexed newSeer);
    event SeerMigrationStarted(address indexed oldSeer, address indexed newSeer);
    event SeerMigrationCancelled(address indexed oldSeer, address indexed pendingSeer);
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

    modifier nonReentrantSPG() {
        if (_guardLock != 0) revert SPG_InvalidState();
        _guardLock = 1;
        _;
        _guardLock = 0;
    }

    constructor(address _dao, address _seer) {
        if (_dao == address(0) || _seer == address(0)) revert SPG_Zero();
        dao = _dao;
        seer = _seer;
    }

    /// @notice N-L35 FIX: Queue a DAO rotation with a 48h delay.
    ///         Mirrors the two-step pattern used by SeerGuardian.setDAO.
    function setDAO(address _dao) external onlyDAO nonReentrantSPG {
        if (_dao == address(0)) revert SPG_Zero();
        if (pendingDAOAt != 0) revert SPG_InvalidState(); // rotation already pending
        pendingDAO = _dao;
        pendingDAOAt = uint64(block.timestamp) + DAO_ROTATION_DELAY;
        emit DAOChangeQueued(_dao, pendingDAOAt);
    }

    /// @notice Apply the pending DAO rotation after the 48h delay.
    function applyDAO() external onlyDAO nonReentrantSPG {
        if (pendingDAO == address(0) || pendingDAOAt == 0) revert SPG_NoPending();
        if (block.timestamp < pendingDAOAt) revert SPG_TimelockActive();
        address old = dao;
        dao = pendingDAO;
        delete pendingDAO;
        delete pendingDAOAt;
        emit DAOSet(old, dao);
    }

    /// @notice Cancel a pending DAO rotation before it takes effect.
    function cancelDAO() external onlyDAO nonReentrantSPG {
        if (pendingDAOAt == 0) revert SPG_NoPending();
        address cancelled = pendingDAO;
        delete pendingDAO;
        delete pendingDAOAt;
        emit DAOChangeCancelled(cancelled);
    }

    function setSeer(address _seer) external onlyDAO nonReentrantSPG {
        if (_seer == address(0)) revert SPG_Zero();
        if (seerMigrationInProgress) revert SPG_InvalidState();
        address old = seer;
        seer = _seer;
        emit SeerSet(old, _seer);
    }

    /// @notice Begin planned Seer migration and freeze policy consumption during handoff.
    function beginSeerMigration(address _seer) external onlyDAO nonReentrantSPG {
        if (_seer == address(0) || _seer == seer) revert SPG_InvalidState();
        if (seerMigrationInProgress) revert SPG_InvalidState();
        seerMigrationInProgress = true;
        pendingSeer = _seer;
        emit SeerMigrationStarted(seer, _seer);
    }

    /// @notice Finalize migration by applying pendingSeer and unfreezing consumes.
    function finalizeSeerMigration() external onlyDAO nonReentrantSPG {
        if (!seerMigrationInProgress || pendingSeer == address(0)) revert SPG_InvalidState();
        address old = seer;
        seer = pendingSeer;
        pendingSeer = address(0);
        seerMigrationInProgress = false;
        emit SeerSet(old, seer);
    }

    /// @notice Cancel an in-progress Seer migration and unfreeze consumes.
    function cancelSeerMigration() external onlyDAO nonReentrantSPG {
        if (!seerMigrationInProgress) revert SPG_InvalidState();
        address old = seer;
        address pending = pendingSeer;
        pendingSeer = address(0);
        seerMigrationInProgress = false;
        emit SeerMigrationCancelled(old, pending);
    }

    function schedulePolicyChange(bytes4 selector, uint8 pclass) external onlyDAO nonReentrantSPG returns (bytes32 changeId, uint64 readyAt) {
        if (selector == bytes4(0) || pclass > POLICY_CLASS_OPERATIONAL) revert SPG_InvalidState();
        changeId = getPolicyChangeId(selector, pclass);
        if (policyChangeReadyAt[changeId] != 0) revert SPG_InvalidState();
        readyAt = uint64(block.timestamp + _policyDelay(pclass));
        policyChangeReadyAt[changeId] = readyAt;
        emit PolicyChangeScheduled(changeId, selector, pclass, readyAt);
    }

    function cancelPolicyChange(bytes4 selector, uint8 pclass) external onlyDAO nonReentrantSPG {
        bytes32 changeId = getPolicyChangeId(selector, pclass);
        if (policyChangeReadyAt[changeId] == 0) revert SPG_InvalidState();

        delete policyChangeReadyAt[changeId];
        emit PolicyChangeCancelled(changeId, selector, pclass);
    }

    function consume(bytes4 selector, uint8 pclass) external onlySeer nonReentrantSPG {
        if (seerMigrationInProgress) revert SPG_InvalidState();
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

        /// @notice F-34 FIX: Generate change ID with parameter hash
        /// @dev Caller must hash all policy parameters: keccak256(abi.encode(param1, param2, ...))
        function getPolicyChangeIdWithHash(bytes4 selector, uint8 pclass, bytes32 paramHash)
            public pure returns (bytes32)
        {
            return keccak256(abi.encode(selector, pclass, paramHash));
        }

        /// @notice F-34 FIX: Schedule policy change with parameter binding
        function schedulePolicyChangeWithParams(bytes4 selector, uint8 pclass, bytes32 paramHash)
            external onlyDAO nonReentrantSPG returns (bytes32 changeId, uint64 readyAt)
        {
            if (selector == bytes4(0) || pclass > POLICY_CLASS_OPERATIONAL) revert SPG_InvalidState();
            if (paramHash == bytes32(0)) revert SPG_InvalidState();
            changeId = getPolicyChangeIdWithHash(selector, pclass, paramHash);
            if (policyChangeReadyAt[changeId] != 0) revert SPG_InvalidState();
            readyAt = uint64(block.timestamp + _policyDelay(pclass));
            policyChangeReadyAt[changeId] = readyAt;
            emit PolicyChangeScheduled(changeId, selector, pclass, readyAt);
        }

        /// @notice F-34 FIX: Consume policy change with parameter validation
        function consumeWithParams(bytes4 selector, uint8 pclass, bytes32 paramHash)
            external onlySeer nonReentrantSPG
        {
            if (seerMigrationInProgress) revert SPG_InvalidState();
            bytes32 changeId = getPolicyChangeIdWithHash(selector, pclass, paramHash);
            uint64 readyAt = policyChangeReadyAt[changeId];
            if (readyAt == 0 || block.timestamp < readyAt) revert SPG_InvalidState();
            delete policyChangeReadyAt[changeId];
            emit PolicyChangeConsumed(changeId, selector, pclass);
        }

        /// @notice F-34 FIX: Cancel a policy change with parameter binding
        function cancelPolicyChangeWithParams(bytes4 selector, uint8 pclass, bytes32 paramHash)
            external onlyDAO nonReentrantSPG
        {
            bytes32 changeId = getPolicyChangeIdWithHash(selector, pclass, paramHash);
            if (policyChangeReadyAt[changeId] == 0) revert SPG_InvalidState();
            delete policyChangeReadyAt[changeId];
            emit PolicyChangeCancelled(changeId, selector, pclass);
        }
}

// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {ReentrancyGuard, IERC20, ISeer} from "./SharedInterfaces.sol";

/**
 * @title AdminMultiSig
 * @notice Multi-signature requirement for critical operations with timelock delays and community veto
 * @dev Implements 3/5 council approval system with configurable delays and emergency override
 * @author Vfide
 */
contract AdminMultiSig is ReentrancyGuard {
    /// @notice COUNCIL_SIZE
    uint256 public constant COUNCIL_SIZE = 5;
    /// @notice REQUIRED_APPROVALS
    uint256 public constant REQUIRED_APPROVALS = 3;
    /// @notice EMERGENCY_APPROVALS
    uint256 public constant EMERGENCY_APPROVALS = 4;

    /// @notice CONFIG_DELAY
    uint256 public constant CONFIG_DELAY = 24 hours;
    /// @notice CRITICAL_DELAY
    uint256 public constant CRITICAL_DELAY = 48 hours;
    /// @notice EMERGENCY_DELAY
    uint256 public constant EMERGENCY_DELAY = 1 hours;
    /// @notice VETO_WINDOW
    uint256 public constant VETO_WINDOW = 24 hours;
    /// @notice PROPOSAL_EXPIRY
    uint256 public constant PROPOSAL_EXPIRY = 30 days;

    enum ProposalType {
        CONFIG,
        CRITICAL,
        EMERGENCY
    }

    enum ProposalStatus {
        Pending,
        Approved,
        Executed,
        Vetoed,
        Expired
    }

    struct Proposal {
        uint256 id;
        address proposer;
        ProposalType proposalType;
        ProposalStatus status;
        uint256 createdAt;
        uint256 executionTime;
        uint256 approvalCount;
        uint256 vetoCount;
        bytes data;
        address target;
        string description;
        mapping(address => bool) hasApproved;
        mapping(address => bool) hasVetoed;
    }

    /// @notice council
    address[COUNCIL_SIZE] public council;
    /// @notice isCouncilMember
    mapping(address => bool) public isCouncilMember;

    /// @notice proposalCount
    uint256 public proposalCount;
    /// @notice proposals
    mapping(uint256 => Proposal) public proposals;

    /// @notice vetoThreshold
    uint256 public vetoThreshold = 100; // 100 veto votes needed
    // This makes Sybil attacks economically costly — 100 wallets × 10,000 VFIDE = 1M VFIDE locked.
    /// @notice vetoMinStake
    uint256 public vetoMinStake = 10_000e18; // 10,000 VFIDE minimum to cast one veto vote (fallback when seer not set)
    /// @notice vfideToken
    IERC20 public vfideToken; // VFIDE token reference for fallback stake checks
    /// @notice seer
    ISeer public seer; // M-6 FIX: ProofScore oracle — primary veto eligibility gate
    /// @notice vetoMinScore
    uint16 public vetoMinScore = 5000; // M-6 FIX: minimum ProofScore (50/100) to cast a veto vote
    /// @notice communityVetos
    mapping(uint256 => mapping(address => bool)) public communityVetos;
    /// @notice proposalTypeTargetAllowed
    mapping(ProposalType => mapping(address => bool)) public proposalTypeTargetAllowed;
    /// @notice proposalTypeSelectorAllowed
    mapping(ProposalType => mapping(bytes4 => bool)) public proposalTypeSelectorAllowed;

    /// @notice NO_ACTIVE_PROPOSAL
    uint256 private constant NO_ACTIVE_PROPOSAL = type(uint256).max;
    /// @notice executingProposalId
    uint256 private executingProposalId = NO_ACTIVE_PROPOSAL;
    /// @notice executionGasLimit
    uint256 public executionGasLimit = 500_000;
    /// @notice SELECTOR_SET_VFIDE_TOKEN
    bytes4 private constant SELECTOR_SET_VFIDE_TOKEN = bytes4(keccak256("setVFIDEToken(address)"));
    /// @notice SELECTOR_SET_SEER
    bytes4 private constant SELECTOR_SET_SEER = bytes4(keccak256("setSeer(address)"));
    /// @notice SELECTOR_SET_VETO_MIN_SCORE
    bytes4 private constant SELECTOR_SET_VETO_MIN_SCORE = bytes4(
        keccak256("setVetoMinScore(uint16)")
    );
    /// @notice SELECTOR_SET_VETO_MIN_STAKE
    bytes4 private constant SELECTOR_SET_VETO_MIN_STAKE = bytes4(
        keccak256("setVetoMinStake(uint256)")
    );
    /// @notice SELECTOR_SET_VETO_THRESHOLD
    bytes4 private constant SELECTOR_SET_VETO_THRESHOLD = bytes4(
        keccak256("setVetoThreshold(uint256)")
    );
    /// @notice SELECTOR_SET_EXECUTION_GAS_LIMIT
    bytes4 private constant SELECTOR_SET_EXECUTION_GAS_LIMIT = bytes4(
        keccak256("setExecutionGasLimit(uint256)")
    );
    /// @notice SELECTOR_UPDATE_COUNCIL_MEMBER
    bytes4 private constant SELECTOR_UPDATE_COUNCIL_MEMBER = bytes4(
        keccak256("updateCouncilMember(uint256,address)")
    );
    /// @notice SELECTOR_SET_TARGET_ALLOW
    bytes4 private constant SELECTOR_SET_TARGET_ALLOW = bytes4(
        keccak256("setProposalTypeTargetAllowed(uint8,address,bool)")
    );
    /// @notice SELECTOR_SET_SELECTOR_ALLOW
    bytes4 private constant SELECTOR_SET_SELECTOR_ALLOW = bytes4(
        keccak256("setProposalTypeSelectorAllowed(uint8,bytes4,bool)")
    );
    /// @notice ProposalCreated
    /// @param proposalId proposalId
    /// @param proposer proposer
    /// @param proposalType proposalType
    /// @param target target
    /// @param description description
    event ProposalCreated(
        uint256 indexed proposalId,
        address indexed proposer,
        ProposalType proposalType,
        address target,
        string description
    );

    /// @notice ProposalApproved
    /// @param proposalId proposalId
    /// @param approver approver
    /// @param approvalCount approvalCount
    event ProposalApproved(
        uint256 indexed proposalId,
        address indexed approver,
        uint256 approvalCount
    );
    /// @notice ProposalExecuted
    /// @param proposalId proposalId
    /// @param executor executor
    event ProposalExecuted(uint256 indexed proposalId, address indexed executor);
    /// @notice ProposalVetoed
    /// @param proposalId proposalId
    /// @param vetoer vetoer
    event ProposalVetoed(uint256 indexed proposalId, address indexed vetoer);
    /// @notice CommunityVeto
    /// @param proposalId proposalId
    /// @param voter voter
    /// @param vetoCount vetoCount
    event CommunityVeto(uint256 indexed proposalId, address indexed voter, uint256 vetoCount);
    /// @notice CouncilMemberUpdated
    /// @param oldMember oldMember
    /// @param newMember newMember
    event CouncilMemberUpdated(address indexed oldMember, address indexed newMember);
    /// @notice VetoMinStakeSet
    /// @param newMinStake newMinStake
    event VetoMinStakeSet(uint256 newMinStake);
    /// @notice VFIDETokenSet
    /// @param token token
    event VFIDETokenSet(address indexed token);
    /// @notice SeerSet
    /// @param seer seer
    event SeerSet(address indexed seer);
    /// @notice VetoMinScoreSet
    /// @param minScore minScore
    event VetoMinScoreSet(uint16 minScore);
    /// @notice VetoThresholdSet
    /// @param newThreshold newThreshold
    event VetoThresholdSet(uint256 newThreshold);
    /// @notice ExecutionGasLimitSet
    /// @param newGasLimit newGasLimit
    event ExecutionGasLimitSet(uint256 newGasLimit);
    /// @notice ProposalTypeTargetAllowSet
    /// @param proposalType proposalType
    /// @param target target
    /// @param allowed allowed
    event ProposalTypeTargetAllowSet(
        ProposalType indexed proposalType,
        address indexed target,
        bool allowed
    );
    /// @notice ProposalTypeSelectorAllowSet
    /// @param proposalType proposalType
    /// @param selector selector
    /// @param allowed allowed
    event ProposalTypeSelectorAllowSet(
        ProposalType indexed proposalType,
        bytes4 indexed selector,
        bool allowed
    );

    /// @notice onlyCouncil
    modifier onlyCouncil() {
        require(isCouncilMember[msg.sender], "AdminMultiSig: caller not council member");
        _;
    }

    /// @notice proposalExists
    /// @param _proposalId _proposalId
    modifier proposalExists(uint256 _proposalId) {
        require(_proposalId < proposalCount, "AdminMultiSig: proposal does not exist");
        _;
    }

    /// @notice onlyEmergencyProposalExecutionContext
    modifier onlyEmergencyProposalExecutionContext() {
        require(msg.sender == address(this), "AdminMultiSig: only via proposal");
        require(executingProposalId != NO_ACTIVE_PROPOSAL, "AdminMultiSig: no active execution");

        Proposal storage proposal = proposals[executingProposalId];
        require(
            proposal.proposalType == ProposalType.EMERGENCY,
            "AdminMultiSig: requires emergency proposal"
        );
        require(
            proposal.approvalCount >= EMERGENCY_APPROVALS,
            "AdminMultiSig: insufficient emergency approvals"
        );
        _;
    }

    /// @notice onlyProposalExecutionContext
    modifier onlyProposalExecutionContext() {
        require(msg.sender == address(this), "AdminMultiSig: only via proposal");
        require(executingProposalId != NO_ACTIVE_PROPOSAL, "AdminMultiSig: no active execution");
        _;
    }

    /**
     * @notice Initialize council with 5 members
     * @param _council Array of 5 council member addresses
     * @param _vfideToken _vfideToken
     */
    constructor(address[COUNCIL_SIZE] memory _council, address _vfideToken) {
        for (uint256 i = 0; i < COUNCIL_SIZE; ++i) {
            require(_council[i] != address(0), "AdminMultiSig: zero address in council");
            require(!isCouncilMember[_council[i]], "AdminMultiSig: duplicate council member");

            council[i] = _council[i];
            isCouncilMember[_council[i]] = true;
        }
        if (_vfideToken != address(0)) {
            vfideToken = IERC20(_vfideToken);
        }

        // Sensible defaults: proposals may target this contract only,
        // and only vetted governance selectors are initially enabled.
        for (uint8 t = 0; t <= uint8(ProposalType.EMERGENCY); ++t) {
            ProposalType pt = ProposalType(t);
            proposalTypeTargetAllowed[pt][address(this)] = true;
            emit ProposalTypeTargetAllowSet(pt, address(this), true);

            proposalTypeSelectorAllowed[pt][SELECTOR_SET_VFIDE_TOKEN] = true;
            emit ProposalTypeSelectorAllowSet(pt, SELECTOR_SET_VFIDE_TOKEN, true);

            proposalTypeSelectorAllowed[pt][SELECTOR_SET_SEER] = true;
            emit ProposalTypeSelectorAllowSet(pt, SELECTOR_SET_SEER, true);

            proposalTypeSelectorAllowed[pt][SELECTOR_SET_VETO_MIN_SCORE] = true;
            emit ProposalTypeSelectorAllowSet(pt, SELECTOR_SET_VETO_MIN_SCORE, true);

            proposalTypeSelectorAllowed[pt][SELECTOR_SET_VETO_MIN_STAKE] = true;
            emit ProposalTypeSelectorAllowSet(pt, SELECTOR_SET_VETO_MIN_STAKE, true);

            proposalTypeSelectorAllowed[pt][SELECTOR_SET_VETO_THRESHOLD] = true;
            emit ProposalTypeSelectorAllowSet(pt, SELECTOR_SET_VETO_THRESHOLD, true);

            proposalTypeSelectorAllowed[pt][SELECTOR_SET_EXECUTION_GAS_LIMIT] = true;
            emit ProposalTypeSelectorAllowSet(pt, SELECTOR_SET_EXECUTION_GAS_LIMIT, true);

            proposalTypeSelectorAllowed[pt][SELECTOR_UPDATE_COUNCIL_MEMBER] = true;
            emit ProposalTypeSelectorAllowSet(pt, SELECTOR_UPDATE_COUNCIL_MEMBER, true);

            proposalTypeSelectorAllowed[pt][SELECTOR_SET_TARGET_ALLOW] = true;
            emit ProposalTypeSelectorAllowSet(pt, SELECTOR_SET_TARGET_ALLOW, true);

            proposalTypeSelectorAllowed[pt][SELECTOR_SET_SELECTOR_ALLOW] = true;
            emit ProposalTypeSelectorAllowSet(pt, SELECTOR_SET_SELECTOR_ALLOW, true);
        }
    }

    /// @notice Set the VFIDE token address used for fallback stake checks on community veto
    /// @param _token _token
    function setVFIDEToken(address _token) external onlyProposalExecutionContext {
        require(_token != address(0), "AdminMultiSig: zero address");
        require(_token != address(vfideToken), "AdminMultiSig: token unchanged");
        vfideToken = IERC20(_token);
        emit VFIDETokenSet(_token);
    }

    /// @notice Set the ProofScore oracle used as the primary veto eligibility gate (M-6 FIX)
    /// @param _seer _seer
    function setSeer(address _seer) external onlyProposalExecutionContext {
        require(_seer != address(0), "AdminMultiSig: zero address");
        seer = ISeer(_seer);
        emit SeerSet(_seer);
    }

    /// @notice Set the minimum ProofScore required to cast a community veto (M-6 FIX)
    /// @param _minScore _minScore
    function setVetoMinScore(uint16 _minScore) external onlyProposalExecutionContext {
        vetoMinScore = _minScore;
        emit VetoMinScoreSet(_minScore);
    }

    /// @notice Update the minimum VFIDE stake required to cast a community veto
    /// @param _minStake _minStake
    function setVetoMinStake(uint256 _minStake) external onlyProposalExecutionContext {
        vetoMinStake = _minStake;
        emit VetoMinStakeSet(_minStake);
    }

    /// @notice Update the number of community veto votes required to cancel a proposal
    /// @param _threshold _threshold
    function setVetoThreshold(uint256 _threshold) external onlyProposalExecutionContext {
        require(_threshold > 0, "AdminMultiSig: invalid veto threshold");
        require(_threshold != vetoThreshold, "AdminMultiSig: veto threshold unchanged");
        vetoThreshold = _threshold;
        emit VetoThresholdSet(_threshold);
    }

    /// @notice Governance-managed target allowlist by proposal type.
    /// @param _proposalType _proposalType
    /// @param _target _target
    /// @param _allowed _allowed
    function setProposalTypeTargetAllowed(
        ProposalType _proposalType,
        address _target,
        bool _allowed
    ) external onlyEmergencyProposalExecutionContext {
        require(_target != address(0), "AdminMultiSig: zero target");
        proposalTypeTargetAllowed[_proposalType][_target] = _allowed;
        emit ProposalTypeTargetAllowSet(_proposalType, _target, _allowed);
    }

    /// @notice Governance-managed selector allowlist by proposal type.
    /// @param _proposalType _proposalType
    /// @param _selector _selector
    /// @param _allowed _allowed
    function setProposalTypeSelectorAllowed(
        ProposalType _proposalType,
        bytes4 _selector,
        bool _allowed
    ) external onlyEmergencyProposalExecutionContext {
        proposalTypeSelectorAllowed[_proposalType][_selector] = _allowed;
        emit ProposalTypeSelectorAllowSet(_proposalType, _selector, _allowed);
    }

    /**
     * @notice Create a new proposal
     * @param _proposalType Type of proposal (CONFIG, CRITICAL, or EMERGENCY)
     * @param _target Target contract address
     * @param _data Encoded function call data
     * @param _description Human-readable description
     * @return proposalId The ID of the created proposal
     */
    function createProposal(
        ProposalType _proposalType,
        address _target,
        bytes calldata _data,
        string calldata _description
    ) external onlyCouncil returns (uint256 proposalId) {
        require(_target != address(0), "AdminMultiSig: target is zero address");
        require(_data.length > 0, "AdminMultiSig: empty data");
        require(bytes(_description).length > 0, "AdminMultiSig: empty description");
        require(
            proposalTypeTargetAllowed[_proposalType][_target],
            "AdminMultiSig: target not allowed"
        );

        bytes4 selector;
        assembly {
            selector := calldataload(_data.offset)
        }
        require(
            proposalTypeSelectorAllowed[_proposalType][selector],
            "AdminMultiSig: selector not allowed"
        );

        proposalId = proposalCount++;
        Proposal storage proposal = proposals[proposalId];

        proposal.id = proposalId;
        proposal.proposer = msg.sender;
        proposal.proposalType = _proposalType;
        proposal.status = ProposalStatus.Pending;
        proposal.createdAt = block.timestamp;
        proposal.target = _target;
        proposal.data = _data;
        proposal.description = _description;

        uint256 delay =
            _proposalType == ProposalType.CONFIG
                ? CONFIG_DELAY
                : (_proposalType == ProposalType.CRITICAL ? CRITICAL_DELAY : EMERGENCY_DELAY);
        proposal.executionTime = block.timestamp + delay;

        proposal.hasApproved[msg.sender] = true;
        proposal.approvalCount = 1;

        emit ProposalCreated(proposalId, msg.sender, _proposalType, _target, _description);
        emit ProposalApproved(proposalId, msg.sender, 1);
    }

    /**
     * @notice Approve a proposal
     * @param _proposalId ID of the proposal to approve
     */
    function approveProposal(uint256 _proposalId) external onlyCouncil proposalExists(_proposalId) {
        Proposal storage proposal = proposals[_proposalId];

        require(proposal.status == ProposalStatus.Pending, "AdminMultiSig: proposal not pending");
        // #407 FIX: Reject approvals on already-expired proposals to avoid misleading state.
        require(
            block.timestamp <= proposal.createdAt + PROPOSAL_EXPIRY,
            "AdminMultiSig: proposal expired"
        );
        require(!proposal.hasApproved[msg.sender], "AdminMultiSig: already approved");

        proposal.hasApproved[msg.sender] = true;
        ++proposal.approvalCount;

        emit ProposalApproved(_proposalId, msg.sender, proposal.approvalCount);

        uint256 requiredApprovals =
            proposal.proposalType == ProposalType.EMERGENCY
                ? EMERGENCY_APPROVALS
                : REQUIRED_APPROVALS;

        if (proposal.approvalCount >= requiredApprovals) {
            proposal.status = ProposalStatus.Approved;
        }
    }

    // slither-disable-next-line reentrancy-benign
    /**
     * @notice Execute a proposal
     * @param _proposalId ID of the proposal to execute
     */
    function executeProposal(
        uint256 _proposalId
    ) external onlyCouncil nonReentrant proposalExists(_proposalId) {
        Proposal storage proposal = proposals[_proposalId];

        require(proposal.status == ProposalStatus.Approved, "AdminMultiSig: not approved");
        require(block.timestamp >= proposal.executionTime, "AdminMultiSig: too early");
        require(
            block.timestamp <= proposal.createdAt + PROPOSAL_EXPIRY,
            "AdminMultiSig: proposal expired"
        );
        require(proposal.vetoCount < vetoThreshold, "AdminMultiSig: community vetoed");

        if (proposal.proposalType != ProposalType.EMERGENCY) {
            require(
                block.timestamp <= proposal.executionTime + VETO_WINDOW,
                "AdminMultiSig: veto window expired"
            );
        }

        require(proposal.target.code.length > 0, "AdminMultiSig: target has no code");
        // #406 FIX: Re-verify target is still allowlisted at execution time.
        require(
            proposalTypeTargetAllowed[proposal.proposalType][proposal.target],
            "AdminMultiSig: target no longer allowed"
        );

        proposal.status = ProposalStatus.Executed;
        executingProposalId = _proposalId;

        emit ProposalExecuted(_proposalId, msg.sender);

        // Use configurable gas limit for safety - prevents gas griefing
        // Can be increased via governance if needed for complex operations
        // Intentional: emergency proposal execution may target this contract,
        // while `nonReentrant` prevents nested `executeProposal` entry.
        // H-09 FIX: Capture return data. If the target returns a single bool (e.g. ERC-20 transfer),
        // verify it is `true` so a soft-fail token transfer cannot pass silently.
        // solhint-disable-next-line avoid-low-level-calls
        (bool success, bytes memory returnData) = proposal.target.call{gas: executionGasLimit}(
            proposal.data
        );
        require(success, "AdminMultiSig: execution failed");
        if (returnData.length == 32) {
            // Decode as bool; if the low-level call returned a single word, treat it as a bool return.
            bool innerOk = abi.decode(returnData, (bool));
            require(innerOk, "AdminMultiSig: inner call returned false");
        }
        executingProposalId = NO_ACTIVE_PROPOSAL;
    }

    /// @notice Allow council to adjust execution gas limit via governance
    // #409 FIX: Require full proposal execution context (msg.sender == address(this) + active proposal).
    /// @notice setExecutionGasLimit
    /// @param _gasLimit _gasLimit
    function setExecutionGasLimit(uint256 _gasLimit) external onlyProposalExecutionContext {
        require(
            _gasLimit >= 100_000 && _gasLimit <= 10_000_000,
            "AdminMultiSig: invalid gas limit"
        );
        executionGasLimit = _gasLimit;
        emit ExecutionGasLimitSet(_gasLimit);
    }

    /**
     * @notice Council member veto a proposal
     * @param _proposalId ID of the proposal to veto
     */
    function vetoProposal(uint256 _proposalId) external onlyCouncil proposalExists(_proposalId) {
        Proposal storage proposal = proposals[_proposalId];

        require(
            proposal.status == ProposalStatus.Pending || proposal.status == ProposalStatus.Approved,
            "AdminMultiSig: invalid status"
        );
        require(!proposal.hasVetoed[msg.sender], "AdminMultiSig: already vetoed");

        proposal.hasVetoed[msg.sender] = true;
        ++proposal.vetoCount;

        uint256 requiredVetos =
            proposal.proposalType == ProposalType.EMERGENCY
                ? EMERGENCY_APPROVALS
                : REQUIRED_APPROVALS;

        if (proposal.vetoCount >= requiredVetos) {
            proposal.status = ProposalStatus.Vetoed;
        }

        emit ProposalVetoed(_proposalId, msg.sender);
    }

    /**
     * @notice Community member votes to veto a proposal
     * @dev Requires minimum VFIDE token balance to prevent Sybil attacks.
     *      Attacker needs 100 wallets × vetoMinStake VFIDE, making mass veto economically costly.
     * @param _proposalId ID of the proposal to veto
     */
    function communityVeto(uint256 _proposalId) external proposalExists(_proposalId) {
        Proposal storage proposal = proposals[_proposalId];

        require(proposal.status == ProposalStatus.Approved, "AdminMultiSig: not approved");
        require(!communityVetos[_proposalId][msg.sender], "AdminMultiSig: already voted");
        require(
            block.timestamp <= proposal.executionTime + VETO_WINDOW,
            "AdminMultiSig: veto window closed"
        );

        // H-10 FIX: Do not allow permissionless community veto when bootstrap gates are unset.
        // Require either score-gating (seer) or stake-gating (vfideToken + min stake).
        require(
            address(seer) != address(0) || (vetoMinStake > 0 && address(vfideToken) != address(0)),
            "AdminMultiSig: veto gate not configured"
        );

        if (address(seer) != address(0)) {
            // N-M21 FIX: In production, require BOTH reputation and stake to reduce
            // low-cost sybil vetoing with fresh default-score vaults.
            require(
                seer.getCachedScore(msg.sender) >= vetoMinScore,
                "AdminMultiSig: ProofScore too low to veto"
            );
            if (vetoMinStake > 0) {
                require(
                    address(vfideToken) != address(0),
                    "AdminMultiSig: VFIDE token not configured"
                );
                require(
                    vfideToken.balanceOf(msg.sender) >= vetoMinStake,
                    "AdminMultiSig: insufficient VFIDE stake to veto"
                );
            }
        } else if (vetoMinStake > 0 && address(vfideToken) != address(0)) {
            // Fallback to token-balance gate when seer is not yet configured
            require(
                vfideToken.balanceOf(msg.sender) >= vetoMinStake,
                "AdminMultiSig: insufficient VFIDE stake to veto"
            );
        }

        communityVetos[_proposalId][msg.sender] = true;
        ++proposal.vetoCount;

        emit CommunityVeto(_proposalId, msg.sender, proposal.vetoCount);

        if (proposal.vetoCount >= vetoThreshold) {
            proposal.status = ProposalStatus.Vetoed;
        }
    }

    /**
     * @notice Update a council member (requires 5/5 approval via separate proposal)
     * @param _index Index of council member to replace
     * @param _newMember New council member address
     */
    function updateCouncilMember(
        uint256 _index,
        address _newMember
    ) external onlyEmergencyProposalExecutionContext {
        require(_index < COUNCIL_SIZE, "AdminMultiSig: invalid index");
        require(_newMember != address(0), "AdminMultiSig: zero address");
        require(!isCouncilMember[_newMember], "AdminMultiSig: already member");

        address oldMember = council[_index];
        isCouncilMember[oldMember] = false;

        council[_index] = _newMember;
        isCouncilMember[_newMember] = true;

        emit CouncilMemberUpdated(oldMember, _newMember);
    }

    /**
     * @notice Get proposal details
     * @param _proposalId ID of the proposal
     * @return proposer Proposal proposer
     * @return proposalType Proposal type
     * @return status Proposal status
     * @return createdAt Proposal creation time
     * @return executionTime Proposal execution time
     * @return approvalCount Number of approvals
     * @return vetoCount Number of vetoes
     * @return target Target address
     * @return description Proposal description
     */
    function getProposal(
        uint256 _proposalId
    )
        external
        view
        proposalExists(_proposalId)
        returns (
            address proposer,
            ProposalType proposalType,
            ProposalStatus status,
            uint256 createdAt,
            uint256 executionTime,
            uint256 approvalCount,
            uint256 vetoCount,
            address target,
            string memory description
        )
    {
        Proposal storage proposal = proposals[_proposalId];
        return (
            proposal.proposer,
            proposal.proposalType,
            proposal.status,
            proposal.createdAt,
            proposal.executionTime,
            proposal.approvalCount,
            proposal.vetoCount,
            proposal.target,
            proposal.description
        );
    }

    /**
     * @notice Check if council member has approved a proposal
     * @param _proposalId Proposal ID
     * @param _member Council member address
     * @return bool True if approved
     */
    function hasApproved(
        uint256 _proposalId,
        address _member
    ) external view proposalExists(_proposalId) returns (bool) {
        return proposals[_proposalId].hasApproved[_member];
    }
}

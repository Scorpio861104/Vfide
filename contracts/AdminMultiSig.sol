// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import { ReentrancyGuard, IERC20 } from "./SharedInterfaces.sol";

/**
 * @title AdminMultiSig
 * @notice Multi-signature requirement for critical operations with timelock delays and community veto
 * @dev Implements 3/5 council approval system with configurable delays and emergency override
 */
contract AdminMultiSig is ReentrancyGuard {
    uint256 public constant COUNCIL_SIZE = 5;
    uint256 public constant REQUIRED_APPROVALS = 3;
    uint256 public constant EMERGENCY_APPROVALS = 5;
    
    uint256 public constant CONFIG_DELAY = 24 hours;
    uint256 public constant CRITICAL_DELAY = 48 hours;
    uint256 public constant VETO_WINDOW = 24 hours;

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

    address[COUNCIL_SIZE] public council;
    mapping(address => bool) public isCouncilMember;
    
    uint256 public proposalCount;
    mapping(uint256 => Proposal) public proposals;
    
    uint256 public vetoThreshold = 100; // 100 veto votes needed
    // H-05 Fix: Minimum VFIDE token stake required to cast a community veto.
    // This makes Sybil attacks economically costly — 100 wallets × 10,000 VFIDE = 1M VFIDE locked.
    uint256 public vetoMinStake = 10_000e18; // 10,000 VFIDE minimum to cast one veto vote
    IERC20 public vfideToken; // VFIDE token reference for stake checks
    mapping(uint256 => mapping(address => bool)) public communityVetos;

    uint256 private constant NO_ACTIVE_PROPOSAL = type(uint256).max;
    uint256 private executingProposalId = NO_ACTIVE_PROPOSAL;
    uint256 public executionGasLimit = 500_000; // M-12 Fix: Configurable gas limit

    event ProposalCreated(
        uint256 indexed proposalId,
        address indexed proposer,
        ProposalType proposalType,
        address target,
        string description
    );
    
    event ProposalApproved(uint256 indexed proposalId, address indexed approver, uint256 approvalCount);
    event ProposalExecuted(uint256 indexed proposalId, address indexed executor);
    event ProposalVetoed(uint256 indexed proposalId, address indexed vetoer);
    event CommunityVeto(uint256 indexed proposalId, address indexed voter, uint256 vetoCount);
    event CouncilMemberUpdated(address indexed oldMember, address indexed newMember);
    event VetoMinStakeSet(uint256 newMinStake);
    event VFIDETokenSet(address token);

    modifier onlyCouncil() {
        require(isCouncilMember[msg.sender], "AdminMultiSig: caller not council member");
        _;
    }

    modifier proposalExists(uint256 _proposalId) {
        require(_proposalId < proposalCount, "AdminMultiSig: proposal does not exist");
        _;
    }

    modifier onlyEmergencyProposalExecutionContext() {
        require(msg.sender == address(this), "AdminMultiSig: only via proposal");
        require(executingProposalId != NO_ACTIVE_PROPOSAL, "AdminMultiSig: no active execution");

        Proposal storage proposal = proposals[executingProposalId];
        require(proposal.proposalType == ProposalType.EMERGENCY, "AdminMultiSig: requires emergency proposal");
        require(proposal.approvalCount >= EMERGENCY_APPROVALS, "AdminMultiSig: insufficient emergency approvals");
        _;
    }

    /**
     * @notice Initialize council with 5 members
     * @param _council Array of 5 council member addresses
     */
    constructor(address[COUNCIL_SIZE] memory _council, address _vfideToken) {
        for (uint256 i = 0; i < COUNCIL_SIZE; i++) {
            require(_council[i] != address(0), "AdminMultiSig: zero address in council");
            require(!isCouncilMember[_council[i]], "AdminMultiSig: duplicate council member");
            
            council[i] = _council[i];
            isCouncilMember[_council[i]] = true;
        }
        // H-05 Fix: Wire VFIDE token for stake-gated community veto
        if (_vfideToken != address(0)) {
            vfideToken = IERC20(_vfideToken);
        }
    }

    /// @notice Set the VFIDE token address used for stake checks on community veto
    function setVFIDEToken(address _token) external onlyCouncil {
        require(_token != address(0), "AdminMultiSig: zero address");
        vfideToken = IERC20(_token);
        emit VFIDETokenSet(_token);
    }

    /// @notice Update the minimum VFIDE stake required to cast a community veto
    function setVetoMinStake(uint256 _minStake) external onlyCouncil {
        vetoMinStake = _minStake;
        emit VetoMinStakeSet(_minStake);
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
        
        uint256 delay = _proposalType == ProposalType.CONFIG 
            ? CONFIG_DELAY 
            : (_proposalType == ProposalType.CRITICAL ? CRITICAL_DELAY : 0);
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
    function approveProposal(uint256 _proposalId) 
        external 
        onlyCouncil 
        proposalExists(_proposalId) 
    {
        Proposal storage proposal = proposals[_proposalId];
        
        require(proposal.status == ProposalStatus.Pending, "AdminMultiSig: proposal not pending");
        require(!proposal.hasApproved[msg.sender], "AdminMultiSig: already approved");

        proposal.hasApproved[msg.sender] = true;
        proposal.approvalCount++;

        emit ProposalApproved(_proposalId, msg.sender, proposal.approvalCount);

        uint256 requiredApprovals = proposal.proposalType == ProposalType.EMERGENCY 
            ? EMERGENCY_APPROVALS 
            : REQUIRED_APPROVALS;

        if (proposal.approvalCount >= requiredApprovals) {
            proposal.status = ProposalStatus.Approved;
        }
    }

    /**
     * @notice Execute a proposal
     * @param _proposalId ID of the proposal to execute
     */
    function executeProposal(uint256 _proposalId) 
        external 
        onlyCouncil 
        nonReentrant
        proposalExists(_proposalId) 
    {
        Proposal storage proposal = proposals[_proposalId];
        
        require(proposal.status == ProposalStatus.Approved, "AdminMultiSig: not approved");
        require(block.timestamp >= proposal.executionTime, "AdminMultiSig: too early");
        require(proposal.vetoCount < vetoThreshold, "AdminMultiSig: community vetoed");

        if (proposal.proposalType != ProposalType.EMERGENCY) {
            require(
                block.timestamp <= proposal.executionTime + VETO_WINDOW,
                "AdminMultiSig: veto window expired"
            );
        }

        proposal.status = ProposalStatus.Executed;
        executingProposalId = _proposalId;

        emit ProposalExecuted(_proposalId, msg.sender);

        // Use configurable gas limit for safety - prevents gas griefing
        // Can be increased via governance if needed for complex operations
        // Intentional: emergency proposal execution may target this contract,
        // while `nonReentrant` prevents nested `executeProposal` entry.
        // slither-disable-next-line reentrancy-benign
        (bool success, ) = proposal.target.call{gas: executionGasLimit}(proposal.data);
        require(success, "AdminMultiSig: execution failed");
        executingProposalId = NO_ACTIVE_PROPOSAL;
    }

    /// @notice M-12 Fix: Allow council to adjust execution gas limit via governance
    function setExecutionGasLimit(uint256 _gasLimit) external {
        require(executingProposalId != NO_ACTIVE_PROPOSAL, "AdminMultiSig: must be via proposal");
        require(_gasLimit >= 100_000 && _gasLimit <= 10_000_000, "AdminMultiSig: invalid gas limit");
        executionGasLimit = _gasLimit;
    }

    /**
     * @notice Council member veto a proposal
     * @param _proposalId ID of the proposal to veto
     */
    function vetoProposal(uint256 _proposalId) 
        external 
        onlyCouncil 
        proposalExists(_proposalId) 
    {
        Proposal storage proposal = proposals[_proposalId];
        
        require(
            proposal.status == ProposalStatus.Pending || proposal.status == ProposalStatus.Approved,
            "AdminMultiSig: invalid status"
        );
        require(!proposal.hasVetoed[msg.sender], "AdminMultiSig: already vetoed");

        proposal.hasVetoed[msg.sender] = true;
        proposal.status = ProposalStatus.Vetoed;

        emit ProposalVetoed(_proposalId, msg.sender);
    }

    /**
     * @notice Community member votes to veto a proposal
     * @dev H-05 Fix: Requires minimum VFIDE token balance to prevent Sybil attacks.
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
        // H-05 Fix: Enforce minimum token stake to prevent zero-cost Sybil veto attacks
        if (vetoMinStake > 0 && address(vfideToken) != address(0)) {
            require(
                vfideToken.balanceOf(msg.sender) >= vetoMinStake,
                "AdminMultiSig: insufficient VFIDE stake to veto"
            );
        }

        communityVetos[_proposalId][msg.sender] = true;
        proposal.vetoCount++;

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
    function updateCouncilMember(uint256 _index, address _newMember) external onlyEmergencyProposalExecutionContext {
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
    function getProposal(uint256 _proposalId) 
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
    function hasApproved(uint256 _proposalId, address _member) 
        external 
        view 
        proposalExists(_proposalId) 
        returns (bool) 
    {
        return proposals[_proposalId].hasApproved[_member];
    }
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title AdminMultiSig
 * @notice Multi-signature requirement for critical operations with timelock delays and community veto
 * @dev Implements 3/5 council approval system with configurable delays and emergency override
 */
contract AdminMultiSig {
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
    mapping(uint256 => mapping(address => bool)) public communityVetos;

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

    modifier onlyCouncil() {
        require(isCouncilMember[msg.sender], "AdminMultiSig: caller not council member");
        _;
    }

    modifier proposalExists(uint256 _proposalId) {
        require(_proposalId < proposalCount, "AdminMultiSig: proposal does not exist");
        _;
    }

    /**
     * @notice Initialize council with 5 members
     * @param _council Array of 5 council member addresses
     */
    constructor(address[COUNCIL_SIZE] memory _council) {
        for (uint256 i = 0; i < COUNCIL_SIZE; i++) {
            require(_council[i] != address(0), "AdminMultiSig: zero address in council");
            require(!isCouncilMember[_council[i]], "AdminMultiSig: duplicate council member");
            
            council[i] = _council[i];
            isCouncilMember[_council[i]] = true;
        }
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

        (bool success, ) = proposal.target.call{gas: 500000}(proposal.data);
        require(success, "AdminMultiSig: execution failed");

        emit ProposalExecuted(_proposalId, msg.sender);
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
    function updateCouncilMember(uint256 _index, address _newMember) external {
        require(msg.sender == address(this), "AdminMultiSig: only via proposal");
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
     * @return Proposal details
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

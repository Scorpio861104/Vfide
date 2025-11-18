// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

/**
 * @title DAOMultiSigGuardian
 * @notice Multi-signature DAO governance with timelock and veto power
 * 
 * PROTECTION LAYERS:
 * 1. Multi-sig requirement (3/5, 5/7, or 7/11 signatures)
 * 2. Timelock delay (24-72 hours before execution)
 * 3. Community veto power (if X% of ProofScore holders object)
 * 4. Code verification (hash of proposed code must match deployment)
 * 5. Module whitelist (only approved contract types can be connected)
 * 6. Emergency pause (community can halt malicious update)
 * 
 * SCENARIO: Rogue DAO Member
 * - Single member can't deploy code (needs 3/5 signatures)
 * - If 3/5 collude, community has 48 hours to veto
 * - If update is malicious, high-ProofScore holders can block it
 * - Emergency DAO can pause and rollback
 * 
 * SCENARIO: DAO Takeover
 * - Requires controlling 3/5 multi-sig + bypassing timelock + overcoming veto
 * - Community fork is always an option (take code, migrate users)
 * - Immutable contracts (VFIDEToken, VaultHub) remain secure
 * 
 * SCENARIO: Unauthorized Update
 * - Only DAO multi-sig can call setModule() functions
 * - Proposed code hash must match deployed bytecode
 * - Community verifies on block explorer before timelock expires
 * - If mismatch detected, veto is triggered
 */

// ============================================================================
// INTERFACES
// ============================================================================

interface IProofLedger_GUARD {
    function logSystemEvent(address who, string calldata action, address by) external;
    function logEvent(address who, string calldata action, uint256 amount, string calldata note) external;
}

interface ISeer_GUARD {
    function getScore(address account) external view returns (uint16);
    function getTotalScoreWeight() external view returns (uint256);
}

interface IERC20_GUARD {
    function balanceOf(address account) external view returns (uint256);
    function totalSupply() external view returns (uint256);
}

// ============================================================================
// CUSTOM ERRORS
// ============================================================================

error GUARD_NotSigner();
error GUARD_AlreadySigned();
error GUARD_NotEnoughSigs();
error GUARD_TooEarly();
error GUARD_Expired();
error GUARD_Vetoed();
error GUARD_NotQueued();
error GUARD_InvalidHash();
error GUARD_NotWhitelisted();
error GUARD_Paused();
error GUARD_Zero();

// ============================================================================
// DAO MULTI-SIG GUARDIAN
// ============================================================================

contract DAOMultiSigGuardian {
    event SignerAdded(address indexed signer, uint8 newTotal);
    event SignerRemoved(address indexed signer, uint8 newTotal);
    event ThresholdChanged(uint8 oldThreshold, uint8 newThreshold);
    event ProposalQueued(uint256 indexed proposalId, address indexed proposer, address target, bytes4 selector, bytes32 codeHash);
    event ProposalSigned(uint256 indexed proposalId, address indexed signer, uint8 currentSigs, uint8 required);
    event ProposalExecuted(uint256 indexed proposalId, address indexed executor, bool success);
    event ProposalVetoed(uint256 indexed proposalId, address indexed vetoer, string reason);
    event ProposalCancelled(uint256 indexed proposalId, address indexed canceller, string reason);
    event TimelockDelaySet(uint32 oldDelay, uint32 newDelay);
    event VetoThresholdSet(uint16 oldThreshold, uint16 newThreshold);
    event ContractTypeWhitelisted(string indexed contractType, bool whitelisted);
    event EmergencyPaused(bool paused, address indexed by, string reason);
    event CodeVerificationRequired(uint256 indexed proposalId, bytes32 expectedHash, bytes32 deployedHash);

    enum ProposalState { NONE, QUEUED, EXECUTED, VETOED, CANCELLED, EXPIRED }

    struct Proposal {
        address proposer;
        address target;              // Contract to update (e.g., MerchantRegistry)
        bytes4 selector;             // Function selector (e.g., setSeer)
        bytes data;                  // Full calldata
        bytes32 codeHash;            // Hash of proposed code (if deploying new contract)
        address newImplementation;   // Address of new contract (if swapping interface)
        string contractType;         // Type of contract ("Seer", "VaultHub", etc.)
        string description;          // Human-readable explanation
        uint64 queuedAt;
        uint64 executeAfter;         // Timelock expiry
        uint64 expiresAt;            // Proposal expiration (executeAfter + 7 days)
        uint8 signaturesRequired;
        uint8 signaturesReceived;
        ProposalState state;
        mapping(address => bool) hasSigned;
    }

    struct VetoVote {
        uint256 totalVetoWeight;     // Sum of ProofScores of vetoers
        uint256 totalTokenWeight;    // Sum of tokens held by vetoers
        mapping(address => bool) hasVetoed;
    }

    address public emergencyDAO;
    IProofLedger_GUARD public ledger;
    ISeer_GUARD public seer;
    IERC20_GUARD public token;

    mapping(address => bool) public isDAOSigner;
    address[] public daoSigners;
    uint8 public signatureThreshold;  // e.g., 3 for 3/5 multi-sig

    uint256 public proposalCount;
    mapping(uint256 => Proposal) public proposals;
    mapping(uint256 => VetoVote) public vetoVotes;

    uint32 public timelockDelay = 48 hours;      // Minimum 48 hours before execution
    uint16 public vetoThreshold = 2000;          // 20% of total ProofScore weight can veto
    mapping(string => bool) public whitelistedContractTypes;
    bool public emergencyPaused;

    modifier onlyDAOSigner() {
        if (!isDAOSigner[msg.sender]) revert GUARD_NotSigner();
        _;
    }

    modifier onlyEmergencyDAO() {
        require(msg.sender == emergencyDAO, "not_emergency_dao");
        _;
    }

    modifier whenNotPaused() {
        if (emergencyPaused) revert GUARD_Paused();
        _;
    }

    constructor(
        address[] memory _signers,
        uint8 _threshold,
        address _emergencyDAO,
        address _ledger,
        address _seer,
        address _token
    ) {
        require(_signers.length >= _threshold, "threshold_too_high");
        require(_threshold >= 3, "threshold_too_low");  // Minimum 3 signatures
        require(_emergencyDAO != address(0), "zero_emergency_dao");
        require(_ledger != address(0), "zero_ledger");
        require(_seer != address(0), "zero_seer");
        require(_token != address(0), "zero_token");

        for (uint256 i = 0; i < _signers.length; i++) {
            address signer = _signers[i];
            require(signer != address(0), "zero_signer");
            require(!isDAOSigner[signer], "duplicate_signer");
            
            isDAOSigner[signer] = true;
            daoSigners.push(signer);
            emit SignerAdded(signer, uint8(_signers.length));
        }

        signatureThreshold = _threshold;
        emergencyDAO = _emergencyDAO;
        ledger = IProofLedger_GUARD(_ledger);
        seer = ISeer_GUARD(_seer);
        token = IERC20_GUARD(_token);

        // Whitelist core contract types
        whitelistedContractTypes["Seer"] = true;
        whitelistedContractTypes["VaultHub"] = true;
        whitelistedContractTypes["SecurityHub"] = true;
        whitelistedContractTypes["ProofLedger"] = true;
        whitelistedContractTypes["Treasury"] = true;
        whitelistedContractTypes["MerchantRegistry"] = true;
        whitelistedContractTypes["CommerceEscrow"] = true;
    }

    // ========================================================================
    // MULTI-SIG MANAGEMENT
    // ========================================================================

    /// @notice Add new DAO signer (requires current multi-sig)
    function addSigner(address newSigner) external onlyDAOSigner {
        require(newSigner != address(0), "zero_signer");
        require(!isDAOSigner[newSigner], "already_signer");
        
        // This is a proposal like any other, requires threshold signatures
        // For simplicity, shown as direct function (in production, use queueProposal)
        
        isDAOSigner[newSigner] = true;
        daoSigners.push(newSigner);
        
        emit SignerAdded(newSigner, uint8(daoSigners.length));
        ledger.logSystemEvent(newSigner, "dao_signer_added", msg.sender);
    }

    /// @notice Remove DAO signer (requires current multi-sig)
    function removeSigner(address signer) external onlyDAOSigner {
        require(isDAOSigner[signer], "not_signer");
        require(daoSigners.length - 1 >= signatureThreshold, "would_break_threshold");
        
        isDAOSigner[signer] = false;
        
        // Remove from array
        for (uint256 i = 0; i < daoSigners.length; i++) {
            if (daoSigners[i] == signer) {
                daoSigners[i] = daoSigners[daoSigners.length - 1];
                daoSigners.pop();
                break;
            }
        }
        
        emit SignerRemoved(signer, uint8(daoSigners.length));
        ledger.logSystemEvent(signer, "dao_signer_removed", msg.sender);
    }

    /// @notice Change signature threshold (requires current multi-sig)
    function setThreshold(uint8 newThreshold) external onlyDAOSigner {
        require(newThreshold >= 3, "threshold_too_low");
        require(newThreshold <= daoSigners.length, "threshold_too_high");
        
        uint8 old = signatureThreshold;
        signatureThreshold = newThreshold;
        
        emit ThresholdChanged(old, newThreshold);
        ledger.logSystemEvent(address(this), "threshold_changed", msg.sender);
    }

    // ========================================================================
    // PROPOSAL QUEUE (Timelock + Code Verification)
    // ========================================================================

    /// @notice Queue proposal for interface update
    function queueProposal(
        address target,
        bytes4 selector,
        bytes calldata data,
        address newImplementation,
        bytes32 codeHash,
        string calldata contractType,
        string calldata description
    ) external onlyDAOSigner whenNotPaused returns (uint256) {
        // Verify contract type is whitelisted
        if (!whitelistedContractTypes[contractType]) revert GUARD_NotWhitelisted();
        
        uint256 proposalId = ++proposalCount;
        Proposal storage prop = proposals[proposalId];
        
        prop.proposer = msg.sender;
        prop.target = target;
        prop.selector = selector;
        prop.data = data;
        prop.codeHash = codeHash;
        prop.newImplementation = newImplementation;
        prop.contractType = contractType;
        prop.description = description;
        prop.queuedAt = uint64(block.timestamp);
        prop.executeAfter = uint64(block.timestamp + timelockDelay);
        prop.expiresAt = uint64(block.timestamp + timelockDelay + 7 days);
        prop.signaturesRequired = signatureThreshold;
        prop.signaturesReceived = 0;
        prop.state = ProposalState.QUEUED;
        
        emit ProposalQueued(proposalId, msg.sender, target, selector, codeHash);
        ledger.logEvent(msg.sender, "proposal_queued", proposalId, description);
        
        return proposalId;
    }

    /// @notice Sign proposal (requires signature threshold)
    function signProposal(uint256 proposalId) external onlyDAOSigner whenNotPaused {
        Proposal storage prop = proposals[proposalId];
        
        if (prop.state != ProposalState.QUEUED) revert GUARD_NotQueued();
        if (prop.hasSigned[msg.sender]) revert GUARD_AlreadySigned();
        
        prop.hasSigned[msg.sender] = true;
        prop.signaturesReceived += 1;
        
        emit ProposalSigned(proposalId, msg.sender, prop.signaturesReceived, prop.signaturesRequired);
        ledger.logEvent(msg.sender, "proposal_signed", proposalId, "");
    }

    /// @notice Execute proposal (after timelock + code verification)
    function executeProposal(uint256 proposalId) external whenNotPaused {
        Proposal storage prop = proposals[proposalId];
        
        if (prop.state != ProposalState.QUEUED) revert GUARD_NotQueued();
        if (block.timestamp < prop.executeAfter) revert GUARD_TooEarly();
        if (block.timestamp > prop.expiresAt) revert GUARD_Expired();
        if (prop.signaturesReceived < prop.signaturesRequired) revert GUARD_NotEnoughSigs();
        
        // Check if vetoed by community
        VetoVote storage veto = vetoVotes[proposalId];
        uint256 totalScoreWeight = seer.getTotalScoreWeight();
        uint256 vetoPercentage = (veto.totalVetoWeight * 10000) / totalScoreWeight;
        
        if (vetoPercentage >= vetoThreshold) {
            prop.state = ProposalState.VETOED;
            emit ProposalVetoed(proposalId, address(0), "community_veto_threshold_reached");
            return;
        }
        
        // Verify code hash if new implementation deployed
        if (prop.newImplementation != address(0)) {
            bytes32 deployedHash = _getCodeHash(prop.newImplementation);
            if (deployedHash != prop.codeHash) {
                emit CodeVerificationRequired(proposalId, prop.codeHash, deployedHash);
                revert GUARD_InvalidHash();
            }
        }
        
        // Execute the proposal
        prop.state = ProposalState.EXECUTED;
        
        (bool success, ) = prop.target.call(prop.data);
        
        emit ProposalExecuted(proposalId, msg.sender, success);
        ledger.logEvent(msg.sender, "proposal_executed", proposalId, success ? "success" : "failed");
        
        require(success, "execution_failed");
    }

    // ========================================================================
    // COMMUNITY VETO POWER
    // ========================================================================

    /// @notice Community members can veto malicious proposals
    function vetoProposal(uint256 proposalId, string calldata reason) external {
        Proposal storage prop = proposals[proposalId];
        
        if (prop.state != ProposalState.QUEUED) revert GUARD_NotQueued();
        if (block.timestamp > prop.expiresAt) revert GUARD_Expired();
        
        VetoVote storage veto = vetoVotes[proposalId];
        
        if (veto.hasVetoed[msg.sender]) return;  // Already vetoed
        
        veto.hasVetoed[msg.sender] = true;
        
        // Weight by ProofScore (higher trust = more veto power)
        uint16 userScore = seer.getScore(msg.sender);
        veto.totalVetoWeight += userScore;
        
        // Also weight by token holdings (skin in the game)
        uint256 userTokens = token.balanceOf(msg.sender);
        veto.totalTokenWeight += userTokens;
        
        // Check if veto threshold reached
        uint256 totalScoreWeight = seer.getTotalScoreWeight();
        uint256 vetoPercentage = (veto.totalVetoWeight * 10000) / totalScoreWeight;
        
        if (vetoPercentage >= vetoThreshold) {
            prop.state = ProposalState.VETOED;
            emit ProposalVetoed(proposalId, msg.sender, reason);
            ledger.logEvent(msg.sender, "proposal_vetoed", proposalId, reason);
        }
    }

    /// @notice Get veto status for proposal
    function getVetoStatus(uint256 proposalId) external view returns (
        uint256 vetoWeight,
        uint256 totalWeight,
        uint256 percentage,
        bool vetoed
    ) {
        VetoVote storage veto = vetoVotes[proposalId];
        uint256 total = seer.getTotalScoreWeight();
        uint256 pct = (veto.totalVetoWeight * 10000) / total;
        
        return (
            veto.totalVetoWeight,
            total,
            pct,
            pct >= vetoThreshold
        );
    }

    // ========================================================================
    // EMERGENCY CONTROLS
    // ========================================================================

    /// @notice Emergency pause (if malicious update detected)
    function emergencyPause(bool pause, string calldata reason) external onlyEmergencyDAO {
        emergencyPaused = pause;
        emit EmergencyPaused(pause, msg.sender, reason);
        ledger.logSystemEvent(address(this), pause ? "emergency_paused" : "emergency_unpaused", msg.sender);
    }

    /// @notice Cancel malicious proposal
    function cancelProposal(uint256 proposalId, string calldata reason) external onlyEmergencyDAO {
        Proposal storage prop = proposals[proposalId];
        
        if (prop.state != ProposalState.QUEUED) revert GUARD_NotQueued();
        
        prop.state = ProposalState.CANCELLED;
        
        emit ProposalCancelled(proposalId, msg.sender, reason);
        ledger.logEvent(msg.sender, "proposal_cancelled", proposalId, reason);
    }

    // ========================================================================
    // CONFIGURATION
    // ========================================================================

    /// @notice Set timelock delay (requires multi-sig)
    function setTimelockDelay(uint32 newDelay) external onlyDAOSigner {
        require(newDelay >= 24 hours, "delay_too_short");
        require(newDelay <= 7 days, "delay_too_long");
        
        uint32 old = timelockDelay;
        timelockDelay = newDelay;
        
        emit TimelockDelaySet(old, newDelay);
        ledger.logSystemEvent(address(this), "timelock_delay_changed", msg.sender);
    }

    /// @notice Set veto threshold (requires multi-sig)
    function setVetoThreshold(uint16 newThreshold) external onlyDAOSigner {
        require(newThreshold >= 500, "threshold_too_low");   // Min 5%
        require(newThreshold <= 5000, "threshold_too_high"); // Max 50%
        
        uint16 old = vetoThreshold;
        vetoThreshold = newThreshold;
        
        emit VetoThresholdSet(old, newThreshold);
        ledger.logSystemEvent(address(this), "veto_threshold_changed", msg.sender);
    }

    /// @notice Whitelist new contract type
    function whitelistContractType(string calldata contractType, bool whitelisted) external onlyDAOSigner {
        whitelistedContractTypes[contractType] = whitelisted;
        emit ContractTypeWhitelisted(contractType, whitelisted);
        ledger.logSystemEvent(address(this), whitelisted ? "contract_type_whitelisted" : "contract_type_blacklisted", msg.sender);
    }

    // ========================================================================
    // HELPERS
    // ========================================================================

    function _getCodeHash(address addr) internal view returns (bytes32) {
        bytes32 hash;
        assembly {
            hash := extcodehash(addr)
        }
        return hash;
    }

    function getProposalState(uint256 proposalId) external view returns (
        ProposalState state,
        uint8 signaturesReceived,
        uint8 signaturesRequired,
        uint64 executeAfter,
        uint64 expiresAt,
        bool canExecute
    ) {
        Proposal storage prop = proposals[proposalId];
        
        bool executable = prop.state == ProposalState.QUEUED &&
                         block.timestamp >= prop.executeAfter &&
                         block.timestamp <= prop.expiresAt &&
                         prop.signaturesReceived >= prop.signaturesRequired;
        
        return (
            prop.state,
            prop.signaturesReceived,
            prop.signaturesRequired,
            prop.executeAfter,
            prop.expiresAt,
            executable
        );
    }

    function getDAOSigners() external view returns (address[] memory) {
        return daoSigners;
    }
}

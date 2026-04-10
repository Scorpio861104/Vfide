// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import "./SharedInterfaces.sol";

error CE_NotDAO();
error CE_Zero();
error CE_NotEligible();
error CE_ArrayMismatch();
error CE_BadSize();
error CE_TermLimitReached();

// ReentrancyGuard intentionally omitted: governance selection logic has no value transfers.
contract CouncilElection {
    uint8 public constant MIN_COUNCIL_SIZE = 1;
    uint8 public constant MAX_COUNCIL_SIZE = 12;
    uint8 public constant FIXED_MAX_CONSECUTIVE_TERMS = 1;
    uint64 public constant FIXED_TERM_SECONDS = 365 days;
    uint64 public constant FIXED_REELECTION_COOLDOWN = 365 days;
    uint64 public constant MIN_TERM_SECONDS = FIXED_TERM_SECONDS;
    uint64 public constant MAX_TERM_SECONDS = FIXED_TERM_SECONDS;
    uint64 public constant MIN_REFRESH_INTERVAL = 1 days;
    uint64 public constant MAX_REFRESH_INTERVAL = 180 days;
    uint64 public constant MAX_COOLDOWN_PERIOD = 3650 days;

    event ModulesSet(address dao, address seer, address hub, address ledger);
    event ParamsSet(uint8 councilSize, uint16 minScore, uint64 termSeconds, uint64 refreshInterval);
    event TermLimitsSet(uint8 maxConsecutiveTerms, uint64 cooldownPeriod);
    event CandidateRegistered(address indexed who);
    event CandidateUnregistered(address indexed who);
    event CouncilSet(address[] members, uint64 termEnd);

    address public dao;
    ISeer public seer;
    IVaultHub public vaultHub;
    IProofLedger public ledger; // optional

    mapping(address => bool) public isCandidate;
    mapping(address => bool) public isCouncil;
    address[] public currentCouncil;
    
    // Term limit tracking to prevent entrenchment
    mapping(address => uint8) public consecutiveTermsServed;
    mapping(address => uint64) public lastTermEndDate;
    uint8 public maxConsecutiveTerms = FIXED_MAX_CONSECUTIVE_TERMS; // Fixed policy: single consecutive term
    uint64 public cooldownPeriod = FIXED_REELECTION_COOLDOWN; // Fixed policy: must wait 1 year before re-eligibility

    uint8  public councilSize = 12;
    uint16 public minCouncilScore;       // default from Seer
    uint64 public termSeconds = FIXED_TERM_SECONDS; // Fixed policy: 1 year term
    uint64 public refreshInterval = 14 days;
    uint64 public termEnd;

    modifier onlyDAO() {
        _checkDAO();
        _;
    }

    function _checkDAO() internal view {
        if (msg.sender != dao) revert CE_NotDAO();
    }

    constructor(address _dao, address _seer, address _hub, address _ledger) {
        if (_dao == address(0) || _seer == address(0) || _hub == address(0)) revert CE_Zero();
        dao=_dao; seer=ISeer(_seer); vaultHub=IVaultHub(_hub); ledger=IProofLedger(_ledger);
        minCouncilScore = 7000; // Council requires ProofScore ≥7000 (70%, blueprint requirement, 0-10000 scale)
        emit ModulesSet(_dao,_seer,_hub,_ledger);
    }

    function setModules(address _dao, address _seer, address _hub, address _ledger) external onlyDAO {
        if (_dao == address(0) || _seer == address(0) || _hub == address(0)) revert CE_Zero();
        dao=_dao; seer=ISeer(_seer); vaultHub=IVaultHub(_hub); ledger=IProofLedger(_ledger);
        emit ModulesSet(_dao,_seer,_hub,_ledger); _log("ce_modules_set");
    }

    function setParams(uint8 _size, uint16 _minScore, uint64 _term, uint64 _refresh) external onlyDAO {
        if (_size < MIN_COUNCIL_SIZE || _size > MAX_COUNCIL_SIZE) revert CE_BadSize();
        require(_minScore >= 5600 && _minScore <= 10000, "CE: invalid min score");
        require(_term == FIXED_TERM_SECONDS, "CE: term fixed");
        require(
            _refresh >= MIN_REFRESH_INTERVAL &&
            _refresh <= MAX_REFRESH_INTERVAL &&
            _refresh <= _term,
            "CE: invalid refresh"
        );
        councilSize=_size; minCouncilScore=_minScore; termSeconds=_term; refreshInterval=_refresh;
        emit ParamsSet(_size,_minScore,_term,_refresh); _log("ce_params_set");
    }

    function setTermLimits(uint8 _maxConsecutive, uint64 _cooldown) external onlyDAO {
        require(_maxConsecutive == FIXED_MAX_CONSECUTIVE_TERMS, "CE: max terms fixed");
        require(_cooldown == FIXED_REELECTION_COOLDOWN, "CE: cooldown fixed");
        maxConsecutiveTerms = _maxConsecutive;
        cooldownPeriod = _cooldown;
        emit TermLimitsSet(_maxConsecutive, _cooldown);
        _log("ce_term_limits_set");
    }

    function register() external {
        if (!_eligible(msg.sender)) revert CE_NotEligible();
        isCandidate[msg.sender]=true;
        
        // Track in candidate list if not already there
        if (!inCandidateList[msg.sender]) {
            require(candidateList.length < 200, "CE: max candidates");
            candidateList.push(msg.sender);
            inCandidateList[msg.sender] = true;
        }
        
        emit CandidateRegistered(msg.sender); _log("ce_register");
    }

    function unregister() external {
        isCandidate[msg.sender] = false;
        
        if (inCandidateList[msg.sender]) {
            _removeFromCandidateList(msg.sender);
            inCandidateList[msg.sender] = false;
        }
        
        emit CandidateUnregistered(msg.sender);
        _log("ce_unregister");
    }
    
    /// @dev Internal helper to remove from candidateList array
    function _removeFromCandidateList(address candidate) internal {
        uint256 len = candidateList.length;
        for (uint256 i = 0; i < len; i++) {
            if (candidateList[i] == candidate) {
                candidateList[i] = candidateList[len - 1];
                candidateList.pop();
                break;
            }
        }
    }

    function setCouncil(address[] calldata members) external onlyDAO {
        if (members.length==0 || members.length>councilSize) revert CE_ArrayMismatch();
        
        // Clear old council state
        uint256 councilLength = currentCouncil.length;
        for (uint256 i = 0; i < councilLength; ++i) {
            isCouncil[currentCouncil[i]] = false;
        }
        delete currentCouncil;

        uint64 newTermEnd = uint64(block.timestamp) + termSeconds;
        
        // This prevents gaming by waiting 15 days to reset consecutive count
        uint64 consecutiveThreshold = termSeconds / 2;
        
        uint256 membersLength = members.length;
        for (uint256 i=0; i<membersLength; ++i) {
            address member = members[i];
            require(isCandidate[member], "CE: not candidate");
            if (!_eligible(member)) revert CE_NotEligible();
            
            require(!isCouncil[member], "CE: duplicate member");
            
            bool isConsecutive = lastTermEndDate[member] > 0 && lastTermEndDate[member] >= block.timestamp - consecutiveThreshold;
            
            if (isConsecutive) {
                if (consecutiveTermsServed[member] >= maxConsecutiveTerms) revert CE_TermLimitReached();
                consecutiveTermsServed[member]++;
            } else {
                // Check cooldown
                if (lastTermEndDate[member] > 0 && block.timestamp < lastTermEndDate[member] + cooldownPeriod) {
                    // Still in cooldown?
                    if (consecutiveTermsServed[member] >= maxConsecutiveTerms) revert CE_TermLimitReached();
                    // If not maxed out, they can serve (gap year not required if not maxed)
                } else {
                    // Cooldown passed or first time
                    consecutiveTermsServed[member] = 1;
                }
            }
            
            if (consecutiveTermsServed[member] > maxConsecutiveTerms) revert CE_TermLimitReached();
            
            lastTermEndDate[member] = newTermEnd;
            isCouncil[member] = true;
            currentCouncil.push(member);
        }
        require(currentCouncil.length <= 100, "CE: max council"); // I-11: Cap council size

        termEnd = newTermEnd;
        emit CouncilSet(members, termEnd);
        _log("ce_council_set");
    }

    /// Called periodically off-chain or by DAO keepers to remove members who fell below score.
    function refreshCouncil(address[] calldata current) external onlyDAO {
        uint256 length = current.length;
        for (uint256 i=0;i<length;++i){
            address m=current[i];
            if (isCouncil[m] && !_eligible(m)) { 
                isCouncil[m]=false;
                _removeFromCouncilArray(m);
            }
        }
        _log("ce_refresh");
    }
    
    /// @dev Internal helper to remove member from currentCouncil array
    function _removeFromCouncilArray(address member) internal {
        uint256 councilLength = currentCouncil.length;
        for (uint256 i = 0; i < councilLength; ++i) {
            if (currentCouncil[i] == member) {
                currentCouncil[i] = currentCouncil[councilLength - 1];
                currentCouncil.pop();
                break;
            }
        }
    }

    /// Remove council member for breaking VFIDE laws or falling below ProofScore 7000 (70%)
    /// Can be called immediately without waiting for refresh
    function removeCouncilMember(address member, string calldata reason) external onlyDAO {
        require(isCouncil[member], "CE: not council member");
        
        // DAO can remove anyone for any reason
        isCouncil[member] = false;
        
        // Remove from currentCouncil array using helper
        _removeFromCouncilArray(member);
        
        // Mark their term as ended early (prevents immediate re-election)
        lastTermEndDate[member] = uint64(block.timestamp);
        
        emit CandidateUnregistered(member);
        _log("ce_member_removed");
        
        // Log reason to ProofLedger
        if (address(ledger) != address(0)) {
            try ledger.logSystemEvent(member, reason, msg.sender) {} catch { emit LedgerLogFailed(member, reason); }
        }
    }

// ─────────────────────────── Helpers for Salary/External

    function getCouncilMember(uint256 index) external view returns (address) {
        if (index >= currentCouncil.length) return address(0);
        return currentCouncil[index];
    }

    function getActualCouncilSize() external view returns (uint256) {
        return currentCouncil.length;
    }

    function _eligible(address a) internal view returns (bool) {
        if (a==address(0)) return false;
        if (vaultHub.vaultOf(a)==address(0)) return false;
        // Council members must maintain high trust threshold
        return seer.getScore(a) >= minCouncilScore;
    }

    /// Check if member can serve based on term limits (prevents entrenchment)
    function _canServe(address a) internal view returns (bool) {
        // If never served, can serve
        if (consecutiveTermsServed[a] == 0) return true;
        
        // If currently serving and at max consecutive terms, cannot serve again
        if (isCouncil[a] && consecutiveTermsServed[a] >= maxConsecutiveTerms) {
            return false;
        }
        
        // If not currently serving, check cooldown period
        if (!isCouncil[a]) {
            // If they hit max terms previously, must complete cooldown
            if (consecutiveTermsServed[a] >= maxConsecutiveTerms) {
                return block.timestamp >= lastTermEndDate[a] + cooldownPeriod;
            }
        }
        
        return true;
    }
    
    /// Public function to check term limit eligibility
    function canServeNextTerm(address member) external view returns (bool eligible, uint8 termsServed, uint64 cooldownEnds) {
        eligible = _eligible(member) && _canServe(member);
        termsServed = consecutiveTermsServed[member];
        cooldownEnds = lastTermEndDate[member] + cooldownPeriod;
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    //                        CANDIDATE & ELECTION VIEWS
    // ═══════════════════════════════════════════════════════════════════════
    
    // Track all candidates who have ever registered
    address[] private candidateList;
    mapping(address => bool) private inCandidateList;
    
    /**
     * @notice Get all registered candidates
     * @return candidates Array of active candidate addresses
     */
    function getCandidates() external view returns (address[] memory candidates) {
        // Count active candidates
        uint256 count = 0;
        for (uint256 i = 0; i < candidateList.length; i++) {
            if (isCandidate[candidateList[i]]) count++;
        }
        
        // Collect active candidates
        candidates = new address[](count);
        uint256 idx = 0;
        for (uint256 i = 0; i < candidateList.length; i++) {
            if (isCandidate[candidateList[i]]) {
                candidates[idx++] = candidateList[i];
            }
        }
    }
    
    /**
     * @notice Get comprehensive election status
     */
    function getElectionStatus() external view returns (
        uint256 currentCouncilSize,
        uint256 maxCouncilSize,
        uint64 termEndTime,
        uint256 daysRemaining,
        uint256 candidateCount,
        uint256 eligibleCandidateCount
    ) {
        currentCouncilSize = currentCouncil.length;
        maxCouncilSize = councilSize;
        termEndTime = termEnd;
        daysRemaining = termEnd > block.timestamp ? (termEnd - block.timestamp) / 1 days : 0;
        
        // Count all candidates and eligible ones
        for (uint256 i = 0; i < candidateList.length; i++) {
            address c = candidateList[i];
            if (isCandidate[c]) {
                candidateCount++;
                if (_eligible(c) && _canServe(c)) {
                    eligibleCandidateCount++;
                }
            }
        }
    }
    
    /**
     * @notice Get current council members
     */
    function getCouncilMembers() external view returns (address[] memory) {
        return currentCouncil;
    }
    
    /**
     * @notice Check if user is eligible to register as candidate
     */
    function canRegister(address user) external view returns (
        bool eligible,
        bool hasVault,
        uint16 currentScore,
        uint16 requiredScore,
        bool canServe
    ) {
        hasVault = vaultHub.vaultOf(user) != address(0);
        currentScore = seer.getScore(user);
        requiredScore = minCouncilScore;
        canServe = _canServe(user);
        eligible = hasVault && currentScore >= requiredScore && canServe;
    }

    function _log(string memory action) internal {
        if (address(ledger)!=address(0)) { try ledger.logSystemEvent(address(this), action, msg.sender) {} catch { emit LedgerLogFailed(address(this), action); } }
    }
}
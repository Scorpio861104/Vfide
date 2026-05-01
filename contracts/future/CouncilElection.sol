// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import "../SharedInterfaces.sol";

error CE_NotDAO();
error CE_Zero();
error CE_NotEligible();
error CE_ArrayMismatch();
error CE_BadSize();
error CE_TermLimitReached();
error CE_NoActiveElection();
error CE_ElectionStillActive();
error CE_AlreadyVoted();
error CE_InvalidElectionWindow();
error CE_NotTopVotedCandidate();
/// @notice M-38 FIX: candidateList cap reached; existing candidates must unregister before new ones can join.
error CE_TooManyCandidates();

// ReentrancyGuard intentionally omitted: governance selection logic has no value transfers.
contract CouncilElection {
    uint8 public constant MIN_COUNCIL_SIZE = 1;
    uint8 public constant MAX_COUNCIL_SIZE = 21;
    uint8 public constant FIXED_MAX_CONSECUTIVE_TERMS = 1;
    uint64 public constant FIXED_TERM_SECONDS = 365 days;
    uint64 public constant FIXED_REELECTION_COOLDOWN = 365 days;
    uint64 public constant MIN_TERM_SECONDS = FIXED_TERM_SECONDS;
    uint64 public constant MAX_TERM_SECONDS = FIXED_TERM_SECONDS;
    uint64 public constant MIN_REFRESH_INTERVAL = 1 days;
    uint64 public constant MAX_REFRESH_INTERVAL = 180 days;
    uint64 public constant MAX_COOLDOWN_PERIOD = 3650 days;
    uint64 public constant MIN_ELECTION_WINDOW = 1 days;
    uint64 public constant MAX_ELECTION_WINDOW = 30 days;
    /// @notice M-38 FIX: Cap the candidate list so it cannot be spam-filled by well-resourced actors,
    ///         blocking later qualified candidates first-come-first-served.
    uint256 public constant MAX_CANDIDATES = 500;

    event ModulesSet(address dao, address seer, address hub, address ledger);
    event ModulesProposed(address dao, address seer, address hub, address ledger, uint64 effectiveAt);
    event ModulesChangeCancelled();
    event ParamsSet(uint8 councilSize, uint16 minScore, uint64 termSeconds, uint64 refreshInterval);
    event TermLimitsSet(uint8 maxConsecutiveTerms, uint64 cooldownPeriod);
    event CandidateRegistered(address indexed who);
    event CandidateUnregistered(address indexed who);
    event CouncilSet(address[] members, uint64 termEnd);
    event ElectionStarted(uint256 indexed epoch, uint64 startAt, uint64 endAt);
    event ElectionVoteCast(uint256 indexed epoch, address indexed voter, address indexed candidate, uint256 weight);

    address public dao;
    ISeer public seer;
    IVaultHub public vaultHub;
    IProofLedger public ledger; // optional

    // H-3 FIX: Timelocked setModules to prevent instant Seer/VaultHub replacement (council capture vector)
    struct PendingModules {
        address dao;
        address seer;
        address hub;
        address ledger;
        uint64 effectiveAt;
    }
    PendingModules public pendingModules;
    uint64 public constant MODULES_CHANGE_DELAY = 48 hours;

    mapping(address => bool) public isCandidate;
    mapping(address => bool) public isCouncil;
    mapping(address => uint16) public councilTermScoreSnapshot;
    address[] public currentCouncil;
        // H-34/H-35 FIX: Two-step council appointment with 72h delay for governance veto.
        // The DAO proposes a council; it is automatically applied after COUNCIL_APPOINT_DELAY
        // if no governance cancelation occurs.  This replaces the instant `setCouncil` path with
        // a transparent delay allowing token-holders to raise an alarm via DAO governance.
        struct PendingCouncil {
            address[] members;
            uint64 validFrom;
        }
        PendingCouncil private _pendingCouncil;
        bool public hasPendingCouncil;
        uint256 public constant COUNCIL_APPOINT_DELAY = 72 hours;
        event CouncilProposed(address[] members, uint64 validFrom);
        event CouncilApplied(address[] members, uint64 termEnd);
        event CouncilProposalCancelled();

    uint256 public electionEpoch;
    uint64 public electionStartAt;
    uint64 public electionEndAt;
    uint256 public lastAppliedElectionEpoch;
    mapping(uint256 => mapping(address => uint256)) private _candidateVotes;
    mapping(uint256 => mapping(address => bool)) private _hasVoted;
    
    // Term limit tracking to prevent entrenchment
    mapping(address => uint8) public consecutiveTermsServed;
    mapping(address => uint64) public lastTermEndDate;
    uint8 public maxConsecutiveTerms = FIXED_MAX_CONSECUTIVE_TERMS; // Fixed policy: single consecutive term
    uint64 public cooldownPeriod = FIXED_REELECTION_COOLDOWN; // Fixed policy: must wait 1 year before re-eligibility

    uint8  public councilSize = 12; // Start with 12 seats; DAO can grow toward the long-term cap.
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
        require(pendingModules.effectiveAt == 0, "CE: pending modules exist");
        uint64 at = uint64(block.timestamp) + MODULES_CHANGE_DELAY;
        pendingModules = PendingModules({ dao: _dao, seer: _seer, hub: _hub, ledger: _ledger, effectiveAt: at });
        emit ModulesProposed(_dao, _seer, _hub, _ledger, at);
        _log("ce_modules_proposed");
    }

    function applyModules() external onlyDAO {
        PendingModules memory p = pendingModules;
        require(p.effectiveAt != 0 && block.timestamp >= p.effectiveAt, "CE: timelock");
        dao = p.dao; seer = ISeer(p.seer); vaultHub = IVaultHub(p.hub); ledger = IProofLedger(p.ledger);
        delete pendingModules;
        emit ModulesSet(p.dao, address(p.seer), address(p.hub), address(p.ledger));
        _log("ce_modules_set");
    }

    function cancelModulesChange() external onlyDAO {
        require(pendingModules.effectiveAt != 0, "CE: no pending");
        delete pendingModules;
        emit ModulesChangeCancelled();
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

    function recommendedCouncilSize() public view returns (uint8) {
        if (address(vaultHub) == address(0)) {
            return councilSize;
        }

        uint256 users = vaultHub.totalVaultsCreated();
        if (users < 1_000) return 7;
        if (users < 10_000) return 9;
        if (users < 100_000) return 12;
        if (users < 1_000_000) return 15;
        return 21;
    }

    function applyRecommendedCouncilSize() external onlyDAO {
        uint8 newSize = recommendedCouncilSize();
        if (newSize == councilSize) {
            return;
        }
        if (newSize < MIN_COUNCIL_SIZE || newSize > MAX_COUNCIL_SIZE) revert CE_BadSize();
        councilSize = newSize;
        emit ParamsSet(newSize, minCouncilScore, termSeconds, refreshInterval);
        _log("ce_recommended_size_applied");
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
            // M-38 FIX: Prevent first-come-first-served lock-out by late qualified candidates.
            if (candidateList.length >= MAX_CANDIDATES) revert CE_TooManyCandidates();
            candidateList.push(msg.sender);
            inCandidateList[msg.sender] = true;
        }
        
        emit CandidateRegistered(msg.sender); _log("ce_register");
    }

    function startElection(uint64 votingWindow) external onlyDAO {
        if (votingWindow < MIN_ELECTION_WINDOW || votingWindow > MAX_ELECTION_WINDOW) {
            revert CE_InvalidElectionWindow();
        }
        if (electionEndAt != 0 && block.timestamp < electionEndAt) revert CE_ElectionStillActive();

        electionEpoch += 1;
        electionStartAt = uint64(block.timestamp);
        electionEndAt = uint64(block.timestamp + votingWindow);

        emit ElectionStarted(electionEpoch, electionStartAt, electionEndAt);
        _log("ce_election_started");
    }

    function vote(address candidate) external {
        if (electionStartAt == 0 || block.timestamp < electionStartAt || block.timestamp >= electionEndAt) {
            revert CE_NoActiveElection();
        }
        if (!isCandidate[candidate] || !_eligibleAt(candidate, electionStartAt)) revert CE_NotEligible();
        if (!_eligibleAt(msg.sender, electionStartAt)) revert CE_NotEligible();
        if (_hasVoted[electionEpoch][msg.sender]) revert CE_AlreadyVoted();

        _hasVoted[electionEpoch][msg.sender] = true;
        uint256 weight = seer.getScoreAt(msg.sender, electionStartAt);
        _candidateVotes[electionEpoch][candidate] += weight;

        emit ElectionVoteCast(electionEpoch, msg.sender, candidate, weight);
        _log("ce_vote_cast");
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

    /// @notice H-34/H-35 FIX: Propose a new council composition. Takes effect after 72h delay.
    ///         During the delay, DAO governance can cancel the proposal via cancelCouncilProposal().
    function proposeCouncil(address[] calldata members) external onlyDAO {
        if (electionEpoch == 0 || electionEndAt == 0 || block.timestamp < electionEndAt) {
            revert CE_ElectionStillActive();
        }
        if (lastAppliedElectionEpoch == electionEpoch) revert CE_NoActiveElection();

        if (members.length == 0 || members.length > councilSize) revert CE_ArrayMismatch();
        // Validate eligibility upfront (prevents delaying a forgone-conclusion proposal)
        for (uint256 i = 0; i < members.length; ++i) {
            require(isCandidate[members[i]], "CE: not candidate");
            if (!_eligibleAt(members[i], electionStartAt)) revert CE_NotEligible();
            if (!_isTopVotedCandidate(electionEpoch, members[i], uint8(members.length))) {
                revert CE_NotTopVotedCandidate();
            }
        }
        _pendingCouncil = PendingCouncil({
            members: members,
            validFrom: uint64(block.timestamp + COUNCIL_APPOINT_DELAY)
        });
        hasPendingCouncil = true;
        emit CouncilProposed(members, uint64(block.timestamp + COUNCIL_APPOINT_DELAY));
    }

    /// @notice Apply the pending council after the 72h delay.
    function applyCouncil() external {
        require(hasPendingCouncil, "CE: nothing pending");
        require(block.timestamp >= _pendingCouncil.validFrom, "CE: timelock pending");

        address[] memory members = _pendingCouncil.members;
        hasPendingCouncil = false;
        delete _pendingCouncil;

        _applyCouncilInternal(members);
        lastAppliedElectionEpoch = electionEpoch;
    }

    /// @notice Cancel the pending council proposal (callable by DAO).
    function cancelCouncilProposal() external onlyDAO {
        hasPendingCouncil = false;
        delete _pendingCouncil;
        emit CouncilProposalCancelled();
    }

    /// @dev Internal: validate and apply the council from a given member array.
    function _applyCouncilInternal(address[] memory members) internal {
        uint256 councilLength = currentCouncil.length;
        for (uint256 i = 0; i < councilLength; ++i) {
            isCouncil[currentCouncil[i]] = false;
            councilTermScoreSnapshot[currentCouncil[i]] = 0;
        }
        delete currentCouncil;

        uint64 newTermEnd = uint64(block.timestamp) + termSeconds;
        uint64 consecutiveThreshold = termSeconds / 2;

        for (uint256 i = 0; i < members.length; ++i) {
            address member = members[i];
            require(isCandidate[member], "CE: not candidate");
            if (!_eligibleAt(member, electionStartAt)) revert CE_NotEligible();
            require(!isCouncil[member], "CE: duplicate member");

            bool isConsecutive = lastTermEndDate[member] > 0 && lastTermEndDate[member] >= block.timestamp - consecutiveThreshold;
            if (isConsecutive) {
                if (consecutiveTermsServed[member] >= maxConsecutiveTerms) revert CE_TermLimitReached();
                consecutiveTermsServed[member]++;
            } else {
                if (lastTermEndDate[member] > 0 && block.timestamp < lastTermEndDate[member] + cooldownPeriod) {
                    if (consecutiveTermsServed[member] >= maxConsecutiveTerms) revert CE_TermLimitReached();
                } else {
                    consecutiveTermsServed[member] = 1;
                }
            }
            if (consecutiveTermsServed[member] > maxConsecutiveTerms) revert CE_TermLimitReached();

            lastTermEndDate[member] = newTermEnd;
            councilTermScoreSnapshot[member] = seer.getScoreAt(member, electionStartAt);
            isCouncil[member] = true;
            currentCouncil.push(member);
        }
        require(currentCouncil.length <= 100, "CE: max council");
        termEnd = newTermEnd;
        emit CouncilApplied(members, termEnd);
        _log("ce_council_applied");
    }

    /// Called periodically off-chain or by DAO keepers to remove members who fell below score.
    function refreshCouncil(address[] calldata current) external onlyDAO {
        uint256 length = current.length;
        for (uint256 i=0;i<length;++i){
            address m=current[i];
            if (isCouncil[m] && !_eligibleForCurrentTerm(m)) {
                isCouncil[m]=false;
                councilTermScoreSnapshot[m] = 0;
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
    // slither-disable-next-line reentrancy-events
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

    function _eligibleAt(address a, uint64 scoreTimestamp) internal view returns (bool) {
        if (a==address(0)) return false;
        if (vaultHub.vaultOf(a)==address(0)) return false;
        return seer.getScoreAt(a, scoreTimestamp) >= minCouncilScore;
    }

    function _eligibleForCurrentTerm(address member) internal view returns (bool) {
        if (member == address(0)) return false;
        if (vaultHub.vaultOf(member) == address(0)) return false;

        uint16 snapshot = councilTermScoreSnapshot[member];
        if (snapshot == 0) {
            // Backward compatibility for members seated before snapshot rollout.
            snapshot = seer.getScore(member);
        }
        return snapshot >= minCouncilScore;
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
    // slither-disable-next-line reentrancy-events
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

    function getElectionWindow() external view returns (uint64 startAt, uint64 endAt, uint256 epoch) {
        return (electionStartAt, electionEndAt, electionEpoch);
    }

    function getCandidateVotes(address candidate, uint256 epoch) external view returns (uint256) {
        return _candidateVotes[epoch][candidate];
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

    function _isTopVotedCandidate(uint256 epoch, address candidate, uint8 topN) internal view returns (bool) {
        uint256 candidateVotes = _candidateVotes[epoch][candidate];
        if (candidateVotes == 0) return false;

        uint256 strictlyBetter = 0;
        for (uint256 i = 0; i < candidateList.length; i++) {
            address other = candidateList[i];
            if (!isCandidate[other]) continue;
            if (!_eligibleAt(other, electionStartAt)) continue;

            uint256 otherVotes = _candidateVotes[epoch][other];
            if (other == candidate) continue;

            if (otherVotes > candidateVotes || (otherVotes == candidateVotes && other < candidate)) {
                strictlyBetter++;
                if (strictlyBetter >= topN) return false;
            }
        }

        return strictlyBetter < topN;
    }

    // slither-disable-next-line reentrancy-events
    function _log(string memory action) internal {
        if (address(ledger)!=address(0)) { try ledger.logSystemEvent(address(this), action, msg.sender) {} catch { emit LedgerLogFailed(address(this), action); } }
    }
}
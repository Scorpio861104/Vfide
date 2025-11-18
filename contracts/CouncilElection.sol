// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

interface ISeer_GOV { function getScore(address) external view returns (uint16); function minForGovernance() external view returns (uint16); }
interface IVaultHub_GOV { function vaultOf(address owner) external view returns (address); }
interface IProofLedger_GOV2 { function logSystemEvent(address who, string calldata action, address by) external; }

error CE_NotDAO();
error CE_Zero();
error CE_NotEligible();
error CE_ArrayMismatch();
error CE_BadSize();
error CE_TermLimitReached();

contract CouncilElection {
    event ModulesSet(address dao, address seer, address hub, address ledger);
    event ParamsSet(uint8 councilSize, uint16 minScore, uint64 termSeconds, uint64 refreshInterval);
    event TermLimitsSet(uint8 maxConsecutiveTerms, uint64 cooldownPeriod);
    event CandidateRegistered(address indexed who);
    event CandidateUnregistered(address indexed who);
    event CouncilSet(address[] members, uint64 termEnd);

    address public dao;
    ISeer_GOV public seer;
    IVaultHub_GOV public vaultHub;
    IProofLedger_GOV2 public ledger; // optional

    mapping(address => bool) public isCandidate;
    mapping(address => bool) public isCouncil;
    
    // Term limit tracking to prevent entrenchment
    mapping(address => uint8) public consecutiveTermsServed;
    mapping(address => uint64) public lastTermEndDate;
    uint8 public maxConsecutiveTerms = 1; // Max 1 year continuous service before mandatory break
    uint64 public cooldownPeriod = 365 days; // Must wait 1 year before re-eligibility
    uint16 public minCouncilScoreStrict = 700; // High trust threshold for council (700 = high trust)

    uint8  public councilSize = 12;
    uint16 public minCouncilScore;       // default from Seer
    uint64 public termSeconds = 365 days; // 1 year term
    uint64 public refreshInterval = 14 days;
    uint64 public termEnd;

    modifier onlyDAO() { if (msg.sender != dao) revert CE_NotDAO(); _; }

    constructor(address _dao, address _seer, address _hub, address _ledger) {
        if (_dao == address(0) || _seer == address(0) || _hub == address(0)) revert CE_Zero();
        dao=_dao; seer=ISeer_GOV(_seer); vaultHub=IVaultHub_GOV(_hub); ledger=IProofLedger_GOV2(_ledger);
        minCouncilScore = seer.minForGovernance();
        emit ModulesSet(_dao,_seer,_hub,_ledger);
    }

    function setModules(address _dao, address _seer, address _hub, address _ledger) external onlyDAO {
        if (_dao == address(0) || _seer == address(0) || _hub == address(0)) revert CE_Zero();
        dao=_dao; seer=ISeer_GOV(_seer); vaultHub=IVaultHub_GOV(_hub); ledger=IProofLedger_GOV2(_ledger);
        emit ModulesSet(_dao,_seer,_hub,_ledger); _log("ce_modules_set");
    }

    function setParams(uint8 _size, uint16 _minScore, uint64 _term, uint64 _refresh) external onlyDAO {
        if (_size == 0) revert CE_BadSize();
        councilSize=_size; minCouncilScore=_minScore; termSeconds=_term; refreshInterval=_refresh;
        emit ParamsSet(_size,_minScore,_term,_refresh); _log("ce_params_set");
    }

    function setTermLimits(uint8 _maxConsecutive, uint64 _cooldown, uint16 _minScoreStrict) external onlyDAO {
        require(_maxConsecutive > 0 && _maxConsecutive <= 10, "CE: invalid max terms");
        require(_cooldown >= 90 days, "CE: cooldown too short");
        require(_minScoreStrict >= 500, "CE: score too low");
        maxConsecutiveTerms = _maxConsecutive;
        cooldownPeriod = _cooldown;
        minCouncilScoreStrict = _minScoreStrict;
        emit TermLimitsSet(_maxConsecutive, _cooldown);
        _log("ce_term_limits_set");
    }

    function register() external {
        if (!_eligible(msg.sender)) revert CE_NotEligible();
        isCandidate[msg.sender]=true; emit CandidateRegistered(msg.sender); _log("ce_register");
    }

    function unregister() external { isCandidate[msg.sender]=false; emit CandidateUnregistered(msg.sender); _log("ce_unregister"); }

    function setCouncil(address[] calldata members) external onlyDAO {
        if (members.length==0 || members.length>councilSize) revert CE_ArrayMismatch();
        
        uint64 newTermEnd = uint64(block.timestamp) + termSeconds;
        
        // Enforce eligibility and term limits per member
        for (uint256 i=0; i<members.length; i++) {
            address member = members[i];
            if (!_eligible(member)) revert CE_NotEligible();
            
            // Check term limits to prevent entrenchment
            if (!_canServe(member)) revert CE_TermLimitReached();
            
            // Track consecutive terms
            if (isCouncil[member]) {
                // Already serving, increment consecutive count
                consecutiveTermsServed[member]++;
            } else {
                // New or returning member
                if (lastTermEndDate[member] > 0 && block.timestamp >= lastTermEndDate[member] + cooldownPeriod) {
                    // Cooldown completed, reset counter
                    consecutiveTermsServed[member] = 1;
                } else if (consecutiveTermsServed[member] == 0) {
                    // First time ever
                    consecutiveTermsServed[member] = 1;
                }
                // If they're within cooldown, consecutiveTermsServed stays at previous value
            }
            
            lastTermEndDate[member] = newTermEnd;
            isCouncil[member] = true;
        }

        termEnd = newTermEnd;
        emit CouncilSet(members, termEnd);
        _log("ce_council_set");
    }

    /// Called periodically off-chain or by DAO keepers to remove members who fell below score.
    function refreshCouncil(address[] calldata current) external onlyDAO {
        for (uint256 i=0;i<current.length;i++){
            address m=current[i];
            if (isCouncil[m] && !_eligible(m)) { isCouncil[m]=false; }
        }
        _log("ce_refresh");
    }

    /// Remove council member for breaking VFIDE laws or falling below ProofScore 700
    /// Can be called immediately without waiting for refresh
    function removeCouncilMember(address member, string calldata reason) external onlyDAO {
        require(isCouncil[member], "CE: not council member");

        // Delegate high trust threshold check to Seer
        uint16 score = seer.getScore(member);
        require(score < minCouncilScoreStrict, "CE: member still eligible");

        isCouncil[member] = false;

        // Mark their term as ended early (prevents immediate re-election)
        lastTermEndDate[member] = uint64(block.timestamp);

        emit CandidateUnregistered(member);
        _log("ce_member_removed");

        // Log reason to ProofLedger
        if (address(ledger) != address(0)) {
            try ledger.logSystemEvent(member, reason, msg.sender) {} catch {}
        }
    }

    function _eligible(address a) internal view returns (bool) {
        if (a == address(0)) return false;
        if (vaultHub.vaultOf(a) == address(0)) return false;
        // Delegate eligibility check to Seer
        return seer.getScore(a) >= minCouncilScoreStrict;
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

    function _log(string memory action) internal {
        if (address(ledger)!=address(0)) { try ledger.logSystemEvent(address(this), action, msg.sender) {} catch {} }
    }
}
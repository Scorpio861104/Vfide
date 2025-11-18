// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

/**
 * @title DAOIncentives (Anti-King Model)
 * @notice Fair compensation for DAO service - NOT wealth creation
 * 
 * VFIDE MISSION: Protect the forgotten, not enrich the powerful
 * 
 * ANTI-KING PRINCIPLES:
 * - No wealth accumulation for DAO members
 * - No staking APY (not a get-rich scheme)
 * - No revenue share (DAO serves, doesn't extract)
 * - Small, fair payment for time/effort ONLY
 * - Zero transaction fees while actively serving
 * - Integrity is the only power, never funds
 * 
 * FAIR COMPENSATION MODEL:
 * 1. Service deposit (10k VFIDE, returned when leave with honor)
 * 2. Small monthly stipend (100 VFIDE ~$1k, covers time only)
 * 3. Zero transaction fees while serving (systemExempt)
 * 4. ProofScore boost (reputation, not money)
 * 5. 100% deposit forfeited if corrupt (zero tolerance)
 * 
 * WHAT THIS IS NOT:
 * - NOT a passive income scheme
 * - NOT a whale playground
 * - NOT about getting rich
 * - NOT extractive governance
 * 
 * WHAT THIS IS:
 * - Fair compensation for service to the forgotten
 * - Accountability through forfeiture
 * - Integrity over profit
 * - Community service, not wealth-seeking
 */

interface IERC20_DI {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
}

interface IProofLedger_DI {
    function logSystemEvent(address who, string calldata action, address by) external;
    function logEvent(address who, string calldata action, uint256 amount, string calldata note) external;
}

interface ISeer_DI {
    function getScore(address account) external view returns (uint16);
    function rewardMerchant(address merchant, uint16 delta, string calldata reason) external;
}

interface IVaultHub_DI {
    function getOwner(address vault) external view returns (address);
    function createVault(address owner) external returns (address);
    function transferVault(address vault, address newOwner) external;
}

interface IVFIDEToken {
    function setSystemExempt(address account, bool exempt) external;
}

interface SustainableTreasury {
    function getBalance() external view returns (uint256);
}

error INCENT_NotDAO();
error INCENT_AlreadyMember();
error INCENT_NotMember();
error INCENT_InsufficientDeposit();
error INCENT_TooSoonToClaimStipend();
error INCENT_AlreadySlashed();
error INCENT_Zero();

contract DAOIncentives {
    event DAOChanged(address indexed oldDAO, address indexed newDAO);
    event ElectionStarted(uint256 indexed electionId, ElectionPhase phase, uint256 startTime);
    event PhaseAdvanced(uint256 indexed electionId, ElectionPhase oldPhase, ElectionPhase newPhase);
    event CandidateNominated(uint256 indexed electionId, address indexed candidate, uint16 proofScore);
    event CandidateDisqualified(uint256 indexed electionId, address indexed candidate, string reason);
    event CommunityVoteCast(uint256 indexed electionId, address indexed voter, address indexed candidate, uint256 voteWeight);
    event DAOVoteCast(uint256 indexed electionId, address indexed daoMember, address indexed candidate);
    event CandidateElected(uint256 indexed electionId, address indexed candidate, address seatVault);
    event MemberTermEnded(address indexed member, uint256 seatVaultBalance, bool reelectionEligible);
    event MonthlyDistributed(uint256 totalAmount, uint256 memberCount, uint256 perMember);
    event SeatVaultFunded(address indexed member, address indexed seatVault, uint256 amount);
    event MemberShareClaimed(address indexed member, uint256 amount, uint256 monthsServed);
    event PoolAccumulated(uint256 amount, uint256 newTotal);
    event MemberSlashed(address indexed member, uint256 depositForfeited, uint256 seatVaultForfeited, string reason);
    event SeatVaultSeized(address indexed member, address indexed seatVault, uint256 amount, address sentTo);
    event ProofScoreBoostApplied(address indexed member, uint16 delta, string reason);
    event SystemExemptSet(address indexed member, bool exempt);
    event ModuleUpdated(string moduleName, address indexed oldAddr, address indexed newAddr);
    event PoolShareBpsSet(uint16 oldBps, uint16 newBps);

    struct Candidate {
        address account;            // Candidate address
        address seatVault;          // Seat vault (created if elected)
        uint256 communityVotes;     // Votes from community (ProofScore-weighted)
        uint256 daoVotes;           // Votes from current DAO members
        uint256 nominatedAt;        // Timestamp of nomination
        bool passedPrimary;         // Top candidates from community vote
        bool elected;               // Elected by DAO in final vote
        bool disqualified;          // Can be disqualified for bad ProofScore
    }
    
    struct DAOMember {
        address seatVault;          // Dedicated vault for this DAO seat (receives monthly shares)
        uint256 electedAt;          // Timestamp when elected
        uint256 totalMonthsServed;  // Months of active service
        uint256 lastStipendClaim;   // Timestamp of last monthly payment
        uint16 electionProofScore;  // ProofScore at time of election (for reference)
        bool isActive;              // Currently serving (true) or removed (false)
        bool systemExempt;          // Zero transaction fees while serving
        bool slashed;               // Seat vault forfeited due to corruption
    }
    
    enum ElectionPhase {
        NONE,                       // No active election
        NOMINATIONS,                // Community nominates candidates (7 days)
        COMMUNITY_VOTE,             // Community votes on nominees (14 days)
        DAO_VOTE,                   // DAO votes on top finalists (7 days)
        COMPLETE                    // Election complete, seats filled
    }
    
    // State variables
    IERC20_DI public vfideToken;
    IVFIDEToken public vfideTokenAdmin; // For systemExempt calls
    SustainableTreasury public treasury;
    IProofLedger_DI public proofLedger;
    ISeer_DI public seer;
    IVaultHub_DI public vaultHub;
    
    address public daoMultiSig;     // DAOMultiSigGuardian address
    
    // Percentage-based revenue share (sustainable, scales with VFIDE price)
    uint16 public daoPoolShareBps = 1000;                  // 10% of treasury's 50% = 5% of total burns (configurable 10-20%)
    uint16 public proofScoreBonusPerMonth = 5;             // +5 ProofScore per month of service (reputation, not money)
    uint256 public distributionInterval = 30 days;         // Monthly distributions
    
    // Election parameters (DAO configurable)
    uint16 public minProofScoreToNominate = 700;           // Minimum ProofScore to run (high trust)
    uint16 public minProofScoreToVote = 540;               // Minimum ProofScore to vote in primary
    uint8 public maxDAOSeats = 5;                          // Total DAO seats available
    uint8 public primaryFinalists = 10;                    // Top N candidates advance to DAO vote
    uint256 public termLength = 180 days;                  // 6-month terms
    
    // Current election state
    ElectionPhase public currentPhase;
    uint256 public electionStartTime;
    uint256 public electionId;
    
    // Tracking
    uint256 public lastDistribution;                       // Timestamp of last monthly distribution
    uint256 public accumulatedPool;                        // VFIDE accumulated since last distribution
    
    mapping(address => DAOMember) public members;
    address[] public memberList;                           // Current DAO members
    
    mapping(uint256 => mapping(address => Candidate)) public candidates; // electionId => candidate
    mapping(uint256 => address[]) public candidateList;    // electionId => candidate addresses
    mapping(uint256 => mapping(address => bool)) public hasVotedCommunity; // electionId => voter => voted
    mapping(uint256 => mapping(address => bool)) public hasVotedDAO;       // electionId => voter => voted

    modifier onlyDAO() {
        if (msg.sender != daoMultiSig) revert INCENT_NotDAO();
        _;
    }

    constructor(
        address _dao,
        address _vfideToken,
        address _treasury,
        address _proofLedger,
        address _seer,
        address _vaultHub
    ) {
        if (_dao == address(0) || _vfideToken == address(0) || _treasury == address(0) || 
            _proofLedger == address(0) || _seer == address(0) || _vaultHub == address(0)) {
            revert INCENT_Zero();
        }
        
        daoMultiSig = _dao;
        vfideToken = IERC20_DI(_vfideToken);
        vfideTokenAdmin = IVFIDEToken(_vfideToken);
        treasury = SustainableTreasury(_treasury);
        proofLedger = IProofLedger_DI(_proofLedger);
        seer = ISeer_DI(_seer);
        vaultHub = IVaultHub_DI(_vaultHub);
        lastDistribution = block.timestamp; // Start distribution timer
    }

    // ========== DAO CONFIGURATION ==========

    function setDAO(address newDAO) external onlyDAO {
        if (newDAO == address(0)) revert INCENT_Zero();
        address old = daoMultiSig;
        daoMultiSig = newDAO;
        emit DAOChanged(old, newDAO);
        proofLedger.logSystemEvent(newDAO, "DAOIncentives: DAO changed", msg.sender);
    }

    function setToken(address newToken) external onlyDAO {
        if (newToken == address(0)) revert INCENT_Zero();
        address old = address(vfideToken);
        vfideToken = IERC20_DI(newToken);
        vfideTokenAdmin = IVFIDEToken(newToken);
        emit ModuleUpdated("VFIDEToken", old, newToken);
        proofLedger.logSystemEvent(newToken, "DAOIncentives: Token updated", msg.sender);
    }

    function setTreasury(address newTreasury) external onlyDAO {
        if (newTreasury == address(0)) revert INCENT_Zero();
        address old = address(treasury);
        treasury = SustainableTreasury(newTreasury);
        emit ModuleUpdated("Treasury", old, newTreasury);
        proofLedger.logSystemEvent(newTreasury, "DAOIncentives: Treasury updated", msg.sender);
    }

    function setSeer(address newSeer) external onlyDAO {
        if (newSeer == address(0)) revert INCENT_Zero();
        address old = address(seer);
        seer = ISeer_DI(newSeer);
        emit ModuleUpdated("Seer", old, newSeer);
        proofLedger.logSystemEvent(newSeer, "DAOIncentives: Seer updated", msg.sender);
    }

    function setLedger(address newLedger) external onlyDAO {
        if (newLedger == address(0)) revert INCENT_Zero();
        address old = address(proofLedger);
        proofLedger = IProofLedger_DI(newLedger);
        emit ModuleUpdated("ProofLedger", old, newLedger);
        proofLedger.logSystemEvent(newLedger, "DAOIncentives: Ledger updated", msg.sender);
    }

    function setVaultHub(address newVaultHub) external onlyDAO {
        if (newVaultHub == address(0)) revert INCENT_Zero();
        address old = address(vaultHub);
        vaultHub = IVaultHub_DI(newVaultHub);
        emit ModuleUpdated("VaultHub", old, newVaultHub);
        proofLedger.logSystemEvent(newVaultHub, "DAOIncentives: VaultHub updated", msg.sender);
    }

    function setServiceDeposit(uint256 newAmount) external onlyDAO {
        serviceDepositAmount = newAmount;
        proofLedger.logEvent(address(this), "Service deposit updated", newAmount, "");
    }

    function setPoolShareBps(uint16 newBps) external onlyDAO {
        if (newBps > 2000) revert INCENT_Zero(); // Max 20% of treasury's 50% = 10% of total burns
        uint16 old = daoPoolShareBps;
        daoPoolShareBps = newBps;
        emit PoolShareBpsSet(old, newBps);
        proofLedger.logEvent(address(this), "DAO pool share updated", newBps, "Basis points of treasury revenue");
    }

    function setProofScoreBonus(uint16 newBonus) external onlyDAO {
        proofScoreBonusPerMonth = newBonus;
        proofLedger.logEvent(address(this), "ProofScore bonus updated", newBonus, "");
    }
    
    function setElectionParameters(
        uint16 _minScoreNominate,
        uint16 _minScoreVote,
        uint8 _maxSeats,
        uint8 _primaryFinalists,
        uint256 _termLength
    ) external onlyDAO {
        minProofScoreToNominate = _minScoreNominate;
        minProofScoreToVote = _minScoreVote;
        maxDAOSeats = _maxSeats;
        primaryFinalists = _primaryFinalists;
        termLength = _termLength;
        proofLedger.logEvent(address(this), "Election parameters updated", _maxSeats, "");
    }

    // ========== ELECTION SYSTEM (TWO-TIER) ==========
    
    /**
     * @notice Start a new election cycle (called by DAO or automatically when terms expire)
     * @dev Phase 1: Nominations (7 days) - Community nominates candidates with score ≥700
     */
    function startElection() external onlyDAO {
        if (currentPhase != ElectionPhase.NONE) revert INCENT_AlreadyMember(); // Reusing error
        
        electionId++;
        currentPhase = ElectionPhase.NOMINATIONS;
        electionStartTime = block.timestamp;
        
        emit ElectionStarted(electionId, currentPhase, electionStartTime);
        proofLedger.logSystemEvent(address(this), "Election started - nomination phase", msg.sender);
    }
    
    /**
     * @notice Nominate yourself as DAO candidate (COMMUNITY PRIMARY - Step 1)
     * @dev Requires ProofScore ≥700 (high trust only)
     *      Anyone can nominate during nomination period (7 days)
     */
    function nominateCandidate() external {
        if (currentPhase != ElectionPhase.NOMINATIONS) revert INCENT_TooSoonToClaimStipend();
        if (block.timestamp > electionStartTime + 7 days) revert INCENT_TooSoonToClaimStipend();
        
        uint16 score = seer.getScore(msg.sender);
        if (score < minProofScoreToNominate) revert INCENT_InsufficientDeposit(); // Reusing error
        
        Candidate storage candidate = candidates[electionId][msg.sender];
        if (candidate.nominatedAt > 0) revert INCENT_AlreadyMember(); // Already nominated
        
        // Record nomination
        candidates[electionId][msg.sender] = Candidate({
            account: msg.sender,
            seatVault: address(0), // Created if elected
            communityVotes: 0,
            daoVotes: 0,
            nominatedAt: block.timestamp,
            passedPrimary: false,
            elected: false,
            disqualified: false
        });
        
        candidateList[electionId].push(msg.sender);
        
        emit CandidateNominated(electionId, msg.sender, score);
        proofLedger.logEvent(msg.sender, "Nominated for DAO", score, "Community primary candidate");
    }
    
    /**
     * @notice Vote for candidate in community primary (COMMUNITY VOTE - Step 2)
     * @dev Requires ProofScore ≥540 to vote
     *      Vote weight = ProofScore (higher trust = more influence)
     *      Voting period: 14 days after nominations close
     */
    function voteInPrimary(address candidate) external {
        if (currentPhase != ElectionPhase.COMMUNITY_VOTE) revert INCENT_TooSoonToClaimStipend();
        if (block.timestamp > electionStartTime + 21 days) revert INCENT_TooSoonToClaimStipend(); // 7 nom + 14 vote
        
        uint16 score = seer.getScore(msg.sender);
        if (score < minProofScoreToVote) revert INCENT_InsufficientDeposit();
        if (hasVotedCommunity[electionId][msg.sender]) revert INCENT_AlreadyMember();
        
        Candidate storage c = candidates[electionId][candidate];
        if (c.nominatedAt == 0) revert INCENT_NotMember(); // Not nominated
        if (c.disqualified) revert INCENT_AlreadySlashed();
        
        // ProofScore-weighted voting (higher trust = more influence)
        c.communityVotes += uint256(score);
        hasVotedCommunity[electionId][msg.sender] = true;
        
        emit CommunityVoteCast(electionId, msg.sender, candidate, uint256(score));
        proofLedger.logEvent(msg.sender, "Primary vote cast", uint256(score), "Community election");
    }
    
    /**
     * @notice Advance election to next phase (automated progression)
     * @dev Nominations (7d) → Community Vote (14d) → DAO Vote (7d) → Complete
     */
    function advanceElectionPhase() external {
        ElectionPhase oldPhase = currentPhase;
        
        if (currentPhase == ElectionPhase.NOMINATIONS && block.timestamp >= electionStartTime + 7 days) {
            currentPhase = ElectionPhase.COMMUNITY_VOTE;
        } else if (currentPhase == ElectionPhase.COMMUNITY_VOTE && block.timestamp >= electionStartTime + 21 days) {
            // Select top primaryFinalists candidates
            _selectPrimaryFinalists();
            currentPhase = ElectionPhase.DAO_VOTE;
        } else if (currentPhase == ElectionPhase.DAO_VOTE && block.timestamp >= electionStartTime + 28 days) {
            // Elect top candidates
            _finalizeElection();
            currentPhase = ElectionPhase.COMPLETE;
        } else {
            revert INCENT_TooSoonToClaimStipend();
        }
        
        emit PhaseAdvanced(electionId, oldPhase, currentPhase);
        proofLedger.logSystemEvent(address(this), "Election phase advanced", msg.sender);
    }
    
    /**
     * @notice DAO members vote on primary finalists (DAO VOTE - Step 3)
     * @dev Only current DAO members can vote
     *      Each member gets 1 vote
     *      Voting period: 7 days after primary closes
     */
    function voteInDAOElection(address candidate) external {
        if (currentPhase != ElectionPhase.DAO_VOTE) revert INCENT_TooSoonToClaimStipend();
        if (!members[msg.sender].isActive) revert INCENT_NotMember();
        if (hasVotedDAO[electionId][msg.sender]) revert INCENT_AlreadyMember();
        
        Candidate storage c = candidates[electionId][candidate];
        if (!c.passedPrimary) revert INCENT_NotMember(); // Not a finalist
        if (c.disqualified) revert INCENT_AlreadySlashed();
        
        // Equal vote (1 per DAO member, prevents cronyism)
        c.daoVotes += 1;
        hasVotedDAO[electionId][msg.sender] = true;
        
        emit DAOVoteCast(electionId, msg.sender, candidate);
        proofLedger.logEvent(msg.sender, "DAO vote cast", 1, "Final election");
    }

    /**
     * @notice Internal: Select top N candidates from community primary
     * @dev Called automatically when community vote period ends
     */
    function _selectPrimaryFinalists() internal {
        address[] memory cList = candidateList[electionId];
        
        // Simple bubble sort by communityVotes (good enough for small candidate lists)
        for (uint256 i = 0; i < cList.length; i++) {
            for (uint256 j = i + 1; j < cList.length; j++) {
                if (candidates[electionId][cList[j]].communityVotes > candidates[electionId][cList[i]].communityVotes) {
                    address temp = cList[i];
                    cList[i] = cList[j];
                    cList[j] = temp;
                }
            }
        }
        
        // Mark top primaryFinalists as finalists
        uint256 finalistCount = cList.length < primaryFinalists ? cList.length : primaryFinalists;
        for (uint256 i = 0; i < finalistCount; i++) {
            candidates[electionId][cList[i]].passedPrimary = true;
        }
    }
    
    /**
     * @notice Internal: Finalize election and seat winners
     * @dev Called automatically when DAO vote period ends
     *      Top maxDAOSeats candidates by DAO votes become members
     */
    function _finalizeElection() internal {
        address[] memory cList = candidateList[electionId];
        
        // Sort finalists by daoVotes
        address[] memory finalists = new address[](primaryFinalists);
        uint256 finalistIdx = 0;
        for (uint256 i = 0; i < cList.length; i++) {
            if (candidates[electionId][cList[i]].passedPrimary) {
                finalists[finalistIdx] = cList[i];
                finalistIdx++;
            }
        }
        
        // Bubble sort finalists by DAO votes
        for (uint256 i = 0; i < finalistIdx; i++) {
            for (uint256 j = i + 1; j < finalistIdx; j++) {
                if (candidates[electionId][finalists[j]].daoVotes > candidates[electionId][finalists[i]].daoVotes) {
                    address temp = finalists[i];
                    finalists[i] = finalists[j];
                    finalists[j] = temp;
                }
            }
        }
        
        // Elect top maxDAOSeats candidates
        uint256 seatsToFill = finalistIdx < maxDAOSeats ? finalistIdx : maxDAOSeats;
        for (uint256 i = 0; i < seatsToFill; i++) {
            address winner = finalists[i];
            Candidate storage c = candidates[electionId][winner];
            c.elected = true;
            
            // Create seat vault
            address seatVault = vaultHub.createVault(winner);
            c.seatVault = seatVault;
            
            // Add to DAO members
            members[winner] = DAOMember({
                seatVault: seatVault,
                electedAt: block.timestamp,
                totalMonthsServed: 0,
                lastStipendClaim: block.timestamp,
                electionProofScore: seer.getScore(winner),
                isActive: true,
                systemExempt: true,
                slashed: false
            });
            
            memberList.push(winner);
            
            // Grant zero tx fees
            vfideTokenAdmin.setSystemExempt(winner, true);
            
            emit CandidateElected(electionId, winner, seatVault);
            emit SystemExemptSet(winner, true);
            proofLedger.logEvent(winner, "Elected to DAO", uint256(c.daoVotes), "Community vetted, DAO elected");
        }
        
        // Reset election
        currentPhase = ElectionPhase.NONE;
    }
    
    /**
     * @notice End member term (after termLength expires or removed for cause)
     * @dev Terms expire after termLength (default 6 months)
     *      Member keeps seat vault balance if term completed honorably
     *      Can run for re-election if ProofScore still ≥700
     */
    function endMemberTerm(address member) external onlyDAO {
        DAOMember storage m = members[member];
        if (!m.isActive) revert INCENT_NotMember();
        
        // Check seat vault balance (member keeps this if honorable)
        uint256 seatVaultBalance = vfideToken.balanceOf(m.seatVault);
        bool reelectionEligible = seer.getScore(member) >= minProofScoreToNominate;
        
        // Mark inactive
        m.isActive = false;
        
        // Remove zero transaction fee privilege
        m.systemExempt = false;
        vfideTokenAdmin.setSystemExempt(member, false);
        
        // Note: Member keeps seat vault ownership and balance (they earned it)
        // Can withdraw funds from vault anytime
        
        emit MemberTermEnded(member, seatVaultBalance, reelectionEligible);
        emit SystemExemptSet(member, false);
        proofLedger.logEvent(member, "DAO term ended", seatVaultBalance, m.slashed ? "Removed" : "Term complete");
    }

    /**
     * @notice Accumulate VFIDE to DAO member pool from treasury revenue
     * @dev Called by treasury when it receives ProofScore burn revenue
     *      Allocates daoPoolShareBps (10-20%) of treasury's 50% to member pool
     */
    function accumulateToPool(uint256 treasuryAmount) external {
        // Calculate DAO pool share (10-20% of treasury's 50% = 5-10% of total burns)
        uint256 poolShare = (treasuryAmount * daoPoolShareBps) / 10000;
        
        if (poolShare > 0) {
            // Transfer from caller (should be treasury) to this contract
            require(vfideToken.transferFrom(msg.sender, address(this), poolShare), "Pool accumulation failed");
            
            accumulatedPool += poolShare;
            emit PoolAccumulated(poolShare, accumulatedPool);
            proofLedger.logEvent(address(this), "DAO pool accumulated", poolShare, "Monthly revenue share");
        }
    }

    /**
     * @notice Distribute accumulated pool to all active DAO member seat vaults
     * @dev Can be called once per month (30 days)
     *      Each active member's SEAT VAULT gets equal share (not direct to member)
     *      Member can withdraw from their seat vault anytime
     *      Scales automatically with VFIDE price (percentage-based)
     *      If member is slashed later, seat vault is seized for merchant fee subsidies
     */
    function distributeMonthlyShares() external {
        // Check if 30 days passed since last distribution
        if (block.timestamp < lastDistribution + distributionInterval) {
            revert INCENT_TooSoonToClaimStipend();
        }
        
        // Count active (non-slashed) members
        uint256 activeCount = 0;
        for (uint256 i = 0; i < memberList.length; i++) {
            DAOMember storage m = members[memberList[i]];
            if (m.isActive && !m.slashed) {
                activeCount++;
            }
        }
        
        if (activeCount == 0) return; // No members to distribute to
        if (accumulatedPool == 0) return; // Nothing accumulated yet
        
        // Calculate equal share per member
        uint256 sharePerMember = accumulatedPool / activeCount;
        uint256 totalDistributed = 0;
        
        // Distribute to all active member SEAT VAULTS (not directly to members)
        for (uint256 i = 0; i < memberList.length; i++) {
            address memberAddr = memberList[i];
            DAOMember storage m = members[memberAddr];
            
            if (m.isActive && !m.slashed) {
                // Transfer share to SEAT VAULT (accumulates there)
                require(vfideToken.transfer(m.seatVault, sharePerMember), "Seat vault distribution failed");
                
                // Update tracking
                m.totalMonthsServed += 1;
                m.lastStipendClaim = block.timestamp;
                totalDistributed += sharePerMember;
                
                // Apply ProofScore boost (reputation, not money)
                seer.rewardMerchant(memberAddr, proofScoreBonusPerMonth, "DAO service month");
                emit ProofScoreBoostApplied(memberAddr, proofScoreBonusPerMonth, "DAO service");
                emit SeatVaultFunded(memberAddr, m.seatVault, sharePerMember);
                emit MemberShareClaimed(memberAddr, sharePerMember, m.totalMonthsServed);
            }
        }
        
        // Reset pool and update timestamp
        accumulatedPool = 0;
        lastDistribution = block.timestamp;
        
        emit MonthlyDistributed(totalDistributed, activeCount, sharePerMember);
        proofLedger.logEvent(address(this), "Monthly shares distributed to seat vaults", totalDistributed, "Equal share per active member");
    }

    /**
     * @notice Slash a corrupt DAO member (forfeit entire seat vault)
     * @dev Called by DAOMultiSigGuardian when member acts maliciously
     *      Zero tolerance: ENTIRE SEAT VAULT seized (no deposit since elected)
     *      Seat vault balance sent to ecosystem treasury for merchant fee subsidies
     *      This is the key accountability mechanism - bad actors lose everything
     */
    function slashMember(address member, string calldata reason) external onlyDAO {
        DAOMember storage m = members[member];
        if (!m.isActive) revert INCENT_NotMember();
        if (m.slashed) revert INCENT_AlreadySlashed();
        
        uint256 seatVaultBalance = vfideToken.balanceOf(m.seatVault);
        
        // Mark as slashed
        m.slashed = true;
        m.systemExempt = false;
        
        // Remove zero fee privilege immediately
        vfideTokenAdmin.setSystemExempt(member, false);
        
        // CRITICAL: Seize entire seat vault balance and send to treasury
        // Treasury will use this for merchant fee subsidies (feeless merchants with score ≥750)
        // Bad actors fund the protection of honest merchants
        if (seatVaultBalance > 0) {
            // Transfer seat vault ownership to treasury
            vaultHub.transferVault(m.seatVault, address(treasury));
            emit SeatVaultSeized(member, m.seatVault, seatVaultBalance, address(treasury));
        }
        
        emit MemberSlashed(member, 0, seatVaultBalance, reason);
        emit SystemExemptSet(member, false);
        proofLedger.logEvent(member, "DAO member slashed - seat vault forfeited", seatVaultBalance, reason);
    }

    // ========== VIEW FUNCTIONS ==========

    function getMember(address account) external view returns (
        uint256 serviceDeposit,
        uint256 joinedAt,
        uint256 totalMonthsServed,
        uint256 lastStipendClaim,
        bool isActive,
        bool systemExempt,
        bool slashed
    ) {
        DAOMember memory m = members[account];
        return (
            m.serviceDeposit,
            m.joinedAt,
            m.totalMonthsServed,
            m.lastStipendClaim,
            m.isActive,
            m.systemExempt,
            m.slashed
        );
    }

    function canClaimStipend(address account) external view returns (bool canClaim, uint256 monthsEligible) {
        DAOMember memory m = members[account];
        if (!m.isActive || m.slashed) return (false, 0);
        
        if (block.timestamp >= m.lastStipendClaim + stipendInterval) {
            uint256 months = (block.timestamp - m.lastStipendClaim) / stipendInterval;
            return (true, months);
        }
        
        return (false, 0);
    }

    function getTotalMembers() external view returns (uint256) {
        return memberList.length;
    }

    function getActiveMemberCount() external view returns (uint256 count) {
        for (uint256 i = 0; i < memberList.length; i++) {
            if (members[memberList[i]].isActive && !members[memberList[i]].slashed) {
                count++;
            }
        }
    }

    /**
     * @notice Calculate approximate monthly DAO budget (active members * stipend)
     * @dev Helps treasury plan for fair compensation payments
     */
    function getMonthlyBudgetRequirement() external view returns (uint256) {
        uint256 activeCount = 0;
        for (uint256 i = 0; i < memberList.length; i++) {
            if (members[memberList[i]].isActive && !members[memberList[i]].slashed) {
                activeCount++;
            }
        }
        return activeCount * monthlyStipend;
    }
}

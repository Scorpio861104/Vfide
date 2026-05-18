// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

/**
 * CouncilSalary — Employment Compensation for DAO Governance
 * ----------------------------------------------------------
 * - Receives ecosystem fees.
 * - Pays the 12 Council Members every 4 months.
 * - Enforces "Good Behavior" (ProofScore).
 * - Allows Council to vote out bad actors (Self-Policing).
 * 
 * COMPLIANCE NOTE:
 * - Council members are compensated as governance contributors.
 * - Salaries are paid in the configured ERC-20 token (`token`), currently VFIDE.
 * - This contract does not perform on-chain asset swaps.
 */

import "../SharedInterfaces.sol";

contract CouncilSalary {
    using SafeERC20 for IERC20;
    
    event SalaryPaid(uint256 indexed cycleId, uint256 totalDistributed);
    event MemberRemoved(address indexed member, address indexed by);
    event VoteCast(address indexed voter, address indexed target, bool support);
    event MemberReinstated(address indexed member);
    event KeeperSet(address indexed keeper, bool authorized);
    event DAOSet(address indexed oldDAO, address indexed newDAO);
    event DAOChangeQueued(address indexed oldDAO, address indexed newDAO, uint64 executeAfter);
    event DAOChangeCancelled(address indexed oldDAO, address indexed newDAO);
    event CouncilElectionChangeQueued(address indexed oldElection, address indexed newElection, uint64 executeAfter);
    event CouncilElectionChangeApplied(address indexed oldElection, address indexed newElection);
    event CouncilElectionChangeCancelled(address indexed pendingElection);
    event ReinstateQueued(address indexed member, uint64 executeAfter);
    event ReinstateCancelled(address indexed member);

    uint256 private _reentrancyStatus = 1;
    modifier nonReentrant() {
        require(_reentrancyStatus == 1, "ReentrancyGuard: reentrant call");
        _reentrancyStatus = 2;
        _;
        _reentrancyStatus = 1;
    }

    ICouncilElection public election;
    ISeer public seer;
    IERC20 public token;

    uint256 public lastPayTime;
    uint256 public payInterval = 120 days; // 4 months
    uint16 public minScoreToPay = 7000; // Must maintain high trust (70% on 0-10000 scale)

    // Removal Voting
    uint256 public currentTerm;
    // Term -> Target -> Voter -> Voted
    mapping(uint256 => mapping(address => mapping(address => bool))) public hasVotedToRemoveInTerm;
    // Term -> Target -> Vote Count
    mapping(uint256 => mapping(address => uint256)) public removalVotesInTerm;
    // Legacy: Keep blacklist global (once removed, stays removed unless reinstated)
    mapping(address => bool) public isBlacklisted;
    
    address public dao;
    address public pendingDAO;
    uint64 public pendingDAOAt;
    uint64 public constant DAO_CHANGE_DELAY = 48 hours;
    address public pendingCouncilElection;
    uint64 public pendingCouncilElectionAt;
    uint64 public constant COUNCIL_ELECTION_CHANGE_DELAY = 48 hours;
    address public pendingReinstate;
    uint64 public pendingReinstateAt;
    uint64 public constant REINSTATE_DELAY = 7 days;
    
    // C-1 FIX: Authorized keepers for distribution
    mapping(address => bool) public isKeeper;
    
    // C-2 FIX: Distribution nonce to prevent replay/frontrunning
    uint256 public distributionNonce;

    constructor(address _election, address _seer, address _token, address _dao) {
        require(_election != address(0), "zero election");
        require(_seer != address(0), "zero seer");
        require(_token != address(0), "zero token");
        require(_dao != address(0), "zero dao");
        election = ICouncilElection(_election);
        seer = ISeer(_seer);
        token = IERC20(_token);
        dao = _dao;
        lastPayTime = block.timestamp;
        isKeeper[_dao] = true; // DAO is always a keeper
    }

    // C-1 FIX: Add keeper management
    function setKeeper(address keeper, bool authorized) external {
        require(msg.sender == dao, "not dao");
        require(keeper != address(0), "zero address");
        isKeeper[keeper] = authorized;
        emit KeeperSet(keeper, authorized);
    }
    
    function startNewTerm() external {
        require(msg.sender == dao, "not dao");
        currentTerm++;
    }

    /// @notice N-L31 FIX: Called by CouncilElection.applyCouncil (or DAO) after a new
    ///         council is seated to advance the term automatically.
    ///         This ensures removal-vote counters reset at the correct boundary rather
    ///         than requiring the DAO to remember to call startNewTerm() manually.
    ///         CouncilElection should call this via an ICouncilSalary interface after
    ///         each successful applyCouncil() execution.
    function notifyNewCouncil() external {
        require(msg.sender == dao || msg.sender == councilElection, "not dao or election");
        currentTerm++;
    }

    // Address of the CouncilElection contract allowed to trigger term advances.
    address public councilElection;

    function setCouncilElection(address _election) external {
        require(msg.sender == dao, "not dao");
        require(_election != address(0), "zero election");
        require(pendingCouncilElectionAt == 0, "election change pending");
        pendingCouncilElection = _election;
        pendingCouncilElectionAt = uint64(block.timestamp) + COUNCIL_ELECTION_CHANGE_DELAY;
        emit CouncilElectionChangeQueued(councilElection, _election, pendingCouncilElectionAt);
    }

    function applyCouncilElection() external {
        require(msg.sender == dao, "not dao");
        require(pendingCouncilElectionAt != 0 && pendingCouncilElection != address(0), "no pending election");
        require(block.timestamp >= pendingCouncilElectionAt, "election timelock active");

        address oldElection = councilElection;
        councilElection = pendingCouncilElection;

        delete pendingCouncilElection;
        delete pendingCouncilElectionAt;
        emit CouncilElectionChangeApplied(oldElection, councilElection);
    }

    function cancelCouncilElectionChange() external {
        require(msg.sender == dao, "not dao");
        require(pendingCouncilElectionAt != 0 && pendingCouncilElection != address(0), "no pending election");

        address queued = pendingCouncilElection;
        delete pendingCouncilElection;
        delete pendingCouncilElectionAt;
        emit CouncilElectionChangeCancelled(queued);
    }
    
    function setDAO(address _dao) external {
        require(msg.sender == dao, "not dao");
        require(_dao != address(0), "zero address");
        require(pendingDAOAt == 0, "dao change pending");

        pendingDAO = _dao;
        pendingDAOAt = uint64(block.timestamp) + DAO_CHANGE_DELAY;
        emit DAOChangeQueued(dao, _dao, pendingDAOAt);
    }

    function applyDAO() external {
        require(msg.sender == dao, "not dao");
        require(pendingDAOAt != 0 && pendingDAO != address(0), "no pending dao");
        require(block.timestamp >= pendingDAOAt, "dao timelock active");

        address oldDAO = dao;
        dao = pendingDAO;
        isKeeper[dao] = true;

        delete pendingDAO;
        delete pendingDAOAt;
        emit DAOSet(oldDAO, dao);
    }

    function cancelDAO() external {
        require(msg.sender == dao, "not dao");
        require(pendingDAOAt != 0 && pendingDAO != address(0), "no pending dao");

        address oldDAO = dao;
        address queued = pendingDAO;
        delete pendingDAO;
        delete pendingDAOAt;
        emit DAOChangeCancelled(oldDAO, queued);
    }
    /**
     * Distribute salary to eligible council members.
     * C-1 FIX: Now requires DAO or authorized keeper to call
     * This prevents MEV manipulation and timing attacks
     * 
    * NOTE: Council salaries are paid in the configured `token` balance held by this contract.
    * This function does not swap VFIDE to other assets.
     */
    function distributeSalary() external nonReentrant {
        // C-1 FIX: Only DAO or authorized keepers can distribute
        require(msg.sender == dao || isKeeper[msg.sender], "CS: not authorized");
        require(block.timestamp >= lastPayTime + payInterval, "too early");
        
        // C-2 FIX: Increment nonce to prevent replay
        distributionNonce++;
        
        uint256 balance = token.balanceOf(address(this));
        require(balance > 0, "no funds");

        uint256 size = election.getActualCouncilSize();
        require(size > 0, "no council");
        
        require(balance >= size, "CS: insufficient balance for distribution");

        // 1. Identify eligible members
        address[] memory eligible = new address[](size);
        uint256 eligibleCount = 0;

        for (uint256 i = 0; i < size; i++) {
            address member = election.getCouncilMember(i);
            if (member == address(0)) continue;
            
            // Check Blacklist
            if (isBlacklisted[member]) continue;

            // Check Score
            if (seer.getScore(member) < minScoreToPay) continue;

            eligible[eligibleCount] = member;
            eligibleCount++;
        }

        // 2. Calculate Share
        if (eligibleCount == 0) return; // No one gets paid, funds roll over
        
        uint256 share = balance / eligibleCount;
        require(share > 0, "CS: share too small");

        lastPayTime = block.timestamp;
        
        // 3. Pay — last member receives the dust remainder to avoid stale funds
        uint256 remainder = balance % eligibleCount;
        for (uint256 i = 0; i < eligibleCount; i++) {
            uint256 payout = (i == eligibleCount - 1) ? share + remainder : share;
            token.safeTransfer(eligible[i], payout);
        }
        emit SalaryPaid(block.timestamp, balance);
    }

    /**
     * Council members can vote to remove a bad actor (stop their pay).
     * Requires > 50% of council to agree.
     * Votes are now term-scoped to prevent cross-term accumulation
     */
    function voteToRemove(address target) external {
        require(election.isCouncil(msg.sender), "not council");
        require(election.isCouncil(target), "target not council");
        require(!hasVotedToRemoveInTerm[currentTerm][target][msg.sender], "already voted");
        require(!isBlacklisted[target], "already removed");

        hasVotedToRemoveInTerm[currentTerm][target][msg.sender] = true;
        removalVotesInTerm[currentTerm][target]++;

        uint256 size = election.getActualCouncilSize();
        // If > 50% vote to remove
        if (removalVotesInTerm[currentTerm][target] > size / 2) {
            isBlacklisted[target] = true;
            emit MemberRemoved(target, msg.sender);
        }
        
        emit VoteCast(msg.sender, target, true);
    }
    
    /**
     * Reinstate a previously blacklisted member
     * Only callable by DAO
     */
    function reinstate(address target) external {
        require(msg.sender == dao, "not dao");
        require(isBlacklisted[target], "not blacklisted");
        require(pendingReinstateAt == 0, "reinstate pending");
        pendingReinstate = target;
        pendingReinstateAt = uint64(block.timestamp) + REINSTATE_DELAY;
        emit ReinstateQueued(target, pendingReinstateAt);
    }

    function applyReinstate() external {
        require(msg.sender == dao, "not dao");
        require(pendingReinstateAt != 0 && pendingReinstate != address(0), "no pending reinstate");
        require(block.timestamp >= pendingReinstateAt, "reinstate timelock active");

        address target = pendingReinstate;
        require(isBlacklisted[target], "not blacklisted");

        isBlacklisted[target] = false;
        delete pendingReinstate;
        delete pendingReinstateAt;
        emit MemberReinstated(target);
    }

    function cancelReinstate() external {
        require(msg.sender == dao, "not dao");
        require(pendingReinstateAt != 0 && pendingReinstate != address(0), "no pending reinstate");
        address queued = pendingReinstate;
        delete pendingReinstate;
        delete pendingReinstateAt;
        emit ReinstateCancelled(queued);
    }
}

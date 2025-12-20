// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

/**
 * CouncilSalary — Incentives for DAO Governance
 * ---------------------------------------------
 * - Receives ecosystem fees.
 * - Pays the 12 Council Members every 4 months.
 * - Enforces "Good Behavior" (ProofScore).
 * - Allows Council to vote out bad actors (Self-Policing).
 */

import "./SharedInterfaces.sol";

contract CouncilSalary {
    using SafeERC20 for IERC20;
    
    event SalaryPaid(uint256 indexed cycleId, uint256 totalDistributed);
    event MemberRemoved(address indexed member, address indexed by);
    event VoteCast(address indexed voter, address indexed target, bool support);

    ICouncilElection public election;
    ISeer public seer;
    IERC20 public token;

    uint256 public lastPayTime;
    uint256 public payInterval = 120 days; // 4 months
    uint16 public minScoreToPay = 7000; // Must maintain high trust (70% on 0-10000 scale)

    // Removal Voting
    // H-3 Fix: Track votes per term to prevent cross-term vote accumulation
    uint256 public currentTerm;
    // Term -> Target -> Voter -> Voted
    mapping(uint256 => mapping(address => mapping(address => bool))) public hasVotedToRemoveInTerm;
    // Term -> Target -> Vote Count
    mapping(uint256 => mapping(address => uint256)) public removalVotesInTerm;
    // Legacy: Keep blacklist global (once removed, stays removed unless reinstated)
    mapping(address => bool) public isBlacklisted;
    
    // H-3 Fix: DAO address for term management
    address public dao;

    constructor(address _election, address _seer, address _token, address _dao) {
        election = ICouncilElection(_election);
        seer = ISeer(_seer);
        token = IERC20(_token);
        dao = _dao;
        lastPayTime = block.timestamp;
    }
    
    // H-3 Fix: Allow DAO to start new term (resets removal votes)
    function startNewTerm() external {
        require(msg.sender == dao, "not dao");
        currentTerm++;
    }
    
    // H-3 Fix: Allow DAO to set dao address
    function setDAO(address _dao) external {
        require(msg.sender == dao, "not dao");
        require(_dao != address(0), "zero address");
        dao = _dao;
    }

    /**
     * Distribute salary to eligible council members.
     * Can be called by anyone after the interval passes.
     */
    function distributeSalary() external {
        require(block.timestamp >= lastPayTime + payInterval, "too early");
        
        uint256 balance = token.balanceOf(address(this));
        require(balance > 0, "no funds");

        uint256 size = election.getActualCouncilSize();
        require(size > 0, "no council");
        
        // H-12 Fix: Verify sufficient balance before calculating shares
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
        
        // M-12 Fix: Ensure share is reasonable (at least 1 token per member)
        uint256 share = balance / eligibleCount;
        require(share > 0, "CS: share too small");
        
        // 3. Pay
        for (uint256 i = 0; i < eligibleCount; i++) {
            token.safeTransfer(eligible[i], share);
        }

        lastPayTime = block.timestamp;
        emit SalaryPaid(block.timestamp, balance);
    }

    /**
     * Council members can vote to remove a bad actor (stop their pay).
     * Requires > 50% of council to agree.
     * H-3 Fix: Votes are now term-scoped to prevent cross-term accumulation
     */
    function voteToRemove(address target) external {
        require(election.isCouncil(msg.sender), "not council");
        require(election.isCouncil(target), "target not council");
        // H-3 Fix: Check vote in current term
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
     * Reset blacklist status (e.g. if re-elected or forgiven by DAO)
     * Only callable by DAO/Admin (owner logic omitted for brevity, assuming DAO controls this)
     */
    // function reinstate(address target) external onlyDAO ...
}

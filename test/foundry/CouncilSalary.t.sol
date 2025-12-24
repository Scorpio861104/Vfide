// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import "forge-std/Test.sol";
import "../../contracts/CouncilSalary.sol";
import "../../contracts/mocks/SeerMock.sol";

// Mock ERC20 token
contract MockToken {
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;
    
    function mint(address to, uint256 amount) external {
        balanceOf[to] += amount;
    }
    
    function transfer(address to, uint256 amount) external returns (bool) {
        require(balanceOf[msg.sender] >= amount, "insufficient");
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        return true;
    }
    
    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        require(balanceOf[from] >= amount, "insufficient");
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        return true;
    }
}

// Mock Council Election
contract MockCouncilElection {
    address[] public councilMembers;
    mapping(address => bool) public isCouncil;
    
    function addMember(address member) external {
        councilMembers.push(member);
        isCouncil[member] = true;
    }
    
    function getActualCouncilSize() external view returns (uint256) {
        return councilMembers.length;
    }
    
    function getCouncilMember(uint256 index) external view returns (address) {
        if (index >= councilMembers.length) return address(0);
        return councilMembers[index];
    }
}

contract CouncilSalaryTest is Test {
    CouncilSalary public salary;
    MockCouncilElection public election;
    SeerMock public seer;
    MockToken public token;
    
    address public dao = address(0x1111);
    address public member1 = address(0x2222);
    address public member2 = address(0x3333);
    address public member3 = address(0x4444);
    address public badActor = address(0x5555);
    
    uint256 constant SALARY_POOL = 10_000 ether;
    
    function setUp() public {
        // Deploy mocks
        election = new MockCouncilElection();
        seer = new SeerMock();
        token = new MockToken();
        
        // Deploy CouncilSalary
        salary = new CouncilSalary(
            address(election),
            address(seer),
            address(token),
            dao
        );
        
        // Add council members
        election.addMember(member1);
        election.addMember(member2);
        election.addMember(member3);
        election.addMember(badActor);
        
        // Set high trust scores for all (70%+ required)
        seer.setScore(member1, 8000);
        seer.setScore(member2, 8000);
        seer.setScore(member3, 8000);
        seer.setScore(badActor, 8000);
        
        // Fund the salary contract
        token.mint(address(salary), SALARY_POOL);
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    //                              DEPLOYMENT TESTS
    // ═══════════════════════════════════════════════════════════════════════
    
    function test_Deployment() public view {
        assertEq(address(salary.election()), address(election));
        assertEq(address(salary.seer()), address(seer));
        assertEq(address(salary.token()), address(token));
        assertEq(salary.dao(), dao);
    }
    
    function test_DefaultSettings() public view {
        assertEq(salary.payInterval(), 120 days);
        assertEq(salary.minScoreToPay(), 7000);
        assertEq(salary.currentTerm(), 0);
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    //                              SALARY DISTRIBUTION TESTS
    // ═══════════════════════════════════════════════════════════════════════
    
    function test_DistributeSalary() public {
        // Warp to after pay interval
        vm.warp(block.timestamp + 120 days + 1);
        
        uint256 expectedShare = SALARY_POOL / 4; // 4 members
        
        salary.distributeSalary();
        
        assertEq(token.balanceOf(member1), expectedShare);
        assertEq(token.balanceOf(member2), expectedShare);
        assertEq(token.balanceOf(member3), expectedShare);
        assertEq(token.balanceOf(badActor), expectedShare);
    }
    
    function test_DistributeSalary_TooEarlyReverts() public {
        vm.expectRevert("too early");
        salary.distributeSalary();
    }
    
    function test_DistributeSalary_LowScoreExcluded() public {
        // Set badActor score below threshold
        seer.setScore(badActor, 5000); // Below 7000 min
        
        vm.warp(block.timestamp + 120 days + 1);
        
        uint256 expectedShare = SALARY_POOL / 3; // 3 eligible members
        
        salary.distributeSalary();
        
        assertEq(token.balanceOf(member1), expectedShare);
        assertEq(token.balanceOf(member2), expectedShare);
        assertEq(token.balanceOf(member3), expectedShare);
        assertEq(token.balanceOf(badActor), 0); // Excluded due to low score
    }
    
    function test_DistributeSalary_BlacklistedExcluded() public {
        // Blacklist badActor through voting
        vm.prank(member1);
        salary.voteToRemove(badActor);
        
        vm.prank(member2);
        salary.voteToRemove(badActor);
        
        vm.prank(member3);
        salary.voteToRemove(badActor);
        
        // badActor should now be blacklisted (3/4 > 50%)
        assertTrue(salary.isBlacklisted(badActor));
        
        vm.warp(block.timestamp + 120 days + 1);
        
        uint256 expectedShare = SALARY_POOL / 3; // 3 eligible members
        
        salary.distributeSalary();
        
        assertEq(token.balanceOf(badActor), 0);
    }
    
    function test_DistributeSalary_NoFundsReverts() public {
        // Deploy new salary contract without funding
        CouncilSalary unfunded = new CouncilSalary(
            address(election),
            address(seer),
            address(token),
            dao
        );
        
        vm.warp(block.timestamp + 120 days + 1);
        
        vm.expectRevert("no funds");
        unfunded.distributeSalary();
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    //                              VOTE TO REMOVE TESTS
    // ═══════════════════════════════════════════════════════════════════════
    
    function test_VoteToRemove_SingleVote() public {
        vm.prank(member1);
        salary.voteToRemove(badActor);
        
        assertTrue(salary.hasVotedToRemoveInTerm(0, badActor, member1));
        assertEq(salary.removalVotesInTerm(0, badActor), 1);
        assertFalse(salary.isBlacklisted(badActor)); // Not yet > 50%
    }
    
    function test_VoteToRemove_MajorityRemoves() public {
        // Need > 2 votes out of 4 to remove (more than 50%)
        vm.prank(member1);
        salary.voteToRemove(badActor);
        
        vm.prank(member2);
        salary.voteToRemove(badActor);
        
        assertFalse(salary.isBlacklisted(badActor)); // 2/4 = 50%, not more
        
        vm.prank(member3);
        salary.voteToRemove(badActor);
        
        assertTrue(salary.isBlacklisted(badActor)); // 3/4 > 50%
    }
    
    function test_VoteToRemove_NotCouncilReverts() public {
        address nonMember = address(0xBEEF);
        
        vm.prank(nonMember);
        vm.expectRevert("not council");
        salary.voteToRemove(badActor);
    }
    
    function test_VoteToRemove_TargetNotCouncilReverts() public {
        address nonMember = address(0xBEEF);
        
        vm.prank(member1);
        vm.expectRevert("target not council");
        salary.voteToRemove(nonMember);
    }
    
    function test_VoteToRemove_DoubleVoteReverts() public {
        vm.prank(member1);
        salary.voteToRemove(badActor);
        
        vm.prank(member1);
        vm.expectRevert("already voted");
        salary.voteToRemove(badActor);
    }
    
    function test_VoteToRemove_AlreadyBlacklistedReverts() public {
        // First blacklist them
        vm.prank(member1);
        salary.voteToRemove(badActor);
        vm.prank(member2);
        salary.voteToRemove(badActor);
        vm.prank(member3);
        salary.voteToRemove(badActor);
        
        assertTrue(salary.isBlacklisted(badActor));
        
        // badActor tries to vote against someone else - they can still vote
        // but if someone tries to vote against badActor again, it fails
        // Use a new term so the voters can vote again
        vm.prank(dao);
        salary.startNewTerm();
        
        // Now try to vote in new term - should fail because target already removed
        vm.prank(member1);
        vm.expectRevert("already removed");
        salary.voteToRemove(badActor);
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    //                              TERM MANAGEMENT TESTS
    // ═══════════════════════════════════════════════════════════════════════
    
    function test_StartNewTerm() public {
        assertEq(salary.currentTerm(), 0);
        
        vm.prank(dao);
        salary.startNewTerm();
        
        assertEq(salary.currentTerm(), 1);
    }
    
    function test_StartNewTerm_NotDAOReverts() public {
        vm.prank(member1);
        vm.expectRevert("not dao");
        salary.startNewTerm();
    }
    
    function test_StartNewTerm_ResetsVotes() public {
        // Vote in term 0
        vm.prank(member1);
        salary.voteToRemove(badActor);
        
        assertEq(salary.removalVotesInTerm(0, badActor), 1);
        
        // Start new term
        vm.prank(dao);
        salary.startNewTerm();
        
        // Term 1 votes should be 0
        assertEq(salary.removalVotesInTerm(1, badActor), 0);
        
        // Can vote again in new term
        vm.prank(member1);
        salary.voteToRemove(badActor);
        
        assertEq(salary.removalVotesInTerm(1, badActor), 1);
    }
    
    function test_SetDAO() public {
        address newDAO = address(0x9999);
        
        vm.prank(dao);
        salary.setDAO(newDAO);
        
        assertEq(salary.dao(), newDAO);
    }
    
    function test_SetDAO_NotDAOReverts() public {
        vm.prank(member1);
        vm.expectRevert("not dao");
        salary.setDAO(address(0x9999));
    }
    
    function test_SetDAO_ZeroAddressReverts() public {
        vm.prank(dao);
        vm.expectRevert("zero address");
        salary.setDAO(address(0));
    }
}

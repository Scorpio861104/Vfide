// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import "forge-std/Test.sol";
import "../../contracts-prod/CouncilElection.sol";
import "../../contracts-prod/mocks/SeerMock.sol";
import "../../contracts-prod/mocks/VaultHubMock.sol";
import "../../contracts-prod/mocks/LedgerMock.sol";

contract CouncilElectionTest is Test {
    CouncilElection public election;
    SeerMock public seer;
    VaultHubMock public vaultHub;
    LedgerMock public ledger;
    
    address constant DAO = address(0x1);
    address constant USER1 = address(0x2);
    address constant USER2 = address(0x3);
    
    function setUp() public {
        seer = new SeerMock();
        vaultHub = new VaultHubMock();
        ledger = new LedgerMock();
        
        seer.setMinForGovernance(100);
        
        election = new CouncilElection(DAO, address(seer), address(vaultHub), address(ledger));
    }
    
    /// @notice Fuzz test: Only eligible users can register
    function testFuzz_OnlyEligibleCanRegister(uint16 score) public {
        seer.setScore(USER1, score);
        vaultHub.ensureVault(USER1); // User needs a vault to be eligible
        
        uint16 minScore = election.minCouncilScore();
        
        vm.prank(USER1);
        if (score < minScore) {
            vm.expectRevert(CE_NotEligible.selector);
        }
        
        election.register();
    }
    
    /// @notice Fuzz test: Council size limits are enforced
    function testFuzz_CouncilSizeLimits(uint8 size) public {
        vm.assume(size > 0 && size <= 50);
        
        vm.prank(DAO);
        election.setParams(size, 100, 180 days, 14 days);
        
        assertEq(election.councilSize(), size, "Council size not set");
        
        // Try to set council with more members than size
        address[] memory tooMany = new address[](size + 1);
        for (uint256 i = 0; i < size + 1; i++) {
            tooMany[i] = address(uint160(100 + i));
            seer.setScore(tooMany[i], 150);
        }
        
        vm.prank(DAO);
        vm.expectRevert(CE_ArrayMismatch.selector);
        election.setCouncil(tooMany);
    }
    
    /// @notice Fuzz test: Min score requirement is enforced
    function testFuzz_MinScoreEnforced(uint16 minScore, uint16 userScore) public {
        vm.assume(minScore > 0 && minScore < 1000);
        vm.assume(userScore < 1000);
        
        vm.prank(DAO);
        election.setParams(12, minScore, 180 days, 14 days);
        
        seer.setScore(USER1, userScore);
        vaultHub.ensureVault(USER1); // User needs a vault to be eligible
        
        vm.prank(USER1);
        
        if (userScore < minScore) {
            vm.expectRevert(CE_NotEligible.selector);
        }
        
        election.register();
    }
    
    /// @notice Fuzz test: Term duration is set correctly
    function testFuzz_TermDuration(uint64 termSeconds) public {
        vm.assume(termSeconds > 0 && termSeconds < 365 days * 2);
        
        vm.prank(DAO);
        election.setParams(12, 100, termSeconds, 14 days);
        
        // Setup eligible members
        address[] memory members = new address[](1);
        members[0] = USER1;
        seer.setScore(USER1, 150);
        vaultHub.ensureVault(USER1);
        
        vm.prank(DAO);
        election.setCouncil(members);
        
        uint64 termEnd = election.termEnd();
        assertEq(termEnd, uint64(block.timestamp) + termSeconds, "Term end incorrect");
    }
    
    /// @notice Fuzz test: Candidates can unregister
    function testFuzz_CandidateUnregister(uint16 score) public {
        vm.assume(score >= 100);
        
        seer.setScore(USER1, score);
        vaultHub.ensureVault(USER1);
        
        vm.startPrank(USER1);
        election.register();
        assertTrue(election.isCandidate(USER1), "Not registered");
        
        election.unregister();
        assertFalse(election.isCandidate(USER1), "Still registered");
        
        vm.stopPrank();
    }
    
    /// @notice Fuzz test: Council members are set correctly
    function testFuzz_CouncilMembersSet(uint8 numMembers) public {
        vm.assume(numMembers > 0 && numMembers <= 12);
        
        address[] memory members = new address[](numMembers);
        for (uint256 i = 0; i < numMembers; i++) {
            members[i] = address(uint160(100 + i));
            seer.setScore(members[i], 150);
            vaultHub.ensureVault(members[i]);
        }
        
        vm.prank(DAO);
        election.setCouncil(members);
        
        // Verify all are council members
        for (uint256 i = 0; i < numMembers; i++) {
            assertTrue(election.isCouncil(members[i]), "Not in council");
        }
    }
    
    /// @notice Fuzz test: Refresh removes ineligible members
    function testFuzz_RefreshRemovesIneligible(uint16 newScore) public {
        vm.assume(newScore < 100); // Below threshold
        
        // Add member with good score
        seer.setScore(USER1, 150);
        vaultHub.ensureVault(USER1);
        
        address[] memory members = new address[](1);
        members[0] = USER1;
        
        vm.prank(DAO);
        election.setCouncil(members);
        
        assertTrue(election.isCouncil(USER1), "Not in council");
        
        // Drop score below threshold
        seer.setScore(USER1, newScore);
        
        // Refresh should remove
        vm.prank(DAO);
        election.refreshCouncil(members);
        
        assertFalse(election.isCouncil(USER1), "Still in council after refresh");
    }
    
    /// @notice Fuzz test: Only DAO can set council
    function testFuzz_OnlyDAOCanSetCouncil(address caller) public {
        vm.assume(caller != DAO);
        
        address[] memory members = new address[](1);
        members[0] = USER1;
        seer.setScore(USER1, 150);
        
        vm.prank(caller);
        vm.expectRevert(CE_NotDAO.selector);
        election.setCouncil(members);
    }
    
    /// @notice Fuzz test: Cannot set empty council
    function testFuzz_CannotSetEmptyCouncil() public {
        address[] memory empty = new address[](0);
        
        vm.prank(DAO);
        vm.expectRevert(CE_ArrayMismatch.selector);
        election.setCouncil(empty);
    }
    
    /// @notice Fuzz test: Multiple candidates can register
    function testFuzz_MultipleCandidates(uint8 numCandidates) public {
        vm.assume(numCandidates > 0 && numCandidates <= 50);
        
        for (uint256 i = 0; i < numCandidates; i++) {
            address candidate = address(uint160(100 + i));
            seer.setScore(candidate, 150);
            vaultHub.ensureVault(candidate);
            
            vm.prank(candidate);
            election.register();
            
            assertTrue(election.isCandidate(candidate), "Not registered");
        }
    }
    
    /// @notice Fuzz test: Refresh interval parameter
    function testFuzz_RefreshInterval(uint64 refreshInterval) public {
        vm.assume(refreshInterval > 0 && refreshInterval < 365 days);
        
        vm.prank(DAO);
        election.setParams(12, 100, 180 days, refreshInterval);
        
        assertEq(election.refreshInterval(), refreshInterval, "Refresh interval not set");
    }
}

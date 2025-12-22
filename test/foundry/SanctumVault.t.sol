// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import "forge-std/Test.sol";
import {SanctumVault, SANCT_NotDAO, SANCT_Zero, SANCT_NotApproved, SANCT_AlreadyApproved} from "../../contracts/SanctumVault.sol";
import {VFIDEToken} from "../../contracts/VFIDEToken.sol";

/**
 * Comprehensive test suite for SanctumVault contract
 * Coverage: charity management, disbursements, approvals, DAO controls
 * Target: 50+ tests for 0→100% coverage
 */
contract SanctumVaultTest is Test {
    SanctumVault public vault;
    VFIDEToken public token;
    
    // Mock contracts
    MockProofLedger public ledger;
    MockStablecoin public stablecoin;
    
    // Test addresses
    address public dao = address(0x100);
    address public charity1 = address(0x201);
    address public charity2 = address(0x202);
    address public charity3 = address(0x203);
    address public approver1 = address(0x301);
    address public approver2 = address(0x302);
    address public donor = address(0x400);
    
    uint256 constant INITIAL_SUPPLY = 1_000_000_000 ether;
    uint256 constant DEPOSIT_AMOUNT = 10000 ether;
    uint256 constant DISBURSEMENT_AMOUNT = 1000 ether;
    
    event CharityApproved(address indexed charity, string name, string category);
    event CharityRemoved(address indexed charity, string reason);
    event DisbursementProposed(uint256 indexed proposalId, address indexed charity, address token, uint256 amount, string campaign);
    event DisbursementApproved(uint256 indexed proposalId, address indexed approver);
    event DisbursementExecuted(uint256 indexed proposalId, address indexed charity, address token, uint256 amount);
    event Deposit(address indexed from, address indexed token, uint256 amount, string note);
    
    function setUp() public {
        // Deploy VFIDEToken with proper mock contracts
        MockDevVault devVault = new MockDevVault();
        MockPresale presale = new MockPresale();
        // constructor(devReserveVestingVault, _presaleContract, treasury, _vaultHub, _ledger, _treasurySink)
        token = new VFIDEToken(address(devVault), address(presale), address(this), address(0), address(0), address(0));
        token.setVaultOnly(false);
        
        // Transfer tokens from devVault to test contract
        vm.prank(address(devVault));
        require(token.transfer(address(this), 100_000 ether), "transfer failed");
        // Transfer tokens from devVault to test contract
        vm.prank(address(devVault));
        require(token.transfer(address(this), 100_000 ether), "transfer failed");
        
        // Deploy mock contracts
        ledger = new MockProofLedger();
        stablecoin = new MockStablecoin();
        
        // Deploy SanctumVault
        vm.prank(dao);
        vault = new SanctumVault(dao, address(ledger), address(0));
        
        // Fund donor and approve vault
        require(token.transfer(donor, DEPOSIT_AMOUNT * 10), "transfer failed");
        stablecoin.mint(donor, DEPOSIT_AMOUNT * 10);
        
        vm.startPrank(donor);
        token.approve(address(vault), type(uint256).max);
        stablecoin.approve(address(vault), type(uint256).max);
        vm.stopPrank();
        
        // Setup additional approvers
        vm.startPrank(dao);
        vault.addApprover(approver1);
        vault.addApprover(approver2);
        vault.setApprovalsRequired(2);
        vm.stopPrank();
    }
    
    // ============================================
    // DEPLOYMENT & INITIALIZATION TESTS
    // ============================================
    
    function test_Deployment() public view {
        assertEq(vault.dao(), dao);
        assertEq(address(vault.ledger()), address(ledger));
        assertEq(vault.approvalsRequired(), 2);
        assertTrue(vault.isApprover(dao));
    }
    
    function test_InitialApprovers() public view {
        assertEq(vault.getApproverCount(), 3); // dao + 2 added
        assertTrue(vault.isApprover(dao));
        assertTrue(vault.isApprover(approver1));
        assertTrue(vault.isApprover(approver2));
    }
    
    function test_RevertDeploymentWithZeroDAO() public {
        vm.expectRevert(bytes("zero dao"));
        new SanctumVault(address(0), address(ledger), address(0));
    }
    
    // ============================================
    // DAO CONTROL TESTS
    // ============================================
    
    function test_SetDAO() public {
        address newDAO = address(0x500);
        
        vm.prank(dao);
        vault.setDAO(newDAO);
        
        assertEq(vault.dao(), newDAO);
    }
    
    function test_RevertSetDAOFromNonDAO() public {
        vm.prank(donor);
        vm.expectRevert(SANCT_NotDAO.selector);
        vault.setDAO(address(0x500));
    }
    
    function test_RevertSetDAOToZero() public {
        vm.prank(dao);
        vm.expectRevert(SANCT_Zero.selector);
        vault.setDAO(address(0));
    }
    
    function test_SetLedger() public {
        MockProofLedger newLedger = new MockProofLedger();
        
        vm.prank(dao);
        vault.setLedger(address(newLedger));
        
        assertEq(address(vault.ledger()), address(newLedger));
    }
    
    function test_SetApprovalsRequired() public {
        vm.prank(dao);
        vault.setApprovalsRequired(3);
        
        assertEq(vault.approvalsRequired(), 3);
    }
    
    function test_RevertSetApprovalsRequiredTooHigh() public {
        vm.prank(dao);
        vm.expectRevert(bytes("bad threshold"));
        vault.setApprovalsRequired(10); // More than approvers
    }
    
    function test_RevertSetApprovalsRequiredZero() public {
        vm.prank(dao);
        vm.expectRevert(bytes("bad threshold"));
        vault.setApprovalsRequired(0);
    }
    
    // ============================================
    // APPROVER MANAGEMENT TESTS
    // ============================================
    
    function test_AddApprover() public {
        address newApprover = address(0x600);
        
        vm.prank(dao);
        vault.addApprover(newApprover);
        
        assertTrue(vault.isApprover(newApprover));
        assertEq(vault.getApproverCount(), 4);
    }
    
    function test_RevertAddApproverZeroAddress() public {
        vm.prank(dao);
        vm.expectRevert(bytes("zero"));
        vault.addApprover(address(0));
    }
    
    function test_RevertAddApproverAlreadyApprover() public {
        vm.prank(dao);
        vm.expectRevert(bytes("already approver"));
        vault.addApprover(approver1);
    }
    
    function test_RemoveApprover() public {
        vm.prank(dao);
        vault.removeApprover(approver1);
        
        assertFalse(vault.isApprover(approver1));
        assertEq(vault.getApproverCount(), 2);
    }
    
    function test_RevertRemoveApproverNotApprover() public {
        vm.prank(dao);
        vm.expectRevert(bytes("not approver"));
        vault.removeApprover(donor);
    }
    
    // ============================================
    // CHARITY MANAGEMENT TESTS
    // ============================================
    
    function test_ApproveCharity() public {
        vm.prank(dao);
        vm.expectEmit(true, false, false, true);
        emit CharityApproved(charity1, "Red Cross", "health");
        vault.approveCharity(charity1, "Red Cross", "health");
        
        (bool approved, string memory name, string memory category,) = vault.charities(charity1);
        assertTrue(approved);
        assertEq(name, "Red Cross");
        assertEq(category, "health");
        assertEq(vault.getCharityCount(), 1);
    }
    
    function test_ApproveMultipleCharities() public {
        vm.startPrank(dao);
        vault.approveCharity(charity1, "Red Cross", "health");
        vault.approveCharity(charity2, "WWF", "environment");
        vault.approveCharity(charity3, "UNICEF", "education");
        vm.stopPrank();
        
        assertEq(vault.getCharityCount(), 3);
    }
    
    function test_RevertApproveCharityZeroAddress() public {
        vm.prank(dao);
        vm.expectRevert(bytes("zero"));
        vault.approveCharity(address(0), "Invalid", "none");
    }
    
    function test_RevertApproveCharityAlreadyApproved() public {
        vm.startPrank(dao);
        vault.approveCharity(charity1, "Red Cross", "health");
        
        vm.expectRevert(bytes("already approved"));
        vault.approveCharity(charity1, "Red Cross Again", "health");
        vm.stopPrank();
    }
    
    function test_RevertApproveCharityFromNonDAO() public {
        vm.prank(donor);
        vm.expectRevert(SANCT_NotDAO.selector);
        vault.approveCharity(charity1, "Red Cross", "health");
    }
    
    function test_RemoveCharity() public {
        vm.startPrank(dao);
        vault.approveCharity(charity1, "Red Cross", "health");
        
        vm.expectEmit(true, false, false, true);
        emit CharityRemoved(charity1, "policy violation");
        vault.removeCharity(charity1, "policy violation");
        vm.stopPrank();
        
        (bool approved,,,) = vault.charities(charity1);
        assertFalse(approved);
    }
    
    function test_RevertRemoveCharityNotApproved() public {
        vm.prank(dao);
        vm.expectRevert(bytes("not approved"));
        vault.removeCharity(charity1, "not approved");
    }
    
    // ============================================
    // DEPOSIT TESTS
    // ============================================
    
    function test_DepositVFIDE() public {
        vm.prank(donor);
        vm.expectEmit(true, true, false, true);
        emit Deposit(donor, address(token), DEPOSIT_AMOUNT, "donation");
        vault.deposit(address(token), DEPOSIT_AMOUNT, "donation");
        
        assertEq(token.balanceOf(address(vault)), DEPOSIT_AMOUNT);
    }
    
    function test_DepositStablecoin() public {
        vm.prank(donor);
        vault.deposit(address(stablecoin), DEPOSIT_AMOUNT, "stablecoin donation");
        
        assertEq(stablecoin.balanceOf(address(vault)), DEPOSIT_AMOUNT);
    }
    
    function test_DepositMultipleTimes() public {
        vm.startPrank(donor);
        vault.deposit(address(token), DEPOSIT_AMOUNT, "donation 1");
        vault.deposit(address(token), DEPOSIT_AMOUNT, "donation 2");
        vm.stopPrank();
        
        assertEq(token.balanceOf(address(vault)), DEPOSIT_AMOUNT * 2);
    }
    
    function test_RevertDepositZeroAddress() public {
        vm.prank(donor);
        vm.expectRevert(bytes("invalid deposit"));
        vault.deposit(address(0), DEPOSIT_AMOUNT, "invalid");
    }
    
    function test_RevertDepositZeroAmount() public {
        vm.prank(donor);
        vm.expectRevert(bytes("invalid deposit"));
        vault.deposit(address(token), 0, "invalid");
    }
    
    function test_ReceiveNativeToken() public {
        vm.deal(donor, 1 ether);
        
        vm.prank(donor);
        (bool success,) = address(vault).call{value: 1 ether}("");
        assertTrue(success);
        
        assertEq(address(vault).balance, 1 ether);
    }
    
    // ============================================
    // DISBURSEMENT PROPOSAL TESTS
    // ============================================
    
    function test_ProposeDisbursement() public {
        // Setup: approve charity and deposit funds
        vm.prank(dao);
        vault.approveCharity(charity1, "Red Cross", "health");
        
        vm.prank(donor);
        vault.deposit(address(token), DEPOSIT_AMOUNT, "donation");
        
        // Propose disbursement
        vm.prank(approver1);
        vm.expectEmit(true, true, false, true);
        emit DisbursementProposed(1, charity1, address(token), DISBURSEMENT_AMOUNT, "COVID relief");
        vault.proposeDisbursement(
            charity1,
            address(token),
            DISBURSEMENT_AMOUNT,
            "COVID relief",
            "ipfs://QmXXX"
        );
        
        assertEq(vault.disbursementCount(), 1);
    }
    
    function test_RevertProposeToUnapprovedCharity() public {
        vm.prank(donor);
        vault.deposit(address(token), DEPOSIT_AMOUNT, "donation");
        
        vm.prank(approver1);
        vm.expectRevert(SANCT_NotApproved.selector);
        vault.proposeDisbursement(
            charity1,
            address(token),
            DISBURSEMENT_AMOUNT,
            "COVID relief",
            "ipfs://QmXXX"
        );
    }
    
    function test_RevertProposeZeroAmount() public {
        vm.prank(dao);
        vault.approveCharity(charity1, "Red Cross", "health");
        
        vm.prank(approver1);
        vm.expectRevert(bytes("invalid proposal"));
        vault.proposeDisbursement(
            charity1,
            address(token),
            0,
            "COVID relief",
            "ipfs://QmXXX"
        );
    }
    
    function test_RevertProposeFromNonApprover() public {
        vm.prank(dao);
        vault.approveCharity(charity1, "Red Cross", "health");
        
        vm.prank(donor);
        vm.expectRevert(bytes("not approver"));
        vault.proposeDisbursement(
            charity1,
            address(token),
            DISBURSEMENT_AMOUNT,
            "COVID relief",
            "ipfs://QmXXX"
        );
    }
    
    // ============================================
    // DISBURSEMENT APPROVAL TESTS
    // ============================================
    
    function test_ApproveDisbursement() public {
        // Setup
        vm.prank(dao);
        vault.approveCharity(charity1, "Red Cross", "health");
        
        vm.prank(donor);
        vault.deposit(address(token), DEPOSIT_AMOUNT, "donation");
        
        vm.prank(approver1);
        vault.proposeDisbursement(charity1, address(token), DISBURSEMENT_AMOUNT, "COVID relief", "ipfs://QmXXX");
        
        // Approve
        vm.prank(approver2);
        vm.expectEmit(true, true, false, false);
        emit DisbursementApproved(1, approver2);
        vault.approveDisbursement(1);
    }
    
    function test_RevertApproveOwnProposal() public {
        vm.prank(dao);
        vault.approveCharity(charity1, "Red Cross", "health");
        
        vm.prank(donor);
        vault.deposit(address(token), DEPOSIT_AMOUNT, "donation");
        
        vm.prank(approver1);
        vault.proposeDisbursement(charity1, address(token), DISBURSEMENT_AMOUNT, "COVID relief", "ipfs://QmXXX");
        
        vm.prank(approver1);
        vm.expectRevert(abi.encodeWithSignature("SANCT_AlreadyApproved()"));
        vault.approveDisbursement(1);
    }
    
    function test_RevertApproveAlreadyApproved() public {
        vm.prank(dao);
        vault.approveCharity(charity1, "Red Cross", "health");
        
        vm.prank(donor);
        vault.deposit(address(token), DEPOSIT_AMOUNT, "donation");
        
        vm.prank(approver1);
        vault.proposeDisbursement(charity1, address(token), DISBURSEMENT_AMOUNT, "COVID relief", "ipfs://QmXXX");
        
        vm.prank(approver2);
        vault.approveDisbursement(1);
        
        vm.prank(approver2);
        vm.expectRevert(SANCT_AlreadyApproved.selector);
        vault.approveDisbursement(1);
    }
    
    // ============================================
    // DISBURSEMENT EXECUTION TESTS
    // ============================================
    
    function test_ExecuteDisbursement() public {
        // Setup
        vm.prank(dao);
        vault.approveCharity(charity1, "Red Cross", "health");
        
        vm.prank(donor);
        vault.deposit(address(token), DEPOSIT_AMOUNT, "donation");
        
        vm.prank(approver1);
        vault.proposeDisbursement(charity1, address(token), DISBURSEMENT_AMOUNT, "COVID relief", "ipfs://QmXXX");
        
        // Approve with required number of approvers
        vm.prank(dao);
        vault.approveDisbursement(1);
        
        vm.prank(approver2);
        vault.approveDisbursement(1);
        
        // Execute
        uint256 charityBalanceBefore = token.balanceOf(charity1);
        
        vm.prank(approver1);
        vm.expectEmit(true, true, false, true);
        emit DisbursementExecuted(1, charity1, address(token), DISBURSEMENT_AMOUNT);
        vault.executeDisbursement(1);
        
        assertEq(token.balanceOf(charity1), charityBalanceBefore + DISBURSEMENT_AMOUNT);
    }
    
    function test_RevertExecuteWithoutEnoughApprovals() public {
        vm.prank(dao);
        vault.approveCharity(charity1, "Red Cross", "health");
        
        vm.prank(donor);
        vault.deposit(address(token), DEPOSIT_AMOUNT, "donation");
        
        vm.prank(approver1);
        vault.proposeDisbursement(charity1, address(token), DISBURSEMENT_AMOUNT, "COVID relief", "ipfs://QmXXX");
        
        // Proposer auto-approved (1 approval), need 2 total
        // Try to execute without second approval
        vm.prank(approver1);
        vm.expectRevert(bytes("insufficient approvals"));
        vault.executeDisbursement(1);
    }
    
    function test_RevertExecuteAlreadyExecuted() public {
        vm.prank(dao);
        vault.approveCharity(charity1, "Red Cross", "health");
        
        vm.prank(donor);
        vault.deposit(address(token), DEPOSIT_AMOUNT, "donation");
        
        vm.prank(approver1);
        vault.proposeDisbursement(charity1, address(token), DISBURSEMENT_AMOUNT, "COVID relief", "ipfs://QmXXX");
        
        vm.prank(dao);
        vault.approveDisbursement(1);
        vm.prank(approver2);
        vault.approveDisbursement(1);
        
        vm.prank(approver1);
        vault.executeDisbursement(1);
        
        vm.prank(approver1);
        vm.expectRevert(bytes("already finalized"));
        vault.executeDisbursement(1);
    }
    
    function test_RevertExecuteInsufficientBalance() public {
        vm.prank(dao);
        vault.approveCharity(charity1, "Red Cross", "health");
        
        vm.prank(donor);
        vault.deposit(address(token), 100 ether, "small donation");
        
        // Should revert during proposal since balance (100) < amount (10000)
        vm.prank(approver1);
        vm.expectRevert(abi.encodeWithSignature("SANCT_InsufficientBalance()"));
        vault.proposeDisbursement(charity1, address(token), DEPOSIT_AMOUNT, "Too much", "ipfs://QmXXX");
    }
    
    // ============================================
    // DISBURSEMENT REJECTION TESTS
    // ============================================
    
    function test_RejectDisbursement() public {
        vm.prank(dao);
        vault.approveCharity(charity1, "Red Cross", "health");
        
        vm.prank(donor);
        vault.deposit(address(token), DEPOSIT_AMOUNT, "donation");
        
        vm.prank(approver1);
        vault.proposeDisbursement(charity1, address(token), DISBURSEMENT_AMOUNT, "COVID relief", "ipfs://QmXXX");
        
        vm.prank(dao);
        vault.rejectDisbursement(1, "insufficient documentation");
    }
    
    function test_RevertRejectAlreadyExecuted() public {
        vm.prank(dao);
        vault.approveCharity(charity1, "Red Cross", "health");
        
        vm.prank(donor);
        vault.deposit(address(token), DEPOSIT_AMOUNT, "donation");
        
        vm.prank(approver1);
        vault.proposeDisbursement(charity1, address(token), DISBURSEMENT_AMOUNT, "COVID relief", "ipfs://QmXXX");
        
        vm.prank(dao);
        vault.approveDisbursement(1);
        vm.prank(approver2);
        vault.approveDisbursement(1);
        
        vm.prank(approver1);
        vault.executeDisbursement(1);
        
        vm.prank(dao);
        vm.expectRevert(bytes("already finalized"));
        vault.rejectDisbursement(1, "too late");
    }
    
    // ============================================
    // VIEW FUNCTION TESTS
    // ============================================
    
    function test_GetDisbursementDetails() public {
        vm.prank(dao);
        vault.approveCharity(charity1, "Red Cross", "health");
        
        vm.prank(donor);
        vault.deposit(address(token), DEPOSIT_AMOUNT, "donation");
        
        vm.prank(approver1);
        vault.proposeDisbursement(charity1, address(token), DISBURSEMENT_AMOUNT, "COVID relief", "ipfs://QmXXX");
        
        (
            address charity,
            address tokenAddr,
            uint256 amount,
            string memory campaign,
            string memory documentation,
            ,
            ,
            bool executed,
            bool rejected,
            uint8 approvalCount
        ) = vault.disbursements(1);
        
        assertEq(charity, charity1);
        assertEq(tokenAddr, address(token));
        assertEq(amount, DISBURSEMENT_AMOUNT);
        assertEq(campaign, "COVID relief");
        assertEq(documentation, "ipfs://QmXXX");
        assertFalse(executed);
        assertFalse(rejected);
        assertEq(approvalCount, 1); // Proposer auto-approves
    }
    
    function test_GetVaultBalances() public {
        vm.startPrank(donor);
        vault.deposit(address(token), DEPOSIT_AMOUNT, "donation");
        vault.deposit(address(stablecoin), DEPOSIT_AMOUNT, "stablecoin donation");
        vm.stopPrank();
        
        assertEq(token.balanceOf(address(vault)), DEPOSIT_AMOUNT);
        assertEq(stablecoin.balanceOf(address(vault)), DEPOSIT_AMOUNT);
    }
    
    // ============================================
    // FUZZ TESTS
    // ============================================
    
    function testFuzz_DepositAmount(uint96 amount) public {
        vm.assume(amount > 0);
        vm.assume(amount <= DEPOSIT_AMOUNT * 10);
        
        vm.prank(donor);
        vault.deposit(address(token), amount, "fuzz donation");
        
        assertEq(token.balanceOf(address(vault)), amount);
    }
    
    function testFuzz_DisbursementAmount(uint96 depositAmt, uint96 disbursementAmt) public {
        vm.assume(depositAmt > 0 && depositAmt <= DEPOSIT_AMOUNT * 10);
        vm.assume(disbursementAmt > 0 && disbursementAmt <= depositAmt);
        
        vm.prank(dao);
        vault.approveCharity(charity1, "Red Cross", "health");
        
        vm.prank(donor);
        vault.deposit(address(token), depositAmt, "donation");
        
        vm.prank(approver1);
        vault.proposeDisbursement(charity1, address(token), disbursementAmt, "relief", "ipfs://QmXXX");
        
        vm.prank(dao);
        vault.approveDisbursement(1);
        vm.prank(approver2);
        vault.approveDisbursement(1);
        
        vm.prank(approver1);
        vault.executeDisbursement(1);
        
        assertEq(token.balanceOf(charity1), disbursementAmt);
    }
    
    function testFuzz_MultipleApprovers(uint8 numApprovers) public {
        vm.assume(numApprovers >= 2 && numApprovers <= 10);
        
        // Add approvers
        for (uint8 i = 0; i < numApprovers; i++) {
            address approver = address(uint160(0x1000 + i));
            if (!vault.isApprover(approver)) {
                vm.prank(dao);
                vault.addApprover(approver);
            }
        }
        
        assertGe(vault.getApproverCount(), numApprovers);
    }
}

// ============================================
// MOCK CONTRACTS
// ============================================

contract MockDevVault {
    // Empty dev vault
}

contract MockPresale {
    // Empty presale mock
}

contract MockProofLedger {
    function logSystemEvent(address, string calldata, address) external pure {}
    function logEvent(address, string calldata, uint256, string calldata) external pure {}
}

contract MockStablecoin {
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;
    
    function mint(address to, uint256 amount) external {
        balanceOf[to] += amount;
    }
    
    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        return true;
    }
    
    function transfer(address to, uint256 amount) external returns (bool) {
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        return true;
    }
    
    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        require(allowance[from][msg.sender] >= amount, "insufficient allowance");
        allowance[from][msg.sender] -= amount;
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        return true;
    }
}

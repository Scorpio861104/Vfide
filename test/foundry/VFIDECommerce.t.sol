// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import "forge-std/Test.sol";
import "../../contracts/VFIDECommerce.sol";
import "../../contracts/mocks/ERC20Mock.sol";
import "../../contracts/mocks/VaultHubMock.sol";
import "../../contracts/mocks/SecurityHubMock.sol";
import "../../contracts/mocks/LedgerMock.sol";
import "../../contracts/mocks/SeerMock.sol";

contract VFIDECommerceTest is Test {
    MerchantRegistry public merchantRegistry;
    CommerceEscrow public escrow;
    ERC20Mock public token;
    VaultHubMock public vaultHub;
    SecurityHubMock public securityHub;
    LedgerMock public ledger;
    SeerMock public seer;
    
    address constant DAO = address(0x1);
    address constant MERCHANT = address(0x2);
    address constant BUYER = address(0x3);
    
    function setUp() public {
        // Deploy mocks
        token = new ERC20Mock("Mock Token", "MOCK");
        vaultHub = new VaultHubMock();
        securityHub = new SecurityHubMock();
        ledger = new LedgerMock(false);
        seer = new SeerMock();
        
        // Set minimum score for merchants
        seer.setMin(100);
        seer.setScore(MERCHANT, 500);
        
        // Deploy contracts
        merchantRegistry = new MerchantRegistry(
            DAO,
            address(token),
            address(vaultHub),
            address(seer),
            address(securityHub),
            address(ledger)
        );
        
        escrow = new CommerceEscrow(
            DAO,
            address(token),
            address(vaultHub),
            address(merchantRegistry),
            address(securityHub),
            address(seer)
        );
        
        // Authorize escrow to call _noteDispute and _noteRefund on MerchantRegistry
        vm.prank(DAO);
        merchantRegistry.setAuthorizedEscrow(address(escrow));
        
        // Setup vaults
        vaultHub.setVault(MERCHANT, address(0x100));
        vaultHub.setVault(BUYER, address(0x200));
        
        // Give buyer tokens
        token.mint(BUYER, 1_000_000e18);
    }
    
    /// @notice Fuzz test: Merchant registration requires minimum score
    function testFuzz_MerchantMinScore(uint16 score) public {
        // Score must be positive and less than minScore to test rejection
        // Note: SeerMock returns 5000 for score=0, so we need to set explicit scores
        vm.assume(score > 0 && score < 1000);
        
        address newMerchant = address(0x999);
        seer.setScore(newMerchant, score);
        vaultHub.setVault(newMerchant, address(0x111));
        
        uint16 registryMinScore = merchantRegistry.minScore();
        
        vm.prank(newMerchant);
        if (score < registryMinScore) {
            vm.expectRevert(COM_NotAllowed.selector);
        }
        merchantRegistry.addMerchant(bytes32(uint256(1)));
    }
    
    /// @notice Fuzz test: Escrow open requires valid merchant
    function testFuzz_EscrowRequiresMerchant(uint256 amount) public {
        vm.assume(amount > 0 && amount < 1_000_000e18);
        
        // Register merchant first
        vm.prank(MERCHANT);
        merchantRegistry.addMerchant(bytes32(uint256(1)));
        
        // Buyer opens escrow
        vm.prank(BUYER);
        uint256 id = escrow.open(MERCHANT, amount, bytes32(uint256(123)));
        
        assertTrue(id > 0, "Escrow should be created");
    }
    
    /// @notice Fuzz test: Cannot open escrow with zero amount
    function testFuzz_CannotOpenZeroAmount() public {
        vm.prank(MERCHANT);
        merchantRegistry.addMerchant(bytes32(uint256(1)));
        
        vm.prank(BUYER);
        vm.expectRevert(COM_BadAmount.selector);
        escrow.open(MERCHANT, 0, bytes32(0));
    }
    
    /// @notice Fuzz test: Escrow state transitions correctly
    function testFuzz_EscrowStateTransitions(uint256 amount) public {
        vm.assume(amount > 0 && amount < 1_000_000e18);
        
        // Register merchant
        vm.prank(MERCHANT);
        merchantRegistry.addMerchant(bytes32(uint256(1)));
        
        // Open escrow
        vm.prank(BUYER);
        uint256 id = escrow.open(MERCHANT, amount, bytes32(0));
        
        CommerceEscrow.State state;
        (,,,,,state,) = escrow.escrows(id);
        assertEq(uint8(state), uint8(CommerceEscrow.State.OPEN), "Should be OPEN");
        
        // Transfer tokens directly to escrow contract (simulating payment)
        token.mint(address(escrow), amount);
        
        // Call fund
        vm.prank(BUYER);
        escrow.markFunded(id);
        
        (,,,,,state,) = escrow.escrows(id);
        assertEq(uint8(state), uint8(CommerceEscrow.State.FUNDED), "Should be FUNDED");
    }
    
    /// @notice Fuzz test: Release sends funds to merchant vault
    function testFuzz_ReleaseSendsToMerchant(uint256 amount) public {
        vm.assume(amount > 1e18 && amount < 1_000_000e18);
        
        // Setup
        vm.prank(MERCHANT);
        merchantRegistry.addMerchant(bytes32(uint256(1)));
        
        vm.prank(BUYER);
        uint256 id = escrow.open(MERCHANT, amount, bytes32(0));
        
        // Fund escrow - transfer tokens directly to escrow contract
        token.mint(address(escrow), amount);
        vm.prank(BUYER);
        escrow.markFunded(id);
        
        // Release
        address merchantVault = vaultHub.vaultOf(MERCHANT);
        uint256 balBefore = token.balanceOf(merchantVault);
        
        vm.prank(BUYER);
        escrow.release(id);
        
        uint256 balAfter = token.balanceOf(merchantVault);
        assertEq(balAfter - balBefore, amount, "Merchant should receive amount");
    }
    
    /// @notice Fuzz test: Refund sends funds back to buyer vault
    function testFuzz_RefundSendsToBuyer(uint256 amount) public {
        vm.assume(amount > 1e18 && amount < 1_000_000e18);
        
        // Setup
        vm.prank(MERCHANT);
        merchantRegistry.addMerchant(bytes32(uint256(1)));
        
        vm.prank(BUYER);
        uint256 id = escrow.open(MERCHANT, amount, bytes32(0));
        
        // Fund escrow - transfer tokens directly to escrow contract
        token.mint(address(escrow), amount);
        vm.prank(BUYER);
        escrow.markFunded(id);
        
        // Refund
        address buyerVault = vaultHub.vaultOf(BUYER);
        uint256 balBefore = token.balanceOf(buyerVault);
        
        vm.prank(MERCHANT);
        escrow.refund(id);
        
        uint256 balAfter = token.balanceOf(buyerVault);
        assertEq(balAfter - balBefore, amount, "Buyer should receive refund");
    }
    
    /// @notice Fuzz test: Dispute changes state correctly
    function testFuzz_DisputeChangesState(uint256 amount) public {
        vm.assume(amount > 0 && amount < 1_000_000e18);
        
        // Setup funded escrow
        vm.prank(MERCHANT);
        merchantRegistry.addMerchant(bytes32(uint256(1)));
        
        vm.prank(BUYER);
        uint256 id = escrow.open(MERCHANT, amount, bytes32(0));
        
        // Fund escrow - transfer tokens directly to escrow contract
        token.mint(address(escrow), amount);
        vm.prank(BUYER);
        escrow.markFunded(id);
        
        // Dispute
        vm.prank(BUYER);
        escrow.dispute(id, "Item not as described");
        
        (,,,,,CommerceEscrow.State state,) = escrow.escrows(id);
        assertEq(uint8(state), uint8(CommerceEscrow.State.DISPUTED), "Should be DISPUTED");
    }
    
    /// @notice Fuzz test: DAO can resolve disputes
    function testFuzz_DAOCanResolveDispute(uint256 amount, bool buyerWins) public {
        vm.assume(amount > 1e18 && amount < 1_000_000e18);
        
        // Setup disputed escrow
        vm.prank(MERCHANT);
        merchantRegistry.addMerchant(bytes32(uint256(1)));
        
        vm.prank(BUYER);
        uint256 id = escrow.open(MERCHANT, amount, bytes32(0));
        
        // Fund escrow - transfer tokens directly to escrow contract
        token.mint(address(escrow), amount);
        vm.prank(BUYER);
        escrow.markFunded(id);
        
        vm.prank(BUYER);
        escrow.dispute(id, "dispute");
        
        // DAO resolves
        address winner = buyerWins ? vaultHub.vaultOf(BUYER) : vaultHub.vaultOf(MERCHANT);
        uint256 balBefore = token.balanceOf(winner);
        
        vm.prank(DAO);
        escrow.resolve(id, buyerWins);
        
        uint256 balAfter = token.balanceOf(winner);
        assertEq(balAfter - balBefore, amount, "Winner should receive amount");
    }
    
    /// @notice Fuzz test: Cannot open escrow for suspended merchant
    
    /// @notice Fuzz test: Multiple escrows can coexist
    function testFuzz_MultipleEscrows(uint8 count, uint256 baseAmount) public {
        vm.assume(count > 0 && count <= 10);
        vm.assume(baseAmount > 1e18 && baseAmount < 100_000e18);
        
        vm.prank(MERCHANT);
        merchantRegistry.addMerchant(bytes32(uint256(1)));
        
        uint256[] memory ids = new uint256[](count);
        
        for (uint8 i = 0; i < count; i++) {
            uint256 amount = baseAmount + (i * 1e18);
            
            vm.prank(BUYER);
            ids[i] = escrow.open(MERCHANT, amount, bytes32(uint256(i)));
            
            assertTrue(ids[i] > 0, "Should create escrow");
        }
        
        // Verify all are unique
        for (uint8 i = 0; i < count; i++) {
            for (uint8 j = i + 1; j < count; j++) {
                assertTrue(ids[i] != ids[j], "IDs should be unique");
            }
        }
    }
    
    // ============ NEW FEATURE TESTS ============
    
    // NOTE: The following features are not implemented in the current CommerceEscrow:
    // - Cancel functionality
    // - Auto-release after delivery window
    // - Partial resolution
    // - Dispute window expiry
    // - Custom delivery windows
    // - Payment channels
    //
    // Current escrow states: NONE -> OPEN -> FUNDED -> RELEASED/REFUNDED/DISPUTED -> RESOLVED
    // Future iterations may add these features.
}

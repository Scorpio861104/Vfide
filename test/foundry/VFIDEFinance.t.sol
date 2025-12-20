// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import "forge-std/Test.sol";
import "../../contracts/mocks/ERC20Mock.sol";
import "../../contracts/mocks/VFIDEFinanceMocks.sol";

contract VFIDEFinanceTest is Test {
    StablecoinRegistryMock public registry;
    EcoTreasuryVaultMock public treasury;
    ERC20Mock public usdc;
    ERC20Mock public usdt;
    
    address constant DAO = address(0x1);
    address constant USER = address(0x2);
    
    function setUp() public {
        // Deploy mocks
        usdc = new ERC20Mock("USDC", "USDC");
        usdt = new ERC20Mock("USDT", "USDT");
        
        // Deploy contracts
        registry = new StablecoinRegistryMock(DAO);
        treasury = new EcoTreasuryVaultMock(DAO);
        
        // Add stablecoins
        vm.prank(DAO);
        registry.addAsset(address(usdc), "USDC");
        
        vm.prank(DAO);
        registry.addAsset(address(usdt), "USDT");
    }
    
    /// @notice Fuzz test: Only DAO can add assets
    function testFuzz_OnlyDAOCanAddAssets(address notDAO) public {
        vm.assume(notDAO != DAO && notDAO != address(0));
        
        ERC20Mock newToken = new ERC20Mock("NEW", "NEW");
        
        vm.prank(notDAO);
        vm.expectRevert(FI_NotDAO.selector);
        registry.addAsset(address(newToken), "NEW");
    }
    
    /// @notice Fuzz test: Cannot add same asset twice
    function testFuzz_CannotAddAssetTwice() public {
        ERC20Mock newToken = new ERC20Mock("NEW", "NEW");
        
        vm.startPrank(DAO);
        registry.addAsset(address(newToken), "NEW");
        
        vm.expectRevert(FI_AlreadyWhitelisted.selector);
        registry.addAsset(address(newToken), "NEW");
        vm.stopPrank();
    }
    
    /// @notice Fuzz test: Can remove whitelisted assets
    function testFuzz_CanRemoveAssets() public {
        assertTrue(registry.isWhitelisted(address(usdc)), "USDC should be whitelisted");
        
        vm.prank(DAO);
        registry.removeAsset(address(usdc));
        
        assertFalse(registry.isWhitelisted(address(usdc)), "USDC should be removed");
    }
    
    /// @notice Fuzz test: Cannot remove non-whitelisted asset
    function testFuzz_CannotRemoveNonWhitelisted() public {
        ERC20Mock newToken = new ERC20Mock("NEW", "NEW");
        
        vm.prank(DAO);
        vm.expectRevert(FI_NotWhitelisted.selector);
        registry.removeAsset(address(newToken));
    }
    
    /// @notice Fuzz test: Decimals are tracked correctly
    function testFuzz_DecimalsTracked() public {
        assertEq(registry.tokenDecimals(address(usdc)), 18, "Decimals should be 18");
    }
    
    /// @notice Fuzz test: Treasury can deposit stablecoins
    function testFuzz_TreasuryDeposit(uint256 amount) public {
        vm.assume(amount > 0 && amount < 1_000_000e18);
        
        usdc.mint(address(treasury), amount);
        
        vm.prank(address(this));
        treasury.depositStable(address(usdc), amount);
        
        assertEq(treasury.balanceOf(address(usdc)), amount, "Balance should match deposit");
    }
    
    /// @notice Fuzz test: Treasury tracks multiple deposits
    function testFuzz_MultipleDeposits(uint8 count) public {
        vm.assume(count > 0 && count <= 10); // Limit to prevent large iterations
        
        uint256 totalAmount = 0;
        for (uint256 i = 0; i < count; i++) { // Use uint256 to prevent overflow
            uint256 amount = (i + 1) * 1e18;
            totalAmount += amount;
            
            treasury.depositStable(address(usdc), amount);
        }
        
        assertEq(treasury.balanceOf(address(usdc)), totalAmount, "Total should match");
    }
    
    /// @notice Fuzz test: DAO can send from treasury
    function testFuzz_DAOCanSend(uint256 amount) public {
        vm.assume(amount > 1e18 && amount < 1_000_000e18);
        
        // Deposit first
        treasury.depositStable(address(usdc), amount);
        
        uint256 sendAmount = amount / 2;
        
        // DAO sends
        vm.prank(DAO);
        treasury.send(address(usdc), USER, sendAmount, "payment");
        
        assertEq(treasury.balanceOf(address(usdc)), amount - sendAmount, "Remainder should match");
    }
    
    /// @notice Fuzz test: Symbol hints can be updated
    function testFuzz_SymbolHintUpdate() public {
        vm.prank(DAO);
        registry.setSymbolHint(address(usdc), "USD Coin");
        // Just verify no revert
    }
    
    /// @notice Fuzz test: Cannot update symbol for non-whitelisted
    function testFuzz_CannotUpdateNonWhitelisted() public {
        ERC20Mock newToken = new ERC20Mock("NEW", "NEW");
        
        vm.prank(DAO);
        vm.expectRevert(FI_NotWhitelisted.selector);
        registry.setSymbolHint(address(newToken), "New Token");
    }
}

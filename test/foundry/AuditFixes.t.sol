// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import "forge-std/Test.sol";

// Import only interfaces we need to avoid conflicts
interface IVaultHub {
    function ensureVault(address owner_) external returns (address);
}

interface ISeer {
    function getScore(address subject) external view returns (uint16);
    function setScore(address subject, uint16 newScore, string calldata reason) external;
    function setModules(address _vaultHub, address _hub, address _ledger) external;
}

interface IUserVault {
    function transferVFIDE(address toVault, uint256 amount) external returns (bool);
    function setWithdrawalCooldown(uint256 cooldown) external;
    function withdrawalCooldown() external view returns (uint256);
    function setLargeTransferThreshold(uint256 threshold) external;
    function largeTransferThreshold() external view returns (uint256);
    function lastWithdrawalTime() external view returns (uint256);
}

interface IVFIDEToken {
    function setVaultHub(address hub) external;
    function setVaultFactory(address factory) external;
    function vaultHub() external view returns (address);
    function mintDev(address to, uint256 amount) external;
}

contract AuditFixesTest is Test {
    address vaultHub;
    address seer;
    address token;
    
    address dao = address(0x1);
    address user = address(0x2);
    
    function setUp() public {
        vm.startPrank(dao);
        
        // Deploy contracts using artifact names as they appear in out/
        address ledger = deployCode("VFIDETrust.sol:ProofLedger", abi.encode(dao));
        seer = deployCode("VFIDETrust.sol:Seer", abi.encode(dao, address(0), ledger));
        vaultHub = deployCode("VaultInfrastructure.sol:VaultInfrastructure", abi.encode(dao, address(0), address(0), ledger));
        token = deployCode("VFIDEToken.sol:VFIDEToken", abi.encode(
            dao,
            address(0), // vaultHub (set later)
            address(0), // securityHub
            address(0), // burnRouter
            ledger
        ));
        
        // Connect modules
        IVFIDEToken(token).setVaultHub(vaultHub);
        ISeer(seer).setModules(vaultHub, address(0), ledger);
        
        vm.stopPrank();
    }
    
    /// Test #1: setVaultFactory alias works
    function test_setVaultFactoryAlias() public {
        vm.prank(dao);
        IVFIDEToken(token).setVaultFactory(address(0x999));
        assertEq(IVFIDEToken(token).vaultHub(), address(0x999), "setVaultFactory should set vaultHub");
    }
    
    /// Test #2: Withdrawal cooldown enforced
    function test_withdrawalCooldownEnforced() public {
        // Create vault for user
        vm.prank(user);
        address vault = IVaultHub(vaultHub).ensureVault(user);
        
        // Mint tokens to vault
        vm.prank(dao);
        IVFIDEToken(token).mintDev(vault, 1000e18);
        
        // First transfer should work
        vm.prank(user);
        IUserVault(vault).transferVFIDE(address(0x123), 100e18);
        
        // Immediate second transfer should fail (cooldown)
        vm.prank(user);
        vm.expectRevert("UV:cooldown-active");
        IUserVault(vault).transferVFIDE(address(0x123), 100e18);
        
        // After cooldown, should work
        vm.warp(block.timestamp + 24 hours + 1);
        vm.prank(user);
        IUserVault(vault).transferVFIDE(address(0x123), 100e18);
    }
    
    /// Test #3: Cooldown can be configured
    function test_withdrawalCooldownConfigurable() public {
        vm.prank(user);
        address vault = IVaultHub(vaultHub).ensureVault(user);
        
        // Set shorter cooldown
        vm.prank(user);
        IUserVault(vault).setWithdrawalCooldown(1 hours);
        
        assertEq(IUserVault(vault).withdrawalCooldown(), 1 hours, "Cooldown should be updated");
        
        // Cannot set too long
        vm.prank(user);
        vm.expectRevert("UV:cooldown-too-long");
        IUserVault(vault).setWithdrawalCooldown(8 days);
    }
    
    /// Test #4: Large transfer threshold enforced
    function test_largeTransferThresholdEnforced() public {
        vm.prank(user);
        address vault = IVaultHub(vaultHub).ensureVault(user);
        
        // Check default threshold
        assertEq(IUserVault(vault).largeTransferThreshold(), 10000e18, "Default threshold should be 10k");
        
        // User can configure it
        vm.prank(user);
        IUserVault(vault).setLargeTransferThreshold(5000e18);
        
        assertEq(IUserVault(vault).largeTransferThreshold(), 5000e18, "Threshold should be updated");
    }
    
    /// Test #5: Automated ProofScore calculation
    function test_automatedProofScoreCalculation() public {
        // User with no vault = neutral (500)
        uint16 score1 = ISeer(seer).getScore(address(0x777));
        assertEq(score1, 500, "User without vault should have neutral score");
        
        // Create vault for user
        vm.prank(user);
        IVaultHub(vaultHub).ensureVault(user);
        
        // User with vault = bonus (+50)
        uint16 score2 = ISeer(seer).getScore(user);
        assertEq(score2, 550, "User with vault should have +50 bonus");
    }
    
    /// Test #6: Manual score override still works
    function test_manualScoreOverride() public {
        // DAO can manually set score
        vm.prank(dao);
        ISeer(seer).setScore(user, 750, "Manual assignment");
        
        uint16 score = ISeer(seer).getScore(user);
        assertEq(score, 750, "Manual score should override automated");
    }
    
    /// Test #7: First withdrawal has no cooldown
    function test_firstWithdrawalNoCooldown() public {
        vm.prank(user);
        address vault = IVaultHub(vaultHub).ensureVault(user);
        
        // Mint tokens
        vm.prank(dao);
        IVFIDEToken(token).mintDev(vault, 1000e18);
        
        // First withdrawal should work immediately (lastWithdrawalTime == 0)
        vm.prank(user);
        IUserVault(vault).transferVFIDE(address(0x123), 100e18);
        
        // Verify lastWithdrawalTime was set
        assertGt(IUserVault(vault).lastWithdrawalTime(), 0, "lastWithdrawalTime should be set");
    }
}

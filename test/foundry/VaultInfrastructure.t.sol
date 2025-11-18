// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import "forge-std/Test.sol";
import "../../contracts-prod/VaultInfrastructure.sol";

contract VaultInfrastructureFuzzTest is Test {
    VaultInfrastructure vaultHub;
    
    address vfideToken = address(0x100);
    address securityHub = address(0x200);
    address ledger = address(0x300);
    address dao = address(0x400);
    
    function setUp() public {
        vm.etch(vfideToken, hex"00");
        vm.etch(securityHub, hex"00");
        vm.etch(ledger, hex"00");
        
        vaultHub = new VaultInfrastructure(vfideToken, securityHub, ledger, dao);
    }
    
    function testFuzz_vfideTokenIsSet(address) public view {
        assertEq(vaultHub.vfideToken(), vfideToken);
    }
    
    function testFuzz_daoIsSet(address) public view {
        assertEq(vaultHub.dao(), dao);
    }
    
    function testFuzz_securityHubIsSet(address) public view {
        assertEq(address(vaultHub.securityHub()), securityHub);
    }
    
    function testFuzz_ensureVaultCreatesUniqueVaults(address owner1, address owner2) public {
        vm.assume(owner1 != owner2);
        vm.assume(owner1 != address(0));
        vm.assume(owner2 != address(0));
        
        address vault1 = vaultHub.ensureVault(owner1);
        address vault2 = vaultHub.ensureVault(owner2);
        
        assertTrue(vault1 != vault2);
        assertTrue(vault1 != address(0));
        assertTrue(vault2 != address(0));
    }
    
    function testFuzz_vaultOfReturnsCorrectVault(address owner) public {
        vm.assume(owner != address(0));
        
        address vault1 = vaultHub.ensureVault(owner);
        address vault2 = vaultHub.vaultOf(owner);
        
        assertEq(vault1, vault2);
    }
    
    function testFuzz_ensureVaultIsIdempotent(address owner) public {
        vm.assume(owner != address(0));
        
        address vault1 = vaultHub.ensureVault(owner);
        address vault2 = vaultHub.ensureVault(owner);
        address vault3 = vaultHub.ensureVault(owner);
        
        assertEq(vault1, vault2);
        assertEq(vault2, vault3);
    }
    
    function testFuzz_cannotCreateVaultForZeroAddress(uint256) public {
        vm.expectRevert();
        vaultHub.ensureVault(address(0));
    }
    
    function testFuzz_onlyOwnerCanSetVFIDE(address randomCaller, address newToken) public {
        address owner = vaultHub.owner();
        vm.assume(randomCaller != owner);
        vm.assume(newToken != address(0));
        
        vm.prank(randomCaller);
        vm.expectRevert();
        vaultHub.setVFIDE(newToken);
    }
}

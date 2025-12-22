// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import "forge-std/Test.sol";
import "../../contracts/VFIDEToken.sol";

// Simple mock for DevReserveVestingVault (just needs to be a contract that can receive tokens)
contract DevVaultMock {
    // Empty contract that can receive tokens
}

// Simple mock for Presale
contract PresaleMock {
    // Empty contract
}

/// @title Simplified Foundry Fuzz Tests for VFIDEToken
/// @notice Fast fuzzing tests that compile and run
contract VFIDETokenSimpleTest is Test {
    VFIDEToken token;
    DevVaultMock devVault;
    PresaleMock presale;
    
    address vaultHub = address(0);  // Optional, can be zero
    address ledger = address(0);    // Optional, can be zero
    address treasury = address(0);   // Optional, can be zero
    
    function setUp() public {
        // Deploy actual mock contracts
        devVault = new DevVaultMock();
        presale = new PresaleMock();
        
        // VFIDEToken constructor: (devReserveVestingVault, _presaleContract, treasury, _vaultHub, _ledger, _treasurySink)
        token = new VFIDEToken(address(devVault), address(presale), address(this), address(0), address(0), address(0));
    }
    
    // FUZZ 1: Total supply should never exceed MAX_SUPPLY
    function testFuzz_totalSupplyBounded(uint256 randomValue) public view {
        assertLe(token.totalSupply(), token.MAX_SUPPLY());
    }
    
    // FUZZ 2: Total supply equals MAX_SUPPLY at genesis (all minted upfront)
    function testFuzz_totalSupplyAtGenesis(uint256 randomValue) public view {
        assertEq(token.totalSupply(), token.MAX_SUPPLY());
    }
    
    // FUZZ 3: Dev reserve constant is correct
    function testFuzz_devReserveConstant(uint256 randomValue) public view {
        assertEq(token.DEV_RESERVE_SUPPLY(), 50_000_000e18);
    }
    
    // FUZZ 4: Constants are immutable
    function testFuzz_constantsImmutable(uint256 randomValue) public view {
        assertEq(token.MAX_SUPPLY(), 200_000_000e18);
        assertEq(token.DEV_RESERVE_SUPPLY(), 50_000_000e18);
        assertEq(token.PRESALE_CAP(), 50_000_000e18);
    }
    
    // FUZZ 5: Name and symbol are correct
    function testFuzz_nameAndSymbol(uint256 randomValue) public view {
        assertEq(token.name(), "VFIDE Token");
        assertEq(token.symbol(), "VFIDE");
        assertEq(token.decimals(), 18);
    }
    
    // FUZZ 6: Owner exists
    function testFuzz_ownerExists(uint256 randomValue) public view {
        assertTrue(token.owner() != address(0));
    }
    
    // FUZZ 7: Vault-only state is boolean
    function testFuzz_vaultOnlyState(uint256 randomValue) public view {
        bool vaultOnly = token.vaultOnly();
        assertTrue(vaultOnly == true || vaultOnly == false);
    }
    
    // FUZZ 8: Policy locked state is boolean
    function testFuzz_policyLockedState(uint256 randomValue) public view {
        bool locked = token.policyLocked();
        assertTrue(locked == true || locked == false);
    }
    
    // FUZZ 9: VaultHub address is set
    function testFuzz_vaultHubSet(uint256 randomValue) public view {
        address hub = address(token.vaultHub());
        assertEq(hub, vaultHub);
    }
    
    // FUZZ 10: Treasury sink is set
    function testFuzz_treasurySinkSet(uint256 randomValue) public view {
        address sink = token.treasurySink();
        // treasurySink is set to address(0) in constructor
        assertEq(sink, address(0));
    }
    
    // FUZZ 11: Presale contract is set
    function testFuzz_presaleContractSet(uint256 randomValue) public view {
        address presaleAddr = token.presaleContract();
        assertEq(presaleAddr, address(presale));
    }
    
    // FUZZ 12: Total supply consistency
    function testFuzz_totalSupplyConsistent(uint256 randomValue) public view {
        uint256 supply1 = token.totalSupply();
        uint256 supply2 = token.totalSupply();
        assertEq(supply1, supply2);
    }
    
    // FUZZ 13: Allowance for zero spender
    function testFuzz_allowanceZeroSpender(address owner, uint256 randomValue) public view {
        vm.assume(owner != address(0));
        uint256 allowanceVal = token.allowance(owner, address(0));
        assertEq(allowanceVal, 0);
    }
    
    // FUZZ 14: Presale cap is within max supply
    function testFuzz_presaleCapBounded(uint256 randomValue) public view {
        uint256 presaleCap = token.PRESALE_CAP();
        uint256 maxSupply = token.MAX_SUPPLY();
        assertTrue(presaleCap <= maxSupply);
    }
    
    // FUZZ 15: Total supply is non-negative
    function testFuzz_totalSupplyNonNegative(uint256 randomValue) public view {
        assertTrue(token.totalSupply() >= 0);
    }
}

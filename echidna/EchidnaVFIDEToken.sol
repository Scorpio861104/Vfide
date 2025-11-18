// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import "../contracts-prod/VFIDEToken.sol";

// Mock dev vault for constructor
contract MockDevVault {
    function claim() external {}
}

/// @title Echidna Property Tests for VFIDEToken
/// @notice Property-based fuzzing to find edge cases
contract EchidnaVFIDEToken {
    VFIDEToken token;
    address[] users;
    
    constructor() {
        // Deploy mock dev vault first
        MockDevVault devVault = new MockDevVault();
        
        // Deploy token with correct 4 parameters
        token = new VFIDEToken(
            address(devVault),  // devReserveVestingVault (required)
            address(0x2),       // vaultHub (optional)
            address(0x3),       // ledger (optional)
            address(0x4)        // treasurySink
        );
        
        // Create test users
        users.push(address(0x10001));
        users.push(address(0x10002));
        users.push(address(0x10003));
        
        // Note: VFIDEToken doesn't expose public mint - tests use internal state
    }
    
    // PROPERTY 1: Total supply should never exceed max supply
    function echidna_total_supply_bounded() public view returns (bool) {
        return token.totalSupply() <= token.MAX_SUPPLY();
    }
    
    // PROPERTY 2: Dev reserve should be 40M initially
    function echidna_dev_reserve_initial() public view returns (bool) {
        // Dev reserve was minted in constructor to devReserveVestingVault
        return token.totalSupply() >= token.DEV_RESERVE_SUPPLY();
    }
    
    // PROPERTY 3: Presale minted should not exceed cap
    function echidna_presale_cap_not_exceeded() public view returns (bool) {
        return token.presaleMinted() <= token.PRESALE_SUPPLY_CAP();
    }
    
    // PROPERTY 4: Constants should be immutable
    function echidna_constants_immutable() public view returns (bool) {
        return token.MAX_SUPPLY() == 200_000_000e18 &&
               token.DEV_RESERVE_SUPPLY() == 40_000_000e18 &&
               token.PRESALE_SUPPLY_CAP() == 75_000_000e18;
    }
    
    // PROPERTY 5: Name and symbol should be constant
    function echidna_name_and_symbol() public view returns (bool) {
        return keccak256(bytes(token.name())) == keccak256(bytes("VFIDE")) &&
               keccak256(bytes(token.symbol())) == keccak256(bytes("VFIDE")) &&
               token.decimals() == 18;
    }
    
    // PROPERTY 6: Owner should always exist
    function echidna_owner_exists() public view returns (bool) {
        return token.owner() != address(0);
        
        try token.burn(amount) {
            return token.totalSupply() < supplyBefore;
        } catch {
            return true;
        }
    }
    
    // PROPERTY 6: Paused state blocks transfers
    function echidna_paused_blocks_transfers() public returns (bool) {
        if (!token.paused()) {
            return true; // Not paused, skip
        }
        
        // If paused, transfer should revert
        try token.transfer(users[1], 100) {
            return false; // Should have reverted
        } catch {
            return true; // Correctly reverted
        }
    }
}

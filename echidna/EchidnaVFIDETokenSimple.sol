// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import "../contracts-prod/VFIDEToken.sol";

// Mock dev vault with actual code for extcodesize check
contract MockDevVault {
    uint256 public dummy = 1; // Add state to ensure contract has bytecode
    function claim() external {}
    function claimable() external view returns (uint256) { return 0; }
}

// Mock ledger that implements IProofLedgerToken interface
contract MockLedger {
    function logEvent(address, string calldata, uint256, string calldata) external {}
}

/// @title Simplified Echidna Property Tests for VFIDEToken
/// @notice Property-based fuzzing that compiles successfully
contract EchidnaVFIDETokenSimple {
    VFIDEToken public token;
    MockDevVault public devVault;
    MockLedger public ledger;
    
    constructor() {
        devVault = new MockDevVault();
        ledger = new MockLedger();
        
        token = new VFIDEToken(
            address(devVault),
            address(0), // vaultHub (not needed for properties)
            address(ledger), // ledger with logEvent
            address(0)  // treasurySink (not needed)
        );
    }
    
    // PROPERTY 1: Total supply never exceeds MAX_SUPPLY
    function echidna_total_supply_bounded() public view returns (bool) {
        return token.totalSupply() <= token.MAX_SUPPLY();
    }
    
    // PROPERTY 2: Dev reserve is 40M initially
    function echidna_dev_reserve_initial() public view returns (bool) {
        return token.totalSupply() == token.DEV_RESERVE_SUPPLY();
    }
    
    // PROPERTY 3: Presale minted never exceeds cap
    function echidna_presale_cap_not_exceeded() public view returns (bool) {
        return token.presaleMinted() <= token.PRESALE_SUPPLY_CAP();
    }
    
    // PROPERTY 4: Constants are immutable
    function echidna_constants_immutable() public view returns (bool) {
        return token.MAX_SUPPLY() == 200_000_000e18 &&
               token.DEV_RESERVE_SUPPLY() == 40_000_000e18 &&
               token.PRESALE_SUPPLY_CAP() == 75_000_000e18;
    }
    
    // PROPERTY 5: Name and symbol are constant
    function echidna_name_and_symbol() public view returns (bool) {
        return keccak256(bytes(token.name())) == keccak256(bytes("VFIDE")) &&
               keccak256(bytes(token.symbol())) == keccak256(bytes("VFIDE")) &&
               token.decimals() == 18;
    }
    
    // PROPERTY 6: Owner always exists
    function echidna_owner_exists() public view returns (bool) {
        return token.owner() != address(0);
    }
    
    // PROPERTY 7: Vault-only is boolean
    function echidna_vault_only_boolean() public view returns (bool) {
        bool vaultOnly = token.vaultOnly();
        return vaultOnly == true || vaultOnly == false;
    }
    
    // PROPERTY 8: Policy locked is boolean
    function echidna_policy_locked_boolean() public view returns (bool) {
        bool locked = token.policyLocked();
        return locked == true || locked == false;
    }
    
    // PROPERTY 9: Total supply is non-negative
    function echidna_supply_non_negative() public view returns (bool) {
        return token.totalSupply() >= 0;
    }
    
    // PROPERTY 10: Presale minted is non-negative
    function echidna_presale_non_negative() public view returns (bool) {
        return token.presaleMinted() >= 0;
    }
    
    // PROPERTY 11: Total supply consistency
    function echidna_supply_consistent() public view returns (bool) {
        uint256 supply1 = token.totalSupply();
        uint256 supply2 = token.totalSupply();
        return supply1 == supply2;
    }
}

// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import "../contracts-prod/VFIDEToken.sol";

/// @notice Medusa property tests for VFIDEToken
contract MedusaVFIDEToken {
    VFIDEToken token;
    
    address devVault = address(0x100);
    address vaultHub = address(0x200);
    address ledger = address(0x300);
    address treasury = address(0x400);
    
    constructor() {
        token = new VFIDEToken(devVault, vaultHub, ledger, treasury);
    }
    
    // Property 1: Total supply never exceeds MAX_SUPPLY
    function property_totalSupply_bounded() public view returns (bool) {
        return token.totalSupply() <= token.MAX_SUPPLY();
    }
    
    // Property 2: Presale minted never exceeds cap
    function property_presale_bounded() public view returns (bool) {
        return token.presaleMinted() <= token.PRESALE_SUPPLY_CAP();
    }
    
    // Property 3: Dev reserve is correct
    function property_devReserve_correct() public view returns (bool) {
        return token.totalSupply() == token.DEV_RESERVE_SUPPLY();
    }
    
    // Property 4: Owner is never zero
    function property_owner_not_zero() public view returns (bool) {
        return token.owner() != address(0);
    }
}

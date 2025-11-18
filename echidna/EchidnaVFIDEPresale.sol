// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import "../contracts-prod/VFIDEPresale.sol";
import "../contracts-prod/VFIDEToken.sol";

// Mock dev vault for constructor
contract MockDevVault {
    function claim() external {}
}

/// @title Echidna Property Tests for VFIDEPresale
/// @notice Verify presale financial invariants
contract EchidnaVFIDEPresale {
    VFIDEPresale presale;
    VFIDEToken token;
    address dao = address(0x1);
    
    uint256 constant PRESALE_ALLOCATION = 100_000_000e18;
    
    constructor() payable {
        // Deploy mock dev vault
        MockDevVault devVault = new MockDevVault();
        
        // Deploy token with correct parameters
        token = new VFIDEToken(address(devVault), address(0x2), address(0x3), address(0x4));
        
        // Deploy presale
        presale = new VFIDEPresale(
            address(token),
            dao,
            PRESALE_ALLOCATION,
            1e18, // 1 USDC per token
            block.timestamp + 1 days,
            block.timestamp + 30 days
        );
        
        // Note: VFIDEToken doesn't expose public mint
    }
    
    // PROPERTY 1: Total tokens sold should never exceed allocation
    function echidna_sold_within_allocation() public view returns (bool) {
        return presale.totalSold() <= PRESALE_ALLOCATION;
    }
    
    // PROPERTY 2: Presale contract should always have enough tokens for sold amount
    function echidna_contract_has_sold_tokens() public view returns (bool) {
        uint256 remaining = PRESALE_ALLOCATION - presale.totalSold();
        return token.balanceOf(address(presale)) >= remaining;
    }
    
    // PROPERTY 3: Purchase should increase total sold
    function echidna_purchase_increases_sold(uint256 amount) public payable returns (bool) {
        uint256 soldBefore = presale.totalSold();
        
        if (amount == 0 || amount > PRESALE_ALLOCATION - soldBefore) {
            return true;
        }
        
        try presale.buy{value: amount}(amount) {
            return presale.totalSold() > soldBefore;
        } catch {
            return true; // Reverts acceptable
        }
    }
    
    // PROPERTY 4: User purchased amount should not exceed allocation
    function echidna_user_purchase_bounded(address user) public view returns (bool) {
        return presale.purchased(user) <= PRESALE_ALLOCATION;
    }
    
    // PROPERTY 5: Cannot purchase after end time
    function echidna_no_purchase_after_end() public returns (bool) {
        if (block.timestamp < presale.endTime()) {
            return true; // Not ended yet
        }
        
        try presale.buy{value: 1e18}(1e18) {
            return false; // Should have reverted
        } catch {
            return true; // Correctly reverted
        }
    }
}

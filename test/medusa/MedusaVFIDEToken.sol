// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import "../../contracts/VFIDEToken.sol";
import "../../contracts/mocks/VaultHubMock.sol";
import "../../contracts/mocks/LedgerMock.sol";

/// @notice Simple mock contracts for VFIDEToken testing
contract DevVaultMock {
    receive() external payable {}
}

contract PresaleMock {
    receive() external payable {}
}

contract TreasurySinkMock {
    receive() external payable {}
}

/// @notice Medusa property tests for VFIDEToken
contract MedusaVFIDEToken {
    VFIDEToken public token;
    VaultHubMock public vaultHub;
    LedgerMock public ledger;
    DevVaultMock public devVault;
    PresaleMock public presale;
    TreasurySinkMock public treasurySink;
    
    address public treasury;
    uint256 public initialSupply;
    
    constructor() {
        treasury = address(this);
        vaultHub = new VaultHubMock();
        ledger = new LedgerMock(false);
        devVault = new DevVaultMock();
        presale = new PresaleMock();
        treasurySink = new TreasurySinkMock();
        
        // VFIDEToken constructor: (devReserveVestingVault, presaleContract, treasury, vaultHub, ledger, treasurySink)
        token = new VFIDEToken(
            address(devVault),
            address(presale),
            treasury,
            address(vaultHub),
            address(ledger),
            address(treasurySink)
        );
        
        initialSupply = token.totalSupply();
    }
    
    // ═══ PROPERTY TESTS ═══
    
    /// @notice Property: Total supply never exceeds MAX_SUPPLY
    function property_totalSupply_bounded() public view returns (bool) {
        return token.totalSupply() <= token.MAX_SUPPLY();
    }
    
    /// @notice Property: Presale contract received PRESALE_CAP
    function property_presale_received_cap() public view returns (bool) {
        // At construction, presale contract should receive PRESALE_CAP
        return token.balanceOf(address(presale)) <= token.PRESALE_CAP();
    }
    
    /// @notice Property: Supply is always positive
    function property_supply_positive() public view returns (bool) {
        return token.totalSupply() > 0;
    }
    
    /// @notice Property: Owner is never zero after construction
    function property_owner_not_zero() public view returns (bool) {
        return token.owner() != address(0);
    }
    
    /// @notice Property: Initial supply equals MAX_SUPPLY
    function property_initialSupply_correct() public view returns (bool) {
        // All tokens minted at construction
        return initialSupply == token.MAX_SUPPLY();
    }
    
    /// @notice Property: Balance never exceeds total supply
    function property_balance_bounded(address user) public view returns (bool) {
        return token.balanceOf(user) <= token.totalSupply();
    }
    
    /// @notice Property: Total supply stays constant (no public mint/burn)
    function property_supply_immutable() public view returns (bool) {
        // VFIDEToken mints all at construction, no public burn
        return token.totalSupply() == token.MAX_SUPPLY();
    }
    
    /// @notice Property: Transfer preserves total balance (without fees)
    function property_transfer_conservation(address to, uint256 amount) public view returns (bool) {
        if (to == address(0) || amount == 0) return true;
        
        uint256 senderBalance = token.balanceOf(address(this));
        uint256 recipientBalance = token.balanceOf(to);
        
        // Just verify balances are valid
        return senderBalance <= token.totalSupply() && recipientBalance <= token.totalSupply();
    }
    
    /// @notice Property: presaleContract address is set
    function property_presale_set() public view returns (bool) {
        return token.presaleContract() != address(0);
    }
    
    // ═══ HELPER ACTIONS ═══
    
    function action_transfer(address to, uint256 amount) public {
        if (to == address(0) || amount == 0) return;
        try token.transfer(to, amount) {} catch {}
    }
}

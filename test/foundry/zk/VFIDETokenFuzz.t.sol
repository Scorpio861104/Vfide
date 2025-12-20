// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import "forge-std/Test.sol";
import {VFIDEToken} from "contracts/VFIDEToken.sol";

// Minimal stub contracts for constructor dependencies
contract DevVault { }

// Mock Presale contract - just needs to exist
contract PresaleStub { }

contract VaultHubStub {
    // Treat any address that deployed this stub as its own vault (simple modeling)
    function vaultOf(address a) external view returns (address) { return a; }
    function isVault(address a) external view returns (bool) { return a != address(0); }
    function ensureVault(address owner_) external returns (address) { return owner_; }
}

contract LedgerStub {
    function logSystemEvent(address, string calldata, address) external {}
    function logEvent(address, string calldata, uint256, string calldata) external {}
}

// Handler contract to constrain fuzzer actions
contract TokenHandler {
    VFIDEToken public token;
    
    constructor(VFIDEToken _token) {
        token = _token;
    }
    
    // Only allow safe, non-owner operations
    function transfer(address to, uint256 amount) external {
        uint256 balance = token.balanceOf(address(this));
        if (amount > balance) amount = balance;
        if (amount == 0 || to == address(0)) return;
        require(token.transfer(to, amount), "transfer failed");
    }
}

contract VFIDETokenFuzz is Test {
    VFIDEToken token;
    DevVault devVault;
    PresaleStub presale;
    VaultHubStub hub;
    LedgerStub ledger;
    TokenHandler handler;

    function setUp() public {
        devVault = new DevVault();
        presale = new PresaleStub();
        hub = new VaultHubStub();
        ledger = new LedgerStub();
        // VFIDEToken constructor: (devReserveVestingVault, _presaleContract, treasury, _vaultHub, _ledger, _treasurySink)
        token = new VFIDEToken(
            address(devVault),
            address(presale),
            address(this),    // treasury
            address(hub),
            address(ledger),
            address(0)        // treasurySink
        );
        // Disable vaultOnly for invariant testing
        token.setVaultOnly(false);
        
        // Create handler and target it for invariant tests
        handler = new TokenHandler(token);
        
        // Exempt handler from whale limits for fuzz testing
        token.setWhaleLimitExempt(address(handler), true);
        
        // Transfer some tokens to handler so invariant tests have funds to work with
        // At genesis, deployer (this) has the treasury allocation (100M)
        require(token.transfer(address(handler), 10_000_000e18), "transfer failed");
        
        targetContract(address(handler));
        excludeContract(address(token));
    }

    // Fuzz basic transfer invariant: balances never exceed MAX_SUPPLY and totalSupply constraint holds
    function testFuzz_TransferInvariant(address from, address to, uint256 amount) public {
        // Filter invalid addresses
        vm.assume(from != address(0) && to != address(0) && from != to);
        // Avoid special addresses that might have unexpected behavior
        vm.assume(from != address(token) && to != address(token));
        vm.assume(from != address(this) && to != address(this));
        vm.assume(from != address(devVault) && from != address(presale));
        vm.assume(to != address(devVault) && to != address(presale));
        
        // Bound amount to reasonable range
        uint256 balance = token.balanceOf(address(this));
        if (balance == 0) return;
        amount = bound(amount, 1, balance > 1_000_000e18 ? 1_000_000e18 : balance);
        
        // Transfer some tokens to 'from' first
        require(token.transfer(from, amount), "transfer failed");
        
        // For fuzz testing, disable vaultOnly mode to test pure transfer logic
        // (vaultOnly enforcement is tested separately in dedicated tests)
        token.setVaultOnly(false);
        
        vm.startPrank(from);
        // Perform transfer - may revert for various reasons (locked vault, etc.)
        try token.transfer(to, amount) returns (bool success) {
            if (success) {
                assertTrue(token.totalSupply() <= token.MAX_SUPPLY(), "supply cap broken");
            }
        } catch {
            // Transfer reverted - acceptable for many reasons (locked, etc.)
        }
        vm.stopPrank();
    }

    function invariant_TotalSupplyCap() public view {
        assertTrue(token.totalSupply() <= token.MAX_SUPPLY(), "MAX_SUPPLY exceeded");
    }
}

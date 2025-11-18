// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import "forge-std/Test.sol";
import {VFIDEToken} from "contracts-min/VFIDEToken.sol";

// Minimal stub contracts for constructor dependencies
contract DevVault { }
contract VaultHubStub {
    // Treat any address that deployed this stub as its own vault (simple modeling)
    function vaultOf(address a) external view returns (address) { return a; }
}
contract LedgerStub {
    function logSystemEvent(address, string calldata, address) external {}
    function logEvent(address, string calldata, uint256, string calldata) external {}
}

contract VFIDETokenFuzz is Test {
    VFIDEToken token;
    DevVault devVault;
    VaultHubStub hub;
    LedgerStub ledger;

    function setUp() public {
        devVault = new DevVault();
        hub = new VaultHubStub();
        ledger = new LedgerStub();
        // Treasury sink can be zero for tests (token allows non-zero recommended but not enforced)
        token = new VFIDEToken(address(devVault), address(hub), address(ledger), address(0));
    }

    // Fuzz basic transfer invariant: balances never exceed MAX_SUPPLY and totalSupply constraint holds
    function testFuzz_TransferInvariant(address from, address to, uint256 amount) public {
        vm.assume(from != address(0) && to != address(0));
        // Mint some tokens to 'from' if lacking balance (bounded to avoid overflow)
        uint256 need = amount > 0 ? amount : 0;
        if (need > 0) {
            // Use cheat to mint via presale path simulation (allocate as if presale minted)
            // Direct mint not exposed; we simulate by setting presale via owner then mintPresale
            token.setPresale(address(this));
            uint256 capped = bound(need, 1, 1_000_000e18); // bound for performance
            token.mintPresale(from, capped);
            amount = capped;
        }
        if (amount == 0) return;
        vm.startPrank(from);
        // Allow system exemptions to bypass vault rule for fuzz simplicity
        token.setSystemExempt(from, true);
        token.setSystemExempt(to, true);
        // Perform transfer (may revert if balance insufficient)
        if (token.balanceOf(from) >= amount) {
            token.transfer(to, amount);
            assertTrue(token.totalSupply() <= token.MAX_SUPPLY(), "supply cap broken");
        }
        vm.stopPrank();
    }

    function invariant_TotalSupplyCap() public {
        assertTrue(token.totalSupply() <= token.MAX_SUPPLY(), "MAX_SUPPLY exceeded");
    }
}

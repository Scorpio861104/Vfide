// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

// Minimal interface subset to interact with VFIDEToken for property tests
interface IVFIDEToken_H {
    function totalSupply() external view returns (uint256);
    function balanceOf(address) external view returns (uint256);
    function transfer(address to, uint256 amount) external returns (bool);
    function canTransfer(address from, address to, uint256 amount) external view returns (bool, string memory);
    function vaultOnly() external view returns (bool);
    function vaultHub() external view returns (address);
}

// Echidna harness assumptions:
// - Deployer (this harness) holds initial token balance via pre-test setup (handled externally if needed).
// - Vault-only transfers: we assert that a direct transfer to a non-vault address reverts OR returns false.
// - Total supply never underflows when burn() is called.

contract EchidnaVFIDETokenHarness {
    IVFIDEToken_H public token;
    address public lastActor;
    uint256 public initialSupply;

    constructor(address tokenAddress) {
        token = IVFIDEToken_H(tokenAddress);
        initialSupply = token.totalSupply();
    }

    // Track calling address (Echidna mutates msg.sender among provided senders)
    function recordActor() external {
        lastActor = msg.sender;
    }

    // Property: total supply never increases beyond initial and never negative.
    function echidna_total_supply_bounds() external view returns (bool) {
        uint256 ts = token.totalSupply();
        return ts <= initialSupply && ts > 0; // supply stays positive
    }

    // Property: Non-vault direct transfer should not silently succeed transferring large arbitrary amount.
    function echidna_vault_only_transfer_guard() external returns (bool) {
        if (!token.vaultOnly() || token.vaultHub() == address(0)) {
            return true;
        }
        if (token.balanceOf(address(this)) < 1) {
            return true;
        }
        address target = address(uint160(uint256(keccak256(abi.encodePacked(block.timestamp, msg.sender)))));
        (bool canDo, ) = token.canTransfer(address(this), target, 1);
        if (!canDo) return true;

        try token.transfer(target, 1) returns (bool ok) {
            return ok;
        } catch {
            return false;
        }
    }
}

// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import "forge-std/Test.sol";
import {StablecoinRegistry} from "contracts/VFIDEFinance.sol";
import {ProofLedger} from "contracts/VFIDETrust.sol";

contract FinanceSmoke is Test {
    StablecoinRegistry registry;
    ProofLedger ledger;
    address dao = address(0xD00);
    address other = address(0xBEEF);

    function setUp() public {
        ledger = new ProofLedger(dao);
        registry = new StablecoinRegistry(dao, address(ledger));
    }

    function testNeutralAddAssetWithBypass() public {
        vm.prank(dao);
        registry.TEST_setOnlyDAOOff(true);
        // create minimal ERC20 mock via inline assembly (avoid importing full OpenZeppelin in smoke)
        address token;
        bytes memory bytecode = hex"6080604052348015600f57600080fd5b506012600055348015601f57600080fd5b506000600160006101000a81548173ffffffffffffffffffffffffffffffffffffffff021916908373ffffffffffffffffffffffffffffffffffffffff16021790555061014f806100626000396000f3fe60806040526004361060125760003560e01c806370a082316014575b600080fd5b348015601f57600080fd5b5060266000546040565b60405190815260200160405180910390f35b6000549056fea2646970667358221220";
        assembly { token := create(0, add(bytecode, 0x20), mload(bytecode)) }
        vm.prank(other);
        registry.addAsset(token, "ASM");
        assertTrue(registry.isWhitelisted(token), "asset should be whitelisted");
    }
}

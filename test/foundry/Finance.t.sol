// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import "forge-std/Test.sol";
import {StablecoinRegistry} from "contracts/VFIDEFinance.sol";
import {ProofLedger} from "contracts/VFIDETrust.sol";
import {ERC20Mock} from "contracts/mocks/ERC20Mock.sol";

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
        // Deploy actual ERC20Mock
        ERC20Mock token = new ERC20Mock("Test", "TST");
        
        vm.prank(dao);
        registry.addAsset(address(token), "TST");
        assertTrue(registry.isWhitelisted(address(token)), "asset should be whitelisted");
    }
}

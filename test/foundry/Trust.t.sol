// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import "forge-std/Test.sol";
import {Seer, ProofLedger} from "contracts/VFIDETrust.sol";

contract TrustSmoke is Test {
    ProofLedger ledger;
    Seer seer;
    address dao = address(0xD00);
    address user = address(0xA11);

    function setUp() public {
        ledger = new ProofLedger(dao);
        seer = new Seer(dao, address(ledger), address(0));
    }

    function testNeutralScoreUninitialized() public {
        uint16 neutral = seer.NEUTRAL();
        uint16 score = seer.getScore(user);
        assertEq(score, neutral, "Uninitialized should be neutral");
    }
}

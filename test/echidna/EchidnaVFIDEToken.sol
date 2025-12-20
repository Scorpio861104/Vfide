// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {VFIDEToken} from "../../contracts/VFIDEToken.sol";

contract EchidnaVFIDEToken {
    VFIDEToken token;

    constructor() {
        // Minimal deploy with mock vesting vault
        address devVault = address(new VestingVault());
        token = new VFIDEToken(devVault, address(0), address(0), address(0));
    }

    // Invariants
    function echidna_total_supply_cap() public view returns (bool) {
        return token.totalSupply() <= token.MAX_SUPPLY();
    }

    function echidna_presale_cap_never_exceeds() public view returns (bool) {
        return token.presaleMinted() <= token.PRESALE_SUPPLY_CAP();
    }
}

contract VestingVault { }

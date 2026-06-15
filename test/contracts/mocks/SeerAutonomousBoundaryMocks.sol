// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

/**
 * Test mocks for the Seer autonomous-enforcement boundary (audit: Seer · the verdict-ignored fund-path).
 *
 * The CardBoundVault calls seerAutonomous.beforeAction(...) at every fund-movement point purely to OBSERVE,
 * and DELIBERATELY DISCARDS the returned verdict (CardBoundVault._enforceSeerAction). These mocks let a hardhat
 * test prove that property at the integration level:
 *
 *   • SeerAutonomousRestrictingMock — beforeAction returns the maximally-restricting verdict (e.g. Frozen=5).
 *       The vault must STILL execute the payment/withdrawal (verdict ignored).
 *   • SeerAutonomousRevertingMock   — beforeAction always reverts.
 *       The vault must STILL execute (SEER-04 fail-open: a Seer outage cannot brick fund movement).
 *
 * The vault only consumes `beforeAction(address,uint8,uint256,address) returns (uint8)` from this surface, so
 * these minimal mocks are sufficient.
 */

contract SeerAutonomousRestrictingMock {
    uint256 public callCount;

    /// @notice Always returns the highest restriction verdict the vault could observe.
    function beforeAction(address, uint8, uint256, address) external returns (uint8) {
        callCount += 1;
        return 5; // RestrictionLevel.Frozen — the strongest verdict; the vault must ignore it for funds.
    }

    // The vault may read other advisory views; none affect fund movement. Add no-op stubs if a future
    // vault build queries them, to keep this mock a faithful stand-in.
}

contract SeerAutonomousRevertingMock {
    /// @notice Always reverts — simulates a Seer hook outage. The vault's try/catch (SEER-04) must absorb this.
    function beforeAction(address, uint8, uint256, address) external pure returns (uint8) {
        revert("SeerAutonomousRevertingMock: down");
    }
}

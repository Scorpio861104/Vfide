// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

/**
 * SeerAutonomousLib — Pure helper functions extracted from SeerAutonomous
 * to reduce deployed bytecode below the 24576-byte EIP-170 limit.
 *
 * Contains the rate-limit profile tables that generate high bytecode volume
 * due to repeated storage writes across 6 restriction levels × 8 action types.
 */
library SeerAutonomousLib {
    /// @dev Packed (level, action, limit) tuple for batch initialization.
    struct RateLimitEntry {
        uint8 level;
        uint8 action;
        uint16 limit;
    }

    /**
     * @notice Returns the full max-autonomy rate-limit profile as an array.
     * @dev Looping over the returned array in the caller replaces 48 inline calls.
     */
    function getMaxAutonomyProfile() internal pure returns (RateLimitEntry[48] memory entries) {
        // RestrictionLevel.None (0)
        entries[0]  = RateLimitEntry(0, 0, 300);  // Transfer
        entries[1]  = RateLimitEntry(0, 1, 300);  // VaultDeposit
        entries[2]  = RateLimitEntry(0, 2, 300);  // VaultWithdraw
        entries[3]  = RateLimitEntry(0, 3, 30);   // GovernanceVote
        entries[4]  = RateLimitEntry(0, 4, 6);    // GovernancePropose
        entries[5]  = RateLimitEntry(0, 5, 30);   // Endorse
        entries[6]  = RateLimitEntry(0, 6, 60);   // Stake
        entries[7]  = RateLimitEntry(0, 7, 300);  // Trade

        // RestrictionLevel.Monitored (1)
        entries[8]  = RateLimitEntry(1, 0, 40);
        entries[9]  = RateLimitEntry(1, 1, 40);
        entries[10] = RateLimitEntry(1, 2, 40);
        entries[11] = RateLimitEntry(1, 3, 15);
        entries[12] = RateLimitEntry(1, 4, 3);
        entries[13] = RateLimitEntry(1, 5, 15);
        entries[14] = RateLimitEntry(1, 6, 15);
        entries[15] = RateLimitEntry(1, 7, 40);

        // RestrictionLevel.Limited (2)
        entries[16] = RateLimitEntry(2, 0, 8);
        entries[17] = RateLimitEntry(2, 1, 8);
        entries[18] = RateLimitEntry(2, 2, 8);
        entries[19] = RateLimitEntry(2, 3, 3);
        entries[20] = RateLimitEntry(2, 4, 1);
        entries[21] = RateLimitEntry(2, 5, 4);
        entries[22] = RateLimitEntry(2, 6, 4);
        entries[23] = RateLimitEntry(2, 7, 8);

        // RestrictionLevel.Restricted (3)
        entries[24] = RateLimitEntry(3, 0, 2);
        entries[25] = RateLimitEntry(3, 1, 1);
        entries[26] = RateLimitEntry(3, 2, 1);
        entries[27] = RateLimitEntry(3, 3, 0);
        entries[28] = RateLimitEntry(3, 4, 0);
        entries[29] = RateLimitEntry(3, 5, 1);
        entries[30] = RateLimitEntry(3, 6, 1);
        entries[31] = RateLimitEntry(3, 7, 2);

        // RestrictionLevel.Suspended (4)
        entries[32] = RateLimitEntry(4, 0, 0);
        entries[33] = RateLimitEntry(4, 1, 0);
        entries[34] = RateLimitEntry(4, 2, 0);
        entries[35] = RateLimitEntry(4, 3, 0);
        entries[36] = RateLimitEntry(4, 4, 0);
        entries[37] = RateLimitEntry(4, 5, 0);
        entries[38] = RateLimitEntry(4, 6, 0);
        entries[39] = RateLimitEntry(4, 7, 0);

        // RestrictionLevel.Frozen (5)
        entries[40] = RateLimitEntry(5, 0, 0);
        entries[41] = RateLimitEntry(5, 1, 0);
        entries[42] = RateLimitEntry(5, 2, 0);
        entries[43] = RateLimitEntry(5, 3, 0);
        entries[44] = RateLimitEntry(5, 4, 0);
        entries[45] = RateLimitEntry(5, 5, 0);
        entries[46] = RateLimitEntry(5, 6, 0);
        entries[47] = RateLimitEntry(5, 7, 0);
    }

    /**
     * @notice Returns the default rate-limit profile used by SeerAutonomous._initializeRateLimits.
     * @dev Looping over the returned array in the caller replaces 48 inline storage writes.
     *      Layout: 6 RestrictionLevels (None..Frozen) x 8 ActionTypes (Transfer..Trade).
     */
    function getDefaultProfile() internal pure returns (RateLimitEntry[48] memory entries) {
        // RestrictionLevel.None (0): unlimited
        entries[0]  = RateLimitEntry(0, 0, 1000); // Transfer
        entries[1]  = RateLimitEntry(0, 1, 1000); // VaultDeposit
        entries[2]  = RateLimitEntry(0, 2, 1000); // VaultWithdraw
        entries[3]  = RateLimitEntry(0, 3, 100);  // GovernanceVote
        entries[4]  = RateLimitEntry(0, 4, 20);   // GovernancePropose
        entries[5]  = RateLimitEntry(0, 5, 100);  // Endorse
        entries[6]  = RateLimitEntry(0, 6, 200);  // Stake
        entries[7]  = RateLimitEntry(0, 7, 1000); // Trade

        // RestrictionLevel.Monitored (1): normal limits
        entries[8]  = RateLimitEntry(1, 0, 100);
        entries[9]  = RateLimitEntry(1, 1, 100);
        entries[10] = RateLimitEntry(1, 2, 100);
        entries[11] = RateLimitEntry(1, 3, 50);
        entries[12] = RateLimitEntry(1, 4, 10);
        entries[13] = RateLimitEntry(1, 5, 50);
        entries[14] = RateLimitEntry(1, 6, 50);
        entries[15] = RateLimitEntry(1, 7, 100);

        // RestrictionLevel.Limited (2): reduced
        entries[16] = RateLimitEntry(2, 0, 20);
        entries[17] = RateLimitEntry(2, 1, 20);
        entries[18] = RateLimitEntry(2, 2, 20);
        entries[19] = RateLimitEntry(2, 3, 10);
        entries[20] = RateLimitEntry(2, 4, 3);
        entries[21] = RateLimitEntry(2, 5, 10);
        entries[22] = RateLimitEntry(2, 6, 10);
        entries[23] = RateLimitEntry(2, 7, 20);

        // RestrictionLevel.Restricted (3): minimal
        entries[24] = RateLimitEntry(3, 0, 5);
        entries[25] = RateLimitEntry(3, 1, 2);
        entries[26] = RateLimitEntry(3, 2, 2);
        entries[27] = RateLimitEntry(3, 3, 0);
        entries[28] = RateLimitEntry(3, 4, 0);
        entries[29] = RateLimitEntry(3, 5, 2);
        entries[30] = RateLimitEntry(3, 6, 2);
        entries[31] = RateLimitEntry(3, 7, 5);

        // RestrictionLevel.Suspended (4): emergency only
        entries[32] = RateLimitEntry(4, 0, 1);
        entries[33] = RateLimitEntry(4, 1, 0);
        entries[34] = RateLimitEntry(4, 2, 0);
        entries[35] = RateLimitEntry(4, 3, 0);
        entries[36] = RateLimitEntry(4, 4, 0);
        entries[37] = RateLimitEntry(4, 5, 0);
        entries[38] = RateLimitEntry(4, 6, 0);
        entries[39] = RateLimitEntry(4, 7, 0);

        // RestrictionLevel.Frozen (5): nothing
        entries[40] = RateLimitEntry(5, 0, 0);
        entries[41] = RateLimitEntry(5, 1, 0);
        entries[42] = RateLimitEntry(5, 2, 0);
        entries[43] = RateLimitEntry(5, 3, 0);
        entries[44] = RateLimitEntry(5, 4, 0);
        entries[45] = RateLimitEntry(5, 5, 0);
        entries[46] = RateLimitEntry(5, 6, 0);
        entries[47] = RateLimitEntry(5, 7, 0);
    }

    /**
     * @notice Severity weight for a given PatternType enum value.
     * @dev    Extracted from SeerAutonomous._handlePattern to shrink runtime bytecode.
     *         PatternType layout (matches contract enum):
     *         0=None, 1=RapidTransfers, 2=CircularTransfers, 3=SelfEndorsement,
     *         4=VoteManipulation, 5=WashTrading, 6=SybilActivity
     */
    function severityFor(uint8 patternIndex) internal pure returns (uint16) {
        if (patternIndex == 1) return 10;
        if (patternIndex == 2) return 30;
        if (patternIndex == 3) return 50;
        if (patternIndex == 4) return 70;
        if (patternIndex == 5) return 80;
        if (patternIndex == 6) return 100;
        return 0;
    }

    /**
     * @notice Evaluate the EnforcementResult for an action given pre-loaded storage values.
     * @dev    Extracted from SeerAutonomous._checkRestrictions to reduce runtime bytecode.
     *         Returns 0=Allowed, 1=Warned, 2=Delayed, 3=Blocked (matches EnforcementResult).
     *         Caller resolves expiry into `effectiveLevel` before invoking.
     * @param effectiveLevel     RestrictionLevel after expiry resolution (0..5).
     * @param frozenLevel        Numeric value of RestrictionLevel.Frozen (5).
     * @param restrictedLevel    Numeric value of RestrictionLevel.Restricted (3).
     * @param suspendedLevel     Numeric value of RestrictionLevel.Suspended (4).
     * @param limit              rateLimits[level][action]
     * @param count              actionCountToday[subject][action]
     */
    function evaluateRestriction(
        uint8 effectiveLevel,
        uint8 frozenLevel,
        uint8 restrictedLevel,
        uint8 suspendedLevel,
        uint16 limit,
        uint16 count
    ) internal pure returns (uint8) {
        if (effectiveLevel == frozenLevel) return 3; // Blocked
        if (limit == 0) {
            return effectiveLevel >= restrictedLevel ? 3 : 0; // Blocked or Allowed
        }
        if (count >= limit) return 3; // Blocked
        if (effectiveLevel == suspendedLevel) return 1; // Warned
        return 0; // Allowed
    }
}

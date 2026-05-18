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
}

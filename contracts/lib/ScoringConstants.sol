// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title ScoringConstants
 * @notice Canonical Seer score thresholds shared across all VFIDE contracts.
 *         All contracts that gate on proof-of-trust scores MUST reference these
 *         constants so thresholds cannot silently diverge between contexts.
 *
 * Scale: 0 – 10 000  (10 000 = 100%)
 */
library ScoringConstants {
    // ── Fee-curve band (ProofScoreBurnRouter) ────────────────────────────────
    /// @dev Scores at or below this value pay the maximum burn fee.
    uint16 internal constant LOW_FEE_FLOOR  = 4000; // 40%

    /// @dev Scores at or above this value pay the minimum burn fee.
    uint16 internal constant HIGH_FEE_CEIL  = 8000; // 80%

    // ── Participation tiers (VFIDETermLoan, general gating) ──────────────────
    /// @dev Minimum score to participate at all (neutral / uninitialized proxy).
    uint16 internal constant NEUTRAL = 5000; // 50%

    /// @dev Tier thresholds for loan / access limits.
    uint16 internal constant TIER_1 = 5000; // 50%
    uint16 internal constant TIER_2 = 6000; // 60%
    uint16 internal constant TIER_3 = 7000; // 70%
    uint16 internal constant TIER_4 = 8000; // 80%

    // ── Domain-specific defaults (mutable per-contract, but defaulted here) ──
    /// @dev Default minimum score required to act as a merchant.
    uint16 internal constant MIN_MERCHANT    = 5600; // 56%

    /// @dev Default minimum score required to vote / propose in governance.
    uint16 internal constant MIN_GOVERNANCE  = 5400; // 54%
}

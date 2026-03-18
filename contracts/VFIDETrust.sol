// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

/**
 * VFIDETrust.sol — Compatibility shim (L-01 Fix: monolith split).
 *
 * The three contracts that lived here have been moved to dedicated files:
 *   - ProofLedger             →  contracts/ProofLedger.sol
 *   - Seer                    →  contracts/Seer.sol
 *   - ProofScoreBurnRouterPlus →  contracts/Seer.sol (co-located with Seer)
 *
 * This file is kept so that existing importers continue to resolve without
 * any changes:
 *   - import "./VFIDETrust.sol"               (BadgeManager.sol wildcard import)
 *   - import { Seer } from "./VFIDETrust.sol" (VFIDEBadgeNFT.sol named import)
 *
 * Solidity re-exports all top-level symbols from import-ed files, so both
 * usage patterns above work transparently via this shim.
 */
import "./ProofLedger.sol";
import "./Seer.sol";

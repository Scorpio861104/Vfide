# Security Dependency Surface

Last updated: 2026-04-12

## Goal
This document explicitly tracks the intended third-party dependency boundary for security-sensitive contracts.

## Contract Import Policy
- Preferred baseline: local interfaces/base primitives from contracts/SharedInterfaces.sol.
- Exception class: protocol integrations requiring upstream inheritance (for example, LayerZero OApp in VFIDEBridge).
- Explicit OpenZeppelin usage is allowed when:
  1. integration inheritance requires it, or
  2. behavior is audited and documented as intentional.

## Current OpenZeppelin-Backed Contracts
- contracts/VFIDEBridge.sol
  - Reason: LayerZero OApp inheritance path and integration requirements.
- contracts/FeeDistributor.sol
  - Reason: AccessControl/Reentrancy/Pausable usage retained intentionally; behavior guarded by timelocks and role checks.
- contracts/SeerWorkAttestation.sol
  - Reason: module-specific role and pausable semantics retained intentionally.
- contracts/ServicePool.sol
  - Reason: pool-level role and pausable semantics retained intentionally.

## Operational Guardrails
- Lock dependency versions through package-lock.json.
- Run dependency auditing in CI (npm audit + allowlist review).
- Keep non-integration contracts on SharedInterfaces-first imports where practical.

## Reviewer Note
This is intentionally documented to avoid ambiguity: the protocol is not OZ-free; it is OZ-minimized with explicit exceptions.

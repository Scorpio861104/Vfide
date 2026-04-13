# Changelog

## 2026-04-13

### Security And Reliability Remediation

- Finalized deep audit remediations across token, vault, escrow, governance, and router flows.
- Added testnet chain guard for the faucet to block deployment on major production chains.
- Enforced timelocked whale-limit exemption application flow and aligned related tests.
- Hardened fee-routing, score fallback, whitelist enforcement, and anti-whale accounting behavior.
- Standardized compiler configuration and interface surface updates for safer operations.

### Release

- Commit: `8e18922e`
- Branch: `main`
- Validation: `hardhat compile` clean; representative Jest regression suite passing.

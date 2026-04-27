# Testnet-Only Contract Set

Contracts in this list are for testnet operations only and must never be deployed or wired in production/mainnet flows.

## Testnet Utilities

- VFIDETestnetFaucet.sol

## Policy

- Keep this list disjoint from PRODUCTION_SET.md.
- Production deployment scripts must enforce chain and flag guards before deploying any contract in this list.
- Any contract moved out of this list requires explicit security review and update to production deployment runbooks.

# Deploy Phase 1 Instructions

**CURRENT METHOD:** Use TypeScript deployment scripts (recommended).  
**LEGACY METHOD:** Solidity deployer contracts (kept for reference; not recommended for production).

## Current Deployment (Recommended)

```bash
npx hardhat run contracts/scripts/deploy-phase1.ts --network <network>
```

This handles all Phase 1 deployments (Token + Security contracts) with proper error handling and gas optimization.

## Prerequisites

1. Admin wallet with sufficient gas (estimate: 0.1 ETH on mainnet)
2. 5 council member addresses (hardware wallets recommended)
3. Price oracle address
4. Lists of emergency pausers, blacklist managers, and config managers
5. Configured `.env` file with network RPC, deployer private key, and addresses

## Legacy Solidity Deployer (Deprecated)

⚠️ **Not recommended for production** — use TypeScript scripts above instead.

The following Solidity deployer contracts exist for reference only and should not be used:
   - `Phase1TokenDeployer` — **LEGACY** (disabled with revert)
   - `Phase1GovernanceDeployer` — outdated
   - `Phase1InfrastructureDeployer` — outdated
   - `Phase1Deployer` — outdated orchestrator

Reason: Solidity deployers cannot safely inject all required constructor parameters (e.g., real DevReserveVestingVault address). TypeScript scripts provide full dependency control and are maintainable.

## Post-deployment

1. Transfer admin role to governance
2. Renounce deployer privileges
3. Set up monitoring and alerts
4. Record final addresses and update frontend

## Security Notes

- Never reuse private keys across networks
- Use hardware wallets for council members
- Keep scripts in version control
- Maintain incident response runbook

# Deploy Phase 1 Instructions

Step-by-step guide for deploying Phase 1 security enhancements.

## Prerequisites

1. Admin wallet with sufficient gas (estimate: 0.1 ETH mainnet)
2. 5 council member addresses (hardware wallets recommended)
3. Price oracle address
4. Lists of emergency pausers, blacklist managers, and config managers

## Deployment Steps

1. Deploy split deployers:
   - `Phase1GovernanceDeployer`
   - `Phase1InfrastructureDeployer`
   - `Phase1TokenDeployer`
   - `Phase1Deployer` (orchestrator)
   - `npx hardhat run scripts/deployPhase1Deployer.ts --network <network>`
2. Call `deployPhase1(...)` on orchestrator with deployer addresses and params:
   - `_governanceDeployer`
   - `_infrastructureDeployer`
   - `_tokenDeployer`
   - `_admin, _council, _priceOracle, _tokenName, _tokenSymbol, _initialSupply`
3. Call `configureContracts(...)`
4. Verify contracts on explorer
5. Test on testnet first, then mainnet

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

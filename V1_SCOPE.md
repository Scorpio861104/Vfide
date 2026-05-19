# VFIDE V1 Scope

## In-Scope Contracts (V1)

| Contract | Status |
|---|---|
| CardBoundVault.sol | ✅ Deployed |
| VaultRecoveryClaim.sol | ✅ Deployed |
| ProofScoreBurnRouter.sol | ✅ Deployed |
| Seer.sol | ✅ Deployed |

## Deferred (V2+)

| Contract | Status |
|---|---|
| TrustScorePassport.sol | 🔜 Planned |
| GovernanceCouncil.sol | 🔜 Planned |
| SanctumVault.sol | 🔜 Planned |

## 7-Tier ProofScore System

| Tier | Label | Min Score | Max Score | Fee Modifier |
|---|---|---|---|---|
| 1 | Risky | 0 | 999 | +2.5% |
| 2 | Low Trust | 1000 | 2999 | +1.5% |
| 3 | Neutral | 3000 | 4999 | base |
| 4 | Governance | 5000 | 5999 | -0.25% |
| 5 | Trusted | 6000 | 6999 | -0.5% |
| 6 | Council | 7000 | 7999 | -0.75% |
| 7 | Elite | 8000 | 10000 | -1.0% |

## Primary Fee Split (ProofScoreBurnRouter)

- 40% → Burned forever
- 10% → Sanctum Fund
- 50% → Ecosystem rewards

## Audit Requirements

- [ ] Certik or Halborn audit of all V1 contracts
- [ ] Bug bounty program established
- [ ] Admin key transfer to multisig

## V1 Complete Definition

V1 is complete when:
1. All in-scope contracts audited and deployed to mainnet
2. Frontend fully wired to on-chain data (no mock data)
3. Guardian recovery flow tested end-to-end
4. ProofScore 7-tier system live on all UI surfaces
5. Fee flow verified on-chain (40/10/50 split)

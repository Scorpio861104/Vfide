# VFIDE Base Sepolia Deployment

**Chain ID:** 84532
**RPC:** https://sepolia.base.org
**Deployer:** 0x5473c147f55Bc49544Af42FB1814bA823ecf1eED
**Date:** $(date)

## Core Infrastructure
| Contract | Address |
|----------|---------|
| VFIDEToken | 0xf57992ab9F8887650C2a220A34fe86ebD00c02f5 |
| VFIDEPresale | 0x89aefb047B6CB2bB302FE2734DDa452985eF1658 |
| VaultHubLite | 0x1508fa7D70A88F3c5E89d3a82f668cD92Fa902B5 |
| Seer | 0x90b672C009F0F16201E7bE2c6696d1c375d28422 |
| SecurityHub | 0x977e54d9f5668703F9f3416c8AE8Ce8597637840 |
| ProofLedger | 0xd256462c479489fd674df7df80d13cb8e80face0 |
| StablecoinRegistry | 0x0Ca218c43619D7Ad0054944eB00F4591d8B109d8 |

## Governance
| Contract | Address |
|----------|---------|
| DAOTimelock | 0x9fA83803954F567725846fF965F6aa18616fC046 |
| DAO | 0xA462F4C2825f48545a9217FD65B7eB621ea8b507 |
| CouncilElection | 0xFCF7477B9e295D9E0d6A9745B27305C912a4d7Ad |
| CouncilSalary | 0xea4A0c3bC20353F95F9A2aca9d7ce2862b1eFBfF |
| CouncilManager | 0x5aC51E7389e7812209c33f7000b4571a0F43Ba46 |
| GovernanceHooks | (deployed with DAO) |

## Commerce
| Contract | Address |
|----------|---------|
| MerchantPortal | 0x62Be75642b9334a5276a733c5E40B91eD8a6055d |
| VFIDECommerce | 0x7637455897FabeE627ba56D10965A73ad7FddadC |
| EscrowManager | 0xB8bBFEDe7C4dDe4369eEA17EA5BB2b2e0dFB54DC |
| SubscriptionManager | 0x72a40D5462234a5698312Ccdd4E17Fef3825555e |
| MainstreamPayments | 0xDDac2A130D4757772f6498E2778444298B2A5347 |
| VFIDEEnterpriseGateway | 0x414290b4FC7c6b4061CBAc7Eb0e3Edb2D144BBbc |

## Treasury & Vaults
| Contract | Address |
|----------|---------|
| EcosystemVault | 0x0E4877ba1db2eB1989A0b9f837a027489e38f37D |
| SanctumVault | 0xB2A6f200E91eC84a1989850433c792821aed6581 |
| TempVault | 0xEaded187a94C8dac74DB3B8373d9b29734ca67BB |
| DevReserveVestingVault | 0xB175f409047f9986A789E48BD7fAe840C7272036 |
| PromotionalTreasury | 0x14Dfb43f0C583b1B29D403748169Bf9277AB9f2A |
| RevenueSplitter | 0x1636418cB9b5a49cab3ce6b4788f2B7bFDEAD0Ad |

## Utility
| Contract | Address |
|----------|---------|
| PayrollManager | 0xECb88C011c883d1b92ED2A517De47D8DDfA32236 |
| LiquidityIncentives | 0x6CEcd19559272F6Ea19CbB1477559D068CAF09dc |
| EmergencyControl | 0xc67eE1DAc155bDc0F1728feCa17729Cd1073569C |
| DutyDistributor | 0x666e74A0B9061dbe1E9c1c6fF47920e307a10645 |
| ProofScoreBurnRouter | 0x73ca9633288D022935c60B22A28f181384F4610c |
| VFIDEFinance | 0x7c8B50241ff238BABB6afB1b32871Ed10b9fb3F6 |
| VFIDEBenefits | 0x973f1aEB38EFF394F517e335C9395A75c8aF9754 |

## Admin
| Contract | Address |
|----------|---------|
| OwnerControlPanel | 0x62E983d6E9134B14B90494c0E361FbB45dc4Ad78 |
| SystemHandover | 0x959c97E101afE9419F66A4EC56c965D844D8e208 |

## Libraries/Not Deployed
- BadgeRegistry (library): 0x0B0C2a90838e707C44903e94E8481cE9637cc4d8
- BadgeManager: Requires library linking at compile-time
- VFIDEBadgeNFT: Requires library linking at compile-time
- VaultInfrastructure: Too large (58KB > 24KB limit), replaced by VaultHubLite

## Total Deployed: 32 contracts

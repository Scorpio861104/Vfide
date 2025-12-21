# Deployment Instructions

The deployment script `script/Deploy.s.sol` has been fixed and is ready for use. It orchestrates the deployment of the entire VFIDE ecosystem in the correct order to handle circular dependencies.

## Prerequisites

- **Foundry**: Ensure you have Foundry installed (`forge`, `cast`).
- **Private Key**: You need a private key with funds on the target network.
- **RPC URL**: You need an RPC URL for the target network (e.g., zkSync Era, Sepolia, etc.).

## Deployment Steps

1.  **Set Environment Variables**:
    Create a `.env` file in the root directory (if not already present) or export variables in your terminal:
    ```bash
    export PRIVATE_KEY=your_private_key_here
    export RPC_URL=your_rpc_url_here
    export ETHERSCAN_API_KEY=your_etherscan_key_here # Optional, for verification
    ```

2.  **Run Deployment Script**:
    Run the following command to deploy to the network:
    ```bash
    forge script script/Deploy.s.sol --rpc-url $RPC_URL --broadcast --verify
    ```
    *   `--broadcast`: Broadcasts the transactions to the network.
    *   `--verify`: Verifies the contracts on Etherscan/Block explorer (requires API key).

3.  **Post-Deployment**:
    The script will output the addresses of the deployed contracts. Save these addresses!
    The script automatically wires up the modules:
    *   **Seer** is connected to Ledger, Hub, and Token.
    *   **PanicGuard** is connected to Hub.
    *   **Token** is connected to SecurityHub.
    *   **DevReserveVestingVault** is initialized with the Token and Presale addresses.

---

## Critical Post-Deployment Configuration

### Exchange Whitelisting & Vault-Only Setup

**IMPORTANT**: VFIDEToken deploys with `vaultOnly = false` for flexibility. You must configure exchange access before enabling vault-only mode.

#### Default State After Deployment:
- `vaultOnly = false` (vault enforcement OFF)
- `policyLocked = false` (owner can toggle vault-only)
- Owner has full configuration control

#### Balance-Based Exchange Exemption

The token uses a **balance-based exemption system**:
- Contracts with `balance > 0` are automatically exempt from vault-only rules
- First deposit to any exchange requires one-time whitelist
- After that, exchange operates forever (no ongoing maintenance)

#### Step 1: Whitelist Exchanges (Before Adding Liquidity)

Use the owner function:
```solidity
function whitelistSystemContract(address addr, bool status) external onlyOwner
```

**Example - Uniswap V2:**
```javascript
const token = await ethers.getContractAt("VFIDEToken", TOKEN_ADDRESS);

// Get pair address (created by factory)
const factory = await ethers.getContractAt("IUniswapV2Factory", FACTORY_ADDRESS);
const pair = await factory.getPair(token.address, WETH_ADDRESS);

// Whitelist pair for initial deposit
await token.whitelistSystemContract(pair, true);

// Optional: Whitelist router for direct interactions
await token.whitelistSystemContract(ROUTER_ADDRESS, true);
```

**For Multiple Exchanges:**
```javascript
const exchanges = [
  uniswapV2Pair,     // Uniswap VFIDE/ETH
  sushiswapPair,     // SushiSwap VFIDE/USDC  
  pancakePair,       // PancakeSwap pair
  cexHotWallet,      // Centralized exchange deposit address
];

for (const exchange of exchanges) {
  await token.whitelistSystemContract(exchange, true);
  console.log(`Whitelisted: ${exchange}`);
}
```

#### Step 2: Add Initial Liquidity

```javascript
// Now safe to add liquidity (pairs are whitelisted)
await router.addLiquidity(
    token.address,
    weth.address,
    tokenAmount,
    ethAmount,
    minToken,
    minEth,
    deployer.address,
    deadline
);

// After this: pair has balance > 0 → permanently auto-exempt
```

#### Step 3: Enable Vault-Only Mode (Recommended)

After all exchanges have been funded:
```javascript
// Enable vault-only enforcement for user protection
await token.setVaultOnly(true);

// Now:
// ✅ Exchanges work automatically (have balance > 0)
// ✅ Users must use vaults (EOA→EOA blocked)
// ✅ Recovery/ProofScore features active
// ✅ No further whitelisting needed
```

#### Step 4: Lock Policy (Optional - Permanent)

Make vault-only enforcement permanent:
```javascript
// WARNING: This is IRREVERSIBLE!
await token.lockPolicy();

// After locking:
// - Vault-only can never be disabled
// - Provides maximum security guarantee
// - Only do this when 100% certain
```

#### Common Exchange Scenarios

**Centralized Exchange (CEX) Listing:**
```javascript
// 1. Get CEX deposit/hot wallet address from exchange
const cexWallet = "0x...";

// 2. Whitelist for first deposit
await token.whitelistSystemContract(cexWallet, true);

// 3. First user deposits → CEX wallet gets balance
// 4. All future deposits work automatically (balance > 0)
```

**New DEX After Launch:**
```javascript
// Same process - whitelist, add liquidity, done
const newPair = await newFactory.createPair(token.address, otherToken);
await token.whitelistSystemContract(newPair, true);
await newRouter.addLiquidity(...);
// Works forever now
```

#### Emergency Functions

**Disable Vault-Only (if not locked):**
```javascript
// Emergency: Temporarily disable enforcement
await token.setVaultOnly(false);
// Only works if policyLocked = false
```

**Remove Whitelist Entry:**
```javascript
// Optional cleanup after exchange has balance
await token.whitelistSystemContract(exchange, false);
// Exchange still works (balance-based exemption)
```

#### Configuration Checklist

**Before Enabling Vault-Only:**
- [ ] List all DEX pairs needing liquidity
- [ ] List all CEX hot wallet addresses  
- [ ] Whitelist all exchange addresses
- [ ] Add liquidity to all DEXs
- [ ] Verify all exchanges have balance > 0
- [ ] Test swaps work on each DEX

**After Vault-Only Enabled:**
- [ ] Test: User cannot transfer EOA→EOA (should revert)
- [ ] Test: DEX swaps work normally
- [ ] Test: Vault→Vault transfers work
- [ ] Test: Vault→DEX and DEX→Vault work
- [ ] Consider: Lock policy for permanent enforcement

---

## DAO Handover - Progressive Decentralization

### Overview

The **Owner Control Panel** (`/admin`) provides centralized control for initial setup. After the system is stable and community-tested, ownership should be transferred to the **DAO Timelock** for decentralized governance.

### Why DAO Handover?

1. **Decentralization**: Community controls protocol, not single entity
2. **Trust**: No single point of failure or censorship
3. **Transparency**: All changes require public proposals and voting
4. **Security**: Timelock delays prevent hasty/malicious changes
5. **Legitimacy**: True DeFi requires community ownership

### Timeline Strategy

#### Phase 1: Centralized Launch (Weeks 1-4)
**Owner Control: Full**
- Deploy all contracts
- Configure modules (VaultHub, SecurityHub, etc.)
- Whitelist initial exchanges
- Add liquidity to DEXs
- Enable vault-only mode
- Monitor for bugs/issues
- Quick fixes if needed

**Goals:**
- System stability verified
- No critical bugs
- Exchange integrations working
- User vaults functioning
- ProofScore system operational

#### Phase 2: Community Testing (Weeks 5-12)
**Owner Control: Limited**
- Community uses system
- DAO proposals can be created (but owner still executes)
- Council elections begin
- ProofScore accumulation
- Badge system active
- Treasury accumulating fees

**Goals:**
- Build community trust
- Test governance system
- Identify edge cases
- Train community on proposals
- Establish council

#### Phase 3: Progressive Decentralization (Weeks 13-24)
**Owner Control: Shared**
- Owner can still intervene for emergencies
- DAO handles non-critical decisions
- Council makes operational choices
- Gradual reduction of owner actions

**Goals:**
- Prove DAO can govern effectively
- Build confidence in timelock system
- Community becomes self-sufficient
- Emergency procedures tested

#### Phase 4: Full DAO Control (Week 25+)
**Owner Control: NONE**
- Transfer ownership to DAO Timelock
- All changes require proposals + voting + timelock
- Community fully autonomous
- Owner becomes regular participant

**Goals:**
- True decentralization achieved
- Protocol is unstoppable
- Community owns future

### Handover Process

#### Pre-Handover Checklist

**Technical:**
- [ ] All contracts deployed and verified on explorer
- [ ] All modules connected (VaultHub, SecurityHub, Ledger, BurnRouter)
- [ ] Exchanges whitelisted and operational
- [ ] Vault-only mode enabled and tested
- [ ] Policy locked (if permanent enforcement desired)
- [ ] Treasury/Sanctum sinks configured
- [ ] Presale contract set (if applicable)
- [ ] No critical bugs or exploits

**Governance:**
- [ ] DAO contract deployed and operational
- [ ] DAOTimelock deployed with appropriate delay (e.g., 2-7 days)
- [ ] Council system functioning
- [ ] ProofScore system calculating correctly
- [ ] At least 5-10 successful DAO proposals executed
- [ ] Community understands governance process
- [ ] Emergency procedures documented

**Community:**
- [ ] Active community of voters
- [ ] Multiple council members elected
- [ ] Distributed ProofScore (not concentrated in few wallets)
- [ ] Documentation complete and accessible
- [ ] Support channels operational
- [ ] Multiple guardians appointed

#### Ownership Transfer Steps

**1. Announce Intent (2-4 weeks before)**
```markdown
Community announcement:
- Date of ownership transfer
- What changes (owner → DAO Timelock)
- How to participate in governance
- Emergency contacts
- Reassurance about system stability
```

**2. Final System Verification**
```javascript
// Verify all module addresses are correct
const vaultHub = await token.vaultHub();
const securityHub = await token.securityHub();
const ledger = await token.ledger();
const burnRouter = await token.burnRouter();
// etc... verify all are non-zero and correct

// Verify DAO Timelock is ready
const timelock = await dao.timelock();
const delay = await timelockContract.delay(); // Should be 2-7 days
```

**3. Execute Transfer (Use Admin Panel)**
```javascript
// Navigate to /admin
// Scroll to "👑 Ownership Transfer" section
// Enter DAO Timelock address (NOT DAO contract itself!)
// Confirm warnings
// Execute transaction

// OR via contract call:
await token.transferOwnership(TIMELOCK_ADDRESS);
```

**4. Verify Transfer**
```javascript
const newOwner = await token.owner();
console.log(newOwner === TIMELOCK_ADDRESS); // Should be true
```

**5. Test DAO Control**
```javascript
// Create a test proposal to change something minor
const proposal = await dao.createProposal(
    token.address, // target
    0, // value
    token.interface.encodeFunctionData('setCircuitBreaker', [false]), // data
    'Test DAO control of token contract'
);

// Vote on it
// Wait for timelock delay
// Execute it
// Verify change happened
```

#### Post-Handover Operations

**All owner functions now require DAO proposals:**

```solidity
// Example: Whitelist new exchange
// 1. Create proposal
dao.createProposal(
    tokenAddress,
    0, // no ETH
    abi.encodeWithSignature("whitelistSystemContract(address,bool)", exchangeAddress, true),
    "Whitelist Uniswap V3 VFIDE/USDC pool"
);

// 2. Community votes (3-7 days)
// Users call: dao.vote(proposalId, true/false)

// 3. After voting ends, queue in timelock
dao.queueProposal(proposalId);

// 4. After timelock delay (2-7 days), execute
dao.executeProposal(proposalId);
```

**Functions now governed by DAO:**
- `whitelistSystemContract()` - Exchange whitelisting
- `setVaultOnly()` - Vault enforcement toggle
- `setCircuitBreaker()` - Emergency mode
- `setSystemExempt()` - System exemptions
- `setBlacklist()` - Blacklist management
- `setVaultHub()` - Module updates
- `setSecurityHub()` - Module updates
- `setLedger()` - Module updates
- `setBurnRouter()` - Fee configuration
- `setTreasurySink()` - Treasury address
- `setSanctumSink()` - Sanctum address
- `setPresaleContract()` - Presale configuration

**Emergency Procedures:**

If owner has transferred to DAO but emergency arises:
1. Create emergency proposal (if DAO is functional)
2. Fast-track voting (if enabled in DAO)
3. Community guardians can activate PanicGuard
4. Circuit breaker already available via SecurityHub
5. Council can make rapid decisions (if delegated authority)

**Best Practice: Gradual Transfer with Multisig**

The recommended path uses a **3/5 multisig** as an intermediate step:

#### Stage 1: Owner → 8/12 Multisig (Security Buffer)

**Why Multisig First?**
- ✅ Prevents single point of failure
- ✅ Requires 8 of 12 trusted members to execute changes (60% threshold)
- ✅ Removed members immediately lose access (on-chain enforcement)
- ✅ Faster than full DAO governance
- ✅ Still decentralized but manageable
- ✅ Can react quickly to emergencies
- ✅ Can tolerate up to 4 compromised members

**Setup 8/12 Multisig:**

**Option A: Gnosis Safe (Recommended)**
```javascript
// Deploy Gnosis Safe with 12 owners, 8 signatures required (60%)
// https://app.safe.global/

Owners (example):
1. 0x... (Founder)
2. 0x... (Core Dev 1)
3. 0x... (Core Dev 2)
4. 0x... (Core Dev 3)
5. 0x... (Community Member 1)
6. 0x... (Community Member 2)
7. 0x... (Community Member 3)
8. 0x... (Community Member 4)
9. 0x... (Council Member 1)
10. 0x... (Council Member 2)
11. 0x... (Council Member 3)
12. 0x... (Council Member 4)

Threshold: 8 of 12 signatures required (60%)

// Transfer token ownership to Safe
await token.transferOwnership(SAFE_ADDRESS);

// Now all owner functions require 3/5 approval:
// - Exchange whitelisting
// - Vault-only toggle
// - Module updates
// - Burn policy changes
// - etc.
```

**Option B: Custom Multisig Contract**
```solidity
// Use contracts/SystemHandover.sol or custom implementation
// Set devMultisig to multisig address
```

**Multisig Access Control:**
```javascript
// ✅ Member has access while in multisig
// ❌ Member removed from multisig → immediate access loss
// ✅ 8/12 signatures required for ANY change (60% threshold)
// ✅ Each member can propose, but 8 must approve
// ✅ Transparent on-chain (all proposals visible)
// ✅ Can tolerate 4 unavailable/compromised members
```

**Test Multisig (1-3 months):**
1. Execute test whitelisting (requires 8 sigs)
2. Try module update (requires 8 sigs)
3. Simulate member removal (they lose access immediately)
4. Test emergency circuit breaker
5. Verify timelock delays work
6. Practice proposal workflow
7. Test with some members unavailable (still works with 8/12)

#### Stage 2: Multisig → DAO Timelock (Full Decentralization)

After multisig proves stable:

```javascript
// Multisig members vote (3/5 required) to transfer to DAO
await multisig.executeTransaction(
    token.address,
    0,
    token.interface.encodeFunctionData('transferOwnership', [DAO_TIMELOCK_ADDRESS])
);

// Now ownership chain:
// DAO Timelock (owns token)
//   ↳ DAO Contract (controls timelock)
//     ↳ Community (controls DAO via proposals)
```

**Security Guarantees:**

**Multisig Phase (8/12 voting - 60% threshold):**
- Minimum 8 signatures required for any action (60% majority)
- No minority group can execute alone (need supermajority)
- Removed member loses access immediately (on-chain)
- Up to 4 compromised keys = safe (still need 8 total)
- Transparent execution (all txs visible)
- Balanced: Not too centralized (need 8) but achievable (67% participation)

**DAO Phase (Community voting):**
- ProofScore-weighted voting
- Timelock delay (2-7 days)
- Council oversight
- Full transparency
- Unstoppable protocol

**Member Removal Process:**

**In Multisig:**
```javascript
// Via Gnosis Safe UI or contract:
1. Propose: Remove member X, add member Y
2. Get 8/12 signatures (60% approval)
3. Execute
4. Member X immediately loses access
5. Member Y immediately gains access

// Or adjust threshold:
1. Propose: Change threshold (e.g., 8/12 to 9/12)
2. Get 8/12 signatures
3. Execute

// Emergency: Remove compromised member
1. Detect compromised member
2. Propose immediate removal
3. Get 8 signatures from remaining 11 members
4. Execute → compromised member locked out
```

**Access Control Matrix:**

| Phase | Controller | Votes Needed | Member Removal | Speed |
|-------|-----------|--------------|----------------|-------|
| Launch | Single Owner | 1 | N/A | Instant |
| Multisig | 8/12 Signers | 8/12 (60%) | Immediate | Minutes-Hours |
| DAO | Community | Quorum + 60% | Via proposal | 3-7 Days |

**Emergency Scenarios:**

**Multisig Member Compromised:**
```
1. 8 other members immediately propose removal
2. Execute removal (requires 8/12, compromised member cannot block)
3. Compromised member locked out

Example:
- 1 member compromised
- 11 honest members remain
- Need 8 signatures → easily achieved
- Compromised member cannot prevent removal
```

**Optimal Configuration (Current: 8/12):**
- **8/12 multisig** (8 signatures required from 12 members = 60%)
  - Can tolerate 4 unavailable/compromised members
  - Requires supermajority (more than 50%)
  - Balanced: Not too strict (prevents gridlock) but secure (need majority)
  - Resilient: Works even if 1/3 of members unavailable

**Recommended Timeline:**

```
Week 0:  Deploy with single owner
Week 1:  Transfer to 8/12 multisig (security upgrade, 60% threshold)
Week 2:  Multisig manages exchanges, policies
Week 8:  Community governance testing begins
Week 12: Test member removal/addition (verify 8/12 works)
Week 24: Multisig transfers to DAO Timelock (full decentralization)
```

**Code Example - Full Flow:**

```javascript
// 1. Deploy token (owner = deployer)
const token = await VFIDEToken.deploy(...);

// 2. Setup and test (1-2 weeks)
await token.whitelistSystemContract(exchange1, true);
await token.setVaultOnly(true);
// ... configure everything

// 3. Transfer to multisig (8/12 Gnosis Safe, 60% threshold)
await token.transferOwnership(GNOSIS_SAFE_ADDRESS);
console.log("✅ Ownership transferred to 8/12 multisig (60% threshold)");

// 4. Multisig period (3-6 months)
// All changes now require 8/12 signatures via Gnosis Safe UI

// 5. Deploy DAO infrastructure
const dao = await DAO.deploy(...);
const timelock = await DAOTimelock.deploy(...);

// 6. Transfer from multisig to DAO Timelock
// (requires 8/12 multisig signatures via Safe UI)
const transferTx = await token.populateTransaction.transferOwnership(timelock.address);
// Submit to Gnosis Safe, get 8/12 signatures (60%), execute

console.log("✅ Full decentralization achieved");
```

---

## Troubleshooting

*   **"Identifier already declared"**: This issue has been resolved by refactoring shared interfaces into `contracts/SharedInterfaces.sol`. If you see this, ensure you are using the latest version of the code.
*   **Gas Issues**: If deployment fails due to gas, try increasing the gas limit or price in `foundry.toml` or via command line flags.

## Verification

After deployment, you can verify the state of the system by checking:
*   **Token Supply**: Should be 40,000,000 (Dev Reserve) initially.
*   **Ownership**: Contracts should be owned by the deployer (or DAO if transferred).
*   **Wiring**: Check `vaultHub`, `securityHub`, etc. on the Token contract to ensure they match the deployed addresses.

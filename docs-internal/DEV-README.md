# Vfide

## zkSync Testing Tools: Quick Install

Run this once to install all zkSync Era testing tools (zksolc, zkvyper, Hardhat plugins, Foundry, and the local Era test node helper):

```bash
bash scripts/install-zksync-tools.sh
```

After installation:
- Compile (EVM): `npx hardhat compile`
- Compile (zkSync binary): `npx hardhat compile --network zkSyncSepoliaTestnet`
- Run zkSync tests: `npm run test:zksync`
- Start local Era node: `era_test_node --dev`

Quick verify everything works:

```bash
bash scripts/verify-zksync.sh
```

Local development against zkSync node
- Start node: `npm run zksync:node`
- Compile locally: `npm run compile:zk:local`
- Test locally: `npm run test:zk:local`

### Sample zkSync Test
Added `test/zksync/VFIDEToken.zk.test.js` which:
- Always validates artifact compile.
- Attempts deployment only if running on a zkSync network AND `PRIVATE_KEY` is set.
Set `PRIVATE_KEY` for real deployment testing:
```bash
export PRIVATE_KEY=0xabc123...
npm run test:zksync
```

### CI Workflow
GitHub Actions workflow: `.github/workflows/zksync-toolchain.yml` runs:
- `npm run compile:zk` (testnet compile)
- `npm run verify:zksync` (EVM + zkSync compiles)
- Partial test grep (skips deploy without key)
- Contract size task
 - Short Foundry fuzz
 - Brief `forge coverage` (soft-fail)
 - `forge snapshot` (soft-fail)
 - `npm run coverage` (solidity-coverage) + uploads
 - Soft coverage threshold check (`coverage:check`)

### Fast vs Full Tests
For quick iteration, the default `npm test` runs in FAST mode and skips heavy archive suites. Use:

```bash
# Fast (skips exhaustive archive tests)
npm test

# Full (runs everything, slower)
npm run test:full

# Coverage with fast suite
npm run coverage:fast

# Coverage full
npm run coverage
```
You can also toggle via env var: `FAST_TESTS=1 npx hardhat test`.

### Deprecated Plugin Removed
Removed `@matterlabs/hardhat-zksync-chai-matchers` since Hardhat toolbox covers chai matchers.

### Contract Verification (zkSync)
To enable zkSync verification tasks, set an environment flag before running the verify scripts:
```bash
export ZKSYNC_VERIFY=1
# Ledger
export LEDGER_ADDRESS=0xledger...
export DAO_ADDRESS=0xdao...
npm run verify:zk:ledger

# Token
export TOKEN_ADDRESS=0xtoken...
export DEV_VESTING_VAULT=0xvault...
export VAULT_HUB=0xhub...
export LEDGER=0xledger...
export TREASURY_SINK=0xtreasury...
npm run verify:zk:token
```
If you need API keys or custom explorer endpoints, export them similarly (see plugin docs).

### Foundry zkSync & Fuzzing
Fuzz/invariant harness: `test/foundry/zk/VFIDETokenFuzz.t.sol`.
Short run locally:
```bash
FOUNDRY_PROFILE=fuzz forge test --match-contract VFIDETokenFuzz --fuzz-runs 1000
```
Experimental zkSync compilation (requires foundry-zksync extension):
```bash
FOUNDRY_PROFILE=zksync forge build
```

### Gas Reporting (zkSync tuning)
Override assumed zkSync gas price:
```bash
export ZKSYNC_GAS_PRICE_GWEI=0.3
export GAS_REPORT=1
npm test
```
`hardhat.config.js` uses `ZKSYNC_GAS_PRICE_GWEI` (default 0.25) for consistent cost display.

### Formatting (Solidity)
We include Prettier with the Solidity plugin.

Install (already in `package.json` devDependencies):
```bash
npm ci
```
Format contracts:
```bash
npm run format
```

### Docs (solidity-docgen)
Generate Solidity API docs into `docs/`:
```bash
npm run docgen
```

### Advanced Tooling
- Echidna invariants:
```bash
npm run echidna
```
- Mythril static scan (Docker image):
```bash
npm run mythril:token
```
- Medusa property testing (if installed):
```bash
npm run medusa
```

### Deploy Example (ProofLedger)
A ready-to-use zkSync deploy script is provided at `deploy/deploy-ledger.js`.
Environment:
```bash
export PRIVATE_KEY=0xabc...        # funded on zkSync Sepolia
# optional override (defaults to deployer address)
export DAO_ADDRESS=0xdao...
```
Run:
```bash
npm run deploy:zk:ledger
```

### Deploy Example (VFIDEToken)
This script can use a test-only mock vesting vault if none is provided.
For production, set all addresses explicitly.

Environment:
```bash
export PRIVATE_KEY=0xabc...           # funded on zkSync Sepolia
export DEV_VESTING_VAULT=0xvault...   # optional; if omitted, mock is deployed
export VAULT_HUB=0xhub...             # optional (can be 0x0 and set later)
export LEDGER=0xledger...             # optional
export TREASURY_SINK=0xtreasury...    # optional
```
Run:
```bash
npm run deploy:zk:token
```

### Combined Deploy & Registry
The repository records deployments per network under `deployments/<network>.json` with constructor args for verification.

One-shot deploy for both Ledger and Token:
```bash
export PRIVATE_KEY=0xabc...
# optional overrides: DAO_ADDRESS, DEV_VESTING_VAULT, VAULT_HUB, LEDGER, TREASURY_SINK
npm run deploy:zk:all
cat deployments/zkSyncSepoliaTestnet.json
```

### Verify All from Registry
Enable verify plugin and use the recorded constructor args:
```bash
export ZKSYNC_VERIFY=1
npm run verify:zk:all
```

### One-Liner: Deploy + Verify Everything
This sets `ZKSYNC_VERIFY=1`, deploys Ledger and Token, records the registry, then verifies all:
```bash
export PRIVATE_KEY=0xabc...
npm run deploy:zk:all:verify
cat deployments/zkSyncSepoliaTestnet.json
```

### Differential Testing (Skeleton)
We provide a practical diff workflow that deploys the same contracts and compares outputs.

Capture baseline on each network:
```bash
# EVM (Hardhat)
npm run diff:evm

# zkSync Sepolia (requires funded PRIVATE_KEY)
export PRIVATE_KEY=0x...
npm run diff:zk
```

Compare results:
```bash
npm run diff:compare
# or run all at once
npm run diff:all
```
Outputs are written to `diff-out/<network>.json`. By default, `diff:compare` compares `hardhat` vs `zkSyncSepoliaTestnet`; override with env:
```bash
DIFF_EVM_NET=hardhat DIFF_ZK_NET=zkLocal npm run diff:compare
```

#### Scenario Diff (with transfers)
Runs a simple scenario where a test vault withdraws a small token amount to the deployer and compares deltas across networks.
```bash
# EVM
npm run diff:scenario:evm
# zkSync
export PRIVATE_KEY=0x...
npm run diff:scenario:zk
# Compare
npm run diff:scenario:compare
# Or all-in-one
npm run diff:scenario:all
```

### Full-Trip Test Runner
Run the complete test pipeline (EVM compile/tests, coverage, optional zkLocal tests, Foundry fuzz, diff capture/compare, gas, size, lint/format):
```bash
bash scripts/full-trip.sh
```
Notes:
- To include zkLocal tests, start the node first:
	```bash
	docker run --pull=always -it -p 8011:8011 -p 8545:8545 matterlabs/era-test-node:latest
	```
- To include zk diff capture/compare, export a funded key:
	```bash
	export PRIVATE_KEY=0x...
	```
 - The CI workflow `full-trip.yml` runs the same pipeline and uploads coverage, diff, gas, surya, and docs artifacts.

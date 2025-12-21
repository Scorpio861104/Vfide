# Test Suite Runner - How to Use

## Quick Start

### Option 1: Python Runner (Recommended)
```bash
cd /workspaces/Vfide
python3 run_tests.py
```

**Features:**
- ✅ Runs all 14 tests sequentially (one at a time)
- ✅ Better error handling and timeouts
- ✅ Saves results to `test_results.json`
- ✅ Shows timing metrics
- ✅ Handles missing test files gracefully

### Option 2: Bash Runner
```bash
cd /workspaces/Vfide
bash run_all_tests.sh
```

### Option 3: Run Individual Test Suite
```bash
# Run just one test
forge test --match-path "test/foundry/Trust.t.sol" -v

# Run with fuzz testing (1000 runs per fuzz test)
forge test --match-path "test/foundry/VFIDETokenSimple.t.sol" -v --fuzz-runs=1000
```

## The 14 Test Suites

| # | Test Suite | Contract | Purpose |
|---|---|---|---|
| 1 | AuditFixes | All | Verify security fixes implementation |
| 2 | CouncilElection | DAO/Governance | Council voting mechanisms |
| 3 | DAO | DAO Core | Governance voting & proposals |
| 4 | DAOTimelock | DAOTimelockV2 | Delayed execution security |
| 5 | DevReserveVestingVault | DevReserveVestingVault | Token vesting logic |
| 6 | EmergencyControl | SecurityHub | Emergency halt mechanisms |
| 7 | Finance | Finance/Treasury | Financial calculations |
| 8 | GovernanceHooks | Governance | Hook system integration |
| 9 | MerchantPortal | Commerce | Merchant registry & operations |
| 10 | SanctumVault | Treasury | Treasury management |
| 11 | SystemHandover | System | System transition/migration |
| 12 | Trust | Seer/Trust | ProofScore reputation system |
| 13 | VFIDECommerce | Commerce | Commerce/escrow system |
| 14 | VFIDEFinance | Finance | Financial operations |
| 15 | VFIDEPresale | VFIDEPresale | Presale token distribution |
| 16 | VFIDETokenSimple | VFIDEToken | Token mechanics & transfers |
| 17 | VaultInfrastructure | VaultInfrastructure | User vault creation & mgmt |

## Expected Output

```
======================================================================
║  Master Test Suite Runner - Sequential Execution
║  Running 14 test suites...
======================================================================

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[1/14] Running: test/foundry/AuditFixes.t.sol
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ PASSED: test/foundry/AuditFixes.t.sol

[2/14] Running: test/foundry/CouncilElection.t.sol
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ PASSED: test/foundry/CouncilElection.t.sol

... (continuing for all 14 tests)

======================================================================
║  Test Summary
======================================================================
  Total:   14
  Passed:  14 ✅
  Failed:  0 ❌
  Skipped: 0 ⚠️
  Time:    285.42s
======================================================================

🎉 All tests passed!

📊 Results saved to: test_results.json
```

## Analyzing Results

### View Results JSON
```bash
cat test_results.json | jq .
```

### Check Specific Test
```bash
jq '.results."test/foundry/Trust.t.sol"' test_results.json
```

## Advanced Options

### Run with Coverage
```bash
forge test --match-path "test/foundry/Trust.t.sol" --cov --cov-report html
```

### Run with Gas Report
```bash
forge test --match-path "test/foundry/VFIDETokenSimple.t.sol" --gas-report
```

### Run Specific Test Function
```bash
forge test --match-path "test/foundry/Trust.t.sol" --match testSetScore -v
```

## Troubleshooting

### Issue: Tests timeout
**Solution:** Increase timeout in `run_tests.py` (default 300s = 5 min)

### Issue: Out of memory
**Solution:** Run tests one at a time instead of all together

### Issue: Compilation errors
**Solution:** Run `forge build` first to verify contracts compile

```bash
forge build
```

## CI/CD Integration

For GitHub Actions, add to `.github/workflows/test.yml`:
```yaml
- name: Run all test suites
  run: python3 run_tests.py
```

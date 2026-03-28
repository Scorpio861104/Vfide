# Testnet VFIDE Provisioning For Testers

This flow replaces the old presale-based tester allocation.

VFIDE is fixed-supply and vault-only aware, so tester funding should go to each tester's vault address.

The provisioning script does the following:

1. Reads tester addresses from a CSV flag or file.
2. Checks/creates each tester vault through VaultHub.
3. Tops each tester vault up to a target VFIDE balance.

## Inputs

- `RPC_URL` or `--rpc-url`
- `PRIVATE_KEY` or `--private-key` (distributor wallet with VFIDE balance)
- `VFIDE_TOKEN_ADDRESS` or `--token`
- `VAULT_HUB_ADDRESS` or `--vault-hub`
- Tester list from one of:
  - `--testers "0xabc...,0xdef..."`
  - `--testers-file ./path/to/testers.txt`
  - `TESTER_ADDRESSES`
  - `TESTER_ADDRESSES_FILE`

Optional:

- `--amount 1000` target balance per tester vault (default: `1000`)
- `--decimals 18` override token decimals (auto-read by default)
- `--max 50` only process first N testers
- `--force-transfer` transfer full amount even when tester already has enough
- `--from 0x...` distributor address for dry-run when `PRIVATE_KEY` is not provided

## Dry Run

```bash
npm run -s testnet:vfide:provision:dry-run -- \
  --rpc-url https://your-testnet-rpc \
  --token 0xYourVFIDEToken \
  --vault-hub 0xYourVaultHub \
  --testers-file ./testers.txt \
  --amount 1000
```

Dry-run prints encoded calls for vault creation and transfers.

## Live Execution

```bash
PRIVATE_KEY=0x... npm run -s testnet:vfide:provision -- \
  --rpc-url https://your-testnet-rpc \
  --token 0xYourVFIDEToken \
  --vault-hub 0xYourVaultHub \
  --testers-file ./testers.txt \
  --amount 1000
```

## Notes

- Distributor wallet should hold enough VFIDE before running.
- In vault-only mode, distributor and testers need vault compatibility; this script handles tester vault creation and attempts distributor vault creation when missing.
- Script is idempotent by default: it tops up to target balance and skips already-funded vaults.
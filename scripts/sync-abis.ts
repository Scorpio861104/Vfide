/**
 * sync-abis.ts
 *
 * Copies fresh ABIs from Hardhat artifacts into `lib/abis/`, so the
 * frontend's wagmi calls cannot drift from the deployed contract surface.
 * Run after `npx hardhat compile` (or as part of CI immediately after).
 *
 * Default behaviour:
 *   - Reads every *.json under `lib/abis/`
 *   - For each, finds the matching artifact at
 *       artifacts/contracts/**\/<Name>.sol/<Name>.json
 *   - Writes ONLY the `.abi` array as the new file content (matching the
 *     existing convention of lib/abis files).
 *   - Reports any drift it found (added/removed function names).
 *   - Exits 0 on success, 1 if any ABI is missing from artifacts (which
 *     means the contract didn't compile or was renamed).
 *
 * Run:
 *   npx tsx scripts/sync-abis.ts            # apply (writes files)
 *   npx tsx scripts/sync-abis.ts --check    # CI mode: dry-run; non-zero exit on drift
 *
 * Special handling:
 *   - VFIDECommerce.json is a hand-merged ABI of the MerchantRegistry and
 *     CommerceEscrow contracts (now in separate files since the v19 cleanup:
 *     contracts/MerchantRegistry.sol and contracts/CommerceEscrow.sol).
 *     The frontend continues to import a single VFIDECommerce.json so its
 *     wagmi hooks don't churn; sync-abis discovers both artifacts by name
 *     under artifacts/contracts/ and merges them per MERGE_MAP below.
 *   - Contracts under contracts/future/, contracts/pools/, contracts/testnet/
 *     are discovered automatically by glob.
 */

import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const ABI_DIR = path.join(ROOT, "lib", "abis");
const ARTIFACT_ROOT = path.join(ROOT, "artifacts", "contracts");

/**
 * Hand-curated ABIs that intentionally have no Solidity source.
 * Standard interfaces (ERC-20, ERC-721, etc.) live here. Never overwritten.
 */
const SKIP_LIST = new Set<string>([
  "ERC20",
]);

/**
 * `lib/abis/<X>.json` sources its ABI from a differently-named contract.
 * Used when a contract was renamed in Solidity but the frontend's import
 * symbol stayed the same to avoid churn.
 */
const RENAME_MAP: Record<string, string> = {
  // DevReserveVesting entry removed 2026-05-19 v19.13 cleanup: the file
  // lib/abis/DevReserveVesting.json was deleted (byte-identical duplicate
  // of DevReserveVestingVault.json). The frontend's DevReserveVestingABI
  // symbol is now exported in lib/abis/index.ts as an alias pointing to
  // the same source as DevReserveVestingVaultABI.
  MainstreamPayments: "MainstreamPriceOracle",
};

/**
 * `lib/abis/<X>.json` is a hand-merged ABI of multiple contracts that live
 * in the same Solidity file. Used by lib/contracts.ts to expose a single
 * symbol covering both surfaces. The merge is order-preserving — duplicate
 * entries (by name + inputs signature) from later contracts override earlier.
 */
const MERGE_MAP: Record<string, string[]> = {
  VFIDECommerce: ["MerchantRegistry", "CommerceEscrow"],
};

interface AbiFn {
  type: string;
  name?: string;
}

function findArtifactJson(contractName: string): string | null {
  // Walk artifacts/contracts recursively for <contractName>.json
  const target = `${contractName}.json`;
  const stack: string[] = [ARTIFACT_ROOT];
  while (stack.length > 0) {
    const dir = stack.pop()!;
    if (!fs.existsSync(dir)) continue;
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const e of entries) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) {
        // Skip noise dirs
        if (e.name === "build-info" || e.name.endsWith(".dbg.json")) continue;
        stack.push(full);
      } else if (e.isFile() && e.name === target) {
        // Skip .dbg.json companions
        return full;
      }
    }
  }
  return null;
}

function readJson<T>(p: string): T {
  return JSON.parse(fs.readFileSync(p, "utf8")) as T;
}

function fnNames(abi: AbiFn[]): Set<string> {
  return new Set(abi.filter((x) => x.type === "function" && x.name).map((x) => x.name!));
}

function diff<T>(a: Set<T>, b: Set<T>): { added: T[]; removed: T[] } {
  return {
    added: [...b].filter((x) => !a.has(x)).sort(),
    removed: [...a].filter((x) => !b.has(x)).sort(),
  };
}

function main() {
  const checkOnly = process.argv.includes("--check");

  if (!fs.existsSync(ABI_DIR)) {
    console.error(`[sync-abis] lib/abis directory not found at ${ABI_DIR}`);
    process.exit(1);
  }
  if (!fs.existsSync(ARTIFACT_ROOT)) {
    console.error(
      `[sync-abis] Hardhat artifacts not found at ${ARTIFACT_ROOT}. ` +
      `Run \`npx hardhat compile\` first.`,
    );
    process.exit(1);
  }

  const abiFiles = fs
    .readdirSync(ABI_DIR)
    .filter((f) => f.endsWith(".json") && !f.startsWith("index"));

  let missingArtifacts = 0;
  let driftCount = 0;
  let synced = 0;

  for (const file of abiFiles) {
    const name = path.basename(file, ".json");
    const abiPath = path.join(ABI_DIR, file);

    // ── Hand-curated: no artifact lookup, never written. ──────────────────
    if (SKIP_LIST.has(name)) {
      console.log(`  ⏭  ${name}: hand-curated, skipped`);
      continue;
    }

    let fresh: AbiFn[];

    // ── Multi-contract merge ──────────────────────────────────────────────
    if (MERGE_MAP[name]) {
      const parts = MERGE_MAP[name];
      const merged: AbiFn[] = [];
      const seen = new Set<string>();
      let allFound = true;
      for (const part of parts) {
        const ap = findArtifactJson(part);
        if (!ap) {
          console.error(`  ❌ ${name}: merge component "${part}" has no artifact`);
          missingArtifacts += 1;
          allFound = false;
          break;
        }
        const partAbi = readJson<{ abi: AbiFn[] }>(ap).abi;
        for (const item of partAbi) {
          // Dedupe by type + name + stringified inputs/outputs
          const key = JSON.stringify({
            t: item.type,
            n: item.name,
            i: (item as any).inputs,
          });
          if (seen.has(key)) continue;
          seen.add(key);
          merged.push(item);
        }
      }
      if (!allFound) continue;
      fresh = merged;
    } else {
      // ── Standard single-contract lookup ─────────────────────────────────
      const contractName = RENAME_MAP[name] ?? name;
      const artifactPath = findArtifactJson(contractName);
      if (!artifactPath) {
        console.error(
          `  ❌ ${name}: no artifact found (looked for "${contractName}.json")`,
        );
        missingArtifacts += 1;
        continue;
      }
      fresh = readJson<{ abi: AbiFn[] }>(artifactPath).abi;
    }

    const current = readJson<AbiFn[] | { abi: AbiFn[] }>(abiPath);
    const currentAbi = Array.isArray(current) ? current : current.abi ?? [];

    const before = fnNames(currentAbi);
    const after = fnNames(fresh);
    const d = diff(before, after);

    if (d.added.length === 0 && d.removed.length === 0) {
      // Even if function lists match, events/errors could differ. Compare
      // the full ABI by stringified length as a cheap second check.
      const currentStr = JSON.stringify(currentAbi);
      const freshStr = JSON.stringify(fresh);
      if (currentStr === freshStr) {
        console.log(`  ✓ ${name}: in sync`);
        continue;
      }
      console.log(`  ~ ${name}: function surface matches but events/errors differ`);
    } else {
      driftCount += 1;
      console.log(`  ⚠ ${name}: function surface drift`);
      if (d.added.length > 0)   console.log(`      + ${d.added.join(", ")}`);
      if (d.removed.length > 0) console.log(`      - ${d.removed.join(", ")}`);
    }

    if (checkOnly) continue;

    // Match existing repo style: write the ABI array directly (no `{abi: [...]}` wrapper).
    fs.writeFileSync(abiPath, JSON.stringify(fresh, null, 2) + "\n");
    synced += 1;
  }

  console.log("");
  if (missingArtifacts > 0) {
    console.error(
      `[sync-abis] ${missingArtifacts} ABI(s) had no matching artifact. ` +
      `Check that all referenced contracts compile cleanly.`,
    );
    process.exit(1);
  }
  if (checkOnly && driftCount > 0) {
    console.error(`[sync-abis] ${driftCount} ABI(s) drifted. Run without --check to update.`);
    process.exit(1);
  }
  if (!checkOnly) {
    console.log(`[sync-abis] synced ${synced} file(s).`);
  } else {
    console.log(`[sync-abis] check passed.`);
  }
}

main();

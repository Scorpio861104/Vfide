#!/usr/bin/env node
/**
 * compile-with-solcjs.js
 *
 * Standalone Solidity compile using the pure-JS `solc` npm package.
 * Use this when the Hardhat compiler downloader is unreachable (sandboxed
 * networks, air-gapped CI, etc.) but you still need fresh artifacts to
 * sync ABIs and verify the source surface.
 *
 * Outputs artifacts to ./artifacts/contracts/<file>.sol/<Name>.json
 * with the same shape Hardhat produces ({ abi, bytecode, ... }), so
 * scripts/sync-abis.ts works against the result unchanged.
 *
 * Limitations:
 *  - Uses whatever solc version is installed in node_modules/solc
 *    (currently 0.8.34). Bytecode will not byte-match Hardhat's
 *    0.8.30 output, but the ABI surface (which is all sync-abis.ts
 *    needs) is identical for matching source.
 *  - viaIR, optimizer runs, and other per-file overrides from
 *    hardhat.config.ts are NOT applied. This script targets ABI
 *    sync, not deployment artifacts.
 */

"use strict";
const fs = require("node:fs");
const path = require("node:path");
const solc = require("solc");

const ROOT = process.cwd();
const CONTRACTS_DIR = path.join(ROOT, "contracts");
const ARTIFACTS_DIR = path.join(ROOT, "artifacts", "contracts");

// Recursively gather all *.sol files under contracts/, skipping legacy/
function walkSol(dir, acc = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name.startsWith(".") || e.name === "legacy") continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walkSol(full, acc);
    else if (e.isFile() && e.name.endsWith(".sol")) acc.push(full);
  }
  return acc;
}

// Resolve an import path (relative to the importer, or absolute repo path)
function _resolveImport(importPath, importerPath) {
  // Strip ./ and ../
  if (importPath.startsWith("./") || importPath.startsWith("../")) {
    return path.resolve(path.dirname(importerPath), importPath);
  }
  // Bare repo-rooted paths
  return path.resolve(ROOT, importPath);
}

// Build the Standard JSON Input
function buildInput(files) {
  const sources = {};
  for (const fp of files) {
    const rel = path.relative(ROOT, fp);
    sources[rel] = { content: fs.readFileSync(fp, "utf8") };
  }
  return {
    language: "Solidity",
    sources,
    settings: {
      optimizer: { enabled: true, runs: 200 },
      viaIR: true, // Required: several contracts hit "stack too deep" without it.
      outputSelection: {
        "*": {
          "*": ["abi", "evm.bytecode.object", "evm.deployedBytecode.object", "metadata"],
        },
      },
    },
  };
}

function importCallback(importPath) {
  // Called by solc when it encounters an import. We need to return
  // the source for the import. Try several resolution strategies.
  const candidates = [
    path.resolve(ROOT, importPath),
    path.resolve(ROOT, "contracts", importPath),
    path.resolve(ROOT, "node_modules", importPath),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) {
      return { contents: fs.readFileSync(p, "utf8") };
    }
  }
  return { error: `not found: ${importPath}` };
}

function main() {
  console.log(`solcjs version: ${solc.version()}`);

  // CLI args: list of contract names (e.g. "FraudRegistry CardBoundVault").
  // Each maps to its source file under contracts/. Imports are resolved
  // by the import callback, so transitive deps are pulled in automatically.
  const cliNames = process.argv.slice(2);
  let files;
  if (cliNames.length > 0) {
    const all = walkSol(CONTRACTS_DIR);
    files = [];
    const missing = [];
    for (const name of cliNames) {
      const match = all.find((p) => path.basename(p, ".sol") === name);
      if (!match) {
        missing.push(name);
        continue;
      }
      files.push(match);
    }
    if (missing.length > 0) {
      console.warn(`⚠ Skipping ${missing.length} unknown contract(s): ${missing.join(", ")}`);
    }
    if (files.length === 0) {
      console.error("No matching contracts to compile.");
      process.exit(1);
    }
    console.log(`Compiling ${files.length} contract(s)`);
  } else {
    files = walkSol(CONTRACTS_DIR);
    console.log(`Found ${files.length} .sol files`);
  }

  const input = buildInput(files);
  console.log("Compiling...");

  const t0 = Date.now();
  const output = JSON.parse(
    solc.compile(JSON.stringify(input), { import: importCallback }),
  );
  console.log(`Compile finished in ${((Date.now() - t0) / 1000).toFixed(1)}s`);

  // Surface errors and warnings
  const errors = (output.errors || []).filter((e) => e.severity === "error");
  const warnings = (output.errors || []).filter((e) => e.severity === "warning");

  for (const w of warnings.slice(0, 5)) {
    console.log(`  ⚠ ${w.formattedMessage?.split("\n")[0]}`);
  }
  if (warnings.length > 5) {
    console.log(`  ⚠ (... ${warnings.length - 5} more warnings)`);
  }

  if (errors.length > 0) {
    console.error(`\n❌ ${errors.length} compile error(s):`);
    for (const e of errors.slice(0, 10)) {
      console.error(`\n${e.formattedMessage}`);
    }
    process.exit(1);
  }

  // Write artifacts in Hardhat's shape so sync-abis.ts works
  if (!output.contracts) {
    console.error("solc produced no contracts; nothing to write.");
    process.exit(1);
  }

  fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });
  let written = 0;
  for (const [sourceRel, contracts] of Object.entries(output.contracts)) {
    // sourceRel is e.g. "contracts/VFIDEToken.sol"
    const artifactDir = path.join(ROOT, "artifacts", sourceRel);
    fs.mkdirSync(artifactDir, { recursive: true });
    for (const [contractName, data] of Object.entries(contracts)) {
      const artifact = {
        _format: "hh-sol-artifact-1",
        contractName,
        sourceName: sourceRel,
        abi: data.abi,
        bytecode: "0x" + (data.evm?.bytecode?.object || ""),
        deployedBytecode: "0x" + (data.evm?.deployedBytecode?.object || ""),
        linkReferences: {},
        deployedLinkReferences: {},
      };
      fs.writeFileSync(
        path.join(artifactDir, `${contractName}.json`),
        JSON.stringify(artifact, null, 2),
      );
      written += 1;
    }
  }
  console.log(`\n✅ Wrote ${written} artifact(s) under ${path.relative(ROOT, ARTIFACTS_DIR)}/`);
}

main();

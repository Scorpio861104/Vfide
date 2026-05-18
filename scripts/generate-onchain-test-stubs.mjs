#!/usr/bin/env node

import { promises as fs } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const MOCK_TEST_DIR = path.join(ROOT, "__tests__", "contracts");
const ARTIFACTS_DIR = path.join(ROOT, "artifacts", "contracts");
const OUTPUT_DIR = path.join(ROOT, "test", "hardhat", "generated");

const SKIP_ALREADY_COVERED = new Set([
  "VFIDEToken",
  "VaultHub",
  "DevReserveVestingVault",
  "VaultInfrastructure",
  "VFIDESecurity",
  "Seer",
  "VFIDEAccessControl"
]);

const EIP170_MAX_RUNTIME_BYTECODE = 24576;

function hasLinkReferences(artifact) {
  const refs = artifact?.linkReferences || {};
  return Object.keys(refs).length > 0;
}

function getBytecodeSize(artifact) {
  const bytecode = String(artifact?.bytecode || "0x");
  if (!bytecode.startsWith("0x")) return 0;
  return Math.max(0, (bytecode.length - 2) / 2);
}

function hasDynamicArrayParam(ctorInputs) {
  return (ctorInputs || []).some((input) =>
    String(input?.type || "").match(/\[\]$/)
  );
}

function hasManyAddressParams(ctorInputs) {
  const addressCount = (ctorInputs || []).filter((input) => {
    const t = String(input?.type || "");
    return t === "address";
  }).length;
  return addressCount >= 4;
}

function detectUnsupportedDeployReason(artifact, ctorInputs) {
  if (hasLinkReferences(artifact)) {
    return "library-links-required";
  }

  const bytecodeSize = getBytecodeSize(artifact);
  if (bytecodeSize > EIP170_MAX_RUNTIME_BYTECODE) {
    return "bytecode-too-large";
  }

  if (hasDynamicArrayParam(ctorInputs)) {
    return "dynamic-array-constructor";
  }

  if (hasManyAddressParams(ctorInputs)) {
    return "multi-dependency-constructor";
  }

  return null;
}

function parseArgs(argv) {
  const args = new Set(argv.slice(2));
  return {
    force: args.has("--force"),
    includeCovered: args.has("--include-covered")
  };
}

function getContractNameFromMockTest(filename) {
  return filename.replace(/\.test\.ts$/i, "");
}

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

function makeLiteralForParam(param, idx) {
  const t = String(param?.type || "");

  if (t.endsWith("[]")) {
    if (t.startsWith("address")) {
      return `[signers[${idx % 6}].address]`;
    }
    if (t.startsWith("uint") || t.startsWith("int")) {
      return "[1n]";
    }
    if (t.startsWith("bool")) {
      return "[false]";
    }
    if (t.startsWith("string")) {
      return '["stub"]';
    }
    if (t.startsWith("bytes32")) {
      return "[ethers.ZeroHash]";
    }
    if (t.startsWith("bytes")) {
      return '["0x12"]';
    }
    return "[]";
  }

  if (t === "address") return `signers[${idx % 6}].address`;
  if (t.startsWith("uint") || t.startsWith("int")) return "1n";
  if (t === "bool") return "false";
  if (t === "string") return '"stub"';
  if (t === "bytes32") return "ethers.ZeroHash";
  if (t.startsWith("bytes")) return '"0x12"';

  if (t.startsWith("tuple")) {
    if (t.endsWith("[]")) return "[]";
    return "undefined";
  }

  return "undefined";
}

function constructorSummary(ctorInputs) {
  if (!ctorInputs || ctorInputs.length === 0) {
    return "constructor()";
  }

  const args = ctorInputs
    .map((p, i) => `${p.type} ${p.name || `arg${i}`}`)
    .join(", ");

  return `constructor(${args})`;
}

function renderGeneratedTest(contractName, ctorInputs) {
  const signature = constructorSummary(ctorInputs);

  const argLines = (ctorInputs || []).map((input, idx) => {
    const literal = makeLiteralForParam(input, idx);
    const name = input?.name || `arg${idx}`;
    return `    ${literal}, // ${input?.type || "unknown"} ${name}`;
  });

  const deployArgsBlock = argLines.length
    ? ["  const deployArgs: any[] = [", ...argLines, "  ];"].join("\n")
    : "  const deployArgs: any[] = [];";

  return `/**
 * AUTO-GENERATED on-chain test stub.
 *
 * Contract: ${contractName}
 * ABI constructor: ${signature}
 *
 * Notes:
 * - This test performs a deploy smoke check.
 * - Deploy args are generated from ABI types and may need refinement.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { network } from "hardhat";

describe("${contractName} (generated stub)", () => {
  it("deploy smoke test", async () => {
    const { ethers } = await network.connect();
    const signers = await ethers.getSigners();

    const Factory = await ethers.getContractFactory("${contractName}");
${deployArgsBlock}

    const contract = await Factory.deploy(...deployArgs);
    await contract.waitForDeployment();

    assert.ok(await contract.getAddress());
  });
});
`;
}

async function main() {
  const { force, includeCovered } = parseArgs(process.argv);

  const mockTests = (await fs.readdir(MOCK_TEST_DIR))
    .filter((name) => name.endsWith(".test.ts"))
    .sort();

  await fs.mkdir(OUTPUT_DIR, { recursive: true });

  if (force) {
    const existing = await fs.readdir(OUTPUT_DIR);
    const generatedTests = existing.filter((name) => name.endsWith(".generated.test.ts"));
    await Promise.all(
      generatedTests.map((name) => fs.unlink(path.join(OUTPUT_DIR, name)))
    );
  }

  const report = {
    generated: [],
    skippedNoArtifact: [],
    skippedCovered: [],
    skippedExists: [],
    skippedUnsupported: []
  };

  for (const testFile of mockTests) {
    const contractName = getContractNameFromMockTest(testFile);

    if (!includeCovered && SKIP_ALREADY_COVERED.has(contractName)) {
      report.skippedCovered.push(contractName);
      continue;
    }

    const artifactPath = path.join(
      ARTIFACTS_DIR,
      `${contractName}.sol`,
      `${contractName}.json`
    );

    if (!(await fileExists(artifactPath))) {
      report.skippedNoArtifact.push(contractName);
      continue;
    }

    const outFile = path.join(OUTPUT_DIR, `${contractName}.generated.test.ts`);

    if (!force && (await fileExists(outFile))) {
      report.skippedExists.push(contractName);
      continue;
    }

    const artifact = JSON.parse(await fs.readFile(artifactPath, "utf8"));
    const ctor = (artifact.abi || []).find((item) => item.type === "constructor");
    const ctorInputs = ctor?.inputs || [];

    const unsupportedReason = detectUnsupportedDeployReason(artifact, ctorInputs);
    if (unsupportedReason) {
      report.skippedUnsupported.push({
        contract: contractName,
        reason: unsupportedReason
      });
      continue;
    }

    const content = renderGeneratedTest(contractName, ctorInputs);
    await fs.writeFile(outFile, content, "utf8");
    report.generated.push(contractName);
  }

  const reportPath = path.join(OUTPUT_DIR, "generation-report.json");
  await fs.writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");

  console.log(`Generated: ${report.generated.length}`);
  console.log(`Skipped (already covered): ${report.skippedCovered.length}`);
  console.log(`Skipped (no artifact): ${report.skippedNoArtifact.length}`);
  console.log(`Skipped (exists): ${report.skippedExists.length}`);
  console.log(`Report: ${path.relative(ROOT, reportPath)}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

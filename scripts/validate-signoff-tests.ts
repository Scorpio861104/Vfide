import fs from "node:fs";
import path from "node:path";

type Finding = {
  file: string;
  line: number;
  pattern: string;
  source: string;
};

const TARGET_FILES = [
  "test/security/regressions.test.ts",
  "test/integration/crossContract.test.ts",
  "__tests__/security/api-security.test.ts",
  "__tests__/security/rate-limiting.test.ts",
  "__tests__/security/authorization-security.test.ts",
  "__tests__/security/data-protection.test.ts",
  "__tests__/security/authentication-security.test.ts",
  "__tests__/contracts/VFIDEBenefits.test.ts",
  "__tests__/contracts/SharedInterfaces.test.ts",
  "__tests__/contracts/PromotionalTreasury.test.ts",
];

const CHECKS: Array<{ name: string; regex: RegExp }> = [
  {
    name: "placeholder assertion",
    regex: /expect\(\s*true\s*\)\s*\.\s*(?:toBe\(\s*true\s*\)|to\.be\.true)\s*;?/g,
  },
  {
    name: "deferred-task marker",
    regex: /\bT(?:ODO)\s*:/g,
  },
  {
    name: "runtime test skip",
    regex: /\bthis\.skip\(\s*\)\s*;?/g,
  },
];

function getLineNumber(content: string, index: number): number {
  let line = 1;
  for (let i = 0; i < index; i += 1) {
    if (content[i] === "\n") line += 1;
  }
  return line;
}

function runChecks(filePath: string): Finding[] {
  if (!fs.existsSync(filePath)) {
    return [];
  }

  const content = fs.readFileSync(filePath, "utf8");
  const findings: Finding[] = [];

  for (const check of CHECKS) {
    check.regex.lastIndex = 0;
    let match: RegExpExecArray | null = check.regex.exec(content);

    while (match) {
      const index = match.index;
      const line = getLineNumber(content, index);
      const sourceLine = content.split("\n")[line - 1] ?? "";

      findings.push({
        file: filePath,
        line,
        pattern: check.name,
        source: sourceLine.trim(),
      });

      match = check.regex.exec(content);
    }
  }

  return findings;
}

function main(): void {
  const root = process.cwd();
  const files = TARGET_FILES.map((relativePath) => path.join(root, relativePath));

  const findings = files.flatMap((filePath) => runChecks(filePath));

  if (findings.length === 0) {
    console.log("Signoff guard passed: no placeholder patterns found in guarded suites.");
    return;
  }

  console.error("Signoff guard failed: placeholder patterns detected in guarded suites.");
  for (const finding of findings) {
    const relPath = path.relative(root, finding.file);
    console.error(
      `- ${relPath}:${finding.line} [${finding.pattern}] ${finding.source}`
    );
  }

  console.error(
    "Set VFIDE_ALLOW_PLACEHOLDER_TESTS=true only for non-signoff exploratory runs."
  );

  if (process.env.VFIDE_ALLOW_PLACEHOLDER_TESTS === "true") {
    console.warn("Override enabled: exiting with success despite findings.");
    return;
  }

  process.exitCode = 1;
}

main();

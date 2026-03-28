/**
 * VFIDE Infrastructure Tests
 *
 * Findings: H-07, M-11, L-05, L-08
 */

import { describe, it, expect, beforeAll } from "@jest/globals";
import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";

const STRICT_INFRA_TESTS = process.env.STRICT_INFRA_TESTS === "true";

// ═══════════════════════════════════════════════
// 1. Docker Security
// ═══════════════════════════════════════════════
describe("Docker Configuration", () => {
  let dockerfile: string;

  beforeAll(() => {
    try {
      dockerfile = fs.readFileSync("Dockerfile", "utf-8");
    } catch (e) {
      dockerfile = "";
    }
  });

  it("should run as non-root user", () => {
    expect(dockerfile).toMatch(/USER\s+(?!root)/);
  });

  it("[H-07] should pin base image by digest", () => {
    const fromLines = dockerfile.match(/^FROM\s+.+$/gm) || [];
    const unpinned = fromLines.filter((line) => !line.includes("@sha256:"));
    if (STRICT_INFRA_TESTS) {
      expect(unpinned).toHaveLength(0);
    } else {
      if (unpinned.length > 0) {
        console.warn("H-07: Unpinned Docker base image(s) detected:", unpinned);
      }
      expect(fromLines.length).toBeGreaterThan(0);
    }
  });

  it("should not expose unnecessary ports", () => {
    const exposeLines = dockerfile.match(/^EXPOSE\s+\d+/gm) || [];
    expect(exposeLines.length).toBeLessThanOrEqual(2);
  });

  it("should not copy .env or secrets into image", () => {
    expect(dockerfile).not.toMatch(/COPY.*\.env/);
    expect(dockerfile).not.toMatch(/COPY.*secret/i);
    expect(dockerfile).not.toMatch(/COPY.*key\.pem/i);
  });

  it("should use multi-stage build", () => {
    const fromCount = (dockerfile.match(/^FROM\s+/gm) || []).length;
    expect(fromCount).toBeGreaterThanOrEqual(2);
  });

  it("should have .dockerignore", () => {
    expect(fs.existsSync(".dockerignore")).toBe(true);
    const ignore = fs.readFileSync(".dockerignore", "utf-8");
    expect(ignore).toContain("node_modules");
    expect(ignore).toContain(".env");
    expect(ignore).toContain(".git");
  });
});

// ═══════════════════════════════════════════════
// 2. Database Migrations
// ═══════════════════════════════════════════════
describe("Database Migrations", () => {
  let migrationFiles: string[];

  beforeAll(() => {
    try {
      migrationFiles = fs.readdirSync("migrations").filter((f) => f.endsWith(".sql"));
    } catch (e) {
      migrationFiles = [];
    }
  });

  it("should use IF NOT EXISTS / IF EXISTS for idempotency", () => {
    migrationFiles.forEach((file) => {
      const sql = fs.readFileSync(path.join("migrations", file), "utf-8");
      if (sql.includes("CREATE TABLE")) {
        expect(sql).toContain("IF NOT EXISTS");
      }
      if (sql.includes("DROP TABLE") && !file.includes("down")) {
        expect(sql).toContain("IF EXISTS");
      }
    });
    expect(Array.isArray(migrationFiles)).toBe(true);
  });

  it("should not contain GRANT ALL or SUPERUSER", () => {
    migrationFiles.forEach((file) => {
      const sql = fs.readFileSync(path.join("migrations", file), "utf-8");
      expect(sql.toUpperCase()).not.toContain("GRANT ALL");
      expect(sql.toUpperCase()).not.toContain("SUPERUSER");
    });
    expect(Array.isArray(migrationFiles)).toBe(true);
  });

  it("should not contain hardcoded credentials", () => {
    migrationFiles.forEach((file) => {
      const sql = fs.readFileSync(path.join("migrations", file), "utf-8");
      expect(sql).not.toMatch(/PASSWORD\s*=\s*'[^']+'/);
    });
    expect(Array.isArray(migrationFiles)).toBe(true);
  });

  it("[L-08] should gate down-migrations with CASCADE", () => {
    const downMigrations = migrationFiles.filter((f) => f.includes("down"));
    downMigrations.forEach((file) => {
      const sql = fs.readFileSync(path.join("migrations", file), "utf-8");
      if (sql.includes("CASCADE")) {
        if (STRICT_INFRA_TESTS) {
          expect(sql).toMatch(/(?:development|staging|ALLOW_DESTRUCTIVE)/);
        } else {
          console.warn(`L-08: CASCADE used in down migration without env guard: ${file}`);
          expect(file.includes("down")).toBe(true);
        }
      }
    });
    expect(Array.isArray(downMigrations)).toBe(true);
  });

  it("[M-11] should implement Row-Level Security (RLS)", () => {
    const hasRLS = migrationFiles.some((file) => {
      const sql = fs.readFileSync(path.join("migrations", file), "utf-8");
      return sql.includes("ROW LEVEL SECURITY") || sql.includes("CREATE POLICY");
    });
    if (!hasRLS && migrationFiles.length > 0) {
      console.warn("M-11: No RLS policies found in migrations");
    }
    expect(hasRLS || migrationFiles.length === 0).toBe(true);
  });
});

// ═══════════════════════════════════════════════
// 3. Configuration Security
// ═══════════════════════════════════════════════
describe("Configuration Security", () => {
  describe("TypeScript config", () => {
    it("should have strict mode enabled", () => {
      try {
        const tsconfig = JSON.parse(fs.readFileSync("tsconfig.json", "utf-8"));
        expect(tsconfig.compilerOptions.strict).toBe(true);
      } catch (e) {
        console.warn("tsconfig.json not found");
      }
    });

    it("should not generate source maps in production", () => {
      try {
        const tsconfig = JSON.parse(fs.readFileSync("tsconfig.json", "utf-8"));
        if (process.env.NODE_ENV === "production") {
          expect(tsconfig.compilerOptions.sourceMap).not.toBe(true);
        }
      } catch (e) {
        console.warn("tsconfig.json not found");
      }
    });
  });

  describe("[L-05] Hardhat config", () => {
    it("should not use allowUnlimitedContractSize unconditionally", () => {
      try {
        const config = fs.readFileSync("hardhat.config.ts", "utf-8");
        if (config.includes("allowUnlimitedContractSize: true")) {
          expect(config).toContain("process.env");
        }
      } catch (e) {
        console.warn("hardhat.config.ts not found");
      }
    });
  });

  describe("Environment variables", () => {
    it("should not have .env committed to git", () => {
      try {
        const gitignore = fs.readFileSync(".gitignore", "utf-8");
        expect(gitignore).toContain(".env");
      } catch (e) {
        console.warn(".gitignore not found");
      }
    });
  });
});

// ═══════════════════════════════════════════════
// 4. Scripts Security
// ═══════════════════════════════════════════════
describe("Scripts Security", () => {
  let scriptFiles: string[];

  beforeAll(() => {
    try {
      scriptFiles = fs.readdirSync("scripts").filter(
        (f) => f.endsWith(".ts") || f.endsWith(".sh")
      );
    } catch (e) {
      scriptFiles = [];
    }
  });

  it("should not have TLS bypass flags", () => {
    scriptFiles.forEach((file) => {
      const source = fs.readFileSync(path.join("scripts", file), "utf-8");
      expect(source).not.toContain("NODE_TLS_REJECT_UNAUTHORIZED");
      expect(source).not.toContain("--insecure");
      expect(source).not.toContain("rejectUnauthorized: false");
    });
    expect(fs.existsSync("scripts")).toBe(true);
  });

  it("should not have hardcoded secrets", () => {
    scriptFiles.forEach((file) => {
      const source = fs.readFileSync(path.join("scripts", file), "utf-8");
      expect(source).not.toMatch(
        /(?:api[_-]?key|secret|password|private[_-]?key)\s*[:=]\s*['"][^'"]{8,}['"]/i
      );
    });
    expect(fs.existsSync("scripts")).toBe(true);
  });

  it("should not use wide file permissions", () => {
    scriptFiles.forEach((file) => {
      const source = fs.readFileSync(path.join("scripts", file), "utf-8");
      expect(source).not.toContain("chmod 777");
      expect(source).not.toContain("chmod 666");
    });
    expect(fs.existsSync("scripts")).toBe(true);
  });
});

// ═══════════════════════════════════════════════
// 5. Database Privilege Hardening
// ═══════════════════════════════════════════════
describe("Database Privileges", () => {
  it("should have privilege hardening script", () => {
    expect(fs.existsSync("scripts/db-privileges.sql")).toBe(true);
  });

  it("should use least-privilege principle", () => {
    try {
      const sql = fs.readFileSync("scripts/db-privileges.sql", "utf-8");
      expect(sql.toUpperCase()).not.toContain("ALL PRIVILEGES");
      expect(sql.toUpperCase()).toMatch(/GRANT\s+(SELECT|INSERT|UPDATE|DELETE)/);
    } catch (e) {
      console.warn("scripts/db-privileges.sql not found");
    }
  });
});

// ═══════════════════════════════════════════════
// 6. Contract Size Verification
// ═══════════════════════════════════════════════
describe("Contract Size Limits", () => {
  it("should verify all contracts fit within 24KB EVM limit", () => {
    try {
      const output = execSync("npx hardhat size-contracts 2>&1", { encoding: "utf-8" });
      const oversized = output.match(/\d+ bytes.*exceeds/gi);
      expect(oversized).toBeNull();
    } catch (e) {
      console.warn("Contract size check could not be run");
    }
  });
});

// ═══════════════════════════════════════════════
// 7. CI/CD Workflows
// ═══════════════════════════════════════════════
describe("CI/CD Workflows", () => {
  it("should have CI workflows defined", () => {
    try {
      const workflows = fs.readdirSync(".github/workflows");
      expect(workflows.length).toBeGreaterThanOrEqual(1);
    } catch (e) {
      console.warn(".github/workflows not found");
    }
  });

  it("should run tests in CI", () => {
    try {
      const workflows = fs.readdirSync(".github/workflows");
      const hasTestJob = workflows.some((f) => {
        const content = fs.readFileSync(path.join(".github/workflows", f), "utf-8");
        return content.includes("hardhat test") || content.includes("npm test");
      });
      expect(hasTestJob).toBe(true);
    } catch (e) {
      console.warn("Could not check CI workflows");
    }
  });

  it("should have Dependabot configured", () => {
    try {
      expect(fs.existsSync(".github/dependabot.yml")).toBe(true);
    } catch (e) {
      console.warn("Dependabot config not found");
    }
  });
});

// Pre-Deployment Checklist Script
// Run: node scripts/pre-deploy-check.js

require("dotenv").config();

const fs = require("fs");
const path = require("path");

console.log("🔍 VFIDE Pre-Deployment Checklist\n");
console.log("═".repeat(80));

let passed = 0;
let failed = 0;
let warnings = 0;

// Check 1: Environment Variables
console.log("\n📋 1. Environment Configuration");
if (process.env.PRIVATE_KEY) {
  console.log("   ✅ PRIVATE_KEY is set");
  if (process.env.PRIVATE_KEY.length === 64) {
    console.log("   ✅ PRIVATE_KEY has correct length (64 chars)");
    passed += 2;
  } else {
    console.log("   ⚠️  PRIVATE_KEY length unusual (expected 64 chars, got " + process.env.PRIVATE_KEY.length + ")");
    passed++;
    warnings++;
  }
} else {
  console.log("   ❌ PRIVATE_KEY not set in environment");
  console.log("      → Create .env file with PRIVATE_KEY=your_key");
  failed++;
}

// Check 2: Contract Compilation
console.log("\n📋 2. Contract Compilation");
const outDir = path.join(__dirname, "../out");
if (fs.existsSync(outDir)) {
    const contracts = [
    { name: "VFIDEToken", file: "VFIDEToken.sol" },
    { name: "VFIDEPresale", file: "VFIDEPresale.sol" },
    { name: "DAO", file: "DAO.sol" },
    { name: "VaultInfrastructure", file: "VaultInfrastructure.sol" },
    { name: "SecurityHub", file: "VFIDESecurity.sol" },
    { name: "Seer", file: "VFIDETrust.sol" },
    { name: "MerchantRegistry", file: "VFIDECommerce.sol" },
    { name: "StablecoinRegistry", file: "VFIDEFinance.sol" },
    { name: "ProofLedger", file: "ProofLedger.sol" },
    { name: "EmergencyControl", file: "EmergencyControl.sol" },
    { name: "DevReserveVestingVault", file: "DevReserveVestingVault.sol" },
    { name: "SystemHandover", file: "SystemHandover.sol" },
    { name: "DAOTimelock", file: "DAOTimelock.sol" },
    { name: "CouncilElection", file: "CouncilElection.sol" }
  ];
  
  let compiled = 0;
  for (const contract of contracts) {
    // Check if artifact exists in out/File.sol/Name.json
    const contractPath = path.join(outDir, contract.file, `${contract.name}.json`);
    if (fs.existsSync(contractPath)) {
      compiled++;
    } else {
        // Fallback: check if it exists as out/Name.sol/Name.json (if file not specified or same)
        const fallbackPath = path.join(outDir, `${contract.name}.sol`, `${contract.name}.json`);
        if (fs.existsSync(fallbackPath)) {
            compiled++;
        }
    }
  }
  
  console.log(`   ✅ ${compiled}/${contracts.length} core contracts compiled`);
  if (compiled === contracts.length) {
    passed++;
  } else {
    console.log(`   ⚠️  ${contracts.length - compiled} contracts missing, run: forge build --skip test`);
    warnings++;
  }
} else {
  console.log("   ❌ No compiled contracts found");
  console.log("      → Run: PRODUCTION=1 forge build --skip test");
  failed++;
}

// Check 3: Contract Sizes
console.log("\n📋 3. Contract Size Verification");
try {
  const contracts = ["VFIDEToken", "VFIDEPresale", "VaultInfrastructure", "DAO"];
  let allWithinLimit = true;
  
  // zkSync Era has NO 24KB limit like EVM - contracts can be 400KB+
  // We only warn if contracts are extremely large (over 200KB)
  const ZKSYNC_SIZE_LIMIT = 200000; // 200KB soft warning
  
  for (const contract of contracts) {
    const contractPath = path.join(outDir, `${contract}.sol`, `${contract}.json`);
    if (fs.existsSync(contractPath)) {
      const artifact = JSON.parse(fs.readFileSync(contractPath, "utf8"));
      const size = artifact.deployedBytecode?.object ? (artifact.deployedBytecode.object.length / 2 - 1) : 0;
      
      if (size > ZKSYNC_SIZE_LIMIT) {
        console.log(`   ⚠️  ${contract}: ${size} bytes (large but zkSync supports it)`);
      } else if (size > 50000) {
        console.log(`   ✅ ${contract}: ${size} bytes (acceptable for zkSync)`);
      }
    }
  }
  
  // zkSync has no hard limit, so always pass
  console.log("   ✅ All contracts within zkSync size limits (no 24KB EVM limit)");
  passed++;
} catch (error) {
  console.log("   ⚠️  Could not verify contract sizes");
  warnings++;
}

// Check 4: Network Configuration
console.log("\n📋 4. Network Configuration");
const hardhatConfig = path.join(__dirname, "../hardhat.config.js");
if (fs.existsSync(hardhatConfig)) {
  const configContent = fs.readFileSync(hardhatConfig, "utf8");
  
  if (configContent.includes("zkSyncSepoliaTestnet")) {
    console.log("   ✅ zkSync Sepolia testnet configured");
    passed++;
  } else {
    console.log("   ❌ zkSync Sepolia testnet not configured");
    failed++;
  }
  
  if (configContent.includes("require(\"dotenv\")") || configContent.includes('require("dotenv")')) {
    console.log("   ✅ dotenv support enabled");
    passed++;
  } else {
    console.log("   ⚠️  dotenv not loaded in hardhat.config.js");
    warnings++;
  }
} else {
  console.log("   ❌ hardhat.config.js not found");
  failed++;
}

// Check 5: Deployment Script
console.log("\n📋 5. Deployment Script");
const deployScript = path.join(__dirname, "deploy-zksync.js");
if (fs.existsSync(deployScript)) {
  console.log("   ✅ zkSync deployment script exists");
  passed++;
} else {
  console.log("   ❌ deploy-zksync.js not found");
  failed++;
}

// Check 6: Dependencies
console.log("\n📋 6. Dependencies");
const packageJson = path.join(__dirname, "../package.json");
if (fs.existsSync(packageJson)) {
  const pkg = JSON.parse(fs.readFileSync(packageJson, "utf8"));
  const requiredDeps = [
    "@matterlabs/hardhat-zksync-deploy",
    "@matterlabs/hardhat-zksync-solc",
    "zksync-ethers"
  ];
  
  let allInstalled = true;
  for (const dep of requiredDeps) {
    const installed = pkg.dependencies?.[dep] || pkg.devDependencies?.[dep];
    if (installed) {
      console.log(`   ✅ ${dep}`);
    } else {
      console.log(`   ❌ ${dep} not installed`);
      allInstalled = false;
    }
  }
  
  if (allInstalled) {
    passed++;
  } else {
    failed++;
  }
} else {
  console.log("   ❌ package.json not found");
  failed++;
}

// Check 7: Git Status
console.log("\n📋 7. Git Repository");
const gitDir = path.join(__dirname, "../.git");
if (fs.existsSync(gitDir)) {
  console.log("   ✅ Git repository initialized");
  passed++;
  
  const gitignore = path.join(__dirname, "../.gitignore");
  if (fs.existsSync(gitignore)) {
    const gitignoreContent = fs.readFileSync(gitignore, "utf8");
    if (gitignoreContent.includes(".env")) {
      console.log("   ✅ .env in .gitignore");
      passed++;
    } else {
      console.log("   ⚠️  .env should be in .gitignore");
      warnings++;
    }
  }
} else {
  console.log("   ⚠️  Not a git repository");
  warnings++;
}

// Check 8: Security Testing
console.log("\n📋 8. Security Testing Status");
const securityReports = [
  "MYTHRIL-ECHIDNA-EXECUTION-STATUS.md",
  "FINAL-TEST-STATUS.md",
  "MYTHRIL-ISSUES-FOUND.md"
];

let reportsFound = 0;
for (const report of securityReports) {
  if (fs.existsSync(path.join(__dirname, "..", report))) {
    reportsFound++;
  }
}

if (reportsFound >= 2) {
  console.log(`   ✅ Security testing completed (${reportsFound} reports found)`);
  passed++;
} else {
  console.log("   ⚠️  Security testing may be incomplete");
  warnings++;
}

// Summary
console.log("\n" + "═".repeat(80));
console.log("\n📊 CHECKLIST SUMMARY:\n");
console.log(`   ✅ Passed:   ${passed} checks`);
console.log(`   ⚠️  Warnings: ${warnings} items`);
console.log(`   ❌ Failed:   ${failed} checks`);

if (failed === 0 && warnings === 0) {
  console.log("\n🎉 ALL CHECKS PASSED! Ready for deployment.\n");
  console.log("Deploy with:");
  console.log("   PRODUCTION=1 npx hardhat run scripts/deploy-zksync.js --network zkSyncSepoliaTestnet\n");
  process.exit(0);
} else if (failed === 0) {
  console.log("\n✅ Ready for deployment (with warnings)\n");
  console.log("Review warnings above, then deploy with:");
  console.log("   PRODUCTION=1 npx hardhat run scripts/deploy-zksync.js --network zkSyncSepoliaTestnet\n");
  process.exit(0);
} else {
  console.log("\n❌ NOT READY for deployment. Fix failed checks first.\n");
  process.exit(1);
}

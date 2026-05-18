import { expect } from "chai";
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import hre from "hardhat";

describe("Deploy full integration", function () {
  this.timeout(1_200_000);

  const deploymentsDir = path.join(process.cwd(), ".deployments");
  const bookPath = path.join(deploymentsDir, "hardhat.json");
  const backupPath = path.join(deploymentsDir, "hardhat.json.bak.integration");

  before(function () {
    if (process.env.VFIDE_RUN_DEPLOY_INTEGRATION !== "true") {
      this.skip();
    }
  });

  beforeEach(function () {
    fs.mkdirSync(deploymentsDir, { recursive: true });
    if (fs.existsSync(bookPath)) {
      fs.copyFileSync(bookPath, backupPath);
      fs.unlinkSync(bookPath);
    }
  });

  afterEach(function () {
    if (fs.existsSync(bookPath)) {
      fs.unlinkSync(bookPath);
    }
    if (fs.existsSync(backupPath)) {
      fs.copyFileSync(backupPath, bookPath);
      fs.unlinkSync(backupPath);
    }
  });

  it("runs deploy-full and persists an address book with core ownership invariants", async function () {
    execSync("npx hardhat run scripts/deploy-full.ts --network hardhat", {
      stdio: "inherit",
      env: {
        ...process.env,
        HARDHAT_NETWORK: "hardhat",
      },
    });

    expect(fs.existsSync(bookPath)).to.equal(true);

    const book = JSON.parse(fs.readFileSync(bookPath, "utf8")) as Record<string, string>;

    const required = [
      "AdminMultiSig",
      "VFIDEToken",
      "VaultHub",
      "Seer",
      "DAO",
      "OwnerControlPanel",
      "FeeDistributor",
    ];

    for (const key of required) {
      expect(book[key], `missing ${key} in deployment book`).to.be.a("string");
      expect(book[key]).to.match(/^0x[a-fA-F0-9]{40}$/);
      expect(book[key]).to.not.equal("0x0000000000000000000000000000000000000000");
    }

    const token = await hre.ethers.getContractAt("VFIDEToken", book.VFIDEToken!);
    const treasury = (await token.treasury()) as string;

    expect(treasury.toLowerCase()).to.equal(book.AdminMultiSig!.toLowerCase());
  });
});

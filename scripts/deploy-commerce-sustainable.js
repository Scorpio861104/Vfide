/**
 * @title Deploy VFIDE Sustainable Commerce System
 * @notice Deploys commerce contracts and configures systemExempt for zero-fee commerce
 * 
 * DEPLOYMENT ORDER:
 * 1. SustainableTreasury (revenue collection + gas subsidies)
 * 2. MerchantRegistrySustainable (merchant verification + deposits)
 * 3. CommerceEscrowSustainable (escrow-based protection)
 * 4. Set systemExempt on VFIDEToken (bypass ProofScore fees for commerce)
 * 5. Configure treasury revenue sources
 * 6. Verify zero-fee commerce works
 */

const hre = require("hardhat");

async function main() {
    console.log("\n=== VFIDE Sustainable Commerce Deployment ===\n");

    const [deployer] = await hre.ethers.getSigners();
    console.log("Deploying from:", deployer.address);
    console.log("Balance:", hre.ethers.formatEther(await hre.ethers.provider.getBalance(deployer.address)), "ETH\n");

    // Get existing contract addresses (must be deployed first)
    const DAO_ADDRESS = process.env.DAO_ADDRESS || deployer.address;
    const VFIDE_TOKEN = process.env.VFIDE_TOKEN;
    const VAULT_HUB = process.env.VAULT_HUB;
    const SEER = process.env.SEER;
    const SECURITY_HUB = process.env.SECURITY_HUB;
    const PROOF_LEDGER = process.env.PROOF_LEDGER;

    if (!VFIDE_TOKEN || !VAULT_HUB || !SEER || !SECURITY_HUB || !PROOF_LEDGER) {
        throw new Error("Missing required contract addresses. Set environment variables:\n" +
            "VFIDE_TOKEN, VAULT_HUB, SEER, SECURITY_HUB, PROOF_LEDGER");
    }

    console.log("Configuration:");
    console.log("- DAO:", DAO_ADDRESS);
    console.log("- VFIDEToken:", VFIDE_TOKEN);
    console.log("- VaultHub:", VAULT_HUB);
    console.log("- Seer:", SEER);
    console.log("- SecurityHub:", SECURITY_HUB);
    console.log("- ProofLedger:", PROOF_LEDGER);
    console.log("");

    // ========================================================================
    // 1. Deploy SustainableTreasury
    // ========================================================================
    console.log("1. Deploying SustainableTreasury...");
    const SustainableTreasury = await hre.ethers.getContractFactory("SustainableTreasury");
    const treasury = await SustainableTreasury.deploy(
        DAO_ADDRESS,
        VFIDE_TOKEN,
        PROOF_LEDGER
    );
    await treasury.waitForDeployment();
    const treasuryAddress = await treasury.getAddress();
    console.log("✅ SustainableTreasury deployed:", treasuryAddress);
    console.log("   - Monthly caps: 50 tx (750-799 score), 100 tx (800+ score)");
    console.log("   - Annual budget: 1M VFIDE");
    console.log("   - Minimum balance: 50k VFIDE");
    console.log("");

    // ========================================================================
    // 2. Deploy MerchantRegistrySustainable
    // ========================================================================
    console.log("2. Deploying MerchantRegistrySustainable...");
    const MerchantRegistry = await hre.ethers.getContractFactory("MerchantRegistrySustainable");
    const registry = await MerchantRegistry.deploy(
        DAO_ADDRESS,
        VFIDE_TOKEN,
        VAULT_HUB,
        SEER,
        SECURITY_HUB,
        PROOF_LEDGER,
        treasuryAddress
    );
    await registry.waitForDeployment();
    const registryAddress = await registry.getAddress();
    console.log("✅ MerchantRegistrySustainable deployed:", registryAddress);
    console.log("   - Required deposit: 1000 VFIDE");
    console.log("   - Auto-suspend: 3 refunds / 2 disputes");
    console.log("   - Fraud penalty: Deposit seized to treasury");
    console.log("");

    // ========================================================================
    // 3. Deploy CommerceEscrowSustainable
    // ========================================================================
    console.log("3. Deploying CommerceEscrowSustainable...");
    const CommerceEscrow = await hre.ethers.getContractFactory("CommerceEscrowSustainable");
    const escrow = await CommerceEscrow.deploy(
        DAO_ADDRESS,
        VFIDE_TOKEN,
        VAULT_HUB,
        registryAddress,
        SEER,
        SECURITY_HUB,
        PROOF_LEDGER,
        treasuryAddress
    );
    await escrow.waitForDeployment();
    const escrowAddress = await escrow.getAddress();
    console.log("✅ CommerceEscrowSustainable deployed:", escrowAddress);
    console.log("   - Delivery window: 14 days");
    console.log("   - Dispute deposit: 10% of order");
    console.log("   - Serial disputer threshold: 5 disputes in 90 days");
    console.log("");

    // ========================================================================
    // 3b. Configure MerchantRegistry Reporter
    // ========================================================================
    console.log("3b. Configuring MerchantRegistry Reporter...");
    // The Escrow contract needs to be a reporter to log refunds/disputes
    tx = await registry.setReporter(escrowAddress, true);
    await tx.wait();
    console.log("   ✅ Escrow contract set as Reporter in Registry");
    console.log("");

    // ========================================================================
    // 4. Set systemExempt on VFIDEToken (CRITICAL for zero-fee commerce)
    // ========================================================================
    console.log("4. Configuring systemExempt on VFIDEToken...");
    const vfideToken = await hre.ethers.getContractAt("VFIDEToken", VFIDE_TOKEN);
    
    console.log("   Setting treasury as systemExempt...");
    let tx = await vfideToken.setSystemExempt(treasuryAddress, true);
    await tx.wait();
    console.log("   ✅ Treasury exempt (no fees on gas subsidy payments)");

    console.log("   Setting merchant registry as systemExempt...");
    tx = await vfideToken.setSystemExempt(registryAddress, true);
    await tx.wait();
    console.log("   ✅ Registry exempt (no fees on deposit holds/returns)");

    console.log("   Setting commerce escrow as systemExempt...");
    tx = await vfideToken.setSystemExempt(escrowAddress, true);
    await tx.wait();
    console.log("   ✅ Escrow exempt (no fees on payment releases)");
    console.log("");

    // ========================================================================
    // 5. Verify systemExempt configuration
    // ========================================================================
    console.log("5. Verifying zero-fee commerce configuration...");
    const treasuryExempt = await vfideToken.systemExempt(treasuryAddress);
    const registryExempt = await vfideToken.systemExempt(registryAddress);
    const escrowExempt = await vfideToken.systemExempt(escrowAddress);

    console.log("   Treasury systemExempt:", treasuryExempt ? "✅ YES" : "❌ NO");
    console.log("   Registry systemExempt:", registryExempt ? "✅ YES" : "❌ NO");
    console.log("   Escrow systemExempt:", escrowExempt ? "✅ YES" : "❌ NO");

    if (!treasuryExempt || !registryExempt || !escrowExempt) {
        throw new Error("❌ CRITICAL: systemExempt configuration failed! Commerce will charge ProofScore fees!");
    }
    console.log("");

    // ========================================================================
    // 6. Fund treasury with initial presale allocation (if configured)
    // ========================================================================
    const PRESALE_ALLOCATION = process.env.PRESALE_ALLOCATION; // e.g., "5000000" for 5M VFIDE
    if (PRESALE_ALLOCATION && parseFloat(PRESALE_ALLOCATION) > 0) {
        console.log("6. Funding treasury with presale allocation...");
        const amount = hre.ethers.parseEther(PRESALE_ALLOCATION);
        
        // Approve treasury to receive tokens
        tx = await vfideToken.approve(treasuryAddress, amount);
        await tx.wait();
        
        // Send presale allocation
        tx = await treasury.receiveRevenue("presale_allocation", amount);
        await tx.wait();
        
        console.log(`   ✅ Treasury funded with ${hre.ethers.formatEther(amount)} VFIDE`);
        
        const sources = await treasury.getRevenueSources();
        console.log(`   Total revenue: ${hre.ethers.formatEther(sources.total)} VFIDE`);
        console.log(`   From presale: ${hre.ethers.formatEther(sources.fromPresale)} VFIDE`);
        console.log("");
    }

    // ========================================================================
    // 7. Display deployment summary
    // ========================================================================
    console.log("=== DEPLOYMENT COMPLETE ===\n");
    console.log("Contract Addresses:");
    console.log("-------------------");
    console.log("SustainableTreasury:          ", treasuryAddress);
    console.log("MerchantRegistrySustainable:  ", registryAddress);
    console.log("CommerceEscrowSustainable:    ", escrowAddress);
    console.log("");
    
    console.log("Environment Variables (save these):");
    console.log("-----------------------------------");
    console.log(`export SUSTAINABLE_TREASURY=${treasuryAddress}`);
    console.log(`export MERCHANT_REGISTRY=${registryAddress}`);
    console.log(`export COMMERCE_ESCROW=${escrowAddress}`);
    console.log("");

    console.log("Zero-Fee Commerce Status:");
    console.log("------------------------");
    console.log("✅ Merchant transaction fees: $0 (ZERO)");
    console.log("✅ Buyer transaction fees: $0 (ZERO)");
    console.log("✅ Only cost: zkSync gas (~$0.01-0.10 per tx)");
    console.log("✅ systemExempt configured: Commerce bypasses ProofScore fees");
    console.log("✅ Sustainable revenue: Burn fees, deposits, forfeitures, presale");
    console.log("✅ Gas subsidies capped: 50-100 tx/month, 1M VFIDE/year");
    console.log("");

    console.log("Next Steps:");
    console.log("-----------");
    console.log("1. Configure DAO governance (if not using deployer address)");
    console.log("2. Fund treasury with presale allocation (if not done above)");
    console.log("3. Test merchant registration flow");
    console.log("4. Test escrow with dispute scenarios");
    console.log("5. Monitor treasury revenue sources");
    console.log("6. Adjust subsidy caps based on usage");
    console.log("");

    console.log("Verification Commands:");
    console.log("---------------------");
    console.log(`npx hardhat verify --network zkSyncMainnet ${treasuryAddress} ${DAO_ADDRESS} ${VFIDE_TOKEN} ${PROOF_LEDGER}`);
    console.log(`npx hardhat verify --network zkSyncMainnet ${registryAddress} ${DAO_ADDRESS} ${VFIDE_TOKEN} ${VAULT_HUB} ${SEER} ${SECURITY_HUB} ${PROOF_LEDGER} ${treasuryAddress}`);
    console.log(`npx hardhat verify --network zkSyncMainnet ${escrowAddress} ${DAO_ADDRESS} ${VFIDE_TOKEN} ${VAULT_HUB} ${registryAddress} ${SEER} ${SECURITY_HUB} ${PROOF_LEDGER} ${treasuryAddress}`);
    console.log("");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("VFIDEFinance", function () {
    let registry, treasuryVault, token, ledger;
    let owner, alice, bob, dao, treasury;

    beforeEach(async function () {
        [owner, alice, bob, dao, treasury] = await ethers.getSigners();

        const LedgerMock = await ethers.getContractFactory("LedgerMock");
        ledger = await LedgerMock.deploy(false);

        // Deploy StablecoinRegistry
        const StablecoinRegistry = await ethers.getContractFactory("StablecoinRegistry");
        registry = await StablecoinRegistry.deploy(dao.address, ledger.target);

        // Deploy Tokens
        const ERC20Mock = await ethers.getContractFactory("ERC20Mock");
        token = await ERC20Mock.deploy("VFIDE", "VFIDE");
        
        const ERC20DecimalsMock = await ethers.getContractFactory("ERC20DecimalsMock");
        const usdc = await ERC20DecimalsMock.deploy("USDC", "USDC", 6);

        // Deploy EcoTreasuryVault
        const EcoTreasuryVault = await ethers.getContractFactory("EcoTreasuryVault");
        treasuryVault = await EcoTreasuryVault.deploy(
            dao.address,
            ledger.target,
            registry.target,
            token.target
        );
        
        // Setup
        this.usdc = usdc;
    });

    describe("StablecoinRegistry", function () {
        it("Should allow DAO to add asset", async function () {
            await expect(registry.connect(dao).addAsset(this.usdc.target, "USDC"))
                .to.emit(registry, "AssetAdded")
                .withArgs(this.usdc.target, 6, "USDC");
                
            expect(await registry.isWhitelisted(this.usdc.target)).to.be.true;
            expect(await registry.tokenDecimals(this.usdc.target)).to.equal(6);
        });

        it("Should revert if non-DAO tries to add asset", async function () {
            await expect(registry.connect(alice).addAsset(this.usdc.target, "USDC"))
                .to.be.revertedWithCustomError(registry, "FI_NotDAO");
        });
    });

    describe("EcoTreasuryVault", function () {
        beforeEach(async function () {
            // Whitelist USDC
            await registry.connect(dao).addAsset(this.usdc.target, "USDC");
            
            // Mint USDC to Alice
            await this.usdc.mint(alice.address, ethers.parseUnits("1000", 6));
            await this.usdc.connect(alice).approve(treasuryVault.target, ethers.MaxUint256);
        });

        it("Should allow deposit of whitelisted stablecoin", async function () {
            const amount = ethers.parseUnits("100", 6);
            
            await expect(treasuryVault.connect(alice).depositStable(this.usdc.target, amount))
                .to.emit(treasuryVault, "ReceivedStable")
                .withArgs(this.usdc.target, amount, alice.address);
                
            expect(await this.usdc.balanceOf(treasuryVault.target)).to.equal(amount);
        });

        it("Should revert deposit of non-whitelisted token", async function () {
            const ERC20Mock = await ethers.getContractFactory("ERC20Mock");
            const randomToken = await ERC20Mock.deploy("RND", "RND");
            
            await expect(treasuryVault.connect(alice).depositStable(randomToken.target, 100))
                .to.be.revertedWithCustomError(treasuryVault, "FI_NotWhitelisted");
        });

        it("Should allow DAO to send funds", async function () {
            const amount = ethers.parseUnits("100", 6);
            await treasuryVault.connect(alice).depositStable(this.usdc.target, amount);
            
            await expect(treasuryVault.connect(dao).send(this.usdc.target, bob.address, amount, "Payment"))
                .to.emit(treasuryVault, "Sent")
                .withArgs(this.usdc.target, bob.address, amount, "Payment");
                
            expect(await this.usdc.balanceOf(bob.address)).to.equal(amount);
        });
    });
});

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { network } from "hardhat";

let connectionPromise: Promise<any> | null = null;

async function getConnection() {
  connectionPromise ??= network.connect();
  return connectionPromise;
}

describe("VFIDEBadgeNFT base URI timelock", () => {
  it("queues and applies base URI updates only after 24h", async () => {
    const { ethers } = (await getConnection()) as any;
    const [dao] = await ethers.getSigners();

    const Seer = await ethers.getContractFactory("Seer");
    const seer = await Seer.deploy(dao.address, ethers.ZeroAddress, ethers.ZeroAddress);
    await seer.waitForDeployment();

    const BadgeRegistry = await ethers.getContractFactory("BadgeRegistry");
    const badgeRegistry = await BadgeRegistry.deploy();
    await badgeRegistry.waitForDeployment();

    const NFT = await ethers.getContractFactory("VFIDEBadgeNFT", {
      libraries: {
        BadgeRegistry: await badgeRegistry.getAddress(),
      },
    });
    const nft = await NFT.deploy(await seer.getAddress(), "ipfs://initial/");
    await nft.waitForDeployment();

    await nft.connect(dao).setBaseURI("ipfs://next/");

    await assert.rejects(
      () => nft.connect(dao).applyBaseURI(),
      /BADGE: base URI timelocked/
    );

    await ethers.provider.send("evm_increaseTime", [24 * 60 * 60 + 1]);
    await ethers.provider.send("evm_mine", []);

    await nft.connect(dao).applyBaseURI();
    assert.equal(await nft.baseURI(), "ipfs://next/");
  });
});

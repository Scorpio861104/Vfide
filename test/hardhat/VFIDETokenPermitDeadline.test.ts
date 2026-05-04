import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { network } from "hardhat";

let connectionPromise: Promise<any> | null = null;

async function getConnection() {
  connectionPromise ??= network.connect();
  return connectionPromise;
}

async function deployTokenFixture() {
  const { ethers } = await getConnection();
  const [owner, spender] = await ethers.getSigners();

  const Placeholder = await ethers.getContractFactory("Placeholder");
  const TreasuryForwarder = await ethers.getContractFactory("TreasuryForwarder");
  const devVault = await Placeholder.deploy();
  const treasury = await TreasuryForwarder.deploy();
  await devVault.waitForDeployment();
  await treasury.waitForDeployment();

  const Token = await ethers.getContractFactory("VFIDEToken");
  const token = await Token.deploy(
    await devVault.getAddress(),
    await treasury.getAddress(),
    ethers.ZeroAddress,
    ethers.ZeroAddress,
    ethers.ZeroAddress,
  );
  await token.waitForDeployment();

  return { token, owner, spender, ethers };
}

describe("VFIDEToken permit deadline", () => {
  it("accepts a valid EIP-2612 permit signature", async () => {
    const { token, owner, spender, ethers } = await deployTokenFixture();

    const value = 1234n;
    const nonce = await token.nonces(owner.address);
    const latest = await ethers.provider.getBlock("latest");
    const deadline = BigInt((latest?.timestamp ?? 0) + 3600);
    const networkInfo = await ethers.provider.getNetwork();

    const domain = {
      name: await token.name(),
      version: "1",
      chainId: networkInfo.chainId,
      verifyingContract: await token.getAddress(),
    };

    const types = {
      Permit: [
        { name: "owner", type: "address" },
        { name: "spender", type: "address" },
        { name: "value", type: "uint256" },
        { name: "nonce", type: "uint256" },
        { name: "deadline", type: "uint256" },
      ],
    };

    const signature = await owner.signTypedData(domain, types, {
      owner: owner.address,
      spender: spender.address,
      value,
      nonce,
      deadline,
    });
    const { v, r, s } = ethers.Signature.from(signature);

    await token.permit(owner.address, spender.address, value, deadline, v, r, s);

    const allowance = await token.allowance(owner.address, spender.address);
    assert.equal(allowance, value);
  });

  it("rejects permit when submitted deadline differs from signed payload", async () => {
    const { token, owner, spender, ethers } = await deployTokenFixture();

    const value = 999n;
    const nonce = await token.nonces(owner.address);
    const latest = await ethers.provider.getBlock("latest");
    const signedDeadline = BigInt((latest?.timestamp ?? 0) + 3600);
    const submittedDeadline = signedDeadline + 1n;
    const networkInfo = await ethers.provider.getNetwork();

    const domain = {
      name: await token.name(),
      version: "1",
      chainId: networkInfo.chainId,
      verifyingContract: await token.getAddress(),
    };

    const types = {
      Permit: [
        { name: "owner", type: "address" },
        { name: "spender", type: "address" },
        { name: "value", type: "uint256" },
        { name: "nonce", type: "uint256" },
        { name: "deadline", type: "uint256" },
      ],
    };

    const signature = await owner.signTypedData(domain, types, {
      owner: owner.address,
      spender: spender.address,
      value,
      nonce,
      deadline: signedDeadline,
    });
    const { v, r, s } = ethers.Signature.from(signature);

    await assert.rejects(
      () => token.permit(owner.address, spender.address, value, submittedDeadline, v, r, s),
      /revert/
    );
  });
});

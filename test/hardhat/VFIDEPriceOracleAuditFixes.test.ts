import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { network } from "hardhat";

let connectionPromise: Promise<any> | null = null;

async function getConnection() {
  connectionPromise ??= network.connect();
  return connectionPromise;
}

describe("VFIDEPriceOracle audit fixes", () => {
  async function deployFixture() {
    const { ethers } = (await getConnection()) as any;
    const [owner] = await ethers.getSigners();

    const Token = await ethers.getContractFactory("test/contracts/helpers/Stubs.sol:MutableDecimalsTokenStub");
    const vfide = await Token.deploy(18);
    await vfide.waitForDeployment();
    const quote = await Token.deploy(18);
    await quote.waitForDeployment();

    const Feed = await ethers.getContractFactory("test/contracts/mocks/VFIDEPriceOracleMocks.sol:MockChainlinkFeed");
    const feed = await Feed.deploy(8, 100000000n);
    await feed.waitForDeployment();

    const Pool = await ethers.getContractFactory("test/contracts/mocks/VFIDEPriceOracleMocks.sol:MockUniswapV3PoolLite");
    const pool = await Pool.deploy(await vfide.getAddress(), await quote.getAddress(), 158456325028528675187087900672n, 0);
    await pool.waitForDeployment();

    const Oracle = await ethers.getContractFactory("test/contracts/mocks/VFIDEPriceOracleMocks.sol:VFIDEPriceOracleHarness");
    const oracle = await Oracle.deploy(
      await vfide.getAddress(),
      await quote.getAddress(),
      await feed.getAddress(),
      await pool.getAddress(),
      owner.address,
    );
    await oracle.waitForDeployment();

    return { ethers, owner, vfide, quote, feed, pool, oracle };
  }

  it("uses Uniswap observe-based TWAP when Chainlink decimals lookup fails", async () => {
    const { feed, oracle } = await deployFixture();

    await feed.setRevertDecimals(true);

    const priceState = await oracle.getPrice();
    assert.equal(priceState[0], 1000000000000000000n);
    assert.equal(priceState[1], 1n);
  });

  it("triggers the breaker on a >10% downward move and keeps the last validated price for reads", async () => {
    const { ethers, feed, oracle } = await deployFixture();

    const now = (await ethers.provider.getBlock("latest")).timestamp;
    await feed.setRoundData(111000000n, now);
    await oracle.updatePrice();
    assert.equal(await oracle.lastPrice(), 1110000000000000000n);

    await ethers.provider.send("evm_increaseTime", [5 * 60 + 1]);
    await ethers.provider.send("evm_mine", []);

    const later = (await ethers.provider.getBlock("latest")).timestamp;
    await feed.setRoundData(100000000n, later);
    await oracle.updatePrice();

    assert.equal(await oracle.circuitBreakerActive(), true);
    const priceState = await oracle.getPrice();
    assert.equal(priceState[0], 1110000000000000000n);
    assert.equal(priceState[1], 0n);
  });

  it("marks the validated read path stale once the cached price ages out", async () => {
    const { ethers, oracle } = await deployFixture();

    await oracle.updatePrice();
    await ethers.provider.send("evm_increaseTime", [2 * 60 * 60 + 1]);
    await ethers.provider.send("evm_mine", []);

    await assert.rejects(() => oracle.getPrice(), /PriceStale|revert/i);
  });

  it("uses the smaller price as the deviation denominator", async () => {
    const { oracle } = await deployFixture();

    const deviation = await oracle.calculateDeviationExternal(1110000000000000000n, 1000000000000000000n);
    assert.equal(deviation, 1100n);
  });
});
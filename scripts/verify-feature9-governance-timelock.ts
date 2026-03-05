import { ContractFactory, JsonRpcProvider } from "ethers";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function loadArtifact(relativePath: string) {
  const filePath = resolve(process.cwd(), relativePath);
  return JSON.parse(readFileSync(filePath, "utf8")) as {
    abi: any[];
    bytecode: string;
  };
}

async function increaseTime(provider: JsonRpcProvider, seconds: number) {
  await provider.send("evm_increaseTime", [seconds]);
  await provider.send("evm_mine", []);
}

async function expectRevert(action: () => Promise<unknown>) {
  try {
    const tx = await action();
    if (typeof tx === "object" && tx !== null && "wait" in tx) {
      await (tx as { wait: () => Promise<unknown> }).wait();
    }
    throw new Error("Expected transaction to revert but it succeeded");
  } catch (error) {
    const text = String(error);
    if (text.includes("Expected transaction to revert but it succeeded")) {
      throw error;
    }
  }
}

async function main() {
  const rpcUrl = process.env.RPC_URL ?? "http://127.0.0.1:8545";
  const provider = new JsonRpcProvider(rpcUrl);

  const daoSigner = await provider.getSigner(0);
  const nonDaoSigner = await provider.getSigner(1);

  const daoAddress = await daoSigner.getAddress();
  const nonDaoAddress = await nonDaoSigner.getAddress();

  const timelockArtifact = loadArtifact("artifacts/contracts/DAOTimelockV2.sol/DAOTimelockV2.json");

  const timelockFactory = new ContractFactory(
    timelockArtifact.abi as any,
    timelockArtifact.bytecode,
    daoSigner
  );

  const timelock = await timelockFactory.deploy(
    daoAddress,
    "0x0000000000000000000000000000000000000000"
  ) as any;
  await timelock.waitForDeployment();

  // Guardrail: only DAO can queue operations.
  await expectRevert(async () =>
    timelock.connect(nonDaoSigner).queueTransaction(
      await timelock.getAddress(),
      0,
      "setDelay(uint256)",
      "0x"
    )
  );

  // Guardrail: cannot queue a zero target operation.
  await expectRevert(() =>
    timelock.queueTransaction(
      "0x0000000000000000000000000000000000000000",
      0,
      "setDelay(uint256)",
      "0x"
    )
  );

  // Queue a valid self-governed delay update.
  const newDelay = 3n * 24n * 60n * 60n;
  const encodedDelayArg = newDelay.toString(16).padStart(64, "0");
  const delayData = `0x${encodedDelayArg}`;

  const queueTx = await timelock.queueTransaction(
    await timelock.getAddress(),
    0,
    "setDelay(uint256)",
    delayData
  );
  await queueTx.wait();

  const nonceAfterFirstQueue = await timelock.nonce();
  const firstNonce = nonceAfterFirstQueue - 1n;

  // Timelock must enforce the delay before execution.
  await expectRevert(async () =>
    timelock.executeTransaction(
      await timelock.getAddress(),
      0,
      "setDelay(uint256)",
      delayData,
      firstNonce,
      { gasLimit: 5_000_000 }
    )
  );

  const eta = await timelock.getEta(
    await timelock.getAddress(),
    0,
    "setDelay(uint256)",
    delayData,
    firstNonce
  );
  if (eta === 0n) {
    throw new Error("Expected queued transaction ETA to be set");
  }

  await increaseTime(provider, 2 * 24 * 60 * 60 + 1);

  await (
    await timelock.executeTransaction(
      await timelock.getAddress(),
      0,
      "setDelay(uint256)",
      delayData,
      firstNonce,
      { gasLimit: 5_000_000 }
    )
  ).wait();

  const currentDelay = await timelock.delay();
  if (currentDelay !== newDelay) {
    throw new Error(`Expected delay=${newDelay}, got ${currentDelay}`);
  }

  // Queue + cancel path should prevent execution.
  const queueCancelTx = await timelock.queueTransaction(
    await timelock.getAddress(),
    0,
    "setDAO(address)",
    `0x${nonDaoAddress.slice(2).padStart(64, "0")}`
  );
  await queueCancelTx.wait();

  const nonceAfterSecondQueue = await timelock.nonce();
  const secondNonce = nonceAfterSecondQueue - 1n;

  await (
    await timelock.cancelTransaction(
      await timelock.getAddress(),
      0,
      "setDAO(address)",
      `0x${nonDaoAddress.slice(2).padStart(64, "0")}`,
      secondNonce
    )
  ).wait();

  await expectRevert(async () =>
    timelock.executeTransaction(
      await timelock.getAddress(),
      0,
      "setDAO(address)",
      `0x${nonDaoAddress.slice(2).padStart(64, "0")}`,
      secondNonce,
      { gasLimit: 5_000_000 }
    )
  );

  console.log("Feature 9 governance/timelock checks passed");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

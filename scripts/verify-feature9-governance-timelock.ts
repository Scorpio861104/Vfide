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

async function queueAndGetId(
  timelock: any,
  target: string,
  value: bigint,
  data: string
): Promise<string> {
  const tx = await timelock.queueTx(target, value, data);
  const receipt = await tx.wait();
  if (!receipt || !Array.isArray(receipt.logs)) {
    throw new Error("Missing transaction receipt logs");
  }

  for (const log of receipt.logs) {
    try {
      const parsed = timelock.interface.parseLog(log);
      if (parsed && parsed.name === "Queued") {
        return parsed.args.id as string;
      }
    } catch {
      // Ignore logs emitted by other contracts.
    }
  }

  throw new Error("Queued event not found");
}

async function main() {
  const rpcUrl = process.env.RPC_URL ?? "http://127.0.0.1:8545";
  const provider = new JsonRpcProvider(rpcUrl);

  const daoSigner = await provider.getSigner(0);
  const nonDaoSigner = await provider.getSigner(1);

  const daoAddress = await daoSigner.getAddress();
  const nonDaoAddress = await nonDaoSigner.getAddress();

  const timelockArtifact = loadArtifact("artifacts/contracts/DAOTimelock.sol/DAOTimelock.json");

  const timelockFactory = new ContractFactory(
    timelockArtifact.abi as any,
    timelockArtifact.bytecode,
    daoSigner
  );

  const timelock = await timelockFactory.deploy(daoAddress) as any;
  await timelock.waitForDeployment();

  // Guardrail: only DAO can queue operations.
  await expectRevert(async () =>
    timelock.connect(nonDaoSigner).queueTx(
      await timelock.getAddress(),
      0,
      "0x"
    )
  );

  // Guardrail: cannot queue a zero target operation.
  await expectRevert(() =>
    timelock.queueTx(
      "0x0000000000000000000000000000000000000000",
      0,
      "0x"
    )
  );

  // Queue a valid self-governed delay update.
  const newDelay = 3n * 24n * 60n * 60n;
  const delayData = timelock.interface.encodeFunctionData("setDelay", [newDelay]);
  const firstId = await queueAndGetId(
    timelock,
    await timelock.getAddress(),
    0n,
    delayData
  );

  // Timelock must enforce the delay before execution.
  await expectRevert(async () =>
    timelock.execute(firstId, { gasLimit: 5_000_000 })
  );

  const queued = await timelock.queue(firstId);
  if (!queued || queued.eta === 0n) {
    throw new Error("Expected queued transaction ETA to be set");
  }

  const initialDelay = await timelock.delay();
  await increaseTime(provider, Number(initialDelay) + 1);

  await (await timelock.execute(firstId, { gasLimit: 5_000_000 })).wait();

  const currentDelay = await timelock.delay();
  if (currentDelay !== newDelay) {
    throw new Error(`Expected delay=${newDelay}, got ${currentDelay}`);
  }

  // Queue + cancel path should prevent execution.
  const setAdminData = timelock.interface.encodeFunctionData("setAdmin", [nonDaoAddress]);
  const secondId = await queueAndGetId(
    timelock,
    await timelock.getAddress(),
    0n,
    setAdminData
  );

  await (await timelock.cancel(secondId)).wait();

  await expectRevert(async () =>
    timelock.execute(secondId, { gasLimit: 5_000_000 })
  );

  console.log("Feature 9 governance/timelock checks passed");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

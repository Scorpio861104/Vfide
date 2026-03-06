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

async function expectRevert(action: () => Promise<any>) {
  try {
    await action();
  } catch {
    return;
  }
  throw new Error("Expected transaction to revert");
}

async function main() {
  const rpcUrl = process.env.RPC_URL ?? "http://127.0.0.1:8545";
  const provider = new JsonRpcProvider(rpcUrl);

  const dao = await provider.getSigner(0);
  const buyer = await provider.getSigner(1);
  const merchant = await provider.getSigner(2);
  const other = await provider.getSigner(3);

  const daoAddress = await dao.getAddress();
  const buyerAddress = await buyer.getAddress();
  const merchantAddress = await merchant.getAddress();

  const seerArtifact = loadArtifact(
    "artifacts/contracts/mocks/EscrowManagerVerifierMocks.sol/MockSeerForEscrow.json"
  );
  const tokenArtifact = loadArtifact(
    "artifacts/contracts/mocks/EscrowManagerVerifierMocks.sol/MockTokenForEscrow.json"
  );
  const escrowArtifact = loadArtifact("artifacts/contracts/EscrowManager.sol/EscrowManager.json");

  const seerFactory = new ContractFactory(seerArtifact.abi as any, seerArtifact.bytecode, dao);
  const seer = (await seerFactory.deploy()) as any;
  await seer.waitForDeployment();
  await (await seer.setScore(merchantAddress, 6500)).wait();

  const tokenFactory = new ContractFactory(tokenArtifact.abi as any, tokenArtifact.bytecode, dao);
  const token = (await tokenFactory.deploy()) as any;
  await token.waitForDeployment();

  const escrowFactory = new ContractFactory(escrowArtifact.abi as any, escrowArtifact.bytecode, dao);
  const escrow = (await escrowFactory.deploy(daoAddress, await seer.getAddress())) as any;
  await escrow.waitForDeployment();

  const one = 1_000_000_000_000_000_000n;
  await (await token.mint(buyerAddress, 2_000n * one)).wait();
  await (await token.connect(buyer).approve(await escrow.getAddress(), 2_000n * one)).wait();

  await (await escrow.connect(buyer).createEscrow(merchantAddress, await token.getAddress(), 1_000n * one, "ord-1")).wait();

  await (await escrow.connect(buyer).raiseDispute(1)).wait();

  // Conflict-of-interest invariant: dispute parties cannot resolve partial disputes.
  await expectRevert(() => escrow.connect(buyer).resolveDisputePartial(1, 9000));
  await expectRevert(() => escrow.connect(merchant).resolveDisputePartial(1, 1000));

  // Authorized arbiter can resolve partial split.
  await (await escrow.connect(dao).resolveDisputePartial(1, 2500)).wait();

  const buyerBal = await token.balanceOf(buyerAddress);
  const merchantBal = await token.balanceOf(merchantAddress);
  if (buyerBal !== 1_250n * one || merchantBal !== 750n * one) {
    throw new Error(`Unexpected split balances buyer=${buyerBal} merchant=${merchantBal}`);
  }

  // Timeout flow still works and emits near-timeout pathway.
  await (await escrow.connect(buyer).createEscrow(merchantAddress, await token.getAddress(), 100n * one, "ord-2")).wait();
  const timeoutInfo = (await escrow.checkTimeout(2)) as readonly [boolean, bigint];
  if (timeoutInfo[0]) {
    throw new Error("Escrow should not be near timeout immediately after creation");
  }

  await increaseTime(provider, 7 * 24 * 60 * 60 - 6 * 60 * 60);
  await (await escrow.notifyTimeout(2)).wait();

  await increaseTime(provider, 6 * 60 * 60 + 1);
  await (await escrow.connect(merchant).claimTimeout(2)).wait();

  const merchantAfterTimeout = await token.balanceOf(merchantAddress);
  if (merchantAfterTimeout !== 850n * one) {
    throw new Error(`Unexpected merchant balance after timeout claim: ${merchantAfterTimeout}`);
  }

  await expectRevert(() => escrow.connect(other).refund(2));

  console.log("Merchant payment/escrow invariant checks passed");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
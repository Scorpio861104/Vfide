import { Contract, ContractFactory, JsonRpcProvider, NonceManager, Wallet } from 'ethers';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function loadArtifact(relativePath: string) {
  const filePath = resolve(process.cwd(), relativePath);
  return JSON.parse(readFileSync(filePath, 'utf8')) as {
    abi: any[];
    bytecode: string;
  };
}

async function main() {
  const rpcUrl = process.env.RPC_URL ?? 'http://127.0.0.1:8545';
  const provider = new JsonRpcProvider(rpcUrl);
  const daoWallet = new Wallet(
    '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80',
    provider
  );
  const dao = new NonceManager(daoWallet);
  const operator = new Wallet(
    '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d',
    provider
  );
  const subject = new Wallet(
    '0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a',
    provider
  );

  const mockSeerArtifact = loadArtifact(
    'artifacts/contracts/mocks/MockSeerAuto.sol/MockSeerAuto.json'
  );
  const seerAutoArtifact = loadArtifact(
    'artifacts/contracts/SeerAutonomous.sol/SeerAutonomous.json'
  );

  const mockSeerFactory = new ContractFactory(
    mockSeerArtifact.abi as any,
    mockSeerArtifact.bytecode,
    dao
  );
  const mockDeployTx = await mockSeerFactory.getDeployTransaction();
  mockDeployTx.gasLimit = 8_000_000n;
  const mockReceipt = await (await dao.sendTransaction(mockDeployTx)).wait();
  const mockAddress = mockReceipt?.contractAddress;
  if (!mockAddress) {
    throw new Error('MockSeer deployment did not return a contract address');
  }
  const mockSeer = new Contract(mockAddress, mockSeerArtifact.abi as any, dao) as any;

  const seerAutoFactory = new ContractFactory(
    seerAutoArtifact.abi as any,
    seerAutoArtifact.bytecode,
    dao
  );
  const seerAutoDeployTx = await seerAutoFactory.getDeployTransaction(
    await dao.getAddress(),
    await mockSeer.getAddress(),
    '0x0000000000000000000000000000000000000000'
  );
  seerAutoDeployTx.gasLimit = 16_000_000n;
  const seerAutoReceipt = await (await dao.sendTransaction(seerAutoDeployTx)).wait();
  const seerAutoAddress = seerAutoReceipt?.contractAddress;
  if (!seerAutoAddress) {
    throw new Error('SeerAutonomous deployment did not return a contract address');
  }
  const seerAutonomous = new Contract(seerAutoAddress, seerAutoArtifact.abi as any, dao) as any;

  await (await seerAutonomous.connect(dao).setOperator(await operator.getAddress(), true)).wait();
  await (await mockSeer.connect(dao).setScore(await subject.getAddress(), 900)).wait();

  // Create a pending severe challenge via autonomous enforcement path.
  await (
    await seerAutonomous.connect(operator).beforeAction(
      await subject.getAddress(),
      0,
      1,
      '0x0000000000000000000000000000000000000000'
    )
  ).wait();

  const pending = await seerAutonomous.pendingChallenge(await subject.getAddress());
  if (!pending.exists) {
    throw new Error("Expected pending challenge to exist before DAO resolution");
  }

  const tx = await seerAutonomous.connect(dao).resolveChallenge(await subject.getAddress(), true);
  const receipt = await tx.wait();

  let foundLegacy = false;
  let foundCode = false;
  for (const log of receipt?.logs ?? []) {
    try {
      const parsed = seerAutonomous.interface.parseLog(log);
      if (parsed && parsed.name === "ChallengeResolved") {
        const [eventSubject, upheld, reason] = parsed.args;
        if (
          eventSubject === (await subject.getAddress()) &&
          upheld === true &&
          reason === "critical_score"
        ) {
          foundLegacy = true;
        }
      }

      if (parsed && parsed.name === "ChallengeResolvedCode") {
        const [eventSubject, upheld, reasonCode, reason] = parsed.args;
        if (
          eventSubject === (await subject.getAddress()) &&
          upheld === true &&
          reasonCode === 100n &&
          reason === "critical_score"
        ) {
          foundCode = true;
        }
      }
    } catch {
      // Ignore logs from other contracts.
    }
  }

  if (!foundLegacy) {
    throw new Error("ChallengeResolved(subject, true, critical_score) was not emitted");
  }

  if (!foundCode) {
    throw new Error("ChallengeResolvedCode(subject, true, 100, critical_score) was not emitted");
  }

  console.log("Seer challenge resolution event verification passed");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
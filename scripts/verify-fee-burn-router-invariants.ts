import { ContractFactory, JsonRpcProvider } from 'ethers';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function loadArtifact(relativePath: string) {
  const filePath = resolve(process.cwd(), relativePath);
  return JSON.parse(readFileSync(filePath, 'utf8')) as {
    abi: any[];
    bytecode: string;
  };
}

async function increaseTime(provider: JsonRpcProvider, seconds: number) {
  await provider.send('evm_increaseTime', [seconds]);
  await provider.send('evm_mine', []);
}

async function main() {
  const rpcUrl = process.env.RPC_URL ?? 'http://127.0.0.1:8545';
  const provider = new JsonRpcProvider(rpcUrl);

  const owner = await provider.getSigner(0);
  const user = await provider.getSigner(1);
  const sinkA = await provider.getSigner(2);
  const sinkB = await provider.getSigner(3);
  const sinkC = await provider.getSigner(4);

  const ownerAddress = await owner.getAddress();
  const userAddress = await user.getAddress();
  const sanctumSinkAddress = await sinkA.getAddress();
  const burnSinkAddress = await sinkB.getAddress();
  const ecosystemSinkAddress = await sinkC.getAddress();

  const seerArtifact = loadArtifact(
    'artifacts/contracts/mocks/ProofScoreBurnRouterVerifierMocks.sol/MockSeerForBurnRouter.json'
  );
  const tokenArtifact = loadArtifact(
    'artifacts/contracts/mocks/ProofScoreBurnRouterVerifierMocks.sol/MockTokenForBurnRouter.json'
  );
  const routerArtifact = loadArtifact(
    'artifacts/contracts/ProofScoreBurnRouter.sol/ProofScoreBurnRouter.json'
  );

  const seerFactory = new ContractFactory(seerArtifact.abi as any, seerArtifact.bytecode, owner);
  const seer = (await seerFactory.deploy()) as any;
  await seer.waitForDeployment();

  const tokenFactory = new ContractFactory(tokenArtifact.abi as any, tokenArtifact.bytecode, owner);
  const token = (await tokenFactory.deploy()) as any;
  await token.waitForDeployment();
  const tokenAddress = await token.getAddress();

  const routerFactory = new ContractFactory(
    routerArtifact.abi as any,
    routerArtifact.bytecode,
    owner
  );
  const router = (await routerFactory.deploy(
    await seer.getAddress(),
    sanctumSinkAddress,
    burnSinkAddress,
    ecosystemSinkAddress,
    tokenAddress
  )) as any;
  await router.waitForDeployment();

  const amount = 1_000_000_000_000_000_000n;

  await (await seer.setScore(userAddress, 8000)).wait();
  await (await seer.setScore(userAddress, 4000)).wait();
  await increaseTime(provider, 8 * 24 * 60 * 60);

  const weightedScore = await router.getTimeWeightedScore(userAddress);
  if (weightedScore !== 4000n) {
    throw new Error(
      `Expected stale-snapshot fallback to current score (4000), got ${weightedScore}`
    );
  }

  await (await token.setTotalSupply(40_000_000n * 1_000_000_000_000_000_000n)).wait();
  await (
    await router.setSustainability(
      500_000n * 1_000_000_000_000_000_000n,
      50_000_000n * 1_000_000_000_000_000_000n,
      5
    )
  ).wait();

  const feesPaused = (await router.computeFees(userAddress, ownerAddress, amount)) as readonly [
    bigint,
    bigint,
    bigint,
    string,
    string,
    string,
  ];

  if (feesPaused[0] !== 0n) {
    throw new Error(`Expected burn to be paused at supply floor, got burn=${feesPaused[0]}`);
  }

  await (await token.setTotalSupply(1_000_000_000n * 1_000_000_000_000_000_000n)).wait();
  await (
    await token.relayRecordBurn(await router.getAddress(), 499_999n * 1_000_000_000_000_000_000n)
  ).wait();

  const feesCapped = (await router.computeFees(userAddress, ownerAddress, amount)) as readonly [
    bigint,
    bigint,
    bigint,
    string,
    string,
    string,
  ];

  const totalFees = feesCapped[0] + feesCapped[1] + feesCapped[2];
  if (totalFees > amount) {
    throw new Error(`Expected total fees <= amount, got totalFees=${totalFees}`);
  }

  const split = (await router.getSplitRatio()) as readonly [bigint, bigint, bigint];
  if (split[0] !== 40n || split[1] !== 10n || split[2] !== 50n) {
    throw new Error(`Expected split ratio 40/10/50, got ${split.join('/')}`);
  }

  // #345: ecosystem minimum top-up must not increase total fees above the original totalFee.
  await (await router.setSustainability(0n, 0n, 100)).wait();
  await (await seer.setScore(userAddress, 8000)).wait();
  const largeAmount = 100n * amount;
  const cappedMinFees = (await router.computeFees(userAddress, ownerAddress, largeAmount)) as readonly [
    bigint,
    bigint,
    bigint,
    string,
    string,
    string,
  ];
  const cappedMinTotal = cappedMinFees[0] + cappedMinFees[1] + cappedMinFees[2];
  const expectedBaseTotalFee = (largeAmount * 25n) / 10000n; // score 8000 => 25 bps
  if (cappedMinTotal !== expectedBaseTotalFee) {
    throw new Error(
      `Expected total fee to remain capped at original totalFee=${expectedBaseTotalFee}, got ${cappedMinTotal}`
    );
  }
  if (cappedMinFees[0] !== 0n || cappedMinFees[1] !== 0n || cappedMinFees[2] !== expectedBaseTotalFee) {
    throw new Error(
      `Expected full capped fee to route to ecosystem; got burn=${cappedMinFees[0]} sanctum=${cappedMinFees[1]} ecosystem=${cappedMinFees[2]}`
    );
  }

  console.log('Fee/Burn Router invariant checks passed');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

import { ContractFactory, JsonRpcProvider } from 'ethers';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

type Artifact = {
  abi: any[];
  bytecode: string;
};

function loadArtifact(relativePathCandidates: string[]): Artifact {
  for (const relativePath of relativePathCandidates) {
    const filePath = resolve(process.cwd(), relativePath);
    try {
      return JSON.parse(readFileSync(filePath, 'utf8')) as Artifact;
    } catch {
      // try next candidate
    }
  }
  throw new Error(`Unable to load artifact from candidates:\n${relativePathCandidates.join('\n')}`);
}

async function increaseTime(provider: JsonRpcProvider, seconds: number) {
  await provider.send('evm_increaseTime', [seconds]);
  await provider.send('evm_mine', []);
}

async function setScoreGradually(
  seer: any,
  provider: JsonRpcProvider,
  subject: string,
  targetScore: number,
  reasonPrefix: string
) {
  let current = Number(await seer.getScore(subject));
  let hop = 0;

  while (current !== targetScore) {
    const diff = targetScore - current;
    const step = Math.sign(diff) * Math.min(500, Math.abs(diff));
    const next = current + step;
    await (await seer.setScore(subject, next, `${reasonPrefix}-${hop}`)).wait();
    current = next;
    hop += 1;

    if (current !== targetScore) {
      // Seer enforces a 4-hour cooldown between DAO score changes.
      await increaseTime(provider, 4 * 60 * 60 + 1);
    }
  }
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

  const placeholderArtifact = loadArtifact([
    'artifacts/test/contracts/helpers/Stubs.sol/Placeholder.json',
    'artifacts/contracts/test/contracts/helpers/Stubs.sol/Placeholder.json',
  ]);
  const treasuryForwarderArtifact = loadArtifact([
    'artifacts/test/contracts/helpers/TreasuryForwarder.sol/TreasuryForwarder.json',
    'artifacts/contracts/test/contracts/helpers/TreasuryForwarder.sol/TreasuryForwarder.json',
  ]);
  const seerArtifact = loadArtifact(['artifacts/contracts/Seer.sol/Seer.json']);
  const tokenArtifact = loadArtifact(['artifacts/contracts/VFIDEToken.sol/VFIDEToken.json']);
  const routerArtifact = loadArtifact(['artifacts/contracts/ProofScoreBurnRouter.sol/ProofScoreBurnRouter.json']);

  const placeholderFactory = new ContractFactory(
    placeholderArtifact.abi as any,
    placeholderArtifact.bytecode,
    owner
  );
  const devReserveVault = (await placeholderFactory.deploy()) as any;
  await devReserveVault.waitForDeployment();

  const treasuryForwarderFactory = new ContractFactory(
    treasuryForwarderArtifact.abi as any,
    treasuryForwarderArtifact.bytecode,
    owner
  );
  const treasury = (await treasuryForwarderFactory.deploy()) as any;
  await treasury.waitForDeployment();

  const seerFactory = new ContractFactory(seerArtifact.abi as any, seerArtifact.bytecode, owner);
  const seer = (await seerFactory.deploy(ownerAddress, '0x0000000000000000000000000000000000000000', '0x0000000000000000000000000000000000000000')) as any;
  await seer.waitForDeployment();

  const tokenFactory = new ContractFactory(tokenArtifact.abi as any, tokenArtifact.bytecode, owner);
  const token = (await tokenFactory.deploy(
    await devReserveVault.getAddress(),
    await treasury.getAddress(),
    '0x0000000000000000000000000000000000000000',
    '0x0000000000000000000000000000000000000000',
    '0x0000000000000000000000000000000000000000'
  )) as any;
  await token.waitForDeployment();

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
    await token.getAddress()
  )) as any;
  await router.waitForDeployment();

  const amount = 100n * 1_000_000_000_000_000_000n;

  // Real Seer integration: satisfy DAO delta/cooldown constraints while reaching target score.
  await setScoreGradually(seer, provider, userAddress, 8000, 'verify-real-harness');

  const highTrustFees = (await router.computeFees(userAddress, ownerAddress, amount)) as readonly [
    bigint,
    bigint,
    bigint,
    string,
    string,
    string,
  ];
  const highTrustTotal = highTrustFees[0] + highTrustFees[1] + highTrustFees[2];
  const expectedMinTotal = (amount * 25n) / 10000n; // score 8000 => minTotalBps default 25
  if (highTrustTotal !== expectedMinTotal) {
    throw new Error(`Expected high-trust fee total ${expectedMinTotal}, got ${highTrustTotal}`);
  }

  // #345 integration check against real contracts:
  // ecosystem minimum top-up must not increase total fees above original totalFee.
  await (await router.setSustainability(0n, 0n, 100)).wait();
  await increaseTime(provider, 24 * 60 * 60 + 1);
  await (await router.applySustainability()).wait();

  const cappedMinFees = (await router.computeFees(userAddress, ownerAddress, amount)) as readonly [
    bigint,
    bigint,
    bigint,
    string,
    string,
    string,
  ];
  const cappedMinTotal = cappedMinFees[0] + cappedMinFees[1] + cappedMinFees[2];
  if (cappedMinTotal !== expectedMinTotal) {
    throw new Error(`Expected total fee cap at ${expectedMinTotal}, got ${cappedMinTotal}`);
  }
  if (cappedMinFees[2] !== expectedMinTotal) {
    throw new Error(`Expected ecosystem amount ${expectedMinTotal}, got ${cappedMinFees[2]}`);
  }

  // Real Seer low-score check: fee should increase, but never exceed transfer amount.
  await increaseTime(provider, 4 * 60 * 60 + 1);
  await setScoreGradually(seer, provider, userAddress, 4000, 'verify-real-low-score');
  const lowTrustFees = (await router.computeFees(userAddress, ownerAddress, amount)) as readonly [
    bigint,
    bigint,
    bigint,
    string,
    string,
    string,
  ];
  const lowTrustTotal = lowTrustFees[0] + lowTrustFees[1] + lowTrustFees[2];
  const expectedMaxTotal = (amount * 500n) / 10000n; // score 4000 => maxTotalBps default 500
  if (lowTrustTotal !== expectedMaxTotal) {
    throw new Error(`Expected low-trust fee total ${expectedMaxTotal}, got ${lowTrustTotal}`);
  }
  if (lowTrustTotal > amount) {
    throw new Error(`Expected total fees <= amount, got ${lowTrustTotal}`);
  }

  console.log('Fee/Burn Router real-contract invariant checks passed');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

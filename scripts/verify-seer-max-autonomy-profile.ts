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

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

async function expectRevert(action: () => Promise<unknown>, label: string) {
  let reverted = false;
  try {
    await action();
  } catch {
    reverted = true;
  }
  assert(reverted, `Expected revert: ${label}`);
}

async function main() {
  const rpcUrl = process.env.RPC_URL ?? 'http://127.0.0.1:8545';
  const provider = new JsonRpcProvider(rpcUrl);
  const dao = await provider.getSigner(0);
  const nonDao = await provider.getSigner(1);

  const mockSeerArtifact = loadArtifact('artifacts/contracts/mocks/MockSeerAuto.sol/MockSeerAuto.json');
  const seerAutonomousArtifact = loadArtifact('artifacts/contracts/SeerAutonomous.sol/SeerAutonomous.json');

  const mockSeerFactory = new ContractFactory(mockSeerArtifact.abi as any, mockSeerArtifact.bytecode, dao);
  const mockSeer = (await mockSeerFactory.deploy({ gasLimit: 8_000_000 })) as any;
  await mockSeer.waitForDeployment();

  const seerAutonomousFactory = new ContractFactory(seerAutonomousArtifact.abi as any, seerAutonomousArtifact.bytecode, dao);
  const seerAutonomous = (await seerAutonomousFactory.deploy(
    await dao.getAddress(),
    await mockSeer.getAddress(),
    '0x0000000000000000000000000000000000000000',
    { gasLimit: 16_000_000 }
  )) as any;
  await seerAutonomous.waitForDeployment();

  // Non-DAO must not be able to apply strict profile.
  await expectRevert(
    () => seerAutonomous.connect(nonDao).daoApplyMaxAutonomyProfile(),
    'non-DAO max autonomy profile application'
  );

  await (await seerAutonomous.connect(dao).daoApplyMaxAutonomyProfile()).wait();

  // Verify strict thresholds.
  assert((await seerAutonomous.autoRestrictThreshold()) === 4500n, 'autoRestrictThreshold mismatch');
  assert((await seerAutonomous.autoLiftThreshold()) === 6200n, 'autoLiftThreshold mismatch');
  assert((await seerAutonomous.rateLimitThreshold()) === 5200n, 'rateLimitThreshold mismatch');
  assert((await seerAutonomous.patternSensitivity()) === 100n, 'patternSensitivity mismatch');

  // Verify representative rate limits across restriction tiers.
  // Enum order: ActionType.Transfer=0, GovernancePropose=4, Trade=7.
  // Enum order: RestrictionLevel.None=0, Limited=2, Suspended=4.
  assert((await seerAutonomous.rateLimits(0, 0)) === 300n, 'None/Transfer limit mismatch');
  assert((await seerAutonomous.rateLimits(0, 4)) === 6n, 'None/GovernancePropose limit mismatch');
  assert((await seerAutonomous.rateLimits(2, 7)) === 8n, 'Limited/Trade limit mismatch');
  assert((await seerAutonomous.rateLimits(4, 0)) === 0n, 'Suspended/Transfer should be blocked');

  console.log('Seer max-autonomy profile verification passed');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

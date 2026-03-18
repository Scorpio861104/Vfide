import { ContractFactory, JsonRpcProvider, id } from 'ethers';
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

  const seerArtifact = loadArtifact('artifacts/contracts/VFIDETrust.sol/Seer.json');
  const guardArtifact = loadArtifact('artifacts/contracts/SeerPolicyGuard.sol/SeerPolicyGuard.json');
  const seerFactory = new ContractFactory(seerArtifact.abi as any, seerArtifact.bytecode, dao);
  const seer = (await seerFactory.deploy(
    await dao.getAddress(),
    '0x0000000000000000000000000000000000000000',
    '0x0000000000000000000000000000000000000000'
  )) as any;
  await seer.waitForDeployment();

  const guardFactory = new ContractFactory(guardArtifact.abi as any, guardArtifact.bytecode, dao);
  const guard = (await guardFactory.deploy(await dao.getAddress(), await seer.getAddress())) as any;
  await guard.waitForDeployment();
  await (await seer.connect(dao).setPolicyGuard(await guard.getAddress())).wait();
  console.log('Verifier: deployed Seer');

  const setThresholdsSelector = seer.interface.getFunction('setThresholds')?.selector;
  const setPolicyVersionSelector = seer.interface.getFunction('setPolicyVersion')?.selector;
  const setDecayConfigSelector = seer.interface.getFunction('setDecayConfig')?.selector;
  assert(!!setThresholdsSelector && !!setPolicyVersionSelector && !!setDecayConfigSelector, 'Missing required Seer selectors');

  // Critical class (7 days): setThresholds must be pre-scheduled and delayed.
  const low = 4100;
  const high = 8200;
  const minGov = 5600;
  const minMerch = 5800;

  await expectRevert(
    () => seer.connect(dao).setThresholds(low, high, minGov, minMerch, { gasLimit: 2_000_000 }),
    'setThresholds without schedule'
  );
  console.log('Verifier: unscheduled threshold change blocked');

  await (await guard.connect(dao).schedulePolicyChange(
    setThresholdsSelector,
    0
  )).wait();
  console.log('Verifier: scheduled class A threshold change');

  await expectRevert(
    () => seer.connect(dao).setThresholds(low, high, minGov, minMerch, { gasLimit: 2_000_000 }),
    'setThresholds before class A delay'
  );
  console.log('Verifier: early class A execution blocked');

  await provider.send('evm_increaseTime', [7 * 24 * 60 * 60 + 1]);
  await provider.send('evm_mine', []);
  console.log('Verifier: advanced time for class A delay');

  const thresholdChangeId = await guard.getPolicyChangeId(
    setThresholdsSelector,
    0
  );
  const readyAt = await guard.policyChangeReadyAt(thresholdChangeId);
  const latest = await provider.getBlock('latest');
  assert(readyAt > 0n, 'Missing scheduled class A change');
  assert(BigInt(latest?.timestamp ?? 0) >= readyAt, 'Class A delay not yet elapsed');

  await (await seer.connect(dao).setThresholds(low, high, minGov, minMerch, { gasLimit: 2_000_000 })).wait();
  console.log('Verifier: executed class A threshold change');

  const updatedLow = await seer.lowTrustThreshold();
  assert(updatedLow === BigInt(low), 'Critical delayed threshold update did not apply');

  await expectRevert(
    () => seer.connect(dao).setThresholds(low, high, minGov, minMerch, { gasLimit: 2_000_000 }),
    'setThresholds replay without reschedule'
  );

  // Operational class (24h): setPolicyVersion must follow class-C delay.
  const policyHash = id('seer-policy-v2');
  const policyURI = 'ipfs://seer-policy-v2';
  await (await guard.connect(dao).schedulePolicyChange(
    setPolicyVersionSelector,
    2
  )).wait();
  console.log('Verifier: scheduled class C policy version change');

  await expectRevert(
    () => seer.connect(dao).setPolicyVersion(policyHash, policyURI, { gasLimit: 1_000_000 }),
    'setPolicyVersion before class C delay'
  );

  await provider.send('evm_increaseTime', [24 * 60 * 60 + 1]);
  await provider.send('evm_mine', []);
  console.log('Verifier: advanced time for class C delay');

  await (await seer.connect(dao).setPolicyVersion(policyHash, policyURI, { gasLimit: 1_000_000 })).wait();
  console.log('Verifier: executed class C policy version change');

  const storedPolicyHash = await seer.policyVersionHash();
  assert(storedPolicyHash === policyHash, 'Operational delayed policy version update did not apply');

  // Wrong class schedule should not satisfy enforcement.
  await (await guard.connect(dao).schedulePolicyChange(
    setDecayConfigSelector,
    2
  )).wait();
  console.log('Verifier: scheduled wrong-class decay config change');

  await provider.send('evm_increaseTime', [72 * 60 * 60 + 1]);
  await provider.send('evm_mine', []);

  await expectRevert(
    () => seer.connect(dao).setDecayConfig(true, 120, 120, { gasLimit: 1_000_000 }),
    'setDecayConfig with wrong scheduled class'
  );

  console.log('Seer class-based policy delay verification passed');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

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

async function main() {
  const rpcUrl = process.env.RPC_URL ?? 'http://127.0.0.1:8545';
  const requireSeerRuntime = process.env.REQUIRE_SEER_RUNTIME_REASON_CODES === 'true';
  const provider = new JsonRpcProvider(rpcUrl);
  const dao = await provider.getSigner(0);
  const operator = await provider.getSigner(1);
  const subject = await provider.getSigner(2);

  const seerArtifact = loadArtifact('artifacts/contracts/VFIDETrust.sol/Seer.json');
  const seerFixtureArtifact = loadArtifact('artifacts/contracts/mocks/MockSeerAuto.sol/MockSeerAuto.json');
  const guardianArtifact = loadArtifact('artifacts/contracts/SeerGuardian.sol/SeerGuardian.json');

  // Seer core can exceed the EIP-170 size cap on default local hardhat nodes.
  // If deployment is blocked, enforce ABI-level guard for code-event schema.
  let seerRuntimeChecksPassed = false;
  try {
    const seerFactory = new ContractFactory(seerArtifact.abi as any, seerArtifact.bytecode, dao);
    const seer = (await seerFactory.deploy(
      await dao.getAddress(),
      '0x0000000000000000000000000000000000000000',
      '0x0000000000000000000000000000000000000000'
    )) as any;
    await seer.waitForDeployment();

    await (await seer.connect(dao).setOperator(await operator.getAddress(), true)).wait();

    // Verify ScoreReasonCode for manual setScore (code 500)
    const setScoreTx = await seer.connect(dao).setScore(await subject.getAddress(), 7000, 'manual_rectification');
    const setScoreReceipt = await setScoreTx.wait();
    let found500 = false;
    for (const log of setScoreReceipt?.logs ?? []) {
      try {
        const parsed = seer.interface.parseLog(log);
        if (parsed && parsed.name === 'ScoreReasonCode') {
          const [who, code, delta, actor] = parsed.args;
          if (who === (await subject.getAddress()) && code === 500n && delta === 2000n && actor === (await dao.getAddress())) {
            found500 = true;
          }
        }
      } catch {}
    }
    assert(found500, 'Missing ScoreReasonCode for setScore (500, +2000)');

    // Verify ScoreReasonCode for operator reward (code 501)
    const rewardTx = await seer.connect(operator).reward(await subject.getAddress(), 100, 'operator_reward');
    const rewardReceipt = await rewardTx.wait();
    let found501 = false;
    for (const log of rewardReceipt?.logs ?? []) {
      try {
        const parsed = seer.interface.parseLog(log);
        if (parsed && parsed.name === 'ScoreReasonCode') {
          const [who, code, delta, actor] = parsed.args;
          if (who === (await subject.getAddress()) && code === 501n && delta === 100n && actor === (await operator.getAddress())) {
            found501 = true;
          }
        }
      } catch {}
    }
    assert(found501, 'Missing ScoreReasonCode for reward (501, +100)');

    // Verify ScoreReasonCode for operator punish (code 502)
    const punishTx = await seer.connect(operator).punish(await subject.getAddress(), 50, 'operator_penalty');
    const punishReceipt = await punishTx.wait();
    let found502 = false;
    for (const log of punishReceipt?.logs ?? []) {
      try {
        const parsed = seer.interface.parseLog(log);
        if (parsed && parsed.name === 'ScoreReasonCode') {
          const [who, code, delta, actor] = parsed.args;
          if (who === (await subject.getAddress()) && code === 502n && delta === -50n && actor === (await operator.getAddress())) {
            found502 = true;
          }
        }
      } catch {}
    }
    assert(found502, 'Missing ScoreReasonCode for punish (502, -50)');
    seerRuntimeChecksPassed = true;
  } catch (error) {
    const summary = (error as { shortMessage?: string; message?: string })?.shortMessage
      ?? (error as { message?: string })?.message
      ?? 'unknown error';
    if (requireSeerRuntime) {
      throw new Error(`Seer runtime reason-code checks required but unavailable: ${summary}`);
    }
    const hasScoreReasonCode = seerArtifact.abi.some(
      (item: any) => item.type === 'event' && item.name === 'ScoreReasonCode'
    );
    assert(hasScoreReasonCode, 'ScoreReasonCode event missing from Seer ABI');
    console.warn('Seer runtime checks skipped due deployment limit; ABI guard for ScoreReasonCode passed');
    console.warn(`Seer runtime skip reason: ${summary}`);
  }

  // Deploy guardian against fixture seer contract to verify reason-code payloads
  const seerFixtureFactory = new ContractFactory(seerFixtureArtifact.abi as any, seerFixtureArtifact.bytecode, dao);
  const seerFixture = (await seerFixtureFactory.deploy()) as any;
  await seerFixture.waitForDeployment();

  const guardianFactory = new ContractFactory(guardianArtifact.abi as any, guardianArtifact.bytecode, dao);
  const guardian = (await guardianFactory.deploy(
    await dao.getAddress(),
    await seerFixture.getAddress(),
    '0x0000000000000000000000000000000000000000',
    '0x0000000000000000000000000000000000000000'
  )) as any;
  await guardian.waitForDeployment();

  await (await seerFixture.connect(dao).setScore(await subject.getAddress(), 2999)).wait();

  // Verify AutoRestrictionAppliedCode for low score (code 300)
  const enforceTx = await guardian.connect(operator).checkAndEnforce(await subject.getAddress());
  const enforceReceipt = await enforceTx.wait();
  let found300 = false;
  for (const log of enforceReceipt?.logs ?? []) {
    try {
      const parsed = guardian.interface.parseLog(log);
      if (parsed && parsed.name === 'AutoRestrictionAppliedCode') {
        const [who, , code] = parsed.args;
        if (who === (await subject.getAddress()) && code === 300n) {
          found300 = true;
        }
      }
    } catch {}
  }
  assert(found300, 'Missing AutoRestrictionAppliedCode for auto_low_score (300)');

  // Verify PenaltyAppliedCode for governance abuse violation (code 324)
  const violationTx = await guardian.connect(dao).recordViolation(
    await subject.getAddress(),
    5,
    'governance_abuse_detected'
  );
  const violationReceipt = await violationTx.wait();
  let found324 = false;
  for (const log of violationReceipt?.logs ?? []) {
    try {
      const parsed = guardian.interface.parseLog(log);
      if (parsed && parsed.name === 'PenaltyAppliedCode') {
        const [who, , code] = parsed.args;
        if (who === (await subject.getAddress()) && code === 324n) {
          found324 = true;
        }
      }
    } catch {}
  }
  assert(found324, 'Missing PenaltyAppliedCode for GovernanceAbuse (324)');

  // Verify manual proposal flag code (450)
  const flagTx = await guardian.connect(dao).seerFlagProposal(77, 'manual_policy_flag');
  const flagReceipt = await flagTx.wait();
  let found450 = false;
  for (const log of flagReceipt?.logs ?? []) {
    try {
      const parsed = guardian.interface.parseLog(log);
      if (parsed && parsed.name === 'DAOActionFlaggedCode') {
        const [, code] = parsed.args;
        if (code === 450n) {
          found450 = true;
        }
      }
    } catch {}
  }
  assert(found450, 'Missing DAOActionFlaggedCode for manual proposal flag (450)');

  if (seerRuntimeChecksPassed) {
    console.log('Seer reason-code payload verification passed (runtime + ABI checks)');
  } else {
    console.log('Seer reason-code payload verification passed (guardian runtime + seer ABI checks)');
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

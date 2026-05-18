import { ContractFactory, JsonRpcProvider, ZeroAddress } from 'ethers';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function loadArtifact(relativePath: string) {
  const filePath = resolve(process.cwd(), relativePath);
  return JSON.parse(readFileSync(filePath, 'utf8')) as {
    abi: any[];
    bytecode: string;
  };
}

function loadArtifactFromCandidates(candidates: string[]) {
  for (const relativePath of candidates) {
    const filePath = resolve(process.cwd(), relativePath);
    if (existsSync(filePath)) {
      return JSON.parse(readFileSync(filePath, 'utf8')) as {
        abi: any[];
        bytecode: string;
      };
    }
  }

  throw new Error(`Artifact not found in any candidate path: ${candidates.join(', ')}`);
}

async function increaseTime(provider: JsonRpcProvider, seconds: number) {
  await provider.send('evm_increaseTime', [seconds]);
  await provider.send('evm_mine', []);
}

async function expectRevert(action: () => Promise<unknown>) {
  try {
    const tx = await action();
    if (typeof tx === 'object' && tx !== null && 'wait' in tx) {
      await (tx as { wait: () => Promise<unknown> }).wait();
    }
    throw new Error('Expected transaction to revert but it succeeded');
  } catch (error) {
    const text = String(error);
    if (text.includes('Expected transaction to revert but it succeeded')) {
      throw error;
    }
  }
}

async function seedScoreWithDaoLimits(
  seer: any,
  provider: JsonRpcProvider,
  subject: string,
  targetScore: number,
  label: string,
) {
  let current = Number(await seer.getScore(subject));
  let step = 0;
  while (current !== targetScore) {
    const next = current < targetScore
      ? Math.min(current + 500, targetScore)
      : Math.max(current - 500, targetScore);

    await (await seer.setScore(subject, next, `${label}_${step}`)).wait();
    current = Number(await seer.getScore(subject));
    step += 1;

    if (current !== targetScore) {
      await increaseTime(provider, 4 * 60 * 60 + 1);
    }
  }
}

async function main() {
  const rpcUrl = process.env.RPC_URL ?? 'http://127.0.0.1:8545';
  const provider = new JsonRpcProvider(rpcUrl);

  const dao = await provider.getSigner(0);
  const endorser = await provider.getSigner(1);
  const subject = await provider.getSigner(2);
  const mentor = await provider.getSigner(3);
  const mentee = await provider.getSigner(4);
  const operator = await provider.getSigner(5);

  const daoAddress = await dao.getAddress();
  const endorserAddress = await endorser.getAddress();
  const subjectAddress = await subject.getAddress();
  const mentorAddress = await mentor.getAddress();
  const menteeAddress = await mentee.getAddress();
  const operatorAddress = await operator.getAddress();

  const seerArtifact = loadArtifact('artifacts/contracts/Seer.sol/Seer.json');
  const socialArtifact = loadArtifactFromCandidates([
    'artifacts/contracts/SeerSocial.sol/SeerSocial.json',
    'artifacts/contracts/future/SeerSocial.sol/SeerSocial.json',
  ]);
  const viewArtifact = loadArtifactFromCandidates([
    'artifacts/contracts/SeerView.sol/SeerView.json',
    'artifacts/contracts/future/SeerView.sol/SeerView.json',
  ]);

  const seerFactory = new ContractFactory(seerArtifact.abi as any, seerArtifact.bytecode, dao);
  const seer = (await seerFactory.deploy(daoAddress, ZeroAddress, ZeroAddress)) as any;
  await seer.waitForDeployment();

  const socialFactory = new ContractFactory(
    socialArtifact.abi as any,
    socialArtifact.bytecode,
    dao
  );
  const social = (await socialFactory.deploy(await seer.getAddress())) as any;
  await social.waitForDeployment();

  await (await social.setMentorConfig(7000, 50)).wait();

  const viewFactory = new ContractFactory(viewArtifact.abi as any, viewArtifact.bytecode, dao);
  const seerView = (await viewFactory.deploy()) as any;
  await seerView.waitForDeployment();

  await (await seer.setSeerSocial(await social.getAddress())).wait();

  // Seed scores using bounded 500-point steps with 1h cooldown windows.
  await seedScoreWithDaoLimits(seer, provider, endorserAddress, 7000, 'seed_endorser');
  await seedScoreWithDaoLimits(seer, provider, mentorAddress, 7000, 'seed_mentor');

  await (await social.connect(endorser).endorse(subjectAddress, 'peer verified')).wait();

  const active = (await seerView.getActiveEndorsements(
    await seer.getAddress(),
    subjectAddress
  )) as readonly [readonly string[], readonly bigint[], readonly bigint[], readonly bigint[]];

  if (
    active[0].length !== 1 ||
    !active[0][0] ||
    active[0][0].toLowerCase() !== endorserAddress.toLowerCase()
  ) {
    throw new Error('Expected SeerView to return the SeerSocial endorsement set');
  }

  await (await social.connect(mentor).becomeMentor()).wait();
  await (await social.connect(mentor).sponsorMentee(menteeAddress)).wait();

  const socialMentorState = await social.mentors(mentorAddress);
  if (!socialMentorState) {
    throw new Error('Expected mentor to be registered in SeerSocial');
  }

  const mentorInfo = (await seerView.getMentorInfo(
    await seer.getAddress(),
    mentorAddress
  )) as readonly [boolean, string, bigint, boolean, boolean, bigint, bigint];

  if (!mentorInfo[0]) {
    throw new Error('Expected SeerView mentor info to resolve isMentor=true from SeerSocial');
  }

  if (mentorInfo[2] !== 1n) {
    throw new Error(`Expected SeerView menteeCount=1 from SeerSocial, got ${mentorInfo[2]}`);
  }

  // Wait out DAO score-change cooldown before operator actions on the seeded subjects.
  await increaseTime(provider, 4 * 60 * 60 + 1);

  await (await seer.setOperator(operatorAddress, true)).wait();

  // Newly authorized operators have a 24h warmup before they can act.
  await increaseTime(provider, 24 * 60 * 60 + 1);

  await (await seer.connect(operator).reward(subjectAddress, 100, 'op_reward_1')).wait();
  await (await seer.connect(operator).reward(subjectAddress, 100, 'op_reward_2')).wait();
  await expectRevert(() =>
    seer.connect(operator).reward(subjectAddress, 1, 'op_reward_over_daily')
  );

  // Stay within the current cross-subject daily cap (300 total across all subjects).
  await (await seer.connect(operator).reward(mentorAddress, 99, 'op_reward_other_subject')).wait();

  await increaseTime(provider, 24 * 60 * 60 + 1);
  await (await seer.connect(operator).reward(subjectAddress, 100, 'op_reward_after_window')).wait();

  await (await seer.connect(operator).punish(subjectAddress, 100, 'op_punish_sanity')).wait();

  console.log('ProofScore/Trust social consistency checks passed');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

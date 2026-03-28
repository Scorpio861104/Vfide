import { ContractFactory, JsonRpcProvider, ZeroAddress } from 'ethers';
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
  const socialArtifact = loadArtifact('artifacts/contracts/SeerSocial.sol/SeerSocial.json');
  const viewArtifact = loadArtifact('artifacts/contracts/SeerView.sol/SeerView.json');

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

  // Keep DAO score set deltas within maxDAOScoreChange bounds from neutral baseline.
  await (await seer.setScore(endorserAddress, 7000, 'seed_endorser')).wait();
  await (await seer.setScore(mentorAddress, 7000, 'seed_mentor')).wait();

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

  await (await seer.setOperator(operatorAddress, true)).wait();

  await (await seer.connect(operator).reward(subjectAddress, 100, 'op_reward_1')).wait();
  await (await seer.connect(operator).reward(subjectAddress, 100, 'op_reward_2')).wait();
  await expectRevert(() =>
    seer.connect(operator).reward(subjectAddress, 1, 'op_reward_over_daily')
  );

  await (await seer.connect(operator).reward(mentorAddress, 100, 'op_reward_other_subject')).wait();

  await increaseTime(provider, 24 * 60 * 60 + 1);
  await (await seer.connect(operator).reward(subjectAddress, 100, 'op_reward_after_window')).wait();

  await (await seer.connect(operator).punish(subjectAddress, 100, 'op_punish_sanity')).wait();

  console.log('ProofScore/Trust social consistency checks passed');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

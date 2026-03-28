import { createPublicClient, createWalletClient, encodeFunctionData, http, keccak256, toBytes } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';

type Address = `0x${string}`;
type Hex = `0x${string}`;

interface BadgeSpec {
  name: string;
  category: string;
  autoChecked: boolean;
  earnRequirement: string;
}

const BADGES: BadgeSpec[] = [
  { name: 'PIONEER', category: 'Pioneer & Foundation', autoChecked: false, earnRequirement: 'First 10,000 users (operator/DAO award based on launch cohort).' },
  { name: 'FOUNDING_MEMBER', category: 'Pioneer & Foundation', autoChecked: false, earnRequirement: 'First 1,000 users to reach 800+ score (operator/DAO award).' },
  { name: 'EARLY_TESTER', category: 'Pioneer & Foundation', autoChecked: false, earnRequirement: 'Verified pre-mainnet tester (operator/DAO award).' },
  { name: 'ACTIVE_TRADER', category: 'Activity & Participation', autoChecked: true, earnRequirement: '50+ commerce transactions.' },
  { name: 'GOVERNANCE_VOTER', category: 'Activity & Participation', autoChecked: true, earnRequirement: 'Vote on 10+ DAO proposals.' },
  { name: 'POWER_USER', category: 'Activity & Participation', autoChecked: true, earnRequirement: 'Use at least 3 activity types (trade/vote/endorse/refer).' },
  { name: 'DAILY_CHAMPION', category: 'Activity & Participation', autoChecked: true, earnRequirement: '30 consecutive active days.' },
  { name: 'TRUSTED_ENDORSER', category: 'Trust & Community', autoChecked: false, earnRequirement: 'Made quality endorsements with sustained outcomes (operator/DAO evidence review).' },
  { name: 'COMMUNITY_BUILDER', category: 'Trust & Community', autoChecked: true, earnRequirement: '10 referred users reached qualified trust threshold.' },
  { name: 'PEACEMAKER', category: 'Trust & Community', autoChecked: false, earnRequirement: 'Successfully mediated 3+ disputes (operator/DAO award).' },
  { name: 'MENTOR', category: 'Trust & Community', autoChecked: true, earnRequirement: '5 referred/mentored users reached qualification threshold.' },
  { name: 'VERIFIED_MERCHANT', category: 'Commerce & Merchants', autoChecked: true, earnRequirement: '100+ successful trades and score >= 700.' },
  { name: 'ELITE_MERCHANT', category: 'Commerce & Merchants', autoChecked: false, earnRequirement: 'High-volume elite merchant criteria (operator/DAO award).' },
  { name: 'INSTANT_SETTLEMENT', category: 'Commerce & Merchants', autoChecked: false, earnRequirement: 'Merchant with instant-settlement profile (operator/DAO award).' },
  { name: 'ZERO_DISPUTE', category: 'Commerce & Merchants', autoChecked: false, earnRequirement: 'Long dispute-free streak at scale (operator/DAO award).' },
  { name: 'FRAUD_HUNTER', category: 'Security & Integrity', autoChecked: true, earnRequirement: '3+ confirmed fraud reports.' },
  { name: 'CLEAN_RECORD', category: 'Security & Integrity', autoChecked: false, earnRequirement: 'Maintained clean record for 365 days; currently requires operator/DAO award path.' },
  { name: 'REDEMPTION', category: 'Security & Integrity', autoChecked: false, earnRequirement: 'Recovered from prior penalties per governance policy (operator/DAO award).' },
  { name: 'GUARDIAN', category: 'Security & Integrity', autoChecked: false, earnRequirement: 'Security guardian contribution recognized by governance (operator/DAO award).' },
  { name: 'ELITE_ACHIEVER', category: 'Achievements & Milestones', autoChecked: true, earnRequirement: 'Reach score >= 9000.' },
  { name: 'CENTURY_ENDORSER', category: 'Achievements & Milestones', autoChecked: false, earnRequirement: '100+ high-quality endorsements (operator/DAO award).' },
  { name: 'WHALE_SLAYER', category: 'Achievements & Milestones', autoChecked: false, earnRequirement: 'Notable anti-abuse/market-integrity action (operator/DAO award).' },
  { name: 'DIVERSIFICATION_MASTER', category: 'Achievements & Milestones', autoChecked: false, earnRequirement: 'Strong multi-feature ecosystem activity (operator/DAO award).' },
  { name: 'CONTRIBUTOR', category: 'Education & Contribution', autoChecked: false, earnRequirement: 'Code/design/product contribution accepted; DAO records contribution and badge is then awarded.' },
  { name: 'EDUCATOR', category: 'Education & Contribution', autoChecked: true, earnRequirement: 'Publish 5+ educational contributions.' },
  { name: 'BUG_BOUNTY', category: 'Education & Contribution', autoChecked: false, earnRequirement: 'Valid security disclosure accepted (operator/DAO award).' },
  { name: 'TRANSLATOR', category: 'Education & Contribution', autoChecked: false, earnRequirement: 'Approved localization contribution; DAO records translation and badge is then awarded.' },
  { name: 'HEADHUNTER', category: 'Headhunter Competition', autoChecked: false, earnRequirement: 'Competition/governance-based award.' },
];

const SEER_ABI = [
  {
    name: 'hasBadge',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'subject', type: 'address' },
      { name: 'badge', type: 'bytes32' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'badgeExpiry',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'subject', type: 'address' },
      { name: 'badge', type: 'bytes32' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const;

const BADGE_NFT_ABI = [
  {
    name: 'canMintBadge',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'user', type: 'address' },
      { name: 'badge', type: 'bytes32' },
    ],
    outputs: [
      { name: 'canMint', type: 'bool' },
      { name: 'reason', type: 'string' },
    ],
  },
  {
    name: 'userBadgeToken',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'user', type: 'address' },
      { name: 'badge', type: 'bytes32' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'mintBadge',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'badge', type: 'bytes32' }],
    outputs: [{ name: 'tokenId', type: 'uint256' }],
  },
] as const;

function getArg(flag: string): string | undefined {
  const i = process.argv.indexOf(flag);
  if (i === -1) return undefined;
  return process.argv[i + 1];
}

function hasFlag(flag: string): boolean {
  return process.argv.includes(flag);
}

function requireAddress(value: string | undefined, name: string): Address {
  if (!value || !value.startsWith('0x') || value.length !== 42) {
    throw new Error(`Missing or invalid ${name}.`);
  }
  return value as Address;
}

function requirePrivateKey(value: string): `0x${string}` {
  const normalized = value.startsWith('0x') ? value : `0x${value}`;
  if (!/^0x[0-9a-fA-F]{64}$/.test(normalized)) {
    throw new Error('Invalid PRIVATE_KEY format. Expected 32-byte hex string.');
  }
  return normalized as `0x${string}`;
}

function badgeId(name: string): Hex {
  return keccak256(toBytes(name));
}

async function main(): Promise<void> {
  const rpcUrl = getArg('--rpc-url') || process.env.RPC_URL || process.env.NEXT_PUBLIC_RPC_URL;
  if (!rpcUrl) {
    throw new Error('Set RPC_URL or pass --rpc-url <url>.');
  }

  const seerAddress = requireAddress(
    getArg('--seer') || process.env.SEER_ADDRESS || process.env.NEXT_PUBLIC_SEER_ADDRESS,
    'SEER_ADDRESS / --seer'
  );

  const badgeNftAddress = requireAddress(
    getArg('--badge-nft') || process.env.BADGE_NFT_ADDRESS || process.env.NEXT_PUBLIC_BADGE_NFT_ADDRESS,
    'BADGE_NFT_ADDRESS / --badge-nft'
  );

  const privateKey = getArg('--private-key') || process.env.PRIVATE_KEY;
  const targetAddressArg = getArg('--address');
  const mintAll = hasFlag('--mint-all');
  const dryRun = hasFlag('--dry-run');

  let accountAddress: Address;
  let walletClient: ReturnType<typeof createWalletClient> | undefined;

  if (privateKey) {
    const normalizedPk = requirePrivateKey(privateKey);
    const account = privateKeyToAccount(normalizedPk);
    accountAddress = account.address;
    walletClient = createWalletClient({ account, transport: http(rpcUrl) });
  } else {
    accountAddress = requireAddress(targetAddressArg, '--address (required when PRIVATE_KEY is not set)');
  }

  const publicClient = createPublicClient({ transport: http(rpcUrl) });

  console.log('=== VFIDE Badge Status ===');
  console.log(`Wallet: ${accountAddress}`);
  console.log(`Seer: ${seerAddress}`);
  console.log(`BadgeNFT: ${badgeNftAddress}`);
  if (dryRun) {
    console.log('Mode: DRY-RUN (no transactions will be sent)');
  }
  console.log('');

  const mintable: Array<{ name: string; id: Hex }> = [];

  for (const badge of BADGES) {
    const id = badgeId(badge.name);

    const earned = (await publicClient.readContract({
      address: seerAddress,
      abi: SEER_ABI,
      functionName: 'hasBadge',
      args: [accountAddress, id],
    })) as boolean;

    const expiry = (await publicClient.readContract({
      address: seerAddress,
      abi: SEER_ABI,
      functionName: 'badgeExpiry',
      args: [accountAddress, id],
    })) as bigint;

    const mintCheck = (await publicClient.readContract({
      address: badgeNftAddress,
      abi: BADGE_NFT_ABI,
      functionName: 'canMintBadge',
      args: [accountAddress, id],
    })) as readonly [boolean, string];

    const tokenId = (await publicClient.readContract({
      address: badgeNftAddress,
      abi: BADGE_NFT_ABI,
      functionName: 'userBadgeToken',
      args: [accountAddress, id],
    })) as bigint;

    const status = earned ? 'EARNED' : 'NOT_EARNED';
    const mintStatus = tokenId > 0n ? `MINTED #${tokenId}` : mintCheck[0] ? 'MINTABLE' : `NOT_MINTABLE (${mintCheck[1]})`;
    const expiryText = expiry > 0n ? `exp=${new Date(Number(expiry) * 1000).toISOString()}` : 'exp=permanent';
    const awardMode = badge.autoChecked ? 'auto' : 'operator/DAO';

    console.log(`${badge.name.padEnd(24)} ${status.padEnd(12)} ${mintStatus.padEnd(28)} ${awardMode.padEnd(12)} ${expiryText}`);

    if (!earned) {
      console.log(`  ↳ Achieve: ${badge.earnRequirement}`);
    }

    if (mintCheck[0] && tokenId === 0n) {
      mintable.push({ name: badge.name, id });
    }
  }

  console.log('');
  console.log(`Mintable badges now: ${mintable.length}`);

  if (mintAll || dryRun) {
    if (mintable.length === 0) {
      console.log('No badges available to mint right now.');
      return;
    }

    if (dryRun) {
      console.log('');
      console.log('Dry-run mint plan (simulated calls):');
      for (const b of mintable) {
        const data = encodeFunctionData({
          abi: BADGE_NFT_ABI,
          functionName: 'mintBadge',
          args: [b.id],
        });
        console.log(`  - ${b.name}`);
        console.log(`    to:   ${badgeNftAddress}`);
        console.log(`    data: ${data}`);
      }
      if (!mintAll) {
        return;
      }
    }

    if (!walletClient) {
      throw new Error('--mint-all requires PRIVATE_KEY or --private-key unless using --dry-run only.');
    }

    console.log('');
    console.log('Minting all currently available badges...');

    for (const b of mintable) {
      const hash = await (walletClient as any).writeContract({
        address: badgeNftAddress,
        abi: BADGE_NFT_ABI,
        functionName: 'mintBadge',
        args: [b.id],
      });
      await publicClient.waitForTransactionReceipt({ hash });
      console.log(`  ✓ ${b.name} minted (${hash})`);
    }
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});

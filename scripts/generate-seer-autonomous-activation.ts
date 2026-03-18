import { Contract, Interface, JsonRpcProvider, getAddress, isAddress } from 'ethers';

type AddressLabel = {
  key: string;
  required: boolean;
};

const ADDRESS_INPUTS: AddressLabel[] = [
  { key: 'SEER_AUTONOMOUS_ADDRESS', required: true },
  { key: 'DAO_ADDRESS', required: true },
  { key: 'ESCROW_MANAGER_ADDRESS', required: true },
  { key: 'SESSION_KEY_MANAGER_ADDRESS', required: true },
  { key: 'SEER_ADDRESS', required: false },
];

const SETTER_FRAGMENT = [
  'function setSeerAutonomous(address _seerAutonomous)'
];

const DAO_MAX_PROFILE_FRAGMENT = [
  'function daoApplyMaxAutonomyProfile()'
];

const DAO_READ_ABI = [
  'function timelock() view returns (address)'
];

const ESCROW_READ_ABI = [
  'function dao() view returns (address)'
];

const SESSION_READ_ABI = [
  'function dao() view returns (address)'
];

const SEER_READ_ABI = [
  'function dao() view returns (address)'
];

function fail(message: string): never {
  throw new Error(message);
}

function usage(): string {
  return [
    'Usage: npm run -s ops:seer:activation:plan',
    '',
    'Required env vars:',
    '  SEER_AUTONOMOUS_ADDRESS=0x...',
    '  DAO_ADDRESS=0x...',
    '  ESCROW_MANAGER_ADDRESS=0x...',
    '  SESSION_KEY_MANAGER_ADDRESS=0x...',
    '',
    'Optional env vars:',
    '  SEER_ADDRESS=0x...                 # include Seer.setSeerAutonomous call',
    '  RPC_URL=https://...                # verify authorized caller config on-chain',
    '  INCLUDE_DAO_MAX_AUTONOMY=true|false # include DAO strict autonomy preset call (default: true)',
  ].join('\n');
}

function getEnvAddress(key: string, required: boolean): string | undefined {
  const value = process.env[key];
  if (!value || value.trim() === '') {
    if (required) {
      fail(`Missing required env var ${key}\n\n${usage()}`);
    }
    return undefined;
  }

  if (!isAddress(value)) {
    fail(`Invalid address for ${key}: ${value}`);
  }

  return getAddress(value);
}

function encodeSetSeerAutonomous(target: string, seerAutonomous: string) {
  const iface = new Interface(SETTER_FRAGMENT);
  const data = iface.encodeFunctionData('setSeerAutonomous', [seerAutonomous]);
  return {
    target,
    signature: 'setSeerAutonomous(address)',
    value: '0',
    data,
  };
}

function encodeDaoApplyMaxAutonomyProfile(target: string) {
  const iface = new Interface(DAO_MAX_PROFILE_FRAGMENT);
  const data = iface.encodeFunctionData('daoApplyMaxAutonomyProfile', []);
  return {
    target,
    signature: 'daoApplyMaxAutonomyProfile()',
    value: '0',
    data,
  };
}

async function printCallerExpectations(addresses: Record<string, string | undefined>) {
  const rpcUrl = process.env.RPC_URL;
  if (!rpcUrl) {
    return;
  }

  const provider = new JsonRpcProvider(rpcUrl);

  const dao = new Contract(addresses.DAO_ADDRESS!, DAO_READ_ABI, provider);
  const escrow = new Contract(addresses.ESCROW_MANAGER_ADDRESS!, ESCROW_READ_ABI, provider);
  const session = new Contract(addresses.SESSION_KEY_MANAGER_ADDRESS!, SESSION_READ_ABI, provider);

  const timelock = getAddress(await (dao as any).timelock());
  const escrowDao = getAddress(await (escrow as any).dao());
  const sessionDao = getAddress(await (session as any).dao());

  console.log('\nAuthorized Caller Checks (from chain)');
  console.log('-------------------------------------');
  console.log(`DAO.setSeerAutonomous caller must be DAO timelock: ${timelock}`);
  console.log(`EscrowManager.setSeerAutonomous caller must equal escrow.dao: ${escrowDao}`);
  console.log(`SessionKeyManager.setSeerAutonomous caller must equal session.dao: ${sessionDao}`);

  if (addresses.SEER_ADDRESS) {
    const seer = new Contract(addresses.SEER_ADDRESS, SEER_READ_ABI, provider);
    const seerDao = getAddress(await (seer as any).dao());
    console.log(`Seer.setSeerAutonomous caller must equal seer.dao: ${seerDao}`);
  }
}

async function main() {
  if (process.argv.includes('--help') || process.argv.includes('-h')) {
    console.log(usage());
    return;
  }

  const addresses: Record<string, string | undefined> = {};
  for (const input of ADDRESS_INPUTS) {
    addresses[input.key] = getEnvAddress(input.key, input.required);
  }

  const seerAutonomous = addresses.SEER_AUTONOMOUS_ADDRESS!;
  const includeDaoMaxAutonomy = process.env.INCLUDE_DAO_MAX_AUTONOMY !== 'false';

  const calls = [
    {
      id: 'dao-set-seer-autonomous',
      ...encodeSetSeerAutonomous(addresses.DAO_ADDRESS!, seerAutonomous),
    },
    {
      id: 'escrow-set-seer-autonomous',
      ...encodeSetSeerAutonomous(addresses.ESCROW_MANAGER_ADDRESS!, seerAutonomous),
    },
    {
      id: 'session-key-manager-set-seer-autonomous',
      ...encodeSetSeerAutonomous(addresses.SESSION_KEY_MANAGER_ADDRESS!, seerAutonomous),
    },
  ];

  if (addresses.SEER_ADDRESS) {
    calls.push({
      id: 'seer-core-set-seer-autonomous',
      ...encodeSetSeerAutonomous(addresses.SEER_ADDRESS, seerAutonomous),
    });
  }

  if (includeDaoMaxAutonomy) {
    calls.push({
      id: 'dao-apply-max-autonomy-profile',
      ...encodeDaoApplyMaxAutonomyProfile(addresses.DAO_ADDRESS!),
    });
  }

  console.log('Seer Autonomous Activation Plan');
  console.log('===============================');
  console.log(`seerAutonomous: ${seerAutonomous}`);
  console.log('');
  console.log('Batch payload (JSON):');
  console.log(JSON.stringify(calls, null, 2));

  await printCallerExpectations(addresses);

  console.log('\nExecution Notes');
  console.log('---------------');
  console.log('1) Execute each call through the contract\'s authorized governance path.');
  console.log('2) DAO target must be executed by timelock because DAO setter is onlyTimelock.');
  console.log('3) Escrow and SessionKeyManager targets must be executed by each contract\'s dao() address.');
  console.log('4) After execution, verify non-zero seerAutonomous() on each target contract.');
  if (includeDaoMaxAutonomy) {
    console.log('5) DAO max-autonomy profile call should be sequenced after DAO.setSeerAutonomous(...) in the same proposal batch.');
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

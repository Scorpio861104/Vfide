/**
 * ABI PARITY TEST
 * ═══════════════════════════════════════════════════════════════
 * Catches contract-to-frontend mismatches BEFORE they reach production.
 *
 * Three layers verified:
 *   1. Frontend -> ABI: Every functionName in hooks/components exists in the ABI
 *   2. ABI -> Contract: Every ABI function exists in the Solidity source
 *   3. Contract -> ABI: New contract functions are added to the ABI
 *
 * Run: npx jest __tests__/abi-parity.test.ts
 * ═══════════════════════════════════════════════════════════════
 */

import * as fs from 'fs';
import * as path from 'path';

const describeIfEnabled = process.env.RUN_ABI_PARITY === '1' ? describe : describe.skip;

function loadABI(abiName: string): string[] {
  const filePath = path.join(__dirname, '..', 'lib', 'abis', `${abiName}.json`);
  if (!fs.existsSync(filePath)) return [];
  const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  const abi = Array.isArray(data) ? data : (data.abi || []);
  return abi
    .filter((x: any) => typeof x === 'object' && x.type === 'function')
    .map((x: any) => x.name);
}

function loadSolFunctions(contractName: string): string[] {
  const filePath = path.join(__dirname, '..', 'contracts', `${contractName}.sol`);
  if (!fs.existsSync(filePath)) return [];
  const src = fs.readFileSync(filePath, 'utf-8');
  const functionMatches = src.match(/function\s+(\w+)\s*\(/g) || [];
  const fns = functionMatches.map((m) => m.replace(/function\s+/, '').replace(/\s*\(/, ''));
  const pubVars = src.match(/(?:uint\d+|int\d+|address|bool|string|bytes\d*|mapping[^;]+)\s+public\s+(?:constant\s+|immutable\s+)?(\w+)/g) || [];
  const vars = pubVars.map((m) => {
    const parts = m.split(/\s+/);
    return parts[parts.length - 1];
  });
  return [...new Set([...fns, ...vars])];
}

function extractFunctionCalls(filePath: string): { line: number; functionName: string }[] {
  if (!fs.existsSync(filePath)) return [];
  const src = fs.readFileSync(filePath, 'utf-8');
  const results: { line: number; functionName: string }[] = [];
  const lines = src.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(/functionName:\s*['"](\w+)['"]/);
    if (match) {
      results.push({ line: i + 1, functionName: match[1] });
    }
  }
  return results;
}

const ABI_TO_SOL: Record<string, string> = {
  BurnRouter: 'ProofScoreBurnRouter',
  DevReserveVesting: 'DevReserveVestingVault',
};

function solNameForABI(abiName: string): string {
  return ABI_TO_SOL[abiName] || abiName;
}

const INHERITED_FUNCTIONS = new Set([
  'owner', 'pendingOwner', 'acceptOwnership', 'transferOwnership',
  'cancelOwnershipTransfer', 'emergencyController', 'emergencyTransferOwnership',
  'setEmergencyController', 'applyEmergencyController', 'cancelEmergencyController',
  'pendingEmergencyController', 'pendingEmergencyControllerAt', 'ownershipTransferDeadline',
  'EMERGENCY_CONTROLLER_DELAY',
  'paused',
  'approve', 'balanceOf', 'getApproved', 'isApprovedForAll', 'name',
  'ownerOf', 'safeTransferFrom', 'setApprovalForAll', 'supportsInterface',
  'symbol', 'tokenURI', 'totalSupply', 'transferFrom',
  'DEFAULT_ADMIN_ROLE', 'getRoleAdmin', 'grantRole', 'hasRole',
  'renounceRole', 'revokeRole',
]);

interface FrontendCall {
  file: string;
  line: number;
  functionName: string;
  targetABI: string;
}

const FILE_TO_ABIS: Record<string, string[]> = {
  'hooks/useVaultHub.ts': ['VaultHub'],
  'hooks/useVaultHooks.ts': ['VaultHub', 'VFIDEToken', 'CardBoundVault', 'UserVault'],
  'hooks/useVaultRecovery.ts': ['UserVault', 'CardBoundVault', 'VaultHub'],
  'hooks/useVaultRegistry.ts': ['VaultRegistry', 'VaultRecoveryClaim'],
  'hooks/usePayment.ts': ['VFIDEToken', 'BurnRouter', 'UserVault'],
  'hooks/usePayroll.ts': ['PayrollManager'],
  'hooks/useVFIDEBalance.ts': ['VFIDEToken'],
  'hooks/useProofScore.ts': ['Seer', 'ProofScoreBurnRouter'],
  'hooks/useProofScoreHooks.ts': ['Seer', 'SeerSocial'],
  'hooks/useDAOHooks.ts': ['DAO'],
  'hooks/useMerchantHooks.ts': ['MerchantPortal'],
  'hooks/useMerchantStatus.ts': ['MerchantPortal'],
  'hooks/useBadgeHooks.ts': ['VFIDEBadgeNFT', 'Seer'],
  'hooks/useAppeals.ts': ['SeerSocial'],
  'hooks/useMentorHooks.ts': ['SeerView', 'SeerSocial'],
  'hooks/useSeerInsights.ts': ['SeerSocial', 'SeerAutonomous', 'SeerGuardian'],
  'hooks/useLeaderboard.ts': ['Seer'],
  'hooks/useHeadhunterHooks.ts': ['EcosystemVault', 'EcosystemVaultView'],
  'hooks/useSecurityHooks.ts': ['PanicGuard', 'GuardianRegistry', 'GuardianLock', 'EmergencyBreaker', 'VaultHub'],
  'hooks/useHasVault.ts': ['VaultHub'],
  'hooks/useSimpleVault.ts': ['UserVault', 'CardBoundVault'],
  'app/vault/components/useVaultOperations.ts': ['VFIDEToken', 'CardBoundVault', 'UserVault', 'VaultHub'],
  'app/vault/components/MerchantApprovalPanel.tsx': ['ERC20', 'CardBoundVault'],
  'app/governance/components/ProposalsTab.tsx': ['DAO'],
  'app/endorsements/page.tsx': ['SeerView', 'SeerSocial'],
  'app/admin/AdminDashboardClient.tsx': ['VFIDEToken', 'ProofScoreBurnRouter'],
  'lib/escrow/useEscrow.ts': ['CommerceEscrow', 'VFIDEToken', 'CardBoundVault'],
};

describeIfEnabled('Layer 1: Frontend functionName -> ABI existence', () => {
  const allCalls: FrontendCall[] = [];

  for (const [relFile, abiNames] of Object.entries(FILE_TO_ABIS)) {
    const absPath = path.join(__dirname, '..', relFile);
    const calls = extractFunctionCalls(absPath);
    for (const call of calls) {
      allCalls.push({ file: relFile, ...call, targetABI: abiNames.join('|') });
    }
  }

  const abiCache: Record<string, Set<string>> = {};
  for (const abiNames of Object.values(FILE_TO_ABIS)) {
    for (const name of abiNames) {
      if (!abiCache[name]) {
        abiCache[name] = new Set(loadABI(name));
      }
    }
  }

  for (const call of allCalls) {
    const abiNames = FILE_TO_ABIS[call.file] || [];
    const existsInAny = abiNames.some((name) => abiCache[name]?.has(call.functionName));

    test(`${call.file}:${call.line} -> ${call.functionName} exists in [${call.targetABI}]`, () => {
      expect(existsInAny).toBe(true);
    });
  }
});

const KEY_CONTRACTS = [
  'VFIDEToken', 'VaultHub', 'CardBoundVault', 'Seer', 'SeerSocial', 'SeerView',
  'DAO', 'MerchantPortal', 'ProofScoreBurnRouter', 'PayrollManager',
  'VaultRegistry', 'VaultRecoveryClaim', 'VFIDEBadgeNFT', 'EcosystemVault',
  'EcosystemVaultView', 'FraudRegistry', 'FeeDistributor', 'EscrowManager',
  'OwnerControlPanel', 'VFIDETestnetFaucet', 'CouncilElection', 'CouncilSalary',
];

describeIfEnabled('Layer 2: ABI functions exist in Solidity source', () => {
  for (const abiName of KEY_CONTRACTS) {
    const abiFns = loadABI(abiName);
    const solName = solNameForABI(abiName);
    const solFns = new Set(loadSolFunctions(solName));

    for (const fn of abiFns) {
      if (INHERITED_FUNCTIONS.has(fn)) continue;
      if (fn.startsWith('_')) continue;

      test(`${abiName}.json: ${fn}() exists in ${solName}.sol`, () => {
        expect(solFns.has(fn)).toBe(true);
      });
    }
  }
});

describeIfEnabled('Layer 3: Solidity functions present in ABI', () => {
  for (const abiName of KEY_CONTRACTS) {
    const abiFnSet = new Set(loadABI(abiName));
    const solName = solNameForABI(abiName);
    const solFns = loadSolFunctions(solName);

    for (const fn of solFns) {
      if (fn.startsWith('_')) continue;
      if (INHERITED_FUNCTIONS.has(fn)) continue;

      test(`${solName}.sol: ${fn}() is in ${abiName}.json ABI`, () => {
        expect(abiFnSet.has(fn)).toBe(true);
      });
    }
  }
});

const USERVAULT_ONLY_FUNCTIONS = new Set([
  'pendingTxCount', 'pendingTransactions', 'transferVFIDE',
  'isGuardianMature', 'abnormalTransactionThreshold', 'usePercentageThreshold',
  'abnormalTransactionPercentageBps', 'setBalanceSnapshotMode', 'updateBalanceSnapshot',
  'useBalanceSnapshot', 'balanceSnapshot', 'approvePendingTransaction',
  'executePendingTransaction', 'cleanupExpiredTransaction', 'guardianCancelInheritance',
  'nextOfKin', 'getGuardians', 'getRecoveryStatus', 'getInheritanceStatus',
  'requestRecovery', 'guardianApproveRecovery', 'finalizeRecovery', 'cancelRecovery',
  'requestInheritance', 'approveInheritance', 'denyInheritance', 'finalizeInheritance',
  'setNextOfKin', 'execute',
]);

describeIfEnabled('Layer 4: UserVault-only functions must be gated in CBV mode', () => {
  const filesToCheck = [
    'hooks/useVaultHooks.ts',
    'hooks/useVaultRecovery.ts',
    'hooks/useSimpleVault.ts',
    'app/vault/components/useVaultOperations.ts',
    'app/guardians/components/GuardianManagementTabs.tsx',
  ];

  for (const relFile of filesToCheck) {
    const absPath = path.join(__dirname, '..', relFile);
    if (!fs.existsSync(absPath)) continue;
    const src = fs.readFileSync(absPath, 'utf-8');
    const calls = extractFunctionCalls(absPath);

    for (const call of calls) {
      if (!USERVAULT_ONLY_FUNCTIONS.has(call.functionName)) continue;

      const hasGuard = src.includes('isCardBoundVaultMode') ||
                       src.includes('cardBoundMode') ||
                       src.includes('isLegacyMode') ||
                       src.includes('recoverySupported');

      test(`${relFile}:${call.line} -> ${call.functionName} has CBV mode guard in file`, () => {
        expect(hasGuard).toBe(true);
      });

      const lines = src.split('\n');
      const nearbyLines = lines.slice(Math.max(0, call.line - 8), call.line + 3).join(' ');
      const isGuarded = nearbyLines.includes('isLegacyMode') ||
                        nearbyLines.includes('!cardBoundMode') ||
                        nearbyLines.includes('recoverySupported') ||
                        nearbyLines.includes('!isCardBoundVaultMode') ||
                        nearbyLines.includes('inheritanceSupported');

      test(`${relFile}:${call.line} -> ${call.functionName} call is individually guarded`, () => {
        expect(isGuarded).toBe(true);
      });
    }
  }
});

describeIfEnabled('Layer 5: Every ABI has a corresponding Solidity source', () => {
  const abiDir = path.join(__dirname, '..', 'lib', 'abis');
  const contractDir = path.join(__dirname, '..', 'contracts');
  const abiFiles = fs.readdirSync(abiDir).filter((f) => f.endsWith('.json') && f !== 'index.ts');

  const KNOWN_EXTERNAL = new Set([
    'ERC20.json',
    'AggregatorV3Interface.json',
  ]);

  const REMAP: Record<string, string> = {
    'BurnRouter.json': 'ProofScoreBurnRouter.sol',
    'DevReserveVesting.json': 'DevReserveVestingVault.sol',
  };

  for (const abiFile of abiFiles) {
    if (KNOWN_EXTERNAL.has(abiFile)) continue;

    const expectedSol = REMAP[abiFile] || abiFile.replace('.json', '.sol');
    const solPath = path.join(contractDir, expectedSol);

    test(`${abiFile} has source: ${expectedSol}`, () => {
      expect(fs.existsSync(solPath)).toBe(true);
    });
  }
});

describeIfEnabled('Layer 6: Mock CONTRACT_ADDRESSES matches real', () => {
  const mockPath = path.join(__dirname, '..', 'lib', '__mocks__', 'contracts.ts');
  const realPath = path.join(__dirname, '..', 'lib', 'contracts.ts');

  if (!fs.existsSync(mockPath) || !fs.existsSync(realPath)) return;

  const mockSrc = fs.readFileSync(mockPath, 'utf-8');
  const realSrc = fs.readFileSync(realPath, 'utf-8');

  const extractKeys = (src: string): string[] => {
    const matches = src.match(/(\w+):\s*(?:validateContractAddress|['"]0x)/g) || [];
    return matches.map((m) => m.split(/[:\s]/)[0]).filter(Boolean);
  };

  const realKeys = new Set(extractKeys(realSrc));
  const mockKeys = new Set(extractKeys(mockSrc));

  for (const key of realKeys) {
    test(`Mock CONTRACT_ADDRESSES has key: ${key}`, () => {
      expect(mockKeys.has(key)).toBe(true);
    });
  }

  for (const key of mockKeys) {
    test(`Mock key ${key} exists in real CONTRACT_ADDRESSES`, () => {
      expect(realKeys.has(key)).toBe(true);
    });
  }
});

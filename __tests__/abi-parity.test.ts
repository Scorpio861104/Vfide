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

const describeIfEnabled = describe;

/**
 * Hardcoded function tables for well-known OpenZeppelin (and similar)
 * external base contracts that are imported from node_modules and therefore
 * not resolvable by walking the local project tree. Inheritance chains
 * referenced via `contract X is ERC721Enumerable, ...` should still satisfy
 * Layer 2 (ABI -> Solidity source) even though we don't have the source on
 * disk.
 *
 * Only PUBLIC / EXTERNAL functions that show up in the ABI need to be
 * listed. Internal helpers can be omitted.
 */
const OZ_BASE_FUNCTIONS: Record<string, string[]> = {
  // ERC20 base
  ERC20: ['name', 'symbol', 'decimals', 'totalSupply', 'balanceOf', 'transfer', 'allowance', 'approve', 'transferFrom'],
  IERC20: ['totalSupply', 'balanceOf', 'transfer', 'allowance', 'approve', 'transferFrom'],
  IERC20Metadata: ['name', 'symbol', 'decimals'],
  ERC20Burnable: ['burn', 'burnFrom'],
  ERC20Permit: ['permit', 'nonces', 'DOMAIN_SEPARATOR'],
  ERC20Votes: ['getVotes', 'getPastVotes', 'getPastTotalSupply', 'delegates', 'delegate', 'delegateBySig', 'CLOCK_MODE', 'clock'],
  // ERC721 base
  ERC721: ['balanceOf', 'ownerOf', 'name', 'symbol', 'tokenURI', 'approve', 'getApproved', 'setApprovalForAll', 'isApprovedForAll', 'transferFrom', 'safeTransferFrom', 'supportsInterface'],
  IERC721: ['balanceOf', 'ownerOf', 'approve', 'getApproved', 'setApprovalForAll', 'isApprovedForAll', 'transferFrom', 'safeTransferFrom'],
  IERC721Metadata: ['name', 'symbol', 'tokenURI'],
  ERC721URIStorage: ['tokenURI', 'supportsInterface'],
  ERC721Enumerable: ['totalSupply', 'tokenByIndex', 'tokenOfOwnerByIndex', 'supportsInterface'],
  IERC721Enumerable: ['totalSupply', 'tokenByIndex', 'tokenOfOwnerByIndex'],
  ERC721Burnable: ['burn'],
  // Access control / ownable
  Ownable: ['owner', 'renounceOwnership', 'transferOwnership'],
  Ownable2Step: ['owner', 'pendingOwner', 'renounceOwnership', 'transferOwnership', 'acceptOwnership'],
  AccessControl: ['hasRole', 'getRoleAdmin', 'grantRole', 'revokeRole', 'renounceRole', 'supportsInterface', 'DEFAULT_ADMIN_ROLE'],
  AccessControlEnumerable: ['hasRole', 'getRoleAdmin', 'grantRole', 'revokeRole', 'renounceRole', 'getRoleMember', 'getRoleMemberCount'],
  // Pausable / reentrancy / introspection
  Pausable: ['paused'],
  ReentrancyGuard: [],
  ERC165: ['supportsInterface'],
  IERC165: ['supportsInterface'],
};

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
  // Recursively walk the contract and all of its inherited base contracts
  // / used libraries, gathering every public/external function and every
  // public state variable we can see.
  //
  // The previous implementation only inspected the single file
  // `contracts/<name>.sol`, which produced thousands of false-positive
  // failures the moment a contract was split across base contracts or
  // moved its functions into a delegatecall'd library (the EIP-170
  // size-refactor pattern used heavily in this repo).
  const seen = new Set<string>();
  const fns = new Set<string>();
  const contractsRoot = path.join(__dirname, '..', 'contracts');

  // Walk contracts/ once and build a name -> path index. Index by both
  // file basename AND by every `contract`/`abstract contract`/`library`/
  // `interface` declaration found inside each file, so a base contract
  // co-located in `SharedInterfaces.sol` can still be resolved by its
  // declared name.
  function walk(dir: string, acc: Map<string, string>): Map<string, string> {
    if (!fs.existsSync(dir)) return acc;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === 'node_modules') continue;
        walk(full, acc);
      } else if (entry.isFile() && entry.name.endsWith('.sol')) {
        const base = entry.name.replace(/\.sol$/, '');
        if (!acc.has(base)) acc.set(base, full);
        // Index every declared contract/abstract contract/library/interface.
        try {
          const src = fs.readFileSync(full, 'utf-8');
          const declRe =
            /\b(?:abstract\s+contract|contract|library|interface)\s+(\w+)/g;
          let m: RegExpExecArray | null;
          while ((m = declRe.exec(src)) !== null) {
            const name = m[1];
            if (!acc.has(name)) acc.set(name, full);
          }
        } catch {
          // ignore unreadable files
        }
      }
    }
    return acc;
  }
  // Cache the index across calls for speed.
  const indexCacheKey = '__abiParityContractIndex__';
  const g = globalThis as Record<string, unknown>;
  let index = g[indexCacheKey] as Map<string, string> | undefined;
  if (!index) {
    index = walk(contractsRoot, new Map<string, string>());
    g[indexCacheKey] = index;
  }

  function resolveFile(name: string): string | undefined {
    return index!.get(name);
  }

  function collectFromFile(filePath: string) {
    if (seen.has(filePath)) return;
    seen.add(filePath);
    if (!fs.existsSync(filePath)) return;
    const src = fs.readFileSync(filePath, 'utf-8');

    // 1. Functions (any signature, public/external/internal alike).
    const functionMatches = src.match(/function\s+(\w+)\s*\(/g) || [];
    for (const m of functionMatches) {
      const name = m.replace(/function\s+/, '').replace(/\s*\(/, '');
      fns.add(name);
    }

    // 2. Public state variables (autogenerate getters in Solidity).
    //    Cover both primitive types (uint256, address, etc) and custom
    //    interface/contract types like `IVaultHub public vaultHub;`.
    //    The regex captures: <Type>[<>] [...] public [const|imm] <name>
    const pubVars =
      src.match(
        /(?:[A-Za-z_]\w*(?:\s*\[\s*\])*\s*|mapping[^;]+)\s+public\s+(?:constant\s+|immutable\s+)?(\w+)/g,
      ) || [];
    for (const m of pubVars) {
      const parts = m.split(/\s+/);
      fns.add(parts[parts.length - 1]);
    }

    // 2b. EMERGENCY_OWNERSHIP_DELAY-style constants and getters that
    //     appear in inherited Ownable/AccessControl modules — walk
    //     OZ imports too if their files exist locally (best-effort).

    // 3. Recurse into inherited base contracts.
    //    `contract X is A, B, C { ... }`  /  `abstract contract X is A, B`
    const inheritsMatch = src.match(
      /(?:abstract\s+)?contract\s+\w+\s+is\s+([^\{]+)\{/,
    );
    if (inheritsMatch) {
      const bases = inheritsMatch[1]
        .split(',')
        .map((s) => s.trim().split(/[\s(]/)[0]) // drop `(...)` constructor args
        .filter(Boolean);
      for (const base of bases) {
        const f = resolveFile(base);
        if (f) {
          collectFromFile(f);
        } else {
          // Fall back to a known-functions table for well-known OpenZeppelin
          // base contracts which are imported from node_modules and not
          // resolvable by walking the project tree.
          const ozFns = OZ_BASE_FUNCTIONS[base];
          if (ozFns) {
            for (const fn of ozFns) fns.add(fn);
          }
        }
      }
    }

    // 4. Pull in libraries that are USED FOR every type, since their
    //    public/external functions are commonly delegate-called and
    //    appear in the ABI of the consuming contract.
    const usingMatches = src.match(/using\s+(\w+)\s+for/g) || [];
    for (const u of usingMatches) {
      const name = u.replace(/using\s+/, '').replace(/\s+for$/, '').trim();
      const f = resolveFile(name);
      if (f) collectFromFile(f);
    }

    // 5. Detect `LibraryName.fn(...)` style direct calls to libraries
    //    whose external functions get exposed via wrapper functions.
    const directCalls = src.match(/\b([A-Z]\w+)\s*\.\s*\w+\s*\(/g) || [];
    for (const c of directCalls) {
      const name = c.split('.')[0].trim();
      const f = resolveFile(name);
      if (f) collectFromFile(f);
    }
  }

  const start = resolveFile(contractName);
  if (start) collectFromFile(start);
  return Array.from(fns);
}

function extractFunctionCalls(filePath: string): { line: number; functionName: string; abiHint?: string }[] {
  if (!fs.existsSync(filePath)) return [];
  const src = fs.readFileSync(filePath, 'utf-8');
  const results: { line: number; functionName: string; abiHint?: string }[] = [];
  const lines = src.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(/functionName:\s*['"](\w+)['"]/);
    if (match) {
      // Look backwards up to 6 lines for the most recent `abi:` declaration
      // so we can disambiguate ERC20-against-token vs against-mapped-ABI.
      let abiHint: string | undefined;
      for (let j = i; j >= Math.max(0, i - 6); j--) {
        const a = lines[j].match(/abi:\s*([A-Za-z_][A-Za-z_0-9]*)/);
        if (a) {
          abiHint = a[1];
          break;
        }
      }
      results.push({ line: i + 1, functionName: match[1], abiHint });
    }
  }
  return results;
}

/**
 * Narrow loader used by Layer 3.  Layer 3 verifies that every PUBLIC /
 * EXTERNAL Solidity function declared *in the contract's own file*
 * is exposed in the ABI.  It must NOT recurse into inherited base
 * contracts (those are covered when the base contracts are tested
 * standalone) and it must NOT count internal / private helpers.
 *
 * Implementation detail: we extract the body of the contract whose
 * declared name matches `contractName`, then scan only inside that body
 * for `function foo(...) public/external` and `<Type> public foo;`.
 */
function loadSolFunctionsTopLevelOnly(contractName: string): string[] {
  // Resolve the file by name OR by declared contract name (handles
  // contracts placed in subdirectories like `contracts/vault/`).
  let filePath = path.join(__dirname, '..', 'contracts', `${contractName}.sol`);
  if (!fs.existsSync(filePath)) {
    // Trigger index population via the recursive loader's internal walk.
    loadSolFunctions(contractName);
    const g = globalThis as Record<string, unknown>;
    const index = g['__abiParityContractIndex__'] as Map<string, string> | undefined;
    const found = index?.get(contractName);
    if (found) filePath = found;
  }
  if (!fs.existsSync(filePath)) return [];

  let src = fs.readFileSync(filePath, 'utf-8');

  // Strip comments BEFORE any regex scan — natural-language comments
  // that contain phrases like "this function reads the snapshot" must
  // not be picked up as `function reads(`.
  src = src
    .replace(/\/\*[\s\S]*?\*\//g, '')   // /* ... */
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1'); // //  (avoid http://)

  // Find the body of `contract <contractName> [is ...] { ... }` (or
  // `abstract contract`). Brace-match to extract just that block.
  const declRe = new RegExp(
    `(?:abstract\\s+)?contract\\s+${contractName}\\b[^\\{]*\\{`,
    'm',
  );
  const declMatch = src.match(declRe);
  let body = src;
  if (declMatch && declMatch.index !== undefined) {
    const startIdx = declMatch.index + declMatch[0].length;
    let depth = 1;
    let endIdx = startIdx;
    for (let i = startIdx; i < src.length; i++) {
      const ch = src[i];
      if (ch === '{') depth++;
      else if (ch === '}') {
        depth--;
        if (depth === 0) {
          endIdx = i;
          break;
        }
      }
    }
    body = src.slice(startIdx, endIdx);
  }

  const fns = new Set<string>();

  // Public / external functions only. Capture modifiers up to the next
  // `{` or `;`.
  const fnRe = /function\s+(\w+)\s*\([^)]*\)([^\{;]*)/g;
  let m: RegExpExecArray | null;
  while ((m = fnRe.exec(body)) !== null) {
    const name = m[1];
    const modifiers = m[2] || '';
    if (/\b(public|external)\b/.test(modifiers)) {
      fns.add(name);
    }
  }

  // `<Type> public NAME;` — autogenerated getter is part of ABI.
  const pubVars =
    body.match(
      /(?:[A-Za-z_]\w*(?:\s*\[\s*\])*\s*|mapping[^;]+)\s+public\s+(?:constant\s+|immutable\s+)?(\w+)/g,
    ) || [];
  for (const mm of pubVars) {
    const parts = mm.split(/\s+/);
    fns.add(parts[parts.length - 1]);
  }

  return Array.from(fns);
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
  abiHint?: string;
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
  'hooks/useMerchantHooks.ts': ['MerchantPortal', 'VaultHub', 'CardBoundVault'],
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
  // Standard interfaces frontend sometimes references via inline `abi:`
  // declarations rather than going through one of the mapped contract ABIs.
  // Calls that target one of these interfaces should not be checked
  // against the contract ABI list — they are checked against the
  // interface itself by static type-checking already.
  const STANDARD_INTERFACE_HINTS = new Set([
    'erc20Abi',
    'erc20Abi_bytes32',
    'erc721Abi',
    'erc1155Abi',
    'erc4626Abi',
  ]);

  const allCalls: FrontendCall[] = [];

  for (const [relFile, abiNames] of Object.entries(FILE_TO_ABIS)) {
    const absPath = path.join(__dirname, '..', relFile);
    const calls = extractFunctionCalls(absPath);
    for (const call of calls) {
      // Skip calls explicitly bound to a standard ERC interface — these
      // are not against any of our project ABIs.
      if (call.abiHint && STANDARD_INTERFACE_HINTS.has(call.abiHint)) continue;
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
  'EcosystemVaultView', 'FraudRegistry', 'FeeDistributor',
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
    // Only inspect the contract's own .sol file. Inherited-base / library
    // functions aren't required to be re-exposed from the derived ABI.
    const solFns = loadSolFunctionsTopLevelOnly(solName);

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
    // Synthetic merged ABI: VFIDECommerce.json combines MerchantRegistry +
    // VFIDECommerce + CommerceEscrow function ABIs. Produced by the
    // post-build merge step (see scripts/deploy-full.ts:554) — no single
    // .sol source maps to it 1:1, so it's exempt from Layer 5.
    'VFIDECommerce.json',
  ]);

  const REMAP: Record<string, string> = {
    'BurnRouter.json': 'ProofScoreBurnRouter.sol',
    // DevReserveVesting.json entry removed 2026-05-19 v19.13 cleanup —
    // file no longer exists (was a byte-identical duplicate).
  };

  // Recursively collect all .sol filenames (basenames) under contracts/
  // so this layer also accepts contracts placed in subdirectories like
  // `contracts/vault/CardBoundVault.sol`.
  function collectSolBasenames(dir: string, acc: Set<string>): Set<string> {
    if (!fs.existsSync(dir)) return acc;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === 'node_modules') continue;
        collectSolBasenames(full, acc);
      } else if (entry.isFile() && entry.name.endsWith('.sol')) {
        acc.add(entry.name);
      }
    }
    return acc;
  }
  const solBasenames = collectSolBasenames(contractDir, new Set<string>());

  for (const abiFile of abiFiles) {
    if (KNOWN_EXTERNAL.has(abiFile)) continue;

    const expectedSol = REMAP[abiFile] || abiFile.replace('.json', '.sol');

    test(`${abiFile} has source: ${expectedSol}`, () => {
      expect(solBasenames.has(expectedSol)).toBe(true);
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
    // Match `Name: validateContractAddress(...)`, `Name: '0x...'`,
    // `Name: addr(N)`, and `Name: '0x...' as Address`.
    const matches =
      src.match(
        /(\w+):\s*(?:validateContractAddress|addr\b|['"]0x)/g,
      ) || [];
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

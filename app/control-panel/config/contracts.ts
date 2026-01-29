// OwnerControlPanel Contract Configuration
export const OWNER_CONTROL_PANEL_ADDRESS = '0x0000000000000000000000000000000000000000' as `0x${string}`;

export const OWNER_CONTROL_PANEL_ABI = [
  // Owner verification
  {
    name: 'owner',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'address' }],
  },
  // System Status
  {
    name: 'system_getStatus',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [
      { name: 'allHoweySafe', type: 'bool' },
      { name: 'autoSwapEnabled', type: 'bool' },
      { name: 'tokenCircuitBreaker', type: 'bool' },
      { name: 'tokenVaultOnly', type: 'bool' },
      { name: 'tokenPolicyLocked', type: 'bool' },
      { name: 'healthStatus', type: 'string' },
    ],
  },
  // Howey-Safe Mode
  {
    name: 'howey_getStatus',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [
      { name: 'dutyDistributorSafe', type: 'bool' },
      { name: 'councilSalarySafe', type: 'bool' },
      { name: 'councilManagerSafe', type: 'bool' },
      { name: 'promotionalTreasurySafe', type: 'bool' },
      { name: 'liquidityIncentivesSafe', type: 'bool' },
    ],
  },
  {
    name: 'howey_areAllSafe',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: 'allSafe', type: 'bool' }],
  },
  {
    name: 'howey_setAllSafeMode',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'enabled', type: 'bool' }],
    outputs: [],
  },
  {
    name: 'howey_setDutyDistributor',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'enabled', type: 'bool' }],
    outputs: [],
  },
  {
    name: 'howey_setCouncilSalary',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'enabled', type: 'bool' }],
    outputs: [],
  },
  {
    name: 'howey_setCouncilManager',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'enabled', type: 'bool' }],
    outputs: [],
  },
  {
    name: 'howey_setPromotionalTreasury',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'enabled', type: 'bool' }],
    outputs: [],
  },
  {
    name: 'howey_setLiquidityIncentives',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'enabled', type: 'bool' }],
    outputs: [],
  },
  // Auto-Swap
  {
    name: 'autoSwap_getConfig',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [
      { name: 'router', type: 'address' },
      { name: 'stablecoin', type: 'address' },
      { name: 'enabled', type: 'bool' },
      { name: 'maxSlippageBps', type: 'uint16' },
    ],
  },
  {
    name: 'autoSwap_configure',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'router', type: 'address' },
      { name: 'stablecoin', type: 'address' },
      { name: 'enabled', type: 'bool' },
      { name: 'maxSlippageBps', type: 'uint16' },
    ],
    outputs: [],
  },
  {
    name: 'autoSwap_setEnabled',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'enabled', type: 'bool' }],
    outputs: [],
  },
  {
    name: 'autoSwap_quickSetupUSDC',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'router', type: 'address' },
      { name: 'usdc', type: 'address' },
    ],
    outputs: [],
  },
  // Token Management
  {
    name: 'token_setModules',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'hub', type: 'address' },
      { name: 'security', type: 'address' },
      { name: 'ledger', type: 'address' },
      { name: 'router', type: 'address' },
    ],
    outputs: [],
  },
  {
    name: 'token_setSinks',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'treasury', type: 'address' },
      { name: 'sanctum', type: 'address' },
    ],
    outputs: [],
  },
  {
    name: 'token_setWhitelist',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'addr', type: 'address' },
      { name: 'status', type: 'bool' },
    ],
    outputs: [],
  },
  {
    name: 'token_setBlacklist',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'user', type: 'address' },
      { name: 'status', type: 'bool' },
    ],
    outputs: [],
  },
  {
    name: 'token_setAntiWhale',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'maxTransfer', type: 'uint256' },
      { name: 'maxWallet', type: 'uint256' },
      { name: 'dailyLimit', type: 'uint256' },
      { name: 'cooldown', type: 'uint256' },
    ],
    outputs: [],
  },
  {
    name: 'token_setVaultOnly',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'enabled', type: 'bool' }],
    outputs: [],
  },
  {
    name: 'token_lockPolicy',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [],
    outputs: [],
  },
  {
    name: 'token_setCircuitBreaker',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'active', type: 'bool' },
      { name: 'duration', type: 'uint256' },
    ],
    outputs: [],
  },
  {
    name: 'token_isCircuitBreakerActive',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'bool' }],
  },
  // Fee Management
  {
    name: 'fees_setPolicy',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'minBps', type: 'uint16' },
      { name: 'maxBps', type: 'uint16' },
    ],
    outputs: [],
  },
  {
    name: 'fees_getPolicy',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [
      { name: 'minBps', type: 'uint16' },
      { name: 'maxBps', type: 'uint16' },
    ],
  },
  // Ecosystem Management
  {
    name: 'ecosystem_setManager',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'manager', type: 'address' },
      { name: 'active', type: 'bool' },
    ],
    outputs: [],
  },
  {
    name: 'ecosystem_setAllocations',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'councilBps', type: 'uint16' },
      { name: 'merchantBps', type: 'uint16' },
      { name: 'headhunterBps', type: 'uint16' },
    ],
    outputs: [],
  },
  // Production Setup
  {
    name: 'production_setupSafeDefaults',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [],
    outputs: [],
  },
  {
    name: 'production_setupWithAutoSwap',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'dexRouter', type: 'address' },
      { name: 'usdc', type: 'address' },
    ],
    outputs: [],
  },
  // Emergency
  {
    name: 'emergency_pauseAll',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [],
    outputs: [],
  },
  {
    name: 'emergency_resumeAll',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [],
    outputs: [],
  },
] as const;

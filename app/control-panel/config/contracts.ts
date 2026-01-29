// OwnerControlPanel Contract Configuration
export const OWNER_CONTROL_PANEL_ADDRESS = '0x0000000000000000000000000000000000000000' as `0x${string}`;

export const OWNER_CONTROL_PANEL_ABI = [
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
    name: 'howey_setAllSafeMode',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'enabled', type: 'bool' }],
    outputs: [],
  },
] as const;

/**
 * Escrow ABIs - Complete and type-safe contract interfaces
 */

export const ESCROW_ABI = [
  // Events
  {
    type: 'event',
    name: 'EscrowCreated',
    inputs: [
      { name: 'escrowId', type: 'uint256', indexed: true },
      { name: 'buyer', type: 'address', indexed: true },
      { name: 'merchant', type: 'address', indexed: true },
      { name: 'amount', type: 'uint256', indexed: false },
      { name: 'releaseTime', type: 'uint256', indexed: false },
      { name: 'lockPeriod', type: 'uint256', indexed: false },
      { name: 'timestamp', type: 'uint256', indexed: false }
    ]
  },
  {
    type: 'event',
    name: 'EscrowReleased',
    inputs: [
      { name: 'escrowId', type: 'uint256', indexed: true },
      { name: 'to', type: 'address', indexed: true }
    ]
  },
  {
    type: 'event',
    name: 'EscrowRefunded',
    inputs: [
      { name: 'escrowId', type: 'uint256', indexed: true }
    ]
  },
  {
    type: 'event',
    name: 'DisputeRaised',
    inputs: [
      { name: 'escrowId', type: 'uint256', indexed: true },
      { name: 'by', type: 'address', indexed: true }
    ]
  },
  {
    type: 'event',
    name: 'DisputeResolved',
    inputs: [
      { name: 'escrowId', type: 'uint256', indexed: true },
      { name: 'winner', type: 'address', indexed: true }
    ]
  },
  {
    type: 'event',
    name: 'EscrowNearTimeout',
    inputs: [
      { name: 'escrowId', type: 'uint256', indexed: true },
      { name: 'timeRemaining', type: 'uint256', indexed: false }
    ]
  },

  // State-Changing Functions
  {
    type: 'function',
    name: 'createEscrow',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'merchant', type: 'address' },
      { name: 'token', type: 'address' },
      { name: 'amount', type: 'uint256' },
      { name: 'orderId', type: 'string' }
    ],
    outputs: [{ type: 'uint256' }]
  },
  {
    type: 'function',
    name: 'release',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'id', type: 'uint256' }],
    outputs: []
  },
  {
    type: 'function',
    name: 'approveRelease',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'id', type: 'uint256' }],
    outputs: []
  },
  {
    type: 'function',
    name: 'refund',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'id', type: 'uint256' }],
    outputs: []
  },
  {
    type: 'function',
    name: 'approveRefund',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'id', type: 'uint256' }],
    outputs: []
  },
  {
    type: 'function',
    name: 'claimTimeout',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'id', type: 'uint256' }],
    outputs: []
  },
  {
    type: 'function',
    name: 'raiseDispute',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'id', type: 'uint256' }],
    outputs: []
  },
  {
    type: 'function',
    name: 'resolveDispute',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'id', type: 'uint256' },
      { name: 'refundBuyer', type: 'bool' }
    ],
    outputs: []
  },
  {
    type: 'function',
    name: 'resolveDisputePartial',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'id', type: 'uint256' },
      { name: 'buyerShareBps', type: 'uint256' }
    ],
    outputs: []
  },
  {
    type: 'function',
    name: 'notifyTimeout',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'id', type: 'uint256' }],
    outputs: []
  },

  // View Functions
  {
    type: 'function',
    name: 'escrowCount',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint256' }]
  },
  {
    type: 'function',
    name: 'escrows',
    stateMutability: 'view',
    inputs: [{ name: 'id', type: 'uint256' }],
    outputs: [
      { name: 'buyer', type: 'address' },
      { name: 'merchant', type: 'address' },
      { name: 'token', type: 'address' },
      { name: 'amount', type: 'uint256' },
      { name: 'createdAt', type: 'uint256' },
      { name: 'releaseTime', type: 'uint256' },
      { name: 'state', type: 'uint8' },
      { name: 'orderId', type: 'string' }
    ]
  },
  {
    type: 'function',
    name: 'buyerReleaseApproved',
    stateMutability: 'view',
    inputs: [{ name: 'id', type: 'uint256' }],
    outputs: [{ type: 'bool' }]
  },
  {
    type: 'function',
    name: 'merchantReleaseApproved',
    stateMutability: 'view',
    inputs: [{ name: 'id', type: 'uint256' }],
    outputs: [{ type: 'bool' }]
  },
  {
    type: 'function',
    name: 'buyerRefundApproved',
    stateMutability: 'view',
    inputs: [{ name: 'id', type: 'uint256' }],
    outputs: [{ type: 'bool' }]
  },
  {
    type: 'function',
    name: 'merchantRefundApproved',
    stateMutability: 'view',
    inputs: [{ name: 'id', type: 'uint256' }],
    outputs: [{ type: 'bool' }]
  },
  {
    type: 'function',
    name: 'checkTimeout',
    stateMutability: 'view',
    inputs: [{ name: 'id', type: 'uint256' }],
    outputs: [
      { name: 'isNearTimeout', type: 'bool' },
      { name: 'timeRemaining', type: 'uint256' }
    ]
  },
  {
    type: 'function',
    name: 'arbiter',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'address' }]
  },
  {
    type: 'function',
    name: 'dao',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'address' }]
  },
  {
    type: 'function',
    name: 'HIGH_VALUE_THRESHOLD',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint256' }]
  }
] as const;

export const VFIDE_TOKEN_ABI = [
  {
    type: 'function',
    name: 'approve',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' }
    ],
    outputs: [{ type: 'bool' }]
  },
  {
    type: 'function',
    name: 'allowance',
    stateMutability: 'view',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' }
    ],
    outputs: [{ type: 'uint256' }]
  },
  {
    type: 'function',
    name: 'balanceOf',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ type: 'uint256' }]
  },
  {
    type: 'function',
    name: 'decimals',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint8' }]
  }
] as const;

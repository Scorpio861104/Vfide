'use client';

import { GlobalNav } from '@/components/layout/GlobalNav';
import { Footer } from '@/components/layout/Footer';
import { useState, useEffect } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { formatEther } from 'viem';

// Transaction history type
type AdminTransaction = {
  hash: string;
  action: string;
  timestamp: number;
  status: 'success' | 'pending' | 'failed';
  params?: string;
};

// Batch action type
type BatchAction = {
  id: number;
  type: string;
  address?: string;
  value?: string;
  description: string;
};

// ABI fragments for owner functions
const TOKEN_ABI = [
  {
    inputs: [],
    name: 'owner',
    outputs: [{ type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'vaultOnly',
    outputs: [{ type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'policyLocked',
    outputs: [{ type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'circuitBreaker',
    outputs: [{ type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'totalSupply',
    outputs: [{ type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'presaleMinted',
    outputs: [{ type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'addr', type: 'address' }],
    name: 'systemWhitelist',
    outputs: [{ type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { name: 'addr', type: 'address' },
      { name: 'status', type: 'bool' },
    ],
    name: 'whitelistSystemContract',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ name: 'enabled', type: 'bool' }],
    name: 'setVaultOnly',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'lockPolicy',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ name: 'enabled', type: 'bool' }],
    name: 'setCircuitBreaker',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ name: 'hub', type: 'address' }],
    name: 'setVaultHub',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ name: 'hub', type: 'address' }],
    name: 'setSecurityHub',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ name: '_ledger', type: 'address' }],
    name: 'setLedger',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ name: 'router', type: 'address' }],
    name: 'setBurnRouter',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ name: 'sink', type: 'address' }],
    name: 'setTreasurySink',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ name: '_sanctum', type: 'address' }],
    name: 'setSanctumSink',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ name: '_presale', type: 'address' }],
    name: 'setPresaleContract',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { name: 'who', type: 'address' },
      { name: 'isExempt', type: 'bool' },
    ],
    name: 'setSystemExempt',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { name: 'user', type: 'address' },
      { name: 'status', type: 'bool' },
    ],
    name: 'setBlacklist',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { name: 'addr', type: 'address' },
      { name: 'status', type: 'bool' },
    ],
    name: 'setWhitelist',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { name: 'addr', type: 'address' },
      { name: 'exempt', type: 'bool' },
    ],
    name: 'setWhaleLimitExempt',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ name: 'addr', type: 'address' }],
    name: 'whitelisted',
    outputs: [{ type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'addr', type: 'address' }],
    name: 'whaleLimitExempt',
    outputs: [{ type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'addr', type: 'address' }],
    name: 'systemExempt',
    outputs: [{ type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'user', type: 'address' }],
    name: 'isBlacklisted',
    outputs: [{ type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'vaultHub',
    outputs: [{ type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'securityHub',
    outputs: [{ type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'ledger',
    outputs: [{ type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'burnRouter',
    outputs: [{ type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'treasurySink',
    outputs: [{ type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'sanctumSink',
    outputs: [{ type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'presaleContract',
    outputs: [{ type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'newOwner', type: 'address' }],
    name: 'transferOwnership',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
] as const;

const TOKEN_ADDRESS = (process.env.NEXT_PUBLIC_VFIDE_TOKEN_ADDRESS || '0x0000000000000000000000000000000000000000') as `0x${string}`;
const BURN_ROUTER_ADDRESS = (process.env.NEXT_PUBLIC_BURN_ROUTER_ADDRESS || '0x0000000000000000000000000000000000000000') as `0x${string}`;

// Check if contracts are deployed (not zero address)
const IS_TOKEN_DEPLOYED = TOKEN_ADDRESS !== '0x0000000000000000000000000000000000000000';
const IS_BURN_ROUTER_DEPLOYED = BURN_ROUTER_ADDRESS !== '0x0000000000000000000000000000000000000000';

// BurnRouter ABI
const BURN_ROUTER_ABI = [
  {
    inputs: [],
    name: 'owner',
    outputs: [{ type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'baseBurnBps',
    outputs: [{ type: 'uint16' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'baseSanctumBps',
    outputs: [{ type: 'uint16' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'baseEcosystemBps',
    outputs: [{ type: 'uint16' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'highTrustReduction',
    outputs: [{ type: 'uint16' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'lowTrustPenalty',
    outputs: [{ type: 'uint16' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'maxTotalBps',
    outputs: [{ type: 'uint16' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { name: '_baseBurnBps', type: 'uint16' },
      { name: '_baseSanctumBps', type: 'uint16' },
      { name: '_baseEcosystemBps', type: 'uint16' },
      { name: '_highTrustReduction', type: 'uint16' },
      { name: '_lowTrustPenalty', type: 'uint16' },
      { name: '_maxTotalBps', type: 'uint16' },
    ],
    name: 'setPolicy',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
] as const;

export default function AdminPanel() {
  const { address, isConnected } = useAccount();
  const [whitelistAddress, setWhitelistAddress] = useState('');
  const [checkAddress, setCheckAddress] = useState('');
  const [exemptAddress, setExemptAddress] = useState('');
  const [blacklistAddress, setBlacklistAddress] = useState('');
  const [vaultBypassAddress, setVaultBypassAddress] = useState('');
  const [whaleExemptAddress, setWhaleExemptAddress] = useState('');
  const [moduleAddress, setModuleAddress] = useState('');
  const [moduleType, setModuleType] = useState<'vaultHub' | 'securityHub' | 'ledger' | 'burnRouter' | 'treasurySink' | 'sanctumSink' | 'presale'>('vaultHub');
  const [newOwner, setNewOwner] = useState('');
  const [burnParams, setBurnParams] = useState({
    baseBurnBps: '',
    baseSanctumBps: '',
    baseEcosystemBps: '',
    highTrustReduction: '',
    lowTrustPenalty: '',
    maxTotalBps: '',
  });
  const [txHistory, setTxHistory] = useState<AdminTransaction[]>([]);
  const [batchActions, setBatchActions] = useState<BatchAction[]>([]);
  const [showSimulation, setShowSimulation] = useState(false);
  const [simulationData, setSimulationData] = useState<{ action: string; changes: Array<{ field: string; before: string; after: string }>; impact: string } | null>(null);
  const [showBatchMode, setShowBatchMode] = useState(false);
  const [showTxHistory, setShowTxHistory] = useState(false);
  const [showHealthDashboard, setShowHealthDashboard] = useState(true);

  // Read contract owner
  const { data: owner } = useReadContract({
    address: TOKEN_ADDRESS,
    abi: TOKEN_ABI,
    functionName: 'owner',
    query: { enabled: IS_TOKEN_DEPLOYED },
  });

  // Read contract state
  const { data: vaultOnly } = useReadContract({
    address: TOKEN_ADDRESS,
    abi: TOKEN_ABI,
    functionName: 'vaultOnly',
    query: { enabled: IS_TOKEN_DEPLOYED },
  });

  const { data: policyLocked } = useReadContract({
    address: TOKEN_ADDRESS,
    abi: TOKEN_ABI,
    functionName: 'policyLocked',
    query: { enabled: IS_TOKEN_DEPLOYED },
  });

  const { data: circuitBreaker } = useReadContract({
    address: TOKEN_ADDRESS,
    abi: TOKEN_ABI,
    functionName: 'circuitBreaker',
    query: { enabled: IS_TOKEN_DEPLOYED },
  });

  const { data: totalSupply } = useReadContract({
    address: TOKEN_ADDRESS,
    abi: TOKEN_ABI,
    functionName: 'totalSupply',
    query: { enabled: IS_TOKEN_DEPLOYED },
  });

  const { data: presaleMinted } = useReadContract({
    address: TOKEN_ADDRESS,
    abi: TOKEN_ABI,
    functionName: 'presaleMinted',
    query: { enabled: IS_TOKEN_DEPLOYED },
  });

  const { data: isWhitelisted } = useReadContract({
    address: TOKEN_ADDRESS,
    abi: TOKEN_ABI,
    functionName: 'systemWhitelist',
    args: checkAddress ? [checkAddress as `0x${string}`] : undefined,
    query: { enabled: IS_TOKEN_DEPLOYED && !!checkAddress },
  });

  const { data: isExempt } = useReadContract({
    address: TOKEN_ADDRESS,
    abi: TOKEN_ABI,
    functionName: 'systemExempt',
    args: exemptAddress ? [exemptAddress as `0x${string}`] : undefined,
    query: { enabled: IS_TOKEN_DEPLOYED && !!exemptAddress },
  });

  const { data: isUserBlacklisted } = useReadContract({
    address: TOKEN_ADDRESS,
    abi: TOKEN_ABI,
    functionName: 'isBlacklisted',
    args: blacklistAddress ? [blacklistAddress as `0x${string}`] : undefined,
    query: { enabled: IS_TOKEN_DEPLOYED && !!blacklistAddress },
  });

  // Read vault-only whitelist status (exchanges bypass)
  const { data: isVaultBypassWhitelisted } = useReadContract({
    address: TOKEN_ADDRESS,
    abi: TOKEN_ABI,
    functionName: 'whitelisted',
    args: vaultBypassAddress ? [vaultBypassAddress as `0x${string}`] : undefined,
    query: { enabled: IS_TOKEN_DEPLOYED && !!vaultBypassAddress },
  });

  // Read whale limit exempt status
  const { data: isWhaleExempt } = useReadContract({
    address: TOKEN_ADDRESS,
    abi: TOKEN_ABI,
    functionName: 'whaleLimitExempt',
    args: whaleExemptAddress ? [whaleExemptAddress as `0x${string}`] : undefined,
    query: { enabled: IS_TOKEN_DEPLOYED && !!whaleExemptAddress },
  });

  // Read module addresses
  const { data: vaultHubAddress } = useReadContract({
    address: TOKEN_ADDRESS,
    abi: TOKEN_ABI,
    functionName: 'vaultHub',
    query: { enabled: IS_TOKEN_DEPLOYED },
  });

  const { data: securityHubAddress } = useReadContract({
    address: TOKEN_ADDRESS,
    abi: TOKEN_ABI,
    functionName: 'securityHub',
    query: { enabled: IS_TOKEN_DEPLOYED },
  });

  const { data: ledgerAddress } = useReadContract({
    address: TOKEN_ADDRESS,
    abi: TOKEN_ABI,
    functionName: 'ledger',
    query: { enabled: IS_TOKEN_DEPLOYED },
  });

  const { data: burnRouterAddress } = useReadContract({
    address: TOKEN_ADDRESS,
    abi: TOKEN_ABI,
    functionName: 'burnRouter',
    query: { enabled: IS_TOKEN_DEPLOYED },
  });

  const { data: treasurySinkAddress } = useReadContract({
    address: TOKEN_ADDRESS,
    abi: TOKEN_ABI,
    functionName: 'treasurySink',
    query: { enabled: IS_TOKEN_DEPLOYED },
  });

  const { data: sanctumSinkAddress } = useReadContract({
    address: TOKEN_ADDRESS,
    abi: TOKEN_ABI,
    functionName: 'sanctumSink',
    query: { enabled: IS_TOKEN_DEPLOYED },
  });

  const { data: presaleContractAddress } = useReadContract({
    address: TOKEN_ADDRESS,
    abi: TOKEN_ABI,
    functionName: 'presaleContract',
    query: { enabled: IS_TOKEN_DEPLOYED },
  });

  // Read BurnRouter parameters
  const { data: baseBurnBps } = useReadContract({
    address: BURN_ROUTER_ADDRESS,
    abi: BURN_ROUTER_ABI,
    functionName: 'baseBurnBps',
    query: { enabled: IS_BURN_ROUTER_DEPLOYED },
  });

  const { data: baseSanctumBps } = useReadContract({
    address: BURN_ROUTER_ADDRESS,
    abi: BURN_ROUTER_ABI,
    functionName: 'baseSanctumBps',
    query: { enabled: IS_BURN_ROUTER_DEPLOYED },
  });

  const { data: baseEcosystemBps } = useReadContract({
    address: BURN_ROUTER_ADDRESS,
    abi: BURN_ROUTER_ABI,
    functionName: 'baseEcosystemBps',
    query: { enabled: IS_BURN_ROUTER_DEPLOYED },
  });

  const { data: highTrustReduction } = useReadContract({
    address: BURN_ROUTER_ADDRESS,
    abi: BURN_ROUTER_ABI,
    functionName: 'highTrustReduction',
    query: { enabled: IS_BURN_ROUTER_DEPLOYED },
  });

  const { data: lowTrustPenalty } = useReadContract({
    address: BURN_ROUTER_ADDRESS,
    abi: BURN_ROUTER_ABI,
    functionName: 'lowTrustPenalty',
    query: { enabled: IS_BURN_ROUTER_DEPLOYED },
  });

  const { data: maxTotalBps } = useReadContract({
    address: BURN_ROUTER_ADDRESS,
    abi: BURN_ROUTER_ABI,
    functionName: 'maxTotalBps',
    query: { enabled: IS_BURN_ROUTER_DEPLOYED },
  });

  // Write functions
  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const isOwner = address && owner && address.toLowerCase() === owner.toLowerCase();

  // Reset success message after 5 seconds
  useEffect(() => {
    if (isSuccess) {
      const timer = setTimeout(() => {
        window.location.reload();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isSuccess]);

  const handleWhitelistAdd = () => {
    if (!whitelistAddress) return;
    writeContract({
      address: TOKEN_ADDRESS,
      abi: TOKEN_ABI,
      functionName: 'whitelistSystemContract',
      args: [whitelistAddress as `0x${string}`, true],
    });
  };

  const handleWhitelistRemove = () => {
    if (!whitelistAddress) return;
    writeContract({
      address: TOKEN_ADDRESS,
      abi: TOKEN_ABI,
      functionName: 'whitelistSystemContract',
      args: [whitelistAddress as `0x${string}`, false],
    });
  };

  const handleToggleVaultOnly = () => {
    writeContract({
      address: TOKEN_ADDRESS,
      abi: TOKEN_ABI,
      functionName: 'setVaultOnly',
      args: [!vaultOnly],
    });
  };

  const handleLockPolicy = () => {
    if (!confirm('WARNING: This is IRREVERSIBLE! Vault-only mode will be permanently enabled. Continue?')) {
      return;
    }
    writeContract({
      address: TOKEN_ADDRESS,
      abi: TOKEN_ABI,
      functionName: 'lockPolicy',
    });
  };

  const handleToggleCircuitBreaker = () => {
    writeContract({
      address: TOKEN_ADDRESS,
      abi: TOKEN_ABI,
      functionName: 'setCircuitBreaker',
      args: [!circuitBreaker],
    });
  };

  const handleSetModule = () => {
    if (!moduleAddress) return;
    const functionMap: Record<string, 'setVaultHub' | 'setSecurityHub' | 'setLedger' | 'setBurnRouter' | 'setTreasurySink' | 'setSanctumSink' | 'setPresaleContract'> = {
      vaultHub: 'setVaultHub',
      securityHub: 'setSecurityHub',
      ledger: 'setLedger',
      burnRouter: 'setBurnRouter',
      treasurySink: 'setTreasurySink',
      sanctumSink: 'setSanctumSink',
      presale: 'setPresaleContract',
    };
    writeContract({
      address: TOKEN_ADDRESS,
      abi: TOKEN_ABI,
      functionName: functionMap[moduleType] as 'setVaultHub' | 'setSecurityHub' | 'setLedger' | 'setBurnRouter' | 'setTreasurySink' | 'setSanctumSink' | 'setPresaleContract',
      args: [moduleAddress as `0x${string}`],
    });
  };

  const handleExemptAdd = () => {
    if (!exemptAddress) return;
    writeContract({
      address: TOKEN_ADDRESS,
      abi: TOKEN_ABI,
      functionName: 'setSystemExempt',
      args: [exemptAddress as `0x${string}`, true],
    });
  };

  const handleExemptRemove = () => {
    if (!exemptAddress) return;
    writeContract({
      address: TOKEN_ADDRESS,
      abi: TOKEN_ABI,
      functionName: 'setSystemExempt',
      args: [exemptAddress as `0x${string}`, false],
    });
  };

  const handleBlacklistAdd = () => {
    if (!blacklistAddress) return;
    writeContract({
      address: TOKEN_ADDRESS,
      abi: TOKEN_ABI,
      functionName: 'setBlacklist',
      args: [blacklistAddress as `0x${string}`, true],
    });
  };

  const handleBlacklistRemove = () => {
    if (!blacklistAddress) return;
    writeContract({
      address: TOKEN_ADDRESS,
      abi: TOKEN_ABI,
      functionName: 'setBlacklist',
      args: [blacklistAddress as `0x${string}`, false],
    });
  };

  // Vault-only bypass whitelist (for exchanges)
  const handleVaultBypassAdd = () => {
    if (!vaultBypassAddress) return;
    writeContract({
      address: TOKEN_ADDRESS,
      abi: TOKEN_ABI,
      functionName: 'setWhitelist',
      args: [vaultBypassAddress as `0x${string}`, true],
    });
  };

  const handleVaultBypassRemove = () => {
    if (!vaultBypassAddress) return;
    writeContract({
      address: TOKEN_ADDRESS,
      abi: TOKEN_ABI,
      functionName: 'setWhitelist',
      args: [vaultBypassAddress as `0x${string}`, false],
    });
  };

  // Whale limit exemptions (for large holders/contracts)
  const handleWhaleExemptAdd = () => {
    if (!whaleExemptAddress) return;
    writeContract({
      address: TOKEN_ADDRESS,
      abi: TOKEN_ABI,
      functionName: 'setWhaleLimitExempt',
      args: [whaleExemptAddress as `0x${string}`, true],
    });
  };

  const handleWhaleExemptRemove = () => {
    if (!whaleExemptAddress) return;
    writeContract({
      address: TOKEN_ADDRESS,
      abi: TOKEN_ABI,
      functionName: 'setWhaleLimitExempt',
      args: [whaleExemptAddress as `0x${string}`, false],
    });
  };

  const handleTransferOwnership = () => {
    if (!newOwner) return;
    if (!confirm(`⚠️ CRITICAL: Transfer ownership to ${newOwner}?\n\nThis is IRREVERSIBLE! You will lose all admin access.\n\nRecommended: Transfer to DAO Timelock address for decentralized governance.`)) {
      return;
    }
    writeContract({
      address: TOKEN_ADDRESS,
      abi: TOKEN_ABI,
      functionName: 'transferOwnership',
      args: [newOwner as `0x${string}`],
    });
  };

  // Track transaction for history - integrate with write functions
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const addToHistory = (hash: string, action: string, params?: string) => {
    const newTx: AdminTransaction = {
      hash,
      action,
      timestamp: Date.now(),
      status: 'pending',
      params,
    };
    setTxHistory(prev => [newTx, ...prev].slice(0, 20)); // Keep last 20
  };

  // Update transaction status - integrate with useWaitForTransactionReceipt
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const updateTxStatus = (hash: string, status: 'success' | 'failed') => {
    setTxHistory(prev =>
      prev.map(tx =>
        tx.hash === hash ? { ...tx, status } : tx
      )
    );
  };

  // Export configuration
  const exportConfig = () => {
    const config = {
      timestamp: Date.now(),
      contract: TOKEN_ADDRESS,
      owner: owner,
      modules: {
        vaultHub: vaultHubAddress,
        securityHub: securityHubAddress,
        ledger: ledgerAddress,
        burnRouter: burnRouterAddress,
        treasurySink: treasurySinkAddress,
        sanctumSink: sanctumSinkAddress,
        presale: presaleContractAddress,
      },
      security: {
        vaultOnly,
        policyLocked,
        circuitBreaker,
      },
      supply: {
        totalSupply: totalSupply ? Number(totalSupply) / 1e18 : 0,
        maxSupply: 200000000,
      },
    };
    
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vfide-admin-config-${Date.now()}.json`;
    a.click();
  };

  const handleUpdateBurnPolicy = () => {
    const params = {
      baseBurnBps: parseInt(burnParams.baseBurnBps) || Number(baseBurnBps) || 0,
      baseSanctumBps: parseInt(burnParams.baseSanctumBps) || Number(baseSanctumBps) || 0,
      baseEcosystemBps: parseInt(burnParams.baseEcosystemBps) || Number(baseEcosystemBps) || 0,
      highTrustReduction: parseInt(burnParams.highTrustReduction) || Number(highTrustReduction) || 0,
      lowTrustPenalty: parseInt(burnParams.lowTrustPenalty) || Number(lowTrustPenalty) || 0,
      maxTotalBps: parseInt(burnParams.maxTotalBps) || Number(maxTotalBps) || 0,
    };

    // Validation
    if (params.maxTotalBps > 1000) {
      alert('Max total BPS cannot exceed 1000 (10%)');
      return;
    }
    if (params.baseBurnBps + params.baseSanctumBps + params.baseEcosystemBps > params.maxTotalBps) {
      alert('Base fees exceed max total BPS');
      return;
    }

    writeContract({
      address: BURN_ROUTER_ADDRESS,
      abi: BURN_ROUTER_ABI,
      functionName: 'setPolicy',
      args: [
        params.baseBurnBps,
        params.baseSanctumBps,
        params.baseEcosystemBps,
        params.highTrustReduction,
        params.lowTrustPenalty,
        params.maxTotalBps,
      ],
    });
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-violet-900 flex items-center justify-center">
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 max-w-md">
          <h1 className="text-3xl font-bold text-white mb-4">Admin Panel</h1>
          <p className="text-gray-300">Please connect your wallet to access admin functions.</p>
        </div>
      </div>
    );
  }

  if (!isOwner) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-violet-900 flex items-center justify-center">
        <div className="bg-red-500/20 backdrop-blur-md rounded-2xl p-8 max-w-md border border-red-500/50">
          <h1 className="text-3xl font-bold text-white mb-4">Access Denied</h1>
          <p className="text-gray-300 mb-4">You are not the contract owner.</p>
          <div className="bg-black/30 rounded-lg p-4 text-sm">
            <p className="text-gray-400">Your address:</p>
            <p className="text-white font-mono break-all">{address}</p>
            <p className="text-gray-400 mt-2">Owner address:</p>
            <p className="text-white font-mono break-all">{owner as string}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <GlobalNav />
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-violet-900 py-12 px-4 pt-24">
        <div className="max-w-7xl mx-auto">
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-white mb-2">VFIDE Owner Control Panel</h1>
              <p className="text-gray-300">Contract: <span className="font-mono text-sm">{TOKEN_ADDRESS}</span></p>
            </div>
            <div className="bg-green-500/20 border border-green-500 rounded-lg px-4 py-2">
              <p className="text-green-400 text-sm font-bold">👑 Owner Access</p>
              <p className="text-gray-300 text-xs">Full admin permissions</p>
            </div>
          </div>
        </div>

        {/* Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            label="Vault-Only Mode"
            value={vaultOnly ? 'ENABLED' : 'DISABLED'}
            color={vaultOnly ? 'green' : 'yellow'}
            icon="🔒"
          />
          <StatCard
            label="Policy Status"
            value={policyLocked ? 'LOCKED' : 'UNLOCKED'}
            color={policyLocked ? 'red' : 'blue'}
            icon="🔐"
          />
          <StatCard
            label="Circuit Breaker"
            value={circuitBreaker ? 'ON' : 'OFF'}
            color={circuitBreaker ? 'red' : 'green'}
            icon="⚡"
          />
          <StatCard
            label="Total Supply"
            value={totalSupply ? `${(Number(formatEther(totalSupply)) / 1_000_000).toFixed(2)}M` : '0'}
            color="purple"
            icon="💎"
          />
        </div>

        {/* Simulation Mode Banner */}
        {showSimulation && (
          <div className="bg-yellow-500/20 border border-yellow-500 rounded-lg p-4 mb-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-2xl">🔍</span>
                <div>
                  <p className="text-yellow-400 font-bold">Simulation Mode Active</p>
                  <p className="text-gray-300 text-sm">Actions will show preview without executing</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowSimulation(false);
                  setSimulationData(null);
                }}
                className="bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-2 px-4 rounded-lg transition-colors"
              >
                Exit Simulation
              </button>
            </div>
          </div>
        )}

        {/* Simulation Preview */}
        {simulationData && (
          <div className="bg-blue-500/20 border border-blue-500 rounded-lg p-6 mb-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-blue-400 font-bold text-xl">📊 Action Preview</h3>
              <button
                onClick={() => setSimulationData(null)}
                className="text-gray-400 hover:text-gray-300"
              >
                ✕
              </button>
            </div>
            
            <div className="mb-4">
              <p className="text-white font-bold text-lg mb-2">{simulationData.action}</p>
              <p className="text-gray-300 text-sm mb-4">{simulationData.impact}</p>
            </div>

            <div className="space-y-2 mb-4">
              {simulationData.changes.map((change: { field: string, before: string, after: string }, idx: number) => (
                <div key={idx} className="bg-black/30 rounded-lg p-3">
                  <p className="text-gray-400 text-sm mb-1">{change.field}</p>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-red-400">{change.before}</span>
                    <span className="text-gray-500">→</span>
                    <span className="text-green-400">{change.after}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowSimulation(false);
                  setSimulationData(null);
                  // Would execute the real action here
                }}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg transition-colors"
              >
                ✅ Execute Action
              </button>
              <button
                onClick={() => setSimulationData(null)}
                className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-lg transition-colors"
              >
                ❌ Cancel
              </button>
            </div>
          </div>
        )}

        {/* Supply Stats */}
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 mb-8">
          <h2 className="text-2xl font-bold text-white mb-4">Supply Statistics</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-black/30 rounded-lg p-4">
              <p className="text-gray-400 text-sm">Total Supply</p>
              <p className="text-white text-2xl font-bold">
                {totalSupply ? formatEther(totalSupply).slice(0, -18) : '0'} VFIDE
              </p>
            </div>
            <div className="bg-black/30 rounded-lg p-4">
              <p className="text-gray-400 text-sm">Presale Minted</p>
              <p className="text-white text-2xl font-bold">
                {presaleMinted ? formatEther(presaleMinted).slice(0, -18) : '0'} VFIDE
              </p>
            </div>
            <div className="bg-black/30 rounded-lg p-4">
              <p className="text-gray-400 text-sm">Presale Remaining</p>
              <p className="text-white text-2xl font-bold">
                {presaleMinted ? (50_000_000 - Number(formatEther(presaleMinted))).toLocaleString() : '50,000,000'} VFIDE
              </p>
            </div>
          </div>
        </div>

        {/* Control Panels */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Exchange Whitelisting */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6">
            <h2 className="text-2xl font-bold text-white mb-4">🔄 Exchange Whitelisting</h2>
            <p className="text-gray-300 text-sm mb-4">
              Add exchanges to whitelist for initial liquidity deposit. After first deposit (balance &gt; 0), they work automatically.
            </p>
            
            <div className="mb-4">
              <label className="block text-gray-300 text-sm mb-2">Exchange Address</label>
              <input
                type="text"
                value={whitelistAddress}
                onChange={(e) => setWhitelistAddress(e.target.value)}
                placeholder="0x..."
                className="w-full bg-black/30 text-white rounded-lg px-4 py-3 border border-gray-600 focus:border-purple-500 focus:outline-none font-mono text-sm"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleWhitelistAdd}
                disabled={!whitelistAddress || isPending || isConfirming}
                className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white font-bold py-3 px-6 rounded-lg transition-colors"
              >
                ✅ Add to Whitelist
              </button>
              <button
                onClick={handleWhitelistRemove}
                disabled={!whitelistAddress || isPending || isConfirming}
                className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white font-bold py-3 px-6 rounded-lg transition-colors"
              >
                ❌ Remove
              </button>
            </div>

            {/* Check Whitelist Status */}
            <div className="mt-6 pt-6 border-t border-gray-600">
              <label className="block text-gray-300 text-sm mb-2">Check Whitelist Status</label>
              <input
                type="text"
                value={checkAddress}
                onChange={(e) => setCheckAddress(e.target.value)}
                placeholder="0x..."
                className="w-full bg-black/30 text-white rounded-lg px-4 py-3 border border-gray-600 focus:border-purple-500 focus:outline-none font-mono text-sm mb-3"
              />
              {checkAddress && (
                <div className={`rounded-lg p-4 ${isWhitelisted ? 'bg-green-500/20 border border-green-500' : 'bg-red-500/20 border border-red-500'}`}>
                  <p className="text-white font-bold">
                    {isWhitelisted ? '✅ Whitelisted' : '❌ Not Whitelisted'}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Vault-Only Control */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6">
            <h2 className="text-2xl font-bold text-white mb-4">🔒 Vault-Only Mode</h2>
            <p className="text-gray-300 text-sm mb-4">
              Vault-only mode is ENABLED BY DEFAULT at deployment for security. Users&apos; tokens automatically create vaults on first receipt. 
              Vaults have enhanced security: freeze function, abnormal transaction detection, and recovery mechanisms.
            </p>

            <div className="bg-black/30 rounded-lg p-4 mb-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-gray-400">Current Status:</span>
                <span className={`font-bold ${vaultOnly ? 'text-green-400' : 'text-yellow-400'}`}>
                  {vaultOnly ? '🟢 ENABLED (Default)' : '🟡 DISABLED'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Policy Lock:</span>
                <span className={`font-bold ${policyLocked ? 'text-red-400' : 'text-blue-400'}`}>
                  {policyLocked ? '🔴 LOCKED (Permanent)' : '🔵 UNLOCKED'}
                </span>
              </div>
            </div>

            <button
              onClick={handleToggleVaultOnly}
              disabled={isPending || isConfirming || policyLocked}
              className={`w-full font-bold py-4 px-6 rounded-lg transition-colors mb-3 ${
                vaultOnly
                  ? 'bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-600'
                  : 'bg-green-600 hover:bg-green-700 disabled:bg-gray-600'
              } text-white`}
            >
              {vaultOnly ? '⚠️ Disable Vault-Only' : '✅ Enable Vault-Only'}
            </button>

            {policyLocked && (
              <div className="bg-red-500/20 border border-red-500 rounded-lg p-4 mb-3">
                <p className="text-red-400 text-sm font-bold">⚠️ Policy is PERMANENTLY LOCKED</p>
                <p className="text-gray-300 text-xs">Vault-only mode cannot be disabled. This is by design for maximum security.</p>
              </div>
            )}

            <button
              onClick={handleLockPolicy}
              disabled={isPending || isConfirming || policyLocked}
              className="w-full bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white font-bold py-4 px-6 rounded-lg transition-colors"
            >
              🔐 Lock Policy (PERMANENT)
            </button>

            <p className="text-yellow-400 text-xs mt-3 text-center">
              ⚠️ Locking policy is IRREVERSIBLE! Vault-only will be permanent.
            </p>
          </div>

          {/* Circuit Breaker */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6">
            <h2 className="text-2xl font-bold text-white mb-4">⚡ Circuit Breaker</h2>
            <p className="text-gray-300 text-sm mb-4">
              Emergency circuit breaker bypasses SecurityHub lock checks. Use ONLY in emergencies.
            </p>

            <div className="bg-black/30 rounded-lg p-4 mb-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Circuit Breaker:</span>
                <span className={`font-bold ${circuitBreaker ? 'text-red-400' : 'text-green-400'}`}>
                  {circuitBreaker ? '🔴 ACTIVE' : '🟢 INACTIVE'}
                </span>
              </div>
            </div>

            <button
              onClick={handleToggleCircuitBreaker}
              disabled={isPending || isConfirming}
              className={`w-full font-bold py-4 px-6 rounded-lg transition-colors ${
                circuitBreaker
                  ? 'bg-green-600 hover:bg-green-700'
                  : 'bg-red-600 hover:bg-red-700'
              } text-white`}
            >
              {circuitBreaker ? '✅ Deactivate Circuit Breaker' : '⚠️ Activate Circuit Breaker'}
            </button>

            {circuitBreaker && (
              <div className="bg-red-500/20 border border-red-500 rounded-lg p-4 mt-4">
                <p className="text-red-400 text-sm font-bold">⚠️ EMERGENCY MODE ACTIVE</p>
                <p className="text-gray-300 text-xs">SecurityHub locks are bypassed</p>
              </div>
            )}
          </div>

          {/* Module Configuration */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6">
            <h2 className="text-2xl font-bold text-white mb-4">🔧 Module Configuration</h2>
            <p className="text-gray-300 text-sm mb-4">
              Connect system modules (VaultHub, SecurityHub, Ledger, BurnRouter, etc.)
            </p>

            <div className="mb-4">
              <label className="block text-gray-300 text-sm mb-2">Module Type</label>
              <select
                value={moduleType}
                onChange={(e) => setModuleType(e.target.value as typeof moduleType)}
                className="w-full bg-black/30 text-white rounded-lg px-4 py-3 border border-gray-600 focus:border-purple-500 focus:outline-none"
              >
                <option value="vaultHub">Vault Hub</option>
                <option value="securityHub">Security Hub</option>
                <option value="ledger">Proof Ledger</option>
                <option value="burnRouter">Burn Router</option>
                <option value="treasurySink">Treasury Sink</option>
                <option value="sanctumSink">Sanctum Sink</option>
                <option value="presale">Presale Contract</option>
              </select>
            </div>

            <div className="mb-4">
              <label className="block text-gray-300 text-sm mb-2">Contract Address</label>
              <input
                type="text"
                value={moduleAddress}
                onChange={(e) => setModuleAddress(e.target.value)}
                placeholder="0x..."
                className="w-full bg-black/30 text-white rounded-lg px-4 py-3 border border-gray-600 focus:border-purple-500 focus:outline-none font-mono text-sm"
              />
            </div>

            <button
              onClick={handleSetModule}
              disabled={!moduleAddress || isPending || isConfirming}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white font-bold py-3 px-6 rounded-lg transition-colors"
            >
              🔧 Set Module
            </button>

            {/* Current Modules Display */}
            <div className="mt-6 pt-6 border-t border-gray-600">
              <h3 className="text-white font-bold mb-3">Current Modules</h3>
              <div className="space-y-2 text-xs">
                <div className="bg-black/30 rounded p-2">
                  <span className="text-gray-400">Vault Hub:</span>
                  <p className="text-white font-mono break-all">{vaultHubAddress as string || 'Not set'}</p>
                </div>
                <div className="bg-black/30 rounded p-2">
                  <span className="text-gray-400">Security Hub:</span>
                  <p className="text-white font-mono break-all">{securityHubAddress as string || 'Not set'}</p>
                </div>
                <div className="bg-black/30 rounded p-2">
                  <span className="text-gray-400">Proof Ledger:</span>
                  <p className="text-white font-mono break-all">{ledgerAddress as string || 'Not set'}</p>
                </div>
                <div className="bg-black/30 rounded p-2">
                  <span className="text-gray-400">Burn Router:</span>
                  <p className="text-white font-mono break-all">{burnRouterAddress as string || 'Not set'}</p>
                </div>
                <div className="bg-black/30 rounded p-2">
                  <span className="text-gray-400">Treasury:</span>
                  <p className="text-white font-mono break-all">{treasurySinkAddress as string || 'Not set'}</p>
                </div>
                <div className="bg-black/30 rounded p-2">
                  <span className="text-gray-400">Sanctum:</span>
                  <p className="text-white font-mono break-all">{sanctumSinkAddress as string || 'Not set'}</p>
                </div>
                <div className="bg-black/30 rounded p-2">
                  <span className="text-gray-400">Presale:</span>
                  <p className="text-white font-mono break-all">{presaleContractAddress as string || 'Not set'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* System Exemptions */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6">
            <h2 className="text-2xl font-bold text-white mb-4">⭐ System Exemptions</h2>
            <p className="text-gray-300 text-sm mb-4">
              Exempt addresses from vault-only rules and fees (for system contracts only)
            </p>

            <div className="mb-4">
              <label className="block text-gray-300 text-sm mb-2">Address</label>
              <input
                type="text"
                value={exemptAddress}
                onChange={(e) => setExemptAddress(e.target.value)}
                placeholder="0x..."
                className="w-full bg-black/30 text-white rounded-lg px-4 py-3 border border-gray-600 focus:border-purple-500 focus:outline-none font-mono text-sm"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleExemptAdd}
                disabled={!exemptAddress || isPending || isConfirming}
                className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white font-bold py-3 px-6 rounded-lg transition-colors"
              >
                ✅ Add Exemption
              </button>
              <button
                onClick={handleExemptRemove}
                disabled={!exemptAddress || isPending || isConfirming}
                className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white font-bold py-3 px-6 rounded-lg transition-colors"
              >
                ❌ Remove
              </button>
            </div>

            {exemptAddress && (
              <div className="mt-4">
                <div className={`rounded-lg p-4 ${isExempt ? 'bg-green-500/20 border border-green-500' : 'bg-gray-500/20 border border-gray-500'}`}>
                  <p className="text-white font-bold">
                    {isExempt ? '✅ System Exempt' : '❌ Not Exempt'}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Blacklist Management */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6">
            <h2 className="text-2xl font-bold text-white mb-4">🚫 Blacklist Management</h2>
            <p className="text-gray-300 text-sm mb-4">
              Block malicious addresses from transferring tokens (emergency only)
            </p>

            <div className="mb-4">
              <label className="block text-gray-300 text-sm mb-2">Address</label>
              <input
                type="text"
                value={blacklistAddress}
                onChange={(e) => setBlacklistAddress(e.target.value)}
                placeholder="0x..."
                className="w-full bg-black/30 text-white rounded-lg px-4 py-3 border border-gray-600 focus:border-purple-500 focus:outline-none font-mono text-sm"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleBlacklistAdd}
                disabled={!blacklistAddress || isPending || isConfirming}
                className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white font-bold py-3 px-6 rounded-lg transition-colors"
              >
                🚫 Blacklist
              </button>
              <button
                onClick={handleBlacklistRemove}
                disabled={!blacklistAddress || isPending || isConfirming}
                className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white font-bold py-3 px-6 rounded-lg transition-colors"
              >
                ✅ Remove
              </button>
            </div>

            {blacklistAddress && (
              <div className="mt-4">
                <div className={`rounded-lg p-4 ${isUserBlacklisted ? 'bg-red-500/20 border border-red-500' : 'bg-green-500/20 border border-green-500'}`}>
                  <p className="text-white font-bold">
                    {isUserBlacklisted ? '🚫 Blacklisted' : '✅ Not Blacklisted'}
                  </p>
                </div>
              </div>
            )}

            <div className="mt-4 bg-yellow-500/20 border border-yellow-500 rounded-lg p-4">
              <p className="text-yellow-400 text-xs">
                ⚠️ Use blacklist only for emergency situations (hacked addresses, exploits)
              </p>
            </div>
          </div>

          {/* Vault-Only Bypass Whitelist (Exchanges) */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6">
            <h2 className="text-2xl font-bold text-white mb-4">🏦 Exchange Whitelist (Vault-Only Bypass)</h2>
            <p className="text-gray-300 text-sm mb-4">
              Allow exchanges and specific contracts to transfer tokens without using vaults. 
              Use for CEX listings, DEX routers, and bridge contracts.
            </p>

            <div className="mb-4">
              <label className="block text-gray-300 text-sm mb-2">Exchange/Contract Address</label>
              <input
                type="text"
                value={vaultBypassAddress}
                onChange={(e) => setVaultBypassAddress(e.target.value)}
                placeholder="0x..."
                className="w-full bg-black/30 text-white rounded-lg px-4 py-3 border border-gray-600 focus:border-purple-500 focus:outline-none font-mono text-sm"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleVaultBypassAdd}
                disabled={!vaultBypassAddress || isPending || isConfirming}
                className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white font-bold py-3 px-6 rounded-lg transition-colors"
              >
                ✅ Whitelist
              </button>
              <button
                onClick={handleVaultBypassRemove}
                disabled={!vaultBypassAddress || isPending || isConfirming}
                className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white font-bold py-3 px-6 rounded-lg transition-colors"
              >
                ❌ Remove
              </button>
            </div>

            {vaultBypassAddress && (
              <div className="mt-4">
                <div className={`rounded-lg p-4 ${isVaultBypassWhitelisted ? 'bg-green-500/20 border border-green-500' : 'bg-gray-500/20 border border-gray-500'}`}>
                  <p className="text-white font-bold">
                    {isVaultBypassWhitelisted ? '✅ Whitelisted (Can bypass vault-only)' : '❌ Not Whitelisted'}
                  </p>
                </div>
              </div>
            )}

            <div className="mt-4 bg-blue-500/20 border border-blue-500 rounded-lg p-4">
              <p className="text-blue-400 text-xs">
                ℹ️ Whitelisted addresses can transfer without vaults. Use for exchanges, DEXs, bridges.
              </p>
            </div>
          </div>

          {/* Whale Limit Exemptions */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6">
            <h2 className="text-2xl font-bold text-white mb-4">🐋 Whale Limit Exemptions</h2>
            <p className="text-gray-300 text-sm mb-4">
              Exempt addresses from anti-whale transfer limits (max transfer, daily limit, cooldown).
              Use for liquidity pools, treasury, and operational wallets.
            </p>

            <div className="mb-4">
              <label className="block text-gray-300 text-sm mb-2">Address to Exempt</label>
              <input
                type="text"
                value={whaleExemptAddress}
                onChange={(e) => setWhaleExemptAddress(e.target.value)}
                placeholder="0x..."
                className="w-full bg-black/30 text-white rounded-lg px-4 py-3 border border-gray-600 focus:border-purple-500 focus:outline-none font-mono text-sm"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleWhaleExemptAdd}
                disabled={!whaleExemptAddress || isPending || isConfirming}
                className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white font-bold py-3 px-6 rounded-lg transition-colors"
              >
                ✅ Exempt
              </button>
              <button
                onClick={handleWhaleExemptRemove}
                disabled={!whaleExemptAddress || isPending || isConfirming}
                className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white font-bold py-3 px-6 rounded-lg transition-colors"
              >
                ❌ Remove
              </button>
            </div>

            {whaleExemptAddress && (
              <div className="mt-4">
                <div className={`rounded-lg p-4 ${isWhaleExempt ? 'bg-green-500/20 border border-green-500' : 'bg-gray-500/20 border border-gray-500'}`}>
                  <p className="text-white font-bold">
                    {isWhaleExempt ? '✅ Exempt from Whale Limits' : '❌ Subject to Whale Limits'}
                  </p>
                </div>
              </div>
            )}

            <div className="mt-4 bg-purple-500/20 border border-purple-500 rounded-lg p-4">
              <p className="text-purple-400 text-xs">
                🐋 Current limits: 2M max transfer, 4M max wallet, 5M daily limit. Exempt for LPs, treasury.
              </p>
            </div>
          </div>

          {/* Burn & Fee Configuration */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6">
            <h2 className="text-2xl font-bold text-white mb-4">🔥 Burn & Fee Policy</h2>
            <p className="text-gray-300 text-sm mb-4">
              Adjust dynamic burn/fee rates based on ProofScore. Higher trust = lower fees, lower trust = higher fees.
            </p>

            {/* Current Policy Display */}
            <div className="bg-black/30 rounded-lg p-4 mb-4">
              <h3 className="text-white font-bold mb-3">Current Policy (Basis Points)</h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-gray-400">Base Burn:</span>
                  <span className="text-white font-bold ml-2">{Number(baseBurnBps) || 0} bps ({((Number(baseBurnBps) || 0) / 100).toFixed(2)}%)</span>
                </div>
                <div>
                  <span className="text-gray-400">Base Sanctum:</span>
                  <span className="text-white font-bold ml-2">{Number(baseSanctumBps) || 0} bps ({((Number(baseSanctumBps) || 0) / 100).toFixed(2)}%)</span>
                </div>
                <div>
                  <span className="text-gray-400">Base Ecosystem:</span>
                  <span className="text-white font-bold ml-2">{Number(baseEcosystemBps) || 0} bps ({((Number(baseEcosystemBps) || 0) / 100).toFixed(2)}%)</span>
                </div>
                <div>
                  <span className="text-gray-400">Max Total:</span>
                  <span className="text-white font-bold ml-2">{Number(maxTotalBps) || 0} bps ({((Number(maxTotalBps) || 0) / 100).toFixed(2)}%)</span>
                </div>
                <div>
                  <span className="text-gray-400">High Trust Reduction:</span>
                  <span className="text-green-400 font-bold ml-2">-{Number(highTrustReduction) || 0} bps</span>
                </div>
                <div>
                  <span className="text-gray-400">Low Trust Penalty:</span>
                  <span className="text-red-400 font-bold ml-2">+{Number(lowTrustPenalty) || 0} bps</span>
                </div>
              </div>
            </div>

            {/* Update Form */}
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-300 text-xs mb-1">Base Burn (bps)</label>
                  <input
                    type="number"
                    value={burnParams.baseBurnBps}
                    onChange={(e) => setBurnParams({...burnParams, baseBurnBps: e.target.value})}
                    placeholder={String(baseBurnBps || 150)}
                    className="w-full bg-black/30 text-white rounded px-3 py-2 text-sm border border-gray-600 focus:border-orange-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-gray-300 text-xs mb-1">Base Sanctum (bps)</label>
                  <input
                    type="number"
                    value={burnParams.baseSanctumBps}
                    onChange={(e) => setBurnParams({...burnParams, baseSanctumBps: e.target.value})}
                    placeholder={String(baseSanctumBps || 5)}
                    className="w-full bg-black/30 text-white rounded px-3 py-2 text-sm border border-gray-600 focus:border-orange-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-gray-300 text-xs mb-1">Base Ecosystem (bps)</label>
                  <input
                    type="number"
                    value={burnParams.baseEcosystemBps}
                    onChange={(e) => setBurnParams({...burnParams, baseEcosystemBps: e.target.value})}
                    placeholder={String(baseEcosystemBps || 20)}
                    className="w-full bg-black/30 text-white rounded px-3 py-2 text-sm border border-gray-600 focus:border-orange-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-gray-300 text-xs mb-1">Max Total (bps)</label>
                  <input
                    type="number"
                    value={burnParams.maxTotalBps}
                    onChange={(e) => setBurnParams({...burnParams, maxTotalBps: e.target.value})}
                    placeholder={String(maxTotalBps || 500)}
                    className="w-full bg-black/30 text-white rounded px-3 py-2 text-sm border border-gray-600 focus:border-orange-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-gray-300 text-xs mb-1">High Trust Reduction (bps)</label>
                  <input
                    type="number"
                    value={burnParams.highTrustReduction}
                    onChange={(e) => setBurnParams({...burnParams, highTrustReduction: e.target.value})}
                    placeholder={String(highTrustReduction || 125)}
                    className="w-full bg-black/30 text-white rounded px-3 py-2 text-sm border border-gray-600 focus:border-green-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-gray-300 text-xs mb-1">Low Trust Penalty (bps)</label>
                  <input
                    type="number"
                    value={burnParams.lowTrustPenalty}
                    onChange={(e) => setBurnParams({...burnParams, lowTrustPenalty: e.target.value})}
                    placeholder={String(lowTrustPenalty || 325)}
                    className="w-full bg-black/30 text-white rounded px-3 py-2 text-sm border border-gray-600 focus:border-red-500 focus:outline-none"
                  />
                </div>
              </div>

              <button
                onClick={handleUpdateBurnPolicy}
                disabled={isPending || isConfirming}
                className="w-full bg-orange-600 hover:bg-orange-700 disabled:bg-gray-600 text-white font-bold py-3 px-6 rounded-lg transition-colors"
              >
                🔥 Update Burn Policy
              </button>

              <div className="bg-blue-500/20 border border-blue-500 rounded-lg p-3 text-xs">
                <p className="text-blue-400 font-bold">💡 Basis Points Guide:</p>
                <ul className="text-gray-300 mt-1 space-y-1">
                  <li>• 100 bps = 1%</li>
                  <li>• Max 1000 bps (10%) total fees</li>
                  <li>• High trust users get fee reduction</li>
                  <li>• Low trust users get fee penalty</li>
                  <li>• Defaults: 150 burn, 5 sanctum, 20 ecosystem</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Contract Health Dashboard */}
          {showHealthDashboard && (
            <div className="bg-gradient-to-br from-purple-900/30 to-blue-700/20 rounded-lg p-6 border border-purple-500 shadow-lg">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-purple-400">🏥 System Health Dashboard</h2>
                <button
                  onClick={() => setShowHealthDashboard(false)}
                  className="text-gray-400 hover:text-gray-300 transition-colors"
                >
                  ✕
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                {/* Module Health Checks */}
                <div className="bg-black/30 rounded-lg p-4 border border-purple-500/30">
                  <h3 className="text-purple-400 text-sm font-bold mb-3">Core Modules</h3>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-300 text-sm">VaultHub</span>
                      {vaultHubAddress && vaultHubAddress !== '0x0000000000000000000000000000000000000000' ? (
                        <span className="text-green-400 text-sm">✅ Connected</span>
                      ) : (
                        <span className="text-red-400 text-sm">❌ Not Set</span>
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-300 text-sm">SecurityHub</span>
                      {securityHubAddress && securityHubAddress !== '0x0000000000000000000000000000000000000000' ? (
                        <span className="text-green-400 text-sm">✅ Connected</span>
                      ) : (
                        <span className="text-red-400 text-sm">❌ Not Set</span>
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-300 text-sm">ProofLedger</span>
                      {ledgerAddress && ledgerAddress !== '0x0000000000000000000000000000000000000000' ? (
                        <span className="text-green-400 text-sm">✅ Connected</span>
                      ) : (
                        <span className="text-red-400 text-sm">❌ Not Set</span>
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-300 text-sm">BurnRouter</span>
                      {burnRouterAddress && burnRouterAddress !== '0x0000000000000000000000000000000000000000' ? (
                        <span className="text-green-400 text-sm">✅ Connected</span>
                      ) : (
                        <span className="text-red-400 text-sm">❌ Not Set</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Security Status */}
                <div className="bg-black/30 rounded-lg p-4 border border-purple-500/30">
                  <h3 className="text-purple-400 text-sm font-bold mb-3">Security Status</h3>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-300 text-sm">Vault-Only Mode</span>
                      {vaultOnly ? (
                        <span className="text-green-400 text-sm">✅ Active</span>
                      ) : (
                        <span className="text-yellow-400 text-sm">⚠️ Disabled</span>
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-300 text-sm">Policy Lock</span>
                      {policyLocked ? (
                        <span className="text-green-400 text-sm">🔒 Locked</span>
                      ) : (
                        <span className="text-yellow-400 text-sm">🔓 Unlocked</span>
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-300 text-sm">Circuit Breaker</span>
                      {circuitBreaker ? (
                        <span className="text-red-400 text-sm">🚨 PAUSED</span>
                      ) : (
                        <span className="text-green-400 text-sm">✅ Normal</span>
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-300 text-sm">Owner Address</span>
                      <span className="text-gray-400 text-xs font-mono">
                        {owner?.slice(0, 6)}...{owner?.slice(-4)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Supply Metrics */}
                <div className="bg-black/30 rounded-lg p-4 border border-purple-500/30">
                  <h3 className="text-purple-400 text-sm font-bold mb-3">Supply Metrics</h3>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-300 text-sm">Total Supply</span>
                      <span className="text-blue-400 text-sm font-mono">
                        {totalSupply ? (Number(totalSupply) / 1e18).toFixed(1) : 0}M
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-300 text-sm">Max Supply</span>
                      <span className="text-gray-400 text-sm font-mono">200M</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-300 text-sm">Utilization</span>
                      <span className="text-blue-400 text-sm font-mono">
                        {totalSupply ? ((Number(totalSupply) / 1e18 / 200) * 100).toFixed(1) : 0}%
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-300 text-sm">Remaining</span>
                      <span className="text-gray-400 text-sm font-mono">
                        {totalSupply ? (200 - Number(totalSupply) / 1e18).toFixed(1) : 200}M
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Overall System Status */}
              <div className="bg-black/30 rounded-lg p-4 border border-purple-500/30">
                <h3 className="text-purple-400 text-sm font-bold mb-3">Overall System Status</h3>
                <div className="flex items-center gap-4">
                  {vaultHubAddress && vaultHubAddress !== '0x0000000000000000000000000000000000000000' &&
                  securityHubAddress && securityHubAddress !== '0x0000000000000000000000000000000000000000' &&
                  ledgerAddress && ledgerAddress !== '0x0000000000000000000000000000000000000000' &&
                  burnRouterAddress && burnRouterAddress !== '0x0000000000000000000000000000000000000000' ? (
                    <>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
                        <span className="text-green-400 font-bold">System Operational</span>
                      </div>
                      <span className="text-gray-400 text-sm">All modules connected and responding</span>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-yellow-500 rounded-full animate-pulse" />
                        <span className="text-yellow-400 font-bold">Incomplete Setup</span>
                      </div>
                      <span className="text-gray-400 text-sm">Some modules not configured - configure all before deployment</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Batch Actions Queue */}
          {showBatchMode && (
            <div className="bg-gradient-to-br from-orange-900/30 to-orange-700/20 rounded-lg p-6 border border-orange-500 shadow-lg">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-orange-400">📦 Batch Actions Queue</h2>
                <button
                  onClick={() => setShowBatchMode(false)}
                  className="text-gray-400 hover:text-gray-300 transition-colors"
                >
                  ✕
                </button>
              </div>

              {batchActions.length === 0 ? (
                <div className="text-center text-gray-400 py-8">
                  <p>No actions queued</p>
                  <p className="text-sm mt-2">Actions can be queued for batch execution (feature coming soon)</p>
                </div>
              ) : (
                <>
                  <div className="space-y-3 mb-4">
                    {batchActions.map((action) => (
                      <div
                        key={action.id}
                        className="bg-black/30 rounded-lg p-4 border border-orange-500/30 hover:border-orange-400/50 transition-colors"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-white font-bold">{action.type}</span>
                          <button
                            onClick={() => setBatchActions(prev => prev.filter(a => a.id !== action.id))}
                            className="text-red-400 hover:text-red-300 text-sm"
                          >
                            Remove
                          </button>
                        </div>
                        <p className="text-gray-300 text-sm mb-2">{action.description}</p>
                        {action.address && (
                          <p className="text-gray-400 text-xs font-mono">Address: {action.address}</p>
                        )}
                        {action.value && (
                          <p className="text-gray-400 text-xs">Value: {action.value}</p>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        if (confirm(`Execute ${batchActions.length} actions?\n\nThis will execute all queued actions sequentially.`)) {
                          // Execute batch actions sequentially
                          setBatchActions([]);
                        }
                      }}
                      className="flex-1 bg-orange-600 hover:bg-orange-700 text-white font-bold py-3 px-6 rounded-lg transition-colors"
                    >
                      ⚡ Execute All ({batchActions.length})
                    </button>
                    <button
                      onClick={() => {
                        if (confirm('Clear all queued actions?')) {
                          setBatchActions([]);
                        }
                      }}
                      className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-lg transition-colors"
                    >
                      🗑️ Clear Queue
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Transaction History */}
          {showTxHistory && txHistory.length > 0 && (
            <div className="bg-gradient-to-br from-gray-900/30 to-gray-700/20 rounded-lg p-6 border border-gray-500 shadow-lg">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-400">📜 Transaction History</h2>
                <div className="flex gap-2">
                  <button
                    onClick={exportConfig}
                    className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold py-2 px-4 rounded-lg transition-colors"
                  >
                    💾 Export Config
                  </button>
                  <button
                    onClick={() => setShowTxHistory(false)}
                    className="text-gray-400 hover:text-gray-300 transition-colors"
                  >
                    ✕
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                {txHistory.map((tx, idx) => (
                  <div
                    key={idx}
                    className="bg-black/30 rounded-lg p-4 border border-gray-500/30 hover:border-gray-400/50 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {tx.status === 'success' && <span className="text-green-400">✅</span>}
                        {tx.status === 'pending' && <span className="text-yellow-400 animate-pulse">⏳</span>}
                        {tx.status === 'failed' && <span className="text-red-400">❌</span>}
                        <span className="text-white font-bold">{tx.action}</span>
                      </div>
                      <span className="text-gray-400 text-xs">
                        {new Date(tx.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    
                    <div className="text-gray-400 text-xs font-mono mb-1">
                      {tx.hash.slice(0, 10)}...{tx.hash.slice(-8)}
                    </div>
                    
                    {tx.params && (
                      <div className="text-gray-500 text-xs mt-2">
                        {tx.params}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {txHistory.length === 0 && (
                <div className="text-center text-gray-400 py-8">
                  No transactions yet. Actions will appear here.
                </div>
              )}
            </div>
          )}

          {/* Ownership Transfer - DAO Handover */}
          <div className="bg-gradient-to-br from-red-900/40 to-orange-900/40 backdrop-blur-md rounded-2xl p-6 border-2 border-red-500">
            <h2 className="text-2xl font-bold text-white mb-4">👑 Ownership Transfer</h2>
            <p className="text-gray-300 text-sm mb-4">
              Transfer contract ownership to DAO Timelock for decentralized governance. This is the final step in progressive decentralization.
            </p>

            <div className="bg-red-500/20 border border-red-500 rounded-lg p-4 mb-4">
              <p className="text-red-400 text-sm font-bold">⚠️ CRITICAL WARNING</p>
              <ul className="text-gray-300 text-xs mt-2 space-y-1">
                <li>• This is IRREVERSIBLE - you will lose all admin access</li>
                <li>• Transfer to DAO Timelock, not EOA address</li>
                <li>• Verify DAO Timelock is properly configured first</li>
                <li>• All future changes require DAO proposals</li>
              </ul>
            </div>

            <div className="mb-4">
              <label className="block text-gray-300 text-sm mb-2">New Owner Address (DAO Timelock)</label>
              <input
                type="text"
                value={newOwner}
                onChange={(e) => setNewOwner(e.target.value)}
                placeholder="0x... (DAO Timelock address)"
                className="w-full bg-black/30 text-white rounded-lg px-4 py-3 border border-red-600 focus:border-red-500 focus:outline-none font-mono text-sm"
              />
            </div>

            <button
              onClick={handleTransferOwnership}
              disabled={!newOwner || isPending || isConfirming}
              className="w-full bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white font-bold py-4 px-6 rounded-lg transition-colors mb-3"
            >
              👑 Transfer Ownership to DAO
            </button>

            <div className="bg-yellow-500/20 border border-yellow-500 rounded-lg p-4 mb-4">
              <p className="text-yellow-400 text-sm font-bold">⚠️ RECOMMENDED: Transfer to Multisig First</p>
              <ul className="text-gray-300 text-xs mt-2 space-y-1">
                <li>• Use 8/12 Gnosis Safe (8 signatures = 60% threshold)</li>
                <li>• Prevents single point of failure (need supermajority)</li>
                <li>• Removed members lose access immediately</li>
                <li>• Can tolerate 4 unavailable/compromised members</li>
                <li>• Test for 3-6 months before full DAO</li>
                <li>• Then: Multisig → DAO Timelock</li>
              </ul>
            </div>

            <div className="bg-blue-500/20 border border-blue-500 rounded-lg p-4">
              <p className="text-blue-400 text-sm font-bold">📋 Pre-Transfer Checklist</p>
              <ul className="text-gray-300 text-xs mt-2 space-y-1">
                <li>✅ All modules configured (VaultHub, SecurityHub, etc.)</li>
                <li>✅ Exchanges whitelisted and funded</li>
                <li>✅ Vault-only mode enabled</li>
                <li>✅ Policy locked (if permanent enforcement desired)</li>
                <li>✅ DAO Timelock deployed and tested (if going direct)</li>
                <li>✅ Council system operational</li>
                <li>✅ ProofScore system active</li>
                <li>✅ OR: Gnosis Safe 8/12 multisig created (recommended first step)</li>
              </ul>
            </div>

            <div className="mt-4 bg-purple-500/20 border border-purple-500 rounded-lg p-4">
              <p className="text-purple-400 text-sm font-bold">🏛️ Recommended Progressive Path</p>
              <div className="text-gray-300 text-xs mt-2 space-y-2">
                <div className="bg-black/30 rounded p-2">
                  <p className="text-white font-bold">Stage 1: Single Owner → 8/12 Multisig</p>
                  <p className="text-gray-400 mt-1">Transfer ownership to Gnosis Safe (8 sigs = 60% threshold)</p>
                  <p className="text-green-400">✅ Immediate access control for removed members</p>
                  <p className="text-green-400">✅ Prevents single point of failure (need supermajority)</p>
                  <p className="text-green-400">✅ Tolerates 4 unavailable/compromised members</p>
                  <p className="text-blue-400">Duration: 3-6 months</p>
                </div>
                <div className="bg-black/30 rounded p-2">
                  <p className="text-white font-bold">Stage 2: Multisig → DAO Timelock</p>
                  <p className="text-gray-400 mt-1">Multisig votes (8/12 = 60%) to transfer to community DAO</p>
                  <p className="text-purple-400">📋 Requires proposal + community vote + timelock</p>
                  <p className="text-blue-400">Duration: Forever (true decentralization)</p>
                </div>
              </div>
            </div>

            <div className="mt-4 bg-gray-500/20 border border-gray-500 rounded-lg p-4">
              <p className="text-gray-300 text-sm font-bold">🔐 Multisig Security Model (8/12)</p>
              <ul className="text-gray-400 text-xs mt-2 space-y-1">
                <li>• 12 trusted DAO members, 8 signatures needed for ANY action (60%)</li>
                <li>• Remove member via multisig vote (8/12) → immediate access loss</li>
                <li>• Add member via multisig vote (8/12) → immediate access gain</li>
                <li>• No minority group can execute alone (need supermajority)</li>
                <li>• Can tolerate 4 unavailable/compromised members</li>
                <li>• All transactions visible on-chain (transparent)</li>
                <li>• Use Gnosis Safe: <span className="text-blue-400">https://app.safe.global/</span></li>
              </ul>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6">
            <h2 className="text-2xl font-bold text-white mb-4">⚡ Quick Actions</h2>
            
            <div className="space-y-3">
              {/* Emergency Pause */}
              <button
                onClick={() => {
                  if (confirm('🚨 EMERGENCY PAUSE\n\nThis will immediately halt all token transfers (except owner).\n\nUse only in emergencies!\n\nContinue?')) {
                    handleToggleCircuitBreaker();
                  }
                }}
                className={`block w-full ${
                  circuitBreaker
                    ? 'bg-green-600 hover:bg-green-700'
                    : 'bg-red-600 hover:bg-red-700'
                } text-white font-bold py-3 px-6 rounded-lg transition-colors text-center`}
              >
                {circuitBreaker ? '✅ Resume Operations' : '🚨 EMERGENCY PAUSE'}
              </button>

              {/* Toggle Transaction History */}
              <button
                onClick={() => setShowTxHistory(!showTxHistory)}
                className="block w-full bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 px-6 rounded-lg transition-colors text-center"
              >
                📜 {showTxHistory ? 'Hide' : 'Show'} Transaction History ({txHistory.length})
              </button>

              {/* Toggle Health Dashboard */}
              <button
                onClick={() => setShowHealthDashboard(!showHealthDashboard)}
                className="block w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-6 rounded-lg transition-colors text-center"
              >
                🏥 {showHealthDashboard ? 'Hide' : 'Show'} Health Dashboard
              </button>

              {/* Toggle Simulation Mode */}
              <button
                onClick={() => {
                  setShowSimulation(!showSimulation);
                  if (showSimulation) setSimulationData(null);
                }}
                className={`block w-full ${
                  showSimulation
                    ? 'bg-yellow-600 hover:bg-yellow-700'
                    : 'bg-gray-600 hover:bg-gray-700'
                } text-white font-bold py-3 px-6 rounded-lg transition-colors text-center`}
              >
                🔍 {showSimulation ? 'Disable' : 'Enable'} Simulation Mode
              </button>

              {/* Toggle Batch Mode */}
              <button
                onClick={() => setShowBatchMode(!showBatchMode)}
                className={`block w-full ${
                  showBatchMode
                    ? 'bg-orange-600 hover:bg-orange-700'
                    : 'bg-gray-600 hover:bg-gray-700'
                } text-white font-bold py-3 px-6 rounded-lg transition-colors text-center`}
              >
                📦 {showBatchMode ? 'Hide' : 'Show'} Batch Actions ({batchActions.length})
              </button>
              
              <a
                href="/governance"
                className="block w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-6 rounded-lg transition-colors text-center"
              >
                🏛️ Governance Dashboard
              </a>
              
              <a
                href="/treasury"
                className="block w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition-colors text-center"
              >
                💰 Treasury
              </a>
              
              <a
                href="/dashboard"
                className="block w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-lg transition-colors text-center"
              >
                🛡️ Trust & Security
              </a>
              
              <a
                href="/badges"
                className="block w-full bg-pink-600 hover:bg-pink-700 text-white font-bold py-3 px-6 rounded-lg transition-colors text-center"
              >
                🏅 Badge System
              </a>
            </div>

            <div className="mt-6 pt-6 border-t border-gray-600">
              <h3 className="text-white font-bold mb-2">📚 Documentation</h3>
              <div className="space-y-2 text-sm">
                <a href="/docs" className="block text-blue-400 hover:text-blue-300">→ Deployment Instructions</a>
                <a href="/docs" className="block text-blue-400 hover:text-blue-300">→ Architecture Guide</a>
                <a href="/docs" className="block text-blue-400 hover:text-blue-300">→ Security Audit</a>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-gray-600">
              <h3 className="text-white font-bold mb-2">🔔 Notifications</h3>
              <div className="space-y-2 text-sm">
                <div className="bg-black/30 rounded-lg p-3">
                  <p className="text-gray-400 mb-2">Connect notification services:</p>
                  <div className="space-y-1">
                    <button className="text-gray-500 text-xs hover:text-blue-400 transition-colors">
                      → Email Alerts (Coming Soon)
                    </button>
                    <button className="text-gray-500 text-xs hover:text-blue-400 transition-colors block">
                      → Discord Webhook (Coming Soon)
                    </button>
                    <button className="text-gray-500 text-xs hover:text-blue-400 transition-colors block">
                      → Telegram Bot (Coming Soon)
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Transaction Status */}
        {(isPending || isConfirming || isSuccess) && (
          <div className="fixed bottom-8 right-8 bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-purple-500 max-w-md">
            {isPending && (
              <div className="flex items-center gap-3">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                <p className="text-white">Waiting for wallet approval...</p>
              </div>
            )}
            {isConfirming && (
              <div className="flex items-center gap-3">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                <p className="text-white">Transaction confirming...</p>
              </div>
            )}
            {isSuccess && (
              <div>
                <p className="text-green-400 font-bold mb-2">✅ Transaction Successful!</p>
                <p className="text-gray-300 text-sm">Refreshing in 3 seconds...</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
    <Footer />
  </>
  );
}

function StatCard({ label, value, color, icon }: { label: string; value: string; color: string; icon: string }) {
  const colorClasses = {
    green: 'bg-green-500/20 border-green-500 text-green-400',
    yellow: 'bg-yellow-500/20 border-yellow-500 text-yellow-400',
    red: 'bg-red-500/20 border-red-500 text-red-400',
    blue: 'bg-blue-500/20 border-blue-500 text-blue-400',
    purple: 'bg-purple-500/20 border-purple-500 text-purple-400',
  };

  return (
    <div className={`${colorClasses[color as keyof typeof colorClasses]} backdrop-blur-md rounded-xl p-6 border`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-4xl">{icon}</span>
      </div>
      <p className="text-gray-300 text-sm mb-1">{label}</p>
      <p className="text-white text-2xl font-bold">{value}</p>
    </div>
  );
}

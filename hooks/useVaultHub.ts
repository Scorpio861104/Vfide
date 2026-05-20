import {
  useAccount,
  useReadContract,
  useWriteContract,
  useChainId,
  usePublicClient,
  useSwitchChain,
} from 'wagmi';
import type { PublicClient } from 'viem';
import { isAddress, decodeEventLog } from 'viem';
import { VAULT_HUB_ABI, ZERO_ADDRESS, isConfiguredContractAddress, getContractAddresses } from '../lib/contracts';
import { useContractAddresses } from './useContractAddresses';
import { CURRENT_CHAIN_ID } from '../lib/testnet';
import { getChainByChainId, isTestnetChainId, isSupportedChainId, getAllChainIds } from '../lib/chains';
import { devLog } from '../lib/utils';

// Network-agnostic vault hub hook.
//
// Behavior:
// - The "preferred" chain is the env-configured CURRENT_CHAIN_ID (e.g. Base 8453).
// - The actual chain used is the wallet's currently-connected chain, if it is
//   supported AND has VaultHub deployed there. Otherwise we report
//   `isOnCorrectChain = false` and surface a one-click switch via `switchToPreferredChain`.
// - All reads/writes use the connected chain id; we never silently target a
//   different chain than the wallet is on.

const PARSED_VAULT_HUB_ABI = VAULT_HUB_ABI;

function chainLabel(chainId: number | undefined): string {
  if (typeof chainId !== 'number') return 'the configured network';
  const chain = getChainByChainId(chainId);
  if (!chain) return `chain ${chainId}`;
  return isTestnetChainId(chainId) ? chain.testnet.name : chain.mainnet.name;
}

// Helper to parse contract errors into user-friendly messages
function parseContractError(error: unknown, expectedLabel: string): string {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();

    // User rejected the transaction
    if (message.includes('user rejected') || message.includes('user denied') || message.includes('action_rejected')) {
      return 'Transaction cancelled by user';
    }

    // Insufficient funds
    if (message.includes('insufficient funds') || message.includes('insufficient balance')) {
      return 'Insufficient ETH for gas. Please add ETH to your wallet on Base.';
    }

    // Invalid address format (20 bytes / hex issue)
    if (message.includes('20') && (message.includes('byte') || message.includes('address') || message.includes('hex'))) {
      return `Invalid address format. Please ensure you are on ${expectedLabel}.`;
    }

    // Wrong chain/network
    if (message.includes('chain') && (message.includes('unsupported') || message.includes('wrong') || message.includes('mismatch'))) {
      return `Please switch to ${expectedLabel} and try again.`;
    }

    // VaultHub-specific reverts (custom errors get encoded as VH_*)
    if (message.includes('vh_zero') || message.includes('uv:zero') || message.includes('vi_zero')) {
      return 'Vault contracts are not fully initialised on this chain. Please contact support.';
    }
    if (message.includes('vh_paused') || message.includes('whennotpaused')) {
      return 'Vault creation is temporarily paused by governance. Please try again shortly.';
    }
    if (message.includes('vh_alreadyownsvault')) {
      return 'This wallet already owns a vault. Refresh the page to load it.';
    }

    if (message.includes('create2 failed')) {
      return 'Vault creation failed (CREATE2). The deployer may need to be re-funded with gas. Please try again.';
    }

    // Network errors
    if (message.includes('network') || message.includes('rpc') || message.includes('timeout') || message.includes('fetch failed')) {
      return 'Network error reaching Base RPC. Please check your connection and retry.';
    }

    // Gas estimation failed - likely contract will revert
    if (message.includes('gas') && (message.includes('estimate') || message.includes('intrinsic'))) {
      return 'Gas estimation failed — the transaction would revert. Please confirm you are on the correct network and have ETH for gas.';
    }

    // Execution reverted with data (often shows as hex addresses)
    if (message.includes('execution reverted') || message.includes('revert')) {
      return 'Transaction reverted. Please ensure you have ETH for gas and that you are on the correct network.';
    }

    // Return a cleaner version of the error (truncate if too long)
    const cleanMessage = error.message?.split('\n')[0]?.substring(0, 140);
    return cleanMessage || 'An unexpected error occurred';
  }

  return 'An unexpected error occurred';
}

// Wagmi's strict chain id literal type. We cast our resolved chain id to this
// union after isSupportedChainId() has already validated it.
type SupportedChainIdLiteral = 84532 | 8453 | 300 | 8453 | 137 | 324 | 80002;

/**
 * Resolve the chain id we should be operating on for this wallet session.
 * - If the wallet's connected chain is supported AND has VaultHub configured, use that.
 * - Otherwise fall back to CURRENT_CHAIN_ID (the env-configured preferred chain).
 */
function resolveOperationalChainId(connectedChainId: number | undefined): SupportedChainIdLiteral {
  if (typeof connectedChainId === 'number' && isSupportedChainId(connectedChainId)) {
    const addrs = getContractAddresses(connectedChainId);
    if (isConfiguredContractAddress(addrs.VaultHub)) {
      return connectedChainId as SupportedChainIdLiteral;
    }
  }
  return CURRENT_CHAIN_ID as SupportedChainIdLiteral;
}

export function useVaultHub() {
  const { address: userAddress } = useAccount();
  const connectedChainId = useChainId();
  const { switchChainAsync, isPending: isSwitchingChain } = useSwitchChain();

  const operationalChainId = resolveOperationalChainId(connectedChainId);
  const isOnCorrectChain = connectedChainId === operationalChainId;

  // Resolve VaultHub address for the chain we're actually targeting.
  // useContractAddresses() returns the addresses for the connected chain,
  // which is what we want when the wallet is on a supported chain.
  const connectedAddrs = useContractAddresses();
  const targetAddrs = isOnCorrectChain
    ? connectedAddrs
    : getContractAddresses(operationalChainId);

  const VAULT_HUB_ADDRESS = targetAddrs.VaultHub;

  const publicClientRaw = usePublicClient({ chainId: operationalChainId });
  // Cast away the per-chain discriminated-union to keep TS from blowing up
  // on the simulateContract call signature (it has an explosive union otherwise).
  const publicClient = publicClientRaw as PublicClient | undefined;
  const { writeContractAsync, isPending: isCreatingVault } = useWriteContract();

  // Validate VaultHub address format
  const isValidVaultHubAddress = !!VAULT_HUB_ADDRESS && isAddress(VAULT_HUB_ADDRESS);
  const isContractConfigured = isConfiguredContractAddress(VAULT_HUB_ADDRESS);

  // Get user's vault address — only when on the right chain and contract configured.
  const { data: vaultAddress, isLoading: isLoadingVault, refetch: refetchVault } = useReadContract({
    address: VAULT_HUB_ADDRESS,
    abi: PARSED_VAULT_HUB_ABI,
    functionName: 'vaultOf',
    args: userAddress ? [userAddress] : undefined,
    chainId: operationalChainId,
    query: {
      enabled: isContractConfigured && !!userAddress && isOnCorrectChain,
      refetchInterval: 10_000, // refetch every 10s
      retry: 3,
      retryDelay: 1_000,
    },
  });

  // Check if vault exists (not zero address)
  const vaultAddressHex = vaultAddress as `0x${string}` | undefined;
  const hasVault = !!vaultAddressHex && vaultAddressHex !== ZERO_ADDRESS;

  const expectedChainName = chainLabel(operationalChainId);

  /**
   * One-click switch to the preferred chain (e.g. Base 8453).
   * Returns true if the wallet ends up on the operational chain.
   */
  const switchToPreferredChain = async (): Promise<boolean> => {
    if (isOnCorrectChain) return true;
    try {
      await switchChainAsync({ chainId: operationalChainId });
      return true;
    } catch (err) {
      devLog.error('Chain switch failed:', err);
      return false;
    }
  };

  // Create vault for user using ensureVault()
  const createVault = async (): Promise<{
    transactionHash: `0x${string}`;
    vaultAddress: `0x${string}` | undefined;
  }> => {
    if (!userAddress) {
      throw new Error('Connect your wallet to create a vault.');
    }
    if (!isValidVaultHubAddress) {
      throw new Error(`Vault contracts are not configured on ${expectedChainName}. Please contact support.`);
    }
    if (!isContractConfigured) {
      throw new Error(`Vault contracts are not yet deployed on ${expectedChainName}. Please try again later.`);
    }

    // Auto-switch chain if needed (single user gesture path).
    if (!isOnCorrectChain) {
      const switched = await switchToPreferredChain();
      if (!switched) {
        throw new Error(`Please switch to ${expectedChainName} in your wallet and try again.`);
      }
    }

    if (!publicClient) {
      throw new Error('Network client unavailable. Please try again.');
    }

    try {
      // Pre-flight: simulate the call so we surface revert reasons BEFORE
      // asking the user to sign. This catches "vfideToken not set", paused state,
      // and any other revert reason without spending gas or interrupting the user.
      try {
        await publicClient.simulateContract({
          address: VAULT_HUB_ADDRESS as `0x${string}`,
          abi: PARSED_VAULT_HUB_ABI,
          functionName: 'ensureVault',
          args: [userAddress],
          account: userAddress,
        });
      } catch (simErr) {
        devLog.error('ensureVault simulation failed:', simErr);
        throw new Error(parseContractError(simErr, expectedChainName));
      }

      const hash = await writeContractAsync({
        address: VAULT_HUB_ADDRESS as `0x${string}`,
        abi: PARSED_VAULT_HUB_ABI,
        functionName: 'ensureVault',
        args: [userAddress],
        chainId: operationalChainId,
      });

      const receipt = await publicClient.waitForTransactionReceipt({
        hash,
        confirmations: 1,
      });

      // Try to extract the new vault address from the VaultCreated event for
      // a deterministic, fast post-create state sync (don't wait for the next
      // 10s refetchInterval tick).
      let newVaultAddress: `0x${string}` | undefined;
      for (const log of receipt.logs) {
        try {
          const parsed = decodeEventLog({
            abi: PARSED_VAULT_HUB_ABI,
            data: log.data,
            topics: log.topics,
          });
          if (parsed.eventName === 'VaultCreated') {
            const args = parsed.args as { owner?: `0x${string}`; vault?: `0x${string}` };
            if (args.owner && args.vault && args.owner.toLowerCase() === userAddress.toLowerCase()) {
              newVaultAddress = args.vault;
              break;
            }
          }
        } catch {
          // not a VaultHub log — skip
        }
      }

      await refetchVault();

      return {
        transactionHash: hash,
        vaultAddress: newVaultAddress,
      };
    } catch (error) {
      devLog.error('Vault creation error:', error);
      // Re-throw with user-friendly message
      throw new Error(parseContractError(error, expectedChainName));
    }
  };

  return {
    vaultAddress: hasVault ? vaultAddressHex : undefined,
    hasVault,
    isLoadingVault,
    isCreatingVault,
    isSwitchingChain,
    createVault,
    refetchVault,
    switchToPreferredChain,
    vaultHubConfigured: isContractConfigured,
    isContractConfigured,
    isOnCorrectChain,
    expectedChainId: operationalChainId,
    expectedChainName,
    supportedChainIds: getAllChainIds(),
  };
}

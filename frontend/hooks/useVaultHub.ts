import { useAccount, useReadContract, useWriteContract, useChainId } from 'wagmi';
import { isAddress, parseAbi } from 'viem';
import { zkSyncSepoliaTestnet } from 'wagmi/chains';
import { VAULT_HUB_ABI } from '../lib/contracts';

// Parse the ABI for proper type inference
const PARSED_VAULT_HUB_ABI = parseAbi(VAULT_HUB_ABI);

// VaultHub contract address from environment
const VAULT_HUB_ADDRESS = process.env.NEXT_PUBLIC_VAULT_HUB_ADDRESS as `0x${string}` | undefined;

// Expected chain ID for the vault operations
const EXPECTED_CHAIN_ID = zkSyncSepoliaTestnet.id; // 300

// Debug logging for production issues
if (typeof window !== 'undefined') {
  console.log('[VaultHub Debug]', {
    VAULT_HUB_ADDRESS,
    hasAddress: !!VAULT_HUB_ADDRESS,
    addressLength: VAULT_HUB_ADDRESS?.length,
    EXPECTED_CHAIN_ID,
  });
}

// Helper to parse contract errors into user-friendly messages
function parseContractError(error: unknown): string {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    
    // User rejected the transaction
    if (message.includes('user rejected') || message.includes('user denied')) {
      return 'Transaction cancelled by user';
    }
    
    // Insufficient funds
    if (message.includes('insufficient funds') || message.includes('insufficient balance')) {
      return 'Insufficient ETH for gas. Please add funds to your wallet.';
    }
    
    // Invalid address format (20 bytes / hex issue)
    if (message.includes('20') && (message.includes('byte') || message.includes('address') || message.includes('hex'))) {
      return 'Invalid address format. Please ensure you are on the correct network (zkSync Sepolia).';
    }
    
    // Wrong chain/network
    if (message.includes('chain') && (message.includes('unsupported') || message.includes('wrong') || message.includes('mismatch'))) {
      return 'Please switch to zkSync Sepolia network and try again.';
    }
    
    // Contract revert errors - UV:zero means token/hub/owner not set
    if (message.includes('uv:zero') || message.includes('vi_zero') || message.includes('vi:zero')) {
      return 'Contract not properly initialized. Please contact support.';
    }
    
    if (message.includes('create2 failed')) {
      return 'Vault creation failed. The contract may not be properly initialized on this network.';
    }
    
    // Network errors
    if (message.includes('network') || message.includes('rpc') || message.includes('timeout')) {
      return 'Network error. Please check your connection and try again.';
    }
    
    // Gas estimation failed - likely contract will revert
    if (message.includes('gas') && (message.includes('estimate') || message.includes('intrinsic'))) {
      return 'Transaction would fail. The vault contract may not be properly configured on this network.';
    }
    
    // Execution reverted with data (often shows as hex addresses)
    if (message.includes('execution reverted') || message.includes('revert')) {
      // Check for specific known issues
      if (message.includes('0x') && message.length > 200) {
        // Long hex string in error = raw revert data with addresses
        return 'Vault creation failed. The contract may not be configured correctly. Please try again later or contact support.';
      }
      return 'Transaction failed. Please ensure you have enough ETH for gas and try again.';
    }
    
    // Return a cleaner version of the error (truncate if too long)
    const cleanMessage = error.message.split('\n')[0].substring(0, 100);
    return cleanMessage || 'An unexpected error occurred';
  }
  
  return 'An unexpected error occurred';
}

export function useVaultHub() {
  const { address: userAddress } = useAccount();
  const chainId = useChainId();
  const { writeContractAsync, isPending: isCreatingVault } = useWriteContract();

  // Check if on correct chain
  const isOnCorrectChain = chainId === EXPECTED_CHAIN_ID;

  // Validate VaultHub address format
  const isValidVaultHubAddress = VAULT_HUB_ADDRESS && isAddress(VAULT_HUB_ADDRESS);

  // Get user's vault address
  const { data: vaultAddress, isLoading: isLoadingVault, refetch: refetchVault } = useReadContract({
    address: VAULT_HUB_ADDRESS,
    abi: PARSED_VAULT_HUB_ABI,
    functionName: 'vaultOf',
    args: userAddress ? [userAddress] : undefined,
    chainId: EXPECTED_CHAIN_ID,
    query: { 
      enabled: !!isValidVaultHubAddress && !!userAddress && isOnCorrectChain,
      refetchInterval: 10000, // Refetch every 10 seconds
    },
  });

  // Check if VaultHub has vfideToken set (contract is properly configured)
  const { data: vfideTokenAddress } = useReadContract({
    address: VAULT_HUB_ADDRESS,
    abi: PARSED_VAULT_HUB_ABI,
    functionName: 'vfideToken',
    chainId: EXPECTED_CHAIN_ID,
    query: { 
      enabled: !!isValidVaultHubAddress && isOnCorrectChain,
    },
  });

  // Contract is properly configured if vfideToken is set
  const isContractConfigured = vfideTokenAddress && vfideTokenAddress !== '0x0000000000000000000000000000000000000000';

  // Check if vault exists (not zero address)
  const hasVault = vaultAddress && vaultAddress !== '0x0000000000000000000000000000000000000000';

  // Create vault for user
  const createVault = async () => {
    if (!isValidVaultHubAddress || !userAddress) {
      throw new Error('VaultHub not configured or wallet not connected');
    }

    if (!isOnCorrectChain) {
      throw new Error('Please switch to zkSync Sepolia network to create a vault.');
    }

    // Check if contract is properly configured before attempting
    if (!isContractConfigured) {
      throw new Error('Vault system is not yet fully configured on this network. Please try again later.');
    }

    try {
      const result = await writeContractAsync({
        address: VAULT_HUB_ADDRESS,
        abi: PARSED_VAULT_HUB_ABI,
        functionName: 'ensureVault',
        args: [userAddress],
        chainId: EXPECTED_CHAIN_ID,
      });
      return result;
    } catch (error) {
      console.error('Vault creation error:', error);
      // Re-throw with user-friendly message
      throw new Error(parseContractError(error));
    }
  };

  return {
    vaultAddress: hasVault ? (vaultAddress as `0x${string}`) : undefined,
    hasVault,
    isLoadingVault,
    isCreatingVault,
    createVault,
    refetchVault,
    vaultHubConfigured: !!isValidVaultHubAddress,
    isContractConfigured,
    isOnCorrectChain,
    expectedChainId: EXPECTED_CHAIN_ID,
  };
}

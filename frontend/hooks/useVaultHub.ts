import { useAccount, useReadContract, useWriteContract } from 'wagmi';
import { parseAbi } from 'viem';

const VAULT_HUB_ABI = parseAbi([
  'function vaultOf(address owner) view returns (address)',
  'function ownerOfVault(address vault) view returns (address)',
  'function ensureVault(address owner) returns (address)',
]);

// VaultHub contract address from environment
const VAULT_HUB_ADDRESS = process.env.NEXT_PUBLIC_VAULT_HUB_ADDRESS as `0x${string}` | undefined;

export function useVaultHub() {
  const { address: userAddress } = useAccount();
  const { writeContractAsync, isPending: isCreatingVault } = useWriteContract();

  // Get user's vault address
  const { data: vaultAddress, isLoading: isLoadingVault, refetch: refetchVault } = useReadContract({
    address: VAULT_HUB_ADDRESS,
    abi: VAULT_HUB_ABI,
    functionName: 'vaultOf',
    args: userAddress ? [userAddress] : undefined,
    query: { 
      enabled: !!VAULT_HUB_ADDRESS && !!userAddress,
      refetchInterval: 10000, // Refetch every 10 seconds
    },
  });

  // Check if vault exists (not zero address)
  const hasVault = vaultAddress && vaultAddress !== '0x0000000000000000000000000000000000000000';

  // Create vault for user
  const createVault = async () => {
    if (!VAULT_HUB_ADDRESS || !userAddress) {
      throw new Error('VaultHub not configured or wallet not connected');
    }

    return await writeContractAsync({
      address: VAULT_HUB_ADDRESS,
      abi: VAULT_HUB_ABI,
      functionName: 'ensureVault',
      args: [userAddress],
    });
  };

  return {
    vaultAddress: hasVault ? vaultAddress : undefined,
    hasVault,
    isLoadingVault,
    isCreatingVault,
    createVault,
    refetchVault,
    vaultHubConfigured: !!VAULT_HUB_ADDRESS,
  };
}

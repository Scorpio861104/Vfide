import { isAddress } from 'viem';

// Registry of future/optional contract addresses loaded from env vars
export type FutureContractName =
  | 'CardBoundVault'
  | 'SecureVault'
  | 'SecureVaultFactory'
  | 'CardBoundVaultFactory'
  | 'ContributionEscrow'
  | 'VaultRecoveryChallenge'
  | 'CoveredVaultFactory'
  | 'CoveredVault'
  | 'ConsentEscrow'
  | 'CoveredVaultConsentEscrow'
  | 'SovereignMemberConsentEscrow'
  | 'FeeDistributor'
  | 'ProofScoreBurnRouter'
  | 'Seer'
  | 'TrustScorePassport';

type EnvVar = `NEXT_PUBLIC_${string}`;

const CONTRACT_ENV_MAP: Record<FutureContractName, EnvVar> = {
  CardBoundVault:                  'NEXT_PUBLIC_CARD_BOUND_VAULT',
  SecureVault:                     'NEXT_PUBLIC_SECURE_VAULT',
  SecureVaultFactory:              'NEXT_PUBLIC_SECURE_VAULT_FACTORY',
  CardBoundVaultFactory:           'NEXT_PUBLIC_CARD_BOUND_VAULT_FACTORY',
  ContributionEscrow:              'NEXT_PUBLIC_CONTRIBUTION_ESCROW',
  VaultRecoveryChallenge:          'NEXT_PUBLIC_VAULT_RECOVERY_CHALLENGE',
  CoveredVaultFactory:             'NEXT_PUBLIC_COVERED_VAULT_FACTORY',
  CoveredVault:                    'NEXT_PUBLIC_COVERED_VAULT',
  ConsentEscrow:                   'NEXT_PUBLIC_CONSENT_ESCROW',
  CoveredVaultConsentEscrow:       'NEXT_PUBLIC_COVERED_VAULT_CONSENT_ESCROW',
  SovereignMemberConsentEscrow:    'NEXT_PUBLIC_SOVEREIGN_MEMBER_CONSENT_ESCROW',
  FeeDistributor:                  'NEXT_PUBLIC_FEE_DISTRIBUTOR',
  ProofScoreBurnRouter:            'NEXT_PUBLIC_PROOF_SCORE_BURN_ROUTER',
  Seer:                            'NEXT_PUBLIC_SEER',
  TrustScorePassport:              'NEXT_PUBLIC_TRUST_SCORE_PASSPORT_ADDRESS',
};

export function getFutureContractAddress(name: FutureContractName): string | null {
  const envVar = CONTRACT_ENV_MAP[name];
  const value = process.env[envVar];
  if (!value || !isAddress(value)) return null;
  return value;
}

export function isFutureContractDeployed(name: FutureContractName): boolean {
  return getFutureContractAddress(name) !== null;
}

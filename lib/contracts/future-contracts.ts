import { isAddress } from 'viem'
import { ZERO_ADDRESS } from '@/lib/constants'
import { CURRENT_CHAIN_ID } from '@/lib/testnet'

const FUTURE_FEATURE_FLAG = 'NEXT_PUBLIC_FUTURE_FEATURES_ENABLED'

type FutureContractName =
  | 'BadgeNFT'
  | 'SeerAutonomous'
  | 'SeerGuardian'
  | 'CouncilElection'
  | 'CouncilSalary'
  | 'SubscriptionManager'

type FutureContractEnvMap = Record<FutureContractName, string>

const FUTURE_CONTRACT_ENV_VAR_MAP: FutureContractEnvMap = {
  BadgeNFT: 'NEXT_PUBLIC_BADGE_NFT_ADDRESS',
  SeerAutonomous: 'NEXT_PUBLIC_SEER_AUTONOMOUS_ADDRESS',
  SeerGuardian: 'NEXT_PUBLIC_SEER_GUARDIAN_ADDRESS',
  CouncilElection: 'NEXT_PUBLIC_COUNCIL_ELECTION_ADDRESS',
  CouncilSalary: 'NEXT_PUBLIC_COUNCIL_SALARY_ADDRESS',
  SubscriptionManager: 'NEXT_PUBLIC_SUBSCRIPTION_MANAGER_ADDRESS',
}

export type FutureContractAddresses = Record<FutureContractName, `0x${string}`>

export function isFutureFeaturesEnabled(): boolean {
  return process.env.NEXT_PUBLIC_FUTURE_FEATURES_ENABLED === 'true'
}

function getChainScopedAddress(envVarName: string, chainId: number): string | undefined {
  return process.env[`${envVarName}_${chainId}`] ?? process.env[envVarName]
}

function validateFutureAddress(name: FutureContractName, chainId: number): `0x${string}` {
  const envVarName = FUTURE_CONTRACT_ENV_VAR_MAP[name]
  const value = getChainScopedAddress(envVarName, chainId)

  if (!value || !isAddress(value)) {
    return ZERO_ADDRESS
  }

  return value as `0x${string}`
}

export function getFutureContractAddresses(chainId: number = CURRENT_CHAIN_ID): FutureContractAddresses {
  if (!isFutureFeaturesEnabled()) {
    throw new Error(`[VFIDE] Future contracts requested but ${FUTURE_FEATURE_FLAG} is not enabled.`)
  }

  return {
    BadgeNFT: validateFutureAddress('BadgeNFT', chainId),
    SeerAutonomous: validateFutureAddress('SeerAutonomous', chainId),
    SeerGuardian: validateFutureAddress('SeerGuardian', chainId),
    CouncilElection: validateFutureAddress('CouncilElection', chainId),
    CouncilSalary: validateFutureAddress('CouncilSalary', chainId),
    SubscriptionManager: validateFutureAddress('SubscriptionManager', chainId),
  }
}

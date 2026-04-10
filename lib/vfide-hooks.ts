/**
 * VFIDE Real-Time Contract Integration Hooks
 * Mind-blowing live data from blockchain with optimistic updates
 * Updated for wagmi v2
 * 
 * REFACTORED: This file now re-exports hooks from domain-specific files.
 */

'use client'

export * from '../hooks/useVaultHooks'
export * from '../hooks/useProofScoreHooks'
export * from '../hooks/useMentorHooks'
export * from '../hooks/useMerchantHooks'
export * from '../hooks/useSecurityHooks'
export * from '../hooks/useDAOHooks'
export * from '../hooks/useBadgeHooks'
export * from '../hooks/useUtilityHooks'
export * from '../hooks/useAppeals'
export * from './escrow/useEscrow'

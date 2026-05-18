/**
 * VFIDE Real-Time Contract Integration Hooks
 * Mind-blowing live data from blockchain with optimistic updates
 * Updated for wagmi v2
 *
 * REFACTORED: This file now re-exports hooks from domain-specific files.
 *
 * Three hooks (useMentorHooks, useDAOHooks, useAppeals) used to be
 * re-exported here but were never actually consumed via this barrel
 * either — the production codebase reaches for direct wagmi reads
 * instead. They were removed along with their files during the dead-
 * code surgery.
 */

'use client'

export * from '../hooks/useVaultHooks'
export * from '../hooks/useProofScoreHooks'
export * from '../hooks/useMerchantHooks'
export * from '../hooks/useSecurityHooks'
export * from '../hooks/useBadgeHooks'
export * from '../hooks/useUtilityHooks'
export * from './escrow/useEscrow'

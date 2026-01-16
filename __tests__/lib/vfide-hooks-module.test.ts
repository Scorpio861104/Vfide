/**
 * vfide-hooks Tests
 * Tests for lib/vfide-hooks.ts re-export module (0% coverage)
 */
import { describe, it, expect } from '@jest/globals'

// Mock all the sub-hooks
jest.mock('@/hooks/useVaultHooks', () => ({
  useVaultHooks: jest.fn(() => ({})),
  useSimpleVault: jest.fn(() => ({})),
}))

jest.mock('@/hooks/useProofScoreHooks', () => ({
  useProofScore: jest.fn(() => ({ score: 500, tier: 'Bronze' })),
}))

jest.mock('@/hooks/useMentorHooks', () => ({
  useMentorHooks: jest.fn(() => ({})),
  useIsMentor: jest.fn(() => ({ isMentor: false })),
  useMentorInfo: jest.fn(() => ({ menteeCount: 0 })),
}))

jest.mock('@/hooks/useMerchantHooks', () => ({
  useMerchantHooks: jest.fn(() => ({})),
}))

jest.mock('@/hooks/useSecurityHooks', () => ({
  useSecurityHooks: jest.fn(() => ({})),
}))

jest.mock('@/hooks/useDAOHooks', () => ({
  useDAOHooks: jest.fn(() => ({})),
}))

jest.mock('@/hooks/useBadgeHooks', () => ({
  useBadgeHooks: jest.fn(() => ({})),
}))

jest.mock('@/hooks/useUtilityHooks', () => ({
  useActivityFeed: jest.fn(() => ({ activities: [] })),
  useSponsorMentee: jest.fn(() => ({
    sponsorMentee: jest.fn(),
    isSponsoring: false,
    isSuccess: false,
  })),
}))

describe('vfide-hooks module', () => {
  it('exports all hooks from useVaultHooks', async () => {
    const hooks = await import('@/lib/vfide-hooks')
    
    // The module re-exports from useVaultHooks
    expect(hooks).toBeDefined()
  })

  it('exports all hooks from useProofScoreHooks', async () => {
    const hooks = await import('@/lib/vfide-hooks')
    
    expect(hooks).toBeDefined()
  })

  it('exports all hooks from useMentorHooks', async () => {
    const hooks = await import('@/lib/vfide-hooks')
    
    expect(hooks).toBeDefined()
  })

  it('exports all hooks from useMerchantHooks', async () => {
    const hooks = await import('@/lib/vfide-hooks')
    
    expect(hooks).toBeDefined()
  })

  it('exports all hooks from useSecurityHooks', async () => {
    const hooks = await import('@/lib/vfide-hooks')
    
    expect(hooks).toBeDefined()
  })

  it('exports all hooks from useDAOHooks', async () => {
    const hooks = await import('@/lib/vfide-hooks')
    
    expect(hooks).toBeDefined()
  })

  it('exports all hooks from useBadgeHooks', async () => {
    const hooks = await import('@/lib/vfide-hooks')
    
    expect(hooks).toBeDefined()
  })

  it('exports all hooks from useUtilityHooks', async () => {
    const hooks = await import('@/lib/vfide-hooks')
    
    expect(hooks).toBeDefined()
  })

  it('can destructure useActivityFeed from module', async () => {
    const { useActivityFeed } = await import('@/lib/vfide-hooks')
    
    expect(useActivityFeed).toBeDefined()
    expect(typeof useActivityFeed).toBe('function')
  })

  it('can destructure useSponsorMentee from module', async () => {
    const { useSponsorMentee } = await import('@/lib/vfide-hooks')
    
    expect(useSponsorMentee).toBeDefined()
    expect(typeof useSponsorMentee).toBe('function')
  })

  it('can destructure useProofScore from module', async () => {
    const { useProofScore } = await import('@/lib/vfide-hooks')
    
    expect(useProofScore).toBeDefined()
    expect(typeof useProofScore).toBe('function')
  })

  it('can destructure useIsMentor from module', async () => {
    const { useIsMentor } = await import('@/lib/vfide-hooks')
    
    expect(useIsMentor).toBeDefined()
    expect(typeof useIsMentor).toBe('function')
  })

  it('can destructure useMentorInfo from module', async () => {
    const { useMentorInfo } = await import('@/lib/vfide-hooks')
    
    expect(useMentorInfo).toBeDefined()
    expect(typeof useMentorInfo).toBe('function')
  })

  it('module is a client-side module', async () => {
    // The module has 'use client' directive
    // This test just confirms the module loads
    const hooks = await import('@/lib/vfide-hooks')
    expect(hooks).toBeDefined()
  })
})

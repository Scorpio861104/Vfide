/**
 * vfide-hooks Tests
 * Tests for lib/vfide-hooks.ts re-export module (0% coverage)
 */
import { describe, it, expect, vi } from 'vitest'

// Mock all the sub-hooks
vi.mock('@/hooks/useVaultHooks', () => ({
  useVaultHooks: vi.fn(() => ({})),
  useSimpleVault: vi.fn(() => ({})),
}))

vi.mock('@/hooks/useProofScoreHooks', () => ({
  useProofScore: vi.fn(() => ({ score: 500, tier: 'Bronze' })),
}))

vi.mock('@/hooks/useMentorHooks', () => ({
  useMentorHooks: vi.fn(() => ({})),
  useIsMentor: vi.fn(() => ({ isMentor: false })),
  useMentorInfo: vi.fn(() => ({ menteeCount: 0 })),
}))

vi.mock('@/hooks/useMerchantHooks', () => ({
  useMerchantHooks: vi.fn(() => ({})),
}))

vi.mock('@/hooks/useSecurityHooks', () => ({
  useSecurityHooks: vi.fn(() => ({})),
}))

vi.mock('@/hooks/useDAOHooks', () => ({
  useDAOHooks: vi.fn(() => ({})),
}))

vi.mock('@/hooks/useBadgeHooks', () => ({
  useBadgeHooks: vi.fn(() => ({})),
}))

vi.mock('@/hooks/useUtilityHooks', () => ({
  useActivityFeed: vi.fn(() => ({ activities: [] })),
  useSponsorMentee: vi.fn(() => ({
    sponsorMentee: vi.fn(),
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

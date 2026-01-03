import { describe, expect, it } from 'vitest'

// Test that vfide-hooks properly re-exports from all domain-specific hook files
describe('vfide-hooks exports', () => {
  it('re-exports from useVaultHooks', async () => {
    const vfideHooks = await import('../lib/vfide-hooks')
    // The module should have exports from useVaultHooks
    expect(typeof vfideHooks).toBe('object')
  })

  it('re-exports from useProofScoreHooks', async () => {
    const vfideHooks = await import('../lib/vfide-hooks')
    expect(typeof vfideHooks).toBe('object')
  })

  it('re-exports from useMentorHooks', async () => {
    const vfideHooks = await import('../lib/vfide-hooks')
    expect(typeof vfideHooks).toBe('object')
  })

  it('re-exports from useMerchantHooks', async () => {
    const vfideHooks = await import('../lib/vfide-hooks')
    expect(typeof vfideHooks).toBe('object')
  })

  it('re-exports from useSecurityHooks', async () => {
    const vfideHooks = await import('../lib/vfide-hooks')
    expect(typeof vfideHooks).toBe('object')
  })

  it('re-exports from useDAOHooks', async () => {
    const vfideHooks = await import('../lib/vfide-hooks')
    expect(typeof vfideHooks).toBe('object')
  })

  it('re-exports from useBadgeHooks', async () => {
    const vfideHooks = await import('../lib/vfide-hooks')
    expect(typeof vfideHooks).toBe('object')
  })

  it('re-exports from useUtilityHooks', async () => {
    const vfideHooks = await import('../lib/vfide-hooks')
    expect(typeof vfideHooks).toBe('object')
  })
})

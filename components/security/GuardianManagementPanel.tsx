'use client'

/**
 * GuardianManagementPanel
 *
 * Pre-cleanup, this file was a 493-line `LegacyGuardianManagementPanel`
 * for the old UserVault implementation (add/remove guardian by writing
 * directly to the vault, M-of-N threshold inputs, guardian veto voting),
 * wrapped by an early-return that delegated to `MyGuardiansTab`
 * whenever `cardBoundMode === true`. Since `isCardBoundVaultMode()` is
 * hard-coded to true, the legacy panel was unreachable.
 *
 * This file is now a thin re-export so the existing call site in
 * `app/vault/settings/page.tsx` doesn't have to change. Long-term, that
 * page should import `MyGuardiansTab` directly.
 */

import { useAccount } from 'wagmi'
import { MyGuardiansTab } from '@/app/guardians/components/MyGuardiansTab'

export function GuardianManagementPanel() {
  const { isConnected } = useAccount()
  return <MyGuardiansTab isConnected={isConnected} />
}

const INVALID_WALLETCONNECT_PROJECT_IDS = new Set([
  '',
  'local_walletconnect_project_id',
  'your_walletconnect_project_id_here',
  'your_walletconnect_project_id',
])

const WALLETCONNECT_PROJECT_ID_ENV_KEYS = [
  'NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID',
  'NEXT_PUBLIC_WAGMI_PROJECT_ID',
] as const

export type WalletConnectProjectConfig = {
  projectId: string
  hasWalletConnect: boolean
}

export function resolveWalletConnectProjectConfig(
  env: NodeJS.ProcessEnv = process.env
): WalletConnectProjectConfig {
  const rawProjectId = WALLETCONNECT_PROJECT_ID_ENV_KEYS
    .map((key) => env[key])
    .find((value): value is string => typeof value === 'string' && value.trim().length > 0)

  const projectId = typeof rawProjectId === 'string' ? rawProjectId.trim() : ''
  const hasWalletConnect = projectId.length > 0 && !INVALID_WALLETCONNECT_PROJECT_IDS.has(projectId)

  return {
    projectId: hasWalletConnect ? projectId : '00000000000000000000000000000000',
    hasWalletConnect,
  }
}

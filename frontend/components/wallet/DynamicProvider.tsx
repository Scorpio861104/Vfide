'use client'

import { DynamicContextProvider } from '@dynamic-labs/sdk-react-core'
import { EthereumWalletConnectors } from '@dynamic-labs/ethereum'

const DYNAMIC_ENV_ID = process.env.NEXT_PUBLIC_DYNAMIC_ENV_ID || ''

interface DynamicProviderProps {
  children: React.ReactNode
}

export function DynamicProvider({ children }: DynamicProviderProps) {
  if (!DYNAMIC_ENV_ID) {
    console.warn('NEXT_PUBLIC_DYNAMIC_ENV_ID not set')
    return <>{children}</>
  }

  return (
    <DynamicContextProvider
      settings={{
        environmentId: DYNAMIC_ENV_ID,
        walletConnectors: [EthereumWalletConnectors],
      }}
    >
      {children}
    </DynamicContextProvider>
  )
}

import { http, createConfig } from 'wagmi'
import { mainnet, polygon, arbitrum, sepolia } from 'wagmi/chains'
import { injected, walletConnect, coinbaseWallet } from 'wagmi/connectors'

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || ''

export const config = createConfig({
  chains: [mainnet, polygon, arbitrum, sepolia],
  connectors: [
    injected(), // MetaMask, Rabby, etc.
    ...(projectId ? [walletConnect({ projectId })] : []),
    coinbaseWallet({ appName: 'VFIDE' }),
  ],
  transports: {
    [mainnet.id]: http(),
    [polygon.id]: http(),
    [arbitrum.id]: http(),
    [sepolia.id]: http(),
  },
})

declare module 'wagmi' {
  interface Register {
    config: typeof config
  }
}

import { http, createConfig } from 'wagmi'
import { mainnet, polygon, arbitrum, sepolia, zkSyncSepoliaTestnet } from 'wagmi/chains'
import { injected, walletConnect, coinbaseWallet } from 'wagmi/connectors'

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || ''

// zkSync Sepolia is first as it's the default testnet
export const config = createConfig({
  chains: [zkSyncSepoliaTestnet, mainnet, polygon, arbitrum, sepolia],
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
    [zkSyncSepoliaTestnet.id]: http('https://sepolia.era.zksync.dev'),
  },
})

declare module 'wagmi' {
  interface Register {
    config: typeof config
  }
}

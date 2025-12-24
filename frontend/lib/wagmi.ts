import { http, createConfig } from 'wagmi'
import { mainnet, polygon, arbitrum, sepolia, zkSyncSepoliaTestnet } from 'wagmi/chains'
import { connectorsForWallets } from '@rainbow-me/rainbowkit'
import {
  metaMaskWallet,
  coinbaseWallet,
  walletConnectWallet,
  rainbowWallet,
  trustWallet,
  injectedWallet,
  phantomWallet,
  ledgerWallet,
  argentWallet,
  braveWallet,
  imTokenWallet,
  okxWallet,
  safeWallet,
  zerionWallet,
  rabbyWallet,
} from '@rainbow-me/rainbowkit/wallets'

// WalletConnect Project ID - required for WalletConnect v2
// Get your free project ID at https://cloud.walletconnect.com
const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || '3a8170812b534d0ff9d794f19a901d64'

const appInfo = {
  appName: 'VFIDE',
  projectId,
}

// Configure wallets with proper grouping
const connectors = connectorsForWallets(
  [
    {
      groupName: 'Popular',
      wallets: [
        metaMaskWallet,
        coinbaseWallet,
        walletConnectWallet,
        rainbowWallet,
        trustWallet,
      ],
    },
    {
      groupName: 'Mobile',
      wallets: [
        phantomWallet,
        argentWallet,
        imTokenWallet,
        okxWallet,
        zerionWallet,
      ],
    },
    {
      groupName: 'Desktop & Hardware',
      wallets: [
        rabbyWallet,
        braveWallet,
        ledgerWallet,
        safeWallet,
        injectedWallet,
      ],
    },
  ],
  appInfo
)

// zkSync Sepolia is first as it's the default testnet
export const config = createConfig({
  chains: [zkSyncSepoliaTestnet, mainnet, polygon, arbitrum, sepolia],
  connectors,
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

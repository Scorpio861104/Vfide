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

// Detect if user is on mobile
const isMobile = typeof window !== 'undefined' && /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)

// Configure wallets - WalletConnect first on mobile to keep users in their browser
// On mobile, tapping MetaMask redirects to MetaMask's in-app browser which is a poor UX
// WalletConnect connects via QR/deep-link and returns user to their native browser
const connectors = connectorsForWallets(
  [
    {
      groupName: 'Recommended',
      wallets: isMobile 
        ? [
            walletConnectWallet,  // First on mobile - stays in native browser
            coinbaseWallet,       // Coinbase also has good mobile UX
            rainbowWallet,
            trustWallet,
            metaMaskWallet,       // Last on mobile - opens in-app browser
          ]
        : [
            metaMaskWallet,       // First on desktop - best desktop experience
            walletConnectWallet,
            coinbaseWallet,
            rainbowWallet,
            rabbyWallet,
          ],
    },
    {
      groupName: 'More Wallets',
      wallets: [
        trustWallet,
        phantomWallet,
        argentWallet,
        okxWallet,
        zerionWallet,
        imTokenWallet,
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

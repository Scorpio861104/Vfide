'use client';

/**
 * Embedded Wallet Adapter
 * 
 * Abstraction layer between VFIDE and the embedded wallet provider.
 * Currently configured for Privy but can swap to Dynamic/Web3Auth.
 * 
 * SETUP:
 *   1. npm install @privy-io/react-auth
 *   2. Get app ID from https://dashboard.privy.io
 *   3. Set NEXT_PUBLIC_PRIVY_APP_ID in .env
 *   4. Uncomment the Privy imports below
 * 
 * The adapter pattern means switching providers requires changing
 * only THIS file — no other code changes needed.
 */

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { type Address } from 'viem';

// ═══════════════════════════════════════════════════════════
//  PROVIDER INTERFACE (provider-agnostic)
// ═══════════════════════════════════════════════════════════

export type AuthMethod = 'email' | 'phone' | 'google' | 'apple' | 'passkey' | 'wallet';

export interface EmbeddedUser {
  address: Address;
  email?: string;
  phone?: string;
  displayName?: string;
  authMethod: AuthMethod;
}

interface EmbeddedWalletContextValue {
  user: EmbeddedUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (method: AuthMethod, credential?: string) => Promise<void>;
  logout: () => Promise<void>;
  sendTransaction: (tx: { to: string; data: string; value?: string }) => Promise<string>;
  signMessage: (message: string) => Promise<string>;
}

const EmbeddedWalletContext = createContext<EmbeddedWalletContextValue | null>(null);

export function useEmbeddedWallet() {
  const ctx = useContext(EmbeddedWalletContext);
  if (!ctx) throw new Error('useEmbeddedWallet must be used within EmbeddedWalletAdapter');
  return ctx;
}

// ═══════════════════════════════════════════════════════════
//  PRIVY ADAPTER
//  Uncomment when @privy-io/react-auth is installed
// ═══════════════════════════════════════════════════════════

/*
import { PrivyProvider, usePrivy, useWallets } from '@privy-io/react-auth';

function PrivyAdapter({ children }: { children: ReactNode }) {
  const { login: privyLogin, logout: privyLogout, authenticated, user } = usePrivy();
  const { wallets } = useWallets();
  
  const embeddedWallet = wallets.find(w => w.walletClientType === 'privy');
  
  const mappedUser: EmbeddedUser | null = authenticated && user ? {
    address: (embeddedWallet?.address || '0x0') as Address,
    email: user.email?.address || undefined,
    phone: user.phone?.number || undefined,
    displayName: user.email?.address?.split('@')[0] || undefined,
    authMethod: user.email ? 'email' : user.phone ? 'phone' : user.google ? 'google' : 'wallet',
  } : null;

  const login = useCallback(async (method: AuthMethod, credential?: string) => {
    await privyLogin();
  }, [privyLogin]);

  const logout = useCallback(async () => {
    await privyLogout();
  }, [privyLogout]);

  const sendTransaction = useCallback(async (tx: { to: string; data: string; value?: string }) => {
    if (!embeddedWallet) throw new Error('No wallet');
    const provider = await embeddedWallet.getEthersProvider();
    const signer = provider.getSigner();
    const result = await signer.sendTransaction({
      to: tx.to,
      data: tx.data,
      value: tx.value || '0',
    });
    return result.hash;
  }, [embeddedWallet]);

  const signMessage = useCallback(async (message: string) => {
    if (!embeddedWallet) throw new Error('No wallet');
    const provider = await embeddedWallet.getEthersProvider();
    const signer = provider.getSigner();
    return signer.signMessage(message);
  }, [embeddedWallet]);

  return (
    <EmbeddedWalletContext.Provider value={{
      user: mappedUser,
      isLoading: false,
      isAuthenticated: authenticated,
      login, logout, sendTransaction, signMessage,
    }}>
      {children}
    </EmbeddedWalletContext.Provider>
  );
}

export function EmbeddedWalletProvider({ children }: { children: ReactNode }) {
  return (
    <PrivyProvider
      appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID || ''}
      config={{
        appearance: { theme: 'dark', accentColor: '#06b6d4' },
        loginMethods: ['email', 'sms', 'google', 'apple', 'passkey'],
        embeddedWallets: {
          createOnLogin: 'users-without-wallets',
          noPromptOnSignature: true,
        },
        defaultChain: { id: 84532, name: 'Base Sepolia', rpcUrl: 'https://sepolia.base.org' },
      }}
    >
      <PrivyAdapter>{children}</PrivyAdapter>
    </PrivyProvider>
  );
}
*/

// ═══════════════════════════════════════════════════════════
//  FALLBACK ADAPTER (works without any SDK installed)
//  Uses wagmi/RainbowKit for traditional wallet connection
//  Replace with Privy adapter above when ready
// ═══════════════════════════════════════════════════════════

export function EmbeddedWalletProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<EmbeddedUser | null>(null);
  const isLoading = false;

  const login = useCallback(async (method: AuthMethod, _credential?: string) => {
    if (method === 'wallet') {
      // Traditional wallet — handled by RainbowKit ConnectButton
      // This path is used when user clicks "Connect wallet" in AccountButton
      return;
    }
    // For email/phone/social — show message directing to install Privy
    throw new Error(
      'Email and social login requires setup. ' +
      'Install @privy-io/react-auth and set NEXT_PUBLIC_PRIVY_APP_ID. ' +
      'See lib/wallet/EmbeddedWalletAdapter.tsx for instructions.'
    );
  }, []);

  const logout = useCallback(async () => {
    setUser(null);
  }, []);

  const sendTransaction = useCallback(async (_tx: { to: string; data: string; value?: string }): Promise<string> => {
    throw new Error('Embedded wallet not configured');
  }, []);

  const signMessage = useCallback(async (_message: string): Promise<string> => {
    throw new Error('Embedded wallet not configured');
  }, []);

  return (
    <EmbeddedWalletContext.Provider value={{
      user,
      isLoading,
      isAuthenticated: !!user,
      login, logout, sendTransaction, signMessage,
    }}>
      {children}
    </EmbeddedWalletContext.Provider>
  );
}

/**
 * Embedded Wallet — No MetaMask. No seed phrases. No browser extensions.
 * 
 * User signs up with email or phone → wallet created behind the scenes →
 * vault auto-created → they're selling in 60 seconds.
 * 
 * Supports multiple embedded wallet providers:
 * - Privy (recommended: best UX, social logins, passkeys)
 * - Web3Auth (widest social login coverage)
 * - Magic (email-first)
 * - Coinbase Smart Wallet (if user already has Coinbase)
 * 
 * Also supports traditional wallets (MetaMask, Rainbow, etc.)
 * for power users who already have one.
 * 
 * The key insight: the user NEVER needs to know they have a wallet.
 * They have a "VFIDE account." The wallet is infrastructure.
 * 
 * Integration:
 *   Replace RainbowKitProvider in Web3Providers with VFIDEWalletProvider.
 *   Replace <ConnectButton /> with <AccountButton />.
 */
'use client';

import { createContext, useContext, useState, useCallback, ReactNode, useMemo } from 'react';

// ── Types ───────────────────────────────────────────────────────────────────

export type AuthMethod = 'email' | 'phone' | 'google' | 'apple' | 'passkey' | 'wallet';

export type AccountStatus =
  | 'disconnected'
  | 'connecting'
  | 'creating-wallet'
  | 'creating-vault'
  | 'connected';

export interface VFIDEAccount {
  address: string;
  displayName: string | null;
  email: string | null;
  phone: string | null;
  authMethod: AuthMethod;
  hasVault: boolean;
  vaultAddress: string | null;
  proofScore: number;
}

interface WalletContextValue {
  account: VFIDEAccount | null;
  status: AccountStatus;
  signIn: (method: AuthMethod, credential?: string) => Promise<void>;
  signOut: () => Promise<void>;
  isEmbedded: boolean; // True if using embedded wallet (not MetaMask etc.)
}

// ── Context ─────────────────────────────────────────────────────────────────

const WalletContext = createContext<WalletContextValue | null>(null);

export function VFIDEWalletProvider({ children }: { children: ReactNode }) {
  const [account, setAccount] = useState<VFIDEAccount | null>(null);
  const [status, setStatus] = useState<AccountStatus>('disconnected');
  const [isEmbedded, setIsEmbedded] = useState(false);

  const signIn = useCallback(async (method: AuthMethod, credential?: string) => {
    setStatus('connecting');

    try {
      if (method === 'wallet') {
        // Traditional wallet flow via injected EIP-1193 provider.
        setIsEmbedded(false);

        const eth = typeof window !== 'undefined' ? (window as Window & { ethereum?: { request: (args: { method: string }) => Promise<unknown> } }).ethereum : undefined;
        if (!eth) {
          throw new Error('No browser wallet detected. Install MetaMask or use embedded sign-in.');
        }

        const accounts = await eth.request({ method: 'eth_requestAccounts' });
        const selected = Array.isArray(accounts) && typeof accounts[0] === 'string' ? accounts[0] : null;
        if (!selected) {
          throw new Error('Wallet connection failed. No account was returned by provider.');
        }

        setStatus('creating-vault');
        const vaultResult = await ensureVaultExists(selected);

        setAccount({
          address: selected,
          displayName: null,
          email: null,
          phone: null,
          authMethod: 'wallet',
          hasVault: true,
          vaultAddress: vaultResult.vaultAddress,
          proofScore: 0,
        });

        setStatus('connected');
        return;
      }

      // Embedded wallet flow
      setIsEmbedded(true);

      // Step 1: Authenticate with provider
      // In production, this calls Privy/Web3Auth/Magic SDK
      // The SDK creates or recovers the embedded wallet automatically
      setStatus('creating-wallet');

      const authResult = await authenticateWithProvider(method, credential);

      // Step 2: Check if vault exists, create if not
      setStatus('creating-vault');
      const vaultResult = await ensureVaultExists(authResult.address);

      // Step 3: Set account
      setAccount({
        address: authResult.address,
        displayName: authResult.displayName,
        email: method === 'email' ? credential ?? null : authResult.email,
        phone: method === 'phone' ? credential ?? null : null,
        authMethod: method,
        hasVault: true,
        vaultAddress: vaultResult.vaultAddress,
        proofScore: 0,
      });

      setStatus('connected');
    } catch (error) {
      setStatus('disconnected');
      throw error;
    }
  }, []);

  const signOut = useCallback(async () => {
    // Clear embedded wallet session
    setAccount(null);
    setStatus('disconnected');
    setIsEmbedded(false);
  }, []);

  const value = useMemo(() => ({ account, status, signIn, signOut, isEmbedded }), [account, status, signIn, signOut, isEmbedded]);

  return (
    <WalletContext.Provider value={value}>
      {children}
    </WalletContext.Provider>
  );
}

export function useVFIDEWallet(): WalletContextValue {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error('useVFIDEWallet must be used within VFIDEWalletProvider');
  return ctx;
}

// ── Provider Integration (swap out per provider) ────────────────────────────

async function authenticateWithProvider(
  method: AuthMethod,
  credential?: string
): Promise<{ address: string; displayName: string | null; email: string | null }> {
  /**
   * PRODUCTION: Replace this with actual SDK call.
   * 
   * Privy example:
   *   import { usePrivy } from '@privy-io/react-auth';
   *   const { login, authenticated, user } = usePrivy();
   *   await login({ loginMethods: [method] });
   *   return { address: user.wallet.address, ... };
   * 
   * Web3Auth example:
   *   const web3auth = new Web3Auth({ clientId: '...', chainConfig: {...} });
   *   await web3auth.connectTo(WALLET_ADAPTERS.OPENLOGIN, { loginProvider: method });
   *   const address = await web3auth.provider.request({ method: 'eth_accounts' });
   *   return { address: address[0], ... };
   */

  // Placeholder — simulates the flow
  await new Promise(r => setTimeout(r, 1500));

  return {
    address: '0x' + Array.from({ length: 40 }, () => Math.floor(Math.random() * 16).toString(16)).join(''),
    displayName: method === 'email' ? credential?.split('@')[0] ?? null : null,
    email: method === 'email' ? credential ?? null : null,
  };
}

async function ensureVaultExists(_address: string): Promise<{ vaultAddress: string }> {
  /**
   * PRODUCTION: Check if vault exists via VaultHub.getVault(address).
   * If not, call VaultHub.createVault() automatically.
   * 
   * This means the user NEVER sees a "Create Vault" button.
   * Vault creation is invisible infrastructure that happens during signup.
   */

  // Placeholder
  await new Promise(r => setTimeout(r, 1000));

  return {
    vaultAddress: '0x' + Array.from({ length: 40 }, () => Math.floor(Math.random() * 16).toString(16)).join(''),
  };
}

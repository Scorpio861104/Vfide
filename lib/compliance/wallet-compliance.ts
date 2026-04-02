/**
 * Wallet Provider — Compliance-Safe Architecture
 * 
 * CRITICAL: This patches the VFIDEWalletProvider from vfide-enhance.zip.
 * 
 * The original implementation had VFIDE collecting email/phone directly.
 * This version ensures all PII stays with the embedded wallet provider.
 * 
 * ═══════════════════════════════════════════════════════════════════════
 * WHAT CHANGED:
 * ═══════════════════════════════════════════════════════════════════════
 * 
 * 1. VFIDE frontend calls Privy/Web3Auth SDK directly
 * 2. The SDK handles auth (email, phone, Google, Apple, passkey)
 * 3. The SDK stores PII under ITS OWN compliance framework
 * 4. VFIDE only receives: wallet address + auth status
 * 5. VFIDE NEVER receives: email, phone, name, ID, payment info
 * 
 * The VFIDEAccount type should NOT include email/phone fields
 * that are stored or logged by VFIDE's own infrastructure.
 * 
 * The wallet provider's dashboard (Privy Dashboard, Web3Auth Console)
 * is where PII lives. VFIDE's backend never sees it.
 * 
 * ═══════════════════════════════════════════════════════════════════════
 * IMPLEMENTATION:
 * ═══════════════════════════════════════════════════════════════════════
 * 
 * Replace the authenticateWithProvider() function in VFIDEWalletProvider.tsx
 * with actual SDK calls. Example with Privy:
 * 
 *   import { PrivyProvider, usePrivy } from '@privy-io/react-auth';
 *   
 *   // In your provider tree (Web3Providers.tsx):
 *   <PrivyProvider appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID}>
 *     {children}
 *   </PrivyProvider>
 *   
 *   // In VFIDEWalletProvider:
 *   const { login, authenticated, user, logout } = usePrivy();
 *   
 *   // Sign in:
 *   await login();
 *   // After login, Privy gives you ONLY the wallet address:
 *   const address = user.wallet?.address;
 *   // PII (email, phone) stays in Privy's infrastructure
 *   
 * The VFIDEAccount should be:
 */

export interface VFIDEAccountCompliant {
  /** Wallet address — the only identifier VFIDE stores */
  address: string;

  /** Display name — user-provided, optional, stored locally (not PII) */
  displayName: string | null;

  /** Auth method used — for UX purposes only (show appropriate icon) */
  authMethod: 'email' | 'phone' | 'google' | 'apple' | 'passkey' | 'wallet';

  /** Whether the wallet was created by an embedded provider */
  isEmbedded: boolean;

  /** Vault state */
  hasVault: boolean;
  vaultAddress: string | null;

  /** ProofScore — from on-chain, not from VFIDE backend */
  proofScore: number;
}

/**
 * Fields VFIDE must NOT store or log:
 * - email
 * - phone number
 * - government ID
 * - date of birth
 * - physical address
 * - bank account / card details
 * - IP address (beyond standard web server logs with reasonable retention)
 * 
 * These fields may exist in the wallet provider's (Privy/Web3Auth) dashboard.
 * That is the provider's compliance responsibility, not VFIDE's.
 */

/**
 * What VFIDE CAN store (on-chain or in its own subgraph/API):
 * - Wallet address (public on-chain data)
 * - ProofScore (public on-chain data)
 * - Transaction history (public on-chain data)
 * - Merchant profile (user-published, voluntary)
 * - Display name (user-chosen, voluntary, not verified)
 * - Product listings (user-published, voluntary)
 */

export const COMPLIANT_DATA_POLICY = {
  // Data VFIDE stores
  stored: [
    'wallet address (public blockchain data)',
    'ProofScore (public on-chain data)',
    'merchant profile (user-published, voluntary)',
    'product listings (user-published, voluntary)',
    'display name (user-chosen, not verified)',
  ],

  // Data VFIDE NEVER stores
  neverStored: [
    'email address',
    'phone number',
    'government ID / passport',
    'date of birth',
    'physical address',
    'bank account or card details',
    'biometric data',
    'social security / national ID numbers',
  ],

  // Where PII lives (if user chose email/phone signup)
  piiCustodian: 'Embedded wallet provider (Privy, Web3Auth, or similar)',
} as const;

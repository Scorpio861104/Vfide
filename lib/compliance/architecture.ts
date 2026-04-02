/**
 * VFIDE Compliance Architecture — Regulatory Boundary Map
 * 
 * VFIDE is a NON-CUSTODIAL PROTOCOL, not an exchange or payment processor.
 * This file documents what VFIDE does and does NOT do, so the frontend
 * never accidentally crosses a regulatory boundary.
 * 
 * ═══════════════════════════════════════════════════════════════════════
 * WHAT VFIDE IS:
 * ═══════════════════════════════════════════════════════════════════════
 * 
 * - A set of smart contracts on a public blockchain
 * - A frontend that lets users interact with those contracts
 * - Non-custodial: users control their own vaults via their own keys
 * - Protocol fee: 0% to merchants. Buyer pays a burn fee on top of price.
 * - The burn fee goes to: burn (35%), Sanctum Fund (20%), DAO pools (45%)
 * - VFIDE (the entity) never holds, controls, or transmits user funds
 * 
 * ═══════════════════════════════════════════════════════════════════════
 * WHAT VFIDE IS NOT:
 * ═══════════════════════════════════════════════════════════════════════
 * 
 * - NOT a money services business (MSB) — no fiat handling
 * - NOT a money transmitter — funds go user→contract→recipient, never through VFIDE
 * - NOT an exchange — no order book, no swaps, no fiat on/off ramp
 * - NOT a custodian — vaults are self-custodial, controlled by user's keys
 * - NOT a payment processor — no merchant accounts, no settlement
 * 
 * ═══════════════════════════════════════════════════════════════════════
 * KYC RESPONSIBILITY:
 * ═══════════════════════════════════════════════════════════════════════
 * 
 * KYC is handled by EXTERNAL SERVICES that users interact with independently:
 * 
 * - Fiat on-ramp (MoonPay, Transak, Ramp, etc.): KYCs users before selling them tokens
 * - Embedded wallet provider (Privy, Web3Auth): Handles auth, stores PII under their compliance
 * - DEX routers (Uniswap, 1inch): Permissionless, protocol-level
 * 
 * VFIDE's frontend:
 * - DOES integrate with these services via their SDKs
 * - DOES NOT collect, store, or process PII itself
 * - DOES NOT perform identity verification
 * - DOES NOT maintain user accounts (wallet provider does)
 * 
 * ═══════════════════════════════════════════════════════════════════════
 * FRONTEND RULES:
 * ═══════════════════════════════════════════════════════════════════════
 * 
 * 1. NEVER collect email/phone/name directly in VFIDE's own database.
 *    → Delegate to embedded wallet provider (Privy, Web3Auth)
 *    → They handle PII storage under their own compliance framework
 * 
 * 2. NEVER route funds through a VFIDE-controlled address.
 *    → All transfers are user→contract or user→user (vault to vault)
 *    → Fee distribution is handled by FeeDistributor contract, not VFIDE backend
 * 
 * 3. NEVER perform token swaps in VFIDE's name.
 *    → If multi-currency checkout is offered, route through DEX (Uniswap router)
 *    → The user's wallet signs the swap tx directly with the DEX
 *    → VFIDE frontend is just a UI layer, not a swap counterparty
 * 
 * 4. NEVER call VFIDE a "payment processor" or "payment platform" in legal copy.
 *    → Use: "payment protocol", "payment infrastructure", "DeFi payment network"
 *    → The distinction matters for MSB classification
 * 
 * 5. NEVER store transaction history on VFIDE's servers.
 *    → Transaction data lives on-chain (public blockchain)
 *    → Frontend reads from chain / subgraph, does not maintain its own ledger
 * 
 * 6. DO display on-chain sanctions screening results.
 *    → If VFIDEToken has address blacklisting (it does during pre-handover),
 *      the contract itself blocks sanctioned addresses
 *    → Post-handover, blacklisting is architecturally impossible by design
 *    → Frontend just reflects what the contract allows
 * 
 * 7. DO include protocol disclaimers on relevant pages.
 *    → See ProtocolDisclaimer component below
 * 
 * 8. DO separate on-ramp from protocol.
 *    → On-ramp widget (MoonPay etc.) opens in its own iframe/window
 *    → The on-ramp provider handles KYC, not VFIDE
 *    → VFIDE frontend just links to the on-ramp, does not embed its KYC flow
 */

export const COMPLIANCE_RULES = {
  // VFIDE never collects PII
  collectsPII: false,

  // VFIDE never custodies funds
  custodiesFunds: false,

  // VFIDE never performs swaps as a counterparty
  isSwapCounterparty: false,

  // VFIDE never handles fiat
  handlesFiat: false,

  // VFIDE never maintains user accounts
  maintainsAccounts: false,

  // Where KYC lives
  kycProvider: 'external (on-ramp provider + wallet provider)',

  // Where PII lives
  piiStorage: 'external (wallet provider, e.g. Privy)',

  // Legal entity classification target
  entityType: 'protocol developer / DAO',
} as const;

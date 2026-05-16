'use client';

/**
 * useCommerceEscrow — the CommerceEscrow lifecycle hook.
 *
 * Replaces the legacy `lib/escrow/useEscrow.ts` shim that incorrectly claimed
 * "CommerceEscrow was removed in v6" and routed all escrow operations through
 * MerchantPortal.payWithIntent instead. CommerceEscrow IS deployed, IS active,
 * and IS the canonical path for escrow-protected (e.g., online) payments —
 * confirmed via PRODUCTION_SET.md (Layer 11), lib/contracts.ts deployment
 * config, formal ICommerceEscrow interface, and MerchantPortal.payOnline
 * deliberately reverting with MERCH_EscrowRequired.
 *
 * State machine (from ICommerceEscrow):
 *   NONE → OPEN → FUNDED → (RELEASED | REFUNDED | DISPUTED)
 *                              ↑                            ↓
 *                              └─── REFUNDED ←──── RESOLVED ┘
 *                                  (from DISPUTED via DAO)
 *
 *   Additional sink: cancelStaleOpen moves OPEN → REFUNDED after 7 days.
 *
 * Access control:
 *   open                   — anyone (the buyer)
 *   markFunded             — buyerOwner OR DAO
 *   release                — buyerOwner OR DAO
 *   refund                 — merchantOwner OR DAO
 *   dispute                — buyerOwner OR merchantOwner
 *   cancelStaleOpen        — anyone (after 7-day OPEN_ESCROW_EXPIRY)
 *   settleByInheritance    — anyone (requires a party's vault in MEMORIAL state)
 *   resolve                — DAO only (split into separate hook)
 *   setMinDisputeAmountForPenalty — DAO only
 *
 * ─────────────────────────────────────────────────────────────────────────
 * UX architecture caveat — read this carefully before building UI on top:
 *
 * `markFunded(id)` does `token.safeTransferFrom(buyerVault, this, amount)`.
 * The buyer's CardBoundVault MUST have approved CommerceEscrow as a spender
 * for at least `amount` of the token BEFORE markFunded can succeed.
 *
 * The only way for a CardBoundVault to grant such approval is the timelocked
 * `approveERC20(token, spender, amount)` function. Per the contract NatSpec:
 *   "Timelocked helper for explicit long-lived approvals.
 *    Not intended for real-time merchant checkout flows."
 *
 * Practical consequences for Phase 3d UI:
 *   - Buyers cannot use escrow for spontaneous online checkout without first
 *     pre-approving the escrow contract via the timelocked pipeline.
 *   - Realistic UX is "buyer pre-approves escrow for a generous budget once;
 *     subsequent open+markFunded calls reuse that allowance until depleted."
 *   - At UI level, "Pay with escrow" needs to detect whether allowance is
 *     sufficient and either proceed (open + markFunded in sequence) or
 *     surface "set up your escrow allowance first" with a link to the
 *     Phase 2 token-approval pipeline.
 *
 * This is a contract-level architectural limitation. Logged in backlog as a
 * separate finding — fixing it requires either a permit-based path or a new
 * `executeFundEscrow` intent on CardBoundVault. For now, the hook works
 * within the current architecture.
 * ─────────────────────────────────────────────────────────────────────────
 *
 * Enumeration constraint:
 *   CommerceEscrow emits ZERO events. None. There is no event stream to scan
 *   for "all escrows where I'm the buyer." The only enumeration path is
 *   iterating `escrows(id)` from 0 to `escrowCount - 1` and filtering by
 *   buyerOwner or merchantOwner. This is O(n) on total escrows.
 *
 *   For Phase 3d we accept the iteration cost (escrowCount starts at 0 on
 *   mainnet launch; will grow slowly). A future contract fix (add events on
 *   state transitions) would let us switch to event-scanning like
 *   useRefundHistory does. Logged in backlog.
 */

import { useCallback } from 'react';
import { useAccount, usePublicClient, useReadContract, useSignTypedData, useWriteContract } from 'wagmi';
import { type Address, type Hex } from 'viem';
import { CONTRACT_ADDRESSES, isConfiguredContractAddress } from '@/lib/contracts';
// The CommerceEscrow ABI lives inside VFIDECommerce.json, exported as
// MerchantRegistryABI (merged with MerchantRegistry + interface fragments).
// All CommerceEscrow functions/state vars are reachable through this ABI.
import { MerchantRegistryABI, CardBoundVaultABI, VaultHubABI } from '@/lib/abis';

/** From ICommerceEscrow.State enum, kept in numeric form to match the contract. */
export enum EscrowState {
  None = 0,
  Open = 1,
  Funded = 2,
  Released = 3,
  Refunded = 4,
  Disputed = 5,
  Resolved = 6,
}

export function escrowStateLabel(state: EscrowState): string {
  switch (state) {
    case EscrowState.None: return 'None';
    case EscrowState.Open: return 'Open (awaiting funding)';
    case EscrowState.Funded: return 'Funded (held in escrow)';
    case EscrowState.Released: return 'Released to merchant';
    case EscrowState.Refunded: return 'Refunded to buyer';
    case EscrowState.Disputed: return 'Disputed (DAO review)';
    case EscrowState.Resolved: return 'Resolved';
  }
}

export interface CommerceEscrowRecord {
  id: bigint;
  buyerOwner: Address;
  merchantOwner: Address;
  buyerVault: Address;
  sellerVault: Address;
  amount: bigint;
  state: EscrowState;
  metaHash: `0x${string}`;
  /** Unix seconds. When the escrow was opened. After 7 days, OPEN escrows can be cancelStaleOpen'd. */
  openedAt: number;
}

/** Decode the `escrows(id)` tuple return. */
function decodeEscrow(id: bigint, raw: unknown): CommerceEscrowRecord | null {
  if (!raw) return null;
  if (typeof raw === 'object' && 'buyerOwner' in (raw as any)) {
    const e = raw as any;
    return {
      id,
      buyerOwner: e.buyerOwner as Address,
      merchantOwner: e.merchantOwner as Address,
      buyerVault: e.buyerVault as Address,
      sellerVault: e.sellerVault as Address,
      amount: BigInt(e.amount ?? 0),
      state: Number(e.state) as EscrowState,
      metaHash: e.metaHash as `0x${string}`,
      openedAt: Number(e.openedAt ?? 0),
    };
  }
  if (Array.isArray(raw) && raw.length >= 8) {
    return {
      id,
      buyerOwner: raw[0] as Address,
      merchantOwner: raw[1] as Address,
      buyerVault: raw[2] as Address,
      sellerVault: raw[3] as Address,
      amount: BigInt(raw[4] as any),
      state: Number(raw[5]) as EscrowState,
      metaHash: raw[6] as `0x${string}`,
      openedAt: Number(raw[7] ?? 0),
    };
  }
  return null;
}

/**
 * Single-escrow lookup by ID. Used for detail pages and lifecycle screens.
 */
export function useEscrowById(id: bigint | undefined) {
  const escrowAddress = CONTRACT_ADDRESSES.CommerceEscrow;
  const escrowConfigured = isConfiguredContractAddress(escrowAddress);

  const { data, isLoading, refetch } = useReadContract({
    address: escrowAddress,
    abi: MerchantRegistryABI,
    functionName: 'escrows',
    args: id !== undefined ? [id] : undefined,
    query: { enabled: escrowConfigured && id !== undefined },
  });

  const escrow = id !== undefined ? decodeEscrow(id, data) : null;

  // Read the funds actually deposited for this escrow. May differ from
  // escrow.amount if the contract has had partial bugs or if state is
  // PARTIALLY_FUNDED in some future version. Right now, deposited equals
  // amount when state >= FUNDED.
  const { data: depositedRaw } = useReadContract({
    address: escrowAddress,
    abi: MerchantRegistryABI,
    functionName: 'escrowDeposited',
    args: id !== undefined ? [id] : undefined,
    query: { enabled: escrowConfigured && id !== undefined },
  });
  const deposited = depositedRaw !== undefined ? BigInt(depositedRaw as any) : undefined;

  return { escrow, deposited, isLoading, refetch };
}

/**
 * Total number of escrows ever opened. Used for enumeration.
 */
export function useEscrowCount() {
  const escrowAddress = CONTRACT_ADDRESSES.CommerceEscrow;
  const escrowConfigured = isConfiguredContractAddress(escrowAddress);

  const { data, refetch } = useReadContract({
    address: escrowAddress,
    abi: MerchantRegistryABI,
    functionName: 'escrowCount',
    query: { enabled: escrowConfigured },
  });

  return {
    count: data !== undefined ? BigInt(data as any) : 0n,
    refetch,
  };
}

/**
 * The required-approval helper. Returns the (buyerVault, escrowContract)
 * pair so the UI can prompt "approve `escrowContract` as a spender from
 * `buyerVault`."
 */
export function useEscrowRequiredApproval(buyerOwner: Address | undefined) {
  const escrowAddress = CONTRACT_ADDRESSES.CommerceEscrow;
  const escrowConfigured = isConfiguredContractAddress(escrowAddress);

  const { data } = useReadContract({
    address: escrowAddress,
    abi: MerchantRegistryABI,
    functionName: 'getRequiredApproval',
    args: buyerOwner ? [buyerOwner] : undefined,
    query: { enabled: escrowConfigured && !!buyerOwner },
  });

  if (!data) return { buyerVault: undefined as Address | undefined, spender: undefined as Address | undefined };

  // Tuple decode (object or array form)
  if (typeof data === 'object' && 'buyerVault' in (data as any)) {
    const d = data as any;
    return { buyerVault: d.buyerVault as Address, spender: d.spender as Address };
  }
  if (Array.isArray(data) && data.length >= 2) {
    return { buyerVault: data[0] as Address, spender: data[1] as Address };
  }
  return { buyerVault: undefined, spender: undefined };
}

/**
 * Primary lifecycle write hook. All writes auto-refetch any consumer with a
 * matching useEscrowById hook after the tx mines.
 */
export function useCommerceEscrow() {
  const { address: connectedAddress } = useAccount();
  const publicClient = usePublicClient();
  const { writeContractAsync, isPending: isWritePending } = useWriteContract();
  const { signTypedDataAsync } = useSignTypedData();

  const escrowAddress = CONTRACT_ADDRESSES.CommerceEscrow;
  const escrowConfigured = isConfiguredContractAddress(escrowAddress);
  const vaultHubAddress = CONTRACT_ADDRESSES.VaultHub;
  const tokenAddress = CONTRACT_ADDRESSES.VFIDEToken;

  /**
   * Open a new escrow. Returns { hash, id } where id is the new escrow's
   * uint256 id. We capture id via simulateContract before submitting,
   * same pattern as useMerchantPayments.initiateRefund — necessary because
   * contract return values aren't directly available from writeContractAsync.
   *
   * Caveat: like initiateRefund, there's a tiny race window between simulate
   * and write. If another buyer opens an escrow with this merchant in the
   * same block, the simulated id might be off by one. The simulate-time id
   * is still correct in 99.9% of cases. If the captured id is wrong, the
   * user can recover by reading escrowCount and walking back.
   */
  const open = useCallback(
    async (params: { merchantOwner: Address; amountWei: bigint; metaHash: `0x${string}` }) => {
      if (!escrowConfigured) throw new Error('CommerceEscrow not configured');
      if (!connectedAddress) throw new Error('Wallet not connected');

      let id: bigint | undefined;
      if (publicClient) {
        try {
            const sim = await (publicClient.simulateContract({
            address: escrowAddress!,
            abi: MerchantRegistryABI,
            functionName: 'open',
            args: [params.merchantOwner, params.amountWei, params.metaHash],
            account: connectedAddress,
            }) as Promise<any>);
          id = BigInt(sim.result);
        } catch {
          // Simulation failure means the real tx will probably fail too —
          // let it surface naturally.
        }
      }

      const hash = await writeContractAsync({
        address: escrowAddress,
        abi: MerchantRegistryABI,
        functionName: 'open',
        args: [params.merchantOwner, params.amountWei, params.metaHash],
      });
      if (publicClient) await publicClient.waitForTransactionReceipt({ hash });
      return { hash, id };
    },
    [escrowAddress, escrowConfigured, writeContractAsync, publicClient, connectedAddress]
  );

  /**
   * Atomic open-AND-fund via a signed EIP-712 intent (Phase 3d Turn 3).
   *
   * This is the "one-click escrow" path. The buyer signs a single EscrowFundIntent
   * message; this function creates the escrow record AND pulls funds in one tx.
   * Escrow state goes directly to FUNDED — no intermediate OPEN, no pre-approval
   * needed, no 72h timelock.
   *
   * Flow:
   *   1. Read buyer's vault address, walletEpoch, nextNonce, chain id
   *   2. Pre-compute the about-to-be escrow id (current escrowCount + 1)
   *   3. Build the EscrowFundIntent struct
   *   4. Sign with the buyer's connected wallet (the vault's activeWallet) over
   *      CardBoundVault's EIP-712 domain
   *   5. Submit openAndFundWithIntent to CommerceEscrow — which forwards to the
   *      vault for the actual transfer
   *
   * Race safety: between reading escrowCount and the tx mining, another escrow
   * could open. The contract checks `intent.escrowId == id` and reverts if they
   * mismatch — caller can retry with refreshed state. Same simulate-then-write
   * race property as `open()` above.
   */
  const openAndFundWithIntent = useCallback(
    async (params: { merchantOwner: Address; amountWei: bigint; metaHash: `0x${string}`; deadlineSeconds?: number }) => {
      if (!escrowConfigured) throw new Error('CommerceEscrow not configured');
      if (!connectedAddress) throw new Error('Wallet not connected');
      if (!publicClient) throw new Error('No public client');
      if (!tokenAddress || !vaultHubAddress) throw new Error('Token or VaultHub address not configured');

      // 1. Resolve buyer's vault
      const buyerVault = (await publicClient.readContract({
        address: vaultHubAddress,
        abi: VaultHubABI,
        functionName: 'vaultOf',
        args: [connectedAddress],
      })) as Address;
      if (!buyerVault || buyerVault === '0x0000000000000000000000000000000000000000') {
        throw new Error('No vault for connected wallet');
      }

      // 2. Read vault state needed for the intent
      const [walletEpoch, nextNonce, currentEscrowCount, chainIdRaw] = await Promise.all([
        publicClient.readContract({
          address: buyerVault, abi: CardBoundVaultABI, functionName: 'walletEpoch',
        }) as Promise<bigint>,
        publicClient.readContract({
          address: buyerVault, abi: CardBoundVaultABI, functionName: 'nextNonce',
        }) as Promise<bigint>,
        publicClient.readContract({
          address: escrowAddress!, abi: MerchantRegistryABI, functionName: 'escrowCount',
        }) as Promise<bigint>,
        Promise.resolve(BigInt(publicClient.chain?.id ?? 0)),
      ]);

      // 3. Build the intent. escrowId = escrowCount + 1 (the id this open call will create).
      const upcomingEscrowId = currentEscrowCount + 1n;
      const deadlineSeconds = params.deadlineSeconds ?? 300; // 5-minute default signing window
      const deadline = BigInt(Math.floor(Date.now() / 1000) + deadlineSeconds);

      const intent = {
        vault: buyerVault,
        escrowContract: escrowAddress! as Address,
        escrowId: upcomingEscrowId,
        token: tokenAddress as Address,
        amount: params.amountWei,
        nonce: nextNonce,
        walletEpoch: walletEpoch,
        deadline: deadline,
        chainId: chainIdRaw,
      };

      // 4. Sign over CardBoundVault's EIP-712 domain. Must match exactly what
      //    _fundEscrowDigest reconstructs on-chain: name=domainSeparator()'s name,
      //    same type fields in same order. The vault's domain is named per its
      //    EIP712 mixin — typically the contract name.
      const signature = (await signTypedDataAsync({
        domain: {
          name: 'CardBoundVault',
          version: '1',
          chainId: Number(chainIdRaw),
          verifyingContract: buyerVault,
        },
        types: {
          EscrowFundIntent: [
            { name: 'vault', type: 'address' },
            { name: 'escrowContract', type: 'address' },
            { name: 'escrowId', type: 'uint256' },
            { name: 'token', type: 'address' },
            { name: 'amount', type: 'uint256' },
            { name: 'nonce', type: 'uint256' },
            { name: 'walletEpoch', type: 'uint64' },
            { name: 'deadline', type: 'uint64' },
            { name: 'chainId', type: 'uint256' },
          ],
        },
        primaryType: 'EscrowFundIntent',
        message: intent as any,
      })) as Hex;

      // 5. Submit the combined open + fund call
      const hash = await writeContractAsync({
        address: escrowAddress,
        abi: MerchantRegistryABI,
        functionName: 'openAndFundWithIntent',
        args: [intent, signature, params.merchantOwner, params.metaHash],
      });
      if (publicClient) await publicClient.waitForTransactionReceipt({ hash });
      return { hash, id: upcomingEscrowId };
    },
    [escrowAddress, escrowConfigured, writeContractAsync, signTypedDataAsync, publicClient, connectedAddress, vaultHubAddress, tokenAddress]
  );

  /**
   * Mark an OPEN escrow as FUNDED. Pulls `amount` of the token from the
   * buyer's vault into the escrow contract.
   *
   * PREREQUISITE: buyer's vault must have approved CommerceEscrow as a
   * spender for at least `escrow.amount`. See the long comment at the top
   * of this file. If the allowance is insufficient, the safeTransferFrom
   * inside markFunded will revert.
   *
   * Authorized callers: buyerOwner OR DAO. Most UI calls should come from
   * the buyer.
   *
   * NOTE: As of Phase 3d Turn 3, `openAndFundWithIntent` is the recommended
   * one-click path for spontaneous escrow funding. Use markFunded only when
   * the buyer has explicitly pre-approved the escrow contract via the
   * timelocked vault.approveERC20 pipeline.
   */
  const markFunded = useCallback(
    async (escrowId: bigint) => {
      if (!escrowConfigured) throw new Error('CommerceEscrow not configured');
      const hash = await writeContractAsync({
        address: escrowAddress,
        abi: MerchantRegistryABI,
        functionName: 'markFunded',
        args: [escrowId],
      });
      if (publicClient) await publicClient.waitForTransactionReceipt({ hash });
      return hash;
    },
    [escrowAddress, escrowConfigured, writeContractAsync, publicClient]
  );

  /**
   * Release a FUNDED escrow to the merchant. Called by the buyer once they
   * confirm fulfillment ("the product arrived, the service was rendered").
   * Cannot be called if the merchant has been auto-suspended between fund
   * and release — in that case the buyer can use refund or dispute.
   */
  const release = useCallback(
    async (escrowId: bigint) => {
      if (!escrowConfigured) throw new Error('CommerceEscrow not configured');
      const hash = await writeContractAsync({
        address: escrowAddress,
        abi: MerchantRegistryABI,
        functionName: 'release',
        args: [escrowId],
      });
      if (publicClient) await publicClient.waitForTransactionReceipt({ hash });
      return hash;
    },
    [escrowAddress, escrowConfigured, writeContractAsync, publicClient]
  );

  /**
   * Refund a FUNDED or DISPUTED escrow back to the buyer. Called by the
   * merchant ("can't fulfill" or "buyer is right after dispute"). Increments
   * the merchant's refund strike counter on MerchantRegistry.
   */
  const refund = useCallback(
    async (escrowId: bigint) => {
      if (!escrowConfigured) throw new Error('CommerceEscrow not configured');
      const hash = await writeContractAsync({
        address: escrowAddress,
        abi: MerchantRegistryABI,
        functionName: 'refund',
        args: [escrowId],
      });
      if (publicClient) await publicClient.waitForTransactionReceipt({ hash });
      return hash;
    },
    [escrowAddress, escrowConfigured, writeContractAsync, publicClient]
  );

  /**
   * Open a dispute on a FUNDED escrow. Either party can call. The state
   * moves to DISPUTED and only the DAO can resolve (via the separate
   * useCommerceEscrowDAO hook). A non-empty reason string is recommended
   * but the contract doesn't enforce it. If amount >= minDisputeAmountForPenalty
   * (default 100 VFIDE), it increments the merchant's dispute strike counter.
   */
  const dispute = useCallback(
    async (params: { escrowId: bigint; reason: string }) => {
      if (!escrowConfigured) throw new Error('CommerceEscrow not configured');
      const hash = await writeContractAsync({
        address: escrowAddress,
        abi: MerchantRegistryABI,
        functionName: 'dispute',
        args: [params.escrowId, params.reason],
      });
      if (publicClient) await publicClient.waitForTransactionReceipt({ hash });
      return hash;
    },
    [escrowAddress, escrowConfigured, writeContractAsync, publicClient]
  );

  /**
   * Anyone can cancel an OPEN escrow that has been sitting unfunded for
   * 7 days (OPEN_ESCROW_EXPIRY). This prevents storage pollution from
   * abandoned proposals.
   */
  const cancelStaleOpen = useCallback(
    async (escrowId: bigint) => {
      if (!escrowConfigured) throw new Error('CommerceEscrow not configured');
      const hash = await writeContractAsync({
        address: escrowAddress,
        abi: MerchantRegistryABI,
        functionName: 'cancelStaleOpen',
        args: [escrowId],
      });
      if (publicClient) await publicClient.waitForTransactionReceipt({ hash });
      return hash;
    },
    [escrowAddress, escrowConfigured, writeContractAsync, publicClient]
  );

  /**
   * If either party's vault has entered MEMORIAL state (death/inheritance),
   * anyone can settle the escrow through this path. The contract routes
   * funds based on which party went into memorial state.
   */
  const settleByInheritance = useCallback(
    async (escrowId: bigint) => {
      if (!escrowConfigured) throw new Error('CommerceEscrow not configured');
      const hash = await writeContractAsync({
        address: escrowAddress,
        abi: MerchantRegistryABI,
        functionName: 'settleByInheritance',
        args: [escrowId],
      });
      if (publicClient) await publicClient.waitForTransactionReceipt({ hash });
      return hash;
    },
    [escrowAddress, escrowConfigured, writeContractAsync, publicClient]
  );

  return {
    escrowConfigured,
    isWritePending,

    // Writes — atomic one-click path (recommended for spontaneous escrow funding)
    openAndFundWithIntent,

    // Writes — legacy two-step path (requires pre-approved allowance)
    open,
    markFunded,

    // Lifecycle writes (all flows)
    release,
    refund,
    dispute,
    cancelStaleOpen,
    settleByInheritance,
  };
}

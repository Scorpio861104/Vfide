/**
 * On-chain attestation for attested onboarding steps — completes Onboarding Finding B.
 *
 * BACKGROUND. `onboardingVerification.ts` classifies each onboarding step as 'self-evident', 'db', or 'attested'.
 * The 'attested' steps (vault deposit, governance vote) have their source of truth ON-CHAIN and were therefore
 * made non-self-assertable: a raw user PATCH was refused, and the only way to set them was an admin/system path.
 * That closed the XP farm but left a real gap — a legitimate user who genuinely deposited or voted had no
 * automatic way to get credit without manual admin intervention.
 *
 * THIS MODULE is that automatic path: given the user's wallet, it READS THE CHAIN (via viem) to confirm the
 * action actually happened, and reports one of three outcomes:
 *
 *   • 'confirmed'   — the chain proves the action happened → the step may be granted.
 *   • 'not-found'   — the chain was read successfully and the action did NOT happen → deny (fail CLOSED; this is
 *                     the farm defense — a user who didn't do it doesn't get the XP).
 *   • 'unavailable' — the chain could not be read (RPC down, address unconfigured, etc.) → do NOT grant, but this
 *                     is RETRYABLE, not a permanent denial. Critically distinct from 'not-found' so a transient
 *                     RPC outage never permanently false-blocks a legitimate user. The caller should surface a
 *                     "try again shortly" message, not "you didn't do this".
 *
 * Design priority (unchanged from Finding B): closing the farm must NOT come at the cost of falsely blocking a
 * legitimate user. Hence the explicit 'unavailable' state — we fail closed on the GRANT, but we never convert an
 * infrastructure failure into a false accusation that the user didn't act.
 *
 * Reads used (all public views/mappings, no signer, no writes):
 *   depositVault → VaultHub.vaultOf(user) gives the user's vault; a non-zero vault holding a positive VFIDE
 *                  balance confirms a real deposit.
 *   voteProposal → DAO.hasVotedAnyProposal(user) is true once the user has cast any governance vote.
 */

import { type Address, createPublicClient, http, getAddress } from 'viem';
import { base, baseSepolia } from 'viem/chains';
import {
  CONTRACT_ADDRESSES,
  isConfiguredContractAddress,
  VaultHubABI,
  DAOABI,
  VFIDETokenABI,
} from '@/lib/contracts';
import { logger } from '@/lib/logger';

/** The subset of onboarding steps whose truth lives on-chain. */
export type AttestedStep = 'depositVault' | 'voteProposal';

export type AttestationOutcome = 'confirmed' | 'not-found' | 'unavailable';

export interface AttestationResult {
  outcome: AttestationOutcome;
  /** True only for 'confirmed' — convenience for callers. */
  granted: boolean;
  /** Human-readable reason for logging / API responses. */
  reason: string;
}

// Mirror the indexer's chain + RPC selection so attestation reads the same network the app indexes.
const CHAIN = process.env.NEXT_PUBLIC_CHAIN_ID === '8453' ? base : baseSepolia;
const RPC_URL =
  process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC ||
  process.env.NEXT_PUBLIC_RPC_URL ||
  'https://sepolia.base.org';

type ReadClient = ReturnType<typeof createPublicClient>;
let _client: ReadClient | undefined;
function getReadClient(): ReadClient {
  const existing = _client;
  if (existing) return existing;
  // Note: no explicit annotation on the constructed client — viem's inferred client type is narrower than the
  // `ReturnType<>` alias, so we let inference flow and cache via the alias.
  const created = createPublicClient({ chain: CHAIN, transport: http(RPC_URL) });
  _client = created as ReadClient;
  return _client;
}

const ZERO: Address = '0x0000000000000000000000000000000000000000';

function unavailable(reason: string): AttestationResult {
  return { outcome: 'unavailable', granted: false, reason };
}
function confirmed(reason: string): AttestationResult {
  return { outcome: 'confirmed', granted: true, reason };
}
function notFound(reason: string): AttestationResult {
  return { outcome: 'not-found', granted: false, reason };
}

/**
 * Confirm a vault deposit: the user must own a vault (VaultHub.vaultOf) AND that vault must hold a positive VFIDE
 * balance. A vault with zero balance is "created but never funded" — not a deposit.
 */
async function attestDeposit(user: Address): Promise<AttestationResult> {
  const vaultHub = CONTRACT_ADDRESSES.VaultHub;
  const vfideToken = CONTRACT_ADDRESSES.VFIDEToken;
  if (!isConfiguredContractAddress(vaultHub) || !isConfiguredContractAddress(vfideToken)) {
    return unavailable('Vault contracts are not configured in this environment.');
  }

  try {
    const client = getReadClient();
    const vault = (await client.readContract({
      address: vaultHub,
      abi: VaultHubABI,
      functionName: 'vaultOf',
      args: [user],
    })) as Address;

    if (!vault || vault.toLowerCase() === ZERO.toLowerCase()) {
      return notFound('No vault found for this account yet.');
    }

    const balance = (await client.readContract({
      address: vfideToken,
      abi: VFIDETokenABI,
      functionName: 'balanceOf',
      args: [vault],
    })) as bigint;

    return balance > 0n
      ? confirmed('Vault holds a positive balance on-chain.')
      : notFound('Vault exists but has no deposited balance yet.');
  } catch (err) {
    // RPC / decoding failure — retryable, NOT a denial of the user's claim.
    logger.warn('attestDeposit read failed', { err: err instanceof Error ? err.message : String(err) });
    return unavailable('Could not read vault state on-chain right now. Please try again shortly.');
  }
}

/** Confirm a governance vote: DAO.hasVotedAnyProposal(user) is true once the user has cast any vote. */
async function attestVote(user: Address): Promise<AttestationResult> {
  const dao = CONTRACT_ADDRESSES.DAO;
  if (!isConfiguredContractAddress(dao)) {
    return unavailable('Governance contract is not configured in this environment.');
  }

  try {
    const client = getReadClient();
    const hasVoted = (await client.readContract({
      address: dao,
      abi: DAOABI,
      functionName: 'hasVotedAnyProposal',
      args: [user],
    })) as boolean;

    return hasVoted
      ? confirmed('Governance vote recorded on-chain.')
      : notFound('No governance vote found for this account yet.');
  } catch (err) {
    logger.warn('attestVote read failed', { err: err instanceof Error ? err.message : String(err) });
    return unavailable('Could not read governance state on-chain right now. Please try again shortly.');
  }
}

/**
 * Attest an on-chain onboarding step for `userAddress`. Returns 'confirmed' only when the chain proves the action;
 * 'not-found' when the chain was read and the action did not happen (fail closed); 'unavailable' when the chain
 * could not be read (retryable — never a false denial).
 */
export async function attestOnchainStep(
  step: AttestedStep,
  userAddress: string,
): Promise<AttestationResult> {
  let user: Address;
  try {
    user = getAddress(userAddress); // checksums + validates
  } catch {
    return notFound('Invalid wallet address.');
  }

  switch (step) {
    case 'depositVault':
      return attestDeposit(user);
    case 'voteProposal':
      return attestVote(user);
    default:
      return unavailable('Unsupported attested step.');
  }
}

/** Type guard: is this step one whose truth is on-chain (and thus attestable here)? */
export function isAttestedStep(step: string): step is AttestedStep {
  return step === 'depositVault' || step === 'voteProposal';
}

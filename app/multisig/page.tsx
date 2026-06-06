import { redirect } from 'next/navigation';

/**
 * /multisig — merged into /guardians.
 *
 * The standalone "user multi-sig vault" page was confusing: VFIDE's live mechanism for protecting
 * funds with multiple parties is the Guardian system on CardBoundVault (M-of-N guardians authorize
 * wallet rotation if a key is compromised) — the same threat a user multi-sig addresses, with a
 * mechanism that already ships. (The protocol-governance multi-sig, AdminMultiSig, lives in the
 * Council tab of /governance — a separate, protocol-level concern.)
 *
 * Redirect to /guardians so there's a single, non-confusing home for "multiple people protect my
 * funds." If a dedicated user multi-sig vault contract is built later, give it its own route then.
 */
export default function MultiSigPage() {
  redirect('/guardians');
}

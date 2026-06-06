/** @jest-environment node */
/**
 * LIVE testnet integration test for the on-chain payment verifier
 * (lib/payments/verifyOnChainPayment.ts).
 *
 * This is SKIPPED by default (it needs a real RPC and, for the full path, a
 * funded test wallet), so it does not run in normal CI. It exists so the
 * verifier can be validated end-to-end against Base Sepolia before the
 * production write path is switched to strict enforcement.
 *
 * ── How to run ────────────────────────────────────────────────────────────
 * Minimal (sanity + fabricated-hash cases; needs only an RPC, no funds):
 *
 *   RUN_TESTNET_E2E=1 \
 *   NEXT_PUBLIC_CHAIN_ID=84532 \
 *   NEXT_PUBLIC_BASE_SEPOLIA_RPC=https://sepolia.base.org \
 *   npx jest verifyOnChainPayment.testnet
 *
 * Full ETH round trip (sends a tiny real tx, then verifies it). Fund the key
 * with a little Base Sepolia ETH first:
 *
 *   ... (as above) \
 *   TEST_PRIVATE_KEY=0xYOUR_FUNDED_TESTNET_KEY \
 *   RECIPIENT=0xOPTIONAL_RECIPIENT   # defaults to self-send \
 *   npx jest verifyOnChainPayment.testnet
 *
 * Known VFIDE (ERC-20) transfer (verified via the Transfer log). Supply a real
 * mined transfer of CONTRACT_ADDRESSES.VFIDEToken on the configured chain:
 *
 *   ... \
 *   KNOWN_VFIDE_TXHASH=0x... KNOWN_VFIDE_FROM=0x... KNOWN_VFIDE_TO=0x... \
 *   KNOWN_VFIDE_AMOUNT=1.0   # optional; omit to skip the amount check \
 *   npx jest verifyOnChainPayment.testnet
 *
 * NOTE: the verifier reads its RPC from the environment at module load, so the
 * env vars above must be set on the command line (process start), not inside
 * the test.
 * ──────────────────────────────────────────────────────────────────────────
 */
import {
  verifyOnChainPayment,
  decidePaymentRecord,
} from '@/lib/payments/verifyOnChainPayment';
import { createPublicClient, createWalletClient, http, parseEther, type Hash } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { base, baseSepolia } from 'viem/chains';

const E2E = process.env.RUN_TESTNET_E2E === '1';
const suite = E2E ? describe : describe.skip;

const CHAIN = process.env.NEXT_PUBLIC_CHAIN_ID === '8453' ? base : baseSepolia;
const RPC =
  process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC ||
  process.env.NEXT_PUBLIC_RPC_URL ||
  'https://sepolia.base.org';

// Well-formed but (virtually certainly) nonexistent hash.
const FAKE_HASH = ('0x' + 'ee'.repeat(32)) as Hash;
const DEAD = '0x000000000000000000000000000000000000dEaD';

suite('verifyOnChainPayment — live testnet', () => {
  const pub = createPublicClient({ chain: CHAIN, transport: http(RPC) });

  it('rejects a malformed tx hash (422, no RPC needed)', async () => {
    const r = await verifyOnChainPayment({
      txHash: '0x123',
      expectedFrom: DEAD,
      expectedTo: DEAD,
      currency: 'ETH',
    });
    expect(r.status).toBe('failed');
    expect(r.reason).toBe('invalid_tx_hash');
    expect(decidePaymentRecord(r).httpStatus).toBe(422);
  });

  it('rejects a malformed address (422, no RPC needed)', async () => {
    const r = await verifyOnChainPayment({
      txHash: FAKE_HASH,
      expectedFrom: 'not-an-address',
      expectedTo: DEAD,
      currency: 'ETH',
    });
    expect(r.status).toBe('failed');
    expect(r.reason).toBe('invalid_address');
    expect(decidePaymentRecord(r).accept).toBe(false);
  });

  it('treats a fabricated ETH hash as failed → tx_not_found → 422', async () => {
    const r = await verifyOnChainPayment({
      txHash: FAKE_HASH,
      expectedFrom: DEAD,
      expectedTo: DEAD,
      currency: 'ETH',
    });
    expect(r.status).toBe('failed');
    expect(r.reason).toBe('tx_not_found');
    expect(decidePaymentRecord(r).accept).toBe(false);
    expect(decidePaymentRecord(r).httpStatus).toBe(422);
  }, 60_000);

  it('treats a fabricated VFIDE hash as failed → tx_not_found → 422', async () => {
    // A missing receipt is ambiguous (unmined vs. nonexistent), so the verifier
    // probes whether the tx exists. A fabricated hash exists nowhere, so it is
    // rejected as tx_not_found — symmetric with the ETH path — rather than being
    // accepted as 'pending'. (A real-but-unmined VFIDE tx still returns 'pending'.)
    const r = await verifyOnChainPayment({
      txHash: FAKE_HASH,
      expectedFrom: DEAD,
      expectedTo: DEAD,
      currency: 'VFIDE',
    });
    expect(r.status).toBe('failed');
    expect(r.reason).toBe('tx_not_found');
    const decision = decidePaymentRecord(r);
    expect(decision.accept).toBe(false);
    expect(decision.httpStatus).toBe(422);
  }, 60_000);

  const hasKey = Boolean(process.env.TEST_PRIVATE_KEY);
  (hasKey ? it : it.skip)(
    'sends a real ETH transfer, verifies it, and rejects amount/recipient mismatch',
    async () => {
      const account = privateKeyToAccount(process.env.TEST_PRIVATE_KEY as `0x${string}`);
      const wallet = createWalletClient({ account, chain: CHAIN, transport: http(RPC) });
      const to = (process.env.RECIPIENT as `0x${string}`) || account.address;
      const amount = '0.0001';

      const hash = await wallet.sendTransaction({ to, value: parseEther(amount) });
      await pub.waitForTransactionReceipt({ hash });

      const good = await verifyOnChainPayment({
        txHash: hash,
        expectedFrom: account.address,
        expectedTo: to,
        currency: 'ETH',
        amount,
      });
      expect(good.status).toBe('verified');
      expect(good.reason).toBe('eth_verified');
      expect(decidePaymentRecord(good).verified).toBe(true);

      const wrongAmount = await verifyOnChainPayment({
        txHash: hash,
        expectedFrom: account.address,
        expectedTo: to,
        currency: 'ETH',
        amount: '999',
      });
      expect(wrongAmount.status).toBe('failed');
      expect(wrongAmount.reason).toBe('amount_mismatch');

      const otherAddr = to.toLowerCase() === account.address.toLowerCase() ? DEAD : account.address;
      const wrongRecipient = await verifyOnChainPayment({
        txHash: hash,
        expectedFrom: account.address,
        expectedTo: otherAddr,
        currency: 'ETH',
        amount,
      });
      expect(wrongRecipient.status).toBe('failed');
      expect(wrongRecipient.reason).toBe('recipient_mismatch');
    },
    180_000,
  );

  const hasKnownVfide = Boolean(
    process.env.KNOWN_VFIDE_TXHASH &&
      process.env.KNOWN_VFIDE_FROM &&
      process.env.KNOWN_VFIDE_TO,
  );
  (hasKnownVfide ? it : it.skip)(
    'verifies a known VFIDE (ERC-20) transfer via the Transfer log',
    async () => {
      const r = await verifyOnChainPayment({
        txHash: process.env.KNOWN_VFIDE_TXHASH as string,
        expectedFrom: process.env.KNOWN_VFIDE_FROM as string,
        expectedTo: process.env.KNOWN_VFIDE_TO as string,
        currency: 'VFIDE',
        amount: process.env.KNOWN_VFIDE_AMOUNT,
      });
      expect(r.status).toBe('verified');
      expect(r.reason).toBe('erc20_verified');
    },
    60_000,
  );
});

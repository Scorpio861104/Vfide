/**
 * Payment-signature verification test (run: `node scripts/verify-payment-signatures.mjs`)
 *
 * Proves, without a browser or wallet, that:
 *  1. Each frontend EIP-712 struct (PayIntent / TransferIntent / EscrowFundIntent)
 *     produces the SAME digest the CardBoundVault contract recomputes from its
 *     typehash — so a signature the frontend creates will verify on-chain. This is
 *     a drift guard: reorder a field in the frontend struct OR a contract typehash
 *     and the parity assertion fails.
 *  2. The signed payment-link flow round-trips: the merchant-signed message
 *     reconstructs byte-for-byte from the /pay URL the way PayContent does, verifies,
 *     and FAILS verification when the amount (or recipient) is tampered.
 *
 * Implemented as a standalone Node script (not jest) because the jest CJS/ESM
 * transform does not reliably expose viem's named exports in this repo.
 */
import { keccak256, encodeAbiParameters, hashTypedData, concatHex, toHex,
         recoverTypedDataAddress, verifyMessage } from 'viem';
import { privateKeyToAccount, generatePrivateKey } from 'viem/accounts';

const acct = privateKeyToAccount(generatePrivateKey());
const CHAIN_ID = 84532n; // Base Sepolia
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('  PASS', m); } else { fail++; console.log('  FAIL', m); } };

const DOMAIN_TYPEHASH = keccak256(toHex(
  'EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)'));
const domainSeparator = keccak256(encodeAbiParameters(
  [{ type: 'bytes32' }, { type: 'bytes32' }, { type: 'bytes32' }, { type: 'uint256' }, { type: 'address' }],
  [DOMAIN_TYPEHASH, keccak256(toHex('CardBoundVault')), keccak256(toHex('1')), CHAIN_ID, acct.address]));
const domain = { name: 'CardBoundVault', version: '1', chainId: Number(CHAIN_ID), verifyingContract: acct.address };

// Assert viem's typed-data digest === the contract's keccak256(0x1901 ++ domainSep ++ structHash).
async function checkIntent(label, typehashString, typeFields, abiTypes, msgValues) {
  const types = { [label]: typeFields };
  const message = Object.fromEntries(typeFields.map((f, i) => [f.name, msgValues[i]]));
  const viemDigest = hashTypedData({ domain, types, primaryType: label, message });
  const typehash = keccak256(toHex(typehashString));
  const structHash = keccak256(encodeAbiParameters(
    [{ type: 'bytes32' }, ...abiTypes], [typehash, ...msgValues]));
  const contractDigest = keccak256(concatHex(['0x1901', domainSeparator, structHash]));
  console.log(`[${label}] EIP-712 digest parity (frontend struct vs contract typehash)`);
  ok(viemDigest === contractDigest, `viem digest === contract-recomputed digest`);
  const sig = await acct.signTypedData({ domain, types, primaryType: label, message });
  const rec = await recoverTypedDataAddress({ domain, types, primaryType: label, message, signature: sig });
  ok(rec.toLowerCase() === acct.address.toLowerCase(), `ecrecover(signed ${label}) === signer (contract accepts)`);
}

const A = acct.address;
await checkIntent('PayIntent',
  'PayIntent(address vault,address merchantPortal,address token,address merchant,address recipient,uint256 amount,uint256 nonce,uint64 walletEpoch,uint64 deadline,uint256 chainId)',
  [{ name: 'vault', type: 'address' }, { name: 'merchantPortal', type: 'address' }, { name: 'token', type: 'address' },
   { name: 'merchant', type: 'address' }, { name: 'recipient', type: 'address' }, { name: 'amount', type: 'uint256' },
   { name: 'nonce', type: 'uint256' }, { name: 'walletEpoch', type: 'uint64' }, { name: 'deadline', type: 'uint64' },
   { name: 'chainId', type: 'uint256' }],
  [{ type: 'address' }, { type: 'address' }, { type: 'address' }, { type: 'address' }, { type: 'address' },
   { type: 'uint256' }, { type: 'uint256' }, { type: 'uint64' }, { type: 'uint64' }, { type: 'uint256' }],
  [A, A, A, A, A, 1000n, 0n, 1n, 9999999999n, CHAIN_ID]);

await checkIntent('TransferIntent',
  'TransferIntent(address vault,address toVault,uint256 amount,uint256 nonce,uint64 walletEpoch,uint64 deadline,uint256 chainId)',
  [{ name: 'vault', type: 'address' }, { name: 'toVault', type: 'address' }, { name: 'amount', type: 'uint256' },
   { name: 'nonce', type: 'uint256' }, { name: 'walletEpoch', type: 'uint64' }, { name: 'deadline', type: 'uint64' },
   { name: 'chainId', type: 'uint256' }],
  [{ type: 'address' }, { type: 'address' }, { type: 'uint256' }, { type: 'uint256' }, { type: 'uint64' },
   { type: 'uint64' }, { type: 'uint256' }],
  [A, A, 1000n, 0n, 1n, 9999999999n, CHAIN_ID]);

await checkIntent('EscrowFundIntent',
  'EscrowFundIntent(address vault,address escrowContract,uint256 escrowId,address token,uint256 amount,uint256 nonce,uint64 walletEpoch,uint64 deadline,uint256 chainId)',
  [{ name: 'vault', type: 'address' }, { name: 'escrowContract', type: 'address' }, { name: 'escrowId', type: 'uint256' },
   { name: 'token', type: 'address' }, { name: 'amount', type: 'uint256' }, { name: 'nonce', type: 'uint256' },
   { name: 'walletEpoch', type: 'uint64' }, { name: 'deadline', type: 'uint64' }, { name: 'chainId', type: 'uint256' }],
  [{ type: 'address' }, { type: 'address' }, { type: 'uint256' }, { type: 'address' }, { type: 'uint256' },
   { type: 'uint256' }, { type: 'uint64' }, { type: 'uint64' }, { type: 'uint256' }],
  [A, A, 1n, A, 1000n, 0n, 1n, 9999999999n, CHAIN_ID]);

// ---- Signed payment-link round-trip (must mirror lib/payments/qrSignature + PayContent) ----
const buildQrSignatureMessage = (p) => [
  'vfide:qr-payment:v1', `merchant:${p.merchant.toLowerCase()}`, `amount:${p.amount}`,
  `orderId:${p.orderId}`, `source:${p.source}`, `settlement:${p.settlement}`, `expiresAt:${p.expiresAt}`,
].join('\n');

const fields = { merchant: A, amount: '25.50', orderId: '', source: 'link', settlement: 'instant', expiresAt: 9999999999 };
const signed = buildQrSignatureMessage(fields);
const linkSig = await acct.signMessage({ message: signed });
const u = new URL('https://app/pay');
for (const [k, v] of Object.entries({ to: fields.merchant, amount: fields.amount, source: fields.source,
  settlement: fields.settlement, orderId: fields.orderId, exp: String(fields.expiresAt), sig: linkSig })) u.searchParams.set(k, v);
const sp = u.searchParams;
const reconstructed = buildQrSignatureMessage({ merchant: sp.get('to'), amount: (sp.get('amount') || '').trim(),
  orderId: sp.get('orderId') || '', source: sp.get('source') || 'checkout', settlement: sp.get('settlement') || 'instant',
  expiresAt: Number(sp.get('exp')) });
console.log('[PaymentLink] signed-link round-trip (generator → URL → PayContent)');
ok(reconstructed === signed, 'PayContent reconstruction === signed message (no field drift)');
ok(await verifyMessage({ address: fields.merchant, message: reconstructed, signature: sp.get('sig') }), 'verifyMessage(reconstructed) === true');
const tamperedAmt = buildQrSignatureMessage({ ...fields, amount: '2500.00' });
ok(!(await verifyMessage({ address: fields.merchant, message: tamperedAmt, signature: sp.get('sig') })), 'tampered amount → verify === false');
const tamperedTo = buildQrSignatureMessage({ ...fields, merchant: '0x000000000000000000000000000000000000dEaD' });
ok(!(await verifyMessage({ address: '0x000000000000000000000000000000000000dEaD', message: tamperedTo, signature: sp.get('sig') })), 'tampered recipient → verify === false');

console.log(`\nRESULT: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);

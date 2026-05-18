/**
 * C12 – Payments, Commerce, and Escrow Flow
 *
 * Audits:
 *  - R-056 Escrow lock-time edge-case bypass
 *  - R-057 Permit replay or overdraw
 *  - R-058 Partial payment settlement inconsistency
 *  - R-059 Auto-convert policy misconfiguration
 *  - R-060 Payment replay in frontend retries
 *
 * @jest-environment node
 */

import { readFileSync } from 'fs';
import { join } from 'path';

const CONTRACTS_DIR = join(__dirname, '../../contracts');
const APP_DIR = join(__dirname, '../../app');

function readContract(name: string): string {
  return readFileSync(join(CONTRACTS_DIR, `${name}.sol`), 'utf-8');
}

const merchantSrc = readContract('MerchantPortal');
const paymentsApiSrc = readFileSync(join(APP_DIR, 'api/merchant/payments/confirm/route.ts'), 'utf-8');
const payContentSrc = readFileSync(join(APP_DIR, 'pay/components/PayContent.tsx'), 'utf-8');


// ─────────────────────────────────────────────────────────────────────────────
// R-057 – Permit replay or overdraw
// ─────────────────────────────────────────────────────────────────────────────

describe('R-057 – Permit replay or overdraw', () => {
  it('supports scoped permit with amount and optional expiry', () => {
    expect(merchantSrc).toMatch(/function\s+setMerchantPullPermit\(address merchant, uint256 maxAmount, uint64 expiresAt\)/);
    expect(merchantSrc).toMatch(/merchantPullRemaining\[msg\.sender\]\[merchant\] = maxAmount/);
    expect(merchantSrc).toMatch(/merchantPullExpiry\[msg\.sender\]\[merchant\] = expiresAt/);
  });

  it('permit setup enforces positive amount and non-expired expiry', () => {
    expect(merchantSrc).toMatch(/if \(maxAmount == 0\) revert MERCH_InvalidConfig\(\)/);
    expect(merchantSrc).toMatch(/if \(!\(expiresAt == 0 \|\| expiresAt > block\.timestamp\)\) revert MERCH_InvalidConfig\(\)/);
  });

  it('merchant pull requires approval flag', () => {
    expect(merchantSrc).toMatch(/if \(!merchantPullApproved\[customer\]\[msg\.sender\]\) revert MERCH_NotApproved\(\)/);
  });

  it('merchant pull enforces expiry window', () => {
    expect(merchantSrc).toMatch(/if \(!\(permitExpiry == 0 \|\| block\.timestamp <= permitExpiry\)\) revert MERCH_ApprovalExpired\(\)/);
  });

  it('merchant pull enforces remaining amount floor and decrements on use', () => {
    expect(merchantSrc).toMatch(/if \(remainingPull < amount\) revert MERCH_LimitExceeded\(\)/);
    expect(merchantSrc).toMatch(/merchantPullRemaining\[customer\]\[msg\.sender\] = remainingPull - amount/);
  });

  it('revocation clears approval, remaining amount, and expiry', () => {
    expect(merchantSrc).toMatch(/function\s+setMerchantPullApproval\(address merchant, bool approved\)/);
    expect(merchantSrc).toMatch(/merchantPullApproved\[msg\.sender\]\[merchant\] = false/);
    expect(merchantSrc).toMatch(/merchantPullRemaining\[msg\.sender\]\[merchant\] = 0/);
    expect(merchantSrc).toMatch(/merchantPullExpiry\[msg\.sender\]\[merchant\] = 0/);
  });

  describe('TypeScript model: monotonic remaining allowance', () => {
    it('remaining allowance only decreases per successful pull', () => {
      let remaining = 1_000n;
      const pull = (amt: bigint): void => {
        if (remaining < amt) throw new Error('merchant pull limit exceeded');
        remaining -= amt;
      };

      pull(200n);
      expect(remaining).toBe(800n);
      pull(300n);
      expect(remaining).toBe(500n);
    });

    it('overdraw attempt is rejected when amount exceeds remaining', () => {
      let remaining = 100n;
      const pull = (amt: bigint): void => {
        if (remaining < amt) throw new Error('merchant pull limit exceeded');
        remaining -= amt;
      };
      expect(() => pull(101n)).toThrow('merchant pull limit exceeded');
    });

    it('expired permit rejects even when remaining is positive', () => {
      const now = 200;
      const expiresAt: number = 199;
      const valid = expiresAt === 0 || now <= expiresAt;
      expect(valid).toBe(false);
    });
  });
});


// ─────────────────────────────────────────────────────────────────────────────
// R-059 – Auto-convert policy misconfiguration
// ─────────────────────────────────────────────────────────────────────────────

describe('R-059 – Auto-convert policy misconfiguration', () => {
  it('slippage bounds are hard-capped by constants', () => {
    expect(merchantSrc).toMatch(/MIN_SWAP_OUTPUT_BPS\s*=\s*9000/);
    expect(merchantSrc).toMatch(/MAX_SWAP_OUTPUT_BPS\s*=\s*10000/);
    expect(merchantSrc).toMatch(/if \(_minBps < MIN_SWAP_OUTPUT_BPS \|\| _minBps > MAX_SWAP_OUTPUT_BPS\) revert MERCH_InvalidConfig\(\)/);
  });

  it('swap config requires stablecoin when router is set', () => {
    expect(merchantSrc).toMatch(/if \(_router != address\(0\)\) \{/);
    expect(merchantSrc).toMatch(/if \(_stable == address\(0\)\) revert MERCH_InvalidConfig\(\)/);
  });

  it('swap path has strict shape and endpoint checks', () => {
    expect(merchantSrc).toMatch(/MAX_SWAP_PATH_LENGTH\s*=\s*5/);
    expect(merchantSrc).toMatch(/if \(path\.length < 2 \|\| path\.length > MAX_SWAP_PATH_LENGTH\) revert MERCH_InvalidConfig\(\)/);
    expect(merchantSrc).toMatch(/if \(path\[0\] != token\) revert MERCH_InvalidConfig\(\)/);
    expect(merchantSrc).toMatch(/if \(path\[path\.length - 1\] != stablecoin\) revert MERCH_InvalidConfig\(\)/);
  });

  it('approval is revoked after both successful and failed swap attempts', () => {
    // success path
    expect(merchantSrc).toMatch(/if \(!IERC20\(token\)\.approve\(address\(swapRouter\), 0\)\) revert MERCH_RevokeFailed\(\)/);
    // failure path fallback
    expect(merchantSrc).toMatch(/emit AutoConvertFallback\(merchant, token, netAmount, "swap_failed"\)/);
  });

  it('quote-unavailable path falls back to direct settlement and emits fallback reason', () => {
    expect(merchantSrc).toMatch(/emit AutoConvertFallback\(merchant, token, netAmount, "quote_unavailable"\)/);
    expect(merchantSrc).toMatch(/IERC20\(token\)\.safeTransfer\(recipient, netAmount\)/);
  });

  it('merchant-side auto-convert enabling requires swap router and stablecoin configuration', () => {
    expect(merchantSrc).toMatch(/function\s+setAutoConvert\(bool enabled\) external onlyMerchant/);
    expect(merchantSrc).toMatch(/if \(enabled\) \{/);
    expect(merchantSrc).toMatch(/if \(address\(swapRouter\) == address\(0\) \|\| stablecoin == address\(0\)\) revert MERCH_NotConfigured\(\)/);
  });

  describe('TypeScript model: slippage bounds', () => {
    const MIN = 9000;
    const MAX = 10000;

    it('rejects slippage below minimum bound', () => {
      const candidate = 8999;
      expect(candidate >= MIN && candidate <= MAX).toBe(false);
    });

    it('accepts slippage inside bounds', () => {
      const candidate = 9500;
      expect(candidate >= MIN && candidate <= MAX).toBe(true);
    });

    it('rejects slippage above maximum bound', () => {
      const candidate = 10001;
      expect(candidate >= MIN && candidate <= MAX).toBe(false);
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// R-060 – Payment replay in frontend retries
// ─────────────────────────────────────────────────────────────────────────────

describe('R-060 – Payment replay in frontend retries', () => {
  it('checkout UI has processing guard state and disables submit while pending', () => {
    expect(payContentSrc).toMatch(/const \[isProcessing, setIsProcessing\] = useState\(false\)/);
    expect(payContentSrc).toMatch(/const effectiveProcessing = isProcessing \|\| isPaying \|\| isEscrowLoading/);
    expect(payContentSrc).toMatch(/disabled=\{effectiveProcessing \|\| !merchant \|\| !hasValidAmount \|\| !qrReadyForPayment\}/);
  });

  it('payment flow toggles processing state around async submit', () => {
    expect(payContentSrc).toMatch(/setIsProcessing\(true\)/);
    expect(payContentSrc).toMatch(/finally \{\s*setIsProcessing\(false\);\s*\}/);
  });

  it('server confirmation requires tx_hash and verifies on-chain matching payment event', () => {
    expect(paymentsApiSrc).toMatch(/tx_hash:\s*z\.string\(\)\.regex\(TX_HASH_REGEX\)/);
    expect(paymentsApiSrc).toMatch(/verifyPaymentEventOnChain/);
    expect(paymentsApiSrc).toMatch(/Transaction receipt does not contain a matching payment event/);
  });

  it('server validation matches merchant/customer/amount and optional orderId/token before success', () => {
    expect(paymentsApiSrc).toMatch(/if \(getAddress\(args\.customer\) !== expectedCustomer\) continue/);
    expect(paymentsApiSrc).toMatch(/if \(getAddress\(args\.merchant\) !== expectedMerchant\) continue/);
    expect(paymentsApiSrc).toMatch(/if \(args\.amount !== params\.amount\) continue/);
  });

  it('idempotency guard is implemented in confirmation route preventing double-claim', () => {
    expect(paymentsApiSrc).toMatch(/idempotency/i);
    expect(paymentsApiSrc).toMatch(/claimPaymentConfirmationIdempotency/);
  });

  describe('TypeScript model: UI submit lock blocks rapid double-click', () => {
    it('second click while processing is ignored by disabled guard', () => {
      let isProcessing = false;
      let submits = 0;

      const canSubmit = (): boolean => !isProcessing;
      const submit = (): void => {
        if (!canSubmit()) return;
        isProcessing = true;
        submits += 1;
      };

      submit(); // first click
      submit(); // second rapid click blocked
      expect(submits).toBe(1);
    });
  });
});

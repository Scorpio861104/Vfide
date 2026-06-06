import {
  computeEffectiveSettlement,
  validatePayLinkAmount,
  verifyPayLinkRecipient,
} from '../payGating';

describe('computeEffectiveSettlement', () => {
  it('keeps instant when the payment is verified', () => {
    expect(computeEffectiveSettlement('instant', true)).toBe('instant');
  });
  it('downgrades instant to escrow when NOT verified (closes the bypass)', () => {
    expect(computeEffectiveSettlement('instant', false)).toBe('escrow');
  });
  it('leaves escrow as escrow regardless of verification', () => {
    expect(computeEffectiveSettlement('escrow', true)).toBe('escrow');
    expect(computeEffectiveSettlement('escrow', false)).toBe('escrow');
  });
});

describe('validatePayLinkAmount', () => {
  it('fixed-amount link: requires exact match', () => {
    expect(validatePayLinkAmount('25.50', { amount: '25.50' })).toBe(true);
    expect(validatePayLinkAmount('25.5', { amount: 25.5 })).toBe(true);
    expect(validatePayLinkAmount('100', { amount: '25.50' })).toBe(false);
  });
  it('open-amount link: enforces [min, max]', () => {
    expect(validatePayLinkAmount('50', { min_amount: '10', max_amount: '100' })).toBe(true);
    expect(validatePayLinkAmount('10', { min_amount: '10', max_amount: '100' })).toBe(true);
    expect(validatePayLinkAmount('100', { min_amount: '10', max_amount: '100' })).toBe(true);
    expect(validatePayLinkAmount('5', { min_amount: '10', max_amount: '100' })).toBe(false);
    expect(validatePayLinkAmount('150', { min_amount: '10', max_amount: '100' })).toBe(false);
  });
  it('open-amount with only a min or only a max', () => {
    expect(validatePayLinkAmount('1000', { min_amount: '10' })).toBe(true);
    expect(validatePayLinkAmount('5', { min_amount: '10' })).toBe(false);
    expect(validatePayLinkAmount('5', { max_amount: '100' })).toBe(true);
    expect(validatePayLinkAmount('500', { max_amount: '100' })).toBe(false);
  });
  it('rejects non-positive / non-numeric amounts', () => {
    expect(validatePayLinkAmount('0', { min_amount: '0', max_amount: '100' })).toBe(false);
    expect(validatePayLinkAmount('-5', { amount: '-5' })).toBe(false);
    expect(validatePayLinkAmount('abc', {})).toBe(false);
    expect(validatePayLinkAmount('', {})).toBe(false);
  });
  it('no constraints at all: any positive amount is allowed (open link)', () => {
    expect(validatePayLinkAmount('42', {})).toBe(true);
  });
});

describe('verifyPayLinkRecipient', () => {
  const A = '0x1234567890123456789012345678901234567890';
  it('matches case-insensitively', () => {
    expect(verifyPayLinkRecipient(A, A.toUpperCase())).toBe(true);
    expect(verifyPayLinkRecipient(A.toLowerCase(), A)).toBe(true);
  });
  it('rejects a mismatched (tampered) recipient', () => {
    expect(verifyPayLinkRecipient('0x000000000000000000000000000000000000dEaD', A)).toBe(false);
  });
  it('rejects empty/whitespace addresses', () => {
    expect(verifyPayLinkRecipient('', A)).toBe(false);
    expect(verifyPayLinkRecipient(A, '')).toBe(false);
    expect(verifyPayLinkRecipient('   ', A)).toBe(false);
  });
});

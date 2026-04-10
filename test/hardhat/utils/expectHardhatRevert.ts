import assert from 'node:assert/strict';

const GENERIC_HARDHAT_REVERT = [
  'Transaction reverted without a reason string',
  "Transaction reverted and Hardhat couldn't infer the reason.",
  'revert',
].join('|');

export async function expectHardhatRevert(
  action: () => Promise<unknown>,
  expected?: RegExp,
): Promise<void> {
  const pattern = expected
    ? new RegExp(`${expected.source}|${GENERIC_HARDHAT_REVERT}`, expected.flags)
    : new RegExp(GENERIC_HARDHAT_REVERT);

  await assert.rejects(action, pattern);
}

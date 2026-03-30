# Token Operations and Liquidity Plan

This document addresses treasury concentration, vesting, fee defaults, and liquidity planning for VFIDE.

## Treasury Concentration Mitigation

Issue: A large portion of supply is initially controlled by the treasury wallet.

Operational controls:

1. Treasury custody must move from a single EOA to AdminMultiSig before mainnet launch.
2. Treasury transfers above an internal threshold require dual approval evidence.
3. Treasury balances should be split by purpose:
   - operating runway
   - liquidity provisioning
   - grants/ecosystem support
   - long-term reserve

## Dev Vesting Controls

Issue: Developer vesting optics can create trust risk.

Controls:

1. Keep vesting on-chain and publicly verifiable.
2. Publish beneficiary, cliff, start, and release schedule before launch.
3. Do not accelerate or modify vesting without explicit governance approval and public notice.

## Merchant Fee Policy

Issue: Merchant fees default to 0%, which is not sustainable.

Policy:

1. Testnet may use 0% fees for onboarding.
2. Mainnet should set a non-zero default fee before public launch.
3. Any fee holiday must have an explicit end condition.

## Liquidity Provision Plan

Issue: No defined liquidity plan weakens launch readiness.

Plan:

1. Seed an initial VFIDE/WETH pool on the target network.
2. Allocate a documented treasury tranche for liquidity only.
3. Define max slippage and minimum depth targets before enabling public trading references.
4. Do not market token utility around price appreciation.

## Burn and Distribution Operations

1. Burn mechanics should be treated as supply policy, not yield policy.
2. DAO-triggered fee distribution must have a fallback operator runbook if governance is not yet live.
3. Any treasury-funded reward distribution should be framed as ecosystem usage support, not investment return.

## Pre-Launch Exit Criteria

Before mainnet launch:

- treasury moved to multisig
- vesting schedule published
- non-zero merchant fee configured for production
- initial liquidity plan approved and funded
- public docs avoid appreciation language

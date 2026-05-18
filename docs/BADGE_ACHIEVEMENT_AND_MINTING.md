# Badge Achievement And Minting Guide

This guide answers two questions:
1. How badges are achieved.
2. How to mint badge NFTs for badges already earned.

## Badge Award Modes

1. Auto-checked badges: BadgeManager evaluates tracked stats and auto-awards when thresholds are met.
2. Operator/DAO badges: require an authorized operator/DAO action (evidence-based review) via BadgeManager/Seer flows.
3. DAO-recorded auto-awards: some badges are awarded when DAO records a specific contribution event.

## Auto-Checked Badges (on-chain rule based)

1. ACTIVE_TRADER: 50+ commerce transactions.
2. GOVERNANCE_VOTER: 10+ governance votes.
3. POWER_USER: at least 3 activity types among commerce, governance, endorsements, referrals.
4. DAILY_CHAMPION: 30 consecutive active days.
5. VERIFIED_MERCHANT: 100+ successful trades and score >= 700.
6. ELITE_ACHIEVER: score >= 9000.
7. COMMUNITY_BUILDER: 10 referred users qualified.
8. FRAUD_HUNTER: 3+ confirmed fraud reports.
9. EDUCATOR: 5+ educational contributions.
10. MENTOR: 5 qualified mentored/referred users.

## DAO-Recorded Auto-Award Badges

1. CONTRIBUTOR: awarded when DAO records a verified contribution.
2. TRANSLATOR: awarded when DAO records a verified translation.

## Operator/DAO Awarded Badges (policy/evidence based)

1. PIONEER
2. FOUNDING_MEMBER
3. EARLY_TESTER
4. TRUSTED_ENDORSER
5. PEACEMAKER
6. ELITE_MERCHANT
7. INSTANT_SETTLEMENT
8. ZERO_DISPUTE
9. REDEMPTION
10. GUARDIAN
11. CENTURY_ENDORSER
12. WHALE_SLAYER
13. DIVERSIFICATION_MASTER
14. BUG_BOUNTY
15. CLEAN_RECORD (currently not included in automatic eligibility loop)
16. HEADHUNTER

## Minting Your Badge NFTs

Use the new script to inspect and mint what you already earned.

### 1) Status only (no transactions)

```bash
npm run badges:status -- --rpc-url <RPC_URL> --address <YOUR_WALLET>
```

Or with environment variables:

```bash
export RPC_URL=<RPC_URL>
export NEXT_PUBLIC_SEER_ADDRESS=<SEER_ADDRESS>
export NEXT_PUBLIC_BADGE_NFT_ADDRESS=<BADGE_NFT_ADDRESS>
npm run badges:status -- --address <YOUR_WALLET>
```

### 2) Mint all badges currently available to your wallet

```bash
export RPC_URL=<RPC_URL>
export PRIVATE_KEY=<YOUR_PRIVATE_KEY>
export NEXT_PUBLIC_SEER_ADDRESS=<SEER_ADDRESS>
export NEXT_PUBLIC_BADGE_NFT_ADDRESS=<BADGE_NFT_ADDRESS>
npm run badges:mint-all
```

### 3) Dry-run mint plan (no transactions sent)

```bash
export RPC_URL=<RPC_URL>
export NEXT_PUBLIC_SEER_ADDRESS=<SEER_ADDRESS>
export NEXT_PUBLIC_BADGE_NFT_ADDRESS=<BADGE_NFT_ADDRESS>
npm run badges:mint-all:dry-run -- --address <YOUR_WALLET>
```

You can also run direct dry-run without the npm alias:

```bash
npm run badges:status -- --dry-run --rpc-url <RPC_URL> --address <YOUR_WALLET> --seer <SEER_ADDRESS> --badge-nft <BADGE_NFT_ADDRESS>
```

The script will:
1. Check each badge on Seer (`hasBadge`, `badgeExpiry`).
2. Check mintability on BadgeNFT (`canMintBadge`, `userBadgeToken`).
3. Mint each currently mintable badge if `--mint-all` is set.
4. Print encoded transaction call data if `--dry-run` is set.

## Important Notes

1. Badge NFT minting does not create eligibility; it only tokenizes badges you already earned.
2. For operator/DAO badges, you need governance/operator approval workflow and evidence.
3. Soulbound behavior applies: minted badge NFTs are non-transferable.

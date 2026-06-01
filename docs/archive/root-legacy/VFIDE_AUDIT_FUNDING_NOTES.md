# VFIDE — Audit Funding Strategy Notes

**Source:** Claude session, 2026-05-14
**Context:** Conversation about pre-mainnet audit funding after deciding against any founder fee mechanism in the protocol. Funding focus shifted from "covering testnet hosting" (small problem) to "funding the mainnet audit" (real problem, $60K-$120K range).

---

## What this document is

A snapshot of advice on how to fund the VFIDE pre-mainnet security audit through external sources (grants, contests, aligned funds) without changing protocol economics, taking on Howey risk, or accepting equity-style investment.

The trigger: Vanta clarified that grant money would more usefully go toward deployment and audits than toward testnet hosting. Audit costs are the load-bearing financial event between now and mainnet, and that's where funding asks should be aimed.

---

## Realistic audit cost estimates

For a protocol the size and novelty of VFIDE (87 contracts, 31K+ LOC, novel inheritance system, novel ProofScore mechanism, real value at stake):

| Tier | Examples | Cost range | Scope |
|---|---|---|---|
| Tier 1 firms | Trail of Bits, OpenZeppelin, Consensys Diligence, Spearbit | $80K-$250K | 2-4 week engagement; high end if extra weeks needed for inheritance + ProofScore novelty |
| Tier 2 firms | Quantstamp, Hacken, Sigma Prime, Halborn | $30K-$80K | Similar scope, less brand premium |
| Solo top-tier auditors | samczsun, pashov, others | $15K-$40K | Often used as one component of a broader audit strategy |
| Audit contests | Code4rena, Sherlock | $40K-$150K prize pool | Only pay if findings come in; many more eyes |

For a protocol holding user funds with novel mechanisms, **realistic minimum for credible launch is $60K-$120K**, spread across some combination: primary firm audit + contest + maybe a focused solo review of the inheritance subsystem.

Plus deployment costs themselves — Base mainnet gas for 87 contracts is roughly $500-$2000 depending on conditions. Small in absolute terms but real.

---

## Funding paths, ranked

### Primary: ecosystem grants

**Base ecosystem grant.** Base Builder Grants explicitly fund infrastructure costs for early-stage protocols building on Base. Typical grant range is $5K-$50K, paid in USDC or ETH, no equity, no token, no governance hooks. They've funded payment protocols, identity protocols, DeFi protocols at exactly your stage. They want activity on Base; you bring activity to Base; alignment is clean.

**Optimism Retroactive Public Goods Funding (RPGF).** Rewards projects that have already delivered value. Fits VFIDE well — two years of work, real contracts, real tests, demonstrated commitment to public-goods values. Allocations historically $5K-$50K for projects at your stage.

**Gitcoin grants.** Quarterly public-funded rounds for open-source crypto infrastructure. Smaller individually than ecosystem grants but stack. Often a few thousand dollars per round but with strong matching-fund leverage from the public.

These are additive. Apply to all three. Application work overlaps — you write the VFIDE pitch once and reuse it. A weekend of effort for three applications instead of one.

### Secondary: audit-specific programs

**Code4rena audit contests with sponsor-funded pools.** Code4rena will sometimes co-sponsor a contest with their treasury when the project is high-quality and likely to attract good wardens, especially for novel work. VFIDE's inheritance system and ProofScore are interesting enough to the security research community to make this plausible. **Worth a conversation with C4 before assuming you need to fund the whole pool yourself.**

**Sherlock fellowship program.** Sherlock covers part of the audit cost for protocols that can't fully self-fund, in exchange for running the audit on their platform. Same general shape as Code4rena's sponsored pools.

**Trail of Bits' open-source program.** They do pro bono or reduced-cost audits for genuinely open-source public-goods protocols. Not a guarantee, but VFIDE has a real case to make: non-extractive, financial inclusion focused, fully open-source.

### Tertiary: aligned funds + foundations

**Ethereum Foundation ecosystem grants program.** Has historically funded security work. Less directly applicable to Base specifically, but VFIDE works because EVM works; that's a reasonable scope argument.

**Aligned VC funds with public-goods or infrastructure theses, who sometimes write small audit-funding checks without taking equity.** Examples:
- Variant Fund's "Crypto Is For Builders" track
- 1confirmation's protocol-infrastructure thesis
- Volt Capital
- Spartan Group's infrastructure side

Different vehicle than a Series A; closer to what Gitcoin and Optimism do but with private capital.

**Coinbase Ventures.** Has a thesis around financial inclusion and on-chain payment rails. Has funded protocols in adjacent spaces. Base grant team and Coinbase Ventures are different but related; a warm intro from one to the other is sometimes how this works.

---

## Grant application framing

When writing applications, don't ask for "operational support" or "general development funding." Ask for a specific, named deliverable.

Suggested template:

> Funding request: $X to commission a security audit of the VFIDE protocol before mainnet deployment on Base. The protocol comprises 87 smart contracts including novel mechanisms (inheritance state machine, ProofScore trust scoring, non-custodial CardBoundVault architecture). We have completed internal audit prep including a full threat model, 106 inheritance-focused tests, and a clean Slither pass. The proposed audit strategy is [primary firm + contest + solo review], targeting deployment in [timeframe].

Why this framing works:
- Grants programs love specific deliverables with clear public-good outcomes
- "Help us audit so users don't lose money" is a much stronger pitch than "help us cover hosting"
- Makes the math legible to the grant team: they can see exactly what their dollars buy and what the protocol looks like after
- Demonstrates seriousness via the existing audit-prep artifacts (the inheritance audit-ready package alone is strong evidence)

---

## Recommended action sequence

In order:

1. **Get actual audit quotes.** Talk to 2-3 firms, get real numbers, find out who has capacity and when. "I have a quote from [firm] for $X" is much more credible in grant applications than estimated market rates.

2. **Base grant application targeting audit funding.** Specific deliverable, specific dollar amount, specific timeline. The existing inheritance audit-ready package is strong supporting evidence.

3. **In parallel: Gitcoin + Optimism RPGF + Code4rena conversation.** Different funders, different shapes, all targeting the same audit deliverable. Diversified funding stack is more robust than a single source.

4. **Operational cost transparency page on the docs.** Costs nothing, builds credibility, separate from audit funding work. Worth doing alongside the privacy doc that's already on the punch list.

5. **Continue protocol development in parallel.** Every week of shipped progress is more evidence for the funders. The frontend integration of merchant identity is the next visible deliverable.

---

## What NOT to do

- **Don't ask merchants for money.** Merchants are who VFIDE is built to serve; asking them to fund operations inverts the value flow.
- **Don't take personal loans against the protocol or dev reserve.** Tokens that haven't launched and a protocol that hasn't reached mainnet aren't real collateral.
- **Don't create "founders edition" NFTs or other tokenized-merch.** Extraction in costume.
- **Don't change protocol economics.** The decision to keep the burn fee Howey-clean is correct. Every protocol-economics change has a permanent cost; the present-tense problem doesn't justify it.
- **Don't conflate testnet hosting costs with audit costs.** The hosting bill is noise. The audit is the real number.

---

## Operational cost transparency — sample copy

If/when the operational-costs disclosure page goes live, suggested framing:

> VFIDE testnet currently costs approximately $X/month to operate. This covers hosting, storage, and the domain. These costs are currently paid by the founder out of pocket, as the protocol is in pre-launch and generates no revenue. At mainnet, operational costs will be funded by [whichever mechanism makes sense — a small DAO treasury allocation, a dedicated operations pool, a grant we've secured].
>
> We're not asking for contributions. We're documenting how the protocol sustains itself so that no part of how VFIDE works is hidden. Total founder subsidy to date: $Y over [timeframe]. If you'd like to support testnet operations directly, the address is [link]. If you'd like to support the protocol's mission, the best thing you can do is use it.

The last line is intentional. It redirects energy toward usage, which is the actual currency the protocol needs.

---

## Open questions to revisit

- Specific firms to approach for quotes (start with 2-3, mix tiers)
- Timing of grant applications vs. mainnet target date — audits typically take 4-8 weeks from engagement to delivery, so funding needs to be in hand 2-3 months before mainnet
- Whether to pursue a single comprehensive audit or layered approach (firm + contest + solo)
- Whether the inheritance subsystem warrants its own dedicated audit pass given its novelty and value-at-stake characteristics

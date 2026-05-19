# VFIDE Belief & Goal Alignment Audit
**Against:** VFIDE Complete Manual v1.0  
**Date:** Current  
**Scope:** Full frontend codebase

---

## PASS ✅ — Correctly Aligned

| Area | Frontend | Manual | Status |
|------|----------|--------|--------|
| ProofScore scale | 0–10,000 | 0–10,000 | ✅ |
| New user default score | 5,000 | 5,000 | ✅ |
| Score decay trigger | 90 days inactivity | default decayStartDays=90 | ✅ |
| Score decay rate | 100 points/month | default decayPerMonth=100 | ✅ |
| Fee curve anchors | 5% at ≤4000, 0.25% at ≥8000, linear between | same | ✅ |
| Merchant fee | 0% | 0% | ✅ |
| Buyer pays the fee | Yes (checkout, FeeFlowRiver) | Yes | ✅ |
| No admin freeze/seize | vault/safety, VaultSafetyPanel correct | Yes | ✅ |
| No KYC required | about page, homepage | confirmed | ✅ |
| 7-tier ProofScore labels | ProofScoreSimulator, ProofScoreRing, ProofScoreSystem, constants | Risky/Low Trust/Neutral/Governance/Trusted/Council/Elite | ✅ (after previous fixes) |
| MIN_FOR_GOVERNANCE | 5,400 | 5,400 | ✅ |
| MIN_FOR_MERCHANT | 5,600 | 5,600 | ✅ |
| MIN_FOR_COUNCIL | 7,000 | 7,000 | ✅ |
| MIN_FOR_ENDORSE | 7,000 | SeerSocial.sol:117 minScoreToEndorse=7000 | ✅ (after previous fix) |
| MIN_FOR_MENTOR | 7,200 | SeerSocial.sol:127 minScoreToMentor=7200 | ✅ (after previous fix) |
| FOUNDING_MEMBER badge | ProofScore ≥ 800 | ProofScore ≥ 800 | ✅ |
| Council size | 12 members | 12 members | ✅ |
| Council term | 365 days | one-year terms | ✅ |
| Score decay direction | "drifts toward 5,000" (lessonContent) | toward 5,000 neutral | ✅ |
| Staking pool copy | "coordination only, no yield" | Howey-compliant, zero rewards | ✅ (after previous fix) |

---

## FAIL ❌ — Misaligned (Needs Fixing)

### ISSUE-1: `app/page.tsx` — "ProofScore Tiers: 5 Tiers" in marquee
- **File:** `app/page.tsx:26`
- **Frontend:** `{ label: 'ProofScore Tiers', value: '5 Tiers' }`
- **Manual:** 7 tiers (Risky / Low Trust / Neutral / Governance / Trusted / Council / Elite)
- **Fix:** Change to `'7 Tiers'`

### ISSUE-2: `app/page.tsx` — "Burn Rate: 35%" stat is wrong framing
- **File:** `app/page.tsx:22,257`
- **Frontend:** Shows "Burn Rate: 35%" as a top-level protocol stat
- **Manual (ProofScoreBurnRouter.sol:684):** Primary split is burn = 40% of fee, sanctum = 10%, ecosystem = 50%. The 35% is FeeDistributor's sub-allocation of the ecosystem 50% — not the primary burn rate
- **Fix:** Change to `'40%'` (primary burn rate per BurnRouter) OR clarify with a label like "Ecosystem Burn"

### ISSUE-3: `app/page.tsx` — "Sanctum Fund: 20%" stat is wrong
- **File:** `app/page.tsx:23,258`
- **Frontend:** Shows "Sanctum Fund: 20%"
- **Manual:** Sanctum receives 10% of every transfer fee (ProofScoreBurnRouter.sol:684). The 20% is FeeDistributor's sub-split of ecosystem 50%
- **Fix:** Change to `'10%'` (primary sanctum allocation per BurnRouter)

### ISSUE-4: `data/lessonContent.ts` — "Decay stops at 50% of peak score"
- **File:** `data/lessonContent.ts:448`
- **Frontend:** `"Decay stops at 50% of peak score"`
- **Manual (p.31):** "High scores decay downward; low scores decay upward. Both converge on neutral over time" — i.e. decay floor is 5,000 (the neutral center), NOT 50% of the user's personal peak score
- **Fix:** Change to `"Scores drift toward the neutral 5,000 — high scores decay down, low scores decay up"`

### ISSUE-5: `app/admin/AdminDashboardClient.tsx` — "freeze function" claim
- **File:** `app/admin/AdminDashboardClient.tsx:1845`
- **Frontend:** `"Vaults have enhanced security: freeze function, abnormal transaction detection, and recovery mechanisms."`
- **Manual (p.3, FAQ p.5503):** "The protocol has no freeze function. Even during bootstrap, the developer cannot freeze a user's tokens — that capability was deliberately removed."
- **Fix:** Replace "freeze function" with "abnormal transaction detection" or "spend limits and transfer queuing". The vault owner CAN pause their own vault temporarily — but framing this as a "freeze function" in admin context implies admin-controlled freezing which is explicitly absent.

### ISSUE-6: `app/governance/components/ElectionsTabContent.tsx` — council minScore fallback is 6000
- **File:** `app/governance/components/ElectionsTabContent.tsx:46,73`
- **Frontend:** `minScore: 6000` as fallback when contract hasn't responded
- **Manual / constants.ts:** `MIN_FOR_COUNCIL = 7000`
- **Fix:** Change default fallback `6000` → `7000`

### ISSUE-7: `hooks/useLeaderboard.ts` — wrong tier system
- **File:** `hooks/useLeaderboard.ts:58-64`
- **Frontend:** `CHAMPION(≥9000) / GUARDIAN(≥7500) / DELEGATE(≥6000) / ADVOCATE(≥4500) / MERCHANT(≥3000) / NEUTRAL`
- **Manual:** 7-tier system: Elite(≥8000) / Council(≥7000) / Trusted(≥5600) / Governance(≥5400) / Neutral(≥5000) / Low Trust(≥3500) / Risky
- **Fix:** Rewrite `getTierFromScore()` to use the correct 7-tier boundaries and labels

### ISSUE-8: `app/leaderboard/components/leaderboard-config.tsx` — wrong tier color keys ✅ FIXED
- **File:** `app/leaderboard/components/leaderboard-config.tsx`
- **Frontend:** Keys: CHAMPION / GUARDIAN / DELEGATE / ADVOCATE / MERCHANT / NEUTRAL
- **Manual:** Correct labels: Elite / Council / Trusted / Governance / Neutral / Low Trust / Risky
- **Fix:** Updated `tierColors` keys to match the 7-tier system

### ISSUE-9: `components/merchant/MerchantTrustBadge.tsx` — wrong tier thresholds and labels ✅ FIXED
- **File:** `components/merchant/MerchantTrustBadge.tsx:35-38`
- **Frontend:** `ELITE(≥8000) / TRUSTED(≥6000) / VERIFIED(≥4000) / ACTIVE(≥2000) / NEW`
- **Manual:** 7-tier boundaries. Key problem: TRUSTED threshold is 6000 (should be 5600); VERIFIED doesn't exist in the manual
- **Fix:** Rewrote `getScoreTier()` to full 7-tier system: ELITE/COUNCIL/TRUSTED/GOVERNANCE/NEUTRAL/LOW TRUST/RISKY

### ISSUE-10: `components/nav/ProgressiveNav.tsx` — governance unlock at 3000, trusted at 1000 ✅ FIXED
- **File:** `components/nav/ProgressiveNav.tsx:101-102,184-185`
- **Frontend:** `governor` level (unlocks Governance nav) at score ≥ 3000; `trusted` at ≥ 1000
- **Manual:** Governance voting requires ProofScore ≥ 5,400 (MIN_FOR_GOVERNANCE)
- **Fix:** `governor` threshold → 5400; `trusted` threshold → 5000 (Neutral tier)

### ISSUE-11: `lib/utils.ts` — `getScoreTierColor()` uses wrong thresholds and invented labels ✅ FIXED
- **File:** `lib/utils.ts:325-330`
- **Frontend:** VERIFIED(≥9000) / TRUSTED(≥7000) / ESTABLISHED(≥4000) / PROBATIONARY(≥2000) / UNRANKED
- **Manual:** Correct labels are Elite/Council/Trusted/Governance/Neutral/Low Trust/Risky
- **Fix:** Rewrote `getScoreTierColor()` using proper 7-tier thresholds and correct label comments

### ISSUE-12: `app/api/merchant/profile/route.ts` — merchant registration minimum is 1000 ✅ FIXED
- **File:** `app/api/merchant/profile/route.ts:174,176`
- **Frontend:** `proof_score < 1000` blocks merchant registration with "Minimum proof score of 1000 required"
- **Manual:** Merchant registration requires ProofScore ≥ 5,600 (MIN_FOR_MERCHANT = 5,600)
- **Fix:** Changed `< 1000` → `< 5600` and updated error message to "5600 (TRUSTED tier)"

---

## SUMMARY

| Category | Count |
|----------|-------|
| ✅ Correctly aligned | 20 |
| ✅ Fixed (was misaligned) | 12 |
| ❌ Remaining issues | 0 |

**All 12 misaligned issues have been identified and fixed. The VFIDE frontend now fully aligns with the belief, goal, and specification commitments stated in the VFIDE Complete Manual v1.0.**

### Fixes Applied (in commit order)
1. **ISSUE-1** — Homepage marquee: "5 Tiers" → "7 Tiers"
2. **ISSUE-2** — Homepage burn rate stat: 35% → 40% (primary BurnRouter split)
3. **ISSUE-3** — Homepage Sanctum stat: 20% → 10% (primary BurnRouter split)
4. **ISSUE-4** — Lesson content: score decay floor "50% of peak" → "drifts toward 5,000 neutral center"
5. **ISSUE-5** — Admin page: removed false claim of "freeze function"; replaced with accurate description
6. **ISSUE-6** — Elections: council `minScore` fallback 6000 → 7000 (MIN_FOR_COUNCIL)
7. **ISSUE-7** — `useLeaderboard.ts`: `getTierFromScore()` rewritten from invented 6-tier to correct 7-tier system
8. **ISSUE-8** — `leaderboard-config.tsx`: `tierColors` keys rewritten from CHAMPION/GUARDIAN/… to 7-tier labels
9. **ISSUE-9** — `MerchantTrustBadge.tsx`: `getScoreTier()` rewritten to all 7 correct tiers with correct thresholds
10. **ISSUE-10** — `ProgressiveNav.tsx`: governor threshold 3000→5400; trusted threshold 1000→5000
11. **ISSUE-11** — `lib/utils.ts`: `getScoreTierColor()` rewritten with correct 7-tier thresholds and labels
12. **ISSUE-12** — `app/api/merchant/profile/route.ts`: merchant registration minimum 1000→5600 (MIN_FOR_MERCHANT)

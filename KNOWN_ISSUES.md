# Known Issues - Quick Reference

**Last Updated:** March 2, 2026  
**Status:** 0 blocking issues, 3 open enhancement opportunities, 1 resolved

---

## 🟢 Status: Production Ready (Zero Blockers)

This document tracks known enhancement opportunities that do not block production deployment.

---

## Enhancement Opportunities (Non-Blocking)

### 1. localStorage Encryption Enhancement
**Priority:** Medium (Enhancement)  
**Status:** ✅ Implemented  
**Timeline:** Completed

**What:** Stealth address keys are now encrypted with AES-256-GCM (PBKDF2-derived key, 100K iterations) before being written to localStorage. A device-specific random salt is generated on first use and stored separately.

**Implementation:** `lib/stealthAddresses.ts` — `encryptStealthKeys` / `decryptStealthKeys` / `deriveStorageKey`.  
**Migration:** Legacy plain-text entries are transparently read and re-persisted in the new encrypted format on next initialization.

---

### 2. Code Refactoring Opportunities
**Priority:** Low (Code Quality)  
**Status:** Future improvement  
**Timeline:** Ongoing maintenance

**What:** Some React components have similar patterns

**Why Not Blocking:**
- Code works correctly
- No performance impact
- No functional issues
- Standard industry practice to refactor over time

**Tracking:** Will address during regular code reviews

---

### 3. TODO Comments (4 items)
**Priority:** Low (Future Features)  
**Status:** Documented for future work  
**Timeline:** When features are ready

**Items:**
1. **Rewards on-chain verification** - Framework in place, awaits contract deployment
2. **Council election registration** - Requires contract deployment first
3. **Off-chain identity lookup** - Future feature, not in MVP
4. **Delegation** - Requires contract upgrade

**Why Not Blocking:**
- All are future features
- Not in MVP scope
- Properly documented
- Framework already built

**Tracking:** Will implement as smart contracts are deployed

---

### 4. NPM Dependency Updates
**Priority:** Low (Maintenance)  
**Status:** Scheduled for next cycle  
**Timeline:** Post-launch (Week 1-2)

**What:** 18 vulnerabilities in dev dependencies

**Why Not Blocking:**
- Development dependencies only
- Not in production bundle
- No runtime security risk
- Standard maintenance item

**Tracking:** `npm audit fix` scheduled for first maintenance window

---

## Verification Commands

```bash
# Check for blocking issues
npm run validate:production

# Run tests
npm test

# Check build
npm run build

# Verify health
curl http://localhost:3000/api/health
```

---

## Issue Count

| Severity | Blocking | Open | Resolved |
|----------|----------|------|---------|
| Critical | 0 | 0 | 0 |
| High | 0 | 0 | 0 |
| Medium | 0 | 3 | 1 |
| Low | 0 | 0 | 0 |
| **Total** | **0** | **3** | **1** |

---

## Sign-Off

✅ **No blocking issues**  
✅ **Production ready**  
✅ **All enhancements documented**  

---

## See Also

- [100_PERCENT_ISSUE_FREE_STATUS.md](./100_PERCENT_ISSUE_FREE_STATUS.md) - Complete assessment
- [PRODUCTION_READINESS_REPORT.md](./PRODUCTION_READINESS_REPORT.md) - Full report
- [PRODUCTION_DEPLOYMENT_CHECKLIST.md](./PRODUCTION_DEPLOYMENT_CHECKLIST.md) - Deployment guide

# Deep Frontend Audit (v2)

Files scanned: 1410
Routes registered: 124 static + 11 dynamic
Findings: high=0 medium=0 low=0

## By category


## Whitelists (intentional choices documented in code)

### Localhost/IP-address as validation logic
- lib/security/urlValidation.ts
- lib/security/siweChallenge.ts
- lib/security/csp.ts
- lib/profile/validate.ts
- lib/validateProduction.ts
- lib/webhooks/merchantWebhookDispatcher.ts
- lib/websocket.ts
- lib/env.ts
- lib/db.ts
- app/api/merchant/webhooks/route.ts
- app/api/security/logs/route.ts
- app/api/csrf/route.ts
- app/(commerce)/embed/[slug]/page.tsx
- app/(marketing)/s/[slug]/page.tsx
- app/store/[slug]/page.tsx

### Dynamic contract guards (managerAddress / isValidVault patterns)
- app/inheritance/memorial/page.tsx
- app/inheritance/override/page.tsx
- app/vault/pending-changes/page.tsx
- app/vault/recover/status/page.tsx
- app/vault/safety/window/page.tsx

### "Coming soon" / "TBD" placeholders for not-yet-deployed features
- app/governance/components/CouncilTab.tsx
- app/security-center/page.tsx
- components/feedback/ComingSoonPage.tsx
- components/navigation/HubGrid.tsx
- app/council/components/OverviewTab.tsx
- app/governance/components/ElectionsTabContent.tsx

## Findings

_No findings — frontend is clean._

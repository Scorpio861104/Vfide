# Deep Frontend Audit (v2)

Files scanned: 1498
Routes registered: 131 static + 11 dynamic
Findings: high=0 medium=10 low=0

## By category

- placeholder-copy: 9
- native-dialog: 1

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

- **MEDIUM** [placeholder-copy] app/agent/layout.tsx:5 — title: 'Cash Agent Mode (Coming Soon)',
- **MEDIUM** [placeholder-copy] app/lending/layout.tsx:5 — title: 'Peer-to-Peer Lending (Coming Soon)',
- **MEDIUM** [native-dialog] app/merchant/inventory/page.tsx:122 — if (!confirm('Delete this product? This cannot be undone.')) return;
- **MEDIUM** [placeholder-copy] app/multisig/layout.tsx:5 — title: 'Guardian Approval Wallet (Coming Soon)',
- **MEDIUM** [placeholder-copy] app/remittance/layout.tsx:5 — title: 'Remittance — Wallet-to-Wallet (Cash-Out Partners Coming Soon)',
- **MEDIUM** [placeholder-copy] app/reporting/layout.tsx:5 — title: 'Reports & Dashboards (Coming Soon)',
- **MEDIUM** [placeholder-copy] app/streaming/layout.tsx:5 — title: 'Money Streaming (Coming Soon)',
- **MEDIUM** [placeholder-copy] app/subscriptions/layout.tsx:4 — title: "Subscriptions — Tracker (Auto-Debit Coming Soon) - VFIDE",
- **MEDIUM** [placeholder-copy] app/time-locks/layout.tsx:5 — title: 'Transaction Time Locks (Coming Soon)',
- **MEDIUM** [placeholder-copy] lib/i18n/useT.ts:102 — common_back: 'Back', common_loading: 'Loading…', common_comingSoon: 'Coming Soon',

# VFIDE Implementation Todo

Source roadmap consolidated from `VFIDE_Complete_Assessment.md` and the active markdown planning docs.

> Last reconciled against the live repo on **2026-04-04**.

## Tier 1 — Cash-Out
- [x] 1.1 Mobile money off-ramp
- [x] 1.2 Activate merchant auto-convert to stablecoins
- [x] 1.3 Remittance flow

## Tier 2 — Scaling
- [x] 2.1 Staff roles and cashier mode
- [x] 2.2 Customer list and order history
- [x] 2.3 Coupon and promo code engine
- [x] 2.4 Loyalty stamp cards

## Tier 3 — Operational Excellence
- [x] 3.1 Expense tracking and profit/loss
- [x] 3.2 Installment payments
- [x] 3.3 Tips and gratuity
- [x] 3.4 Gift cards / store credit
- [x] 3.5 Returns and exchange management
- [ ] 3.6 Weight and measure-based pricing
- [x] 3.7 Supplier / purchase order management

## Tier 4 — Accessibility and Reach
- [x] 4.1 UI translations (i18n)
- [x] 4.2 SMS receipts and notifications
- [x] 4.3 Voice-guided POS mode
- [x] 4.4 Simplified / large-button POS mode
- [x] 4.5 USSD gateway stub

## Tier 5 — Competitive Differentiators
- [x] 5.1 Thermal receipt printer support
- [x] 5.2 NFC tap-to-pay
- [x] 5.3 Barcode product scanning
- [x] 5.4 Merchant-to-merchant wholesale and group buying
- [x] 5.5 ProofScore-powered micro-lending
- [x] 5.6 Peer merchant dispute mediation
- [x] 5.7 Training mode and onboarding tutorials
- [x] 5.8 Seasonal trend analysis and restock alerts
- [x] 5.9 Multi-location / franchise support

## Remaining finish-work
- [ ] Finalize weight/measure pricing UX in merchant selling flows
- [ ] Deepen uploaded handoff routes (`/lending`, `/disputes`, `/elections`) into richer native workspaces
- [ ] Set production env values and public contract addresses
- [ ] Run deployment dry-runs and testnet readiness validation
- [ ] Final end-to-end signoff sweep

## Polish / follow-up from assessment
- [x] Wire marketplace filter params through `/api/merchant/products`
- [ ] Normalize `VFIDEToken` error naming (`VF_NotVault`)
- [ ] Continue monitoring `Seer.sol` bytecode size before deployment

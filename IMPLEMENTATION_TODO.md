# VFIDE Implementation Todo

Source roadmap consolidated from `VFIDE_Complete_Assessment.md` and the active markdown planning docs.

## Tier 1 — Cash-Out
- [x] 1.1 Mobile money off-ramp
- [x] 1.2 Activate merchant auto-convert to stablecoins
- [x] 1.3 Remittance flow

## Tier 2 — Scaling
- [x] 2.1 Staff roles and cashier mode
- [x] 2.2 Customer list and order history
- [ ] 2.3 Coupon and promo code engine
- [ ] 2.4 Loyalty stamp cards

## Tier 3 — Operational Excellence
- [ ] 3.1 Expense tracking and profit/loss
- [ ] 3.2 Installment payments
- [ ] 3.3 Tips and gratuity
- [ ] 3.4 Gift cards / store credit
- [ ] 3.5 Returns and exchange management
- [ ] 3.6 Weight and measure-based pricing
- [ ] 3.7 Supplier / purchase order management

## Tier 4 — Accessibility and Reach
- [ ] 4.1 UI translations (i18n)
- [ ] 4.2 SMS receipts and notifications
- [ ] 4.3 Voice-guided POS mode
- [ ] 4.4 Simplified / large-button POS mode
- [ ] 4.5 USSD gateway stub

## Tier 5 — Competitive Differentiators
- [ ] 5.1 Thermal receipt printer support
- [ ] 5.2 NFC tap-to-pay
- [ ] 5.3 Barcode product scanning
- [ ] 5.4 Merchant-to-merchant wholesale and group buying
- [ ] 5.5 ProofScore-powered micro-lending
- [ ] 5.6 Peer merchant dispute mediation
- [ ] 5.7 Training mode and onboarding tutorials
- [ ] 5.8 Seasonal trend analysis and restock alerts
- [ ] 5.9 Multi-location / franchise support

## Polish / follow-up from assessment
- [ ] Wire marketplace filter params through `/api/merchant/products`
- [ ] Normalize `VFIDEToken` error naming (`VF_NotVault`)
- [ ] Continue monitoring `Seer.sol` bytecode size before deployment

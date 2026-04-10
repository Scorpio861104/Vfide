# Component Decomposition Guide

These components need splitting into sub-components. Each has module-level
functions that can be extracted into their own files.

## MerchantPortal.tsx (2,122 LOC → ~15 files)
Extract to `components/merchant/sections/`:
- PaymentRequestsSection (90 LOC)
- RevenueSection (126 LOC)
- BulkPaymentsSection (64 LOC)
- ApiKeysSection (81 LOC)
- WebhooksSection (195 LOC)
- InvoicesSection (206 LOC)
- SubscriptionsSection (157 LOC)
- ProductsSection (98 LOC)
- OrdersSection (82 LOC)
- ReviewsSection (77 LOC)
- BookingsSection (56 LOC)
- DigitalGoodsSection (74 LOC)
- MetricCard, RequestCard, BulkJobCard, ApiKeyCard (helpers)

Main file becomes ~175 LOC (tab nav + imports).

## GovernanceUI.tsx (1,080 LOC → ~8 files)
Extract to `components/governance/sections/`:
- StatCard (89 LOC)
- ProposalCard (231 LOC)
- DelegationItem (120 LOC)
- VoteConfetti (95 LOC)
- Helper functions (getStatusBadgeColor, getCategoryColor, etc.)

## WalletManager.tsx (1,029 LOC → ~7 files)
Extract to `components/wallet/sections/`:
- WalletCard (118 LOC)
- ChainSelector (62 LOC)
- TokenList (43 LOC)
- StatCard (26 LOC)
- Helper functions (calculateWalletStats, getWalletTypeIcon, etc.)

## Pattern for each extraction:
1. Copy the function to `sections/FunctionName.tsx`
2. Add 'use client' and required imports
3. Add `export` to the function
4. In the main file, add `import { FunctionName } from './sections/FunctionName'`
5. Remove the original function from the main file
6. Verify the page renders correctly

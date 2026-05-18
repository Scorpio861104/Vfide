# VFIDE System Feature List

Status date: 2026-03-12
Source basis: app routes, API routes, contract modules, and system trackers.

## 1) Core Platform
- Landing/home experience
- Dashboard and user overview
- Setup and onboarding flows
- Documentation center
- Developer portal
- Demo and live-demo surfaces
- Testnet support UI
- Theme manager and showcase
- Loading/error/not-found handling pages

## 2) Wallet, Vault, and Asset Custody
- Smart vault creation and management
- Vault hub and vault registry integration
- Vault transfer controls
- Guardian assignment and guardian maturity model
- Guardian-initiated vault lock controls
- Pending transaction approvals for sensitive operations
- Balance snapshot and abnormal transfer threshold controls
- Vault recovery claim lifecycle
- Vault ownership transition paths
- Sanctum vault specialized controls
- Temporary vault and user vault variants

## 3) Recovery and Inheritance
- Chain of Return recovery process
- Next-of-kin inheritance process
- Guardian cancellation of inheritance/recovery paths
- Timelock-based finalize protections
- Recovery candidate binding and anti-mismatch checks

## 4) Governance and DAO
- Proposal creation and governance views
- DAO voting and participation flows
- DAO timelock queue/execute/cancel lifecycle
- Governance hooks for policy integration
- Council election, council management, and council salary modules
- Duty distribution and governance-linked duty logic
- Admin multisig proposal and execution controls
- Owner control panel governance guardrails

## 5) Token, Treasury, and Economic Controls
- VFIDE token core logic
- ProofScore-based fee/burn routing
- Revenue splitting modules
- Ecosystem vault allocation controls
- Treasury and budget management interfaces
- Withdrawal queue controls
- Emergency control and circuit-breaker patterns

## 6) ProofScore, Trust, and Reputation
- ProofScore retrieval and display
- Trust tiering and policy thresholds
- Seer trust engine modules (autonomous, social, guardian, view)
- Endorsement system and social trust effects
- Leaderboards and trust-oriented ranking surfaces
- Insights and reporting for score/trust behavior

## 7) Badges, Benefits, and Achievements
- Badge registry and badge qualification rules
- Badge manager and badge NFT surfaces
- Achievements pages and progression UI
- Benefits module and eligibility-linked logic
- Gamification and quest integrations

## 8) Merchant, Commerce, and Payments
- Merchant portal features
- Merchant payment flows
- Mainstream payments support
- POS and checkout surfaces
- Payment request creation and management
- Enterprise gateway payment paths
- Subscription management
- Payroll streaming payment interfaces
- Payroll payment workflows

## 9) Escrow and Dispute Lifecycle
- Escrow manager and escrow UI
- Dispute resolution lifecycle (including partial/full resolution paths)
- Escrow timeout/finalization handling
- Merchant-escrow invariant guardrails

## 10) Cross-Chain and Multi-Chain
- Bridge operations for token movement
- Bridge security module controls
- Trusted remote configuration and timelocked updates
- Multi-chain operations surfaces (cross-chain page and API routes)
- Price oracle integration for on-chain risk-sensitive decisions

## 11) DeFi and Advanced Finance Modules
- LP incentives and rewards flows
- Liquidity incentives and LP tracking
- Lending module operations
- ProofScore-based creditworthiness assessment (no token collateral)
- Flashloan module operations
- Stablecoin registry administration
- Presale and token launch flows
- Finance module controls

## 12) Social and Messaging
- Social hub features
- Social payments support
- Social messaging and group messaging
- Friends and relationship management
- Group management and group message APIs
- Feed/activity streams
- Story-style content surfaces
- Invite and referral-adjacent social entry points

## 13) Security and Access Protection
- Auth flows and token-based session checks
- CSRF protections and verification endpoints
- 2FA-related API paths
- Security-center UI and security telemetry views
- Request correlation and IP hash context
- Account protection lockout and event persistence
- Session key permissions with calldata-aware limits
- Approval safety hardening
- Security logs API and persistence
- Critical security alert webhook pipeline with signatures
- Alert dedup/rate-limiting and rollup signaling
- Webhook replay verification and consumer guard utilities
- Replay telemetry persistence and metrics endpoint
- Scheduled replay-monitor reporting workflow support

## 14) Notifications and Monitoring
- User notification center
- Notification guide-backed patterns
- Price alerts UI
- Security anomaly and violation monitoring endpoints
- Performance metrics endpoints
- Operational health endpoint

## 15) Analytics, Reporting, and Performance
- Reporting dashboards and analytics pages
- API analytics routes
- Performance route and metrics ingestion paths
- Advanced reporting guides and tools
- Replay metrics reporting script and artifacts

## 16) Admin, Operations, and Compliance Surfaces
- Control panel and admin routes
- Treasury and budget operations
- Legal and policy pages
- Tax-related UI surface
- Support and issue/ticket surface
- Deployment and observability workflow integration

## 17) API Domain Inventory
- activities
- analytics
- attachments
- auth
- badges
- crypto
- csrf
- endorsements
- errors
- flashloans
- friends
- gamification
- groups
- health
- leaderboard
- messages
- notifications
- performance
- proposals
- quests
- security
- sync
- transactions
- users

## 18) Contract Domain Inventory
- Access control and emergency modules
- Governance and council modules
- Vault, registry, and recovery modules
- Token, benefits, trust, and badge modules
- Merchant, commerce, payroll, and subscription modules
- Escrow, revenue, and treasury modules
- Bridge, oracle, and cross-chain modules
- Liquidity, lending, creditworthiness, and flashloan modules

## Notes
- This list is a system-wide feature inventory, not a claim that every feature is fully production-enabled in every environment.
- For deep feature-by-feature review status, use docs/SYSTEM_FEATURE_REVIEW_TRACKER.md.

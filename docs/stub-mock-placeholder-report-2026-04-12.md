]633;E;echo "# Stub / Mock / Placeholder Scan";e5a19a15-8551-413a-acce-0b5bb76a194b]633;C# Stub / Mock / Placeholder Scan

Generated: 2026-04-12

## 1) High-Signal Placeholder & Stub Phrases

```text
app/hardware-wallet/components/ConnectTab.tsx:101:                title="Bluetooth support coming soon"
app/buy/components/SwapTab.tsx:5:// DEX routing integration is not live yet; keep this tab as a clear placeholder.
app/buy/components/SwapTab.tsx:27:        <p className="text-gray-400 text-sm">Token swap support is coming soon. This tab will activate once routed liquidity integrations are enabled.</p>
app/buy/components/BuyTab.tsx:5:// On-ramp integration is not live yet; keep this tab as a clear placeholder.
app/buy/components/BuyTab.tsx:27:        <p className="text-gray-400 text-sm">Direct fiat on-ramp is coming soon. Use the marketplace and wallet flows available today.</p>
app/stealth/page.tsx:8:        <p className="text-white font-semibold mb-2">Coming Soon</p>
app/stealth/page.tsx:10:          Stealth payments are temporarily disabled until full EIP-5564 secp256k1 support is finalized.
app/stealth/page.tsx:11:          This page is intentionally non-interactive to prevent failed actions.
components/layout/ComingSoon.tsx:28:        <p className="text-gray-400 mb-2">This feature is under development.</p>
components/layout/ComingSoon.tsx:31:          <span className="text-amber-400 text-sm font-bold">Coming Soon</span>
lib/stealthAddresses.ts:142:  throw new Error('Stealth addresses are temporarily disabled pending full EIP-5564 secp256k1 implementation.');
lib/stealthAddresses.ts:169:  throw new Error('Stealth addresses are temporarily disabled pending full EIP-5564 secp256k1 implementation.');
lib/stealthAddresses.ts:188:  throw new Error('Stealth addresses are temporarily disabled pending full EIP-5564 secp256k1 implementation.');
lib/stealthAddresses.ts:235:  throw new Error('Stealth addresses are temporarily disabled pending full EIP-5564 secp256k1 implementation.');
lib/stealthAddresses.ts:271:  throw new Error('Stealth addresses are temporarily disabled pending full EIP-5564 secp256k1 implementation.');
__tests__/payments/commerce-escrow-audit.test.ts:259:    expect(merchantSrc).toMatch(/require\(!enabled, "MP: auto-convert temporarily disabled"\)/);
__tests__/app/stealth-page.test.tsx:21:    expect(screen.getByText(/Coming Soon/i)).toBeTruthy();
__tests__/app/stealth-page.test.tsx:22:    expect(screen.getByText(/temporarily disabled/i)).toBeTruthy();
__tests__/app/buy-page.test.tsx:78:    expect(await screen.findByText(/Direct fiat on-ramp is coming soon/i)).toBeTruthy();
__tests__/app/buy-page.test.tsx:93:    expect(await screen.findByText(/Token swap support is coming soon/i)).toBeTruthy();
```

## 2) TODO / FIXME / TBD / STUB Markers

```text
app/api/groups/invites/route.ts:353: * DELETE /api/groups/invites?code=xxx
app/api/gamification/route.ts:100:    // Jest-only safeguard: if a default stub row is returned, re-query once
app/api/friends/route.ts:79: * GET /api/friends?address=xxx&status=accepted
app/api/friends/route.ts:466: * DELETE /api/friends?user1=xxx&user2=xxx
app/(marketing)/docs/page.group.tsx:21:          {/* TODO: Migrate content from existing docs/page.tsx (remove 'use client') */}
app/(marketing)/about/page.group.tsx:39:      {/* TODO: Migrate remaining sections from existing about/page.tsx */}
app/(marketing)/legal/page.group.tsx:18:          {/* TODO: Migrate content from existing legal/page.tsx (remove 'use client') */}
app/(marketing)/support/page.group.tsx:21:          {/* TODO: Migrate content from existing support/page.tsx (remove 'use client') */}
app/(commerce)/pos/page.group.tsx:63:      // TODO: Online flow — call /api/pos/charge, get QR code, show payment screen
app/(commerce)/store/[slug]/components/ProductCard.tsx:38:    // TODO: wire to cart context from CommerceProviders
components/checkout/CheckoutPanel.tsx:102:      // TODO: Wire to actual contract call
components/ui/alert.stories.tsx:10:  tags: ["autodocs"],
components/ui/tabs.stories.tsx:7:  tags: ["autodocs"],
components/ui/button.stories.tsx:10:  tags: ["autodocs"],
components/ui/dialog.stories.tsx:9:  tags: ["autodocs"],
components/ui/card.stories.tsx:10:  tags: ["autodocs"],
lib/seer/reasonCodes.ts:6:  whatToDo: string;
lib/seer/reasonCodes.ts:15:    whatToDo: 'Pause risky actions, gather context, and submit an appeal with evidence if this is incorrect.',
lib/seer/reasonCodes.ts:22:    whatToDo: 'Improve compliant activity and provide context in an appeal if there is a false positive.',
lib/seer/reasonCodes.ts:29:    whatToDo: 'Build score through normal protocol use and retry later or appeal with supporting detail.',
lib/seer/reasonCodes.ts:36:    whatToDo: 'Reduce action frequency and avoid burst behavior until limits reset.',
lib/seer/reasonCodes.ts:43:    whatToDo: 'Stop automation-like patterns and provide transaction context if legitimate.',
lib/seer/reasonCodes.ts:50:    whatToDo: 'Document intent and counterparties, then appeal if this was expected behavior.',
lib/seer/reasonCodes.ts:57:    whatToDo: 'Use smaller, spaced actions and submit extra context for manual review.',
lib/seer/reasonCodes.ts:64:    whatToDo: 'Monitor follow-up events and avoid repetitive high-risk behavior.',
lib/seer/reasonCodes.ts:71:    whatToDo: 'Wait for risk state to cool down and provide evidence if the signal is inaccurate.',
lib/seer/reasonCodes.ts:78:    whatToDo: 'Proceed cautiously and avoid large or repetitive actions during the monitored period.',
lib/seer/reasonCodes.ts:85:    whatToDo: 'Maintain compliant behavior while access is gradually restored.',
lib/seer/reasonCodes.ts:92:    whatToDo: 'Review your recent activity and submit an appeal if state appears incorrect.',
lib/seer/reasonCodes.ts:99:    whatToDo: 'Provide detailed evidence and request manual review via appeal.',
lib/seer/reasonCodes.ts:106:    whatToDo: 'Use appeal flow immediately and include full timeline + transaction evidence.',
lib/seer/reasonCodes.ts:113:    whatToDo: 'Continue compliant activity to preserve access improvements.',
lib/seer/reasonCodes.ts:120:    whatToDo: 'Provide proposal/vote context and intent in your appeal details.',
lib/seer/reasonCodes.ts:127:    whatToDo: 'Attach proposal rationale and supporting references for governance review.',
lib/seer/reasonCodes.ts:134:    whatToDo: 'Check governance context and published rationale if you need clarification.',
lib/seer/reasonCodes.ts:141:    whatToDo: 'No action needed unless event context appears incorrect.',
lib/seer/reasonCodes.ts:148:    whatToDo: 'Review reason and submit appeal evidence if reduction was incorrect.',
lib/seer/reasonCodes.ts:155:    whatToDo: 'Track final resolution notes and verify updated status in-app.',
lib/mobile.tsx:59:  singleToDouble: 'grid-cols-1 md:grid-cols-2',
lib/__tests__/stealthAddresses.test.ts:158:    // Provide a minimal localStorage stub
lib/wallet/VFIDEWalletProvider.tsx:74:        // TODO: Trigger RainbowKit modal
lib/preferences/userPreferences.tsx:228:    applyPreferencesToDocument(preferences);
lib/preferences/userPreferences.tsx:325:function applyPreferencesToDocument(prefs: UserPreferences): void {
scripts/validate-signoff-tests.ts:30:    name: "todo marker",
scripts/validate-signoff-tests.ts:31:    regex: /\bTODO\s*:/g,
test/hardhat/ContractGuardrails2.test.ts:206:    // Minimal timelock stub that satisfies extcodesize > 0
test/hardhat/generated/VFIDEBenefits.generated.test.ts:2: * AUTO-GENERATED on-chain test stub.
test/hardhat/generated/VFIDEBenefits.generated.test.ts:15:describe("VFIDEBenefits (generated stub)", () => {
test/hardhat/generated/StablecoinRegistry.generated.test.ts:2: * AUTO-GENERATED on-chain test stub.
test/hardhat/generated/StablecoinRegistry.generated.test.ts:15:describe("StablecoinRegistry (generated stub)", () => {
test/hardhat/generated/DAOTimelock.generated.test.ts:2: * AUTO-GENERATED on-chain test stub.
test/hardhat/generated/DAOTimelock.generated.test.ts:15:describe("DAOTimelock (generated stub)", () => {
test/hardhat/generated/SeerView.generated.test.ts:2: * AUTO-GENERATED on-chain test stub.
test/hardhat/generated/SeerView.generated.test.ts:15:describe("SeerView (generated stub)", () => {
test/hardhat/generated/SanctumVault.generated.test.ts:2: * AUTO-GENERATED on-chain test stub.
test/hardhat/generated/SanctumVault.generated.test.ts:15:describe("SanctumVault (generated stub)", () => {
test/hardhat/generated/TempVault.generated.test.ts:2: * AUTO-GENERATED on-chain test stub.
test/hardhat/generated/TempVault.generated.test.ts:15:describe("TempVault (generated stub)", () => {
test/hardhat/generated/SubscriptionManager.generated.test.ts:2: * AUTO-GENERATED on-chain test stub.
test/hardhat/generated/SubscriptionManager.generated.test.ts:15:describe("SubscriptionManager (generated stub)", () => {
test/hardhat/generated/BadgeRegistry.generated.test.ts:2: * AUTO-GENERATED on-chain test stub.
test/hardhat/generated/BadgeRegistry.generated.test.ts:15:describe("BadgeRegistry (generated stub)", () => {
test/hardhat/generated/PayrollManager.generated.test.ts:2: * AUTO-GENERATED on-chain test stub.
test/hardhat/generated/PayrollManager.generated.test.ts:15:describe("PayrollManager (generated stub)", () => {
test/hardhat/generated/GovernanceHooks.generated.test.ts:2: * AUTO-GENERATED on-chain test stub.
test/hardhat/generated/GovernanceHooks.generated.test.ts:15:describe("GovernanceHooks (generated stub)", () => {
test/hardhat/generated/SeerSocial.generated.test.ts:2: * AUTO-GENERATED on-chain test stub.
test/hardhat/generated/SeerSocial.generated.test.ts:15:describe("SeerSocial (generated stub)", () => {
test/hardhat/generated/BridgeSecurityModule.generated.test.ts:2: * AUTO-GENERATED on-chain test stub.
test/hardhat/generated/BridgeSecurityModule.generated.test.ts:15:describe("BridgeSecurityModule (generated stub)", () => {
test/hardhat/generated/VaultRegistry.generated.test.ts:2: * AUTO-GENERATED on-chain test stub.
test/hardhat/generated/VaultRegistry.generated.test.ts:15:describe("VaultRegistry (generated stub)", () => {
test/hardhat/generated/LiquidityIncentives.generated.test.ts:2: * AUTO-GENERATED on-chain test stub.
test/hardhat/generated/LiquidityIncentives.generated.test.ts:15:describe("LiquidityIncentives (generated stub)", () => {
test/hardhat/generated/DutyDistributor.generated.test.ts:2: * AUTO-GENERATED on-chain test stub.
test/hardhat/generated/DutyDistributor.generated.test.ts:15:describe("DutyDistributor (generated stub)", () => {
test/hardhat/generated/EmergencyControl.generated.test.ts:2: * AUTO-GENERATED on-chain test stub.
test/hardhat/generated/EmergencyControl.generated.test.ts:15:describe("EmergencyControl (generated stub)", () => {
test/hardhat/generated/VaultRecoveryClaim.generated.test.ts:2: * AUTO-GENERATED on-chain test stub.
test/hardhat/generated/VaultRecoveryClaim.generated.test.ts:15:describe("VaultRecoveryClaim (generated stub)", () => {
test/hardhat/generated/EscrowManager.generated.test.ts:2: * AUTO-GENERATED on-chain test stub.
test/hardhat/generated/EscrowManager.generated.test.ts:15:describe("EscrowManager (generated stub)", () => {
test/api/routes.test.ts:260:  it.todo("[M-06] should not accept JWT via query parameter");
__tests__/integration/state-management.test.tsx:412:          todos: [
__tests__/integration/state-management.test.tsx:418:        selectCompletedTodos: jest.fn(function(this: any) {
__tests__/integration/state-management.test.tsx:419:          return this.state.todos.filter((todo: any) => todo.completed);
__tests__/integration/state-management.test.tsx:421:        selectActiveTodos: jest.fn(function(this: any) {
__tests__/integration/state-management.test.tsx:422:          return this.state.todos.filter((todo: any) => !todo.completed);
__tests__/integration/state-management.test.tsx:424:        selectTodoCount: jest.fn(function(this: any) {
__tests__/integration/state-management.test.tsx:426:            total: this.state.todos.length,
__tests__/integration/state-management.test.tsx:427:            completed: this.selectCompletedTodos().length,
__tests__/integration/state-management.test.tsx:428:            active: this.selectActiveTodos().length,
__tests__/integration/state-management.test.tsx:433:      const completed = store.selectCompletedTodos();
__tests__/integration/state-management.test.tsx:434:      const counts = store.selectTodoCount();
__tests__/security/owasp-top-10.test.ts:323:    it.todo('disables directory listing');
__tests__/security/owasp-top-10.test.ts:345:    it.todo('uses up-to-date dependencies');
__tests__/security/owasp-top-10.test.ts:416:    it.todo('validates CI/CD pipeline integrity');
__tests__/coverage/coverage-summary.test.ts:121:    it.todo('should have unit tests');
__tests__/coverage/coverage-summary.test.ts:123:    it.todo('should have integration tests');
__tests__/coverage/coverage-summary.test.ts:125:    it.todo('should have accessibility tests');
__tests__/coverage/coverage-summary.test.ts:127:    it.todo('should have performance tests');
__tests__/coverage/coverage-summary.test.ts:188:    it.todo('should test success paths');
__tests__/coverage/coverage-summary.test.ts:190:    it.todo('should test error paths');
__tests__/coverage/coverage-summary.test.ts:192:    it.todo('should test edge cases');
__tests__/coverage/coverage-summary.test.ts:194:    it.todo('should test accessibility');
__tests__/coverage/coverage-summary.test.ts:243:    it.todo('should pass all tests');
__tests__/coverage/coverage-summary.test.ts:245:    it.todo('should have no skipped tests');
__tests__/coverage/coverage-summary.test.ts:247:    it.todo('should have fast test execution');
__tests__/security-advanced.test.ts:388:  it.todo('validates Content-Type for POST requests');
__tests__/security-advanced.test.ts:390:  it.todo('enforces request size limits');
__tests__/app/theme-showcase-page.test.tsx:13:  const Stub = ({ children }: { children?: React.ReactNode }) => <div>{children || 'ui-stub'}</div>;
__tests__/app/theme-showcase-page.test.tsx:20:    TrustCard: Stub,
__tests__/app/theme-showcase-page.test.tsx:28:    SparkleOnHover: Stub,
```

## 3) Mock Directories

```text
./__mocks__
./lib/__mocks__
./node_modules/eslint-plugin-jsx-a11y/__mocks__
./node_modules/next/dist/build/jest/__mocks__
```

## 4) Mock-Named Files

```text
./__mocks__/isomorphic-dompurify.js
./__mocks__/minimatch-compat.cjs
./__mocks__/sentry-nextjs.js
./__mocks__/uncrypto.js
./artifacts/contracts/mocks/BridgeGovernanceVerifierMocks.sol/ILayerZeroReceiverForBridgeMock.json
./artifacts/contracts/mocks/BridgeGovernanceVerifierMocks.sol/MockLzEndpointForBridge.json
./artifacts/contracts/mocks/CardBoundVaultVerifierMocks.sol/MockVFIDEForCardBound.json
./artifacts/contracts/mocks/CardBoundVaultVerifierMocks.sol/MockVaultRegistryForCardBound.json
./artifacts/contracts/mocks/DevReserveVestingBehaviorMocks.sol/MockSecurityHub.json
./artifacts/contracts/mocks/DevReserveVestingBehaviorMocks.sol/MockToken.json
./artifacts/contracts/mocks/DevReserveVestingBehaviorMocks.sol/MockVaultHub.json
./artifacts/contracts/mocks/EcosystemWorkRewardsVerifierMocks.sol/MockSeerForEcosystem.json
./artifacts/contracts/mocks/EcosystemWorkRewardsVerifierMocks.sol/MockTokenForEcosystem.json
./artifacts/contracts/mocks/EscrowManagerVerifierMocks.sol/MockSeerForEscrow.json
./artifacts/contracts/mocks/EscrowManagerVerifierMocks.sol/MockTokenForEscrow.json
./artifacts/contracts/mocks/MockSeerAuto.sol/MockSeerAuto.json
./artifacts/contracts/mocks/NextOfKinInheritanceVerifierMocks.sol/MockVFIDEForInheritance.json
./artifacts/contracts/mocks/NextOfKinInheritanceVerifierMocks.sol/MockVaultHubForInheritance.json
./artifacts/contracts/mocks/OwnerControlPanelGuardrailMocks.sol/MockEcosystemVaultAdminForOwnerControlPanel.json
./artifacts/contracts/mocks/OwnerControlPanelGuardrailMocks.sol/MockVFIDETokenForOwnerControlPanel.json
./artifacts/contracts/mocks/ProofScoreBurnRouterVerifierMocks.sol/MockSeerForBurnRouter.json
./artifacts/contracts/mocks/ProofScoreBurnRouterVerifierMocks.sol/MockTokenForBurnRouter.json
./artifacts/test/contracts/helpers/EcosystemVaultPayExpenseHelpers.sol/QuoteMockSwapRouter.json
./artifacts/test/contracts/mocks/BurnRouterMock.sol/BurnRouterMock.json
./artifacts/test/contracts/mocks/DevReserveVestingVaultMock.sol/DevReserveVestingVaultMock.json
./artifacts/test/contracts/mocks/ERC20DecimalsMock.sol/ERC20DecimalsMock.json
./artifacts/test/contracts/mocks/ERC20Mock.sol/ERC20Mock.json
./artifacts/test/contracts/mocks/InterfaceMocks.sol/DAOMock.json
./artifacts/test/contracts/mocks/InterfaceMocks.sol/EmergencyBreakerMock.json
./artifacts/test/contracts/mocks/InterfaceMocks.sol/GuardianLockMock.json
./artifacts/test/contracts/mocks/InterfaceMocks.sol/PanicGuardInterfaceMock.json
./artifacts/test/contracts/mocks/InterfaceMocks.sol/SanctumMockSimple.json
./artifacts/test/contracts/mocks/InterfaceMocks.sol/TimelockMock.json
./artifacts/test/contracts/mocks/LedgerMock.sol/LedgerMock.json
./artifacts/test/contracts/mocks/MerchantRegistryMock.sol/MerchantRegistryMock.json
./artifacts/test/contracts/mocks/MockContracts.sol/MockERC20.json
./artifacts/test/contracts/mocks/MockContracts.sol/MockFlashLoanProvider.json
./artifacts/test/contracts/mocks/MockContracts.sol/MockNonStandardERC20.json
./artifacts/test/contracts/mocks/MockContracts.sol/MockReentrantAttacker.json
./artifacts/test/contracts/mocks/MockContracts.sol/MockReentrantReceiver.json
./artifacts/test/contracts/mocks/MockContracts.sol/MockReentrantToken.json
./artifacts/test/contracts/mocks/MockContracts.sol/MockRevertingBurnERC20.json
./artifacts/test/contracts/mocks/MockERC20.sol/MockERC20.json
./artifacts/test/contracts/mocks/MockEcosystemVault.sol/MockMerchantRebateVault.json
./artifacts/test/contracts/mocks/MockSwapRouter.sol/MockSwapRouter.json
./artifacts/test/contracts/mocks/PanicGuardMock.sol/PanicGuardMock.json
./artifacts/test/contracts/mocks/ReenterTargetMock.sol/ReenterTargetMock.json
./artifacts/test/contracts/mocks/SanctumMock.sol/SanctumMock.json
./artifacts/test/contracts/mocks/SecurityHubMock.sol/SecurityHubMock.json
./artifacts/test/contracts/mocks/SeerMock.sol/SeerMock.json
./artifacts/test/contracts/mocks/SimpleVaultMock.sol/MockVault_Simple.json
./artifacts/test/contracts/mocks/StablecoinRegistryMock.sol/StablecoinRegistryMock.json
./artifacts/test/contracts/mocks/TreasuryMock.sol/TreasuryMock.json
./artifacts/test/contracts/mocks/VFIDEFinanceMocks.sol/EcoTreasuryVaultMock.json
./artifacts/test/contracts/mocks/VFIDEFinanceMocks.sol/FIStablecoinRegistryMock.json
./artifacts/test/contracts/mocks/VaultHubMock.sol/VaultHubMock.json
./artifacts/test/contracts/mocks/VerificationMocks.sol/MockVaultHub.json
./cache/test-artifacts/test/contracts/helpers/EcosystemVaultPayExpenseHelpers.sol/QuoteMockSwapRouter.json
./cache/test-artifacts/test/contracts/mocks/BurnRouterMock.sol/BurnRouterMock.json
./cache/test-artifacts/test/contracts/mocks/DevReserveVestingVaultMock.sol/DevReserveVestingVaultMock.json
./cache/test-artifacts/test/contracts/mocks/ERC20DecimalsMock.sol/ERC20DecimalsMock.json
./cache/test-artifacts/test/contracts/mocks/ERC20Mock.sol/ERC20Mock.json
./cache/test-artifacts/test/contracts/mocks/InterfaceMocks.sol/DAOMock.json
./cache/test-artifacts/test/contracts/mocks/InterfaceMocks.sol/EmergencyBreakerMock.json
./cache/test-artifacts/test/contracts/mocks/InterfaceMocks.sol/GuardianLockMock.json
./cache/test-artifacts/test/contracts/mocks/InterfaceMocks.sol/PanicGuardInterfaceMock.json
./cache/test-artifacts/test/contracts/mocks/InterfaceMocks.sol/SanctumMockSimple.json
./cache/test-artifacts/test/contracts/mocks/InterfaceMocks.sol/TimelockMock.json
./cache/test-artifacts/test/contracts/mocks/LedgerMock.sol/LedgerMock.json
./cache/test-artifacts/test/contracts/mocks/MerchantRegistryMock.sol/MerchantRegistryMock.json
./cache/test-artifacts/test/contracts/mocks/MockContracts.sol/MockERC20.json
./cache/test-artifacts/test/contracts/mocks/MockContracts.sol/MockFlashLoanProvider.json
./cache/test-artifacts/test/contracts/mocks/MockContracts.sol/MockNonStandardERC20.json
./cache/test-artifacts/test/contracts/mocks/MockContracts.sol/MockReentrantAttacker.json
./cache/test-artifacts/test/contracts/mocks/MockContracts.sol/MockReentrantReceiver.json
./cache/test-artifacts/test/contracts/mocks/MockContracts.sol/MockReentrantToken.json
./cache/test-artifacts/test/contracts/mocks/MockERC20.sol/MockERC20.json
./cache/test-artifacts/test/contracts/mocks/MockEcosystemVault.sol/MockMerchantRebateVault.json
./cache/test-artifacts/test/contracts/mocks/MockSwapRouter.sol/MockSwapRouter.json
./cache/test-artifacts/test/contracts/mocks/PanicGuardMock.sol/PanicGuardMock.json
./cache/test-artifacts/test/contracts/mocks/ReenterTargetMock.sol/ReenterTargetMock.json
./cache/test-artifacts/test/contracts/mocks/SanctumMock.sol/SanctumMock.json
./cache/test-artifacts/test/contracts/mocks/SecurityHubMock.sol/SecurityHubMock.json
./cache/test-artifacts/test/contracts/mocks/SeerMock.sol/SeerMock.json
./cache/test-artifacts/test/contracts/mocks/SimpleVaultMock.sol/MockVault_Simple.json
./cache/test-artifacts/test/contracts/mocks/StablecoinRegistryMock.sol/StablecoinRegistryMock.json
./cache/test-artifacts/test/contracts/mocks/TreasuryMock.sol/TreasuryMock.json
./cache/test-artifacts/test/contracts/mocks/VFIDEFinanceMocks.sol/EcoTreasuryVaultMock.json
./cache/test-artifacts/test/contracts/mocks/VFIDEFinanceMocks.sol/FIStablecoinRegistryMock.json
./cache/test-artifacts/test/contracts/mocks/VaultHubMock.sol/VaultHubMock.json
./cache/test-artifacts/test/contracts/mocks/VerificationMocks.sol/MockVaultHub.json
./components/dev/MockServiceWorker.tsx
./contracts/mocks/BridgeGovernanceVerifierMocks.sol
./contracts/mocks/CardBoundVaultVerifierMocks.sol
./contracts/mocks/DevReserveVestingBehaviorMocks.sol
./contracts/mocks/EcosystemWorkRewardsVerifierMocks.sol
./contracts/mocks/EscrowManagerVerifierMocks.sol
./contracts/mocks/MockSeerAuto.sol
./contracts/mocks/NextOfKinInheritanceVerifierMocks.sol
./contracts/mocks/OwnerControlPanelGuardrailMocks.sol
./contracts/mocks/ProofScoreBurnRouterVerifierMocks.sol
./docs/stub-mock-placeholder-report-2026-04-12.md
./lib/__mocks__/chains.ts
./lib/__mocks__/contracts.ts
./lib/__mocks__/testnet.ts
./patches/duplicate-mock-contract-fix.diff
./public/mockServiceWorker.js
./test/contracts/mocks/BurnRouterMock.sol
./test/contracts/mocks/DevReserveVestingVaultMock.sol
./test/contracts/mocks/ERC20DecimalsMock.sol
./test/contracts/mocks/ERC20Mock.sol
./test/contracts/mocks/InterfaceMocks.sol
./test/contracts/mocks/LedgerMock.sol
./test/contracts/mocks/MerchantRegistryMock.sol
./test/contracts/mocks/MockContracts.sol
./test/contracts/mocks/MockERC20.sol
./test/contracts/mocks/MockEcosystemVault.sol
./test/contracts/mocks/MockSwapRouter.sol
./test/contracts/mocks/PanicGuardMock.sol
./test/contracts/mocks/ReenterTargetMock.sol
./test/contracts/mocks/SanctumMock.sol
./test/contracts/mocks/SecurityHubMock.sol
./test/contracts/mocks/SeerMock.sol
./test/contracts/mocks/SimpleVaultMock.sol
./test/contracts/mocks/StablecoinRegistryMock.sol
./test/contracts/mocks/TreasuryMock.sol
./test/contracts/mocks/VFIDEFinanceMocks.sol
./test/contracts/mocks/VaultHubMock.sol
./test/contracts/mocks/VerificationMocks.sol
```

## 5) Files Using jest.mock / vi.mock

```text
__tests__/a11y/page-accessibility.test.tsx
__tests__/api/activities.test.ts
__tests__/api/analytics.test.ts
__tests__/api/attachments/id.test.ts
__tests__/api/attachments/upload.test.ts
__tests__/api/auth-challenge.test.ts
__tests__/api/auth.test.ts
__tests__/api/auth/logout.test.ts
__tests__/api/auth/revoke.test.ts
__tests__/api/badges.test.ts
__tests__/api/crypto/balance.test.ts
__tests__/api/crypto/fees.test.ts
__tests__/api/crypto/payment-requests.test.ts
__tests__/api/crypto/payment-requests/id.test.ts
__tests__/api/crypto/price.test.ts
__tests__/api/crypto/rewards.test.ts
__tests__/api/crypto/rewards/claim.test.ts
__tests__/api/crypto/transactions.test.ts
__tests__/api/csrf.test.ts
__tests__/api/endorsements.test.ts
__tests__/api/errors.test.ts
__tests__/api/flashloans-lanes.test.ts
__tests__/api/friends.test.ts
__tests__/api/gamification-fairness.test.ts
__tests__/api/gamification.test.ts
__tests__/api/groups/invites.test.ts
__tests__/api/groups/join.test.ts
__tests__/api/groups/members.test.ts
__tests__/api/groups/messages.test.ts
__tests__/api/groups/route.test.ts
__tests__/api/health.test.ts
__tests__/api/leaderboard/claim-prize.test.ts
__tests__/api/leaderboard/headhunter.test.ts
__tests__/api/leaderboard/monthly.test.ts
__tests__/api/merchant/coupons.test.ts
__tests__/api/merchant/customers.test.ts
__tests__/api/merchant/expenses.test.ts
__tests__/api/merchant/gift-cards.test.ts
__tests__/api/merchant/installments.test.ts
__tests__/api/merchant/locations.test.ts
__tests__/api/merchant/loyalty.test.ts
__tests__/api/merchant/payments-confirm-idempotency.test.ts
__tests__/api/merchant/payments-confirm.test.ts
__tests__/api/merchant/receipt-sms.test.ts
__tests__/api/merchant/returns.test.ts
__tests__/api/merchant/staff.test.ts
__tests__/api/merchant/suppliers.test.ts
__tests__/api/merchant/wholesale.test.ts
__tests__/api/merchant/withdraw.test.ts
__tests__/api/messages.test.ts
__tests__/api/messages/delete.test.ts
__tests__/api/messages/edit.test.ts
__tests__/api/messages/reaction.test.ts
__tests__/api/notifications.test.ts
__tests__/api/notifications/preferences.test.ts
__tests__/api/notifications/push.test.ts
__tests__/api/notifications/vapid.test.ts
__tests__/api/performance/metrics.test.ts
__tests__/api/proposals.test.ts
__tests__/api/push/subscribe.test.ts
__tests__/api/quests/achievements.test.ts
__tests__/api/quests/achievements/claim.test.ts
__tests__/api/quests/claim.test.ts
__tests__/api/quests/daily.test.ts
__tests__/api/quests/notifications.test.ts
__tests__/api/quests/onboarding.test.ts
__tests__/api/quests/streak.test.ts
__tests__/api/quests/weekly.test.ts
__tests__/api/quests/weekly/claim.test.ts
__tests__/api/remittance/beneficiaries.test.ts
__tests__/api/security-keys.test.ts
__tests__/api/security/2fa-initiate.test.ts
__tests__/api/security/anomaly.test.ts
__tests__/api/security/csp-report.test.ts
__tests__/api/security/guardian-attestations.test.ts
__tests__/api/security/logs.test.ts
__tests__/api/security/next-of-kin-fraud-events.test.ts
__tests__/api/security/qr-signature-events.test.ts
__tests__/api/security/recovery-fraud-events.test.ts
__tests__/api/security/violations.test.ts
__tests__/api/security/webhook-consumer-example.test.ts
__tests__/api/security/webhook-replay-metrics.test.ts
__tests__/api/seer/analytics.test.ts
__tests__/api/social-api-routes.test.ts
__tests__/api/sync.test.ts
__tests__/api/transactions/export.test.ts
__tests__/api/users.test.ts
__tests__/api/users/address.test.ts
__tests__/api/ussd.test.ts
__tests__/app-pages-coverage.test.ts
__tests__/app/AppPages.test.tsx
__tests__/app/FlashloansPage.test.tsx
__tests__/app/about-page.test.tsx
__tests__/app/achievements-page.test.tsx
__tests__/app/admin-page.test.tsx
__tests__/app/appeals-page.test.tsx
__tests__/app/badges-page.test.tsx
__tests__/app/benefits-page.test.tsx
__tests__/app/budgets-page.test.tsx
__tests__/app/buy-page.test.tsx
__tests__/app/checkout-id-page-param-guard.test.tsx
__tests__/app/control-panel-page.test.tsx
__tests__/app/council-page.test.tsx
__tests__/app/cross-chain-page.test.tsx
__tests__/app/crypto-page.test.tsx
__tests__/app/dao-hub-page.test.tsx
__tests__/app/dashboard-page.test.tsx
__tests__/app/demo-crypto-social-page.test.tsx
__tests__/app/docs-page.test.tsx
__tests__/app/endorsements-page.test.tsx
__tests__/app/enterprise-page.test.tsx
__tests__/app/escrow-page.test.tsx
__tests__/app/explorer-id-page.test.tsx
__tests__/app/explorer-page.test.tsx
__tests__/app/feed-page.test.tsx
__tests__/app/flashloan-page.test.tsx
__tests__/app/flashloans-page.test.tsx
__tests__/app/flashloans-workspace-page.test.tsx
__tests__/app/governance-page.test.tsx
__tests__/app/guardians-next-of-kin.test.tsx
__tests__/app/guardians-page.test.tsx
__tests__/app/hardware-wallet-page.test.tsx
__tests__/app/headhunter-page.test.tsx
__tests__/app/home-page.test.tsx
__tests__/app/insights-page.test.tsx
__tests__/app/invite-code-page-param-guard.test.tsx
__tests__/app/invite-code-page.test.tsx
__tests__/app/invite-page.test.tsx
__tests__/app/leaderboard-page.test.tsx
__tests__/app/legal-page.test.tsx
__tests__/app/live-demo-page.test.tsx
__tests__/app/marketplace-page.test.tsx
__tests__/app/merchant-page.test.tsx
__tests__/app/merchant-setup-page.test.tsx
__tests__/app/merchant-wholesale-page.test.tsx
__tests__/app/multisig-page.test.tsx
__tests__/app/notifications-page-error-boundary.test.tsx
__tests__/app/notifications-page.test.tsx
__tests__/app/paper-wallet-page.test.tsx
__tests__/app/pay-page.test.tsx
__tests__/app/payroll-page.test.tsx
__tests__/app/performance-page.test.tsx
__tests__/app/pos-page.test.tsx
__tests__/app/price-alerts-page.test.tsx
__tests__/app/product-id-page-param-guard.test.tsx
__tests__/app/product-info-cart.test.tsx
__tests__/app/profile-page.test.tsx
__tests__/app/quests-page.test.tsx
__tests__/app/reporting-page.test.tsx
__tests__/app/rewards-page.test.tsx
__tests__/app/sanctum-page.test.tsx
__tests__/app/security-center-page.test.tsx
__tests__/app/seer-academy-page.test.tsx
__tests__/app/seer-service-page.test.tsx
__tests__/app/setup-page.test.tsx
__tests__/app/social-hub-page.test.tsx
__tests__/app/social-messaging-page.test.tsx
__tests__/app/social-page.test.tsx
__tests__/app/social-payments-page.test.tsx
__tests__/app/stealth-page.test.tsx
__tests__/app/store-client-cart.test.tsx
__tests__/app/store-slug-page-param-guard.test.tsx
__tests__/app/stories-page.test.tsx
__tests__/app/streaming-page.test.tsx
__tests__/app/subscriptions-page.test.tsx
__tests__/app/support-page.test.tsx
__tests__/app/taxes-page.test.tsx
__tests__/app/testnet-page.test.tsx
__tests__/app/theme-manager-page.test.tsx
__tests__/app/theme-page.test.tsx
__tests__/app/theme-showcase-page.test.tsx
__tests__/app/time-locks-page.test.tsx
__tests__/app/token-launch-page.test.tsx
__tests__/app/treasury-page.test.tsx
__tests__/app/uploaded-handoff-pages.test.tsx
__tests__/app/vault-page.test.tsx
__tests__/app/vault-recover-page.test.tsx
__tests__/app/vault-settings-page.test.tsx
__tests__/app/vesting-page.test.tsx
__tests__/components.test.tsx
__tests__/components/AnimatedCounter.test.tsx
__tests__/components/Animations.test.tsx
__tests__/components/BadgeComponents.test.tsx
__tests__/components/BadgeMinterProgress.test.tsx
__tests__/components/CommercePOS.test.tsx
__tests__/components/CommerceStats.test.tsx
__tests__/components/ConfirmModal.test.tsx
__tests__/components/CrossChainTransfer.test.tsx
__tests__/components/DAOComponents.test.tsx
__tests__/components/DashboardCardsTests.test.tsx
__tests__/components/DemoModeBanner.test.tsx
__tests__/components/EmptyState.test.tsx
__tests__/components/EtherscanLink.test.tsx
__tests__/components/FaucetButtonReal.test.tsx
__tests__/components/FormElements.test.tsx
__tests__/components/GlowingCard.test.tsx
__tests__/components/HelpCenterTests.test.tsx
__tests__/components/HelpTooltip.test.tsx
__tests__/components/LayoutComponents.test.tsx
__tests__/components/LayoutDemoMobile.test.tsx
__tests__/components/LiveActivityFeedTests.test.tsx
__tests__/components/LoadingButton.test.tsx
__tests__/components/MerchantComponents.test.tsx
__tests__/components/MerchantDashboardReal.test.tsx
__tests__/components/NetworkSwitchOverlayTests.test.tsx
__tests__/components/NetworkWarning.test.tsx
__tests__/components/NotificationCenter.test.tsx
__tests__/components/NotificationCenterTests.test.tsx
__tests__/components/OnboardingComponents.test.tsx
__tests__/components/OnboardingComponentsTests.test.tsx
__tests__/components/OnboardingHelpCenter.test.tsx
__tests__/components/OnboardingManagerReal.test.tsx
__tests__/components/OnboardingManagerTests.test.tsx
__tests__/components/OnboardingWizards.test.tsx
__tests__/components/PageLayout.test.tsx
__tests__/components/PageLayoutTests.test.tsx
__tests__/components/PaymentInterfaceTests.test.tsx
__tests__/components/PaymentQRTests.test.tsx
__tests__/components/ProgressSteps.test.tsx
__tests__/components/ProofScoreRing.test.tsx
__tests__/components/SecurityComponents.test.tsx
__tests__/components/SecurityGuardianPanel.test.tsx
__tests__/components/Skeleton.test.tsx
__tests__/components/SponsorMenteeModalTests.test.tsx
__tests__/components/StatsComponents.test.tsx
__tests__/components/TestnetBadge.test.tsx
__tests__/components/Toast.test.tsx
__tests__/components/TokenBalance.test.tsx
__tests__/components/TokenComponents.test.tsx
__tests__/components/TransactionNotificationTests.test.tsx
__tests__/components/TransactionPending.test.tsx
__tests__/components/TransactionPreviewTests.test.tsx
__tests__/components/TrustComponents.test.tsx
__tests__/components/TrustMentorBadge.test.tsx
__tests__/components/TrustMentorDashboard.test.tsx
__tests__/components/TrustProofScoreVisualizer.test.tsx
__tests__/components/UIComponents.test.tsx
__tests__/components/UIErrorBoundary.test.tsx
__tests__/components/UIPageLayout.test.tsx
__tests__/components/UITransactionSuccess.test.tsx
__tests__/components/VFIDEDashboard.test.tsx
__tests__/components/VaultActionsModal.test.tsx
__tests__/components/VaultComponents.test.tsx
__tests__/components/VaultHubComponents.test.tsx
__tests__/components/VaultPanels.test.tsx
__tests__/components/VaultSecurityPanelReal.test.tsx
__tests__/components/VaultSettingsPanel.test.tsx
__tests__/components/VaultStatusIndicatorReal.test.tsx
__tests__/components/VaultStatusModalFull.test.tsx
__tests__/components/WalletComponents.test.tsx
__tests__/components/WalletConnectionComponents.test.tsx
__tests__/components/WalletDisplay.test.tsx
__tests__/components/WalletLegacyVariants.test.tsx
__tests__/components/WalletSimpleConnect.test.tsx
__tests__/components/WalletWeb3Provider.test.tsx
__tests__/components/checkout-panel-payment.test.tsx
__tests__/components/pending-transactions-hook.test.tsx
__tests__/components/simplified-pos-integrations.test.tsx
__tests__/components/social-storage-safety.test.tsx
__tests__/components/uploaded-navigation-and-social.test.tsx
__tests__/comprehensive-coverage.test.ts
__tests__/coverage/components/enhanced-wallet-connect.test.tsx
__tests__/coverage/hooks/useAPI.test.ts
__tests__/coverage/hooks/useENS.test.ts
__tests__/coverage/hooks/useErrorTracking.test.ts
__tests__/coverage/hooks/useGasPrice.test.ts
__tests__/coverage/hooks/useThemeManager.test.ts
__tests__/crypto-social-integration.test.tsx
__tests__/debug-profile.test.tsx
__tests__/hooks.test.ts
__tests__/hooks/useAppealsReal.test.ts
__tests__/hooks/useBadgeHooks.test.ts
__tests__/hooks/useDAOHooks.test.ts
__tests__/hooks/useDAOHooksReal.test.ts
__tests__/hooks/useHeadhunterHooksReal.test.ts
__tests__/hooks/useMentorHooks.test.ts
__tests__/hooks/useMentorHooksReal.test.ts
__tests__/hooks/useMerchantHooksReal.test.ts
__tests__/hooks/useMerchantStatus.test.ts
__tests__/hooks/useProofScoreHooks.test.ts
__tests__/hooks/useProofScoreHooksReal.test.ts
__tests__/hooks/useProofScoreReal.test.ts
__tests__/hooks/useSecurityHooksReal.test.ts
__tests__/hooks/useSimpleVault.test.ts
__tests__/hooks/useSimpleVaultReal.test.ts
__tests__/hooks/useUtilityHooks.test.ts
__tests__/hooks/useUtilityHooksReal.test.ts
__tests__/hooks/useVFIDEBalance.test.ts
__tests__/hooks/useVaultHooksReal.test.ts
__tests__/hooks/useVaultHubReal.test.ts
__tests__/hooks/useVaultRecoveryReal.test.ts
__tests__/hooks/useVaultRecoveryTests.test.ts
__tests__/hooks/useVaultRegistryReal.test.ts
__tests__/lib/cryptoValidation-gas.test.ts
__tests__/lib/vfide-hooks-module.test.ts
__tests__/mobile/MobileOptimization.test.tsx
__tests__/pages/pages-smoke.test.tsx
__tests__/useDAOHooks.test.ts
__tests__/useMerchantHooks.test.ts
__tests__/useProofScoreHooks.test.ts
__tests__/useVaultHooks.test.ts
__tests__/useVaultHub.test.ts
__tests__/wagmi-config.test.ts
app/dao-hub/__tests__/page.test.tsx
app/social-hub/__tests__/page.test.tsx
components/__tests__/DemoModeBanner.test.tsx
components/__tests__/LessonModal.test.tsx
components/onboarding/__tests__/HelpCenter.mobile.test.tsx
components/social/__tests__/SocialNotifications.mobile.test.tsx
components/wallet/__tests__/ChainSelector.mobile.test.tsx
hooks/__tests__/useMerchantHooksExtended.test.ts
hooks/__tests__/useMerchantStatus.test.ts
hooks/__tests__/useProofScore.test.ts
hooks/__tests__/useProofScoreReal.test.ts
hooks/__tests__/useSecurityHooksReal.test.ts
hooks/__tests__/useSimpleVaultExtended.test.ts
hooks/__tests__/useVFIDEBalance.test.ts
hooks/__tests__/useVaultHooks.test.ts
hooks/__tests__/useVaultHooksReal.test.ts
hooks/__tests__/useVaultHubExtended.test.ts
hooks/__tests__/useVaultRegistryExtended.test.ts
hooks/useProofScore.test.ts
lib/security/__tests__/accountProtection.test.ts
```

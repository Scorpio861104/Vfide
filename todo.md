# Frontend Button & Function Functionality Audit

## Phase 1: Discovery
- [ ] Enumerate every page (app/**/page.tsx)
- [ ] Enumerate every component with onClick/onSubmit handlers
- [ ] Map all buttons → their handler functions
- [ ] Detect dead handlers (onClick={() => {}}, TODO, console.log only, etc.)

## Phase 2: Scanner
- [ ] Build scripts/button-functionality-audit.cjs static scanner
- [ ] Detect: empty handlers, TODO-only handlers, console-only handlers
- [ ] Detect: forms without onSubmit
- [ ] Detect: links to undefined routes (href="#" without onClick)

## Phase 3: Manual review per surface
- [ ] Wallet / connect flows
- [ ] Vault create / lock / unlock / withdraw / payment queue
- [ ] Merchant register / pay / refund / settle
- [ ] Governance: proposals / votes / elections
- [ ] Sanctum: charity / disbursement
- [ ] Headhunter: claim
- [ ] Splitter
- [ ] Staking
- [ ] Escrow / Commerce
- [ ] Inheritance / NextOfKin
- [ ] Admin / Owner Control Panel
- [ ] Settings / Profile / Account
- [ ] Footer / nav / pie menu

## Phase 4: Fix all real defects

## Phase 5: Re-run all five audits to confirm 0/0/0

## Phase 6: Git commit + push

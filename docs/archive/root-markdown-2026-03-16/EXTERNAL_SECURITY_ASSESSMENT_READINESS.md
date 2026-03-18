# External Security Assessment Readiness

This checklist prepares VFIDE for an external wallet-attack-focused security assessment.

## Scope

- Authentication and SIWE challenge flow
- WebSocket auth transport
- Messaging encryption and key directory
- Payment request high-risk controls
- Step-up authentication and lockout behavior

## Evidence Bundle

- Threat model and data flow diagrams
- API route inventory with auth model
- Key management and rotation model
- Test evidence (unit, integration, E2E)
- Security headers and deployment config

## Wallet Attack Scenarios to Include

- Signature phishing and replay attempts
- Address poisoning and lookalike recipient attacks
- Unlimited token approval abuse
- Session hijack and token reuse
- Rapid key rotation abuse
- Multi-IP anomalous access patterns

## Required Test Artifacts

- [__tests__/api/security-keys.test.ts](__tests__/api/security-keys.test.ts)
- [__tests__/security/key-directory.test.ts](__tests__/security/key-directory.test.ts)
- [__tests__/security/message-storage-hardening.test.ts](__tests__/security/message-storage-hardening.test.ts)
- [__tests__/api/crypto/payment-requests.test.ts](__tests__/api/crypto/payment-requests.test.ts)

## Pre-Assessment Commands

```bash
npm run lint
npm run typecheck
npm run test -- --runInBand
npm run test:e2e
```

## External Assessor Requests

- Attempt replaying SIWE messages after nonce consumption
- Attempt high-risk payment requests without step-up headers
- Attempt rapid key rotation to trigger lock mechanism
- Attempt websocket auth without Authorization bearer token
- Attempt signed key publication with stale timestamps

## Acceptance Criteria

- No critical or high-severity wallet-drain path
- No replayable auth signature paths
- No plaintext message content persisted at rest in browser storage
- High-risk actions require explicit user intent + additional controls

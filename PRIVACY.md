# VFIDE Data Retention & Privacy Policy

> **Document version:** 1.0  
> **Effective date:** 2026-03-01  
> **Scope:** All data processed by the VFIDE platform including the web application, API layer, WebSocket server, and smart contracts.

---

## 1. Data We Collect

| Category | Examples | Storage Location |
|----------|---------|-----------------|
| Wallet identity | Ethereum address (public) | PostgreSQL `users` table |
| Session tokens | JWT (hashed), refresh token | PostgreSQL `sessions` table |
| TOTP secrets | Encrypted TOTP seed | PostgreSQL `totp_secrets` table |
| Transaction records | On-chain tx hash, amount, timestamp | PostgreSQL `transactions` table |
| Vault activity | Vault address, action, timestamp | PostgreSQL `vault_events` table |
| API logs | Endpoint, response code, timestamp | Application logs (no PII beyond wallet) |
| Error telemetry | Stack trace, request ID | Sentry (wallet address redacted) |

**Blockchain data** (wallet addresses, transaction hashes, amounts) is permanently recorded on-chain and falls outside GDPR's right-to-erasure because it is public and cannot be altered. This is disclosed at point of use.

---

## 2. Retention Periods

| Data Category | Retention Period | Rationale |
|--------------|----------------|-----------|
| User account (wallet address, email if provided) | Duration of active account + 30 days after deletion request | Allows dispute resolution window |
| Session tokens | 24 hours (JWT TTL) + 7-day rolling refresh window | `JWT_EXPIRES_IN = '24h'` |
| Transaction history (off-chain copy) | 90 days rolling | Compliance and dispute resolution |
| Vault event logs | 90 days rolling | Operational auditing |
| API request logs | 30 days | Security investigation window |
| Error telemetry (Sentry) | 30 days | Bug resolution |
| Blacklist / sanctions records | Duration of sanction + 90 days | Regulatory obligation |
| TOTP secrets | Deleted immediately on account deletion | No ongoing need |
| User messages (WebSocket) | Not persisted; in-memory only per session | No retention needed |
| Analytics / usage data | 12 months (anonymized after 30 days) | Product improvement |

---

## 3. Right to Erasure (GDPR Article 17 / CCPA)

### 3.1 Erasure Request Process

1. **Submit request:** User submits deletion request via `/api/account/delete` (authenticated endpoint) or by emailing `privacy@vfide.io`.
2. **Identity verification:** Request must come from an authenticated session (valid JWT) or be verified via a signed message from the wallet address.
3. **30-day processing window:** All erasable data deleted within 30 days. Confirmation email sent on completion.
4. **Exceptions acknowledged:** Blockchain records (public on-chain data) cannot be erased. User is notified of this limitation at account creation.

### 3.2 What Gets Erased

| Data | Action |
|------|--------|
| User account record | Hard-deleted from `users` table |
| Session tokens | All sessions revoked and hard-deleted |
| TOTP secret | Hard-deleted |
| Off-chain transaction copies | Soft-deleted immediately; purged in next 30-day sweep |
| Vault event logs | Anonymized (wallet address replaced with `[DELETED]`) |
| Email address | Hard-deleted |
| API logs containing wallet address | Anonymized within 30 days |
| Sentry error events | Purged from Sentry within 30 days |

### 3.3 What Cannot Be Erased

| Data | Reason |
|------|--------|
| On-chain transactions | Permanent public blockchain record |
| Smart contract state (vault balances, scores) | Immutable contract storage |
| Governance votes | Required for on-chain integrity |

---

## 4. Data Minimisation

- Wallet addresses are the primary identifier. Email addresses are optional.
- No full names, phone numbers, or government IDs are collected.
- IP addresses are hashed (SHA-256) before storage in rate-limit counters and purged at window expiry.
- JWT payloads contain only `address` and `chainId`; no PII beyond wallet address.

---

## 5. International Transfers

All data is processed within the EU/EEA or countries with an adequacy decision, or protected by Standard Contractual Clauses (SCCs). See our full Privacy Notice for Sentry and Vercel data processing agreements.

---

## 6. Data Processor Agreements

| Processor | Purpose | DPA in place |
|-----------|---------|-------------|
| Vercel | Web application hosting | ✅ Vercel DPA |
| Sentry | Error monitoring | ✅ Sentry DPA |
| Upstash Redis | Rate limiting (ephemeral) | ✅ Upstash DPA |
| PostgreSQL (self-hosted) | Primary data store | N/A — self-hosted |

---

## 7. Implementation Notes for Developers

### Automated Purge Jobs

The following cron jobs must be implemented before production launch:

```sql
-- Purge transaction history older than 90 days
-- NOTE: If using soft-deletes, add AND deleted_at IS NOT NULL to respect the
--       soft-delete flag (soft-deleted records are purged; active records are kept).
DELETE FROM transactions WHERE created_at < NOW() - INTERVAL '90 days';

-- Purge vault events older than 90 days
DELETE FROM vault_events WHERE created_at < NOW() - INTERVAL '90 days';

-- Purge expired sessions
DELETE FROM sessions WHERE expires_at < NOW();

-- Anonymize API logs older than 30 days (replace wallet_address with hash)
UPDATE api_logs
SET wallet_address = encode(digest(wallet_address, 'sha256'), 'hex')
WHERE created_at < NOW() - INTERVAL '30 days'
  AND wallet_address NOT LIKE 'sha256:%';
```

### Erasure API Endpoint

`DELETE /api/account/delete` must:
1. Verify JWT (`verifyJWT` from `lib/auth/jwt.ts`)
2. Revoke all tokens (`revokeAllUserTokens(address)`)
3. Delete user record and cascade to related tables
4. Return `204 No Content` on success
5. Log the deletion event (audit trail, not PII)

---

## 8. Contact

**Data Controller:** Vfide Ltd  
**Privacy enquiries:** privacy@vfide.io  
**DPO:** dpo@vfide.io

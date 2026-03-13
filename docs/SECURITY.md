# Security Architecture Documentation

## Overview

This document describes the security measures implemented in the Vfide application to protect against common web vulnerabilities and ensure the safety of user data and transactions.

## Table of Contents

1. [Authentication](#authentication)
2. [CSRF Protection](#csrf-protection)
3. [Rate Limiting](#rate-limiting)
4. [Input Validation](#input-validation)
5. [Request Size Limits](#request-size-limits)
6. [Content Security](#content-security)
7. [Environment Variables](#environment-variables)
8. [Best Practices](#best-practices)

---

## Authentication

### JWT (JSON Web Token) Authentication

**Location:** `lib/auth/jwt.ts`

#### Overview
The application uses JWT tokens for stateless authentication. Tokens are signed with HMAC-SHA256 and include user address and chain ID.

#### Token Generation
```typescript
const { token, expiresIn, address } = generateToken(userAddress, chainId);
```

**Token Properties:**
- **Expiration:** 24 hours
- **Algorithm:** HS256 (HMAC-SHA256)
- **Issuer:** vfide
- **Audience:** vfide-app
- **Payload:** `{ address, chainId, iat, exp, iss, aud }`

#### Token Verification
```typescript
const payload = verifyToken(token);
if (!payload || isTokenExpired(payload)) {
  // Token invalid or expired
}
```

#### Security Considerations
- **No fallback secret:** The application will fail to start if `JWT_SECRET` is not set
- **Secret validation:** In production, the secret must be at least 32 characters
- **Default secrets blocked:** Common default values like 'secret' or 'default' are rejected in production
- **Token refresh:** Tokens should be refreshed when they're within 1 hour of expiration

#### Environment Setup
```bash
# Required environment variable
JWT_SECRET=<your-secure-random-secret-min-32-chars>

# Alternative (used by NextAuth)
NEXTAUTH_SECRET=<your-secure-random-secret-min-32-chars>
```

**Generate a secure secret:**
```bash
openssl rand -base64 32
```

---

## CSRF Protection

### Cross-Site Request Forgery (CSRF) Protection

**Location:** `lib/security/csrf.ts`

#### Overview
CSRF protection prevents attackers from making unauthorized requests on behalf of authenticated users. We implement the "Double Submit Cookie" pattern.

#### How It Works

1. **Token Generation**
   - Client requests a CSRF token from `GET /api/csrf`
   - Server generates a cryptographically secure random token
   - Token is stored in a secure, httpOnly cookie
   - Same token is returned in the response body

2. **Token Validation**
   - For state-changing requests (POST, PUT, PATCH, DELETE)
   - Client includes token in `x-csrf-token` header
   - Server validates that header token matches cookie token
   - Request is rejected if tokens don't match

#### Implementation

**Server-side (API routes):**
```typescript
import { validateCSRF } from '@/lib/security/csrf';

export async function POST(request: NextRequest) {
  // Validate CSRF token
  const csrfError = validateCSRF(request);
  if (csrfError) {
    return csrfError; // Returns 403 Forbidden
  }
  
  // Process request...
}
```

**Client-side (fetch calls):**
```typescript
// 1. Get CSRF token
const response = await fetch('/api/csrf');
const { token } = await response.json();

// 2. Include token in state-changing requests
await fetch('/api/messages', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-csrf-token': token,
  },
  body: JSON.stringify(data),
});
```

#### Excluded Endpoints
CSRF validation is skipped for:
- GET requests (read-only)
- `/api/auth/*` endpoints (use other security measures)
- `/api/health` (public health check)

---

## Rate Limiting

### Request Rate Limiting

**Location:** `lib/auth/rateLimit.ts`

#### Overview
Rate limiting prevents abuse and DoS attacks by restricting the number of requests from a single client.

#### Implementation
The application supports two rate limiting backends:
1. **Upstash Redis** (production, distributed)
2. **In-Memory** (development, single-instance)

#### Rate Limit Configurations

| Endpoint Type | Requests | Window | Use Case |
|--------------|----------|--------|----------|
| **auth** | 10 | 1 minute | Authentication endpoints |
| **api** | 100 | 1 minute | Standard API endpoints |
| **write** | 30 | 1 minute | Write operations (POST/PUT/DELETE) |
| **claim** | 5 | 1 hour | Reward claiming (strict) |
| **upload** | 10 | 1 minute | File uploads |
| **read** | 200 | 1 minute | Search/read-heavy operations |

#### Usage

```typescript
import { withRateLimit } from '@/lib/auth/rateLimit';

export async function POST(request: NextRequest) {
  // Apply rate limiting
  const rateLimitResponse = await withRateLimit(request, 'write');
  if (rateLimitResponse) {
    return rateLimitResponse; // Returns 429 Too Many Requests
  }
  
  // Process request...
}
```

#### Client Identification
Clients are identified by:
- IP address (from `x-forwarded-for`, `x-real-ip`, or `cf-connecting-ip` headers)
- User agent hash (for additional uniqueness)

#### Response Headers
Rate limit responses include:
- `X-RateLimit-Limit`: Maximum requests allowed
- `X-RateLimit-Remaining`: Requests remaining in current window
- `X-RateLimit-Reset`: Timestamp when limit resets
- `Retry-After`: Seconds until next request can be made

---

## Input Validation

### Request Validation

**Location:** `lib/api/contentTypeValidation.ts`

#### Content-Type Validation
All POST/PUT/PATCH requests must have a valid `Content-Type` header:
- `application/json` for JSON payloads
- `multipart/form-data` for file uploads
- `application/x-www-form-urlencoded` for form data

**Middleware:** Automatically validates in `middleware.ts`

#### Input Sanitization
- **React XSS Protection:** React automatically escapes content rendered in JSX
- **DOMPurify:** Used when `dangerouslySetInnerHTML` is necessary (rare)
- **Address Validation:** Ethereum addresses validated with regex: `^0x[a-fA-F0-9]{40}$`
- **Numeric Validation:** All `parseInt`/`parseFloat` calls include `isNaN()` checks

---

## Request Size Limits

### Body Size Enforcement

**Location:** `middleware.ts`

#### Size Limits by Endpoint

| Endpoint Type | Max Size | Examples |
|--------------|----------|----------|
| **Small** | 10 KB | Auth, balance, fees, health |
| **Medium** | 100 KB | Messages, groups, proposals |
| **Large** | 1 MB | File attachments |
| **Default** | 100 KB | Other API routes |
| **Pages** | Unlimited | GET requests for pages |

#### Implementation
- Checks `Content-Length` header
- Returns `413 Payload Too Large` if exceeded
- Includes helpful error message with actual and max sizes

---

## Content Security

### Content Security Policy (CSP)

**Location:** `middleware.ts`

#### Features
- **Nonce-based CSP:** Unique nonce per request for inline scripts/styles
- **Stored in header:** `x-nonce` header contains the nonce value
- **Dynamic injection:** CSP headers modified to include nonce

### XSS Prevention
1. **React's built-in escaping:** Default for all JSX content
2. **Limited use of `dangerouslySetInnerHTML`:** Only 5 instances, all reviewed
3. **URL validation:** Redirects and links validated before use
4. **Input escaping:** User input never directly inserted into HTML

### SQL Injection Prevention
- **Parameterized queries:** 100% of database queries use parameters
- **No string concatenation:** Query strings never built with user input
- **Type checking:** All inputs validated before use in queries

---

## Environment Variables

### Required Variables

#### Production Requirements
```bash
# JWT Authentication (required)
JWT_SECRET=<min-32-chars-random-string>

# Database (required)
DATABASE_URL=postgresql://user:pass@host:port/db

# Rate Limiting (optional, recommended)
UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-token

# Blockchain (required for contract interactions)
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your-project-id
```

#### Validation
**Location:** `lib/startup-validation.ts`

The application validates environment variables on startup:
- Checks for required variables
- Validates JWT_SECRET length (min 32 chars in production)
- Blocks default/weak secrets in production
- Fails fast with clear error messages

---

## Best Practices

### For Developers

1. **Never commit secrets**
   - Use `.env.local` for local development
   - Add to `.gitignore`
   - Use environment variables in deployment

2. **Always validate input**
   - Check types and formats
   - Use Zod schemas for complex validation
   - Validate before database operations

3. **Use CSRF tokens**
   - Include in all state-changing requests
   - Get fresh token on page load
   - Handle 403 errors by refreshing token

4. **Apply rate limiting**
   - Use appropriate limits for endpoint type
   - Don't bypass rate limiting in production
   - Test rate limit handling in UI

5. **Check authentication**
   - Verify JWT on protected routes
   - Check token expiration
   - Refresh tokens proactively

6. **Handle errors securely**
   - Don't expose sensitive information
   - Log errors server-side only
   - Return generic messages to clients

### For Deployment

1. **Set strong secrets**
   ```bash
   # Generate secure random secrets
   JWT_SECRET=$(openssl rand -base64 32)
   ```

2. **Use HTTPS in production**
   - Secure cookies require HTTPS
   - CSRF tokens more secure over HTTPS

3. **Configure Redis for rate limiting**
   - Use Upstash or similar managed Redis
   - Distributed rate limiting for multi-instance deployments

4. **Monitor security logs**
   - Track failed authentication attempts
   - Monitor rate limit violations
   - Alert on CSRF failures

5. **Regular security audits**
   - Run `npm audit` regularly
   - Update dependencies promptly
   - Review code for new vulnerabilities

### Replay Monitor (When Ready)

Use these settings when enabling scheduled webhook replay monitoring.

Application/server environment variables:

```bash
# Shared machine token used by replay monitor API (server-side only)
SECURITY_MONITOR_API_TOKEN=<long-random-token>

# Optional controls for replay metrics endpoint behavior
SECURITY_MONITOR_REQUIRE_ALLOWLIST=true
SECURITY_MONITOR_ALLOWLIST=0xYourSecurityOpsWallet1,0xYourSecurityOpsWallet2
SECURITY_WEBHOOK_REPLAY_REJECT_THRESHOLD_1H=25
SECURITY_MONITOR_FAIL_ON_THRESHOLD=false
```

GitHub repository secrets:

```text
SECURITY_MONITOR_BASE_URL=https://your-production-domain
SECURITY_MONITOR_API_TOKEN=<same value as app SECURITY_MONITOR_API_TOKEN>
```

GitHub repository variable (optional):

```text
SECURITY_MONITOR_FAIL_ON_THRESHOLD=false
```

Operational notes:
- Workflow: `.github/workflows/security-replay-monitor.yml`
- Reporter command: `npm run -s security:report:replay -- security-replay-metrics-report.md`
- Keep monitor tokens out of `NEXT_PUBLIC_*` and rotate periodically.

---

## Testing

### Security Test Suite

**Location:** `__tests__/security-advanced.test.ts`

Tests cover:
- CSRF token generation and validation
- JWT token creation and verification
- Token expiration handling
- Input validation
- Error handling

### Running Security Tests
```bash
npm test -- __tests__/security-advanced.test.ts
npm test -- __tests__/security.test.tsx
```

---

## Incident Response

### In Case of Security Breach

1. **Immediate Actions**
   - Rotate all secrets immediately
   - Invalidate all JWT tokens
   - Review access logs
   - Block suspicious IPs

2. **Investigation**
   - Identify breach vector
   - Assess data exposure
   - Document timeline

3. **Remediation**
   - Patch vulnerability
   - Deploy fix
   - Notify affected users

4. **Prevention**
   - Update security measures
   - Add relevant tests
   - Document lessons learned

---

## Contact

For security concerns or to report vulnerabilities:
- Create a private security advisory on GitHub
- Email: security@vfide.app (if available)
- Do not disclose vulnerabilities publicly until patched

---

**Last Updated:** 2026-01-20
**Version:** 1.0.0

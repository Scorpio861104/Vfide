# Developer Guide - Code Quality & Security

This guide provides important information for developers working on the VFIDE codebase.

## Recent Improvements (January 2026)

### Security Enhancements ✅

1. **XSS Prevention**
   - Fixed unsafe `innerHTML` usage in `lib/security.ts`
   - Implemented safer HTML sanitization methods
   - Use `lib/security.ts` utilities for all HTML processing

2. **Authentication Security**
   - HMAC-based token generation with cryptographic randomness
   - Rate limiting on authentication endpoints (5 attempts/minute)
   - Proper token expiration validation
   - **CRITICAL**: Set `SESSION_SECRET` environment variable in production

3. **Structured Logging**
   - Use `lib/logger.service.ts` for all logging
   - Automatic sanitization of sensitive data (passwords, tokens, keys)
   - Different log levels: error, warn, info, debug

4. **Type Safety**
   - Replaced `any` types with proper interfaces
   - Created `lib/api-client.types.ts` for API types
   - Use TypeScript strict mode

5. **Configuration Management**
   - Centralized constants in `lib/config.constants.ts`
   - No magic numbers in code
   - Easy to maintain and update

## Quick Start for Security

### Environment Setup

1. Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```

2. **REQUIRED**: Generate and set secure secrets:
```bash
# Generate SESSION_SECRET (32+ characters)
openssl rand -base64 32

# Add to .env.local:
SESSION_SECRET=<your-generated-secret>
```

3. Get WalletConnect Project ID (free):
   - Visit https://cloud.walletconnect.com/
   - Create a project
   - Copy Project ID to `.env.local`

### Code Review Checklist

Before submitting a PR, ensure:

- [ ] No `any` types (use proper interfaces)
- [ ] No hardcoded secrets or API keys
- [ ] Use `logger.service.ts` instead of `console.log/error`
- [ ] Use constants from `config.constants.ts`
- [ ] Input validation on all user data
- [ ] Proper error handling without information leakage
- [ ] Type safety with TypeScript
- [ ] No sensitive data in logs
- [ ] XSS prevention (use `lib/security.ts` utilities)

## Code Patterns

### Logging

**❌ DON'T:**
```typescript
console.error('Error:', error);
console.log('User data:', userData);
```

**✅ DO:**
```typescript
import { logger, apiLogger } from '@/lib/logger.service';

// General logging
logger.error('Operation failed', { context: 'payment' });
logger.info('User action', { action: 'login' });

// Context-specific logging
apiLogger.error('API request failed');
```

### Configuration

**❌ DON'T:**
```typescript
const maxAttempts = 5; // Magic number
const sessionExpiry = 86400000;
```

**✅ DO:**
```typescript
import { AUTH_CONFIG, TIME_CONSTANTS } from '@/lib/config.constants';

const maxAttempts = AUTH_CONFIG.RATE_LIMIT.MAX_ATTEMPTS;
const sessionExpiry = AUTH_CONFIG.SESSION_EXPIRY_MS;
```

### Type Safety

**❌ DON'T:**
```typescript
async function getUser(id: string): Promise<any> {
  const response: any = await fetch(`/api/users/${id}`);
  return response.json();
}
```

**✅ DO:**
```typescript
import type { User } from '@/lib/api-client.types';

async function getUser(id: string): Promise<User> {
  const response = await fetch(`/api/users/${id}`);
  if (!response.ok) {
    throw new Error('Failed to fetch user');
  }
  return response.json() as Promise<User>;
}
```

### Input Validation

**❌ DON'T:**
```typescript
app.post('/api/data', async (req) => {
  const { userInput } = req.body;
  // Directly use userInput
  db.query(`SELECT * FROM users WHERE name = '${userInput}'`);
});
```

**✅ DO:**
```typescript
import { sanitizeInput } from '@/lib/security';
import { VALIDATION_CONFIG } from '@/lib/config.constants';

app.post('/api/data', async (req, res) => {
  const { userInput } = req.body;
  
  // Validate
  if (!userInput || userInput.length > VALIDATION_CONFIG.MAX_LENGTHS.USERNAME) {
    return res.status(400).json({ error: 'Invalid input' });
  }
  
  // Sanitize
  const sanitized = sanitizeInput(userInput);
  
  // Use parameterized queries
  db.query('SELECT * FROM users WHERE name = ?', [sanitized]);
});
```

## Security Best Practices

### 1. Never Log Sensitive Data

```typescript
// ❌ DON'T
logger.error('Auth failed', { password: user.password, token: authToken });

// ✅ DO
logger.error('Auth failed', { userId: user.id, reason: 'invalid_credentials' });
```

### 2. Use Environment Variables

```typescript
// ❌ DON'T
const apiKey = 'pk_live_abc123...';

// ✅ DO
const apiKey = process.env.API_KEY;
if (!apiKey) throw new Error('API_KEY not configured');
```

### 3. Validate All Inputs

```typescript
// ❌ DON'T
const amount = req.body.amount;
processPayment(amount);

// ✅ DO
const amount = parseFloat(req.body.amount);
if (isNaN(amount) || amount <= 0 || amount > MAX_AMOUNT) {
  throw new Error('Invalid amount');
}
processPayment(amount);
```

### 4. Prevent XSS

```typescript
import { XSSProtection } from '@/lib/security';

// ❌ DON'T
element.innerHTML = userContent;

// ✅ DO
element.textContent = XSSProtection.stripHTML(userContent);
```

## Production Deployment Checklist

Before deploying to production:

- [ ] `SESSION_SECRET` is set (32+ characters)
- [ ] All `NEXT_PUBLIC_*` variables are non-sensitive
- [ ] Database connection uses SSL
- [ ] Rate limiting is configured (Redis for production)
- [ ] Error tracking is set up (Sentry)
- [ ] Logs don't contain sensitive data
- [ ] HTTPS is enforced
- [ ] CSP headers are configured
- [ ] Dependencies are up to date (`npm audit`)
- [ ] TypeScript compilation succeeds (`npm run typecheck`)
- [ ] Linting passes (`npm run lint`)
- [ ] Tests pass (`npm test`)

## Common Pitfalls

### 1. In-Memory Rate Limiting

The current rate limiting uses in-memory storage and won't work in production with multiple instances.

**Solution**: Use Redis-based rate limiting:
```typescript
// Use node-rate-limiter-flexible with Redis
import { RateLimiterRedis } from 'rate-limiter-flexible';
```

### 2. localStorage for Auth Tokens

Current implementation uses localStorage which is vulnerable to XSS.

**Better Solution**: Use httpOnly cookies:
```typescript
// Set httpOnly cookie in API route
res.setHeader('Set-Cookie', `auth_token=${token}; HttpOnly; Secure; SameSite=Strict`);
```

### 3. Error Messages

Don't expose internal errors to users:

```typescript
// ❌ DON'T
catch (error) {
  res.status(500).json({ error: error.message }); // May leak internal info
}

// ✅ DO
catch (error) {
  logger.error('Operation failed', { error });
  res.status(500).json({ error: 'Internal server error' });
}
```

## Testing

Run tests before committing:

```bash
# Type checking
npm run typecheck

# Linting
npm run lint

# Unit tests
npm test

# E2E tests
npm run test:e2e
```

## Getting Help

- Security issues: See `SECURITY.md`
- Code questions: Open a GitHub Discussion
- Bugs: Open a GitHub Issue

## Resources

- [SECURITY.md](./SECURITY.md) - Security policy and reporting
- [README.md](./README.md) - Main project documentation
- [.env.example](./.env.example) - Environment configuration

---

Last updated: January 17, 2026

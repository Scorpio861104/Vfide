# Security Test Suite

This directory contains comprehensive security tests covering OWASP Top 10 and blockchain-specific security concerns for the Vfide Next.js application.

## Test Files

### 1. `owasp-top-10.test.ts`
Covers all OWASP Top 10 security vulnerabilities:
- **A01:2021** - Broken Access Control
- **A02:2021** - Cryptographic Failures (Sensitive Data Exposure)
- **A03:2021** - Injection (SQL, NoSQL, Command, LDAP)
- **A04:2021** - Insecure Design
- **A05:2021** - Security Misconfiguration
- **A06:2021** - Vulnerable and Outdated Components
- **A07:2021** - Identification and Authentication Failures
- **A08:2021** - Software and Data Integrity Failures
- **A09:2021** - Security Logging and Monitoring Failures
- **A10:2021** - Server-Side Request Forgery (SSRF)
- **Cross-Site Scripting (XSS)** Prevention
- **XML External Entities (XXE)** Prevention

### 2. `api-security.test.ts`
Tests API-specific security concerns:
- JWT token lifecycle and validation
- Authentication bypass prevention
- Authorization checks
- CSRF protection
- Request validation
- Response security
- API key security
- Session security
- Replay attack prevention
- Parameter pollution
- Error handling security

### 3. `input-validation.test.ts`
Comprehensive input validation tests:
- XSS prevention (script tags, event handlers, protocols)
- SQL injection prevention
- Command injection prevention
- Path traversal prevention
- LDAP injection prevention
- Header injection prevention
- Format string attacks
- Buffer overflow prevention
- Integer overflow/underflow
- Type confusion prevention
- Regular Expression DoS (ReDoS)
- Email and URL validation
- Ethereum address validation
- Amount validation

### 4. `web3-security.test.ts`
Blockchain and Web3-specific security tests:
- Signature verification and validation
- Replay attack prevention
- Message timestamp validation
- Wallet address validation
- Chain ID validation
- Transaction security
- Smart contract interaction security
- Message signing security (EIP-191, EIP-712)
- Token balance validation
- Private key security
- RPC provider security
- Multi-signature security
- Gas estimation security
- Phishing prevention
- Wallet connection security

### 5. `data-protection.test.ts`
Data protection and privacy tests:
- Cookie security (HTTPOnly, Secure, SameSite)
- Secret storage security
- Logging security
- HTTPS enforcement
- Environment variable security
- Data encryption
- PII handling
- Session data security
- Database security
- API response security
- Client-side storage security
- Backup security
- Third-party integration security
- Memory security
- Security headers

### 6. `rate-limiting.test.ts`
Rate limiting effectiveness tests:
- Basic rate limiting
- Endpoint-specific limits
- IP-based rate limiting
- User-based rate limiting
- Rate limit headers
- Bypass prevention
- Distributed rate limiting
- Sliding window algorithm
- Burst protection
- DDoS protection
- Whitelist/Blacklist
- Cost-based rate limiting
- Rate limit monitoring
- Fallback rate limiting
- Rate limit exemptions

### 7. `authentication-security.test.ts`
Authentication mechanism tests:
- Web3 signature authentication
- JWT token lifecycle
- Session management
- Brute force protection
- Account enumeration prevention
- Multi-factor authentication
- Token refresh
- Authentication state
- Authentication middleware
- Remember me functionality
- Device fingerprinting
- Authentication logging

### 8. `authorization-security.test.ts`
Authorization and access control tests:
- Role-Based Access Control (RBAC)
- Resource ownership validation
- Horizontal privilege escalation prevention
- Vertical privilege escalation prevention
- IDOR prevention
- API authorization
- Attribute-Based Access Control (ABAC)
- Permission inheritance
- Dynamic authorization
- Multi-tenancy authorization
- Delegation and impersonation
- Time-based access control
- Context-based authorization
- Authorization caching
- Authorization logging
- Blockchain-specific authorization (token gating, NFT ownership, DAO membership)

## Running the Tests

### Run all security tests:
```bash
npm run test:security
```

### Run specific test file:
```bash
npm test -- __tests__/security/owasp-top-10.test.ts
```

### Run with coverage:
```bash
npm test -- __tests__/security/ --coverage
```

### Run in watch mode:
```bash
npm test -- __tests__/security/ --watch
```

## Test Philosophy

These tests follow security testing best practices:

1. **Attack Simulation**: Tests simulate real attack patterns to verify defenses
2. **Boundary Testing**: Tests validate edge cases and boundaries
3. **Negative Testing**: Tests verify that invalid inputs are properly rejected
4. **Documentation**: Each test includes clear documentation of what it's testing and why
5. **Comprehensive Coverage**: Tests cover both common and advanced attack vectors

## Security Controls Tested

### Input Validation
- Sanitization of user inputs
- Type validation
- Length validation
- Format validation
- Range validation

### Authentication
- Signature verification (Web3)
- Token validation
- Session management
- Rate limiting
- Account lockout

### Authorization
- Permission checks
- Resource ownership
- Role validation
- Access control lists

### Data Protection
- Encryption at rest
- Encryption in transit
- Secure storage
- Data sanitization
- PII protection

### Network Security
- HTTPS enforcement
- CORS configuration
- Security headers
- Rate limiting
- DDoS protection

### Blockchain Security
- Signature verification
- Replay attack prevention
- Chain validation
- Transaction validation
- Smart contract security

## Adding New Tests

When adding new security tests:

1. **Identify the Threat**: Clearly document what security threat you're testing
2. **Test the Attack**: Simulate the actual attack pattern
3. **Verify Defense**: Ensure the security control properly mitigates the threat
4. **Test Edge Cases**: Include boundary conditions and edge cases
5. **Document**: Add clear comments explaining the test purpose

Example:
```typescript
describe('New Security Feature', () => {
  it('prevents [specific attack]', () => {
    // Arrange: Set up attack scenario
    const maliciousInput = '...';
    
    // Act: Attempt the attack
    const result = securityFunction(maliciousInput);
    
    // Assert: Verify defense worked
    expect(result).toBeSanitized();
  });
});
```

## Security Testing Checklist

- [ ] OWASP Top 10 covered
- [ ] Input validation comprehensive
- [ ] Authentication mechanisms tested
- [ ] Authorization checks verified
- [ ] Data protection validated
- [ ] Rate limiting effective
- [ ] Web3-specific security tested
- [ ] Error handling secure
- [ ] Logging appropriate
- [ ] Security headers configured

## Integration with CI/CD

These tests are automatically run:
- On every pull request
- Before deployment
- As part of the security audit process

## Compliance

These tests help ensure compliance with:
- OWASP Application Security Verification Standard (ASVS)
- PCI DSS (if handling payments)
- GDPR (data protection)
- SOC 2 (security controls)

## Continuous Improvement

Security testing is ongoing:
1. Regular updates as new vulnerabilities are discovered
2. Addition of tests for new features
3. Review and update of existing tests
4. Integration of automated security scanning results

## Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [OWASP ASVS](https://owasp.org/www-project-application-security-verification-standard/)
- [OWASP Testing Guide](https://owasp.org/www-project-web-security-testing-guide/)
- [Web3 Security](https://github.com/ethereum/wiki/wiki/Safety)
- [Smart Contract Security](https://consensys.github.io/smart-contract-best-practices/)

## Contributing

When contributing security tests:
1. Follow the existing test structure
2. Include comprehensive documentation
3. Test both positive and negative cases
4. Ensure tests are deterministic
5. Avoid testing external dependencies directly

## Support

For security concerns or questions about these tests:
- Review the test documentation
- Check existing tests for examples
- Consult security best practices
- Contact the security team

---

**Note**: These tests verify security controls are in place. They should be complemented with:
- Penetration testing
- Security audits
- Dependency scanning
- Static code analysis
- Dynamic application security testing (DAST)

#!/bin/bash

# VFIDE Security Audit Script
# Comprehensive security check for the VFIDE project

set -e

echo "🔐 VFIDE Security Audit"
echo "======================="
echo ""

# Colors for output
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

WARNINGS=0
ERRORS=0
PASSED=0

# Function to print section header
section() {
  echo ""
  echo -e "${BLUE}════════════════════════════════════════${NC}"
  echo -e "${BLUE}$1${NC}"
  echo -e "${BLUE}════════════════════════════════════════${NC}"
}

# Function to check passed
check_pass() {
  echo -e "${GREEN}✓ $1${NC}"
  PASSED=$((PASSED + 1))
}

# Function to check warning
check_warn() {
  echo -e "${YELLOW}⚠ $1${NC}"
  WARNINGS=$((WARNINGS + 1))
}

# Function to check error
check_error() {
  echo -e "${RED}✗ $1${NC}"
  ERRORS=$((ERRORS + 1))
}

# Check 1: Sensitive Files
section "1. Sensitive Files Check"

if [ -f ".env" ]; then
  check_error ".env file found in root (should not be committed)"
else
  check_pass "No .env file in root"
fi

if [ -f "frontend/.env.local" ]; then
  check_warn "frontend/.env.local exists (ensure it's in .gitignore)"
  if grep -q "\.env\.local" .gitignore 2>/dev/null; then
    check_pass ".env.local is in .gitignore"
  else
    check_error ".env.local is NOT in .gitignore"
  fi
else
  check_pass "No frontend/.env.local (using .env.example)"
fi

if [ -f "websocket-server/.env" ]; then
  check_warn "websocket-server/.env exists (ensure it's in .gitignore)"
  if grep -q "websocket-server/\.env" .gitignore 2>/dev/null || grep -q "\.env" .gitignore 2>/dev/null; then
    check_pass "WebSocket .env is in .gitignore"
  else
    check_error "WebSocket .env is NOT in .gitignore"
  fi
fi

# Check for exposed secrets
if find . -type f -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" | xargs grep -i "sk-" 2>/dev/null | grep -v "node_modules" | grep -v ".next" | grep -q .; then
  check_error "Potential API keys found in source code"
else
  check_pass "No obvious API keys in source code"
fi

# Check 2: Dependencies
section "2. Dependency Security"

echo "Checking for known vulnerabilities..."

cd frontend
if npm audit --audit-level=moderate &>/dev/null; then
  check_pass "No moderate or higher vulnerabilities in frontend"
else
  VULN_COUNT=$(npm audit --json 2>/dev/null | grep -o '"vulnerabilities":{"info":[0-9]*,"low":[0-9]*,"moderate":[0-9]*,"high":[0-9]*,"critical":[0-9]*' | grep -o '[0-9]*' | awk '{s+=$1} END {print s}')
  if [ "$VULN_COUNT" -gt 0 ]; then
    check_warn "Found $VULN_COUNT vulnerabilities in frontend dependencies"
    echo "  Run 'npm audit fix' to auto-fix"
  fi
fi

if [ -d "../websocket-server" ]; then
  cd ../websocket-server
  if npm audit --audit-level=moderate &>/dev/null; then
    check_pass "No moderate or higher vulnerabilities in WebSocket server"
  else
    check_warn "Vulnerabilities found in WebSocket server dependencies"
    echo "  Run 'cd websocket-server && npm audit fix'"
  fi
  cd ..
else
  cd ..
fi

# Check 3: Environment Variables
section "3. Environment Variable Security"

# Check .env.example files exist
if [ -f "frontend/.env.example" ]; then
  check_pass "frontend/.env.example exists"
  
  # Check for placeholder values
  if grep -q "your_" frontend/.env.example || grep -q "YOUR_" frontend/.env.example; then
    check_pass ".env.example has placeholder values"
  else
    check_warn ".env.example might have real values"
  fi
else
  check_error "frontend/.env.example missing"
fi

if [ -f "websocket-server/.env.example" ]; then
  check_pass "websocket-server/.env.example exists"
else
  check_warn "websocket-server/.env.example missing"
fi

# Check 4: Git Security
section "4. Git Security"

# Check for large files
LARGE_FILES=$(find . -type f -size +10M 2>/dev/null | grep -v ".git" | grep -v "node_modules" | grep -v ".next" | wc -l)
if [ "$LARGE_FILES" -gt 0 ]; then
  check_warn "Found $LARGE_FILES files larger than 10MB"
  echo "  Consider using Git LFS for large files"
else
  check_pass "No large files in repository"
fi

# Check .gitignore
if [ -f ".gitignore" ]; then
  check_pass ".gitignore exists"
  
  CRITICAL_PATTERNS=("*.env" "node_modules" ".next" "*.key" "*.pem")
  for pattern in "${CRITICAL_PATTERNS[@]}"; do
    if grep -q "$pattern" .gitignore; then
      check_pass ".gitignore includes $pattern"
    else
      check_warn ".gitignore missing pattern: $pattern"
    fi
  done
else
  check_error ".gitignore missing"
fi

# Check 5: Smart Contract Security
section "5. Smart Contract Security"

if [ -d "contracts" ]; then
  # Check for console.log in contracts
  if find contracts -name "*.sol" | xargs grep -l "console.log" 2>/dev/null | grep -q .; then
    check_error "console.log found in contracts (should be removed for production)"
  else
    check_pass "No console.log in contracts"
  fi
  
  # Check for unchecked math operations (Solidity < 0.8.0)
  if find contracts -name "*.sol" | xargs grep -l "pragma solidity ^0.[0-7]" 2>/dev/null | grep -q .; then
    check_warn "Old Solidity version detected (consider upgrading to 0.8+)"
  else
    check_pass "Using Solidity 0.8+ (built-in overflow protection)"
  fi
  
  # Check for ReentrancyGuard usage
  if find contracts -name "*.sol" | xargs grep -l "ReentrancyGuard" 2>/dev/null | grep -q .; then
    check_pass "Contracts use ReentrancyGuard"
  else
    check_warn "No ReentrancyGuard detected (ensure it's not needed)"
  fi
fi

# Check 6: Frontend Security
section "6. Frontend Security"

cd frontend

# Check for hardcoded secrets
if grep -r "sk-" app components lib hooks 2>/dev/null | grep -v "node_modules" | grep -q .; then
  check_error "Potential hardcoded secrets in frontend"
else
  check_pass "No obvious hardcoded secrets in frontend"
fi

# Check for eval usage
if grep -r "eval(" app components lib hooks 2>/dev/null | grep -v "node_modules" | grep -v ".next" | grep -q .; then
  check_error "eval() usage found (security risk)"
else
  check_pass "No eval() usage"
fi

# Check for dangerouslySetInnerHTML
DANGEROUS_HTML=$(grep -r "dangerouslySetInnerHTML" app components 2>/dev/null | grep -v "node_modules" | wc -l)
if [ "$DANGEROUS_HTML" -gt 0 ]; then
  check_warn "Found $DANGEROUS_HTML uses of dangerouslySetInnerHTML (ensure sanitized)"
else
  check_pass "No dangerouslySetInnerHTML usage"
fi

# Check next.config for security headers
if [ -f "next.config.ts" ] || [ -f "next.config.js" ]; then
  if grep -q "X-Frame-Options\|Content-Security-Policy" next.config.* 2>/dev/null; then
    check_pass "Security headers configured in Next.js"
  else
    check_warn "Security headers not found in Next.js config"
  fi
fi

cd ..

# Check 7: WebSocket Security
section "7. WebSocket Security"

if [ -d "websocket-server" ]; then
  cd websocket-server
  
  # Check for authentication
  if grep -q "auth" src/middleware/*.ts 2>/dev/null || grep -q "authenticate" src/*.ts 2>/dev/null; then
    check_pass "Authentication middleware found"
  else
    check_error "No authentication middleware detected"
  fi
  
  # Check for rate limiting
  if grep -q "rateLimit\|rate-limit" src/middleware/*.ts 2>/dev/null || [ -f "src/middleware/rateLimit.ts" ]; then
    check_pass "Rate limiting implemented"
  else
    check_warn "No rate limiting detected"
  fi
  
  # Check for CORS configuration
  if grep -q "cors" src/*.ts 2>/dev/null; then
    check_pass "CORS configuration found"
  else
    check_warn "CORS configuration not detected"
  fi
  
  cd ..
fi

# Check 8: Docker Security
section "8. Docker Security"

# Check for root user in Dockerfile
if [ -f "frontend/Dockerfile" ]; then
  if grep -q "USER.*nextjs\|USER.*node" frontend/Dockerfile; then
    check_pass "Frontend Dockerfile uses non-root user"
  else
    check_warn "Frontend Dockerfile may run as root"
  fi
fi

if [ -f "websocket-server/Dockerfile" ]; then
  if grep -q "USER.*node" websocket-server/Dockerfile; then
    check_pass "WebSocket Dockerfile uses non-root user"
  else
    check_warn "WebSocket Dockerfile may run as root"
  fi
fi

# Check docker-compose for secrets
if [ -f "docker-compose.yml" ]; then
  if grep -q "JWT_SECRET.*:" docker-compose.yml | grep -v '\$'; then
    check_error "Secrets hardcoded in docker-compose.yml"
  else
    check_pass "No hardcoded secrets in docker-compose.yml"
  fi
fi

# Check 9: CI/CD Security
section "9. CI/CD Security"

if [ -f ".github/workflows/test.yml" ]; then
  check_pass "GitHub Actions workflow exists"
  
  # Check for secrets usage
  if grep -q "secrets\." .github/workflows/*.yml; then
    check_pass "GitHub Actions uses secrets"
  else
    check_warn "No secrets usage in GitHub Actions"
  fi
fi

# Check 10: Documentation
section "10. Security Documentation"

if [ -f "SECURITY.md" ]; then
  check_pass "SECURITY.md exists"
else
  check_warn "SECURITY.md missing (recommended)"
fi

if grep -q "security@" README.md 2>/dev/null || grep -q "security@" SECURITY.md 2>/dev/null; then
  check_pass "Security contact email documented"
else
  check_warn "No security contact email found"
fi

# Summary
echo ""
echo -e "${BLUE}════════════════════════════════════════${NC}"
echo -e "${BLUE}Summary${NC}"
echo -e "${BLUE}════════════════════════════════════════${NC}"
echo ""
echo -e "${GREEN}Passed:  $PASSED${NC}"
echo -e "${YELLOW}Warnings: $WARNINGS${NC}"
echo -e "${RED}Errors:   $ERRORS${NC}"
echo ""

if [ $ERRORS -gt 0 ]; then
  echo -e "${RED}❌ Security audit found critical issues!${NC}"
  echo -e "${RED}Please fix errors before deploying to production.${NC}"
  exit 1
elif [ $WARNINGS -gt 0 ]; then
  echo -e "${YELLOW}⚠️  Security audit found warnings.${NC}"
  echo -e "${YELLOW}Review warnings and consider fixing before production.${NC}"
  exit 0
else
  echo -e "${GREEN}✅ Security audit passed!${NC}"
  echo -e "${GREEN}No critical issues or warnings found.${NC}"
  exit 0
fi

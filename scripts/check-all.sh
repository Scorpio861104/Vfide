#!/bin/bash

# VFIDE Pre-commit Check Script
# Runs all quality checks before committing

set -e

echo "🔍 Running VFIDE pre-commit checks..."

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

FAILED=0

# TypeScript type checking
echo ""
echo -e "${BLUE}════════════════════════════════════════${NC}"
echo -e "${BLUE}Step 1/4: TypeScript Type Checking${NC}"
echo -e "${BLUE}════════════════════════════════════════${NC}"
cd frontend
if npm run typecheck; then
  echo -e "${GREEN}✓ TypeScript type checking passed${NC}"
else
  echo -e "${RED}✗ TypeScript type checking failed${NC}"
  FAILED=1
fi

# Linting
echo ""
echo -e "${BLUE}════════════════════════════════════════${NC}"
echo -e "${BLUE}Step 2/4: ESLint Code Linting${NC}"
echo -e "${BLUE}════════════════════════════════════════${NC}"
if npm run lint; then
  echo -e "${GREEN}✓ Linting passed${NC}"
else
  echo -e "${RED}✗ Linting failed${NC}"
  FAILED=1
fi

# Unit tests
echo ""
echo -e "${BLUE}════════════════════════════════════════${NC}"
echo -e "${BLUE}Step 3/4: Unit Tests${NC}"
echo -e "${BLUE}════════════════════════════════════════${NC}"
if npm run test:ci; then
  echo -e "${GREEN}✓ Unit tests passed${NC}"
else
  echo -e "${RED}✗ Unit tests failed${NC}"
  FAILED=1
fi

# Contract tests
echo ""
echo -e "${BLUE}════════════════════════════════════════${NC}"
echo -e "${BLUE}Step 4/4: Smart Contract Tests${NC}"
echo -e "${BLUE}════════════════════════════════════════${NC}"
cd ..
if forge test 2>/dev/null; then
  echo -e "${GREEN}✓ Contract tests passed${NC}"
else
  echo -e "${YELLOW}⚠ Foundry not found or contract tests failed${NC}"
fi

echo ""
echo -e "${BLUE}════════════════════════════════════════${NC}"

if [ $FAILED -eq 0 ]; then
  echo -e "${GREEN}✅ All checks passed! Ready to commit.${NC}"
  exit 0
else
  echo -e "${RED}❌ Some checks failed. Please fix errors before committing.${NC}"
  exit 1
fi

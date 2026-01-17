#!/bin/bash
set -e

echo "🧪 VFIDE Comprehensive Test Suite Runner"
echo "========================================"
echo ""

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

PASSED=0
FAILED=0

run_test_suite() {
    local name=$1
    local command=$2
    
    echo "📝 Running: $name..."
    if eval "$command"; then
        echo -e "${GREEN}✅ $name PASSED${NC}"
        ((PASSED++))
    else
        echo -e "${RED}❌ $name FAILED${NC}"
        ((FAILED++))
    fi
    echo ""
}

# Default run
echo "🔨 Running comprehensive test suite..."
echo ""

run_test_suite "Unit Tests with Coverage" "npm run test:coverage"
run_test_suite "Type Checking" "npm run typecheck"
run_test_suite "Linting" "npm run lint"
run_test_suite "Security Tests" "npm run test:security"
run_test_suite "Contract Interaction Tests" "npm run test:contract"
run_test_suite "Integration Tests" "npm run test:integration"

echo ""
echo "📊 Test Summary: Passed: $PASSED, Failed: $FAILED"

[ $FAILED -eq 0 ] && echo -e "${GREEN}🎉 All tests passed!${NC}" && exit 0
echo -e "${RED}⚠️  Some tests failed.${NC}" && exit 1

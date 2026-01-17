#!/bin/bash

# Advanced Testing Script
# Runs comprehensive testing suite including load tests, accessibility, and performance

set -e

echo "🧪 Starting Advanced Testing Suite..."
echo "=================================="

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    if [ $2 -eq 0 ]; then
        echo -e "${GREEN}✓${NC} $1"
    else
        echo -e "${RED}✗${NC} $1"
    fi
}

# Check if services are running
echo ""
echo "📋 Pre-flight checks..."

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}⚠${NC} node_modules not found. Running npm install..."
    npm install
fi

# Start development server for testing
echo ""
echo "🚀 Starting development server..."
npm run dev > /dev/null 2>&1 &
DEV_PID=$!
echo "Development server PID: $DEV_PID"

# Wait for server to be ready
echo "Waiting for server to be ready..."
timeout=60
counter=0
until curl -s http://localhost:3000 > /dev/null || [ $counter -eq $timeout ]; do
    sleep 1
    counter=$((counter + 1))
    if [ $((counter % 10)) -eq 0 ]; then
        echo "Still waiting... (${counter}s/${timeout}s)"
    fi
done

if [ $counter -eq $timeout ]; then
    echo -e "${RED}✗${NC} Server failed to start within ${timeout} seconds"
    kill $DEV_PID 2>/dev/null || true
    exit 1
fi

echo -e "${GREEN}✓${NC} Server is ready!"

# Run tests
echo ""
echo "=================================="
echo "🧪 Running Test Suites"
echo "=================================="

# 1. Playwright E2E Tests
echo ""
echo "1️⃣ Running Playwright E2E Tests..."
if npx playwright test; then
    print_status "Playwright tests passed" 0
else
    print_status "Playwright tests failed" 1
    TESTS_FAILED=1
fi

# 2. Lighthouse Performance Tests
echo ""
echo "2️⃣ Running Lighthouse Performance Tests..."
if npm run test:performance; then
    print_status "Lighthouse tests passed" 0
else
    print_status "Lighthouse tests failed" 1
    TESTS_FAILED=1
fi

# 3. Pa11y Accessibility Tests
echo ""
echo "3️⃣ Running Pa11y Accessibility Tests..."
if npx pa11y-ci; then
    print_status "Accessibility tests passed" 0
else
    print_status "Accessibility tests failed" 1
    TESTS_FAILED=1
fi

# 4. Load Tests with k6
echo ""
echo "4️⃣ Running k6 Load Tests..."
if command -v k6 &> /dev/null; then
    if k6 run k6-load-test.js; then
        print_status "Load tests passed" 0
    else
        print_status "Load tests failed" 1
        TESTS_FAILED=1
    fi
else
    echo -e "${YELLOW}⚠${NC} k6 not installed. Skipping load tests."
    echo "   Install k6: https://k6.io/docs/getting-started/installation/"
fi

# 5. Contract Tests (if Hardhat is configured)
echo ""
echo "5️⃣ Running Smart Contract Tests..."
if [ -f "hardhat.config.ts" ]; then
    if npx hardhat test; then
        print_status "Contract tests passed" 0
    else
        print_status "Contract tests failed" 1
        TESTS_FAILED=1
    fi
else
    echo -e "${YELLOW}⚠${NC} Hardhat not configured. Skipping contract tests."
fi

# Cleanup
echo ""
echo "🧹 Cleaning up..."
kill $DEV_PID 2>/dev/null || true
echo "Development server stopped"

# Summary
echo ""
echo "=================================="
echo "📊 Test Summary"
echo "=================================="

if [ "${TESTS_FAILED:-0}" -eq 1 ]; then
    echo -e "${RED}✗ Some tests failed${NC}"
    echo ""
    echo "Review the output above for details."
    echo "Test reports are available in:"
    echo "  - test-results/ (Playwright)"
    echo "  - .lighthouseci/ (Lighthouse)"
    echo "  - load-test-results.json (k6)"
    exit 1
else
    echo -e "${GREEN}✓ All tests passed!${NC}"
    echo ""
    echo "The application is ready for deployment."
    exit 0
fi

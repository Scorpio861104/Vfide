#!/bin/bash
set -e

echo "=========================================="
echo "CLEAN RECOMPILE WITH PROPER CONFIG"
echo "=========================================="

# Clean all build artifacts
echo "Cleaning all artifacts..."
rm -rf out/ cache/ artifacts/ typechain-types/ 2>/dev/null || true

# Build Foundry
echo ""
echo "Compiling with Foundry..."
forge build 2>&1 | tail -20

# Build Hardhat  
echo ""
echo "Compiling with Hardhat..."
npx hardhat compile 2>&1 | tail -20

echo ""
echo "=========================================="
echo "RUNNING TESTS"
echo "=========================================="

# Run tests
echo "Running Foundry tests..."
forge test --summary 2>&1 | tee foundry-fixed.txt

echo ""
echo "Running Hardhat tests (this will take a while)..."
npx hardhat test --no-compile 2>&1 | tee hardhat-fixed.txt

echo ""
echo "=========================================="
echo "FINAL RESULTS"
echo "=========================================="
echo "Foundry:"
grep -E "tests? (passed|succeeded|failing)" foundry-fixed.txt | tail -3
echo ""
echo "Hardhat:"
grep -E "[0-9]+ (passing|failing)" hardhat-fixed.txt | tail -3

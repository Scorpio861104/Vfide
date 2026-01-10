#!/bin/bash
set -e

echo "=========================================="
echo "CLEAN COMPILATION APPROACH"
echo "=========================================="

# Clean everything
echo "Step 1: Cleaning all build artifacts..."
rm -rf artifacts/ cache/ out/ typechain-types/

# Compile Hardhat (contracts-min only)
echo "Step 2: Compiling Hardhat (contracts-min)..."
npx hardhat compile

# Compile Foundry (needs special handling for duplicates)
echo "Step 3: Compiling Foundry..."
forge clean
forge build

echo ""
echo "=========================================="
echo "COMPILATION COMPLETE"
echo "=========================================="
echo "Now running tests..."
echo ""

# Run Foundry tests
echo "Running Foundry tests..."
forge test --summary 2>&1 | tee foundry-clean-results.txt

# Run Hardhat tests
echo "Running Hardhat tests..."
npx hardhat test --no-compile 2>&1 | tee hardhat-clean-results.txt

echo ""
echo "=========================================="
echo "RESULTS"
echo "=========================================="
echo "Foundry:"
tail -5 foundry-clean-results.txt
echo ""
echo "Hardhat:"
grep -E "[0-9]+ (passing|failing)" hardhat-clean-results.txt | tail -3

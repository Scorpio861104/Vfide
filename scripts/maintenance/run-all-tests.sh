#!/bin/bash
set -e

echo "======================================"
echo "RUNNING FOUNDRY TESTS"
echo "======================================"
forge test --summary 2>&1 | tee foundry-test-results-new.txt

echo ""
echo "======================================"
echo "COMPILING HARDHAT CONTRACTS"
echo "======================================"
npx hardhat compile 2>&1 | tee hardhat-compile-new.txt

echo ""
echo "======================================"
echo "RUNNING HARDHAT TESTS"
echo "======================================"
npx hardhat test --no-compile 2>&1 | tee hardhat-test-results-new.txt

echo ""
echo "======================================"
echo "TEST SUMMARY"
echo "======================================"
echo "Foundry results:"
grep -E "(passed|failed|total tests)" foundry-test-results-new.txt | tail -3
echo ""
echo "Hardhat results:"
grep -E "[0-9]+ (passing|failing)" hardhat-test-results-new.txt | tail -3

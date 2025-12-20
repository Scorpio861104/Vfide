#!/bin/bash
set -e

echo "=========================================="
echo "NUCLEAR FIX: Using ONLY contracts-min"
echo "=========================================="

# Backup and hide other directories
if [ -d "contracts" ] && [ ! -d "contracts.backup" ]; then
  echo "Backing up contracts/ to contracts.backup/"
  mv contracts contracts.backup
fi

if [ -d "contracts-prod" ] && [ ! -d "contracts-prod.backup" ]; then
  echo "Backing up contracts-prod/ to contracts-prod.backup/"
  mv contracts-prod contracts-prod.backup
fi

# Make contracts-min the primary
if [ ! -L "contracts" ]; then
  echo "Creating symlink: contracts -> contracts-min"
  ln -s contracts-min contracts
fi

# Clean and recompile
echo "Cleaning..."
rm -rf out/ cache/ artifacts/ typechain-types/

echo "Compiling Foundry..."
forge build

echo "Compiling Hardhat..."
npx hardhat compile

echo ""
echo "Running tests..."
forge test --summary > foundry-nuclear.txt 2>&1 &
npx hardhat test --no-compile > hardhat-nuclear.txt 2>&1 &
wait

echo ""
echo "=========================================="
echo "RESULTS:"
echo "=========================================="
echo "Foundry:"
tail -5 foundry-nuclear.txt
echo ""
echo "Hardhat:"
grep -E "[0-9]+ (passing|failing)" hardhat-nuclear.txt

#!/bin/bash
# Clean all Hardhat artifacts and cache
echo "Cleaning Hardhat artifacts..."
rm -rf artifacts/ cache/ typechain-types/

# Temporarily rename other contract directories so Hardhat can't see them
echo "Temporarily hiding contracts/ and contracts-prod/..."
if [ -d "contracts" ]; then
  mv contracts contracts.bak
fi
if [ -d "contracts-prod" ]; then
  mv contracts-prod contracts-prod.bak
fi

# Compile only contracts-min
echo "Compiling contracts-min only..."
npx hardhat compile

# Restore other directories
echo "Restoring other contract directories..."
if [ -d "contracts.bak" ]; then
  mv contracts.bak contracts
fi
if [ -d "contracts-prod.bak" ]; then
  mv contracts-prod.bak contracts-prod
fi

echo "Done! Now run: npx hardhat test --no-compile"

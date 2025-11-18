#!/bin/bash

# Archive old reports and test outputs
echo "Archiving reports..."

# Move all markdown reports except README
find . -maxdepth 1 -name "*.md" ! -name "README.md" -exec mv {} archive/ \;

# Move all text reports
find . -maxdepth 1 -name "*.txt" -exec mv {} archive/ \;

# Move analysis JSON files (keep config files)
find . -maxdepth 1 -name "*-*.json" -exec mv {} archive/ \;
find . -maxdepth 1 -name "slither*.json" -exec mv {} archive/ \;
find . -maxdepth 1 -name "solc-ast-*.json" -exec mv {} archive/ \;

# Move HTML reports
find . -maxdepth 1 -name "*.html" -exec mv {} archive/ \;

# Clean build artifacts
npx hardhat clean 2>/dev/null || true

echo "Cleanup complete!"
echo ""
echo "Kept in root:"
echo "  - README.md"
echo "  - Config files (package.json, hardhat.config.js, etc.)"
echo "  - Source directories (contracts/, contracts-min/, test/, scripts/)"
echo ""
echo "Archived to ./archive/:"
echo "  - $(ls -1 archive/ | wc -l) report files"

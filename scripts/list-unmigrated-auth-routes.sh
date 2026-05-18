#!/usr/bin/env bash
set -euo pipefail

count=0

while IFS= read -r -d '' file; do
  if grep -Eq "requireAuth|requireOwnership" "$file" && ! grep -Eq "withAuth\b|withOwnership\b" "$file"; then
    echo "$file"
    count=$((count + 1))
  fi
done < <(find app/api -name "route.ts" -print0)

echo "TOTAL_UNMIGRATED_AUTH_ROUTES=$count"

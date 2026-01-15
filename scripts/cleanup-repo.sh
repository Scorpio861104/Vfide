#!/bin/bash

# Repository Cleanup Script
# Organizes documentation files and removes outdated progress reports

echo "🧹 Starting repository cleanup..."

# Create archive directory for old progress reports
mkdir -p docs/archive/progress-reports

# Move old progress/batch/milestone reports to archive
echo "📦 Archiving old progress reports..."
mv BATCH-12-*.md docs/archive/progress-reports/ 2>/dev/null
mv BATCHES-*.md docs/archive/progress-reports/ 2>/dev/null
mv MILESTONE-*.md docs/archive/progress-reports/ 2>/dev/null
mv PHASE*-*.md docs/archive/progress-reports/ 2>/dev/null
mv QUICK-STATUS-*.md docs/archive/progress-reports/ 2>/dev/null
mv ROADMAP-PROGRESS-*.md docs/archive/progress-reports/ 2>/dev/null
mv SESSION-COMPLETION-*.md docs/archive/progress-reports/ 2>/dev/null
mv COMPREHENSIVE-PROGRESS-REPORT.md docs/archive/progress-reports/ 2>/dev/null
mv STATUS-DASHBOARD.md docs/archive/progress-reports/ 2>/dev/null
mv DEEP-AUDIT-FINDINGS.md docs/archive/progress-reports/ 2>/dev/null
mv CODE-QUALITY-STATUS.md docs/archive/progress-reports/ 2>/dev/null

# Create proper documentation structure
echo "📁 Organizing documentation structure..."

# User guides
mkdir -p docs/user-guides
mv PROOFSCOREGUIDE.md docs/user-guides/ 2>/dev/null
mv ACTIVITY-FEED-GUIDE.md docs/user-guides/ 2>/dev/null
mv NOTIFICATION-GUIDE.md docs/user-guides/ 2>/dev/null

# Testing documentation
mkdir -p docs/testing
mv A11Y_TESTING.md docs/testing/ 2>/dev/null
mv E2E_TESTING.md docs/testing/ 2>/dev/null
mv VISUAL_TESTING.md docs/testing/ 2>/dev/null
mv TESTING_COMPLETE.md docs/testing/ 2>/dev/null
mv ACCESSIBILITY-AUDIT.md docs/testing/ 2>/dev/null

# Mobile documentation
mkdir -p docs/mobile
mv MOBILE-FIRST-GUIDE.md docs/mobile/ 2>/dev/null
mv MOBILE-INTEGRATION-GUIDE.md docs/mobile/ 2>/dev/null

# Governance documentation
mkdir -p docs/governance
mv GOVERNANCE-ENHANCEMENT-SUMMARY.md docs/governance/ 2>/dev/null

# Component documentation
mkdir -p docs/components
mv COMPONENT-LIBRARY.md docs/components/ 2>/dev/null

# Deployment documentation
mkdir -p docs/deployment
mv VERCEL-DEPLOYMENT-ISSUES.md docs/deployment/ 2>/dev/null
mv BATCH-12-VERCEL-FIX.md docs/deployment/ 2>/dev/null

echo "✨ Cleanup complete!"
echo ""
echo "📊 Summary:"
echo "  - Old progress reports archived to docs/archive/"
echo "  - Documentation organized into docs/ subdirectories"
echo "  - Essential guides kept in root for easy access"

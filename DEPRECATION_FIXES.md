# Deprecation Fixes Documentation

## Summary
This document tracks all deprecation issues found and resolved in the Vfide repository.

## Resolved Issues

### 1. codecov npm package (DEPRECATED)
**Status:** ✅ Removed  
**Version:** 3.8.3  
**Reason:** The codecov npm package has been deprecated. See: https://about.codecov.io/blog/codecov-uploader-deprecation-plan/

**Action Taken:**
- Removed `codecov` from `devDependencies` in package.json
- Confirmed that the GitHub Actions workflow `.github/workflows/codecov.yml` already uses the modern `codecov/codecov-action@v4` GitHub Action
- The deprecated npm package was not actually being used in the codebase

**Modern Alternative:**
Use the GitHub Action `codecov/codecov-action@v4` in CI/CD workflows instead of the npm package.

### 2. @types/dompurify (DEPRECATED)
**Status:** ✅ Removed  
**Version:** 3.0.5  
**Reason:** The stub types definition is no longer needed as dompurify@3.x now includes its own TypeScript type definitions.

**Action Taken:**
- Removed `@types/dompurify` from `devDependencies` in package.json
- Verified that dompurify includes built-in types at `./dist/purify.cjs.d.ts`
- All imports of dompurify continue to work with full type safety

## Remaining Transitive Dependencies

### rimraf@3.0.2
**Status:** ⚠️ Transitive Dependency  
**Warning:** "Rimraf versions prior to v4 are no longer supported"  
**Source:** Used by `@lhci/cli` → `chrome-launcher` and `@percy/cli`

**Action:** No action required at this time. This is a transitive dependency pulled in by third-party packages. The maintainers of those packages will need to update their dependencies. The warning does not affect functionality.

### @walletconnect packages
**Status:** ⚠️ Transitive Dependency  
**Warning:** Multiple @walletconnect packages show "Reliability and performance improvements" notices  
**Source:** Used by `@rainbow-me/rainbowkit`

**Action:** No action required. These are informational notices from the WalletConnect team about newer versions available. The rainbow-kit library manages these dependencies and will update them in future releases.

## Verification

All changes have been verified:
- ✅ `npm install` completes without deprecation warnings for direct dependencies
- ✅ `npm run build` succeeds and generates all 117 pages
- ✅ TypeScript compilation passes with no errors
- ✅ All existing functionality preserved

## Future Monitoring

To check for new deprecation warnings:
```bash
# Check for deprecated packages
npm install 2>&1 | grep -i deprecat

# Check for outdated packages
npm outdated

# Check dependency tree for issues
npm ls 2>&1 | grep -i deprecat
```

## Last Updated
2026-01-27

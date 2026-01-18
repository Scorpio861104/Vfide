# 🚀 VFIDE Quick Reference Guide

**Quick commands and solutions for common development tasks**

---

## 📦 Package Management

```bash
# Install dependencies
npm install

# Install specific package
npm install package-name
npm install --save-dev package-name

# Update dependencies
npm update

# Check for outdated packages
npm outdated

# Security audit
npm audit
npm audit fix
```

---

## 🏗️ Build & Development

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Analyze bundle size
npm run analyze

# Clean build artifacts
npm run clean

# Clean everything including node_modules
npm run clean:all
```

---

## 🧪 Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm test -- path/to/test.test.ts

# Run E2E tests
npm run test:e2e

# Run E2E tests with UI
npm run test:e2e:ui

# Run mobile tests
npm run test:mobile

# Run security tests
npm run test:security

# Run accessibility tests
npm run test:a11y

# Run all comprehensive tests
npm run test:comprehensive
```

---

## 🔍 Code Quality

```bash
# Type checking
npm run typecheck

# Linting
npm run lint

# Fix linting issues
npm run lint -- --fix

# Format code
npm run format

# Check formatting
npm run format:check

# Check circular dependencies
npm run check-circular

# Run all quality checks
npm run validate
```

---

## 🐛 Debugging

```bash
# Start dev server with debugger
npm run dev:debug

# Run Next.js in turbo mode (faster)
npm run dev:turbo

# Debug specific test
node --inspect-brk node_modules/.bin/jest --runInBand test-name
```

---

## 📊 Performance

```bash
# Run bundle analyzer
ANALYZE=true npm run build

# Check bundle size limits
npm run size

# Explain why package is in bundle
npm run size:why

# Run Lighthouse CI
npm run test:performance
```

---

## 🔐 Security

```bash
# Security audit
npm audit

# Fix vulnerabilities
npm audit fix

# Force fix (may break things)
npm audit fix --force

# Run security tests
npm run test:security
```

---

## 🎨 Storybook

```bash
# Start Storybook
npm run storybook

# Build Storybook
npm run build:storybook
```

---

## 🛠️ Git Commands

```bash
# Create feature branch
git checkout -b feature/your-feature-name

# Stage changes
git add .

# Commit with conventional format
git commit -m "feat(scope): description"

# Push to remote
git push origin branch-name

# Update from main
git pull origin main

# Interactive rebase
git rebase -i HEAD~3

# Amend last commit
git commit --amend

# Stash changes
git stash
git stash pop
```

---

## 🔧 Common Issues & Solutions

### Issue: Build fails with "Module not found"
```bash
# Solution: Clear cache and reinstall
npm run clean
rm -rf node_modules package-lock.json
npm install
```

### Issue: Tests fail with timeout
```bash
# Solution: Increase timeout in test file
jest.setTimeout(30000); // 30 seconds
```

### Issue: Type errors after installing package
```bash
# Solution: Install type definitions
npm install --save-dev @types/package-name

# Or restart TypeScript server in VS Code
# Cmd+Shift+P > "TypeScript: Restart TS Server"
```

### Issue: Wallet not connecting
```bash
# Check:
# 1. NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID is set in .env
# 2. Chain ID is correct
# 3. RPC endpoint is accessible
# 4. Browser console for errors
```

### Issue: Transaction failing
```bash
# Check:
# 1. Sufficient gas
# 2. Correct network
# 3. Contract address is valid
# 4. Function parameters are correct
# 5. Wallet has necessary permissions
```

### Issue: Slow development server
```bash
# Solution 1: Use Turbo mode
npm run dev:turbo

# Solution 2: Clear Next.js cache
npm run clean

# Solution 3: Check for large files in public/
```

### Issue: Memory leak in tests
```bash
# Solution: Add cleanup in afterEach
afterEach(() => {
  cleanup(); // from @testing-library/react
  jest.clearAllMocks();
});
```

---

## 📝 Environment Variables

### Required Variables
```bash
# .env.local
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id
NEXT_PUBLIC_ALCHEMY_API_KEY=your_alchemy_key # Optional
```

### Get WalletConnect Project ID
1. Go to https://cloud.walletconnect.com/
2. Sign up / Log in
3. Create new project
4. Copy Project ID

---

## 🔗 Useful URLs

### Development
```
Local Dev:    http://localhost:3000
Storybook:    http://localhost:6006
```

### Documentation
```
Next.js:      https://nextjs.org/docs
React:        https://react.dev
Wagmi:        https://wagmi.sh
Viem:         https://viem.sh
TailwindCSS:  https://tailwindcss.com/docs
```

### Tools
```
WalletConnect: https://cloud.walletconnect.com/
Etherscan:     https://etherscan.io/
Base Scan:     https://basescan.org/
Polygon Scan:  https://polygonscan.com/
```

---

## 🎯 Component Snippets

### Basic Component
```typescript
'use client';

import React from 'react';

interface Props {
  // props
}

export function Component({ }: Props) {
  return <div>Component</div>;
}
```

### Component with State
```typescript
'use client';

import React from 'react';

export function Component() {
  const [state, setState] = React.useState('');

  return <div>{state}</div>;
}
```

### Component with Effect
```typescript
'use client';

import React from 'react';

export function Component() {
  React.useEffect(() => {
    // Effect logic
    return () => {
      // Cleanup
    };
  }, []);

  return <div>Component</div>;
}
```

### Async Data Loading
```typescript
'use client';

import { useQuery } from '@tanstack/react-query';

export function Component() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['key'],
    queryFn: fetchData,
  });

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return <div>{data}</div>;
}
```

---

## 🧪 Test Snippets

### Component Test
```typescript
import { render, screen } from '@testing-library/react';
import { Component } from './Component';

describe('Component', () => {
  it('should render', () => {
    render(<Component />);
    expect(screen.getByText('text')).toBeInTheDocument();
  });
});
```

### User Interaction Test
```typescript
import { render, screen, fireEvent } from '@testing-library/react';

it('should call onClick when clicked', () => {
  const onClick = jest.fn();
  render(<Button onClick={onClick}>Click</Button>);
  
  fireEvent.click(screen.getByText('Click'));
  expect(onClick).toHaveBeenCalledTimes(1);
});
```

### Async Test
```typescript
import { render, screen, waitFor } from '@testing-library/react';

it('should load data', async () => {
  render(<Component />);
  
  await waitFor(() => {
    expect(screen.getByText('Loaded')).toBeInTheDocument();
  });
});
```

---

## 🎨 Styling Snippets

### Tailwind Classes
```typescript
// Basic
<div className="flex items-center justify-between p-4 bg-white rounded-lg shadow">

// Responsive
<div className="text-sm md:text-base lg:text-lg">

// Dark mode
<div className="bg-white dark:bg-gray-800">

// With cn utility
<div className={cn(
  'base-classes',
  condition && 'conditional-classes',
  props.className
)}>
```

---

## 🔌 Wallet Integration Snippets

### Connect Wallet
```typescript
import { useAccount, useConnect } from 'wagmi';

export function WalletButton() {
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();

  if (isConnected) {
    return <div>Connected: {address}</div>;
  }

  return (
    <button onClick={() => connect({ connector: connectors[0] })}>
      Connect
    </button>
  );
}
```

### Read Contract
```typescript
import { useReadContract } from 'wagmi';

const { data: balance } = useReadContract({
  address: CONTRACT_ADDRESS,
  abi: ABI,
  functionName: 'balanceOf',
  args: [address],
});
```

### Write Contract
```typescript
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';

const { writeContract, data: hash } = useWriteContract();
const { isLoading, isSuccess } = useWaitForTransactionReceipt({ hash });

const transfer = () => {
  writeContract({
    address: CONTRACT_ADDRESS,
    abi: ABI,
    functionName: 'transfer',
    args: [recipient, amount],
  });
};
```

---

## 📋 Checklist Templates

### Before Commit
```markdown
- [ ] Tests pass (`npm test`)
- [ ] Type check passes (`npm run typecheck`)
- [ ] Linting passes (`npm run lint`)
- [ ] No console.logs
- [ ] Documentation updated
- [ ] Commit message follows convention
```

### Before PR
```markdown
- [ ] All commits follow convention
- [ ] Branch is up to date with main
- [ ] CI checks pass
- [ ] Code reviewed by self
- [ ] Screenshots added (if UI changes)
- [ ] Breaking changes documented
```

### Before Release
```markdown
- [ ] All tests pass
- [ ] E2E tests pass
- [ ] Performance metrics acceptable
- [ ] Security audit clean
- [ ] Documentation updated
- [ ] CHANGELOG updated
- [ ] Version bumped
```

---

## 🆘 Getting Help

### Check Documentation
1. This guide (QUICK-REFERENCE.md)
2. [BEST-PRACTICES.md](./BEST-PRACTICES.md)
3. [CONTRIBUTING.md](./CONTRIBUTING.md)
4. [ISSUE-ANALYSIS.md](./ISSUE-ANALYSIS.md)

### Still Stuck?
1. Check existing issues on GitHub
2. Search in codebase for similar implementations
3. Check team chat/Slack
4. Create detailed issue with:
   - What you tried
   - Error messages
   - Expected vs actual behavior
   - Environment details

---

**Last Updated:** 2026-01-17  
**Keep this handy!** Bookmark this file for quick reference during development.

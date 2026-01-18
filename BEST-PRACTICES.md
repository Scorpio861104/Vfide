# 🎯 VFIDE Development Best Practices Guide

**Version:** 1.0  
**Last Updated:** 2026-01-17  
**Target Audience:** Developers contributing to VFIDE

---

## 📋 Table of Contents

1. [Code Quality Standards](#code-quality-standards)
2. [Testing Guidelines](#testing-guidelines)
3. [Security Practices](#security-practices)
4. [Performance Optimization](#performance-optimization)
5. [Documentation Standards](#documentation-standards)
6. [Git Workflow](#git-workflow)
7. [Component Development](#component-development)
8. [Smart Contract Integration](#smart-contract-integration)
9. [Common Pitfalls](#common-pitfalls)
10. [Troubleshooting](#troubleshooting)

---

## 🏆 Code Quality Standards

### TypeScript Configuration
- ✅ **Always use TypeScript** - No `.js` or `.jsx` files
- ✅ **Enable strict mode** - Leverage TypeScript's type safety
- ✅ **Define explicit types** - Avoid `any` unless absolutely necessary
- ✅ **Use interfaces for props** - Document component contracts

```typescript
// ✅ Good
interface ButtonProps {
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
}

// ❌ Bad
function Button(props: any) { }
```

### Naming Conventions
- **Components**: PascalCase (`UserProfile`, `WalletConnector`)
- **Files**: PascalCase for components (`UserProfile.tsx`), camelCase for utilities (`formatAddress.ts`)
- **Functions**: camelCase (`handleSubmit`, `fetchUserData`)
- **Constants**: UPPER_SNAKE_CASE (`MAX_RETRY_ATTEMPTS`, `API_ENDPOINT`)
- **Types/Interfaces**: PascalCase (`UserData`, `ChainConfig`)

### Code Organization
```
/components
  /wallet
    WalletConnector.tsx
    ChainSelector.tsx
    __tests__/
      WalletConnector.test.tsx
/lib
  /utils
    formatAddress.ts
    validation.ts
  /hooks
    useWallet.ts
    useContract.ts
```

### Import Order
```typescript
// 1. React and external libraries
import React, { useState } from 'react';
import { useAccount } from 'wagmi';

// 2. Internal absolute imports
import { Button } from '@/components/ui/button';
import { formatAddress } from '@/lib/utils';

// 3. Relative imports
import { UserProfile } from './UserProfile';

// 4. Types
import type { User } from '@/types';

// 5. Styles (if any)
import styles from './Component.module.css';
```

---

## 🧪 Testing Guidelines

### Test Coverage Requirements
- **Minimum**: 80% coverage for new code
- **Target**: 90%+ for critical paths
- **Required**: 100% for security-critical functions

### Test Structure
```typescript
describe('ComponentName', () => {
  // Setup
  beforeEach(() => {
    // Common setup
  });

  describe('feature/behavior', () => {
    it('should do something specific', () => {
      // Arrange
      const input = 'test';
      
      // Act
      const result = myFunction(input);
      
      // Assert
      expect(result).toBe('expected');
    });
  });
});
```

### What to Test

#### Unit Tests (Jest)
```typescript
// ✅ Pure functions
describe('formatAddress', () => {
  it('should format long addresses correctly', () => {
    expect(formatAddress('0x1234...5678')).toBe('0x1234...5678');
  });
});

// ✅ Utility functions
// ✅ Custom hooks
// ✅ Business logic
```

#### Component Tests (React Testing Library)
```typescript
// ✅ User interactions
it('should call onClick when button is clicked', () => {
  const onClick = jest.fn();
  render(<Button onClick={onClick}>Click me</Button>);
  
  fireEvent.click(screen.getByText('Click me'));
  expect(onClick).toHaveBeenCalledTimes(1);
});

// ✅ Conditional rendering
// ✅ State changes
// ✅ Accessibility
```

#### E2E Tests (Playwright)
```typescript
// ✅ Critical user flows
test('user can connect wallet and make transaction', async ({ page }) => {
  await page.goto('/');
  await page.click('text=Connect Wallet');
  // ... test full flow
});
```

### Testing Best Practices
- ✅ Test behavior, not implementation
- ✅ Use descriptive test names
- ✅ Keep tests independent
- ✅ Mock external dependencies
- ✅ Test error states
- ✅ Test edge cases
- ❌ Don't test third-party libraries
- ❌ Don't test styling (use visual regression tests)

### Mobile Testing
```typescript
// Always test responsive behavior
describe('ComponentName (Mobile)', () => {
  it('should render mobile view on small screens', () => {
    global.innerWidth = 375;
    // Test mobile-specific behavior
  });
});
```

---

## 🔒 Security Practices

### Input Validation
```typescript
// ✅ Always validate user input
import DOMPurify from 'dompurify';

function sanitizeInput(userInput: string): string {
  return DOMPurify.sanitize(userInput);
}

// ✅ Validate addresses
import { isAddress } from 'viem';

if (!isAddress(address)) {
  throw new Error('Invalid address');
}
```

### Environment Variables
```typescript
// ✅ Never commit secrets
// ✅ Use NEXT_PUBLIC_ prefix for client-side variables
const publicVar = process.env.NEXT_PUBLIC_API_URL;

// ✅ Keep sensitive data server-side only
const privateKey = process.env.PRIVATE_KEY; // Server-side only
```

### Smart Contract Interactions
```typescript
// ✅ Always validate contract responses
const balance = await contract.read.balanceOf([address]);
if (balance === undefined || balance === null) {
  throw new Error('Failed to fetch balance');
}

// ✅ Handle transaction errors
try {
  const tx = await contract.write.transfer([recipient, amount]);
  await tx.wait();
} catch (error) {
  // Log to Sentry
  console.error('Transaction failed:', error);
  throw error;
}
```

### Authentication
```typescript
// ✅ Always verify wallet ownership
import { recoverAddress } from 'viem';

async function verifySignature(
  message: string,
  signature: string,
  expectedAddress: string
): Promise<boolean> {
  const recoveredAddress = await recoverAddress({
    message,
    signature,
  });
  return recoveredAddress.toLowerCase() === expectedAddress.toLowerCase();
}
```

---

## ⚡ Performance Optimization

### React Performance
```typescript
// ✅ Use React.memo for expensive components
export const ExpensiveComponent = React.memo(({ data }) => {
  // Rendering logic
});

// ✅ Use useMemo for expensive calculations
const sortedData = useMemo(() => {
  return data.sort((a, b) => a.value - b.value);
}, [data]);

// ✅ Use useCallback for callback functions
const handleClick = useCallback(() => {
  // Handle click
}, [dependency]);
```

### Code Splitting
```typescript
// ✅ Lazy load heavy components
const HeavyComponent = dynamic(() => import('./HeavyComponent'), {
  loading: () => <Skeleton />,
  ssr: false,
});

// ✅ Split routes
// Next.js does this automatically with app directory
```

### Image Optimization
```typescript
// ✅ Always use Next.js Image component
import Image from 'next/image';

<Image
  src="/logo.png"
  alt="VFIDE Logo"
  width={200}
  height={50}
  priority={true} // For above-the-fold images
/>
```

### API Calls
```typescript
// ✅ Use React Query for caching
import { useQuery } from '@tanstack/react-query';

const { data, isLoading } = useQuery({
  queryKey: ['balance', address],
  queryFn: () => fetchBalance(address),
  staleTime: 30000, // 30 seconds
});

// ✅ Implement pagination for large datasets
// ✅ Use debouncing for search inputs
```

---

## 📚 Documentation Standards

### Component Documentation
```typescript
/**
 * WalletConnector - Handles wallet connection flow
 * 
 * Features:
 * - Supports MetaMask, Coinbase Wallet, WalletConnect
 * - Auto-reconnect on page load
 * - Chain switching
 * 
 * @example
 * ```tsx
 * <WalletConnector onConnect={(address) => console.log(address)} />
 * ```
 */
export function WalletConnector({ onConnect }: WalletConnectorProps) {
  // Implementation
}
```

### Function Documentation
```typescript
/**
 * Formats a wallet address for display
 * 
 * @param address - Full wallet address (0x...)
 * @param startChars - Number of characters to show at start (default: 6)
 * @param endChars - Number of characters to show at end (default: 4)
 * @returns Formatted address (e.g., "0x1234...5678")
 * 
 * @example
 * formatAddress('0x1234567890abcdef1234567890abcdef12345678')
 * // Returns: "0x1234...5678"
 */
export function formatAddress(
  address: string,
  startChars = 6,
  endChars = 4
): string {
  // Implementation
}
```

### README for Complex Features
```markdown
# Feature Name

## Overview
Brief description of what this feature does.

## Usage
```typescript
import { useFeature } from '@/hooks/useFeature';

const { data, actions } = useFeature();
```

## Configuration
- List configuration options
- Environment variables needed
- Prerequisites

## Testing
- How to test this feature
- Mock data available
- Edge cases to consider

## Known Limitations
- List any limitations
- Future improvements planned
```

---

## 🔀 Git Workflow

### Commit Messages (Conventional Commits)
```bash
# Format: <type>(<scope>): <subject>

feat(wallet): add MetaMask connection support
fix(governance): resolve vote counting bug
docs(readme): update installation instructions
test(vault): add integration tests for deposits
refactor(ui): extract button variants to separate file
perf(dashboard): optimize user stats calculation
chore(deps): update dependencies to latest versions
```

### Types
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks
- `perf`: Performance improvements

### Branch Naming
```bash
# Format: <type>/<short-description>

feature/wallet-connect-v2
fix/governance-vote-bug
docs/api-documentation
refactor/extract-wallet-hooks
```

### Pull Request Process
1. ✅ Create feature branch from `develop`
2. ✅ Make commits with conventional format
3. ✅ Ensure all tests pass locally
4. ✅ Run linter and fix issues
5. ✅ Update documentation if needed
6. ✅ Create PR with descriptive title and description
7. ✅ Wait for CI/CD checks to pass
8. ✅ Request reviews
9. ✅ Address review comments
10. ✅ Squash and merge when approved

---

## 🎨 Component Development

### Component Template
```typescript
'use client'; // If using React hooks or browser APIs

import React from 'react';
import { cn } from '@/lib/utils';

interface ComponentProps {
  // Props definition
}

/**
 * Component description
 */
export function Component({ }: ComponentProps) {
  // State
  const [state, setState] = React.useState();

  // Effects
  React.useEffect(() => {
    // Side effects
  }, []);

  // Handlers
  const handleAction = () => {
    // Handler logic
  };

  // Render
  return (
    <div className={cn('base-classes')}>
      {/* JSX */}
    </div>
  );
}
```

### Accessibility Requirements
```typescript
// ✅ Always include ARIA labels
<button aria-label="Close dialog" onClick={onClose}>
  <X />
</button>

// ✅ Support keyboard navigation
<div
  role="button"
  tabIndex={0}
  onKeyDown={(e) => e.key === 'Enter' && handleClick()}
  onClick={handleClick}
>

// ✅ Use semantic HTML
<nav>
  <ul>
    <li><a href="/dashboard">Dashboard</a></li>
  </ul>
</nav>

// ✅ Test with screen readers
// ✅ Ensure sufficient color contrast
// ✅ Support keyboard-only navigation
```

---

## ⛓️ Smart Contract Integration

### Contract Interaction Pattern
```typescript
import { useContract, useAccount } from 'wagmi';
import { parseEther } from 'viem';

export function useVaultDeposit() {
  const { address } = useAccount();
  const contract = useContract({
    address: VAULT_ADDRESS,
    abi: VAULT_ABI,
  });

  const deposit = async (amount: string) => {
    if (!address) throw new Error('Wallet not connected');
    
    try {
      // Validate inputs
      const amountWei = parseEther(amount);
      
      // Execute transaction
      const tx = await contract.write.deposit([amountWei], {
        value: amountWei,
      });
      
      // Wait for confirmation
      await tx.wait();
      
      return tx.hash;
    } catch (error) {
      // Log error to Sentry
      console.error('Deposit failed:', error);
      throw error;
    }
  };

  return { deposit };
}
```

### Error Handling
```typescript
// ✅ Handle common errors
try {
  await contract.write.transfer([recipient, amount]);
} catch (error: any) {
  if (error.message.includes('insufficient funds')) {
    throw new Error('Insufficient balance for transaction');
  } else if (error.message.includes('user rejected')) {
    throw new Error('Transaction cancelled by user');
  } else {
    throw new Error('Transaction failed. Please try again.');
  }
}
```

---

## ⚠️ Common Pitfalls

### 1. Not Handling Loading States
```typescript
// ❌ Bad
function Component() {
  const { data } = useQuery(['data'], fetchData);
  return <div>{data.value}</div>; // Crashes if data is undefined
}

// ✅ Good
function Component() {
  const { data, isLoading, error } = useQuery(['data'], fetchData);
  
  if (isLoading) return <Skeleton />;
  if (error) return <ErrorMessage error={error} />;
  if (!data) return null;
  
  return <div>{data.value}</div>;
}
```

### 2. Not Cleaning Up Effects
```typescript
// ❌ Bad
useEffect(() => {
  const interval = setInterval(() => {
    fetchData();
  }, 1000);
  // Memory leak!
}, []);

// ✅ Good
useEffect(() => {
  const interval = setInterval(() => {
    fetchData();
  }, 1000);
  
  return () => clearInterval(interval);
}, []);
```

### 3. Mutating State Directly
```typescript
// ❌ Bad
const [items, setItems] = useState([]);
items.push(newItem); // Direct mutation!

// ✅ Good
setItems([...items, newItem]);
```

### 4. Using useEffect for Data Fetching
```typescript
// ❌ Bad - Race conditions, no caching
useEffect(() => {
  fetch('/api/data').then(setData);
}, []);

// ✅ Good - Use React Query
const { data } = useQuery(['data'], () => fetch('/api/data'));
```

---

## 🔧 Troubleshooting

### Build Errors
```bash
# Clear Next.js cache
npm run clean

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Check for circular dependencies
npm run check-circular
```

### Type Errors
```bash
# Run type check
npm run typecheck

# If types are missing
npm install --save-dev @types/package-name
```

### Test Failures
```bash
# Run tests in watch mode
npm run test:watch

# Check coverage
npm run test:coverage

# Debug specific test
node --inspect-brk node_modules/.bin/jest --runInBand YourTest.test.ts
```

### Wallet Connection Issues
- ✅ Check chain ID matches
- ✅ Verify RPC endpoint is accessible
- ✅ Ensure WalletConnect project ID is set
- ✅ Check browser console for errors
- ✅ Try different wallet provider

### Performance Issues
```bash
# Analyze bundle size
npm run analyze

# Run Lighthouse
npm run test:performance

# Check for memory leaks
# Use Chrome DevTools Performance tab
```

---

## 📖 Additional Resources

### Internal Documentation
- [CONTRIBUTING.md](./CONTRIBUTING.md) - Contribution guidelines
- [SECURITY.md](./SECURITY.md) - Security policies
- [ISSUE-ANALYSIS.md](./ISSUE-ANALYSIS.md) - Known issues and enhancements
- [SECURITY-ASSESSMENT.md](./SECURITY-ASSESSMENT.md) - Security assessment

### External Resources
- [Next.js Docs](https://nextjs.org/docs)
- [React Docs](https://react.dev)
- [Wagmi Docs](https://wagmi.sh)
- [Viem Docs](https://viem.sh)
- [TailwindCSS Docs](https://tailwindcss.com/docs)

---

## ✅ Pre-Commit Checklist

Before committing code, ensure:

- [ ] Code follows TypeScript best practices
- [ ] All tests pass (`npm test`)
- [ ] Type checking passes (`npm run typecheck`)
- [ ] Linting passes (`npm run lint`)
- [ ] No console.logs in production code
- [ ] Documentation updated if needed
- [ ] Accessibility checked
- [ ] Performance considered
- [ ] Security reviewed
- [ ] Commit message follows conventional format

---

**Last Updated:** 2026-01-17  
**Maintained By:** VFIDE Development Team  
**Questions?** Create an issue or ask in team chat

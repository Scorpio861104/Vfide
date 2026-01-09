# Contributing to VFIDE

Thank you for your interest in contributing to VFIDE! We welcome contributions from the community and are excited to collaborate with developers, designers, testers, and documentation writers.

This guide will help you get started with contributing to the VFIDE project.

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [How to Contribute](#how-to-contribute)
- [Development Setup](#development-setup)
- [Code Style Guidelines](#code-style-guidelines)
- [Commit Conventions](#commit-conventions)
- [Testing Requirements](#testing-requirements)
- [Pull Request Process](#pull-request-process)
- [Documentation Standards](#documentation-standards)

## 🤝 Code of Conduct

By participating in this project, you agree to abide by our Code of Conduct:

- **Be Respectful** — Treat everyone with respect and kindness
- **Be Inclusive** — Welcome people of all backgrounds and identities
- **Be Constructive** — Provide helpful feedback and criticism
- **Prioritize Security** — Always consider security implications
- **Focus on Quality** — Maintain high standards for code and documentation

## 🎯 How to Contribute

There are many ways to contribute to VFIDE:

### Reporting Bugs

If you find a bug:

1. **Check existing issues** — Search [GitHub Issues](https://github.com/Scorpio861104/Vfide/issues) to avoid duplicates
2. **Create a detailed report** with:
   - Clear, descriptive title
   - Steps to reproduce the issue
   - Expected vs actual behavior
   - Environment details (OS, Node version, browser, wallet, etc.)
   - Screenshots or error messages if applicable
   - Relevant logs or stack traces

**Example bug report:**
```
Title: "Proposal creation fails with 'Invalid timestamp' error"

**Environment:**
- OS: macOS 14.2
- Node: 18.18.0
- Browser: Chrome 120
- Wallet: MetaMask 11.8.0

**Steps to reproduce:**
1. Connect wallet to Base Sepolia
2. Navigate to /governance
3. Click "Create Proposal"
4. Fill in all fields
5. Click "Submit"

**Expected:** Proposal created successfully
**Actual:** Error: "Invalid timestamp" appears

**Console logs:**
[Paste relevant logs]
```

### Reporting Security Vulnerabilities

**DO NOT** report security vulnerabilities in public issues.

Instead:
- **Email:** security@vfide.io
- Include detailed description and reproduction steps
- Allow 48-72 hours for initial response
- See [SECURITY.md](SECURITY.md) for our complete security policy and bug bounty program

### Suggesting Features

To suggest a new feature:

1. **Check existing requests** — Search issues and discussions
2. **Create a feature request** with:
   - Clear use case and problem it solves
   - Proposed solution or approach
   - Alternative solutions considered
   - Why it benefits VFIDE users
   - Implementation complexity (if known)

### Improving Documentation

Documentation is crucial! You can help by:

- Fixing typos or clarifying confusing sections
- Adding examples or use cases
- Writing tutorials or guides
- Translating documentation
- Improving code comments

### Contributing Code

See [Pull Request Process](#pull-request-process) below for detailed instructions.

## 🛠️ Development Setup

1. **Fork the repository**
   ```bash
   git clone https://github.com/YOUR-USERNAME/Vfide.git
   cd Vfide
   ```

2. **Create a branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

3. **Install dependencies**
   ```bash
   npm install
   forge install
   ```

4. **Make your changes**
   - Follow the coding style (see below)
   - Add tests for new features
   - Update documentation

5. **Test your changes**
   ```bash
   forge test
   forge test --gas-report
   npm run coverage
   ```

6. **Commit your changes**
   ```bash
   git add .
   git commit -m "feat: add amazing feature"
   ```
   
   Use conventional commits:
   - `feat:` - New features
   - `fix:` - Bug fixes
   - `docs:` - Documentation changes
   - `test:` - Test additions/changes
   - `refactor:` - Code refactoring
   - `chore:` - Maintenance tasks

7. **Push to your fork**
   ```bash
   git push origin feature/your-feature-name
   ```

8. **Open a Pull Request**
   - Go to the original repository
   - Click "New Pull Request"
   - Select your branch
   - Fill out the PR template

## Development Setup

### Prerequisites
- Node.js 18+
- Git
- Foundry (forge, cast, anvil)

### Installation
```bash
# Clone your fork
git clone https://github.com/YOUR-USERNAME/Vfide.git
cd Vfide

# Install dependencies
npm install
forge install

# Build contracts
forge build

# Run tests
forge test
```

## Coding Standards

### Solidity Contracts

- **Version**: Use `pragma solidity 0.8.30`
- **Style**: Follow [Solidity Style Guide](https://docs.soliditylang.org/en/latest/style-guide.html)
- **Comments**: Use NatSpec documentation
- **Security**: 
  - Always use ReentrancyGuard for external calls
  - Validate all inputs
  - Follow Checks-Effects-Interactions pattern
  - Use SafeERC20 for token transfers

Example:
```solidity
/**
 * @notice Transfer tokens with security checks
 * @param to Recipient address
 * @param amount Token amount
 * @return success Whether transfer succeeded
 */
function transfer(address to, uint256 amount) 
    external 
    nonReentrant 
    returns (bool success) 
{
    require(to != address(0), "Invalid address");
    require(amount > 0, "Invalid amount");
    
    // Effects
    balances[msg.sender] -= amount;
    balances[to] += amount;
    
    // Interactions
    emit Transfer(msg.sender, to, amount);
    return true;
}
```

### JavaScript/TypeScript

- **Style**: Use Prettier formatting
- **Linting**: Follow ESLint rules
- **Tests**: Write comprehensive tests for all features

### Git Workflow

1. Keep commits atomic and focused
2. Write clear commit messages
3. Rebase on main before creating PR
4. Squash commits if needed

## Testing

### Unit Tests
```bash
forge test --match-contract YourContract
```

### Fuzz Tests
## 🧪 Testing Requirements

**All code changes must include appropriate tests.** VFIDE maintains **98.76% code coverage** across 736 tests.

### Required Tests

When contributing code, you must add tests for:

1. **New features** — Test all functionality and edge cases
2. **Bug fixes** — Add regression test to prevent recurrence
3. **Refactoring** — Ensure existing tests still pass
4. **API changes** — Update integration tests

### Running Tests

```bash
# Run all tests
npm run test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm run test -- path/to/test-file.test.ts

# Run E2E tests
npm run test:e2e

# Run E2E tests with UI
npm run test:e2e:ui
```

### Writing Tests

#### Unit Tests (Jest)

```typescript
// Example: Testing a utility function
import { formatProposalId } from '@/lib/utils';

describe('formatProposalId', () => {
  it('should format proposal ID correctly', () => {
    expect(formatProposalId('123')).toBe('PROP-123');
  });

  it('should handle empty string', () => {
    expect(formatProposalId('')).toBe('PROP-');
  });

  it('should handle long IDs', () => {
    expect(formatProposalId('1234567890')).toBe('PROP-1234567890');
  });
});
```

#### Component Tests (React Testing Library)

```typescript
// Example: Testing a React component
import { render, screen, fireEvent } from '@testing-library/react';
import { VoteButton } from '@/components/governance/vote-button';

describe('VoteButton', () => {
  it('should render vote button', () => {
    render(<VoteButton onVote={jest.fn()} />);
    expect(screen.getByText('Vote')).toBeInTheDocument();
  });

  it('should call onVote when clicked', () => {
    const onVote = jest.fn();
    render(<VoteButton onVote={onVote} />);
    
    fireEvent.click(screen.getByText('Vote'));
    expect(onVote).toHaveBeenCalledTimes(1);
  });

  it('should be disabled when loading', () => {
    render(<VoteButton onVote={jest.fn()} isLoading />);
    expect(screen.getByText('Vote')).toBeDisabled();
  });
});
```

#### E2E Tests (Playwright)

```typescript
// Example: Testing governance flow
import { test, expect } from '@playwright/test';

test('should create and vote on proposal', async ({ page }) => {
  await page.goto('/governance');
  
  // Create proposal
  await page.click('button:has-text("Create Proposal")');
  await page.fill('input[name="title"]', 'Test Proposal');
  await page.fill('textarea[name="description"]', 'This is a test');
  await page.click('button:has-text("Submit")');
  
  // Verify proposal appears
  await expect(page.locator('text=Test Proposal')).toBeVisible();
  
  // Vote on proposal
  await page.click('button:has-text("Vote For")');
  await expect(page.locator('text=Vote submitted')).toBeVisible();
});
```

#### Contract Tests (Foundry)

```solidity
// Example: Testing smart contract
pragma solidity ^0.8.28;

import "forge-std/Test.sol";
import "../contracts/Governance.sol";

contract GovernanceTest is Test {
    Governance governance;
    address user1;
    address user2;

    function setUp() public {
        governance = new Governance();
        user1 = address(0x1);
        user2 = address(0x2);
    }

    function testCreateProposal() public {
        vm.prank(user1);
        uint256 proposalId = governance.createProposal("Test", "Description");
        
        assertEq(proposalId, 1);
        assertEq(governance.getProposalTitle(proposalId), "Test");
    }

    function testVoteOnProposal() public {
        vm.prank(user1);
        uint256 proposalId = governance.createProposal("Test", "Description");
        
        vm.prank(user2);
        governance.vote(proposalId, true);
        
        (uint256 votesFor, uint256 votesAgainst) = governance.getVotes(proposalId);
        assertEq(votesFor, 1);
        assertEq(votesAgainst, 0);
    }
}
```

### Test Coverage Requirements

- **Minimum coverage:** 85% for new code
- **Target coverage:** 95%+ for critical paths
- **Required:** 100% coverage for security-sensitive code

Check coverage:
```bash
npm run test:coverage
```

### Contract Testing

```bash
# Build contracts
forge build

# Run all contract tests
forge test

# Run with verbose output
forge test -vvv

# Run specific test
forge test --match-test testCreateProposal

# Run fuzz tests
FOUNDRY_PROFILE=fuzz forge test --fuzz-runs 10000

# Coverage
forge coverage

# Gas reports
forge test --gas-report
```

## 🔄 Pull Request Process

Follow these steps to submit a pull request:

### 1. Prepare Your Changes

```bash
# Make sure you're on your feature branch
git checkout feature/your-feature-name

# Run all checks locally
npm run check

# Validate environment (optional)
npm run validate:env

# Review your changes
git diff
```

### 2. Commit Your Changes

```bash
# Stage your changes
git add .

# Commit with conventional commit message
git commit -m "feat(governance): add proposal filtering"

# Or use interactive commit for multiple files
git add -p
git commit
```

### 3. Push to Your Fork

```bash
git push origin feature/your-feature-name
```

### 4. Create Pull Request

1. Go to the [VFIDE repository](https://github.com/Scorpio861104/Vfide)
2. Click "Pull requests" → "New pull request"
3. Click "compare across forks"
4. Select your fork and branch
5. Fill in the PR template:

```markdown
## Description
Brief description of what this PR does.

## Type of Change
- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update

## Changes Made
- Added proposal filtering by status
- Updated ProposalList component
- Added tests for filtering logic

## Testing
- [x] Unit tests pass (`npm run test`)
- [x] E2E tests pass (`npm run test:e2e`)
- [x] TypeScript compilation succeeds (`npm run typecheck`)
- [x] Linting passes (`npm run lint`)
- [x] Manual testing performed

## Screenshots (if applicable)
[Add screenshots or GIFs demonstrating the changes]

## Related Issues
Closes #123
Related to #456

## Checklist
- [x] Code follows project style guidelines
- [x] Self-reviewed my own code
- [x] Commented complex code sections
- [x] Updated relevant documentation
- [x] Added tests that prove my fix/feature works
- [x] All tests pass locally
- [x] No decrease in code coverage
```

### 5. Review Process

**Automated Checks** (run via GitHub Actions):
- TypeScript type checking
- ESLint linting
- Jest unit tests (736 tests)
- Playwright E2E tests
- Foundry contract tests
- Code coverage analysis

**Code Review:**
- At least one maintainer must approve
- Address all feedback and comments
- Keep discussion professional and constructive
- Update PR based on feedback

**Maintainer Responsibilities:**
- Review within 48-72 hours
- Provide clear, actionable feedback
- Help contributors improve their code
- Merge when approved and checks pass

### 6. After Merge

- Delete your feature branch
- Pull latest changes from main
- Celebrate! 🎉

## 📚 Documentation Standards

### Code Comments

```typescript
// ✅ Good: Explains WHY, not WHAT
// Use exponential backoff to prevent rate limiting when retrying failed requests
const delay = Math.min(1000 * Math.pow(2, retryCount), 10000);

// ❌ Bad: States the obvious
// Calculate delay
const delay = Math.min(1000 * Math.pow(2, retryCount), 10000);
```

### JSDoc for Public APIs

```typescript
/**
 * Fetches a proposal by ID from the smart contract.
 * 
 * @param proposalId - The unique identifier of the proposal
 * @returns Promise resolving to the proposal data
 * @throws {ContractError} If the proposal doesn't exist or contract call fails
 * 
 * @example
 * ```ts
 * const proposal = await fetchProposal('123');
 * console.log(proposal.title);
 * ```
 */
export async function fetchProposal(proposalId: string): Promise<ProposalData> {
  // Implementation
}
```

### Markdown Documentation

- Use clear headings and structure
- Include code examples
- Add links to related documentation
- Keep language simple and concise
- Use tables for structured data
- Add images/diagrams for complex concepts

### Updating Documentation

When you change code, update:
- Inline code comments (if logic changed)
- JSDoc (if API changed)
- README.md (if it affects getting started)
- DEVELOPER-GUIDE.md (if it affects development)
- Relevant guides in `/docs`

## ❓ Getting Help

### Resources

- **Developer Guide:** [DEVELOPER-GUIDE.md](DEVELOPER-GUIDE.md)
- **Testing Guide:** [TESTING.md](TESTING.md)
- **Architecture:** [ARCHITECTURE.md](ARCHITECTURE.md)
- **WebSocket Guide:** [WEBSOCKET-GUIDE.md](WEBSOCKET-GUIDE.md)

### Community

- **Discord:** [Join our server](https://discord.gg/vfide)
- **GitHub Discussions:** [Ask questions](https://github.com/Scorpio861104/Vfide/discussions)
- **Email:** dev@vfide.io

### Common Issues

**Build fails locally:**
```bash
npm run dev:reset  # Clean reinstall
npm run validate:env  # Check environment variables
```

**Tests fail:**
```bash
npm run test:coverage  # Identify failing tests
npm run test -- --verbose  # Get detailed output
```

**Type errors:**
```bash
npm run typecheck  # Check all TypeScript errors
```

## 📜 License

By contributing to VFIDE, you agree that your contributions will be licensed under the [MIT License](LICENSE).

---

**Thank you for making VFIDE better! 🚀**

We appreciate every contribution, no matter how small. Together, we're building the future of trust-based commerce.

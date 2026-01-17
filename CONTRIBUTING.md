# Contributing to VFIDE

Thank you for your interest in contributing to VFIDE! This document provides guidelines and instructions for contributing.

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Making Changes](#making-changes)
- [Testing](#testing)
- [Submitting Changes](#submitting-changes)
- [Code Style](#code-style)
- [Commit Guidelines](#commit-guidelines)

---

## Code of Conduct

By participating in this project, you agree to maintain a respectful, inclusive, and collaborative environment.

---

## Getting Started

### Prerequisites

- **Node.js**: 20.x or later (check with `node --version`)
- **npm**: 9.x or later
- **Git**: Latest version
- **WalletConnect Project ID**: Get free at https://cloud.walletconnect.com/

### Repository Structure

```
vfide/
├── app/              # Next.js app directory (routes, pages, layouts)
├── components/       # React components
├── hooks/            # Custom React hooks
├── lib/              # Utility functions, helpers, configs
├── __tests__/        # Test files
├── e2e/              # End-to-end tests (Playwright)
├── public/           # Static assets
└── docs/             # Documentation
```

---

## Development Setup

### 1. Fork and Clone

```bash
# Fork the repository on GitHub
# Then clone your fork
git clone https://github.com/YOUR_USERNAME/Vfide.git
cd Vfide

# Add upstream remote
git remote add upstream https://github.com/Scorpio861104/Vfide.git
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Configuration

```bash
# Copy the environment template
cp .env.example .env.local

# Edit .env.local and add your WalletConnect Project ID
# NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id_here
```

See [WALLET-CONNECTION-SETUP.md](WALLET-CONNECTION-SETUP.md) for detailed setup.

### 4. Start Development Server

```bash
npm run dev
```

Visit http://localhost:3000 to see your local instance.

---

## Making Changes

### 1. Create a Branch

```bash
# Update your local main branch
git checkout main
git pull upstream main

# Create a feature branch
git checkout -b feature/your-feature-name
# or
git checkout -b fix/your-fix-name
```

Branch naming conventions:
- `feature/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation updates
- `refactor/` - Code refactoring
- `test/` - Test additions or updates
- `chore/` - Maintenance tasks

### 2. Make Your Changes

- Write clean, readable code
- Follow existing code patterns
- Add comments for complex logic
- Update documentation as needed

### 3. Keep Your Branch Updated

```bash
# Fetch latest changes from upstream
git fetch upstream

# Rebase your branch on upstream/main
git rebase upstream/main
```

---

## Testing

### Run Tests Before Committing

```bash
# Run all tests
npm test

# Run specific test suites
npm run test:contract       # Contract interaction tests
npm run test:security       # Security tests
npm run test:integration    # Integration tests

# Run tests with coverage
npm run test:coverage

# Run E2E tests (requires dev server)
npm run test:e2e
```

### Writing Tests

- **Unit tests**: Test individual functions/components
- **Integration tests**: Test feature workflows
- **E2E tests**: Test complete user journeys

Example test structure:
```typescript
describe('ComponentName', () => {
  it('should render correctly', () => {
    // Arrange
    // Act
    // Assert
  })
})
```

See [TESTING.md](TESTING.md) and [COMPREHENSIVE-TESTING-PLAN.md](COMPREHENSIVE-TESTING-PLAN.md) for more details.

---

## Submitting Changes

### 1. Validate Your Changes

```bash
# Run validation checks
npm run validate

# This runs:
# - TypeScript type checking
# - ESLint
# - All tests
```

### 2. Commit Your Changes

Follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```bash
git add .
git commit -m "feat: add new staking rewards calculation"
```

Commit types:
- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation only
- `style:` - Code style changes (formatting, missing semicolons, etc.)
- `refactor:` - Code refactoring
- `test:` - Adding or updating tests
- `chore:` - Maintenance tasks

### 3. Push to Your Fork

```bash
git push origin feature/your-feature-name
```

### 4. Create Pull Request

1. Go to your fork on GitHub
2. Click "New Pull Request"
3. Select your branch
4. Fill in the PR template:
   - **Title**: Clear, concise description
   - **Description**: What changes and why
   - **Testing**: How you tested the changes
   - **Screenshots**: For UI changes

### 5. PR Review Process

- Automated checks will run (tests, linting, type checking)
- Maintainers will review your code
- Address any feedback or requested changes
- Once approved, your PR will be merged!

---

## Code Style

### General Guidelines

- **TypeScript**: Use TypeScript for all new code
- **Naming**: Use descriptive, meaningful names
- **Comments**: Explain "why", not "what"
- **Imports**: Group and sort imports logically
- **Functions**: Keep functions small and focused

### Formatting

We use Prettier for code formatting:

```bash
# Format all files
npx prettier --write .

# Check formatting
npx prettier --check .
```

Configuration: `.prettierrc.json`

### Linting

We use ESLint for code quality:

```bash
# Run ESLint
npm run lint

# Fix auto-fixable issues
npm run lint -- --fix
```

Configuration: `eslint.config.mjs`

### TypeScript

- Use strict type checking
- Avoid `any` - use specific types
- Define interfaces for complex objects
- Use type inference where appropriate

Example:
```typescript
// Good
interface UserProfile {
  address: string
  proofScore: number
  tier: 'elite' | 'high' | 'neutral' | 'low' | 'risky'
}

// Avoid
const user: any = { ... }
```

---

## Commit Guidelines

### Commit Message Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

Example:
```
feat(wallet): add support for Ledger hardware wallets

Added Ledger connector using RainbowKit's Ledger wallet integration.
Includes proper error handling for device connection failures.

Closes #123
```

### Commit Message Rules

1. **Type** (required): `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`
2. **Scope** (optional): Component or area affected (e.g., `wallet`, `staking`, `ui`)
3. **Subject** (required): Short description in present tense
4. **Body** (optional): Detailed explanation of changes
5. **Footer** (optional): Reference issues, breaking changes

### Pre-commit Hooks

We use Husky for pre-commit hooks:
- Runs linting on staged files
- Validates commit message format
- Runs type checking

---

## Documentation

### When to Update Docs

- Adding new features → Update relevant documentation
- Changing APIs → Update API documentation
- Adding configuration options → Update setup guides
- Fixing bugs → Update troubleshooting docs (if applicable)

### Documentation Files

- `README.md` - Project overview
- `WALLET-CONNECTION-SETUP.md` - Wallet setup guide
- `TESTING.md` - Testing documentation
- `COMPREHENSIVE-TESTING-PLAN.md` - Testing strategy
- `SYSTEM-ENHANCEMENTS.md` - Enhancement recommendations

---

## Getting Help

### Resources

- **Documentation**: Check existing docs in the repository
- **Issues**: Search existing issues on GitHub
- **Discussions**: Join GitHub Discussions for questions

### Asking Questions

When asking for help:
1. Search existing issues/discussions first
2. Provide context and details
3. Include relevant code snippets
4. Mention what you've already tried

---

## Development Tips

### Useful Commands

```bash
# Development
npm run dev                    # Start dev server
npm run dev:turbo              # Start with Turbopack

# Quality Checks
npm run typecheck              # Type checking
npm run lint                   # Linting
npm run validate               # All checks

# Testing
npm test                       # Run tests
npm run test:watch             # Watch mode
npm run test:e2e               # E2E tests
npm run test:comprehensive     # Comprehensive test suite

# Build
npm run build                  # Production build
npm run analyze                # Analyze bundle

# Utilities
npm run clean                  # Clean build artifacts
npm run check-circular         # Check for circular dependencies
```

### Debugging

- Use `console.log()` for quick debugging
- Use browser DevTools for frontend debugging
- Use VSCode debugger for backend debugging
- Check Network tab for API/RPC issues

### Performance

- Use React DevTools Profiler
- Check Lighthouse scores
- Monitor bundle size
- Optimize images (use Next.js Image component)

---

## Recognition

Contributors will be recognized in:
- GitHub Contributors section
- Release notes (for significant contributions)
- Project documentation

---

## License

By contributing to VFIDE, you agree that your contributions will be licensed under the same license as the project.

---

## Questions?

Feel free to ask questions by:
- Opening an issue with the "question" label
- Starting a discussion on GitHub Discussions
- Reaching out to maintainers

**Thank you for contributing to VFIDE! 🚀**

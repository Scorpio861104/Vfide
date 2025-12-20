# Contributing to VFIDE

Thank you for your interest in contributing to VFIDE! We welcome contributions from the community.

## Code of Conduct

By participating in this project, you agree to abide by our Code of Conduct:
- Be respectful and inclusive
- Focus on constructive feedback
- Prioritize security and user safety

## How to Contribute

### Reporting Bugs

If you find a bug:
1. Check if it's already reported in [Issues](https://github.com/Scorpio861104/Vfide/issues)
2. If not, create a new issue with:
   - Clear title and description
   - Steps to reproduce
   - Expected vs actual behavior
   - Environment details (OS, Node version, etc.)

### Security Vulnerabilities

**DO NOT** report security vulnerabilities in public issues. Instead:
- Email: security@vfide.io
- Include detailed description and reproduction steps
- See [SECURITY.md](SECURITY.md) for our security policy

### Suggesting Enhancements

To suggest a feature:
1. Check existing feature requests
2. Create an issue with:
   - Clear use case
   - Expected behavior
   - Why it benefits users

### Pull Requests

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
```bash
FOUNDRY_PROFILE=fuzz forge test --fuzz-runs 10000
```

### Coverage
```bash
forge coverage
```

### Gas Reports
```bash
forge test --gas-report
```

## Pull Request Review Process

1. **Automated Checks**
   - All tests must pass
   - Code coverage should not decrease
   - Gas usage should be reasonable
   - Linting must pass

2. **Code Review**
   - At least one maintainer must approve
   - Address all feedback
   - Keep discussion professional

3. **Merge**
   - Maintainer will merge when approved
   - May squash commits for cleaner history

## Documentation

- Update relevant docs in `/docs` or root markdown files
- Add inline code comments for complex logic
- Update CHANGELOG.md for significant changes

## Questions?

- Join our [Discord](https://discord.gg/vfide)
- Open a [Discussion](https://github.com/Scorpio861104/Vfide/discussions)
- Email: dev@vfide.io

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

Thank you for making VFIDE better! 🚀

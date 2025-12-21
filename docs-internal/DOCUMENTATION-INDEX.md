# VFIDE Documentation Index

> **Note:** This repository has been cleaned up for public viewing. Internal development documents have been moved to `docs-internal/` (gitignored).

## Quick Start

Welcome to the VFIDE technical documentation. This is your single source of truth for understanding the VFIDE protocol.

---

## 📚 Core Documentation (Read These)

### 1. [ARCHITECTURE.md](./ARCHITECTURE.md)
**System design and component overview**
- What VFIDE is and how it works
- 26 core contracts explained
- Architecture diagrams
- Design decisions and trade-offs

**Read if:** You want to understand the overall system

---

### 2. [CONTRACTS.md](./CONTRACTS.md)
**Smart contract technical reference**
- Contract-by-contract breakdown
- Function signatures and usage
- Code examples
- Integration guide for developers

**Read if:** You're building on VFIDE or auditing contracts

---

### 3. [ECONOMICS.md](./ECONOMICS.md)
**Tokenomics and fee structure**
- Token supply and distribution
- Fee model (0% payments, 2-4.5% transfers)
- ProofScore reputation system
- Deflationary mechanics

**Read if:** You want to understand the economic model

---

### 4. [SECURITY.md](./SECURITY.md)
**Security model and best practices**
- Threat model
- Security measures implemented
- Emergency procedures
- Bug bounty program
- User security guide

**Read if:** You're concerned about security or want to report bugs

---

### 5. [DEPLOYMENT.md](./DEPLOYMENT.md)
**How to deploy VFIDE**
- Deployment order and checklist
- TestNet → Audit → Mainnet process
- Emergency procedures
- Post-deployment monitoring

**Read if:** You're deploying or maintaining VFIDE

---

## 🔍 Quick Reference

### For Users
- **What is VFIDE?** See [ARCHITECTURE.md § System Overview](./ARCHITECTURE.md)
- **How do fees work?** See [ECONOMICS.md § Fee Structure](./ECONOMICS.md)
- **How to build ProofScore?** See [ECONOMICS.md § ProofScore Economics](./ECONOMICS.md)
- **Is it secure?** See [SECURITY.md § Security Model](./SECURITY.md)

### For Merchants
- **Why 0% fees?** See [ECONOMICS.md § Payment Fees](./ECONOMICS.md)
- **How to register?** See [CONTRACTS.md § MerchantPortal](./CONTRACTS.md)
- **Revenue comparison** See [ECONOMICS.md § Comparison to Competitors](./ECONOMICS.md)

### For Developers
- **Contract addresses** See [CONTRACTS.md § Contract Addresses](./CONTRACTS.md)
- **Integration guide** See [CONTRACTS.md § Integration Guide](./CONTRACTS.md)
- **Running tests** See [CONTRACTS.md § Testing Contracts](./CONTRACTS.md)
- **Deployment scripts** See [DEPLOYMENT.md](./DEPLOYMENT.md)

### For Auditors
- **Security model** See [SECURITY.md](./SECURITY.md)
- **Test coverage** See [TEST_RUNNER_GUIDE.md](./TEST_RUNNER_GUIDE.md)
- **Known limitations** See [SECURITY.md § Known Limitations](./SECURITY.md)
- **Edge cases** See [test/EdgeCaseTests.test.sol](./test/EdgeCaseTests.test.sol)

---

## 📊 Technical Specifications

### Contract Statistics
- **Total Contracts:** 26 core contracts
- **Total Lines:** ~8,000 lines of Solidity
- **Test Files:** 700+ comprehensive tests
- **Solidity Version:** 0.8.30
- **Target Chain:** zkSync Era

### Key Metrics
- **Max Supply:** 200,000,000 VFIDE
- **Transfer Fees:** 2-4.5% (ProofScore-adjusted)
- **Payment Fees:** 0% (merchants and customers)
- **ProofScore Range:** 0-10000 (10x precision, 5000 = 50%)
- **Governance Timelock:** 3 days

---

## 🗂️ Additional Resources

### README Files
- [README.md](./README.md) - Project overview
- [QUICK-START.md](./QUICK-START.md) - Getting started guide
- [TEST_RUNNER_GUIDE.md](./TEST_RUNNER_GUIDE.md) - Running tests

### Code Directories
- `contracts/` - All Solidity smart contracts
- `test/` - 700+ test files
- `scripts/` - Deployment and utility scripts
- `frontend/` - Web interface (Next.js)

### Archive
- `docs-archive/` - Historical documents (design iterations, old audits)
- `archive/` - Old code and experimental features

---

## 🎯 Documentation Goals

This documentation aims to be:
- **Comprehensive:** Everything you need in one place
- **Accurate:** Single source of truth, no contradictions
- **Accessible:** Clear explanations, not just jargon
- **Maintainable:** Easy to update as system evolves

---

## 📝 Recent Updates

### December 2025
- ✅ Consolidated 40+ documents into 5 core docs
- ✅ Created comprehensive edge case test suite
- ✅ Moved historical documents to archive
- ✅ Added this documentation index

### Next Steps
- [ ] External audit (professional firm)
- [ ] TestNet deployment
- [ ] Community feedback integration
- [ ] Final polish before mainnet

---

## 🤝 Contributing

### Reporting Issues
- **Security issues:** security@vfide.com (do NOT post publicly)
- **Documentation errors:** Open GitHub issue
- **Feature requests:** Discord #suggestions channel

### Improving Documentation
1. Check if issue already reported
2. Create clear, specific issue
3. Suggest concrete improvements
4. Submit PR if comfortable

---

## 📞 Contact

- **Website:** vfide.com
- **Discord:** discord.gg/vfide
- **Twitter:** @VFIDEProtocol
- **GitHub:** github.com/Scorpio861104/Vfide
- **Email:** hello@vfide.com
- **Security:** security@vfide.com

---

## ⚖️ License

VFIDE is licensed under MIT License. See [LICENSE](./LICENSE) file.

---

## 🙏 Acknowledgments

Built with:
- OpenZeppelin (security contracts)
- Hardhat (development environment)
- zkSync Era (Layer 2 scaling)
- Foundry (testing framework)
- Next.js (frontend)

Special thanks to:
- Community testers
- Security auditors
- Early adopters
- Contributors

---

**Last Updated:** December 4, 2025
**Documentation Version:** 1.0
**Contract Version:** Pre-Audit

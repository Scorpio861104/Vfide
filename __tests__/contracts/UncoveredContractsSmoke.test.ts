import fs from 'node:fs';
import path from 'node:path';

type ContractSmokeCase = {
  file: string;
  expectedPatterns: RegExp[];
};

const cases: ContractSmokeCase[] = [
  {
    file: 'AdminMultiSig.sol',
    expectedPatterns: [/contract\s+AdminMultiSig\b/],
  },
  {
    file: 'BadgeQualificationRules.sol',
    expectedPatterns: [
      /interface\s+IBadgeQualificationRules\b/,
      /contract\s+BadgeQualificationRules\b/,
    ],
  },
  {
    file: 'CircuitBreaker.sol',
    expectedPatterns: [/contract\s+CircuitBreaker\b/],
  },
  {
    file: 'DeployPhase1.sol',
    expectedPatterns: [/contract\s+Phase1Deployer\b/],
  },
  {
    file: 'DeployPhase1Governance.sol',
    expectedPatterns: [/contract\s+Phase1GovernanceDeployer\b/],
  },
  {
    file: 'DeployPhase1Infrastructure.sol',
    expectedPatterns: [/contract\s+Phase1InfrastructureDeployer\b/],
  },
  {
    file: 'DeployPhase1Token.sol',
    expectedPatterns: [/contract\s+Phase1TokenDeployer\b/],
  },
  {
    file: 'DeployPhases3to6.sol',
    expectedPatterns: [/contract\s+DeployPhase3\b/],
  },
  {
    file: 'SeerView.sol',
    expectedPatterns: [/contract\s+SeerView\b/],
  },
  {
    file: 'VFIDEAccessControl.sol',
    expectedPatterns: [/contract\s+VFIDEAccessControl\b/],
  },
  {
    file: 'VFIDEBridge.sol',
    expectedPatterns: [/contract\s+VFIDEBridge\b/],
  },
  {
    file: 'VFIDEPriceOracle.sol',
    expectedPatterns: [/contract\s+VFIDEPriceOracle\b/],
  },
  {
    file: 'VFIDEReentrancyGuard.sol',
    expectedPatterns: [/abstract\s+contract\s+VFIDEReentrancyGuard\b/],
  },
  // WithdrawalQueue.sol deleted per B-11 (dead code cleanup)
];

describe('Contract-by-contract uncovered smoke checks', () => {
  for (const testCase of cases) {
    it(`validates ${testCase.file}`, () => {
      const contractPath = path.join(process.cwd(), 'contracts', testCase.file);
      expect(fs.existsSync(contractPath)).toBe(true);

      const source = fs.readFileSync(contractPath, 'utf8');
      for (const pattern of testCase.expectedPatterns) {
        expect(source).toMatch(pattern);
      }
    });
  }
});

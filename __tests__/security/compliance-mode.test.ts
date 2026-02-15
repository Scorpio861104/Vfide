/**
 * Tests for VFIDEPresale complianceMode rename and preview fixes
 * Validates Solidity contract source changes
 */

import * as fs from 'fs';
import * as path from 'path';

describe('VFIDEPresale - Compliance Mode Audit Fixes', () => {
  let presaleSource: string;

  beforeAll(() => {
    presaleSource = fs.readFileSync(
      path.join(process.cwd(), 'contracts/VFIDEPresale.sol'),
      'utf-8'
    );
  });

  describe('howeySafeMode renamed to complianceMode', () => {
    it('should not contain any howeySafeMode references', () => {
      expect(presaleSource).not.toContain('howeySafeMode');
      expect(presaleSource).not.toContain('HoweySafeMode');
      expect(presaleSource).not.toContain('PS_HoweySafeMode');
    });

    it('should contain complianceMode state variable', () => {
      expect(presaleSource).toContain('bool public complianceMode');
    });

    it('should contain ComplianceModeSet event', () => {
      expect(presaleSource).toContain('event ComplianceModeSet(bool enabled)');
    });

    it('should contain PS_ComplianceMode error', () => {
      expect(presaleSource).toContain('error PS_ComplianceMode()');
    });

    it('should contain setComplianceMode function', () => {
      expect(presaleSource).toContain('function setComplianceMode');
    });
  });

  describe('Bonus constants annotated as inactive', () => {
    it('should mark BONUS_180_DAYS as inactive', () => {
      expect(presaleSource).toContain('BONUS_180_DAYS = 30');
      expect(presaleSource).toContain('(inactive)');
    });

    it('should mark REFERRER_BONUS as inactive', () => {
      expect(presaleSource).toContain('REFERRER_BONUS = 3');
      expect(presaleSource).toMatch(/REFERRER_BONUS.*inactive/);
    });

    it('should mark REFEREE_BONUS as inactive', () => {
      expect(presaleSource).toContain('REFEREE_BONUS = 2');
      expect(presaleSource).toMatch(/REFEREE_BONUS.*inactive/);
    });
  });

  describe('Preview functions respect complianceMode', () => {
    it('calculateTokensFromUsdPreview should be view (not pure) to read complianceMode', () => {
      expect(presaleSource).toMatch(/function calculateTokensFromUsdPreview.*external view/);
    });

    it('calculateTokensFromUsdPreview should use complianceMode ternary for bonus', () => {
      // Verify the preview function checks complianceMode
      expect(presaleSource).toContain('complianceMode ? 0 : (baseTokens * BONUS_180_DAYS)');
      expect(presaleSource).toContain('complianceMode ? 0 : (baseTokens * BONUS_90_DAYS)');
    });
  });
});

describe('Other Contracts - Compliance Mode Rename', () => {
  const contractFiles = [
    'contracts/DutyDistributor.sol',
    'contracts/CouncilSalary.sol',
    'contracts/CouncilManager.sol',
    'contracts/PromotionalTreasury.sol',
  ];

  contractFiles.forEach(file => {
    describe(file, () => {
      let source: string;

      beforeAll(() => {
        source = fs.readFileSync(path.join(process.cwd(), file), 'utf-8');
      });

      it('should not contain howeySafeMode', () => {
        expect(source).not.toContain('howeySafeMode');
        expect(source).not.toContain('HoweySafeMode');
      });

      it('should contain complianceMode', () => {
        expect(source).toContain('complianceMode');
      });

      it('should contain ComplianceModeUpdated event', () => {
        expect(source).toContain('ComplianceModeUpdated');
      });
    });
  });
});

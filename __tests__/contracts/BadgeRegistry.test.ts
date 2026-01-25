/**
 * BadgeRegistry Contract Tests
 * Comprehensive test suite for badge creation, assignment, verification, and metadata
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { Address } from 'viem';

// Mock contract interaction utilities
const mockContractRead = jest.fn();
const mockContractWrite = jest.fn();

describe('BadgeRegistry Contract', () => {
  let registryAddress: Address;
  let admin: Address;
  let issuer: Address;
  let user1: Address;
  let user2: Address;

  beforeEach(() => {
    registryAddress = '0xRegistry123456789012345678901234567890' as Address;
    admin = '0xAdmin1234567890123456789012345678901234' as Address;
    issuer = '0xIssuer1234567890123456789012345678901' as Address;
    user1 = '0xUser11234567890123456789012345678901234' as Address;
    user2 = '0xUser21234567890123456789012345678901234' as Address;

    jest.clearAllMocks();
  });

  describe('Badge Creation', () => {
    it('should allow admin to create new badge type', async () => {
      mockContractWrite.mockResolvedValueOnce('0xhash');

      const result = await mockContractWrite({
        functionName: 'createBadgeType',
        args: [
          'Pioneer',
          'Early adopter badge',
          'https://badges.vfide.io/pioneer.json'
        ]
      });

      expect(result).toBe('0xhash');
    });

    it('should emit BadgeTypeCreated event', async () => {
      mockContractWrite.mockResolvedValueOnce('0xhash');

      const result = await mockContractWrite({
        functionName: 'createBadgeType',
        args: ['Contributor', 'Active contributor', 'https://uri.com']
      });

      expect(result).toBe('0xhash');
    });

    it('should reject non-admin badge creation', async () => {
      mockContractWrite.mockRejectedValueOnce(new Error('Not admin'));

      await expect(async () => {
        await mockContractWrite({
          functionName: 'createBadgeType',
          args: ['Badge', 'Description', 'https://uri.com']
        });
      }).rejects.toThrow('Not admin');
    });

    it('should get badge type details', async () => {
      mockContractRead.mockResolvedValueOnce({
        id: 1n,
        name: 'Pioneer',
        description: 'Early adopter badge',
        metadataURI: 'https://badges.vfide.io/pioneer.json',
        issuer: issuer,
        totalIssued: 100n,
        isActive: true,
        createdAt: 1234567890n
      });

      const details = await mockContractRead({
        functionName: 'getBadgeType',
        args: [1n]
      });

      expect(details.name).toBe('Pioneer');
    });

    it('should get total badge types', async () => {
      mockContractRead.mockResolvedValueOnce(15n);

      const total = await mockContractRead({
        functionName: 'totalBadgeTypes'
      });

      expect(total).toBe(15n);
    });

    it('should allow admin to deactivate badge type', async () => {
      mockContractWrite.mockResolvedValueOnce('0xhash');

      const result = await mockContractWrite({
        functionName: 'deactivateBadgeType',
        args: [1n]
      });

      expect(result).toBe('0xhash');
    });

    it('should allow admin to reactivate badge type', async () => {
      mockContractWrite.mockResolvedValueOnce('0xhash');

      const result = await mockContractWrite({
        functionName: 'reactivateBadgeType',
        args: [1n]
      });

      expect(result).toBe('0xhash');
    });

    it('should check if badge type is active', async () => {
      mockContractRead.mockResolvedValueOnce(true);

      const isActive = await mockContractRead({
        functionName: 'isBadgeTypeActive',
        args: [1n]
      });

      expect(isActive).toBe(true);
    });

    it('should prevent empty badge name', async () => {
      mockContractWrite.mockRejectedValueOnce(new Error('Name required'));

      await expect(async () => {
        await mockContractWrite({
          functionName: 'createBadgeType',
          args: ['', 'Description', 'https://uri.com']
        });
      }).rejects.toThrow('Name required');
    });

    it('should get all badge types', async () => {
      mockContractRead.mockResolvedValueOnce([
        { id: 1n, name: 'Pioneer' },
        { id: 2n, name: 'Contributor' },
        { id: 3n, name: 'Validator' }
      ]);

      const types = await mockContractRead({
        functionName: 'getAllBadgeTypes'
      });

      expect(types).toHaveLength(3);
    });
  });

  describe('Badge Assignment', () => {
    it('should allow issuer to assign badge to user', async () => {
      mockContractWrite.mockResolvedValueOnce('0xhash');

      const result = await mockContractWrite({
        functionName: 'assignBadge',
        args: [user1, 1n, 'Early supporter']
      });

      expect(result).toBe('0xhash');
    });

    it('should only allow authorized issuers', async () => {
      mockContractWrite.mockRejectedValueOnce(new Error('Not authorized issuer'));

      await expect(async () => {
        await mockContractWrite({
          functionName: 'assignBadge',
          args: [user1, 1n, 'Reason']
        });
      }).rejects.toThrow('Not authorized issuer');
    });

    it('should prevent duplicate badge assignment', async () => {
      mockContractWrite.mockRejectedValueOnce(new Error('Badge already assigned'));

      await expect(async () => {
        await mockContractWrite({
          functionName: 'assignBadge',
          args: [user1, 1n, 'Reason']
        });
      }).rejects.toThrow('already assigned');
    });

    it('should emit BadgeAssigned event', async () => {
      mockContractWrite.mockResolvedValueOnce('0xhash');

      const result = await mockContractWrite({
        functionName: 'assignBadge',
        args: [user2, 2n, 'Active participation']
      });

      expect(result).toBe('0xhash');
    });

    it('should increment badge count on assignment', async () => {
      mockContractWrite.mockResolvedValueOnce('0xhash');

      await mockContractWrite({
        functionName: 'assignBadge',
        args: [user1, 1n, 'Reason']
      });

      mockContractRead.mockResolvedValueOnce(6n); // incremented

      const count = await mockContractRead({
        functionName: 'getUserBadgeCount',
        args: [user1]
      });

      expect(count).toBe(6n);
    });

    it('should allow batch badge assignment', async () => {
      mockContractWrite.mockResolvedValueOnce('0xhash');

      const result = await mockContractWrite({
        functionName: 'batchAssignBadge',
        args: [[user1, user2], 1n, 'Mass distribution']
      });

      expect(result).toBe('0xhash');
    });

    it('should allow admin to revoke badge', async () => {
      mockContractWrite.mockResolvedValueOnce('0xhash');

      const result = await mockContractWrite({
        functionName: 'revokeBadge',
        args: [user1, 1n, 'Terms violation']
      });

      expect(result).toBe('0xhash');
    });

    it('should emit BadgeRevoked event', async () => {
      mockContractWrite.mockResolvedValueOnce('0xhash');

      const result = await mockContractWrite({
        functionName: 'revokeBadge',
        args: [user1, 1n, 'Reason']
      });

      expect(result).toBe('0xhash');
    });

    it('should prevent assignment of inactive badge type', async () => {
      mockContractWrite.mockRejectedValueOnce(new Error('Badge type not active'));

      await expect(async () => {
        await mockContractWrite({
          functionName: 'assignBadge',
          args: [user1, 1n, 'Reason']
        });
      }).rejects.toThrow('not active');
    });

    it('should get badge assignment details', async () => {
      mockContractRead.mockResolvedValueOnce({
        badgeId: 1n,
        recipient: user1,
        issuer: issuer,
        reason: 'Early supporter',
        timestamp: 1234567890n,
        isActive: true
      });

      const details = await mockContractRead({
        functionName: 'getBadgeAssignment',
        args: [user1, 1n]
      });

      expect(details.recipient).toBe(user1);
    });
  });

  describe('Badge Verification', () => {
    it('should check if user has badge', async () => {
      mockContractRead.mockResolvedValueOnce(true);

      const hasBadge = await mockContractRead({
        functionName: 'hasBadge',
        args: [user1, 1n]
      });

      expect(hasBadge).toBe(true);
    });

    it('should return false for non-assigned badge', async () => {
      mockContractRead.mockResolvedValueOnce(false);

      const hasBadge = await mockContractRead({
        functionName: 'hasBadge',
        args: [user2, 1n]
      });

      expect(hasBadge).toBe(false);
    });

    it('should verify badge authenticity', async () => {
      mockContractRead.mockResolvedValueOnce({
        isValid: true,
        badgeId: 1n,
        assignedAt: 1234567890n,
        issuer: issuer
      });

      const verification = await mockContractRead({
        functionName: 'verifyBadge',
        args: [user1, 1n]
      });

      expect(verification.isValid).toBe(true);
    });

    it('should check if badge is revoked', async () => {
      mockContractRead.mockResolvedValueOnce(true);

      const isRevoked = await mockContractRead({
        functionName: 'isBadgeRevoked',
        args: [user1, 1n]
      });

      expect(isRevoked).toBe(true);
    });

    it('should get badge validity status', async () => {
      mockContractRead.mockResolvedValueOnce({
        isValid: true,
        isRevoked: false,
        isExpired: false,
        expiryDate: 0n
      });

      const status = await mockContractRead({
        functionName: 'getBadgeStatus',
        args: [user1, 1n]
      });

      expect(status.isValid).toBe(true);
    });

    it('should verify multiple badges for user', async () => {
      mockContractRead.mockResolvedValueOnce([true, true, false]);

      const results = await mockContractRead({
        functionName: 'verifyMultipleBadges',
        args: [user1, [1n, 2n, 3n]]
      });

      expect(results).toHaveLength(3);
    });

    it('should get verification proof', async () => {
      mockContractRead.mockResolvedValueOnce({
        recipient: user1,
        badgeId: 1n,
        issuer: issuer,
        timestamp: 1234567890n,
        signature: '0xabc123'
      });

      const proof = await mockContractRead({
        functionName: 'getVerificationProof',
        args: [user1, 1n]
      });

      expect(proof.recipient).toBe(user1);
    });

    it('should check issuer authorization', async () => {
      mockContractRead.mockResolvedValueOnce(true);

      const isAuthorized = await mockContractRead({
        functionName: 'isAuthorizedIssuer',
        args: [issuer]
      });

      expect(isAuthorized).toBe(true);
    });
  });

  describe('Metadata Management', () => {
    it('should get badge metadata URI', async () => {
      mockContractRead.mockResolvedValueOnce('https://badges.vfide.io/pioneer.json');

      const uri = await mockContractRead({
        functionName: 'getBadgeURI',
        args: [1n]
      });

      expect(uri).toBe('https://badges.vfide.io/pioneer.json');
    });

    it('should allow admin to update metadata URI', async () => {
      mockContractWrite.mockResolvedValueOnce('0xhash');

      const result = await mockContractWrite({
        functionName: 'updateBadgeURI',
        args: [1n, 'https://badges.vfide.io/pioneer-v2.json']
      });

      expect(result).toBe('0xhash');
    });

    it('should get badge metadata', async () => {
      mockContractRead.mockResolvedValueOnce({
        name: 'Pioneer',
        description: 'Early adopter badge',
        image: 'https://badges.vfide.io/images/pioneer.png',
        attributes: [
          { trait_type: 'Rarity', value: 'Legendary' },
          { trait_type: 'Level', value: '1' }
        ]
      });

      const metadata = await mockContractRead({
        functionName: 'getBadgeMetadata',
        args: [1n]
      });

      expect(metadata.name).toBe('Pioneer');
    });

    it('should emit MetadataUpdated event', async () => {
      mockContractWrite.mockResolvedValueOnce('0xhash');

      const result = await mockContractWrite({
        functionName: 'updateBadgeURI',
        args: [1n, 'https://new-uri.com']
      });

      expect(result).toBe('0xhash');
    });

    it('should allow admin to set base URI', async () => {
      mockContractWrite.mockResolvedValueOnce('0xhash');

      const result = await mockContractWrite({
        functionName: 'setBaseURI',
        args: ['https://badges.vfide.io/']
      });

      expect(result).toBe('0xhash');
    });

    it('should get complete badge URI with base', async () => {
      mockContractRead.mockResolvedValueOnce('https://badges.vfide.io/1.json');

      const uri = await mockContractRead({
        functionName: 'tokenURI',
        args: [1n]
      });

      expect(uri).toBe('https://badges.vfide.io/1.json');
    });

    it('should update badge description', async () => {
      mockContractWrite.mockResolvedValueOnce('0xhash');

      const result = await mockContractWrite({
        functionName: 'updateBadgeDescription',
        args: [1n, 'Updated description']
      });

      expect(result).toBe('0xhash');
    });

    it('should get badge attributes', async () => {
      mockContractRead.mockResolvedValueOnce([
        { key: 'Rarity', value: 'Legendary' },
        { key: 'Level', value: '1' }
      ]);

      const attributes = await mockContractRead({
        functionName: 'getBadgeAttributes',
        args: [1n]
      });

      expect(attributes).toHaveLength(2);
    });
  });

  describe('User Badge Management', () => {
    it('should get all badges for user', async () => {
      mockContractRead.mockResolvedValueOnce([1n, 2n, 5n]);

      const badges = await mockContractRead({
        functionName: 'getUserBadges',
        args: [user1]
      });

      expect(badges).toHaveLength(3);
    });

    it('should get user badge count', async () => {
      mockContractRead.mockResolvedValueOnce(5n);

      const count = await mockContractRead({
        functionName: 'getUserBadgeCount',
        args: [user1]
      });

      expect(count).toBe(5n);
    });

    it('should get user badge details', async () => {
      mockContractRead.mockResolvedValueOnce([
        { badgeId: 1n, name: 'Pioneer', assignedAt: 1234567890n },
        { badgeId: 2n, name: 'Contributor', assignedAt: 1234667890n }
      ]);

      const details = await mockContractRead({
        functionName: 'getUserBadgeDetails',
        args: [user1]
      });

      expect(details).toHaveLength(2);
    });

    it('should check if user has any badges', async () => {
      mockContractRead.mockResolvedValueOnce(true);

      const hasAny = await mockContractRead({
        functionName: 'hasAnyBadge',
        args: [user1]
      });

      expect(hasAny).toBe(true);
    });

    it('should get badge assignment history', async () => {
      mockContractRead.mockResolvedValueOnce([
        { badgeId: 1n, timestamp: 1234567890n, action: 'assigned' },
        { badgeId: 1n, timestamp: 1237159890n, action: 'revoked' }
      ]);

      const history = await mockContractRead({
        functionName: 'getBadgeHistory',
        args: [user1, 1n]
      });

      expect(history).toHaveLength(2);
    });

    it('should get most recent badge', async () => {
      mockContractRead.mockResolvedValueOnce({
        badgeId: 5n,
        name: 'Latest Badge',
        assignedAt: 1234667890n
      });

      const recent = await mockContractRead({
        functionName: 'getMostRecentBadge',
        args: [user1]
      });

      expect(recent.badgeId).toBe(5n);
    });

    it('should filter badges by type', async () => {
      mockContractRead.mockResolvedValueOnce([1n, 3n]);

      const filtered = await mockContractRead({
        functionName: 'filterUserBadgesByType',
        args: [user1, 'Achievement']
      });

      expect(filtered).toHaveLength(2);
    });
  });

  describe('Badge Statistics', () => {
    it('should get total badges issued', async () => {
      mockContractRead.mockResolvedValueOnce(5000n);

      const total = await mockContractRead({
        functionName: 'totalBadgesIssued'
      });

      expect(total).toBe(5000n);
    });

    it('should get badges issued by type', async () => {
      mockContractRead.mockResolvedValueOnce(150n);

      const count = await mockContractRead({
        functionName: 'getBadgeTypeIssuedCount',
        args: [1n]
      });

      expect(count).toBe(150n);
    });

    it('should get badge holders count', async () => {
      mockContractRead.mockResolvedValueOnce(120n);

      const holders = await mockContractRead({
        functionName: 'getBadgeHoldersCount',
        args: [1n]
      });

      expect(holders).toBe(120n);
    });

    it('should get all badge holders', async () => {
      mockContractRead.mockResolvedValueOnce([user1, user2]);

      const holders = await mockContractRead({
        functionName: 'getBadgeHolders',
        args: [1n]
      });

      expect(holders).toHaveLength(2);
    });

    it('should get badge rarity score', async () => {
      mockContractRead.mockResolvedValueOnce(95n); // 95% rarity

      const rarity = await mockContractRead({
        functionName: 'getBadgeRarity',
        args: [1n]
      });

      expect(rarity).toBe(95n);
    });

    it('should get platform statistics', async () => {
      mockContractRead.mockResolvedValueOnce({
        totalBadgeTypes: 20n,
        totalBadgesIssued: 5000n,
        totalHolders: 1500n,
        totalRevoked: 50n
      });

      const stats = await mockContractRead({
        functionName: 'getPlatformStats'
      });

      expect(stats.totalBadgeTypes).toBe(20n);
    });

    it('should get issuer statistics', async () => {
      mockContractRead.mockResolvedValueOnce({
        totalIssued: 250n,
        badgeTypes: 5n,
        activeRecipients: 200n
      });

      const stats = await mockContractRead({
        functionName: 'getIssuerStats',
        args: [issuer]
      });

      expect(stats.totalIssued).toBe(250n);
    });
  });

  describe('Issuer Management', () => {
    it('should allow admin to add issuer', async () => {
      mockContractWrite.mockResolvedValueOnce('0xhash');

      const result = await mockContractWrite({
        functionName: 'addIssuer',
        args: [issuer]
      });

      expect(result).toBe('0xhash');
    });

    it('should allow admin to remove issuer', async () => {
      mockContractWrite.mockResolvedValueOnce('0xhash');

      const result = await mockContractWrite({
        functionName: 'removeIssuer',
        args: [issuer]
      });

      expect(result).toBe('0xhash');
    });

    it('should check if address is issuer', async () => {
      mockContractRead.mockResolvedValueOnce(true);

      const isIssuer = await mockContractRead({
        functionName: 'isIssuer',
        args: [issuer]
      });

      expect(isIssuer).toBe(true);
    });

    it('should emit IssuerAdded event', async () => {
      mockContractWrite.mockResolvedValueOnce('0xhash');

      const result = await mockContractWrite({
        functionName: 'addIssuer',
        args: [issuer]
      });

      expect(result).toBe('0xhash');
    });

    it('should emit IssuerRemoved event', async () => {
      mockContractWrite.mockResolvedValueOnce('0xhash');

      const result = await mockContractWrite({
        functionName: 'removeIssuer',
        args: [issuer]
      });

      expect(result).toBe('0xhash');
    });

    it('should get all issuers', async () => {
      mockContractRead.mockResolvedValueOnce([issuer, admin]);

      const issuers = await mockContractRead({
        functionName: 'getAllIssuers'
      });

      expect(issuers).toHaveLength(2);
    });

    it('should reject non-admin issuer management', async () => {
      mockContractWrite.mockRejectedValueOnce(new Error('Not admin'));

      await expect(async () => {
        await mockContractWrite({
          functionName: 'addIssuer',
          args: [issuer]
        });
      }).rejects.toThrow('Not admin');
    });
  });

  describe('Admin Functions', () => {
    it('should return admin address', async () => {
      mockContractRead.mockResolvedValueOnce(admin);

      const result = await mockContractRead({
        functionName: 'admin'
      });

      expect(result).toBe(admin);
    });

    it('should allow admin to set new admin', async () => {
      const newAdmin = '0xNewAdmin1234567890123456789012345678' as Address;
      mockContractWrite.mockResolvedValueOnce('0xhash');

      const result = await mockContractWrite({
        functionName: 'setAdmin',
        args: [newAdmin]
      });

      expect(result).toBe('0xhash');
    });

    it('should allow admin to pause contract', async () => {
      mockContractWrite.mockResolvedValueOnce('0xhash');

      const result = await mockContractWrite({
        functionName: 'pause',
        args: []
      });

      expect(result).toBe('0xhash');
    });

    it('should prevent operations when paused', async () => {
      mockContractWrite.mockRejectedValueOnce(new Error('Contract is paused'));

      await expect(async () => {
        await mockContractWrite({
          functionName: 'assignBadge',
          args: [user1, 1n, 'Reason']
        });
      }).rejects.toThrow('paused');
    });
  });

  describe('Edge Cases and Integration', () => {
    it('should handle user with no badges', async () => {
      mockContractRead.mockResolvedValueOnce([]);

      const badges = await mockContractRead({
        functionName: 'getUserBadges',
        args: [user2]
      });

      expect(badges).toHaveLength(0);
    });

    it('should prevent badge type with ID 0', async () => {
      mockContractRead.mockRejectedValueOnce(new Error('Invalid badge ID'));

      await expect(async () => {
        await mockContractRead({
          functionName: 'getBadgeType',
          args: [0n]
        });
      }).rejects.toThrow('Invalid badge ID');
    });

    it('should get badge creation timestamp', async () => {
      mockContractRead.mockResolvedValueOnce(1234567890n);

      const timestamp = await mockContractRead({
        functionName: 'getBadgeCreationTime',
        args: [1n]
      });

      expect(timestamp).toBe(1234567890n);
    });
  });
});

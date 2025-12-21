# Badge Implementation Guide

Quick reference for implementing automatic badge awarding logic in VFIDE contracts.

## Contract Integration Pattern

### 1. Import BadgeRegistry
```solidity
import "./BadgeRegistry.sol";
```

### 2. Access Seer Contract
```solidity
VFIDETrust public immutable seer;

constructor(address _seer) {
    seer = VFIDETrust(_seer);
}
```

### 3. Award Badge Pattern
```solidity
// Check criteria
if (meetsRequirements(user)) {
    // Award badge (only authorized contracts can call setBadge)
    seer.setBadge(user, BadgeRegistry.BADGE_NAME, true);
}
```

---

## Badge Awarding Logic by Type

### Activity-Based Badges (Automated)

#### `ACTIVE_TRADER` - VFIDECommerce.sol
```solidity
// After successful transaction
function _afterTransactionComplete(address user) internal {
    // Count user's transactions in last 90 days
    uint256 recentTxCount = _getRecentTransactionCount(user, 90 days);
    
    if (recentTxCount >= 50 && !seer.hasBadge(user, BadgeRegistry.ACTIVE_TRADER)) {
        seer.setBadge(user, BadgeRegistry.ACTIVE_TRADER, true);
    }
}
```

#### `GOVERNANCE_VOTER` - DAO.sol
```solidity
// After vote cast
function _afterVoteCast(address voter) internal {
    uint256 voteCount = totalVotesCast[voter];
    
    if (voteCount >= 10 && !seer.hasBadge(voter, BadgeRegistry.GOVERNANCE_VOTER)) {
        seer.setBadge(voter, BadgeRegistry.GOVERNANCE_VOTER, true);
    }
}
```

#### `POWER_USER` - VFIDETrust.sol
```solidity
// Called whenever diversification changes
function _checkPowerUserBadge(address user) internal {
    if (hasVoted[user] && hasMadePayment[user] && hasReceivedPayment[user] && hasGivenEndorsement[user]) {
        if (!hasBadge[user][BadgeRegistry.POWER_USER]) {
            setBadge(user, BadgeRegistry.POWER_USER, true);
        }
    }
}
```

#### `TRUSTED_ENDORSER` - VFIDETrust.sol
```solidity
// Called periodically or when checking endorsements
function _checkTrustedEndorser(address endorser) internal {
    if (goodEndorsements[endorser] >= 5 && badEndorsements[endorser] == 0) {
        if (!hasBadge[endorser][BadgeRegistry.TRUSTED_ENDORSER]) {
            setBadge(endorser, BadgeRegistry.TRUSTED_ENDORSER, true);
        }
    }
}
```

---

### Manual Award Badges (DAO Controlled)

These badges require DAO proposal + vote:

#### `FOUNDING_MEMBER`
```solidity
// DAO proposal to award badge to first 1,000 elite users
// Check: User reached 800+ score AND foundingMemberCount < 1000
function awardFoundingMember(address user) external onlyDAO {
    require(getScore(user) >= 800, "Score too low");
    require(foundingMemberCount < 1000, "All slots filled");
    
    seer.setBadge(user, BadgeRegistry.FOUNDING_MEMBER, true);
    foundingMemberCount++;
}
```

#### `PEACEMAKER`, `MENTOR`, `EDUCATOR`, `CONTRIBUTOR`
```solidity
// DAO proposal: "Award PEACEMAKER badge to 0x123... for resolving dispute #45"
function awardManualBadge(address user, bytes32 badge) external onlyDAO {
    seer.setBadge(user, badge, true);
}
```

---

### Commerce Badges

#### `VERIFIED_MERCHANT` - Automated Check
```solidity
// In VFIDECommerce.sol
function _checkMerchantBadges(address merchant) internal {
    MerchantStats memory stats = merchantStats[merchant];
    
    // VERIFIED_MERCHANT
    if (stats.totalTransactions >= 100 && 
        stats.disputes == 0 && 
        seer.getScore(merchant) >= 700) {
        
        if (!seer.hasBadge(merchant, BadgeRegistry.VERIFIED_MERCHANT)) {
            seer.setBadge(merchant, BadgeRegistry.VERIFIED_MERCHANT, true);
        }
    }
    
    // ELITE_MERCHANT
    if (stats.totalTransactions >= 1000 && 
        stats.totalVolume >= 100_000e18 && 
        stats.rating >= 480) { // 4.8/5 = 480/100
        
        if (!seer.hasBadge(merchant, BadgeRegistry.ELITE_MERCHANT)) {
            seer.setBadge(merchant, BadgeRegistry.ELITE_MERCHANT, true);
        }
    }
    
    // ZERO_DISPUTE
    if (stats.totalTransactions >= 200 && stats.disputes == 0) {
        if (!seer.hasBadge(merchant, BadgeRegistry.ZERO_DISPUTE)) {
            seer.setBadge(merchant, BadgeRegistry.ZERO_DISPUTE, true);
        }
    }
}
```

#### `INSTANT_SETTLEMENT` - Score-Based
```solidity
// In VFIDETrust.sol - Update when score changes
function _updateInstantSettlementBadge(address user) internal {
    uint16 score = getScore(user);
    bool hasInstant = hasBadge[user][BadgeRegistry.INSTANT_SETTLEMENT];
    
    if (score >= 800 && !hasInstant) {
        setBadge(user, BadgeRegistry.INSTANT_SETTLEMENT, true);
    } else if (score < 800 && hasInstant) {
        setBadge(user, BadgeRegistry.INSTANT_SETTLEMENT, false);
    }
}
```

---

### Security Badges

#### `CLEAN_RECORD` - Automated Check
```solidity
// In VFIDETrust.sol - Check on anniversary dates
function _checkCleanRecord(address user) internal {
    uint256 lastNegative = lastNegativeEvent[user];
    
    if (lastNegative > 0 && block.timestamp >= lastNegative + 365 days) {
        // Check if truly no negative events in last year
        if (_noNegativeEventsSince(user, lastNegative)) {
            if (!hasBadge[user][BadgeRegistry.CLEAN_RECORD]) {
                setBadge(user, BadgeRegistry.CLEAN_RECORD, true);
            }
        }
    }
}
```

#### `REDEMPTION` - Automatic on Forgiveness
```solidity
// In VFIDETrust.sol - When forgiveness applies
function _applyForgiveness(address user) internal {
    if (block.timestamp >= lastNegativeEvent[user] + REDEMPTION_PERIOD) {
        if (!hasBadge[user][BadgeRegistry.REDEMPTION]) {
            setBadge(user, BadgeRegistry.REDEMPTION, true);
        }
    }
}
```

#### `GUARDIAN` - Long-term Excellence Check
```solidity
// Run periodically via keeper or on-demand
function checkGuardianStatus(address user) external {
    // Check score never dropped below 700 for 2+ years
    if (minScoreLast2Years[user] >= 700 && accountAge[user] >= 730 days) {
        if (!seer.hasBadge(user, BadgeRegistry.GUARDIAN)) {
            seer.setBadge(user, BadgeRegistry.GUARDIAN, true);
        }
    }
}
```

---

### Achievement Badges

#### `ELITE_ACHIEVER` - Score Milestone
```solidity
// In VFIDETrust.sol - Check when score updates
function _checkEliteAchiever(address user) internal {
    uint16 score = getScore(user);
    
    if (score >= 900 && !hasBadge[user][BadgeRegistry.ELITE_ACHIEVER]) {
        setBadge(user, BadgeRegistry.ELITE_ACHIEVER, true);
    }
}
```

#### `WHALE_SLAYER` - DAO Vote Result
```solidity
// In DAO.sol - After proposal execution
function _afterProposalExecution(uint256 proposalId) internal {
    Proposal memory p = proposals[proposalId];
    
    if (p.passed) {
        // Check if any voters defeated whales
        for (uint i = 0; i < p.voters.length; i++) {
            address voter = p.voters[i];
            uint256 voterWeight = votingWeight[voter];
            
            // Find opposing voters with 10x tokens
            if (_defeatedWhale(voter, voterWeight, p)) {
                seer.setBadge(voter, BadgeRegistry.WHALE_SLAYER, true);
            }
        }
    }
}
```

---

## Badge Renewal Logic

### Automatic Renewal Pattern
```solidity
// In periodic keeper job or before badge checks
function renewBadgeIfEligible(address user, bytes32 badge) internal {
    // Check if badge expired
    uint256 expiry = seer.badgeExpiry(user, badge);
    if (expiry > 0 && block.timestamp > expiry) {
        // Check if renewal criteria still met
        if (_meetsRenewalCriteria(user, badge)) {
            seer.renewBadge(user, badge);
        } else {
            // Remove expired badge
            seer.setBadge(user, badge, false);
        }
    }
}
```

### Renewal Criteria Examples

#### `ACTIVE_TRADER` Renewal
```solidity
function _meetsActiveTraderRenewal(address user) internal view returns (bool) {
    uint256 txLast90Days = _getRecentTransactionCount(user, 90 days);
    return txLast90Days >= 50;
}
```

#### `GOVERNANCE_VOTER` Renewal
```solidity
function _meetsGovernanceVoterRenewal(address voter) internal view returns (bool) {
    // Need 5 more votes in last 180 days
    uint256 recentVotes = _getVotesSince(voter, block.timestamp - 180 days);
    return recentVotes >= 5;
}
```

---

## Frontend Integration

### Badge Display Component
```typescript
// components/BadgeDisplay.tsx
import { BadgeRegistry } from '@/lib/badge-registry';

interface BadgeDisplayProps {
  userAddress: string;
}

export function BadgeDisplay({ userAddress }: BadgeDisplayProps) {
  const { data: badges } = useUserBadges(userAddress);
  
  return (
    <div className="flex flex-wrap gap-2">
      {badges?.map((badge) => (
        <Badge
          key={badge.id}
          name={BadgeRegistry.getName(badge.id)}
          icon={BadgeRegistry.getIcon(badge.id)}
          category={BadgeRegistry.getCategory(badge.id)}
          expiry={badge.expiry}
          permanent={BadgeRegistry.isPermanent(badge.id)}
        />
      ))}
    </div>
  );
}
```

### Badge Progress Tracking
```typescript
// components/BadgeProgress.tsx
export function BadgeProgress({ badge, user }: BadgeProgressProps) {
  const progress = getBadgeProgress(badge, user);
  
  return (
    <div className="badge-progress">
      <h4>{BadgeRegistry.getName(badge)}</h4>
      <ProgressBar value={progress.current} max={progress.required} />
      <p>{progress.description}</p>
    </div>
  );
}
```

---

## Testing Checklist

- [ ] Badge awards correctly when criteria met
- [ ] Badge doesn't award if criteria not met
- [ ] Badge doesn't duplicate (same badge multiple times)
- [ ] Badge expiration works correctly
- [ ] Badge renewal criteria validated
- [ ] Expired badges removed from score calculation
- [ ] DAO can manually award badges
- [ ] Non-authorized contracts cannot award badges
- [ ] Badge points calculated correctly in ProofScore
- [ ] Frontend displays badges with correct metadata

---

## Deployment Checklist

1. [ ] Deploy `BadgeRegistry.sol` as library
2. [ ] Run `ConfigureBadges.s.sol` script via DAO
3. [ ] Verify badge weights in Seer contract
4. [ ] Verify badge durations in Seer contract
5. [ ] Update frontend badge metadata
6. [ ] Document badge earning requirements for users
7. [ ] Set up automated badge checking (keeper jobs)
8. [ ] Create DAO proposal template for manual badges
9. [ ] Add badge renewal monitoring
10. [ ] Launch badge marketplace UI

---

## Philosophy Enforcement

### ✅ Every Badge Implementation Must:
1. Be earned through **actions**, never purchased
2. Have clear, **objective criteria** (no favoritism)
3. Be **achievable by anyone** (regardless of holdings)
4. **Expire if appropriate** (maintain quality standards)
5. Add **meaningful value** to ProofScore or permissions

### ❌ Never Create Badges That:
1. Require holding X tokens (wealth gate)
2. Can be bought/sold/transferred (pay-to-win)
3. Give advantages based on capital size
4. Are subjective without DAO oversight
5. Conflict with "1 VFIDE = 500K VFIDE" philosophy

---

## Support Resources

- **Badge System V2 Docs**: `/workspaces/Vfide/BADGE-SYSTEM-V2.md`
- **Badge Registry Contract**: `/workspaces/Vfide/contracts/BadgeRegistry.sol`
- **Configuration Script**: `/workspaces/Vfide/scripts/ConfigureBadges.s.sol`
- **Seer Contract**: `/workspaces/Vfide/contracts/VFIDETrust.sol`
- **Philosophy Document**: `/workspaces/Vfide/VFIDE-CORE-PHILOSOPHY.md`

---

**Remember**: Badges are trust credentials earned through integrity and action. Every badge tells a story of contribution to the VFIDE ecosystem. 💎

# VFIDE Badge NFT System - Hybrid Implementation

> "Earn badges through actions, commemorate them as soulbound NFTs"

## Architecture Overview

VFIDE uses a **hybrid badge system** that combines gas efficiency with NFT collectibility:

### 1. **Seer Contract (VFIDETrust.sol)** - Source of Truth
- Stores badge ownership as boolean flags
- Calculates ProofScore from badges
- Manages badge expiration/renewal
- Gas-efficient for core operations

### 2. **Badge NFT Contract (VFIDEBadgeNFT.sol)** - Commemorative Layer
- Optional NFT minting for earned badges
- Soulbound (ERC-5192) - cannot be transferred
- Rich metadata with images and provenance
- Visible on OpenSea, wallets, Discord

```
┌─────────────────────────────────────────────────────────────┐
│                     User Earns Badge                        │
│                   (Activity/Achievement)                     │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
         ┌────────────────────────────┐
         │   VFIDETrust.sol (Seer)    │
         │                            │
         │  hasBadge[user][badge] ✅  │◄──── ProofScore uses this
         │  Adds points to score      │
         └────────────┬───────────────┘
                      │
                      │ User decides to mint NFT
                      ▼
         ┌────────────────────────────┐
         │   VFIDEBadgeNFT.sol        │
         │                            │
         │  Verifies via Seer ✅      │◄──── NFT marketplaces see this
         │  Mints soulbound NFT       │
         │  Stores provenance data    │
         └────────────────────────────┘
```

## Key Features

### ✅ **Lazy Minting**
- Badges exist in Seer immediately (gas-free)
- Users mint NFTs only if they want to showcase them
- Minting costs gas, but is completely optional

### 🔒 **Soulbound (Non-Transferable)**
- Implements ERC-5192 standard
- Cannot be sold, traded, or transferred
- Can only be burned by owner or admin (if revoked)
- Prevents badge marketplaces

### 📜 **Provenance Tracking**
- Badge number: "Pioneer #2,847" (shows mint order)
- Mint timestamp: When NFT was claimed
- Original owner: Wallet that earned it
- Badge metadata: Category, points, rarity

### 🎨 **Rich Metadata**
Each NFT has JSON metadata with:
- Badge name and description
- Category and rarity tier
- High-quality image/animation
- Earn date and badge number
- Points value
- Permanent/renewable status

## Contract Interface

### Minting

```solidity
// Mint single badge
function mintBadge(bytes32 badge) external returns (uint256 tokenId);

// Batch mint all earned badges
function mintBadges(bytes32[] calldata badges) external returns (uint256[] memory tokenIds);

// Check if can mint
function canMintBadge(address user, bytes32 badge) external view returns (bool canMint, string memory reason);
```

### Viewing

```solidity
// Get all badge NFTs owned by user
function getBadgesOfUser(address user) external view returns (uint256[] memory tokens);

// Get badge details
function getBadgeDetails(uint256 tokenId) external view returns (
    bytes32 badge,
    string memory name,
    string memory category,
    uint256 mintTime,
    uint256 number
);

// Get total minted count per badge
function getBadgeMintCount(bytes32 badge) external view returns (uint256);
```

### Management

```solidity
// User burns their own badge NFT
function burnBadge(uint256 tokenId) external;

// Admin burns if badge revoked in Seer
function adminBurn(uint256 tokenId) external onlyOwner;

// Update metadata base URI
function setBaseURI(string memory baseURI) external onlyOwner;
```

## Metadata Structure

### JSON Format

```json
{
  "name": "VFIDE Pioneer #2847",
  "description": "Awarded to the first 10,000 users who joined VFIDE and believed in integrity over wealth. This commemorative badge is soulbound and cannot be transferred.",
  "image": "https://badges.vfide.com/pioneer/2847.png",
  "animation_url": "https://badges.vfide.com/pioneer/2847.mp4",
  "external_url": "https://vfide.com/badges/pioneer",
  "attributes": [
    {
      "trait_type": "Category",
      "value": "Pioneer & Foundation"
    },
    {
      "trait_type": "Badge Number",
      "display_type": "number",
      "value": 2847
    },
    {
      "trait_type": "Points",
      "display_type": "number",
      "value": 30
    },
    {
      "trait_type": "Rarity",
      "value": "Legendary"
    },
    {
      "trait_type": "Mint Date",
      "display_type": "date",
      "value": 1733702400
    },
    {
      "trait_type": "Duration",
      "value": "Permanent"
    },
    {
      "trait_type": "Earned Through",
      "value": "Early Adoption"
    },
    {
      "trait_type": "Soulbound",
      "value": "Yes"
    }
  ],
  "properties": {
    "badge_id": "0x...",
    "earned_date": 1733616000,
    "mint_date": 1733702400,
    "max_supply": 10000,
    "current_supply": 2847
  }
}
```

### URI Structure

```
https://badges.vfide.com/
├── pioneer/
│   ├── 1.json
│   ├── 2.json
│   └── 2847.json
├── verified-merchant/
│   └── 1.json
├── elite-achiever/
│   └── 1.json
└── ...
```

## Badge Rarity Tiers

Based on total possible supply:

| Tier | Supply | Examples |
|------|--------|----------|
| **Mythic** | < 100 | Founding Member (1,000), Bug Bounty (rare) |
| **Legendary** | < 10,000 | Pioneer (10,000) |
| **Epic** | < 50,000 | Elite Achiever, Guardian |
| **Rare** | < 100,000 | Verified Merchant, Trusted Endorser |
| **Uncommon** | Unlimited Renewable | Active Trader, Governance Voter |
| **Common** | Unlimited | Clean Record, Daily Champion |

## User Flows

### Flow 1: Earning & Minting

```
1. User performs activity (50 trades)
   ↓
2. VFIDECommerce calls: seer.setBadge(user, ACTIVE_TRADER, true)
   ↓
3. User sees badge in ProofScore breakdown (on-chain)
   ↓
4. User visits badge NFT page
   ↓
5. User calls: badgeNFT.mintBadge(ACTIVE_TRADER)
   ↓
6. Contract verifies: seer.hasBadge(user, ACTIVE_TRADER) == true
   ↓
7. Mints soulbound NFT, assigns badge number (#4,283)
   ↓
8. NFT visible on OpenSea, in wallet, Discord roles
```

### Flow 2: Badge Expiration

```
1. User has ACTIVE_TRADER badge (90-day expiration)
   ↓
2. User mints NFT for it (tokenId: 12345)
   ↓
3. 90 days pass, user doesn't maintain activity
   ↓
4. Badge expires in Seer: hasBadge = false
   ↓
5. ProofScore drops by 20 points
   ↓
6. NFT still exists (commemorative proof they HAD it)
   ↓
7. User can burn NFT if they want to remove it
   OR
8. Earn badge again and re-mint new NFT
```

### Flow 3: Badge Revocation

```
1. User gets VERIFIED_MERCHANT badge
   ↓
2. User mints NFT (tokenId: 5000)
   ↓
3. User commits fraud, DAO revokes badge
   ↓
4. seer.setBadge(user, VERIFIED_MERCHANT, false)
   ↓
5. ProofScore drops immediately
   ↓
6. User should burn NFT themselves
   ↓
7. If they don't, admin can call: adminBurn(5000)
```

## Integration Examples

### Frontend: Check Mintable Badges

```typescript
import { BadgeRegistry } from '@/lib/badge-registry';

async function getMintableBadges(userAddress: string) {
  const earnedBadges = await seer.getUserBadges(userAddress);
  const mintableBadges = [];
  
  for (const badge of earnedBadges) {
    const tokenId = await badgeNFT.userBadgeToken(userAddress, badge);
    
    if (tokenId === 0n) { // Not yet minted
      const [canMint, reason] = await badgeNFT.canMintBadge(userAddress, badge);
      
      if (canMint) {
        mintableBadges.push({
          id: badge,
          name: BadgeRegistry.getName(badge),
          category: BadgeRegistry.getCategory(badge),
          points: BadgeRegistry.getRecommendedWeight(badge),
          mintCount: await badgeNFT.getBadgeMintCount(badge),
        });
      }
    }
  }
  
  return mintableBadges;
}
```

### Frontend: Display Badge Collection

```typescript
async function getUserBadgeCollection(userAddress: string) {
  const tokenIds = await badgeNFT.getBadgesOfUser(userAddress);
  const collection = [];
  
  for (const tokenId of tokenIds) {
    const [badge, name, category, mintTime, number] = 
      await badgeNFT.getBadgeDetails(tokenId);
    
    const metadata = await fetch(await badgeNFT.tokenURI(tokenId));
    const json = await metadata.json();
    
    collection.push({
      tokenId,
      badge,
      name,
      category,
      mintTime,
      number,
      image: json.image,
      rarity: json.attributes.find(a => a.trait_type === 'Rarity')?.value,
    });
  }
  
  return collection;
}
```

### Smart Contract: Auto-mint on Earning

```solidity
// Optional: Auto-mint when badge awarded (costs user gas)
function awardBadgeWithNFT(address user, bytes32 badge) external onlyAuth {
    // Award in Seer
    seer.setBadge(user, badge, true);
    
    // Auto-mint NFT if user opted in
    if (userWantsAutoMint[user]) {
        try badgeNFT.mintBadge(badge) {
            // Success
        } catch {
            // Ignore if fails (user can mint later)
        }
    }
}
```

## Gas Costs

| Operation | Gas Cost (est.) | Notes |
|-----------|-----------------|-------|
| Award badge in Seer | ~50,000 | Core operation (required) |
| Mint badge NFT | ~150,000 | Optional (user choice) |
| Batch mint 5 badges | ~400,000 | ~80k per badge in batch |
| Burn badge NFT | ~30,000 | Returns some gas |
| Check badge status | ~2,000 | View function |

## OpenSea Integration

### Collection Settings

```json
{
  "name": "VFIDE Badges",
  "description": "Soulbound achievement badges earned through integrity and action in the VFIDE ecosystem. These badges cannot be transferred or sold.",
  "image": "https://badges.vfide.com/collection.png",
  "external_link": "https://vfide.com/badges",
  "seller_fee_basis_points": 0,
  "fee_recipient": "",
  "properties": {
    "category": "Achievements",
    "is_soulbound": true
  }
}
```

### OpenSea will show:
- ✅ Badge rarity based on mint count
- ✅ Badge number (#2,847 of 10,000)
- ✅ Trait filters (Category, Rarity, Points)
- ❌ No "Buy Now" button (soulbound)
- ❌ No "Make Offer" button (soulbound)
- ✅ View-only provenance display

## Discord Integration

### Bot Commands

```
/badges @user              # Show user's badge collection
/badge PIONEER             # Show badge details and holders
/mint ACTIVE_TRADER        # Mint eligible badge as NFT
/badge-leaderboard         # Top badge collectors
```

### Role Assignment

```javascript
// Grant Discord roles based on badge NFTs
if (await badgeNFT.userBadgeToken(userWallet, BadgeRegistry.PIONEER) > 0) {
  await member.roles.add(pioneerRole);
}
```

## Deployment Steps

1. **Deploy VFIDEBadgeNFT.sol**
   ```bash
   forge create VFIDEBadgeNFT \
     --constructor-args $SEER_ADDRESS "https://badges.vfide.com/" \
     --private-key $PRIVATE_KEY
   ```

2. **Configure Badge Metadata**
   - Upload badge images to IPFS or CDN
   - Generate JSON metadata for each badge type
   - Set base URI in contract

3. **Frontend Integration**
   - Add badge NFT display components
   - Create minting interface
   - Show badge collection gallery

4. **OpenSea Listing**
   - Verify contract on Etherscan
   - Import collection to OpenSea
   - Set collection metadata

5. **Discord Bot**
   - Connect wallet verification
   - Auto-assign roles based on NFTs
   - Badge showcase commands

## Philosophy Alignment

### ✅ Maintains Core Values

1. **ProofScore calculations unchanged** - Still use Seer booleans (gas efficient)
2. **NFTs are optional** - Users choose if they want to mint
3. **Soulbound = non-transferable** - Cannot buy badges on secondary market
4. **Provenance preserved** - Badge #2,847 shows they were early
5. **Commemorative only** - NFT doesn't affect score (Seer does)

### ❌ Prevents Gaming

1. **Can't buy badges** - Soulbound prevents transfers
2. **Can't forge badges** - NFT minting verifies via Seer
3. **Can't keep revoked badges** - Admin burn if badge lost
4. **Can't duplicate** - One NFT per badge per user
5. **Can't front-run** - Badge numbers assigned at mint

## Future Enhancements

### Phase 2: Badge Showcase

- Public badge gallery pages
- Badge achievement guides
- Leaderboards by badge count
- Badge rarity tracking

### Phase 3: Badge Utility

- Special Discord channels for badge holders
- Early access to features (verified merchants)
- Badge-gated content/events
- Cross-platform badge verification

### Phase 4: Badge Evolution

- Badge levels (Bronze/Silver/Gold Pioneer)
- Animated badges for elite tiers
- Badge combination bonuses
- Historical badge snapshots

---

## Summary

**Hybrid System = Best of Both Worlds**

✅ **Gas Efficient**: ProofScore uses simple booleans  
✅ **Collectible**: Optional NFT minting for showcasing  
✅ **Soulbound**: Cannot be sold or transferred  
✅ **Provenance**: Badge numbers and timestamps preserved  
✅ **Interoperable**: Works with OpenSea, wallets, Discord  
✅ **Philosophy-Aligned**: Earned through actions, never bought  

The badge NFT layer is purely **commemorative** - a way to showcase achievements without changing the core trust mechanics. 🏆

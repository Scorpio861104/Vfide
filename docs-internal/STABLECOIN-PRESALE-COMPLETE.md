# Stablecoin-First Presale Implementation

## Summary

The VFIDEPresale contract has been upgraded to support **stablecoin-first pricing** with **3 price tiers**, eliminating ETH volatility concerns and providing exact USD pricing for token purchases.

## Why Stablecoins?

1. **No Price Volatility** - Buyers pay exactly the tier price
2. **Treasury Stability** - Predictable USD raise amount for liquidity planning
3. **No Price Adjustment Needed** - Eliminates ETH/USD conversion headaches
4. **Simpler Accounting** - Direct USD tracking for financial reporting

## Three Price Tiers

| Tier | Name | Price | Supply | Lock Required | Immediate |
|------|------|-------|--------|---------------|-----------|
| **0** | Founding | $0.03 | 10M VFIDE | 180 days | 10% |
| **1** | Oath | $0.05 | 10M VFIDE | 90 days | 20% |
| **2** | Public | $0.07 | 15M VFIDE | None (optional) | 100% |

**Price tiers require mandatory locks.** The price discount IS the reward - no bonus tokens for tiers 0-1.

Only Tier 2 (Public) buyers can choose optional locks with bonus tokens (+15% for 90 days, +30% for 180 days).

## New Purchase Methods

### Primary Method (Recommended)

```solidity
// Buy with stablecoin - specify tier (0, 1, or 2)
// Note: Tier 0 requires lockPeriod = 180 days, Tier 1 requires 90 days
function buyWithStable(address stablecoin, uint256 amount, uint8 tier, uint256 lockPeriod) external;

// Buy with stablecoin + referral bonus
function buyWithStableReferral(address stablecoin, uint256 amount, uint8 tier, uint256 lockPeriod, address referrer) external;
```

### Legacy Method (Optional)

```solidity
// Buy with ETH (uses tier 2 public price only, any lock optional)
function buyTokens(uint256 lockPeriod) external payable;
function buyTokensWithReferral(uint256 lockPeriod, address referrer) external payable;
```

## Pricing

| Constant | Value | Description |
|----------|-------|-------------|
| `TIER_0_PRICE` | 30,000 | $0.03 per VFIDE (Founding) |
| `TIER_1_PRICE` | 50,000 | $0.05 per VFIDE (Oath) |
| `TIER_2_PRICE` | 70,000 | $0.07 per VFIDE (Public) |
| `MIN_PURCHASE_USD` | 10,000,000 | $10 minimum purchase |
| `ethPriceUsd` | 3,500 (default) | Configurable ETH/USD rate |

## Token Calculation

```solidity
// From USD for a specific tier
baseTokens = (usdAmount * 1e18) / getTierPrice(tier);

// Example: $100 at tier 0 ($0.03) = 3,333.33 VFIDE
// Example: $100 at tier 2 ($0.07) = 1,428.57 VFIDE
```

## Admin Controls

```solidity
// Set stablecoin registry
function setStablecoinRegistry(address _registry) external onlyDAO;

// Update ETH price (for ETH purchases)
function setEthPrice(uint256 newPrice) external onlyDAO;

// Disable/enable ETH (stablecoin-only mode)
function setEthAccepted(bool accepted) external onlyDAO;
```

## StablecoinRegistry Contract

New contract for managing allowed stablecoins:

```solidity
contract StablecoinRegistry {
    // Add a stablecoin (e.g., USDC, USDT, DAI)
    function addStablecoin(address token, uint8 decimals, string calldata symbol) external onlyOwner;
    
    // Check if stablecoin is allowed
    function isWhitelisted(address token) external view returns (bool);
    
    // Get stablecoin decimals
    function tokenDecimals(address token) external view returns (uint8);
}
```

## Refunds

Both ETH and stablecoin contributions are tracked for refunds:

```solidity
// ETH refund (if presale fails minimum goal)
function claimRefund() external;

// Stablecoin refund
function claimStableRefund(address stablecoin) external;
```

## Contribution Tracking

```solidity
// Per-user tracking
mapping(address => uint256) public usdContributed;       // Total USD (6 decimals)
mapping(address => uint256) public ethContributed;       // ETH amount
mapping(address => mapping(address => uint256)) public stableContributed; // stablecoin => amount

// Global tracking
uint256 public totalUsdRaised;   // Total USD raised (6 decimals)
uint256 public totalEthRaised;   // ETH raised (for mixed tracking)
```

## View Functions

```solidity
// Calculate tokens from USD amount
function calculateTokensFromUsd(uint256 usdAmount) public pure returns (uint256);

// Calculate tokens from ETH amount
function calculateTokensFromEth(uint256 ethAmount) public view returns (uint256);

// Get raise statistics
function getRaiseStats() external view returns (
    uint256 usdRaised,      // Total USD (6 decimals)
    uint256 ethRaised,      // ETH raised
    uint256 tokensBaseSold, // Base tokens sold
    uint256 tokensBonusGiven, // Bonus tokens given
    uint256 totalTokensSold,  // Total tokens
    bool isFinalized
);
```

## Deployment Sequence

1. Deploy `StablecoinRegistry`
2. Add stablecoins: USDC (6 decimals), USDT (6 decimals), DAI (18 decimals)
3. Deploy `VFIDEPresale` with registry address
4. Optionally: Call `setEthAccepted(false)` for stablecoin-only mode

## Changes Made

### VFIDEPresale.sol
- Added `IStablecoinRegistry` integration
- Added `buyWithStable()` and `buyWithStableReferral()` functions
- Added `claimStableRefund()` for stablecoin refunds
- Added USD-based pricing constants
- Made ETH acceptance configurable (`ethAccepted` flag)
- Updated all stats functions to return USD values

### StablecoinRegistry.sol (NEW)
- New contract for managing allowed stablecoins
- Stores decimals, symbol, and allowed status per stablecoin
- Implements `IStablecoinRegistry` interface

### Deploy.s.sol
- Updated to deploy `StablecoinRegistry`
- Pass registry address to `VFIDEPresale` constructor

## Test Status

✅ **279/279 tests passing** - All existing functionality preserved while adding stablecoin support.

---

*Implementation completed: January 2025*

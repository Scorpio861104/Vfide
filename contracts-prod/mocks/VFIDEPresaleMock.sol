// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

contract VFIDEPresaleMock {
    // Errors matching VFIDEPresale
    error PR_Zero();
    error PR_Inactive();
    error PR_BadTier();
    error PR_NotAllowedStable();
    error PR_VaultLocked();
    error PR_ExceedsPerAddressCap();
    error PR_CalcOverflow();
    error PR_StartSet();
    
    uint256 public presaleMinted;
    uint256 public constant PRESALE_SUPPLY_CAP = 75_000_000e18;
    uint256 public maxPerAddress = 1_500_000e18;
    
    mapping(address => uint256) public bought;
    
    bool public active = true;
    
    struct TierPrices {
        uint32 tier0;
        uint32 tier1;
        uint32 tier2;
    }
    
    event MintPresale(address to, uint256 amount);
    event Buy(address indexed buyer, address stable, uint256 stableAmt, uint256 vfideAmt);
    
    function tierPrices() external pure returns (uint32, uint32, uint32) {
        return (30000, 50000, 70000); // $0.03, $0.05, $0.07 (in 1e6 USD)
    }
    
    function mintPresale(address to, uint256 amount) external {
        presaleMinted += amount;
        emit MintPresale(to, amount);
    }
    
    mapping(uint8 => bool) public tierEnabled;
    
    constructor() {
        tierEnabled[0] = true;
        tierEnabled[1] = true;
        tierEnabled[2] = true;
    }
    
    function buy(address stable, uint256 amount, uint8 tier, address referrer) external {
        if (!active) revert PR_Inactive();
        if (tier > 2 || !tierEnabled[tier]) revert PR_BadTier();
        uint256 vfideAmount = amount; // Simplified
        if (bought[msg.sender] + vfideAmount > maxPerAddress) revert PR_ExceedsPerAddressCap();
        bought[msg.sender] += vfideAmount;
        emit Buy(msg.sender, stable, amount, vfideAmount);
    }
    
    function setActive(bool _active) external {
        active = _active;
    }
    
    function setTierEnabled(uint8 tier, bool enabled) external {
        tierEnabled[tier] = enabled;
    }
    
    function referralBps() external pure returns (uint16, uint16) {
        return (100, 200); // 1% buyer, 2% referrer
    }
    
    function getQuote(address, uint256 amount, uint8) external pure returns (uint256) {
        return amount; // Simplified
    }
}

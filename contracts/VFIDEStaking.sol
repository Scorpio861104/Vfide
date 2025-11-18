// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

/**
 * VFIDEStaking — Staking System for VFIDE Ecosystem
 * ----------------------------------------------------------
 * Per VFIDE Ecosystem Overview Section 8.1:
 * - Users stake VFIDE from their vaults to earn rewards
 * - Longer stakes and higher ProofScore lead to better rewards
 * - Staking is non-custodial (users stake from vaults)
 * - Lock durations and positions are transparent
 * - Rewards funded from allocated staking pool
 * - SecurityHub lock enforcement
 * - ProofScore integration for reward multipliers
 */

interface IVFIDEToken_Staking {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function transfer(address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

interface IVaultHub_Staking {
    function vaultOf(address owner) external view returns (address);
}

interface ISecurityHub_Staking {
    function isLocked(address vault) external view returns (bool);
}

interface ISeer_Staking {
    function getScore(address subject) external view returns (uint16);
    function highTrustThreshold() external view returns (uint16);
    function lowTrustThreshold() external view returns (uint16);
}

interface IProofLedger_Staking {
    function logSystemEvent(address who, string calldata action, address by) external;
    function logEvent(address who, string calldata action, uint256 amount, string calldata note) external;
}

error STAKE_Zero();
error STAKE_NotDAO();
error STAKE_VaultLocked();
error STAKE_InsufficientBalance();
error STAKE_StakeLocked();
error STAKE_NoStake();

abstract contract Ownable {
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    address public owner;
    constructor() { owner = msg.sender; emit OwnershipTransferred(address(0), msg.sender); }
    modifier onlyOwner() { require(msg.sender == owner, "not owner"); _; }
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "zero");
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }
}

abstract contract ReentrancyGuard {
    uint256 private _status = 1;
    modifier nonReentrant() {
        require(_status == 1, "reentrancy");
        _status = 2;
        _;
        _status = 1;
    }
}

contract VFIDEStaking is Ownable, ReentrancyGuard {
    /// Events
    event ModulesSet(address vfide, address vaultHub, address securityHub, address seer, address ledger);
    event Staked(address indexed user, address indexed vault, uint256 amount, uint64 lockUntil, uint16 proofScore);
    event Unstaked(address indexed user, address indexed vault, uint256 amount, uint256 rewards);
    event RewardsClaimed(address indexed user, address indexed vault, uint256 rewards);
    event RewardRateSet(uint256 baseRate, uint256 highTrustBonus, uint256 lowTrustPenalty);
    event EmergencyWithdraw(address indexed user, address indexed vault, uint256 amount);

    /// External modules
    IVFIDEToken_Staking public vfide;
    IVaultHub_Staking public vaultHub;
    ISecurityHub_Staking public securityHub;
    ISeer_Staking public seer;
    IProofLedger_Staking public ledger;

    /// Staking parameters
    uint256 public baseRewardRate = 500; // 5% annual (basis points per year / 10000)
    uint256 public highTrustBonus = 200; // +2% for high trust
    uint256 public lowTrustPenalty = 150; // -1.5% for low trust
    
    uint64 public minLockDuration = 7 days;
    uint64 public maxLockDuration = 365 days;

    address public dao;

    modifier onlyDAO() {
        require(msg.sender == dao, "STAKE: not DAO");
        _;
    }

    function setDAO(address _dao) external onlyOwner {
        require(_dao != address(0), "STAKE: zero address");
        dao = _dao;
    }

    function adjustRewardRates(
        uint256 _baseRewardRate,
        uint256 _highTrustBonus,
        uint256 _lowTrustPenalty
    ) external onlyDAO {
        baseRewardRate = _baseRewardRate;
        highTrustBonus = _highTrustBonus;
        lowTrustPenalty = _lowTrustPenalty;
        emit RewardRateSet(_baseRewardRate, _highTrustBonus, _lowTrustPenalty);
    }

    function getRewardRate(address user) public view returns (uint256) {
        uint16 proofScore = seer.profiles(user).score;
        return seer.computeRewardRates(proofScore, baseRewardRate, highTrustBonus, lowTrustPenalty);
    }

    /// Staking state
    struct StakeInfo {
        uint256 amount;           // staked amount
        uint64 stakedAt;          // timestamp of stake
        uint64 lockUntil;         // lock expiry
        uint256 rewardsAccrued;   // accumulated rewards
        uint64 lastRewardCalc;    // last reward calculation
        uint16 initialScore;      // ProofScore at stake time
    }

    // vault => StakeInfo
    mapping(address => StakeInfo) public stakes;

    // Total staked across all vaults
    uint256 public totalStaked;

    constructor(
        address _vfide,
        address _vaultHub,
        address _securityHub,
        address _seer,
        address _ledger
    ) {
        require(_vfide != address(0) && _vaultHub != address(0), "zero");
        vfide = IVFIDEToken_Staking(_vfide);
        vaultHub = IVaultHub_Staking(_vaultHub);
        securityHub = ISecurityHub_Staking(_securityHub);
        seer = ISeer_Staking(_seer);
        ledger = IProofLedger_Staking(_ledger);
        emit ModulesSet(_vfide, _vaultHub, _securityHub, _seer, _ledger);
    }

    // ─────────────────────────── Admin functions

    function setModules(
        address _vfide,
        address _vaultHub,
        address _securityHub,
        address _seer,
        address _ledger
    ) external onlyOwner {
        if (_vfide == address(0) || _vaultHub == address(0)) revert STAKE_Zero();
        vfide = IVFIDEToken_Staking(_vfide);
        vaultHub = IVaultHub_Staking(_vaultHub);
        securityHub = ISecurityHub_Staking(_securityHub);
        seer = ISeer_Staking(_seer);
        ledger = IProofLedger_Staking(_ledger);
        emit ModulesSet(_vfide, _vaultHub, _securityHub, _seer, _ledger);
        _log("staking_modules_set");
    }

    function setRewardRates(
        uint256 _baseRate,
        uint256 _highBonus,
        uint256 _lowPenalty
    ) external onlyOwner {
        require(_baseRate <= 5000, "rate too high"); // max 50% APR
        require(_highBonus <= 1000, "bonus too high");
        require(_lowPenalty <= 500, "penalty too high");
        baseRewardRate = _baseRate;
        highTrustBonus = _highBonus;
        lowTrustPenalty = _lowPenalty;
        emit RewardRateSet(_baseRate, _highBonus, _lowPenalty);
        _log("reward_rates_set");
    }

    function setLockDurations(uint64 _min, uint64 _max) external onlyOwner {
        require(_min <= _max, "invalid durations");
        require(_min >= 1 days, "min too short");
        require(_max <= 730 days, "max too long");
        minLockDuration = _min;
        maxLockDuration = _max;
        _log("lock_durations_set");
    }

    // ─────────────────────────── Staking functions

    /**
     * Stake VFIDE from user's vault with specified lock duration
     * @param amount Amount to stake (must be in vault)
     * @param lockDuration How long to lock (affects reward multiplier)
     */
    function stake(uint256 amount, uint64 lockDuration) external nonReentrant {
        if (amount == 0) revert STAKE_Zero();
        
        address vault = vaultHub.vaultOf(msg.sender);
        require(vault != address(0), "no vault");

        // Security check
        if (address(securityHub) != address(0) && securityHub.isLocked(vault)) {
            revert STAKE_VaultLocked();
        }

        // Validate lock duration
        require(lockDuration >= minLockDuration && lockDuration <= maxLockDuration, "bad lock duration");

        StakeInfo storage stake_ = stakes[vault];

        // If existing stake, calculate and add pending rewards first
        if (stake_.amount > 0) {
            _updateRewards(vault);
        }

        // Get ProofScore for multiplier
        uint16 score = address(seer) != address(0) ? seer.getScore(msg.sender) : 500;

        // Transfer tokens from vault to staking contract
        require(vfide.transferFrom(vault, address(this), amount), "transfer failed");

        // Update stake
        if (stake_.amount == 0) {
            // New stake
            stake_.stakedAt = uint64(block.timestamp);
            stake_.lastRewardCalc = uint64(block.timestamp);
            stake_.initialScore = score;
        }
        
        stake_.amount += amount;
        stake_.lockUntil = uint64(block.timestamp) + lockDuration;
        totalStaked += amount;

        emit Staked(msg.sender, vault, amount, stake_.lockUntil, score);
        _logEv(msg.sender, "staked", amount, _lockNote(lockDuration));
    }

    /**
     * Unstake VFIDE and claim rewards (must wait for lock period)
     */
    function unstake(uint256 amount) external nonReentrant {
        if (amount == 0) revert STAKE_Zero();

        address vault = vaultHub.vaultOf(msg.sender);
        require(vault != address(0), "no vault");

        // Security check
        if (address(securityHub) != address(0) && securityHub.isLocked(vault)) {
            revert STAKE_VaultLocked();
        }

        StakeInfo storage stake_ = stakes[vault];
        if (stake_.amount == 0) revert STAKE_NoStake();
        if (stake_.amount < amount) revert STAKE_InsufficientBalance();

        // Check lock
        if (block.timestamp < stake_.lockUntil) revert STAKE_StakeLocked();

        // Update rewards before unstaking
        _updateRewards(vault);

        // Calculate total to return (principal + rewards)
        uint256 rewards = stake_.rewardsAccrued;
        stake_.amount -= amount;
        totalStaked -= amount;
        stake_.rewardsAccrued = 0;

        // Transfer back to vault
        uint256 totalReturn = amount + rewards;
        require(vfide.transfer(vault, totalReturn), "transfer failed");

        // If fully unstaked, clear state
        if (stake_.amount == 0) {
            delete stakes[vault];
        }

        emit Unstaked(msg.sender, vault, amount, rewards);
        _logEv(msg.sender, "unstaked", totalReturn, "");
    }

    /**
     * Claim rewards without unstaking principal
     */
    function claimRewards() external nonReentrant {
        address vault = vaultHub.vaultOf(msg.sender);
        require(vault != address(0), "no vault");

        // Security check
        if (address(securityHub) != address(0) && securityHub.isLocked(vault)) {
            revert STAKE_VaultLocked();
        }

        StakeInfo storage stake_ = stakes[vault];
        if (stake_.amount == 0) revert STAKE_NoStake();

        // Update rewards
        _updateRewards(vault);

        uint256 rewards = stake_.rewardsAccrued;
        if (rewards == 0) return;

        stake_.rewardsAccrued = 0;

        // Transfer rewards to vault
        require(vfide.transfer(vault, rewards), "transfer failed");

        emit RewardsClaimed(msg.sender, vault, rewards);
        _logEv(msg.sender, "rewards_claimed", rewards, "");
    }

    /**
     * Emergency withdraw (forfeits rewards, only for emergencies)
     */
    function emergencyWithdraw() external nonReentrant {
        address vault = vaultHub.vaultOf(msg.sender);
        require(vault != address(0), "no vault");

        StakeInfo storage stake_ = stakes[vault];
        if (stake_.amount == 0) revert STAKE_NoStake();

        uint256 amount = stake_.amount;
        totalStaked -= amount;
        delete stakes[vault];

        // Return only principal, no rewards
        require(vfide.transfer(vault, amount), "transfer failed");

        emit EmergencyWithdraw(msg.sender, vault, amount);
        _logEv(msg.sender, "emergency_withdraw", amount, "rewards_forfeited");
    }

    // ─────────────────────────── View functions

    function pendingRewards(address user) external view returns (uint256) {
        address vault = vaultHub.vaultOf(user);
        if (vault == address(0)) return 0;

        StakeInfo storage stake_ = stakes[vault];
        if (stake_.amount == 0) return stake_.rewardsAccrued;

        // Calculate pending since last update
        uint256 timeElapsed = block.timestamp - stake_.lastRewardCalc;
        uint256 pending = _calculateRewards(user, vault, stake_.amount, timeElapsed);
        
        return stake_.rewardsAccrued + pending;
    }

    function getStakeInfo(address user) external view returns (
        uint256 amount,
        uint64 stakedAt,
        uint64 lockUntil,
        uint256 rewardsAccrued,
        uint16 currentScore
    ) {
        address vault = vaultHub.vaultOf(user);
        if (vault == address(0)) return (0, 0, 0, 0, 0);

        StakeInfo storage stake_ = stakes[vault];
        uint16 score = address(seer) != address(0) ? seer.getScore(user) : 500;
        
        return (
            stake_.amount,
            stake_.stakedAt,
            stake_.lockUntil,
            stake_.rewardsAccrued,
            score
        );
    }

    // ─────────────────────────── Internal functions

    function _updateRewards(address vault) internal {
        StakeInfo storage stake_ = stakes[vault];
        if (stake_.amount == 0) return;

        uint256 timeElapsed = block.timestamp - stake_.lastRewardCalc;
        if (timeElapsed == 0) return;

        // Get vault owner for ProofScore lookup
        address owner = _getVaultOwner(vault);
        uint256 rewards = _calculateRewards(owner, vault, stake_.amount, timeElapsed);
        
        stake_.rewardsAccrued += rewards;
        stake_.lastRewardCalc = uint64(block.timestamp);
    }

    function _calculateRewards(
        address user,
        address vault,
        uint256 stakedAmount,
        uint256 timeElapsed
    ) internal view returns (uint256) {
        if (stakedAmount == 0 || timeElapsed == 0) return 0;

        // Base reward: (amount * baseRate * time) / (365 days * 10000)
        uint256 baseReward = (stakedAmount * baseRewardRate * timeElapsed) / (365 days * 10000);

        // ProofScore multiplier
        if (address(seer) != address(0)) {
            uint16 score = seer.getScore(user);
            uint16 highThreshold = seer.highTrustThreshold();
            uint16 lowThreshold = seer.lowTrustThreshold();

            if (score >= highThreshold) {
                // High trust bonus
                uint256 bonus = (baseReward * highTrustBonus) / 10000;
                baseReward += bonus;
            } else if (score <= lowThreshold) {
                // Low trust penalty
                uint256 penalty = (baseReward * lowTrustPenalty) / 10000;
                baseReward = baseReward > penalty ? baseReward - penalty : 0;
            }
        }

        return baseReward;
    }

    function _getVaultOwner(address vault) internal view returns (address) {
        // Proper implementation using VaultHub
        if (address(vaultHub) != address(0)) {
            return vaultHub.vaultOf(vault);
        }
        return address(0); // Default to zero address if VaultHub is not set
    }

    function _lockNote(uint64 duration) internal pure returns (string memory) {
        if (duration <= 30 days) return "short_lock";
        if (duration <= 90 days) return "medium_lock";
        if (duration <= 180 days) return "long_lock";
        return "max_lock";
    }

    function _log(string memory action) internal {
        if (address(ledger) != address(0)) {
            try ledger.logSystemEvent(address(this), action, msg.sender) {} catch {}
        }
    }

    function _logEv(address who, string memory action, uint256 amount, string memory note) internal {
        if (address(ledger) != address(0)) {
            try ledger.logEvent(who, action, amount, note) {} catch {}
        }
    }

    // ─────────────────────────── Admin: fund rewards pool

    /**
     * Admin function to fund the staking rewards pool
     */
    function fundRewards(uint256 amount) external onlyOwner {
        require(vfide.transferFrom(msg.sender, address(this), amount), "transfer failed");
        _log("rewards_funded");
    }

    /**
     * View contract's VFIDE balance (for monitoring reward pool)
     */
    function rewardsPool() external view returns (uint256) {
        uint256 balance = vfide.balanceOf(address(this));
        return balance > totalStaked ? balance - totalStaked : 0;
    }
}

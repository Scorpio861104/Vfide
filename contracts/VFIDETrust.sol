// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

/**
 * VFIDETrust.sol
 * - ProofLedger: immutable event log (behavioral signals for Seer).
 * - Seer: ProofScore engine (0..1000), neutral default 500, DAO/Auto updates.
 * - ProofScoreBurnRouterPlus: computes burn/treasury/reward basis points from score.
 *
 * Notes:
 * - No external token wiring required yet (we won't touch VFIDEToken).
 * - Security (PanicGuard/GuardianLock) will be provided in VFIDESecurity.sol.
 * - DAO is the only privileged role; later this DAO will be your Governance Hub.
 */

/// ────────────────────────── Interfaces
interface IVaultHub_Trust { function vaultOf(address owner) external view returns (address); }
interface ITokenLike_Trust { function balanceOf(address) external view returns (uint256); }
interface ISecurityHub_Trust { function isLocked(address vault) external view returns (bool); }

/// ────────────────────────── Errors
error TRUST_NotDAO();
error TRUST_Zero();
error TRUST_Bounds();
error TRUST_AlreadySet();
error TRUST_NotSet();

/// ────────────────────────── ProofLedger
contract ProofLedger {
    event SystemEvent(address indexed who, string action, address indexed by);
    event EventLog(address indexed who, string action, uint256 amount, string note);
    event TransferLog(address indexed from, address indexed to, uint256 amount, string context);

    address public dao;

    modifier onlyDAO() { if (msg.sender != dao) revert TRUST_NotDAO(); _; }

    constructor(address _dao) {
        if (_dao == address(0)) revert TRUST_Zero();
        dao = _dao;
    }

    function setDAO(address _dao) external onlyDAO {
        if (_dao == address(0)) revert TRUST_Zero();
        dao = _dao;
    }

    // best-effort logs from other modules
    function logSystemEvent(address who, string calldata action, address by) external {
        emit SystemEvent(who, action, by);
    }

    function logEvent(address who, string calldata action, uint256 amount, string calldata note) external {
        emit EventLog(who, action, amount, note);
    }

    function logTransfer(address from, address to, uint256 amount, string calldata context) external {
        emit TransferLog(from, to, amount, context);
    }
}

/// ────────────────────────── Seer (ProofScore)
contract Seer {
    event LedgerSet(address ledger);
    event HubSet(address vaultHub);
    event ScoreSet(address indexed subject, uint16 oldScore, uint16 newScore, string reason);
    event ThresholdsSet(uint16 low, uint16 high, uint16 minForGov, uint16 minForMerchant);

    address public dao;
    ProofLedger public ledger;
    IVaultHub_Trust public vaultHub;

    // 0 == uninitialized → treated as NEUTRAL = 500
    mapping(address => uint16) private _score;

    // policy thresholds (DAO-tunable)
    uint16 public constant MIN_SCORE = 0;
    uint16 public constant MAX_SCORE = 1000;
    uint16 public constant NEUTRAL   = 500;

    uint16 public lowTrustThreshold   = 350;   // under this → risky
    uint16 public highTrustThreshold  = 700;   // above this → boosted
    uint16 public minForGovernance    = 540;   // voting/standing
    uint16 public minForMerchant      = 560;   // to remain listed

    modifier onlyDAO() { if (msg.sender != dao) revert TRUST_NotDAO(); _; }

    constructor(address _dao, address _ledger, address _hub) {
        if (_dao == address(0)) revert TRUST_Zero();
        dao = _dao;
        if (_ledger != address(0)) ledger = ProofLedger(_ledger);
        if (_hub != address(0)) vaultHub = IVaultHub_Trust(_hub);
    }

    function setModules(address _ledger, address _hub) external onlyDAO {
        if (_ledger == address(0) || _hub == address(0)) revert TRUST_Zero();
        ledger = ProofLedger(_ledger);
        vaultHub = IVaultHub_Trust(_hub);
        emit LedgerSet(_ledger);
        emit HubSet(_hub);
    }

    function setThresholds(uint16 low, uint16 high, uint16 minGov, uint16 minMerch) external onlyDAO {
        if (low > high) revert TRUST_Bounds();
        if (high > MAX_SCORE) revert TRUST_Bounds();
        lowTrustThreshold  = low;
        highTrustThreshold = high;
        minForGovernance   = minGov;
        minForMerchant     = minMerch;
        emit ThresholdsSet(low, high, minGov, minMerch);
        _logSystem("seer_thresholds_set");
    }

    /// Returns current ProofScore; uninitialized = 500 (neutral).
    function getScore(address subject) public view returns (uint16) {
        uint16 s = _score[subject];
        if (s == 0) {
            // Calculate automated score for uninitialized users
            return calculateAutomatedScore(subject);
        }
        return s;
    }

    /// Automated ProofScore calculation based on behavioral metrics
    function calculateAutomatedScore(address subject) public view returns (uint16) {
        if (subject == address(0)) return NEUTRAL;
        
        uint256 score = NEUTRAL;
        
        // Vault existence bonus (+50)
        if (address(vaultHub) != address(0)) {
            address vault = vaultHub.vaultOf(subject);
            if (vault != address(0)) {
                score += 50;
            }
        }
        
        // Check for security penalties
        if (address(vaultHub) != address(0) && address(hub) != address(0)) {
            address vault = vaultHub.vaultOf(subject);
            if (vault != address(0)) {
                try ISecurityHub_Trust(hub).isLocked(vault) returns (bool locked) {
                    if (locked) {
                        // Active lock penalty: -100 (with floor at 0)
                        score = score > 100 ? score - 100 : 0;
                    }
                } catch {}
            }
        }
        
        // Clamp to valid range
        if (score > MAX_SCORE) score = MAX_SCORE;
        
        return uint16(score);
    }

    /// DAO can directly set scores for migrations or rectifications.
    function setScore(address subject, uint16 newScore, string calldata reason) external onlyDAO {
        if (subject == address(0)) revert TRUST_Zero();
        if (newScore > MAX_SCORE) revert TRUST_Bounds();
        uint16 old = getScore(subject);
        _score[subject] = newScore;
        emit ScoreSet(subject, old, newScore, reason);
        _logEv(subject, "seer_score_set", newScore, reason);
    }

    /// Light-weight behavior hooks (can be called by other modules).
    function reward(address subject, uint16 delta, string calldata reason) external onlyDAO {
        _delta(subject, int256(uint256(delta)), reason);
    }

    function punish(address subject, uint16 delta, string calldata reason) external onlyDAO {
        _delta(subject, -int256(uint256(delta)), reason);
    }

    function _delta(address subject, int256 d, string calldata reason) internal {
        uint16 cur = getScore(subject);
        int256 next = int256(uint256(cur)) + d;
        if (next < int256(uint256(MIN_SCORE))) next = int256(uint256(MIN_SCORE));
        if (next > int256(uint256(MAX_SCORE))) next = int256(uint256(MAX_SCORE));
        _score[subject] = uint16(uint256(next));
        emit ScoreSet(subject, cur, _score[subject], reason);
        _logEv(subject, "seer_score_delta", uint256(int256(d < 0 ? -d : d)), reason);
    }

    function _logSystem(string memory action) internal {
        address L = address(ledger);
        if (L != address(0)) { try ProofLedger(L).logSystemEvent(address(this), action, msg.sender) {} catch {} }
    }

    function _logEv(address who, string memory action, uint256 amount, string memory note) internal {
        address L = address(ledger);
        if (L != address(0)) { try ProofLedger(L).logEvent(who, action, amount, note) {} catch {} }
    }
}

/// ────────────────────────── ProofScoreBurnRouterPlus
contract ProofScoreBurnRouterPlus {
    event SeerSet(address seer);
    event PolicySet(uint16 baseBurnBps, uint16 baseRewardBps, uint16 highBoostBps, uint16 lowPenaltyBps, uint16 maxTotalBps, address treasury);

    address public dao;
    Seer    public seer;

    // base policy (DAO-tunable)
    uint16 public baseBurnBps    = 200;  // 2.00%
    uint16 public baseRewardBps  = 50;   // 0.50% (used by staking/loyalty)
    uint16 public highBoostBps   = 50;   // +0.50% reward for high-trust
    uint16 public lowPenaltyBps  = 150;  // +1.50% extra burn for low-trust
    uint16 public maxTotalBps    = 1000; // 10.00% ceiling for (burn + reward + treasury)
    address public treasury;             // EcoTreasuryVault later

    modifier onlyDAO() { if (msg.sender != dao) revert TRUST_NotDAO(); _; }

    constructor(address _dao, address _seer, address _treasury) {
        if (_dao == address(0)) revert TRUST_Zero();
        dao = _dao;
        if (_seer != address(0)) seer = Seer(_seer);
        treasury = _treasury;
    }

    function setModules(address _seer, address _treasury) external onlyDAO {
        if (_seer == address(0)) revert TRUST_Zero();
        seer = Seer(_seer);
        treasury = _treasury;
        emit SeerSet(_seer);
    }

    function setPolicy(
        uint16 _baseBurnBps,
        uint16 _baseRewardBps,
        uint16 _highBoostBps,
        uint16 _lowPenaltyBps,
        uint16 _maxTotalBps,
        address _treasury
    ) external onlyDAO {
        if (_maxTotalBps > 4000) revert TRUST_Bounds(); // hard ceiling 40% for safety
        baseBurnBps   = _baseBurnBps;
        baseRewardBps = _baseRewardBps;
        highBoostBps  = _highBoostBps;
        lowPenaltyBps = _lowPenaltyBps;
        maxTotalBps   = _maxTotalBps;
        treasury      = _treasury;
        emit PolicySet(baseBurnBps, baseRewardBps, highBoostBps, lowPenaltyBps, maxTotalBps, treasury);
    }

    struct Route { uint16 burnBps; uint16 rewardBps; uint16 treasuryBps; }

    /**
     * Computes dynamic bps from a subject’s ProofScore.
     * - High-trust: reward boosted.
     * - Low-trust: burn penalized.
     * - Ensures sum <= maxTotalBps.
     */
    function routeFor(address subject) public view returns (Route memory r) {
        uint16 s = seer.getScore(subject); // defaults to 500 neutral

        // start from base
        uint256 burn = baseBurnBps;
        uint256 rew  = baseRewardBps;

        // adjust based on thresholds
        if (s >= seer.highTrustThreshold()) {
            rew += highBoostBps;
        } else if (s <= seer.lowTrustThreshold()) {
            burn += lowPenaltyBps;
        }

        // treasury share is whatever remains up to maxTotalBps, but never negative
        uint256 total = burn + rew;
        uint256 treas = total >= maxTotalBps ? 0 : (maxTotalBps - total);

        r = Route(uint16(burn), uint16(rew), uint16(treas));
    }
}
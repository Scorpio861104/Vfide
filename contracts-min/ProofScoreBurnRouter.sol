// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

/**
 * ProofScoreBurnRouter
 * Adjusts transaction fees, burns, and charity splits
 * dynamically based on user ProofScore.
 */

interface ISeer_BURN { function getScore(address user) external view returns (uint16); }
interface IEcoTreasuryVault_BURN { function noteVFIDE(uint256 amount, address from) external; }
interface ISanctumFund_BURN { function disburse(address token, address charity, uint256 amount, string calldata reason) external; }

error BURN_Zero();

contract ProofScoreBurnRouter {
    event ModulesSet(address seer, address treasury, address sanctum);
    event RouteExecuted(address indexed user, uint256 burnAmount, uint256 sanctumAmount);
    event Adjusted(address indexed user, uint16 score, uint16 burnRate, uint16 sanctumRate);

    ISeer_BURN public seer;
    IEcoTreasuryVault_BURN public treasury;
    ISanctumFund_BURN public sanctum;

    address public vfideToken;
    uint16 public baseBurnRate = 50;     // 0.5%
    uint16 public maxBurnRate  = 250;    // 2.5%
    uint16 public sanctumRate  = 25;     // 0.25%

    constructor(address _seer, address _treasury, address _sanctum, address _vfide) {
        if (_seer == address(0) || _treasury == address(0) || _vfide == address(0)) revert BURN_Zero();
        seer = ISeer_BURN(_seer);
        treasury = IEcoTreasuryVault_BURN(_treasury);
        sanctum = ISanctumFund_BURN(_sanctum);
        vfideToken = _vfide;
        emit ModulesSet(_seer, _treasury, _sanctum);
    }

    function setModules(address _seer, address _treasury, address _sanctum, address _vfide) external {
        seer = ISeer_BURN(_seer);
        treasury = IEcoTreasuryVault_BURN(_treasury);
        sanctum = ISanctumFund_BURN(_sanctum);
        vfideToken = _vfide;
        emit ModulesSet(_seer, _treasury, _sanctum);
    }

    function route(address user, uint256 amount) external returns (uint256) {
        uint16 score = seer.getScore(user);
        uint16 burnRate = _calcBurnRate(score);
        uint256 burnAmount = (amount * burnRate) / 10000;
        uint256 sanctumAmount = (amount * sanctumRate) / 10000;
        uint256 total = burnAmount + sanctumAmount;

        if (burnAmount > 0) { treasury.noteVFIDE(burnAmount, user); }
        if (sanctumAmount > 0) { sanctum.disburse(vfideToken, address(treasury), sanctumAmount, "ProofScore charity share"); }

        emit RouteExecuted(user, burnAmount, sanctumAmount);
        emit Adjusted(user, score, burnRate, sanctumRate);
        return total;
    }

    function adjustScore(address user, uint16 delta, bool increase) external {
        uint16 score = seer.getScore(user);
        emit Adjusted(user, score, _calcBurnRate(score), sanctumRate);
    }

    function _calcBurnRate(uint16 score) internal view returns (uint16) {
        if (score >= 900) return baseBurnRate / 2;
        if (score <= 300) return maxBurnRate;
        uint16 range = maxBurnRate - baseBurnRate;
        uint16 diff = 900 - score;
        return baseBurnRate + (range * diff / 600);
    }
}
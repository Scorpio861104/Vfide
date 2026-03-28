// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

/// @dev Minimal placeholder contract — satisfies extcodesize > 0 checks.
contract Placeholder {}

/// @dev Minimal emergency controller stub for CircuitBreaker tests.
contract EmergencyControllerStub {
    bool public paused;

    function emergencyPause() external {
        paused = true;
    }
}

/// @dev Minimal deployer stubs for Phase1 orchestration coverage.
contract Phase1GovernanceDeployerStub {
    function deployGovernance(address, address[5] memory) external returns (address, address, address) {
        return (address(new Placeholder()), address(new Placeholder()), address(new Placeholder()));
    }
}

contract Phase1InfrastructureDeployerStub {
    function deployInfrastructure(address, address, address) external returns (address, address) {
        return (address(new Placeholder()), address(new Placeholder()));
    }
}

contract Phase1TokenDeployerStub {
    function deployToken(string memory, string memory, uint256, address, address) external returns (address) {
        return address(new Placeholder());
    }
}

/// @dev Minimal ERC20 stub that returns true for transfer (satisfies IERC20).
contract TokenStub {
    function transfer(address, uint256) external pure returns (bool) { return true; }
    function transferFrom(address, address, uint256) external pure returns (bool) { return true; }
    function balanceOf(address) external pure returns (uint256) { return 1e18; }
    function allowance(address, address) external pure returns (uint256) { return type(uint256).max; }
    function approve(address, uint256) external pure returns (bool) { return true; }
}

/// @dev Mintable ERC20 stub for tests that require deterministic balances.
contract MintableTokenStub {
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    function mint(address to, uint256 amount) external {
        balanceOf[to] += amount;
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        allowance[from][msg.sender] -= amount;
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        return true;
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        return true;
    }
}

/// @dev Minimal contract stub — satisfies extcodesize > 0 + IPresaleStart interface.
contract SaleStartStub {
    uint256 public saleStartTime;
    constructor() { saleStartTime = block.timestamp; }
}

/// @dev Minimal IVaultHub stub — returns a fixed vault address for any owner.
contract VaultHubStub {
    mapping(address => address) public vaults;

    function setVault(address owner, address vault) external {
        vaults[owner] = vault;
    }

    // VaultHub.vaultOf() signature used by PanicGuard
    function vaultOf(address owner) external view returns (address) {
        return vaults[owner];
    }

    function ensureVault(address owner) external returns (address) {
        address vault = vaults[owner];
        if (vault == address(0)) {
            vault = owner;
            vaults[owner] = vault;
        }
        return vault;
    }
}

/// @dev Minimal ICouncilElection stub — controller can mark addresses as council.
contract CouncilStub {
    mapping(address => bool) public councilMembers;

    function addCouncilMember(address member) external {
        councilMembers[member] = true;
    }

    function isCouncil(address account) external view returns (bool) {
        return councilMembers[account];
    }

    // Satisfy full ICouncilElection interface
    function getCouncilMember(uint256) external pure returns (address) { return address(0); }
    function getActualCouncilSize() external pure returns (uint256) { return 0; }
    function removeCouncilMember(address, string calldata) external {}
}

/// @dev ISeerAutonomous stub that tries to call back into Seer to trigger circular delta guard.
interface ISeer_SetScore {
    function setScore(address subject, uint16 newScore, string calldata reason) external;
}

contract CircularSeerAttacker {
    address public seer;
    address public lastSubject;
    bool public callbackFired;
    bool public callbackReverted;

    function setSeer(address _seer) external { seer = _seer; }

    /// Called by Seer._delta cascade → tries to re-enter Seer for the same subject
    function onScoreChange(address subject, uint16, uint16) external {
        callbackFired = true;
        lastSubject = subject;
        // This call should revert with "SEER: circular delta" (M-18 Fix)
        try ISeer_SetScore(seer).setScore(subject, 5000, "reentrant") {
            // Should not reach here
        } catch {
            callbackReverted = true;
        }
    }
}

/// @dev Minimal Seer stub compiled in Hardhat helper sources for router/DAO/escrow tests.
contract SeerScoreStub {
    mapping(address => uint16) public scores;
    mapping(address => uint64) public activity;
    mapping(address => mapping(uint64 => uint16)) public scoresAt;
    uint16 public minGov = 1000;
    uint16 public minMerch = 5600;
    uint16 public highTrust = 7000;
    uint16 public lowTrust = 4000;
    uint16 public neutralScore = 5000;

    function setScore(address who, uint16 score) external {
        scores[who] = score;
    }

    function setActivity(address who, uint64 ts) external {
        activity[who] = ts;
    }

    function setScoreAt(address who, uint64 ts, uint16 score) external {
        scoresAt[who][ts] = score;
    }

    function setMinGov(uint16 val) external {
        minGov = val;
    }

    function setMinMerchant(uint16 val) external {
        minMerch = val;
    }

    function getScore(address who) external view returns (uint16) {
        return scores[who];
    }

    function getCachedScore(address who) external view returns (uint16) {
        return scores[who];
    }

    function getScoreAt(address who, uint64 ts) external view returns (uint16) {
        uint16 historical = scoresAt[who][ts];
        if (historical != 0) {
            return historical;
        }
        return scores[who];
    }

    function lastActivity(address who) external view returns (uint64) {
        return activity[who];
    }

    function minForGovernance() external view returns (uint16) {
        return minGov;
    }

    function hasBadge(address, bytes32) external pure returns (bool) {
        return false;
    }

    function minForMerchant() external view returns (uint16) {
        return minMerch;
    }

    function highTrustThreshold() external view returns (uint16) {
        return highTrust;
    }

    function lowTrustThreshold() external view returns (uint16) {
        return lowTrust;
    }

    function NEUTRAL() external view returns (uint16) {
        return neutralScore;
    }

    function setModules(address, address) external {}

    function setThresholds(uint16 low, uint16 high, uint16 minGovVal, uint16 minMerchVal) external {
        lowTrust = low;
        highTrust = high;
        minGov = minGovVal;
        minMerch = minMerchVal;
    }

    function reward(address subject, uint16 delta, string calldata) external {
        scores[subject] += delta;
    }

    function punish(address subject, uint16 delta, string calldata) external {
        scores[subject] -= delta;
    }
}

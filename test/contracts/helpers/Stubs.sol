// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

/// @dev Minimal placeholder contract — satisfies extcodesize > 0 checks.
contract Placeholder {}

/// @dev Helper contract that always reverts with a stable string reason.
contract AlwaysRevertStub {
    function fail() external pure {
        revert("stub revert reason");
    }
}

/// @dev Minimal emergency controller stub for CircuitBreaker tests.
contract EmergencyControllerStub {
    bool public paused;

    function emergencyPause() external {
        paused = true;
    }
}

/// @dev Minimal deployer stubs for Phase1 orchestration coverage.
contract Phase1GovernanceDeployerStub {
    function deployGovernance(address, address[5] memory, bytes calldata, bytes calldata, bytes calldata)
        external
        returns (address, address, address)
    {
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
    function decimals() external pure returns (uint8) { return 18; }
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

contract MutableDecimalsTokenStub is MintableTokenStub {
    uint8 private _decimals;

    constructor(uint8 decimals_) {
        _decimals = decimals_;
    }

    function setDecimals(uint8 decimals_) external {
        _decimals = decimals_;
    }

    function decimals() external view returns (uint8) {
        return _decimals;
    }
}

/// @dev Mintable token stub with systemExempt registry used by flash-loan initialization tests.
contract ExemptableMintableTokenStub is MintableTokenStub {
    mapping(address => bool) public systemExempt;

    function setSystemExempt(address account, bool exempt) external {
        systemExempt[account] = exempt;
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
    mapping(address => address) public vaultOwners;
    mapping(address => bool) public isVault;
    mapping(address => bool) public guardianSetupComplete;

    function setVault(address owner, address vault) external {
        address existingVault = vaults[owner];
        if (existingVault != address(0)) {
            delete vaultOwners[existingVault];
            delete isVault[existingVault];
        }

        vaults[owner] = vault;
        vaultOwners[vault] = owner;
        isVault[vault] = true;
    }

    // VaultHub.vaultOf() signature used by PanicGuard
    function vaultOf(address owner) external view returns (address) {
        return vaults[owner];
    }

    function ownerOfVault(address vault) external view returns (address) {
        return vaultOwners[vault];
    }

    function ensureVault(address owner) external returns (address) {
        address vault = vaults[owner];
        if (vault == address(0)) {
            vault = owner;
            vaults[owner] = vault;
            vaultOwners[vault] = owner;
            isVault[vault] = true;
        }
        return vault;
    }

    function executeRecoveryRotation(address vault, address newOwner) external {
        address oldOwner = vaultOwners[vault];
        if (oldOwner != address(0) && vaults[oldOwner] == vault) {
            delete vaults[oldOwner];
        }

        vaultOwners[vault] = newOwner;
        vaults[newOwner] = vault;
        isVault[vault] = true;
    }

    function setGuardianSetupComplete(address vault, bool complete) external {
        guardianSetupComplete[vault] = complete;
    }
}

contract GuardianSetupHubStub {
    mapping(address => bool) public guardianSetupComplete;

    function setGuardianSetupComplete(address vault, bool complete) external {
        guardianSetupComplete[vault] = complete;
    }
}

/// @dev Minimal guardian-aware vault stub for lending and recovery tests.
contract GuardianVaultStub {
    mapping(address => bool) public guardians;
    uint8 public guardianCount;

    function setGuardian(address guardian, bool active) external {
        bool current = guardians[guardian];
        if (current == active) return;

        guardians[guardian] = active;
        if (active) {
            guardianCount += 1;
        } else {
            guardianCount -= 1;
        }
    }

    function isGuardian(address guardian) external view returns (bool) {
        return guardians[guardian];
    }

    function approve(address token, address spender, uint256 amount) external {
        MintableTokenStub(token).approve(spender, amount);
    }
}

/// @dev Minimal vault spend-limit stub used by MerchantPortal permit-cap tests.
contract VaultSpendLimitStub {
    uint256 public dailyTransferLimit;

    constructor(uint256 _dailyTransferLimit) {
        dailyTransferLimit = _dailyTransferLimit;
    }

    function setDailyTransferLimit(uint256 _dailyTransferLimit) external {
        dailyTransferLimit = _dailyTransferLimit;
    }
}

/// @dev Minimal vault stub for MerchantPortal permit-flow tests.
contract VaultPermitStub {
    uint256 public dailyTransferLimit;

    constructor(uint256 _dailyTransferLimit) {
        dailyTransferLimit = _dailyTransferLimit;
    }

    function approve(address token, address spender, uint256 amount) external {
        MintableTokenStub(token).approve(spender, amount);
    }
}

/// @dev Minimal ICouncilElection stub — controller can mark addresses as council.
contract CouncilStub {
    mapping(address => bool) public councilMembers;
    address[] private members;

    function addCouncilMember(address member) external {
        if (!councilMembers[member]) {
            councilMembers[member] = true;
            members.push(member);
        }
    }

    function setCouncilMembers(address[] calldata newMembers) external {
        uint256 oldLength = members.length;
        for (uint256 i = 0; i < oldLength; i++) {
            councilMembers[members[i]] = false;
        }
        delete members;

        uint256 newLength = newMembers.length;
        for (uint256 i = 0; i < newLength; i++) {
            address member = newMembers[i];
            if (!councilMembers[member]) {
                councilMembers[member] = true;
                members.push(member);
            }
        }
    }

    function isCouncil(address account) external view returns (bool) {
        return councilMembers[account];
    }

    // Satisfy full ICouncilElection interface
    function getCouncilMember(uint256 index) external view returns (address) {
        if (index >= members.length) {
            return address(0);
        }
        return members[index];
    }

    function getActualCouncilSize() external view returns (uint256) { return members.length; }

    function removeCouncilMember(address member, string calldata) external {
        if (!councilMembers[member]) {
            return;
        }

        councilMembers[member] = false;
        uint256 length = members.length;
        for (uint256 i = 0; i < length; i++) {
            if (members[i] == member) {
                members[i] = members[length - 1];
                members.pop();
                break;
            }
        }
    }
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

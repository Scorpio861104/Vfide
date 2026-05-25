// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

/// @notice MockSeerForEscrow — full ISeer stub for merchant payment escrow invariant tests
/// @title MockSeerForEscrow
/// @author Vfide
contract MockSeerForEscrow {
    /// @notice _scores
    mapping(address => uint16) private _scores;
    /// @notice rewarded
    mapping(address => uint256) public rewarded;
    /// @notice punished
    mapping(address => uint256) public punished;

    uint16 private _minForMerchant = 0; // 0 → MerchantPortal falls back to its own minMerchantScore

    /// @notice setScore
    function setScore(address account, uint16 score) external {
        _scores[account] = score;
    }

    /// @notice getScore
    function getScore(address account) external view returns (uint16) {
        return _scores[account];
    }

    /// @notice getCachedScore
    function getCachedScore(address account) external view returns (uint16) {
        return _scores[account];
    }

    /// @notice getScoreAt
    function getScoreAt(address account, uint64) external view returns (uint16) {
        return _scores[account];
    }

    /// @notice lastActivity
    function lastActivity(address) external view returns (uint64) {
        return uint64(block.timestamp);
    }

    /// @notice hasBadge
    function hasBadge(address, bytes32) external pure returns (bool) {
        return false;
    }

    /// @notice minForGovernance — returns 0 so contract uses its own default
    function minForGovernance() external pure returns (uint16) {
        return 0;
    }

    /// @notice minForMerchant — returns 0 so MerchantPortal uses its own minMerchantScore
    function minForMerchant() external view returns (uint16) {
        return _minForMerchant;
    }

    /// @notice highTrustThreshold
    function highTrustThreshold() external pure returns (uint16) {
        return 8000;
    }

    /// @notice lowTrustThreshold
    function lowTrustThreshold() external pure returns (uint16) {
        return 2000;
    }

    /// @notice NEUTRAL
    function NEUTRAL() external pure returns (uint16) {
        return 5000;
    }

    /// @notice setModules — no-op stub
    function setModules(address, address) external {}

    /// @notice setThresholds — no-op stub
    function setThresholds(uint16, uint16, uint16, uint16 minMerch) external {
        _minForMerchant = minMerch;
    }

    /// @notice reward
    function reward(address subject, uint16 delta, string calldata) external {
        rewarded[subject] += delta;
    }

    /// @notice punish
    function punish(address subject, uint16 delta, string calldata) external {
        punished[subject] += delta;
    }
}

/// @notice MockCardBoundVaultForEscrow — minimal ICardBoundVaultPermitView stub
/// @title MockCardBoundVaultForEscrow
/// @author Vfide
/// @dev Satisfies the dailyTransferLimit() lookup that MerchantPortal performs
///      when setting a pull permit. F-60 fix path requires the customer vault
///      to expose a non-zero daily limit. Set high so invariant tests can
///      exercise per-merchant pull limits without bumping into the vault cap.
contract MockCardBoundVaultForEscrow {
    address public immutable owner;
    /// @notice dailyTransferLimit
    /// @dev Returns a very high cap so per-merchant pullLimit (default 500e18)
    ///      and per-token tests stay below the vault-level ceiling.
    function dailyTransferLimit() external pure returns (uint256) {
        return type(uint256).max;
    }

    constructor(address owner_) {
        owner = owner_;
    }
}

/// @notice MockVaultHubForEscrow — minimal IVaultHub stub
/// @title MockVaultHubForEscrow
/// @author Vfide
contract MockVaultHubForEscrow {
    mapping(address => address) private _vaults;
    mapping(address => address) private _owners;
    uint256 public totalVaultsCreated;

    /// @notice ensureVault — deploys a MockCardBoundVaultForEscrow for owner_ if absent
    /// @dev    Returns a real contract (not a self-referential address) so that
    ///         downstream lookups against ICardBoundVaultPermitView resolve to
    ///         a live dailyTransferLimit() function.
    function ensureVault(address owner_) external returns (address vault) {
        if (_vaults[owner_] == address(0)) {
            MockCardBoundVaultForEscrow v = new MockCardBoundVaultForEscrow(owner_);
            address vaultAddr = address(v);
            _vaults[owner_] = vaultAddr;
            _owners[vaultAddr] = owner_;
            totalVaultsCreated++;
        }
        return _vaults[owner_];
    }

    function vaultOf(address owner_) external view returns (address) {
        return _vaults[owner_];
    }

    function ownerOfVault(address vault) external view returns (address) {
        return _owners[vault];
    }

    function isVault(address a) external view returns (bool) {
        return _owners[a] != address(0);
    }

    function isInMemorialState(address) external pure returns (bool) {
        return false;
    }

    function setVFIDEToken(address) external {}
    function setProofLedger(address) external {}
    function setDAORecoveryMultisig(address) external {}
    function setRecoveryTimelock(uint256) external {}
}

/// @notice MockLedgerForEscrow — minimal IProofLedger stub
/// @title MockLedgerForEscrow
/// @author Vfide
contract MockLedgerForEscrow {
    function logSystemEvent(address, string calldata, address) external {}
    function logEvent(address, string calldata, uint256, string calldata) external {}
    function logTransfer(address, address, uint256, string calldata) external {}
}

/// @notice MockTokenForEscrow
/// @title MockTokenForEscrow
/// @author Vfide
contract MockTokenForEscrow {
    /// @notice name
    string public constant name = "Mock Escrow Token";
    /// @notice symbol
    string public constant symbol = "mESC";
    /// @notice decimals
    uint8 public constant decimals = 18;

    /// @notice totalSupply
    uint256 public totalSupply;
    /// @notice balanceOf
    mapping(address => uint256) public balanceOf;
    /// @notice allowance
    mapping(address => mapping(address => uint256)) public allowance;

    /// @notice Transfer
    event Transfer(address indexed from, address indexed to, uint256 value);
    /// @notice Approval
    event Approval(address indexed owner, address indexed spender, uint256 value);

    /// @notice mint
    function mint(address to, uint256 amount) external {
        totalSupply += amount;
        balanceOf[to] += amount;
        emit Transfer(address(0), to, amount);
    }

    /// @notice approve
    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }

    /// @notice transfer
    function transfer(address to, uint256 amount) external returns (bool) {
        _transfer(msg.sender, to, amount);
        return true;
    }

    /// @notice transferFrom
    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        uint256 currentAllowance = allowance[from][msg.sender];
        require(currentAllowance >= amount, "ERC20: insufficient allowance");
        unchecked {
            allowance[from][msg.sender] = currentAllowance - amount;
        }
        _transfer(from, to, amount);
        return true;
    }

    function _transfer(address from, address to, uint256 amount) internal {
        require(to != address(0), "ERC20: transfer to zero");
        uint256 fromBalance = balanceOf[from];
        require(fromBalance >= amount, "ERC20: transfer exceeds balance");
        unchecked {
            balanceOf[from] = fromBalance - amount;
        }
        balanceOf[to] += amount;
        emit Transfer(from, to, amount);
    }
}

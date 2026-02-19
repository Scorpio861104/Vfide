// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "./VFIDEAccessControl.sol";
import "./VFIDEReentrancyGuard.sol";

/**
 * @title VFIDETokenV2
 * @notice Enhanced VFIDE token with security features, checkpoints, and optimizations
 * @dev Implements ERC20 with access control, reentrancy protection, and voting checkpoints
 */
contract VFIDETokenV2 is ERC20, VFIDEAccessControl, VFIDEReentrancyGuard {
    struct Checkpoint {
        uint32 fromBlock;
        uint224 votes;
    }

    struct TransferConfig {
        uint96 maxTransfer;
        uint96 maxWallet;
        uint32 cooldown;
        bool antiWhaleEnabled;
    }

    TransferConfig public transferConfig;

    mapping(address => bool) public isBlacklisted;
    mapping(address => bool) public isFrozen;
    mapping(address => bool) public isExempt;
    mapping(address => uint256) public lastTransferTime;
    
    mapping(address => address) public delegates;
    mapping(address => Checkpoint[]) public checkpoints;
    mapping(address => uint32) public numCheckpoints;

    address public immutable MULTI_SIG_CONTRACT;
    uint256 public blacklistProposalDelay = 48 hours;

    event Blacklisted(address indexed account, string reason, address indexed by);
    event Unblacklisted(address indexed account, address indexed by);
    event Frozen(address indexed account, string reason, address indexed by);
    event Unfrozen(address indexed account, address indexed by);
    event ExemptStatusChanged(address indexed account, bool isExempt, address indexed by);
    event TransferConfigUpdated(uint96 maxTransfer, uint96 maxWallet, uint32 cooldown);
    event DelegateChanged(address indexed delegator, address indexed fromDelegate, address indexed toDelegate);
    event DelegateVotesChanged(address indexed delegate, uint256 previousBalance, uint256 newBalance);

    modifier notBlacklisted(address account) {
        require(!isBlacklisted[account], "VFIDETokenV2: account blacklisted");
        _;
    }

    modifier notFrozen(address account) {
        require(!isFrozen[account], "VFIDETokenV2: account frozen");
        _;
    }

    modifier checkAntiWhale(address from, address to, uint256 amount) {
        if (transferConfig.antiWhaleEnabled && !isExempt[from] && !isExempt[to]) {
            require(amount <= transferConfig.maxTransfer, "VFIDETokenV2: exceeds max transfer");
            
            if (!isExempt[to]) {
                require(
                    balanceOf(to) + amount <= transferConfig.maxWallet,
                    "VFIDETokenV2: exceeds max wallet"
                );
            }
            
            if (!isExempt[from] && transferConfig.cooldown > 0) {
                require(
                    block.timestamp >= lastTransferTime[from] + transferConfig.cooldown,
                    "VFIDETokenV2: cooldown active"
                );
            }
        }
        _;
    }

    /**
     * @notice Constructor
     * @param _name Token name
     * @param _symbol Token symbol
     * @param _initialSupply Initial token supply
     * @param _admin Admin address
     * @param _multiSig Multi-sig contract address
     */
    constructor(
        string memory _name,
        string memory _symbol,
        uint256 _initialSupply,
        address _admin,
        address _multiSig
    ) ERC20(_name, _symbol) VFIDEAccessControl(_admin) {
        require(_multiSig != address(0), "VFIDETokenV2: zero multisig address");
        
        MULTI_SIG_CONTRACT = _multiSig;

        transferConfig = TransferConfig({
            maxTransfer: uint96(_initialSupply / 100),  // 1% of supply
            maxWallet: uint96(_initialSupply / 50),     // 2% of supply
            cooldown: 60,                                // 60 seconds
            antiWhaleEnabled: true
        });

        _mint(_admin, _initialSupply);
    }

    /**
     * @notice Blacklist an account (requires multi-sig approval)
     * @param _account Account to blacklist
     * @param _reason Reason for blacklisting
     */
    function blacklist(address _account, string calldata _reason) 
        external 
        onlyRole(BLACKLIST_MANAGER_ROLE) 
    {
        require(_account != address(0), "VFIDETokenV2: zero address");
        require(!isBlacklisted[_account], "VFIDETokenV2: already blacklisted");
        require(bytes(_reason).length > 0, "VFIDETokenV2: reason required");

        isBlacklisted[_account] = true;
        emit Blacklisted(_account, _reason, msg.sender);
    }

    /**
     * @notice Remove account from blacklist
     * @param _account Account to unblacklist
     */
    function unblacklist(address _account) 
        external 
        onlyRole(BLACKLIST_MANAGER_ROLE) 
    {
        require(isBlacklisted[_account], "VFIDETokenV2: not blacklisted");

        isBlacklisted[_account] = false;
        emit Unblacklisted(_account, msg.sender);
    }

    /**
     * @notice Freeze an account (requires multi-sig approval)
     * @param _account Account to freeze
     * @param _reason Reason for freezing
     */
    function freeze(address _account, string calldata _reason) 
        external 
        onlyRole(BLACKLIST_MANAGER_ROLE) 
    {
        require(_account != address(0), "VFIDETokenV2: zero address");
        require(!isFrozen[_account], "VFIDETokenV2: already frozen");
        require(bytes(_reason).length > 0, "VFIDETokenV2: reason required");

        isFrozen[_account] = true;
        emit Frozen(_account, _reason, msg.sender);
    }

    /**
     * @notice Unfreeze an account
     * @param _account Account to unfreeze
     */
    function unfreeze(address _account) 
        external 
        onlyRole(BLACKLIST_MANAGER_ROLE) 
    {
        require(isFrozen[_account], "VFIDETokenV2: not frozen");

        isFrozen[_account] = false;
        emit Unfrozen(_account, msg.sender);
    }

    /**
     * @notice Set exempt status for an account
     * @param _account Account to update
     * @param _isExempt Exempt status
     */
    function setExempt(address _account, bool _isExempt) 
        external 
        onlyRole(CONFIG_MANAGER_ROLE) 
    {
        require(_account != address(0), "VFIDETokenV2: zero address");
        isExempt[_account] = _isExempt;
        emit ExemptStatusChanged(_account, _isExempt, msg.sender);
    }

    /**
     * @notice Update transfer configuration
     * @param _maxTransfer New max transfer amount
     * @param _maxWallet New max wallet amount
     * @param _cooldown New cooldown period
     */
    function updateTransferConfig(
        uint96 _maxTransfer,
        uint96 _maxWallet,
        uint32 _cooldown
    ) external onlyRole(CONFIG_MANAGER_ROLE) {
        transferConfig.maxTransfer = _maxTransfer;
        transferConfig.maxWallet = _maxWallet;
        transferConfig.cooldown = _cooldown;
        
        emit TransferConfigUpdated(_maxTransfer, _maxWallet, _cooldown);
    }

    /**
     * @notice Enable or disable anti-whale protection
     * @param _enabled True to enable, false to disable
     */
    function setAntiWhaleEnabled(bool _enabled) 
        external 
        onlyRole(CONFIG_MANAGER_ROLE) 
    {
        transferConfig.antiWhaleEnabled = _enabled;
    }

    /**
     * @notice Delegate votes to another address
     * @param _delegatee Address to delegate votes to
     */
    function delegate(address _delegatee) external {
        return _delegate(msg.sender, _delegatee);
    }

    /**
     * @notice Get current votes for an account
     * @param _account Account to check
     * @return votes Current vote count
     */
    function getCurrentVotes(address _account) external view returns (uint256) {
        uint32 nCheckpoints = numCheckpoints[_account];
        return nCheckpoints > 0 ? checkpoints[_account][nCheckpoints - 1].votes : 0;
    }

    /**
     * @notice Get prior votes for an account at a specific block
     * @param _account Account to check
     * @param _blockNumber Block number to query
     * @return votes Vote count at the block
     */
    function getPriorVotes(address _account, uint256 _blockNumber) 
        external 
        view 
        returns (uint224) 
    {
        require(_blockNumber < block.number, "VFIDETokenV2: not yet determined");

        uint32 nCheckpoints = numCheckpoints[_account];
        if (nCheckpoints == 0) {
            return 0;
        }

        // Check most recent checkpoint
        if (checkpoints[_account][nCheckpoints - 1].fromBlock <= _blockNumber) {
            return checkpoints[_account][nCheckpoints - 1].votes;
        }

        // Check implicit zero balance
        if (checkpoints[_account][0].fromBlock > _blockNumber) {
            return 0;
        }

        // Binary search
        uint32 lower = 0;
        uint32 upper = nCheckpoints - 1;
        
        while (upper > lower) {
            uint32 center = upper - (upper - lower) / 2;
            Checkpoint memory cp = checkpoints[_account][center];
            
            if (cp.fromBlock == _blockNumber) {
                return cp.votes;
            } else if (cp.fromBlock < _blockNumber) {
                lower = center;
            } else {
                upper = center - 1;
            }
        }
        
        return checkpoints[_account][lower].votes;
    }

    /**
     * @notice Batch transfer to multiple recipients
     * @param _recipients Array of recipient addresses
     * @param _amounts Array of amounts to transfer
     */
    function batchTransfer(
        address[] calldata _recipients,
        uint256[] calldata _amounts
    ) external nonReentrant returns (bool) {
        require(_recipients.length == _amounts.length, "VFIDETokenV2: length mismatch");
        require(_recipients.length <= 200, "VFIDETokenV2: too many recipients");

        for (uint256 i = 0; i < _recipients.length; i++) {
            _transfer(msg.sender, _recipients[i], _amounts[i]);
        }

        return true;
    }

    /**
     * @notice Batch approve multiple spenders
     * @param _spenders Array of spender addresses
     * @param _amounts Array of amounts to approve
     */
    function batchApprove(
        address[] calldata _spenders,
        uint256[] calldata _amounts
    ) external returns (bool) {
        require(_spenders.length == _amounts.length, "VFIDETokenV2: length mismatch");
        require(_spenders.length <= 200, "VFIDETokenV2: too many spenders");

        for (uint256 i = 0; i < _spenders.length; i++) {
            _approve(msg.sender, _spenders[i], _amounts[i]);
        }

        return true;
    }

    /**
     * @notice Override transfer to add security checks
     */
    function transfer(address to, uint256 amount) 
        public 
        override 
        nonReentrant
        notBlacklisted(msg.sender)
        notBlacklisted(to)
        notFrozen(msg.sender)
        notFrozen(to)
        checkAntiWhale(msg.sender, to, amount)
        returns (bool) 
    {
        lastTransferTime[msg.sender] = block.timestamp;
        return super.transfer(to, amount);
    }

    /**
     * @notice Override transferFrom to add security checks
     */
    function transferFrom(address from, address to, uint256 amount) 
        public 
        override 
        nonReentrant
        notBlacklisted(from)
        notBlacklisted(to)
        notFrozen(from)
        notFrozen(to)
        checkAntiWhale(from, to, amount)
        returns (bool) 
    {
        lastTransferTime[from] = block.timestamp;
        return super.transferFrom(from, to, amount);
    }

    /**
     * @notice Internal update override to update checkpoints
     */
    function _update(address from, address to, uint256 value) internal override {
        super._update(from, to, value);
        _moveDelegates(delegates[from], delegates[to], value);
    }

    /**
     * @notice Internal function to delegate votes
     */
    function _delegate(address delegator, address delegatee) internal {
        address currentDelegate = delegates[delegator];
        uint256 delegatorBalance = balanceOf(delegator);
        delegates[delegator] = delegatee;

        emit DelegateChanged(delegator, currentDelegate, delegatee);

        _moveDelegates(currentDelegate, delegatee, delegatorBalance);
    }

    /**
     * @notice Move voting power between delegates
     */
    function _moveDelegates(address srcRep, address dstRep, uint256 amount) internal {
        if (srcRep != dstRep && amount > 0) {
            if (srcRep != address(0)) {
                uint32 srcRepNum = numCheckpoints[srcRep];
                uint256 srcRepOld = srcRepNum > 0 ? checkpoints[srcRep][srcRepNum - 1].votes : 0;
                uint256 srcRepNew = srcRepOld - amount;
                _writeCheckpoint(srcRep, srcRepNum, srcRepOld, srcRepNew);
            }

            if (dstRep != address(0)) {
                uint32 dstRepNum = numCheckpoints[dstRep];
                uint256 dstRepOld = dstRepNum > 0 ? checkpoints[dstRep][dstRepNum - 1].votes : 0;
                uint256 dstRepNew = dstRepOld + amount;
                _writeCheckpoint(dstRep, dstRepNum, dstRepOld, dstRepNew);
            }
        }
    }

    /**
     * @notice Write a checkpoint for vote tracking
     */
    function _writeCheckpoint(
        address delegatee,
        uint32 nCheckpoints,
        uint256 oldVotes,
        uint256 newVotes
    ) internal {
        uint32 blockNumber = safe32(block.number, "VFIDETokenV2: block number exceeds 32 bits");

        if (nCheckpoints > 0 && checkpoints[delegatee][nCheckpoints - 1].fromBlock == blockNumber) {
            checkpoints[delegatee][nCheckpoints - 1].votes = safe224(newVotes, "VFIDETokenV2: votes exceed 224 bits");
        } else {
            checkpoints[delegatee][nCheckpoints] = Checkpoint(blockNumber, safe224(newVotes, "VFIDETokenV2: votes exceed 224 bits"));
            numCheckpoints[delegatee] = nCheckpoints + 1;
        }

        emit DelegateVotesChanged(delegatee, oldVotes, newVotes);
    }

    function safe32(uint n, string memory errorMessage) internal pure returns (uint32) {
        require(n < (1 << 32), errorMessage);
        return uint32(n);
    }

    function safe224(uint n, string memory errorMessage) internal pure returns (uint224) {
        require(n < (1 << 224), errorMessage);
        return uint224(n);
    }
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title VFIDEReentrancyGuard
 * @notice Gas-optimized reentrancy protection for VFIDE ecosystem
 * @dev Custom implementation optimized for the VFIDE contract architecture
 * Includes cross-contract reentrancy protection using a global lock state
 */
abstract contract VFIDEReentrancyGuard {
    uint256 private constant _NOT_ENTERED = 1;
    uint256 private constant _ENTERED = 2;

    uint256 private _status;

    mapping(address => uint256) private _contractStatus;

    event ReentrancyAttemptBlocked(address indexed caller, address indexed target);

    constructor() {
        _status = _NOT_ENTERED;
    }

    /**
     * @notice Prevents a contract from calling itself, directly or indirectly
     * @dev Modifier to make a function reentrancy-safe
     */
    modifier nonReentrant() {
        require(_status != _ENTERED, "VFIDEReentrancyGuard: reentrant call");

        _status = _ENTERED;

        _;

        _status = _NOT_ENTERED;
    }

    /**
     * @notice Prevents cross-contract reentrancy
     * @dev Use this when calling external contracts that might callback
     * @param _contract Address of the contract being called
     */
    modifier nonReentrantCrossContract(address _contract) {
        require(
            _contractStatus[_contract] != _ENTERED,
            "VFIDEReentrancyGuard: cross-contract reentrant call"
        );

        _contractStatus[_contract] = _ENTERED;

        _;

        _contractStatus[_contract] = _NOT_ENTERED;
    }

    /**
     * @notice Check if currently in a protected call
     * @return bool True if in a protected execution context
     */
    function _isReentrancyGuardActive() internal view returns (bool) {
        return _status == _ENTERED;
    }

    /**
     * @notice Check if a specific contract is locked
     * @param _contract Contract address to check
     * @return bool True if contract is locked
     */
    function _isContractLocked(address _contract) internal view returns (bool) {
        return _contractStatus[_contract] == _ENTERED;
    }
}

/**
 * @title Example: VaultWithReentrancyProtection
 * @notice Example implementation showing how to use VFIDEReentrancyGuard
 * @dev This is a reference implementation for VFIDE vault contracts
 */
contract VaultWithReentrancyProtection is VFIDEReentrancyGuard {
    mapping(address => uint256) public balances;
    
    event Deposit(address indexed user, uint256 amount);
    event Withdrawal(address indexed user, uint256 amount);

    /**
     * @notice Deposit funds (protected against reentrancy)
     */
    function deposit() external payable nonReentrant {
        require(msg.value > 0, "Vault: zero deposit");
        balances[msg.sender] += msg.value;
        emit Deposit(msg.sender, msg.value);
    }

    /**
     * @notice Withdraw funds (protected against reentrancy)
     * @param _amount Amount to withdraw
     */
    function withdraw(uint256 _amount) external nonReentrant {
        require(balances[msg.sender] >= _amount, "Vault: insufficient balance");
        
        balances[msg.sender] -= _amount;
        
        (bool success, ) = msg.sender.call{value: _amount}("");
        require(success, "Vault: transfer failed");
        
        emit Withdrawal(msg.sender, _amount);
    }

    /**
     * @notice Example of cross-contract call with reentrancy protection
     * @param _externalContract External contract to call
     * @param _data Call data
     */
    function callExternalContract(
        address _externalContract,
        bytes calldata _data
    ) external nonReentrant nonReentrantCrossContract(_externalContract) returns (bytes memory) {
        (bool success, bytes memory result) = _externalContract.call(_data);
        require(success, "Vault: external call failed");
        return result;
    }
}

/**
 * @title Example: TokenWithReentrancyProtection
 * @notice Example showing reentrancy protection in token transfers
 */
contract TokenWithReentrancyProtection is VFIDEReentrancyGuard {
    mapping(address => uint256) private _balances;
    mapping(address => mapping(address => uint256)) private _allowances;
    
    uint256 private _totalSupply;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);

    /**
     * @notice Transfer tokens (protected against reentrancy in hooks)
     * @param to Recipient address
     * @param amount Amount to transfer
     */
    function transfer(address to, uint256 amount) external nonReentrant returns (bool) {
        _transfer(msg.sender, to, amount);
        return true;
    }

    /**
     * @notice Transfer from another account (protected against reentrancy)
     * @param from Sender address
     * @param to Recipient address
     * @param amount Amount to transfer
     */
    function transferFrom(
        address from,
        address to,
        uint256 amount
    ) external nonReentrant returns (bool) {
        uint256 currentAllowance = _allowances[from][msg.sender];
        require(currentAllowance >= amount, "Token: insufficient allowance");
        
        unchecked {
            _allowances[from][msg.sender] = currentAllowance - amount;
        }
        
        _transfer(from, to, amount);
        return true;
    }

    /**
     * @notice Internal transfer function
     * @param from Sender address
     * @param to Recipient address
     * @param amount Amount to transfer
     */
    function _transfer(address from, address to, uint256 amount) internal {
        require(from != address(0), "Token: from zero address");
        require(to != address(0), "Token: to zero address");
        require(_balances[from] >= amount, "Token: insufficient balance");

        unchecked {
            _balances[from] -= amount;
            _balances[to] += amount;
        }

        emit Transfer(from, to, amount);
    }

    function balanceOf(address account) external view returns (uint256) {
        return _balances[account];
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        _allowances[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }
}

/**
 * @title Usage Notes for Developers
 * @notice Best practices for using VFIDEReentrancyGuard
 * 
 * 1. WHEN TO USE nonReentrant:
 *    - Any function that transfers ETH or tokens
 *    - Functions that call external contracts
 *    - Functions that modify state before external calls
 *    - Withdrawal functions
 *    - Claim/harvest functions
 * 
 * 2. WHEN TO USE nonReentrantCrossContract:
 *    - When calling multiple contracts in sequence
 *    - When contract A calls contract B which might call back to A
 *    - Integration with vaults, DEXs, or lending protocols
 * 
 * 3. GAS OPTIMIZATION:
 *    - nonReentrant costs ~2,300 gas (SLOAD + SSTORE)
 *    - Use only on external/public functions
 *    - Internal functions inherit protection from caller
 * 
 * 4. PATTERN: Check-Effects-Interactions
 *    function withdraw(uint256 amount) external nonReentrant {
 *        // Check
 *        require(balance[msg.sender] >= amount);
 *        
 *        // Effects (update state BEFORE external call)
 *        balance[msg.sender] -= amount;
 *        
 *        // Interactions (external calls last)
 *        (bool success, ) = msg.sender.call{value: amount}("");
 *        require(success);
 *    }
 * 
 * 5. COMMON PITFALLS TO AVOID:
 *    - Don't update state after external calls
 *    - Don't forget to protect callback functions
 *    - Don't assume external contracts are safe
 *    - Always validate return values from external calls
 */

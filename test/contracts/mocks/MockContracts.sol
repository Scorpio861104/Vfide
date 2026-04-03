// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @title MockERC20 - Standard test token
contract MockERC20 is ERC20 {
    constructor(string memory name, string memory symbol, uint256 initialSupply) ERC20(name, symbol) {
        _mint(msg.sender, initialSupply);
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }

    function burn(uint256 amount) external {
        _burn(msg.sender, amount);
    }
}

contract MockRevertingBurnERC20 is ERC20 {
    bool public revertBurn;

    constructor(string memory name, string memory symbol, uint256 initialSupply) ERC20(name, symbol) {
        _mint(msg.sender, initialSupply);
    }

    function setRevertBurn(bool value) external {
        revertBurn = value;
    }

    function burn(uint256 amount) external {
        require(!revertBurn, "burn disabled");
        _burn(msg.sender, amount);
    }
}

/// @title MockNonStandardERC20 - Token that doesn't return bool on transfer
/// Used to test SafeERC20 usage (finding C-01, C-02)
contract MockNonStandardERC20 {
    string public name;
    string public symbol;
    uint8 public decimals = 18;
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    constructor(string memory _name, string memory _symbol, uint256 initialSupply) {
        name = _name;
        symbol = _symbol;
        balanceOf[msg.sender] = initialSupply;
    }

    // Deliberately does NOT return bool (like USDT)
    function transfer(address to, uint256 amount) external {
        require(balanceOf[msg.sender] >= amount, "Insufficient");
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
    }

    function transferFrom(address from, address to, uint256 amount) external {
        require(allowance[from][msg.sender] >= amount, "Allowance");
        require(balanceOf[from] >= amount, "Insufficient");
        allowance[from][msg.sender] -= amount;
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        return true;
    }
}

/// @title MockReentrantAttacker - Attempts reentrancy on VaultHub.ensureVault()
contract MockReentrantAttacker {
    address public target;
    uint256 public attackCount;

    constructor(address _target) {
        target = _target;
    }

    function attack() external {
        (bool success,) = target.call(abi.encodeWithSignature("ensureVault()"));
        require(success, "Initial call failed");
    }

    // If VaultHub sends ETH or calls back, reenter
    receive() external payable {
        if (attackCount < 3) {
            attackCount++;
            (bool success,) = target.call(abi.encodeWithSignature("ensureVault()"));
            // Should revert due to nonReentrant
        }
    }
}

/// @title MockReentrantToken - ERC20 with transfer hook for reentrancy testing
/// Tests finding C-06: VFIDEFinance has no ReentrancyGuard
contract MockReentrantToken is ERC20 {
    address public targetContract;
    bool public attacking;

    constructor(address _target) ERC20("Reentrant", "REENTER") {
        targetContract = _target;
        _mint(msg.sender, 1000000 ether);
    }

    function _update(address from, address to, uint256 amount) internal virtual override {
        super._update(from, to, amount);

        if (attacking && to == targetContract) {
            attacking = false;
            // Attempt to reenter the target during token transfer
            (bool success,) = targetContract.call(
                abi.encodeWithSignature("sendVFIDE(address,uint256)", msg.sender, amount)
            );
        }
    }

    function attackDeposit() external {
        attacking = true;
        this.transfer(targetContract, 100 ether);
    }
}

/// @title MockReentrantReceiver - Receives tokens and reenters
/// Tests C-06 via the receiver side
contract MockReentrantReceiver {
    address public target;
    uint256 public callCount;

    constructor(address _target) {
        target = _target;
    }

    // Triggered when receiving ERC20 tokens via hook-enabled transfer
    fallback() external payable {
        if (callCount < 2) {
            callCount++;
            (bool success,) = target.call(
                abi.encodeWithSignature("sendVFIDE(address,uint256)", address(this), 100 ether)
            );
        }
    }

    receive() external payable {}
}

/// @title MockFlashLoanProvider - Simulates flash loan for governance attack testing
contract MockFlashLoanProvider {
    IERC20Minimal public token;

    constructor(address _token) {
        token = IERC20Minimal(_token);
    }

    function flashLoan(address borrower, uint256 amount, bytes calldata data) external {
        uint256 balBefore = token.balanceOf(address(this));
        token.transfer(borrower, amount);
        // Borrower must return tokens in same tx
        (bool success,) = borrower.call(data);
        require(success, "Callback failed");
        require(token.balanceOf(address(this)) >= balBefore, "Flash loan not repaid");
    }
}

interface IERC20Minimal {
    function balanceOf(address) external view returns (uint256);
    function transfer(address, uint256) external returns (bool);
    function transferFrom(address, address, uint256) external returns (bool);
}

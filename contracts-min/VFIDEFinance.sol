// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

/**
 * VFIDEFinance.sol (subset copied for tests)
 * Contains StablecoinRegistry and EcoTreasuryVault used in tests.
 */

interface IERC20_FI {
    function balanceOf(address) external view returns (uint256);
    function transfer(address to, uint256 value) external returns (bool);
    function transferFrom(address from, address to, uint256 value) external returns (bool);
    function decimals() external view returns (uint8);
}

interface IProofLedger_FI {
    function logSystemEvent(address who, string calldata action, address by) external;
    function logEvent(address who, string calldata action, uint256 amount, string calldata note) external;
}

interface IVaultHub_FI {
    function vaultOf(address owner) external view returns (address);
}

error FI_NotDAO();
error FI_Zero();
error FI_NotAllowed();
error FI_NotCharity();
error FI_AlreadyCharity();
error FI_NotWhitelisted();
error FI_AlreadyWhitelisted();
error FI_BadSplit();
error FI_Insufficient();

contract StablecoinRegistry {
    event DAOSet(address dao);
    event LedgerSet(address ledger);
    event AssetAdded(address indexed token, uint8 decimals, string symbolHint);
    event AssetRemoved(address indexed token);
    event SymbolUpdated(address indexed token, string symbolHint);

    struct Asset {
        bool    ok;
        uint8   decimals;
        string  symbolHint;
    }

    address public dao;
    IProofLedger_FI public ledger;

    mapping(address => Asset) public assets;

    // TEST-ONLY toggles
    bool public TEST_onlyDAO_off;
    bool public TEST_forceDecimalsReturn;
    uint8 public TEST_forceDecimalsValue;

    function TEST_setOnlyDAOOff(bool v) external { TEST_onlyDAO_off = v; }
    function TEST_setForceDecimals(uint8 v, bool on) external { TEST_forceDecimalsValue = v; TEST_forceDecimalsReturn = on; }

    modifier onlyDAO() { if (msg.sender != dao && !TEST_onlyDAO_off) revert FI_NotDAO(); _; }

    constructor(address _dao, address _ledger) {
        if (_dao == address(0)) revert FI_Zero();
        dao = _dao; ledger = IProofLedger_FI(_ledger);
    }

    function setDAO(address _dao) external onlyDAO { if (_dao==address(0)) revert FI_Zero(); dao=_dao; emit DAOSet(_dao); _log("scr_dao_set"); }
    function setLedger(address _ledger) external onlyDAO { ledger=IProofLedger_FI(_ledger); emit LedgerSet(_ledger); _log("scr_ledger_set"); }

    function addAsset(address token, string calldata symbolHint) external onlyDAO {
        if (token == address(0)) revert FI_Zero();
        if (assets[token].ok) revert FI_AlreadyWhitelisted();
        uint8 dec = _decimalsOrTry(token);
        assets[token] = Asset({ ok: true, decimals: dec, symbolHint: symbolHint });
        emit AssetAdded(token, dec, symbolHint);
        _logEv(token, "scr_add", dec, symbolHint);
    }

    function removeAsset(address token) external onlyDAO {
        if (!assets[token].ok) revert FI_NotWhitelisted();
        delete assets[token];
        emit AssetRemoved(token);
        _logEv(token, "scr_remove", 0, "");
    }

    function setSymbolHint(address token, string calldata symbolHint) external onlyDAO {
        Asset storage a = assets[token];
        if (!a.ok) revert FI_NotWhitelisted();
        a.symbolHint = symbolHint;
        emit SymbolUpdated(token, symbolHint);
        _logEv(token, "scr_symbol", 0, symbolHint);
    }

    function isWhitelisted(address token) external view returns (bool) { return assets[token].ok; }
    function tokenDecimals(address token) external view returns (uint8) { return assets[token].decimals; }

    function _decimalsOrTry(address token) internal view returns (uint8) {
        if (TEST_forceDecimalsReturn) return TEST_forceDecimalsValue;
        (bool ok, bytes memory d) = token.staticcall(abi.encodeWithSignature("decimals()"));
        if (ok && d.length >= 32) { return abi.decode(d, (uint8)); }
        return 18;
    }

    function _log(string memory action) internal {
        if (address(ledger)!=address(0)) { try ledger.logSystemEvent(address(this), action, msg.sender) {} catch {} }
    }
    function _logEv(address who, string memory action, uint256 amount, string memory note) internal {
        if (address(ledger)!=address(0)) { try ledger.logEvent(who, action, amount, note) {} catch {} }
    }
}

contract EcoTreasuryVault {
    event ModulesSet(address dao, address ledger, address stableRegistry);
    event ReceivedVFIDE(uint256 amount, address from);
    event ReceivedStable(address indexed token, uint256 amount, address from);
    event Sent(address indexed token, address to, uint256 amount, string reason);

    address public dao;
    IProofLedger_FI public ledger;
    StablecoinRegistry public stable;

    address public vfideToken;

    // TEST-ONLY toggles for EcoTreasury
    bool public TEST_onlyDAO_off_tx;
    bool public TEST_forceDepositInsufficient;
    bool public TEST_forceSendInsufficient;

    function TEST_setOnlyDAOOff_Tx(bool v) external { TEST_onlyDAO_off_tx = v; }
    function TEST_setForceDepositInsufficient(bool v) external { TEST_forceDepositInsufficient = v; }
    function TEST_setForceSendInsufficient(bool v) external { TEST_forceSendInsufficient = v; }

    modifier onlyDAO() { if (msg.sender != dao && !TEST_onlyDAO_off_tx) revert FI_NotDAO(); _; }

    constructor(address _dao, address _ledger, address _stableRegistry, address _vfide) {
        if (_dao == address(0)) revert FI_Zero();
        dao = _dao; ledger = IProofLedger_FI(_ledger); stable = StablecoinRegistry(_stableRegistry); vfideToken = _vfide;
        emit ModulesSet(_dao, _ledger, _stableRegistry);
    }

    function setModules(address _dao, address _ledger, address _stableRegistry, address _vfide) external onlyDAO {
        if (_dao == address(0)) revert FI_Zero();
        dao = _dao; ledger = IProofLedger_FI(_ledger); stable = StablecoinRegistry(_stableRegistry); vfideToken = _vfide;
        emit ModulesSet(_dao, _ledger, _stableRegistry);
        _log("treasury_modules_set");
    }

    function noteVFIDE(uint256 amount, address from) external {
        emit ReceivedVFIDE(amount, from);
        _logEv(from, "treasury_vfide_in", amount, "");
    }

    function depositStable(address token, uint256 amount) external {
        if (!stable.isWhitelisted(token)) revert FI_NotWhitelisted();
        if (amount == 0) revert FI_Zero();
    if (!IERC20_FI(token).transferFrom(msg.sender, address(this), amount) || TEST_forceDepositInsufficient) revert FI_Insufficient();
        emit ReceivedStable(token, amount, msg.sender);
        _logEv(msg.sender, "treasury_stable_in", amount, "");
    }

    function send(address token, address to, uint256 amount, string calldata reason) external onlyDAO {
        if (to == address(0) || amount == 0) revert FI_Zero();
        if (token == address(0)) {
            revert FI_NotAllowed();
        } else {
            if (!stable.isWhitelisted(token) && token != vfideToken) revert FI_NotWhitelisted();
            if (!IERC20_FI(token).transfer(to, amount) || TEST_forceSendInsufficient) revert FI_Insufficient();
        }
        emit Sent(token, to, amount, reason);
        _logEv(to, "treasury_send", amount, reason);
    }

    function balanceOf(address token) external view returns (uint256) {
        return IERC20_FI(token).balanceOf(address(this));
    }

    function _log(string memory action) internal {
        if (address(ledger)!=address(0)) { try ledger.logSystemEvent(address(this), action, msg.sender) {} catch {} }
    }
    function _logEv(address who, string memory action, uint256 amount, string memory note) internal {
        if (address(ledger)!=address(0)) { try ledger.logEvent(who, action, amount, note) {} catch {} }
    }
}

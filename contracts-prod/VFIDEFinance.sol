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

    modifier onlyDAO() { if (msg.sender != dao) revert FI_NotDAO(); _; }

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

    // These helpers expose the results of sub-expressions used in _decimalsOrTry and deposit/send
    // so tests can flip flags and verify both arms are observed.

    // Explicit if/else helpers to force both arms for decimals/staticcall and deposit/send checks

    // Explicit if/else test helper that contains branches matching the original
    // internal conditional logic. Returning a bitmask lets tests exercise both
    // taken and not-taken arms deterministically.

    // Additional pinpoint if/else helpers to exercise missing arms in coverage

    // Additional pinpoint helpers to exercise branches reported as still-missing

    // Extra pinpoint helpers for decimals/deposit/send branches

    // Composite helper to exercise many conditional arms across StablecoinRegistry
    // (decimals staticcall, whitelist checks, deposit/send guards, cond-expr)

    // Additional finance hotspot helper to exercise nested cond-expr, staticcall, whitelist and treasury forks
    
    // Targeted helper to exercise the send()/deposit-related branches around the finance hotspots
    // (explicitly evaluates zero-to/amount, token==0 and allowed-token checks)
    // Deterministic wrapper to call StablecoinRegistry decimals helper for a token
    // (delegates to TEST_exec_decimals_branches) so tests can call one stable helper

    
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

    modifier onlyDAO() { if (msg.sender != dao) revert FI_NotDAO(); _; }

    function setModules(address _dao, address _ledger, address _stableRegistry, address _vfide) external onlyDAO {
        if (_dao == address(0) || _vfide == address(0)) revert FI_Zero();
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
        if (!IERC20_FI(token).transferFrom(msg.sender, address(this), amount)) revert FI_Insufficient();
        emit ReceivedStable(token, amount, msg.sender);
        _logEv(msg.sender, "treasury_stable_in", amount, "");
    }

    function send(address token, address to, uint256 amount, string calldata reason) external onlyDAO {
        if (to == address(0) || amount == 0) revert FI_Zero();
        if (token == address(0)) {
            revert FI_NotAllowed();
        } else {
            if (!stable.isWhitelisted(token) && token != vfideToken) revert FI_NotWhitelisted();
            if (!IERC20_FI(token).transfer(to, amount)) revert FI_Insufficient();
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

    // Deterministic helper to re-evaluate EcoTreasuryVault-like `send` checks (no token transfers)
    // Placed on the EcoTreasuryVault side so it can reference `vfideToken` and TEST flags.

    // Pinpoint helper to exercise the send() zero-to-or-amount guard in EcoTreasuryVault.
    // Explicit if/else ensures both branch-arms are attributed and testable.

    // Explicit tester for EcoTreasury-like checks inside StablecoinRegistry context
    // (note: does not perform token transfers). Returns bitmask of condition outcomes.

    // Extra explicit helpers to catch send/deposit arms

    // Deterministic send-variant helper for EcoTreasuryVault (placed in EcoTreasuryVault)
}

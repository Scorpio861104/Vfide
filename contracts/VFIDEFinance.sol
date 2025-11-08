// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

/**
 * VFIDEFinance.sol
 * Consolidated finance layer:
 *  - EcoTreasuryVault: holds VFIDE + approved stablecoins, DAO-controlled.
 *  - SanctumFund: approved-charity disbursements with ledger transparency.
 *  - StablecoinRegistry: whitelist of stable assets usable by VFIDE modules.
 *
 * Principles:
 *  - DAO is the sole privileged authority (post-handover).
 *  - Only approved charities can receive Sanctum funds.
 *  - ProofLedger logging is best-effort (never reverts core flow).
 *  - Stablecoin flows are limited to whitelisted assets.
 */

/// ─────────────────────────── Minimal interfaces
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

/// ─────────────────────────── Errors
error FI_NotDAO();
error FI_Zero();
error FI_NotAllowed();
error FI_NotCharity();
error FI_AlreadyCharity();
error FI_NotWhitelisted();
error FI_AlreadyWhitelisted();
error FI_BadSplit();
error FI_Insufficient();

/// ─────────────────────────── Stablecoin Registry
contract StablecoinRegistry {
    event DAOSet(address dao);
    event LedgerSet(address ledger);
    event AssetAdded(address indexed token, uint8 decimals, string symbolHint);
    event AssetRemoved(address indexed token);
    event SymbolUpdated(address indexed token, string symbolHint);

    struct Asset {
        bool    ok;
        uint8   decimals;
        string  symbolHint; // optional metadata
    }

    address public dao;
    IProofLedger_FI public ledger; // optional

    mapping(address => Asset) public assets;

    modifier onlyDAO() { if (msg.sender != dao) revert FI_NotDAO(); _; }

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
        (bool ok, bytes memory d) = token.staticcall(abi.encodeWithSignature("decimals()"));
        if (ok && d.length >= 32) { return abi.decode(d, (uint8)); }
        // safe default to 18 if token doesn’t implement decimals()
        return 18;
    }

    function _log(string memory action) internal {
        if (address(ledger)!=address(0)) { try ledger.logSystemEvent(address(this), action, msg.sender) {} catch {} }
    }
    function _logEv(address who, string memory action, uint256 amount, string memory note) internal {
        if (address(ledger)!=address(0)) { try ledger.logEvent(who, action, amount, note) {} catch {} }
    }
}

/// ─────────────────────────── Eco Treasury Vault
contract EcoTreasuryVault {
    event ModulesSet(address dao, address ledger, address stableRegistry);
    event ReceivedVFIDE(uint256 amount, address from);
    event ReceivedStable(address indexed token, uint256 amount, address from);
    event Sent(address indexed token, address to, uint256 amount, string reason);

    address public dao;
    IProofLedger_FI public ledger; // optional
    StablecoinRegistry public stable; // whitelist for ERC20

    // VFIDE token address (optional for accounting; transfers come from routers or other modules)
    address public vfideToken;

    modifier onlyDAO() { if (msg.sender != dao) revert FI_NotDAO(); _; }

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

    // Receive VFIDE directly (e.g., burn router sends treasury share here).
    function noteVFIDE(uint256 amount, address from) external {
        // purely a log helper; token transfer must already be executed by caller
        emit ReceivedVFIDE(amount, from);
        _logEv(from, "treasury_vfide_in", amount, "");
    }

    // Pull approved stable from caller into treasury (requires allowance).
    function depositStable(address token, uint256 amount) external {
    if (!stable.isWhitelisted(token)) revert FI_NotWhitelisted();
        if (amount == 0) revert FI_Zero();
        if (!IERC20_FI(token).transferFrom(msg.sender, address(this), amount)) revert FI_Insufficient();
        emit ReceivedStable(token, amount, msg.sender);
        _logEv(msg.sender, "treasury_stable_in", amount, "");
    }

    // DAO-controlled send (to Sanctum/operations/escrow reimbursements, etc.)
    function send(address token, address to, uint256 amount, string calldata reason) external onlyDAO {
        if (to == address(0) || amount == 0) revert FI_Zero();
        if (token == address(0)) {
            // forbidden: we do not hold native ETH by design here
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
}

/// ─────────────────────────── Sanctum Fund (approved charities only)
contract SanctumFund {
    event ModulesSet(address dao, address ledger, address treasury, address hub);
    event PolicySet(uint16 charitySplitBps, uint16 maxSplitBps);
    event CharityAdded(address indexed charity, bytes32 metaHash);
    event CharityRemoved(address indexed charity);
    event Disbursed(address indexed charity, address token, uint256 amount, string reason);

    address public dao;
    IProofLedger_FI public ledger; // optional
    EcoTreasuryVault public treasury;
    IVaultHub_FI public vaultHub; // to optionally verify charity has a vault

    // charity whitelist
    mapping(address => bool) public isCharity;
    mapping(address => bytes32) public charityMeta; // optional metadata pointer

    // Split policy for routing modules that want to split inflow between burn & sanctum.
    // This contract doesn’t compute splits; it ensures sanctum side is sent only to approved charities.
    uint16 public charitySplitBps = 250; // 2.50% default
    uint16 public maxSplitBps = 4000;   // 40.00% hard ceiling

    modifier onlyDAO() { if (msg.sender != dao) revert FI_NotDAO(); _; }

    constructor(address _dao, address _ledger, address _treasury, address _hub) {
        if (_dao == address(0) || _treasury == address(0)) revert FI_Zero();
        dao=_dao; ledger=IProofLedger_FI(_ledger); treasury=EcoTreasuryVault(_treasury); vaultHub=IVaultHub_FI(_hub);
        emit ModulesSet(_dao, _ledger, _treasury, _hub);
    }

    function setModules(address _dao, address _ledger, address _treasury, address _hub) external onlyDAO {
        if (_dao==address(0) || _treasury==address(0)) revert FI_Zero();
        dao=_dao; ledger=IProofLedger_FI(_ledger); treasury=EcoTreasuryVault(_treasury); vaultHub=IVaultHub_FI(_hub);
        emit ModulesSet(_dao, _ledger, _treasury, _hub); _log("sanctum_modules_set");
    }

    function setPolicy(uint16 _charitySplitBps, uint16 _maxSplitBps) external onlyDAO {
        if (_maxSplitBps > 4000) revert FI_BadSplit();
        charitySplitBps = _charitySplitBps;
        maxSplitBps = _maxSplitBps;
        emit PolicySet(_charitySplitBps, _maxSplitBps);
        _log("sanctum_policy_set");
    }

    function addCharity(address charity, bytes32 metaHash) external onlyDAO {
        if (charity == address(0)) revert FI_Zero();
        if (isCharity[charity]) revert FI_AlreadyCharity();
        // Optional: require a vault (transparency & traceability)
        // if (vaultHub.vaultOf(charity) == address(0)) revert FI_NotAllowed();
        isCharity[charity] = true;
        charityMeta[charity] = metaHash;
        emit CharityAdded(charity, metaHash);
        _logEv(charity, "charity_add", 0, "");
    }

    function removeCharity(address charity) external onlyDAO {
        if (!isCharity[charity]) revert FI_NotCharity();
        delete isCharity[charity];
        delete charityMeta[charity];
        emit CharityRemoved(charity);
        _logEv(charity, "charity_remove", 0, "");
    }

    /// DAO disburses from Treasury to an approved charity (VFIDE or whitelisted stable).
    function disburse(address token, address charity, uint256 amount, string calldata reason) external onlyDAO {
        if (!isCharity[charity]) revert FI_NotCharity();
        if (amount == 0) revert FI_Zero();
        // pull from Treasury to charity
        treasury.send(token, charity, amount, reason);
        emit Disbursed(charity, token, amount, reason);
        _logEv(charity, "sanctum_disburse", amount, reason);
    }

    function _log(string memory action) internal {
        if (address(ledger)!=address(0)) { try ledger.logSystemEvent(address(this), action, msg.sender) {} catch {} }
    }
    function _logEv(address who, string memory action, uint256 amount, string memory note) internal {
        if (address(ledger)!=address(0)) { try ledger.logEvent(who, action, amount, note) {} catch {} }
    }
}
// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import "./SharedInterfaces.sol";

error TL_NotAdmin();
error TL_AlreadyQueued();
error TL_NotQueued();
error TL_TooEarly();

contract DAOTimelock {
    event AdminSet(address admin);
    event DelaySet(uint64 delay);
    event LedgerSet(address ledger);
    event PanicGuardSet(address panicGuard);
    event Queued(bytes32 id, address target, uint256 value, bytes data, uint64 eta);
    event Cancelled(bytes32 id);
    event Executed(bytes32 id);
    event GracePeriodExpired(bytes32 id);

    address public admin;
    uint64  public delay = 48 hours;
    uint64  public constant EXPIRY_WINDOW = 7 days; // H-15: Transactions expire 7 days after ETA
    IProofLedger public ledger;      // optional
    IPanicGuard  public panicGuard;  // optional

    struct Op { address target; uint256 value; bytes data; uint64 eta; bool done; }
    mapping(bytes32 => Op) public queue;
    uint256 public nonce; // Nonce to ensure unique transaction IDs

    modifier onlyAdmin() {
        _checkAdmin();
        _;
    }

    function _checkAdmin() internal view {
        if (msg.sender != admin) revert TL_NotAdmin();
    }

    constructor(address _admin){ require(_admin!=address(0),"admin=0"); admin=_admin; emit AdminSet(_admin); }

    // AUDIT: Minimum delay to prevent timelock bypass
    uint64 public constant MIN_DELAY = 12 hours;
    uint64 public constant MAX_DELAY = 30 days;
    
    function setAdmin(address _admin) external onlyAdmin { require(_admin!=address(0),"admin=0"); admin=_admin; emit AdminSet(_admin); _log("tl_admin_set"); }
    function setDelay(uint64 _delay) external onlyAdmin { 
        // C-1 FIX: Enforce minimum and maximum delay to prevent timelock bypass
        require(_delay >= MIN_DELAY, "TL: delay below minimum");
        require(_delay <= MAX_DELAY, "TL: delay above maximum");
        delay=_delay; 
        emit DelaySet(_delay); 
        _log("tl_delay_set"); 
    }
    function setLedger(address _ledger) external onlyAdmin { ledger=IProofLedger(_ledger); emit LedgerSet(_ledger); _log("tl_ledger_set"); }
    function setPanicGuard(address _pg) external onlyAdmin { panicGuard=IPanicGuard(_pg); emit PanicGuardSet(_pg); _log("tl_panicguard_set"); }

    function queueTx(address target,uint256 value,bytes calldata data) external onlyAdmin returns(bytes32 id){
        uint64 eta=uint64(block.timestamp)+delay;
        uint256 currentNonce = nonce++;
        id=keccak256(abi.encode(target,value,data,eta,currentNonce));
        if(queue[id].eta!=0) revert TL_AlreadyQueued();
        queue[id]=Op({target: target, value: value, data: data, eta: eta, done: false});
        emit Queued(id,target,value,data,eta); _log("tl_queued");
    }

    function cancel(bytes32 id) external onlyAdmin { if(queue[id].eta==0) revert TL_NotQueued(); delete queue[id]; _removeFromQueuedIds(id); emit Cancelled(id); _log("tl_cancelled"); }

    function execute(bytes32 id) external payable returns(bytes memory res){
        // H-23: Only admin (DAO) can execute to prevent front-running
        require(msg.sender == admin, "TL: only admin can execute");
        
        Op storage op=queue[id];
        if(op.eta==0) revert TL_NotQueued();
        if(op.done)   revert TL_TooEarly();
        
        // H-15: Check transaction hasn't expired
        require(block.timestamp <= op.eta + EXPIRY_WINDOW, "TL: transaction expired");

        if(address(panicGuard)!=address(0) && panicGuard.globalRisk()){
            require(block.timestamp>=op.eta+6 hours,"risk delay");
        } else {
            require(block.timestamp>=op.eta,"too early");
        }

        op.done=true;
        (bool ok, bytes memory r) = op.target.call{value:op.value}(op.data);
        require(ok, "exec failed");
        
        // H-2 Fix: Check return value ONLY for known ERC20 calls that return bool
        // Only validate bool return for transfer/transferFrom/approve selectors
        if (r.length == 32 && op.data.length >= 4) {
            bytes4 selector;
            bytes memory data = op.data;
            assembly {
                selector := mload(add(data, 32))
            }
            // ERC20: transfer(address,uint256), transferFrom(address,address,uint256), approve(address,uint256)
            if (selector == bytes4(0xa9059cbb) ||  // transfer
                selector == bytes4(0x23b872dd) ||  // transferFrom  
                selector == bytes4(0x095ea7b3)) {  // approve
                bool returnValue = abi.decode(r, (bool));
                require(returnValue, "TL: ERC20 call returned false");
            }
        }
        
        emit Executed(id); _log("tl_executed");
        return r;
    }

    function _log(string memory action) internal {
        if(address(ledger)!=address(0)){ try ledger.logSystemEvent(address(this),action,msg.sender) {} catch {} }
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    //                         VIEW FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Get all queued transaction IDs
     * @dev Returns all IDs that are queued but not yet executed or expired
     */
    bytes32[] private queuedIds;

    /**
     * @notice 1-indexed position of each tracked ID in queuedIds (0 = not tracked).
     * @dev    Used for O(1) swap-and-pop removal.
     */
    mapping(bytes32 => uint256) private queuedIdIndex;

    /**
     * @notice Queue transaction with tracking
     * FLOW-5 FIX: Use nonce for unique ID (consistent with queueTx)
     */
    function queueTxWithTracking(address target, uint256 value, bytes calldata data) external onlyAdmin returns(bytes32 id) {
        uint64 eta = uint64(block.timestamp) + delay;
        uint256 currentNonce = nonce++; // FLOW-5 FIX: Use nonce for uniqueness
        id = keccak256(abi.encode(target, value, data, eta, currentNonce));
        if(queue[id].eta != 0) revert TL_AlreadyQueued();
        queue[id] = Op({target: target, value: value, data: data, eta: eta, done: false});
        queuedIds.push(id);
        queuedIdIndex[id] = queuedIds.length; // 1-indexed
        emit Queued(id, target, value, data, eta);
        _log("tl_queued");
    }
    
    /**
     * @notice Get all queued transactions
     */
    function getQueuedTransactions() external view returns (
        bytes32[] memory ids,
        address[] memory targets,
        uint256[] memory values,
        uint64[] memory etas,
        bool[] memory done,
        bool[] memory expired
    ) {
        uint256 len = queuedIds.length;
        ids = new bytes32[](len);
        targets = new address[](len);
        values = new uint256[](len);
        etas = new uint64[](len);
        done = new bool[](len);
        expired = new bool[](len);
        
        for (uint256 i = 0; i < len; i++) {
            bytes32 id = queuedIds[i];
            Op storage op = queue[id];
            ids[i] = id;
            targets[i] = op.target;
            values[i] = op.value;
            etas[i] = op.eta;
            done[i] = op.done;
            expired[i] = op.eta > 0 && block.timestamp > op.eta + EXPIRY_WINDOW;
        }
    }
    
    /**
     * @notice Preview ETA for a new transaction
     */
    function previewETA() external view returns (uint64) {
        return uint64(block.timestamp) + delay;
    }
    
    /**
     * @notice Get transaction status
     */
    function getTransactionStatus(bytes32 id) external view returns (
        bool queued,
        bool executed,
        bool expired,
        bool executable,
        uint64 eta,
        uint256 timeUntilExecutable,
        uint256 timeUntilExpiry
    ) {
        Op storage op = queue[id];
        queued = op.eta > 0;
        executed = op.done;
        
        if (queued && !executed) {
            expired = block.timestamp > op.eta + EXPIRY_WINDOW;
            eta = op.eta;
            
            bool riskDelay = address(panicGuard) != address(0) && panicGuard.globalRisk();
            uint64 executableTime = riskDelay ? op.eta + 6 hours : op.eta;
            
            executable = block.timestamp >= executableTime && !expired;
            timeUntilExecutable = block.timestamp >= executableTime ? 0 : executableTime - block.timestamp;
            timeUntilExpiry = expired ? 0 : (op.eta + EXPIRY_WINDOW) - block.timestamp;
        }
    }
    
    /**
     * @notice Clean up expired transaction (anyone can call to free storage)
     * @param id Transaction ID to clean up
     */
    function cleanupExpired(bytes32 id) external {
        Op storage op = queue[id];
        require(op.eta > 0, "TL: not queued");
        require(!op.done, "TL: already executed");
        require(block.timestamp > op.eta + EXPIRY_WINDOW, "TL: not expired");
        
        delete queue[id];
        _removeFromQueuedIds(id);
        emit Cancelled(id);
        _log("tl_cleanup_expired");
    }
    
    /**
     * @notice Re-queue an expired transaction with new ETA
     * @param oldId The expired transaction ID
     * FLOW-4 FIX: Use nonce in new ID to prevent hash collisions
     */
    function requeueExpired(bytes32 oldId) external onlyAdmin returns (bytes32 newId) {
        Op storage op = queue[oldId];
        require(op.eta > 0, "TL: not queued");
        require(!op.done, "TL: already executed");
        require(block.timestamp > op.eta + EXPIRY_WINDOW, "TL: not expired");
        
        // Get old data
        address target = op.target;
        uint256 value = op.value;
        bytes memory data = op.data;
        
        // Delete old and remove from tracking array
        delete queue[oldId];
        _removeFromQueuedIds(oldId);
        
        // Create new with fresh ETA and unique nonce
        uint64 eta = uint64(block.timestamp) + delay;
        uint256 currentNonce = nonce++; // FLOW-4 FIX: Use nonce to ensure unique ID
        newId = keccak256(abi.encode(target, value, data, eta, currentNonce));
        require(queue[newId].eta == 0, "TL: already queued");
        
        queue[newId] = Op({target: target, value: value, data: data, eta: eta, done: false});
        queuedIds.push(newId);
        queuedIdIndex[newId] = queuedIds.length; // 1-indexed
        
        emit Cancelled(oldId);
        emit Queued(newId, target, value, data, eta);
        _log("tl_requeued");
    }

    /**
     * @notice Remove an ID from the queuedIds tracking array in O(1) using swap-and-pop.
     * @dev    Uses queuedIdIndex to locate the element directly.
     *         Safe to call with IDs not in the array (no-op).
     */
    function _removeFromQueuedIds(bytes32 id) internal {
        uint256 idx = queuedIdIndex[id];
        if (idx == 0) return; // not tracked — safe no-op

        uint256 arrayIdx = idx - 1;            // convert 1-indexed → 0-indexed
        uint256 lastIdx  = queuedIds.length - 1;

        if (arrayIdx != lastIdx) {
            // Move the last element into the vacated slot and update its index
            bytes32 lastId = queuedIds[lastIdx];
            queuedIds[arrayIdx] = lastId;
            queuedIdIndex[lastId] = idx;       // keep 1-indexed
        }

        queuedIds.pop();
        delete queuedIdIndex[id];
    }
}
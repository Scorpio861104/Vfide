// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

interface IProofLedger_GOV { function logSystemEvent(address who, string calldata action, address by) external; }
interface IPanicGuard_GOV  { function globalRisk() external view returns (bool); }

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

    address public admin;
    uint64  public delay = 48 hours;
    IProofLedger_GOV public ledger;      // optional
    IPanicGuard_GOV  public panicGuard;  // optional

    struct Op { address target; uint256 value; bytes data; uint64 eta; bool done; }
    mapping(bytes32 => Op) public queue;

    modifier onlyAdmin(){ if(msg.sender!=admin) revert TL_NotAdmin(); _; }

    constructor(address _admin){ require(_admin!=address(0),"admin=0"); admin=_admin; emit AdminSet(_admin); }

    function setAdmin(address _admin) external onlyAdmin { require(_admin!=address(0),"admin=0"); admin=_admin; emit AdminSet(_admin); _log("tl_admin_set"); }
    function setDelay(uint64 _delay) external onlyAdmin { delay=_delay; emit DelaySet(_delay); _log("tl_delay_set"); }
    function setLedger(address _ledger) external onlyAdmin { ledger=IProofLedger_GOV(_ledger); emit LedgerSet(_ledger); _log("tl_ledger_set"); }
    function setPanicGuard(address _pg) external onlyAdmin { panicGuard=IPanicGuard_GOV(_pg); emit PanicGuardSet(_pg); _log("tl_panicguard_set"); }

    function queueTx(address target,uint256 value,bytes calldata data) external onlyAdmin returns(bytes32 id){
        uint64 eta=uint64(block.timestamp)+delay;
        id=keccak256(abi.encode(target,value,data,eta));
        if(queue[id].eta!=0) revert TL_AlreadyQueued();
        queue[id]=Op(target,value,data,eta,false);
        emit Queued(id,target,value,data,eta); _log("tl_queued");
    }

    function cancel(bytes32 id) external onlyAdmin { if(queue[id].eta==0) revert TL_NotQueued(); delete queue[id]; emit Cancelled(id); _log("tl_cancelled"); }

    function execute(bytes32 id) external payable returns(bytes memory res){
        Op storage op=queue[id];
        if(op.eta==0) revert TL_NotQueued();
        if(op.done)   revert TL_TooEarly();

        if(address(panicGuard)!=address(0) && panicGuard.globalRisk()){
            require(block.timestamp>=op.eta+6 hours,"risk delay");
        } else {
            require(block.timestamp>=op.eta,"too early");
        }

        op.done=true;
        (bool ok,bytes memory r)=op.target.call{value:op.value}(op.data);
        require(ok,"exec failed");
        emit Executed(id); _log("tl_executed");
        return r;
    }

    function _log(string memory action) internal {
        if(address(ledger)!=address(0)){ try ledger.logSystemEvent(address(this),action,msg.sender) {} catch {} }
    }
}
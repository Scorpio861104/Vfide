// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

interface IDAO {
    enum ProposalType { Generic, Financial, ProtocolChange, SecurityAction }
    function admin() external view returns (address);
    function setAdmin(address _admin) external;
    function setParams(uint64 _period, uint16 _quorumPct) external;
    function propose(ProposalType ptype, address target, uint256 value, bytes calldata data, string calldata description) external returns (uint256 id);
    function vote(uint256 id, bool support) external;
    function finalize(uint256 id) external;
    function markExecuted(uint256 id) external;
}
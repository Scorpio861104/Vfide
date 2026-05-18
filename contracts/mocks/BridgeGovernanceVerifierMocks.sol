// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {MessagingFee, MessagingParams, MessagingReceipt, Origin} from "@layerzerolabs/lz-evm-protocol-v2/contracts/interfaces/ILayerZeroEndpointV2.sol";

interface ILayerZeroReceiverForBridgeMock {
    function lzReceive(
        Origin calldata _origin,
        bytes32 _guid,
        bytes calldata _message,
        address _executor,
        bytes calldata _extraData
    ) external payable;
}

contract MockLzEndpointForBridge {
    address public delegate;
    uint64 public nextNonce = 1;

    struct PendingMessage {
        Origin origin;
        address receiver;
        bytes32 guid;
        bytes message;
    }

    PendingMessage[] private pendingMessages;
    mapping(address => uint32) public endpointIds;

    function setDelegate(address _delegate) external {
        delegate = _delegate;
    }

    function setEndpointId(address oapp, uint32 eid) external {
        endpointIds[oapp] = eid;
    }

    function quote(MessagingParams calldata, address) external pure returns (MessagingFee memory) {
        return MessagingFee(0, 0);
    }

    function send(
        MessagingParams calldata _params,
        address
    ) external payable returns (MessagingReceipt memory receipt) {
        uint64 nonce = nextNonce++;
        bytes32 guid = keccak256(abi.encode(msg.sender, _params.dstEid, nonce, _params.message));
        address receiver = address(uint160(uint256(_params.receiver)));

        pendingMessages.push(
            PendingMessage({
                origin: Origin(endpointIds[msg.sender], bytes32(uint256(uint160(msg.sender))), nonce),
                receiver: receiver,
                guid: guid,
                message: _params.message
            })
        );

        return MessagingReceipt(guid, nonce, MessagingFee(msg.value, 0));
    }

    function pendingCount() external view returns (uint256) {
        return pendingMessages.length;
    }

    function deliverNext() external {
        require(pendingMessages.length > 0, "MockLzEndpointForBridge: no pending message");

        PendingMessage memory message = pendingMessages[0];
        uint256 remaining = pendingMessages.length - 1;
        for (uint256 i = 0; i < remaining; i++) {
            pendingMessages[i] = pendingMessages[i + 1];
        }
        pendingMessages.pop();

        ILayerZeroReceiverForBridgeMock(message.receiver).lzReceive(
            message.origin,
            message.guid,
            message.message,
            address(this),
            bytes("")
        );
    }
}

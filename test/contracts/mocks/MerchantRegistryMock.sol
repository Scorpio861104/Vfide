// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

contract MerchantRegistryMock {
    enum Status { NONE, ACTIVE, SUSPENDED, DELISTED }
    struct Merchant {
        address owner;
        address vault;
        Status status;
        uint32 refunds;
        uint32 disputes;
        bytes32 metaHash;
    }

    Merchant public m;

    constructor(address owner_, address vault_, uint8 status_) {
        m.owner = owner_;
        m.vault = vault_;
        m.status = Status(status_);
        m.refunds = 0;
        m.disputes = 0;
        m.metaHash = bytes32(0);
    }

    function setMerchant(address owner_, address vault_, uint8 status_) external {
        m.owner = owner_;
        m.vault = vault_;
        m.status = Status(status_);
    }

    // Return the Merchant struct as expected by CommerceEscrow.info()
    function info(address) external view returns (Merchant memory) {
        return m;
    }
}

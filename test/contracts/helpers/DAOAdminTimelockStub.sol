// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

interface IDAOAdminTarget {
    function setAdmin(address _admin) external;
    function cancelPendingAdmin() external;
}

contract DAOAdminTimelockStub {
    function callSetAdmin(address dao, address nextAdmin) external {
        IDAOAdminTarget(dao).setAdmin(nextAdmin);
    }

    function callCancelPendingAdmin(address dao) external {
        IDAOAdminTarget(dao).cancelPendingAdmin();
    }
}

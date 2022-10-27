// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.17;

import "hardhat/console.sol";

contract User {

    /** TODO: setup admin user state variable */

    event AdminAdded(address indexed account);
    event AdminRemoved(address indexed account);

    modifier onlyAdmin() {
        require(isAdmin(msg.sender), 'Only admins can execute this function');
        _;
    }

    function isAdmin(address account) public view returns(bool) {
        //TODO: implement is admin check
        return false;
    }

    function addAdmin(address account) public onlyAdmin {
        _addAdmin(account);
    }

    function renounceAdmin(address account) public {
        _removeAdmin(account);
    }

    function _addAdmin(address account) internal {
        //TODO: implement add admin
        emit AdminAdded(account);
    }

    function _removeAdmin(address account) internal {
        //TODO: implement renounce admin
        emit AdminRemoved(account);
    }

}
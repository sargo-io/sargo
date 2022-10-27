// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.17;

import "hardhat/console.sol";
 import './Admin.sol';

/**
 * @title Pausable
 * @dev Pausable contract allows child 
 * contracts to implement a halt mechanism.
 */

 /**TODO: implement pauser/admin role (only role allowed to execute) */
contract Pausable is Admin {

    bool internal _paused;

    event Paused(address account);
    event UnPaused(address account);

    /**
     *@dev Modifier to make a function callable 
     * only when the contract is not paused
     */
    modifier whenNotPaused() {
        require(!_paused, "Must not be paused");
        _;
    }

    /**
     * @dev Modifier to make a function callable only
     * when the contract is paused
     */
    modifier whenPaused() {
        require(_paused, "Must be paused");
        _;
    }

    /**
     * Trigger paused state - called by owner
     */
    function pause() public whenNotPaused {
        console.log('Attempting to pause contract %s', msg.sender);
        _paused = true;
        emit Paused(msg.sender);
    }

    /**
     * @dev Trigger unpaused state - called by owner
     */
    function unPause() public whenPaused {
        console.log('Attempting to unpause contract %s', msg.sender);
        _paused = false;
        emit UnPaused(msg.sender);
    }

    /**
     * @dev Returns the paused status of the contract
     * @return bool
     */
    function isPaused() public view returns(bool) {
        return _paused;
    }

}
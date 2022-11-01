// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.17;

import "hardhat/console.sol";
 import './Identity.sol';

/**
 * @title Pausable
 * @dev Pausable contract allows child 
 * contracts to implement a pause mechanism.
 */
contract Pausable is Identity {

    bool internal _paused;

    event Paused(address indexed account);
    event UnPaused(address indexed account);

    /**
     *@dev Modifier to make a functions callable 
     * only when the contract is active
     */
    modifier whenActive() {
        require(!_paused, "Must not be paused");
        _;
    }

    /**
     * @dev Modifier to make a functions callable only
     * when the contract is paused
     */
    modifier whenPaused() {
        require(_paused, "Must be paused");
        _;
    }

    /**
     * Trigger paused state
     */
    function pause() public whenActive {
        console.log('Attempting to pause contract %s', msg.sender);
        _paused = true;
        emit Paused(msg.sender);
    }

    /**
     * @dev Trigger unpaused state
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
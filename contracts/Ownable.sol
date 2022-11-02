// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.17;

import "hardhat/console.sol";

/** 
 * @title Ownable smart contract 
 */
contract Ownable {

    address private owner;

    event OwnerIsSet(
        address indexed oldOwner, address indexed newOwner);

    /**
     * @dev check if caller is owner
     */
    modifier onlyOwner() {
        require(msg.sender == owner, "Caller must be owner");
        _;
    }

    /**
     * @dev Initialize Ownable contract
     */
    constructor() {
        console.log("Contract deployed by:", msg.sender);
        owner = msg.sender;
        emit OwnerIsSet(address(0), owner);
    }

    /**
     * @dev Set new owner address
     * @param newOwner address of new owner
     */
    function setOwner(address newOwner) external onlyOwner {
        emit OwnerIsSet(owner, newOwner);
        console.log('Changing owner address from %s to %s', owner, newOwner);
        owner = newOwner;
    }

    /**
     * @dev Get owner address 
     * @return address of owner
     */
    function getOwner() external view returns (address) {
        return owner;
    }

    /**
     *@dev check if caller is owner
     */
    function isOwner() external view returns (bool) {
        return msg.sender == owner;
    }

}

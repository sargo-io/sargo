// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.17;

import "hardhat/console.sol";

/** 
 * @title Ownable smart contract 
 */
contract Ownable {

    address private owner;

    /**
     * Minting functions
     */
    bool public mintingComplete = false;

    address public creator;
    address public destroyer;

    event OwnerIsSet(
        address indexed oldOwner, address indexed newOwner);

    event MintingComplete();

    /**
     * @dev check if caller is owner
     */
    modifier onlyOwner() {
        require(msg.sender == owner, "Caller must be owner");
        _;
    }

    modifier canMint() {
        require(!mintingComplete);
        _;
    }

    modifier whenMintingComplete() {
        require(mintingComplete);
        _;
    }

    modifier onlyCreator() {
        require(msg.sender == creator);
        _;
    }

    modifier onlyDestroyer() {
        require(msg.sender == destroyer);
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
    function setOwner(address newOwner) public onlyOwner {
        emit OwnerIsSet(owner, newOwner);
        console.log('Changing owner address from %s to %s', owner, newOwner);
        owner = newOwner;
    }

    /**
     * @dev Get owner address 
     * @return address of owner
     */
    function getOwner() public view returns (address) {
        return owner;
    }

    /**
     * @dev check if caller is owner
     * @return bool
     */
    function isOwner() public view returns (bool) {
        return msg.sender == owner;
    }

    function setCreator(address _creator) external onlyOwner {
        require(_creator != address(0), "Cannot use zero address");
        creator = _creator;
    }

    function setDestroyer(address _destroyer) external onlyOwner {
        require(_destroyer != address(0), "Cannot use zero address");
        destroyer = _destroyer;
    }

    function completeMinting() external onlyCreator returns (bool) {
        mintingComplete = true;
        emit MintingComplete();

        return true;
    }
 
}

// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.17;

 import "hardhat/console.sol";

/** 
 * @title Token smart contract 
 */
contract Token {
    string public name = 'Sargo Token';
    string public symbol = 'SGT';
    uint256 public totalSupply = 1000000;  // * 10 ** 18
    address public owner;
    mapping(address => uint) balances;

    constructor() {
        balances[msg.sender] = totalSupply;
        owner = msg.sender;
    }

    event Transfer(address from, address to, uint amount);

    function transfer(address to, uint amount) external {
        console.log('Sender balance is %s tokens', balances[msg.sender]);
        console.log('Trying to send %s tokens to %s', amount, to);
        require(balances[msg.sender] >= amount, 'Not enough tokens');
        console.log("Transferring from %s to %s %s tokens", msg.sender, to, amount);
        balances[msg.sender] -= amount;
        balances[to] += amount;
        console.log('Transfer complete');
        emit Transfer(msg.sender, to, amount);
    }

    function balanceOf(address account) external view returns(uint) {
        return balances[account];
    }

}



/*
 * mint new tokens??
 * burn tokens??
 */
// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.17;

 import "hardhat/console.sol";

 import "@openzeppelin/contracts/token/ERC20/presets/ERC20PresetMinterPauser.sol";

/** 
 * @title Sargo token contract
 * @dev Sargo ERC20 token contract 
 */
contract SargoToken is ERC20PresetMinterPauser {
   constructor(string memory name, string memory symbol) ERC20PresetMinterPauser(name, symbol) {}

}
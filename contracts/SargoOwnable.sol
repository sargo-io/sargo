// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.17;

 import "hardhat/console.sol";
 import "@openzeppelin/contracts/access/Ownable.sol";
 import './SargoAccessControl.sol';

/**
 * @title SargoOwnable
 */
contract SargoOwnable is Ownable {}
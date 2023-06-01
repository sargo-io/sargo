// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

//contract SargoOwnable is Ownable, AccessControl, Pausable {
contract SargoOwnable is Ownable, Pausable, ReentrancyGuard {
    constructor() {
        //grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        //console.log("Contract deployed by:", msg.sender);
    }
}

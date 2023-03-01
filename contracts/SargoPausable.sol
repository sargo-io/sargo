// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.17;

 import "@openzeppelin/contracts/security/Pausable.sol";
 import './SargoAccessControl.sol';

/**
 * @title SargoPausable
 */
contract SargoPausable is Pausable, SargoAccessControl {}
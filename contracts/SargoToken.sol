// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/token/ERC20/presets/ERC20PresetMinterPauser.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title SargoToken
 * @dev Sargo ERC20 contract
 */
contract SargoToken is Ownable, ERC20PresetMinterPauser {
    constructor(
        string memory name,
        string memory symbol
    ) ERC20PresetMinterPauser(name, symbol) {
        grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    //bytes32 public constant BURNER_ROLE = keccak256("BURNER_ROLE"); Other roles can be assigned dinamically by the account having DEFAULT_ADMIN_ROLE role, by calling AccessControl.grantRole().
}

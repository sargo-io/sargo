// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.17;

import "@openzeppelin/contracts-upgradeable/token/ERC20/presets/ERC20PresetMinterPauserUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

/**
 * @title SargoToken
 * @dev Sargo ERC20 contract
 */
contract SargoToken is
    Initializable,
    ERC20PresetMinterPauserUpgradeable,
    UUPSUpgradeable,
    OwnableUpgradeable
{
    function initialize(
        string memory name,
        string memory symbol
    ) public override initializer {
        __ERC20PresetMinterPauser_init(name, symbol);
        __Ownable_init();
        __UUPSUpgradeable_init();

        grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        grantRole(MINTER_ROLE, msg.sender);
        grantRole(PAUSER_ROLE, msg.sender);
    }

    function _authorizeUpgrade(
        address newImplementation
    ) internal override onlyOwner {}
}

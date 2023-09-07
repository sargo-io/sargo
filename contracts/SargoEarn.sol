// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.17;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

/**
 * @title SargoEarn
 * @dev Maintain address earnings
 */
contract SargoEarn is Initializable, UUPSUpgradeable, OwnableUpgradeable {
    struct Earning {
        uint256 totalEarned;
        uint256 timestamp;
    }

    mapping(address => Earning) private earnings;

    function initialize() public initializer {
        __Ownable_init();
        __UUPSUpgradeable_init();
    }

    function _authorizeUpgrade(
        address newImplementation
    ) internal override onlyOwner {}

    // event Earned(
    //     address indexed _address,
    //     uint256 indexed timestamp,
    //     Earning txn
    // );

    /**
     * @dev Transfer value to respective addresses
     * @notice The account that fulfills the request earns a commision
     **/
    // function _earn(
    //     address _address,
    //     uint256 _amount
    // ) private whenNotPaused onlyOwner {
    //     address _earnAccount;

    //     Earning storage _earning = earnings[_earnAccount];
    //     _earning.totalEarned += _amount;
    //     _earning.timestamp = block.timestamp;

    //     emit Earned(_address, _earning.timestamp, _earning);
    // }

    /**
     * @notice Get accoummulated earnings for the provided address
     */
    // function getEarnings(
    //     address _address
    // ) public view returns (Earning memory) {
    //     return earnings[_address];
    // }
}

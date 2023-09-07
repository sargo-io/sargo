// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.17;

import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "./SargoOwnable.sol";
import "./SargoBase.sol";

/**
 * @title SargoEarn
 * @dev Maintain address earnings
 */
contract SargoEarn is SargoOwnable {
    address public escrowContractAddress;

    struct Earning {
        uint256 totalEarned;
        uint256 timestamp;
    }

    mapping(address => Earning) private earnings;

    function initialize(address _escrowContractAddress) public initializer {
        require(
            _escrowContractAddress != address(0),
            "Escrow contract address required"
        );

        escrowContractAddress = _escrowContractAddress;
    }

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

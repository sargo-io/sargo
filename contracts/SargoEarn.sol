// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.17;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "./SargoBase.sol";

/**
 * @title SargoEarn
 * @dev Maintain address earnings summary
 */
contract SargoEarn is
    SargoBase,
    Initializable,
    UUPSUpgradeable,
    OwnableUpgradeable
{
    address public sargoEscrowAddress;
    mapping(address => Earning) private earnings;

    function initialize(address _sargoEscrowAddress) public initializer {
        __Ownable_init();
        __UUPSUpgradeable_init();
        require(_sargoEscrowAddress != address(0), "Sargo Escrow address");
        sargoEscrowAddress = _sargoEscrowAddress;
    }

    function _authorizeUpgrade(
        address newImplementation
    ) internal override onlyOwner {}

    event Earned(
        address indexed _address,
        uint256 indexed timestamp,
        Earning earned
    );

    /**
     * @dev Log amount earned to the passed address
     * @notice The account that fulfills an order earns a commision
     **/
    function earn(address _address, uint256 _amount) public {
        require(msg.sender == sargoEscrowAddress, "Sargo Escrow address");
        require(_address != address(0), "Earn address");
        require(_amount > 0, "Earned amount");

        Earning storage _earning = earnings[_address];
        _earning.totalEarned += _amount;
        _earning.timestamp = block.timestamp;

        emit Earned(_address, _earning.timestamp, _earning);
    }

    /**
     * @dev Returns earnings logged for the provided address
     **/
    function getEarnings(
        address _address
    ) public view returns (Earning memory) {
        return earnings[_address];
    }
}

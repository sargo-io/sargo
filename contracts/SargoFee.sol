// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.17;

import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "./SargoOwnable.sol";
import "./SargoBase.sol";

/**
 * @title SargoFee
 * @dev Maintain Sargo fee structure
 */
contract SargoFee is SargoOwnable, SargoBase {
    address public escrowContractAddress;

    struct Fee {
        uint256 totalEarned;
        uint256 timestamp;
    }

    mapping(address => Fee) private fees;

    function initialize(address _escrowContractAddress) public initializer {
        require(
            _escrowContractAddress != address(0),
            "Escrow contract address required"
        );

        escrowContractAddress = _escrowContractAddress;
    }

    event Earned(address indexed _address, uint256 indexed timestamp, Fee txn);

    /**
     * @dev Transfer value to respective addresses
     * @notice The account that fulfills the request earns a commision
     **/
    function _earn(
        address _address,
        uint256 _amount
    ) private whenNotPaused onlyOwner {
        address _earnAccount;

        Fee storage _fee = fees[_earnAccount];
        _fee.totalEarned += _amount;
        _fee.timestamp = block.timestamp;

        emit Earned(_address, _fee.timestamp, _fee);
    }

    /**
     * @notice Get accoummulated fees for the provided address
     */
    function getFees(address _address) public view returns (Fee memory) {
        return fees[_address];
    }
}

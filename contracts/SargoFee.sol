// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.17;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

/**
 * @title SargoFee
 * @dev Maintain Sargo fee values
 */
contract SargoFee is Initializable, UUPSUpgradeable, OwnableUpgradeable {
    uint256 public ordersFeePerc;
    uint256 public transferFeePerc;
    uint256 public ordersFee;
    uint256 public agentFee;
    uint256 public treasuryFee;
    uint256 public transferFee;

    function initialize(
        uint256 _ordersFeePerc,
        uint256 _transferFeePerc
    ) public initializer {
        __Ownable_init();
        __UUPSUpgradeable_init();
        setFees(_ordersFeePerc, _transferFeePerc);
    }

    function _authorizeUpgrade(
        address newImplementation
    ) internal override onlyOwner {}

    event FeesSet(
        uint256 ordersFeePerc,
        uint256 transferFeePerc,
        uint256 agentFee,
        uint256 treasuryFee,
        uint256 transferFee
    );

    /**
     * @dev Set transaction fees value
     * @notice The fees earned from a transaction
     * @param _ordersFeePerc Total fee charged for fullfiling an order in percentage
     * @param _transferFeePerc Total fee charged for token transfer in percentage
     **/
    function setFees(
        uint256 _ordersFeePerc,
        uint256 _transferFeePerc
    ) public onlyOwner {
        require(_ordersFeePerc > 0, "Order fee");
        require(_transferFeePerc > 0, "Transfer fee");

        ordersFeePerc = _ordersFeePerc;
        transferFeePerc = _transferFeePerc;

        agentFee = (ordersFeePerc * 50) / 100;
        treasuryFee = (ordersFeePerc * 50) / 100;
        transferFee = (_transferFeePerc / 100);

        require(
            agentFee + treasuryFee == _ordersFeePerc,
            "Orders fees mismatch"
        );
        require(transferFee > 0, "Transfer fees mismatch");

        emit FeesSet(
            ordersFeePerc,
            transferFeePerc,
            agentFee,
            treasuryFee,
            transferFee
        );
    }
}

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
    uint256 public transactionFee;
    uint256 public agentFee;
    uint256 public treasuryFee;

    function initialize(uint256 _transactionFee) public initializer {
        __Ownable_init();
        __UUPSUpgradeable_init();
        setFees(_transactionFee);
    }

    function _authorizeUpgrade(
        address newImplementation
    ) internal override onlyOwner {}

    event FeesSet(
        uint256 transactionFee,
        uint256 agentFee,
        uint256 treasuryFee
    );

    /**
     * @dev Set transaction fees value
     * @notice The fees earned from a transaction
     * @param _transactionFee Total fee charged for a transaction in percentage
     **/
    function setFees(uint256 _transactionFee) public onlyOwner {
        require(_transactionFee > 0, "Transaction fee");

        transactionFee = _transactionFee;
        agentFee = (transactionFee * 50) / 100;
        treasuryFee = (transactionFee * 50) / 100;
        require(agentFee + treasuryFee == transactionFee, "Fees mismatch");

        emit FeesSet(transactionFee, agentFee, treasuryFee);
    }
}

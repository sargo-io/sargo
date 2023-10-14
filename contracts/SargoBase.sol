// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/utils/Strings.sol";

contract SargoBase {
    enum TransactionType {
        DEPOSIT,
        WITHDRAW,
        TRANSFER
    }

    enum Status {
        REQUEST,
        PAIRED,
        DISPUTED,
        COMPLETED,
        CANCELLED,
        CLAIMED
    }

    struct Transaction {
        uint256 id;
        string refNumber;
        TransactionType txType;
        Status status;
        string currencyCode;
        uint256 conversionRate;
        uint256 totalAmount;
        uint256 netAmount;
        uint256 agentFee;
        uint256 treasuryFee;
        address clientAccount;
        address agentAccount;
        CounterParty account;
        string paymentMethod;
        uint256 timestamp;
        bool clientApproved;
        bool agentApproved;
        string clientKey;
        string agentKey;
        uint256 requestIndex;
        uint256 pairedIndex;
    }

    struct CounterParty {
        string clientPhoneNumber;
        string clientName;
        string agentPhoneNumber;
        string agentName;
    }

    struct Earning {
        uint256 totalEarned;
        uint256 timestamp;
    }

    /** @dev Generates a unique refNumber
     * @notice Unique reference number assigned to new transaction
     */
    function setRefNumber(uint256 _txnId) public view returns (string memory) {
        return
            string.concat(
                Strings.toString((1 * 10 ** 19) + block.timestamp + _txnId)
            );
    }
}

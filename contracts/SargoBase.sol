// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/utils/Strings.sol";

contract SargoBase {
    // enum TransactionType {
    //     DEPOSIT,
    //     WITHDRAW,
    //     TRANSFER
    // }
    // enum Status {
    //     REQUEST,
    //     PAIRED,
    //     DISPUTED,
    //     COMPLETED,
    //     CANCELLED,
    //     CLAIMED
    // }
    // struct Transaction {
    //     uint256 id;
    //     string refNumber;
    //     TransactionType txType;
    //     Status status;
    //     string currencyCode;
    //     uint256 conversionRate;
    //     uint256 totalAmount;
    //     uint256 netAmount;
    //     Fee fee;
    //     Counterparty account;
    //     string paymentMethod;
    //     uint256 timestamp;
    // }
    // struct Fee {
    //     uint256 agentFee;
    //     uint256 treasuryFee;
    // }
    // struct Counterparty {
    //     address clientAccount;
    //     string clientPhoneNumber;
    //     string clientName;
    //     bool clientApproved;
    //     address agentAccount;
    //     string agentPhoneNumber;
    //     string agentName;
    //     bool agentApproved;
    // }
    // /** @dev Generates a unique refNumber
    //  * @notice Unique reference number assigned to new transaction
    //  */
    // function setRefNumber(uint256 _txnId) public view returns (string memory) {
    //     return
    //         string.concat(
    //             Strings.toString((1 * 10 ** 19) + block.timestamp + _txnId)
    //         );
    // }
}

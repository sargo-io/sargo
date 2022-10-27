// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.17;

 import "hardhat/console.sol";
 import './Ownable.sol';
 import './Pausable.sol';

/** 
 * @title Sargo smart contract 
 */
contract Sargo is Ownable, Pausable {

    address payable private sender;
    address payable private recipient;

    /**
     * @dev Initialize Sargo contract
     */
    constructor() {}

    /**
     * Set sender address
     * @param _sender Sender address
     */
     function setSender(address payable _sender) public onlyOwner {
        sender = payable(_sender);
     }

     /**
     * Get sender address
     * @return address of sender
     */
     function getSender() external view returns (address) {
        return sender;
     }

     /**
     * Set recipient address
     * @param _recipient Recipient address
     */
     function setRecipient(address payable _recipient) public onlyOwner {
        recipient = payable(_recipient);
     }

     /**
     * Get recipient address
     * @return address of recipient
     */
     function getRecipient() external view returns (address) {
        return recipient;
     }


/*####################################################*/
    /* 
        ++status enums
        ++transaction structs
        ++interfaces
        ++global variables
        ++constructor
        ++modifiers
        ++events
        ++functions for - topup, withdraw, send, receive
    */

    /** topup - user make topup request*/
    /** topup - agent accept topup request*/
    /** topup - request amount sent to escrow*/
    /** topup - notify user agent accepted request and sends phone number to user*/
    /** topup - user confirms that they have sent the payment by mpesa*/
    /** topup - after agent receive mpesa payment, the confirm receipt*/
    /** topup - escrow sends topup cUSD amount to user account*/
    /** topup - escrow sends agent commission to agent account*/
    /** topup - escrow sends sargo commision to treasury account*/
    /** topup - user and agent are notified that the transaction has been completed*/


    /** withdrawal - user makes withdrawal request*/
    /** withdrawal - agent accepts withdrawal request*/
    /** withdrawal - withdrawal amount is sent to escrow*/
    /** withdrawal - notify user agent accepted request and requests phone number from user*/
    /** withdrawal - agent sends mpesa to user and confirms via the dapp*/
    /** withdrawal - after user receives mpesa payment, the confirm receipt*/
    /** withdrawal - escrow sends topup cUSD amount to agent account*/
    /** withdrawal - escrow sends agent commission to agent account*/
    /** withdrawal - escrow sends sargo commision to treasury account*/
    /** withdrawal - user and agent are notified that the transaction has been completed*/

    /** send/receive - transfer from msg.sender to a recipient account*/

    /** get balance */
    /** get account */
    /** get requests (topup/withdrawal) */
    /** cancel topup request */
    /** cancel withdrawal request */
    /** get transactions */
    /** amount to wei/cUSD/ether... conversions */



}


/*
    ++Tests
    ++Deployment local/testnet
    ++configs - envars
    ++validation
    ++error handling 
    ++logging
 */


 /**
    Ownable - contract
    Escrow - contract
    Token - contract
    Common - contract

    Common -> Token -> Ownable -> Sargo

    Sargo inherits Ownable
    Ownerble inherits Token
    Token inherits Common




 */

/*####################################################*/
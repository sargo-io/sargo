// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.17;

 import "hardhat/console.sol";
 import './Ownable.sol';
 import './Pausable.sol';

/** 
 * @title Sargo smart contract 
 */
contract Sargo is Ownable, Pausable {

    address payable private _sender;
    address payable private _recipient;

    enum transType {
      TOPUP,
      WITHDRAW,
      TRANSFER
    }

   //Topup status enums
    enum topupStatus {
      TOPUP_REQUEST,
      TOPUP_REQUEST_ACCEPTED,
      TOPUP_USER_NOTIFY,
      TOPUP_USER_CONFIRM,
      TOPUP_AGENT_CONFIRM,
      TOPUP_COMPLETED
    }

   //Withdraw status enums
    enum withdrawStatus {
      WITHDRAW_REQUEST,
      WITHDRAW_REQUEST_ACCEPTED,
      WITHDRAW_AGENT_NOTIFY,
      WITHDRAW_AGENT_CONFIRM,
      WITHDRAW_USER_CONFIRM,
      WITHDRAW_COMPLETED
    }

   //transaction structs
   struct Transaction {
      uint256 id;
      uint256 txHash;
      bytes32 txType;
      bytes32 status;
      bytes32 pnhoneNumber;
      uint256 totalAmount;
      uint256 netAmount;
      uint256 gas;
      uint256 commission;
      uint256 treasury;
      uint256 timestamp;
   }

    /**
     * @dev Initialize Sargo contract
     */
    constructor() {
      //_sender = payable(getOwner());
    }

   /**
   * Get sender address
   * @return address of sender
   */
   function getSender() external view returns (address) {
      return _sender;
   }

   /**
   * Set recipient address
   * @param recipient Recipient address
   */
   function setRecipient(address payable recipient) external onlyOwner {
      _recipient = payable(recipient);
      console.lo('Recipient set to %s ', _recipient);
   }

   /**
   * Get recipient address
   * @return address of recipient
   */
   function getRecipient() external view returns (address) {
      return _recipient;
   }

   /**
    * @dev Get acount balance
    * @param account The account to get balance
    * @return uint256
    */
   function getBalance(address account) external view returns (uint256) {
      /** TODO: get balance */
      console.log('Getting balance for account %s ', account);
      /** TODO: emit balance returned */
   }

   /**
    * @dev Get requests
    * @param requestType Transaction type
    * @return bool
    */
   function getRequests(transType requestType) external view returns (bool) {
      /** TODO: get requests (topup/withdrawal) */
      console.log('Querying request of type %s ', requestType);
      /** TODO: emit requests returned */
   }
   
   /**
    * @dev Cancel a topup or withdraw request
    * @param txHash The transaction hash
    * @return bool
    */
   function cancelRequest(bytes32 txHash) external view returns (bool) {
      /** TODO: validate status before cancel */
      /** TODO: cancel topup request */
      /** TODO: cancel withdrawal request */
      console.log('Cancelling request for transaction %s ', txHash);
      /** TODO: emit cancel transaction */
   }
   
   /**
    * @dev Get transactions
    * @param txType Transaction type
    */
   function getTransactions(transType txType) external view returns (bool) {
      /** TODO: get transactions */
      console.log('Geting transaction of type %s ', txType);
      /** TODO: emit returned transactions */
   }

   /**
    * @dev transfer value to passed recipient
    * @param recipient The recipient address
    * @return bool
    */
   function transfer(address payable recipient) external onlyOwner whenActive {
      /** TODO: validate transaction details */
      /** TODO: send/receive - transfer from msg.sender to a recipient account*/

      setRecipient(recipient);

      console.log('Transfering form sender address %s to recipient address %s ', getOwner(), recipient);
      /** TODO: emit transfer completed */
   }

   







   /*####################################################*/

    /* 
        ++interfaces
        ++global variables
        ++constructor
        ++modifiers
        ++events
        ++functions for - topup, withdraw, send, receive
    */

    /** TODO: topup - user make topup request*/
    /** TODO: topup - agent accept topup request*/
    /** TODO: topup - request amount sent to escrow*/
    /** TODO: topup - notify user agent accepted request and sends phone number to user*/
    /** TODO: topup - user confirms that they have sent the payment by mpesa*/
    /** TODO: topup - after agent receive mpesa payment, the confirm receipt*/
    /** TODO: topup - escrow sends topup cUSD amount to user account*/
    /** TODO: topup - escrow sends agent commission to agent account*/
    /** TODO: topup - escrow sends sargo commision to treasury account*/
    /** TODO: topup - user and agent are notified that the transaction has been completed*/


    /** TODO: withdrawal - user makes withdrawal request*/
    /** TODO: withdrawal - agent accepts withdrawal request*/
    /** TODO: withdrawal - withdrawal amount is sent to escrow*/
    /** TODO: withdrawal - notify user agent accepted request and requests phone number from user*/
    /** TODO: withdrawal - agent sends mpesa to user and confirms via the dapp*/
    /** TODO: withdrawal - after user receives mpesa payment, the confirm receipt*/
    /** TODO: withdrawal - escrow sends topup cUSD amount to agent account*/
    /** TODO: withdrawal - escrow sends agent commission to agent account*/
    /** TODO: withdrawal - escrow sends sargo commision to treasury account*/
    /** TODO: withdrawal - user and agent are notified that the transaction has been completed*/

    //Helpers
    /** TODO: amount to wei/cUSD/ether... conversions */
    /** TODO: set transaction struct  */

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
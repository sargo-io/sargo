// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.17;

 import "hardhat/console.sol";
 import './Ownable.sol';
 import './Pausable.sol';

/** 
 * @title Sargo
 * @dev Sargo contract - topup, withdrawal 
 * and value transfer 
 */
contract Sargo is Ownable, Pausable {

    address payable private _sender;

    enum txType {
      DEPOSIT,
      WITHDRAW,
      TRANSFER
    }

    enum topup {
      REQUEST,
      REQUEST_ACCEPTED,
      USER_NOTIFY,
      USER_CONFIRM,
      AGENT_CONFIRM,
      COMPLETED
    }

    enum withdraw {
      REQUEST,
      REQUEST_ACCEPTED,
      AGENT_NOTIFY,
      AGENT_CONFIRM,
      USER_CONFIRM,
      COMPLETED
    }

   struct Transaction {
      uint256 id;
      uint256 txHash;
      bytes32 txType;
      bytes32 status;
      address account;
      bytes32 pnhoneNumber;
      bytes32 tokenSymbol;
      bytes32 currencyCode;
      uint256 totalAmount;
      uint256 netAmount;
      uint256 gas;
      uint256 commission;
      uint256 treasury;
      uint256 timestamp;
   }

   mapping(address => uint256) public txn;

   constructor() {
      _sender = payable(getOwner());
   }

   // TODO: add events
   event BalanceReturned(address account);
   event RequestsReturned(string queryStatus);
   event RequestCancelled(string indexed txHash);
   event RequestTransactions(string queryStatus);
   event TransferCompleted(address indexed sender, address indexed recipient, uint256 amount);
   //
   event TopupRequestCompleted(address indexed account, uint256 amount);
   event TopupRequestAccepted(string indexed txHash);
   event TopupFiatSentConfirmation(string indexed txHash);
   event TopupFiatReceivedConfirmation(string indexed txHash);
   //
   event WithdrawRequestCompleted(address indexed account, uint256 amount);
   event WithdrawRequestAccepted(string indexed txHash);
   event WithdrawFiatSentConfirmation(string indexed txHash);
   event WithdrawFiatReceivedConfirmation(string indexed txHash);

   // TODO: add modifiers

   function setTransaction(Transaction calldata _transaction) public {}

   /**
    * @dev Get acount balance
    * @param account The account to get balance
    * @return uint256
    */
   function getBalance(address account) public returns (uint256) {
      /** TODO: get balance */
      console.log('Getting balance for account %s ', account);
      emit BalanceReturned(account);

      return 0;
   }

   /**
    * @dev Get sent requests
    * @return bool
    */
   function getRequests() public returns (bool) {
      /** TODO: get requests (topup/withdrawal) */
      console.log('Querying requests');
      emit RequestsReturned('Requests returned');

      return false;
   }
   
   /**
    * @dev Cancel a topup or withdraw request
    * @param txHash The transaction hash
    * @return bool
    */
   function cancelRequest(string calldata txHash) public returns (bool) {
      /** TODO: validate status before cancel */
      /** TODO: cancel topup request */
      /** TODO: cancel withdrawal request */
      console.log('Cancelling request for transaction %s ', txHash);
      emit RequestCancelled(txHash);
      
      return false;
   }
   
   /**
    * @dev Get transactions
    */
   function getTransactions() public returns (bool) {
      /** TODO: get transactions */
      console.log('Geting transactions');
      emit RequestTransactions('Transactions returned');

      return false;
   }

   /**
    * @dev transfer value to passed recipient address
    * @param recipient The recipient address
    */
   function transfer(address payable recipient, uint256 amount) public onlyOwner whenActive {
      /** TODO: validate transaction details */
      /** TODO: send/receive - transfer from msg.sender to a recipient account*/

      //setup struct properties

      console.log('Transfering form sender address %s to recipient address %s ', _sender, recipient);
      emit TransferCompleted(_sender, recipient, amount);
   }

   /**
    * @dev Make a topup request
    * @param amount The topup amount
    */
   function topupRequest(uint256 amount) external onlyOwner {
      /** TODO: topup - user make topup request*/
      emit TopupRequestCompleted(_sender, amount);
   }

   /**
    * @dev Accept topup request
    * @param txHash The transaction hash
    */
   function acceptTopupRequest(string calldata txHash) external onlyOwner {
      /** TODO: topup - agent accept topup request*/
      /** TODO: topup - request amount sent to escrow*/
      /** TODO: topup - notify user agent accepted request and sends phone number to user*/
      emit TopupRequestAccepted(txHash);
   }

   /**
    * @dev Fiat sent confirmation
    * @param txHash The transaction hash
    */
    function topupFiatSent(string calldata txHash) external onlyOwner {
      /** TODO: topup - user confirms that they have sent the payment by mpesa*/
      emit TopupFiatSentConfirmation(txHash);
    }
   
   /**
    * @dev fiat received confirmation
    * @param txHash The transaction hash
    */
    function topupFiatReceived(string calldata txHash) external onlyOwner {
      /** TODO: topup - after agent receive mpesa payment, the confirm receipt*/
      /** TODO: topup - escrow sends topup cUSD amount to user account*/
      /** TODO: topup - escrow sends agent commission to agent account*/
      /** TODO: topup - escrow sends sargo commision to treasury account*/
      /** TODO: topup - user and agent are notified that the transaction has been completed*/
      emit TopupFiatReceivedConfirmation(txHash);
    }

    /**
     * @dev Make a withdraw request
     */
     function withdrawRequest(uint256 amount) external onlyOwner {
      /** TODO: withdrawal - user makes withdrawal request*/
      emit WithdrawRequestCompleted(_sender, amount);
     }

   /**
    * @dev Accept withdraw request
    * @param txHash The transaction hash
    */
   function acceptWithdrawRequest(string calldata txHash) external onlyOwner {
      /** TODO: withdrawal - agent accepts withdrawal request*/
      /** TODO: withdrawal - withdrawal amount is sent to escrow*/
      /** TODO: withdrawal - notify user agent accepted request and requests phone number from user*/
      emit WithdrawRequestAccepted(txHash);
   }

   /**
    * @dev Fiat sent confirmation
    * @param txHash The transaction hash
    */
   function withdrawFiatSent(string calldata txHash) external onlyOwner {
      /** TODO: withdrawal - agent sends mpesa to user and confirms via the dapp*/
      emit WithdrawFiatSentConfirmation(txHash);
   }

   /**
    * @dev fiat received confirmation
    * @param txHash The transaction hash
    */
   function withdrawFiatReceived(string calldata txHash) external onlyOwner {
      /** TODO: withdrawal - after user receives mpesa payment, the confirm receipt*/
      /** TODO: withdrawal - escrow sends topup cUSD amount to agent account*/
      /** TODO: withdrawal - escrow sends agent commission to agent account*/
      /** TODO: withdrawal - escrow sends sargo commision to treasury account*/
      /** TODO: withdrawal - user and agent are notified that the transaction has been completed*/
      emit WithdrawFiatReceivedConfirmation(txHash);
   }

    /* 
        ++interfaces
        ++global variables
        ++constructor
        
        ++functions for - topup, withdraw, send, receive
    */

    //Library functions candidates
    /** TODO: set transaction struct  */
    /** TODO: strToBytesHash */
    /** TODO: notifications */

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
    Escrow - contract
    Common - contract
 */
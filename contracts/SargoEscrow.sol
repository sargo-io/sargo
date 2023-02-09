// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.17;

 import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
 import "hardhat/console.sol";
 import './Ownable.sol';
 import './Pausable.sol';

/** 
 * @title Sargo
 * @dev Sargo escrow contract  
 */
contract SargoEscrow is Ownable, Pausable {

   /**
    * @dev Transaction index
    */
   uint256 private nextTransactionId = 0;

   /**
    * @dev Agent's fee
    */
   uint256 private agentFee = 50000000000000000;

   /**
    * @dev Sargo fee
    */
   uint256 private sargoFee = 40000000000000000;

   /**
    * @dev Transactions counter
    */
   uint256 private transactionsCounter = 0;

   /**
    * @dev Sargo address 
    */
    address internal cusdTokenAddress = 0x874069Fa1Eb16D44d622F2e0Ca25eeA172369bC1;

    /**
     * @dev Treasury address
     */
    address internal treasuryAddress = 0x43513B39D89d3313162e3399Db2f573c023B4d17;

   /**
    * @dev Transactions mappings
    */
    mapping(uint256 => Transaction) private transactions;

   /**
    * @dev Transaction types enum
    */
    enum TransactionType {
      DEPOSIT,
      WITHDRAW,
      TRANSFER
    }

   /** 
    * @dev Transaction status
    * REQUEST = 0 - Transaction started, awaiting agent pairing
    * PAIRED = 1 - Agent paired, awaiting for approval by agent and client
    * CONFIRMED = 2 - Transaction confirmed by agent and client
    * COMPLETED = 3 - Transaction completed, currency moved from escrow to recipient
    * CANCELLED = 4 - Transaction cancelled, 
    */
    enum Status {
      REQUEST,
      PAIRED,
      CONFIRMED,
      COMPLETED,
      CANCELLED
    }

   /**
    * @dev Transaction object
    */
   struct Transaction {
      uint256 id;
      TransactionType txType;
      address clientAccount;
      address agentAccount;
      Status status;
      string currencyCode;
      string conversionRate;
      uint256 totalAmount;
      uint256 netAmount;
      uint256 agentFee;
      uint256 treasuryFee;
      bool agentApproved;
      bool clientApproved;
      string clientPhoneNumber;
      string agentPhoneNumber;
   }

   /**
    * @dev Initialize contract
    * @param _cusdTokenAddress cUSD token address
    * @param _agentFee Agent fee
    * @param _sargoFee Sargo fee
    * @param _treasuryAddress Sargo treasury address
    */
  constructor(
    address _cusdTokenAddress, 
    uint256 _agentFee, 
    uint256 _sargoFee, 
    address _treasuryAddress) {
    if (_cusdTokenAddress != address(0)) 
        cusdTokenAddress = _cusdTokenAddress;

    if (_treasuryAddress != address(0)) 
        treasuryAddress = _treasuryAddress;

    if (_agentFee > 0) 
        agentFee = _agentFee;

    if (_sargoFee > 0) 
        sargoFee = _sargoFee;
  }

  event RequestAccepted(Transaction txn);
  event TransactionInitiated(uint txId, address txOwner);
  event ClientConfirmed(Transaction txn);
  event AgentConfirmed(Transaction txn);
  event ConfirmationCompleted(Transaction txn);
  event TransactionCompleted(Transaction txn);
  event Transfer(
    address indexed sender, 
    address indexed recipient, 
    uint256 amount);

   /**
    * @dev Get the cUSD address
    * @return address
    */
   function getCusdTokenAddress() public view returns(address) {
        return cusdTokenAddress;
   }

   /**
    * @dev Get the treasury address
    * @return address
    */
   function getTreasuryAddress() public view returns(address) {
        return treasuryAddress;
   }

   /**
    * @dev Get the agent's fee
    * @return uint256
    */
   function getAgentFee() public view returns(uint256) {
      return agentFee;
   }

   /**
    * @dev Get the Sargo fee
    * @return uint256
    */
   function getSargoFee() public view returns(uint256) {
        return sargoFee;
   }

   /**
    * @dev Get the next transaction index
    * @return uint256
    */
   function getNextTransactionIndex() public view returns(uint256) {
      return nextTransactionId;
   }

   /**
    * @dev Get the number of successful transactions
    * @return uint256
    */
   function getTransactionsCount() public view returns (uint256) {
      return  transactionsCounter;
   }

   /**
    * @dev Initialize a transaction
    * @param _txType Transaction type
    * @param _amount Transaction amount
    * @param _currencyCode Fiat currency code
    * @param _conversionRate Fiat conversion rate
    * @return Transaction
    */
   function initTxn(
      TransactionType _txType, 
      uint256 _amount,
      string memory _currencyCode,
      string memory _conversionRate) private returns (Transaction storage) {
      uint256 txId = nextTransactionId; 
      nextTransactionId++;

      uint256 totalAmount = _amount + (sargoFee + agentFee);
      Transaction storage _txn = transactions[txId];
      _txn.id = txId;
      _txn.txType = _txType;
      _txn.clientAccount = msg.sender;
      _txn.status = Status.REQUEST;
      _txn.currencyCode = _currencyCode;
      _txn.conversionRate = _conversionRate;
      _txn.totalAmount = totalAmount;
      _txn.netAmount = _amount;
      _txn.agentFee = agentFee;
      _txn.treasuryFee = sargoFee;
      _txn.agentApproved = false;
      _txn.clientApproved = false;

      return _txn;
   }

   /**
    * @dev Initiate a withdrawal transaction
    * @param _amount Transaction amount
    * @param _currencyCode The fiat currency code
    * @param _conversionRate The current fiat conversion rate
    **/
   function initiateWithdrawal(uint256 _amount,
   string calldata _currencyCode,
   string calldata _conversionRate) public amountGreaterThanZero(_amount) {
        Transaction storage txn = initTxn(TransactionType.WITHDRAW, _amount, _currencyCode, _conversionRate);
        
        emit TransactionInitiated(txn.id, msg.sender);
   }

   /**
    * @dev Initiate a deposit transaction
    * @param _amount Transaction amount
    * @param _currencyCode The fiat currency code
    * @param _conversionRate The current fiat conversion rate 
    **/
   function initiateDeposit(uint256 _amount,
   string calldata _currencyCode,
   string calldata _conversionRate) public amountGreaterThanZero(_amount) {
        Transaction storage txn = initTxn(TransactionType.DEPOSIT, _amount, _currencyCode, _conversionRate);
        
        emit TransactionInitiated(txn.id, msg.sender);
   }

   /**
     * @dev Agent accepts to fulfill the withdraw request
     * The transaction is paired to the agent 
     * @param _txnId The transaction id
     * @param _phoneNumber the agent's phone number
     */
    function acceptWithdrawal(uint256 _txnId, string calldata _phoneNumber) public 
      awaitAgent(_txnId) 
      withdrawalsOnly(_txnId) 
      nonClientOnly(_txnId) 
      sufficientBalance(_txnId) 
      payable {
         
        Transaction storage txn = transactions[_txnId];
        txn.agentAccount = msg.sender;
        txn.status = Status.PAIRED;
        txn.agentPhoneNumber = _phoneNumber;

        require(
        ERC20(cusdTokenAddress).transferFrom(
            msg.sender,
            address(this), 
            txn.totalAmount
        ),
        "You don't have enough amount to accept this request."
        );
        
        emit RequestAccepted(txn);
    }

   /**
     * @dev Agent accepts to fulfill the deposit request 
     * @param _txnId The transaction id
     * @param _phoneNumber the agent's phone number
     */
    function acceptDeposit(uint256 _txnId, string calldata _phoneNumber) public
      awaitAgent(_txnId) 
      depositsOnly(_txnId)
      nonClientOnly(_txnId)
      sufficientBalance(_txnId)
      payable {
        
        Transaction storage txn = transactions[_txnId];
        txn.agentAccount = msg.sender;
        txn.status = Status.PAIRED;
        txn.agentPhoneNumber = _phoneNumber;
        
        require(
          ERC20(cusdTokenAddress).transferFrom(
            msg.sender,
            address(this), 
            txn.totalAmount
          ),
          "You don't have enough amount to accept this request."
        );
        
        emit RequestAccepted(txn);
    }

    /**
     * @dev Client confirms payment sent to the agent
     * @param _txnId The transaction id
     */
    function clientConfirmPayment(uint256 _txnId) public
     awaitConfirmation(_txnId)
     clientOnly(_txnId) {
        
        Transaction storage txn = transactions[_txnId];
        
        require(!txn.clientApproved, "Client already confirmed payment");
        txn.clientApproved = true;
        
        emit ClientConfirmed(txn);
        
        if (txn.agentApproved) {
            txn.status = Status.CONFIRMED;
            emit ConfirmationCompleted(txn);
            completeTransaction(_txnId);
        }
    }

    /**
     * @dev Agent comnfirms payment has been received
     * @param _txnId The transaction id
     */
    function agentConfirmPayment(uint256 _txnId) public 
        awaitConfirmation(_txnId)
        agentOnly(_txnId) {
        
        Transaction storage txn = transactions[_txnId];
        
        require(!txn.agentApproved, "Agent already confirmed payment");
        txn.agentApproved = true;
        
        emit AgentConfirmed(txn);
        
        if (txn.clientApproved) {
            txn.status = Status.CONFIRMED;
            emit ConfirmationCompleted(txn);
            completeTransaction(_txnId);
        }
    }

    /**
     * @dev Complete the transaction
     * Transfer value to respective addresses
     * @param _txnId The transaction id
     **/ 
    function completeTransaction(uint256 _txnId) public {
        Transaction storage txn = transactions[_txnId];
        require(txn.clientAccount == msg.sender || txn.agentAccount == msg.sender,
            "Only involved accounts can complete the transaction");
        require(txn.status == Status.CONFIRMED, "Transaction not confirmed by both parties");
        
        if (txn.txType == TransactionType.DEPOSIT) {
            ERC20(cusdTokenAddress).transfer(
                txn.clientAccount,
                txn.netAmount);
        } else {
            require(ERC20(cusdTokenAddress).transfer(
               txn.agentAccount, 
               txn.netAmount),
              "Transaction failed.");
        }

        /* Agent's commission fee */
        require(ERC20(cusdTokenAddress).transfer(
                txn.agentAccount,
                txn.agentFee),
              "Agent fee transfer failed.");
        
        /* Treasury commission fee */
        require(ERC20(cusdTokenAddress).transfer(
                treasuryAddress,
                txn.treasuryFee),
              "Transaction fee transfer failed.");

        transactionsCounter++;

        txn.status = Status.COMPLETED;
        
        emit TransactionCompleted(txn);
    }

    /**
      * @dev Get transactions by index
      * @param _txnId the Transaction id
      * @return Transaction.
      */
    function getTransactionByIndex(uint256 _txnId) public view returns (Transaction memory) {
        Transaction memory txn = transactions[_txnId];
        return txn;
    }

    /**
      * Get the next transaction request from transactions list.
      * @param _txnId the transaction id
      * @return Transaction
      */
    function getNextUnpairedTransaction(uint256 _txnId) 
      public view returns (Transaction memory) {
      Transaction storage txn;
      uint256 transactionId = _txnId;
      
      /* limit transaction index */
      if (_txnId > nextTransactionId) {
         transactionId = nextTransactionId;
      }

      /* Traverse through transactions by index */
      for (int index = int(transactionId); index >= 0; index--) {
         txn = transactions[uint(index)];

         if (txn.clientAccount != address(0) && txn.agentAccount == address(0)) {
               return txn;
         }
      }

      txn = transactions[nextTransactionId];

      return txn;
    }


   /**
    * Amount greater than zero
    * @param _amount The amount
    */
    modifier amountGreaterThanZero(uint256 _amount) {
      require(_amount > 0, "Amount must be greater than zero");
      _;
    }
    
    /**
     * Only agent can execute
     * @param _txnId Transaction id
     */
    modifier agentOnly(uint256 _txnId) {
        Transaction storage txn = transactions[_txnId];
        require(msg.sender == txn.agentAccount, "Only agent can execute function");
        _;
    }
    
    /**
     * Deposit transactions only.
     */
    modifier depositsOnly(uint256 _txnId) {
         Transaction storage txn = transactions[_txnId];
        require(txn.txType == TransactionType.DEPOSIT, 
            "Deposit only");
        _;
    }
    
    /**
     * Withdrawal transactions only.
     * @param _txnId Transaction id.
     */
    modifier withdrawalsOnly(uint256 _txnId) {
        Transaction storage txn = transactions[_txnId];
        require(txn.txType == TransactionType.WITHDRAW,
        "Withdrawal only");
        _;
    }
    
    /**
     * Only client can execute
     * @param _txnId The transaction id
     */
    modifier clientOnly(uint256 _txnId) {
        Transaction storage txn = transactions[_txnId];
        require(msg.sender == txn.clientAccount, "Only client can execute function");
        _;
    }

    /**
     * Prevents the client from running the logic
     * @param _txnId The transaction id
     */
    modifier nonClientOnly(uint256 _txnId) {
        Transaction storage txn = transactions[_txnId];
        require(msg.sender != txn.clientAccount, "client can not execute function");
        _;
    }
    
    /**
     * Only paired transaction can execute.
     * @param _txnId The transaction id
     */
    modifier awaitConfirmation(uint256 _txnId) {
        Transaction storage txn = transactions[_txnId];
        require(txn.status == Status.PAIRED, "Transaction is not accepted by agent.");
        _;
    }
    
    /**
     * Prevents double pairing of agents to transactions.
     * @param _txnId The transaction id
     */
    modifier awaitAgent(uint256 _txnId) {
        Transaction storage txn = transactions[_txnId];
        require(txn.status == Status.REQUEST, "Already accepted by agent");
        _;
    }
    
    /**
     * Balance must be greater than total amount
     * @param _txnId The transaction id
     */
    modifier sufficientBalance(uint256 _txnId) {
        Transaction storage txn = transactions[_txnId];
        require(ERC20(cusdTokenAddress).balanceOf(address(msg.sender)) > txn.totalAmount,
            "Insufficient balance");
        _;
    }

   /**
    * @dev Send amount
    * @param _recipient Recipient address
    * @param _amount Amount to transfer
    * @param _currencyCode Fiat currency code
    * @param _conversionRate Fiat conversion rate
    */
   function send( 
      address _recipient, 
      uint256 _amount,
      string calldata _currencyCode,
      string calldata _conversionRate) public payable whenActive amountGreaterThanZero(_amount) {
      require(_recipient != getOwner());
      require(_recipient != address(0), "Cannot use zero address");
      require(ERC20(cusdTokenAddress).balanceOf(address(msg.sender)) > _amount,
            "Insufficient balance");

      Transaction storage txn = initTxn(
         TransactionType.TRANSFER, 
         _amount, _currencyCode, 
         _conversionRate
      );

      txn.agentAccount = msg.sender;
      txn.clientAccount = _recipient;

      require(
          ERC20(cusdTokenAddress).transferFrom(
            msg.sender,
            _recipient, 
            _amount
          ),
          "Insufficient balance"
        );

        txn.status = Status.COMPLETED;
        
      emit Transfer(msg.sender, _recipient, _amount);
   }
}

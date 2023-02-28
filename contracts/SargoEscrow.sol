// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.17;

 import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
 //import "hardhat/console.sol";
 import './SargoOwnable.sol';
 import './SargoPausable.sol';

/** 
 * @title Sargo
 * @dev Sargo escrow contract  
 */
contract SargoEscrow is SargoOwnable, SargoPausable {
  uint256 public nextTransactionId;
  uint256 public agentFee;
  uint256 public sargoFee;
  uint256 public completedTransactions;
  address internal cusdTokenAddress;
  address internal treasuryAddress;

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
    string refNumber;
    TransactionType txType;
    address clientAccount;
    address agentAccount;
    Status status;
    string currencyCode;
    string conversionRate;
    string tokenName;
    uint256 totalAmount;
    uint256 netAmount;
    uint256 agentFee;
    uint256 treasuryFee;
    bool agentApproved;
    bool clientApproved;
    string clientPhoneNumber;
    string agentPhoneNumber;
    string paymentMethod;
    uint256 timestamp;
  }

  struct Earning {
  uint256 totalEarned;
  uint256 timestamp;
  }

  mapping(uint256 => Transaction) public transactions;
  mapping(address => Earning) public earnings;

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
    require(_cusdTokenAddress != address(0), "Invalid token address");
    require(_treasuryAddress != address(0), "Invalid treasury address");
    require(_agentFee > 0, "Agent fee required");
    require(_sargoFee > 0, "Treasury fee required");

    cusdTokenAddress = _cusdTokenAddress;
    treasuryAddress = _treasuryAddress;
    agentFee = _agentFee;
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
      string memory _conversionRate, 
      string memory _paymentMethod) private returns (Transaction storage) {
      uint256 txId = nextTransactionId;
      uint256 totalAmount = _amount + (sargoFee + agentFee);
      Transaction storage _txn = transactions[txId];
      _txn.id = txId;
      //_txn.refNumber = 
      _txn.txType = _txType;
      _txn.clientAccount = msg.sender;
      _txn.status = Status.REQUEST;
      _txn.currencyCode = _currencyCode;
      _txn.conversionRate = _conversionRate;
      _txn.tokenName = 'cUSD';
      _txn.totalAmount = totalAmount;
      _txn.netAmount = _amount;
      _txn.agentFee = agentFee;
      _txn.treasuryFee = sargoFee;
      _txn.agentApproved = false;
      _txn.clientApproved = false;
      _txn.paymentMethod = _paymentMethod;
      //_txn.timestamp = 

      nextTransactionId++;

      return _txn;
   }

  /**
    * @dev Initiate a deposit transaction
    * @param _amount Transaction amount
    * @param _currencyCode The fiat currency code
    * @param _conversionRate The current fiat conversion rate 
    **/
   function initiateDeposit(uint256 _amount,
   string calldata _currencyCode,
   string calldata _conversionRate,  
   string memory _paymentMethod) public amountGreaterThanZero(_amount) whenNotPaused {

        Transaction storage _txn = initTxn(
          TransactionType.DEPOSIT, 
          _amount, 
          _currencyCode, 
          _conversionRate, 
          _paymentMethod
        );
        
        emit TransactionInitiated(_txn.id, msg.sender);
   }

   /**
    * @dev Initiate a withdrawal transaction
    * @param _amount Transaction amount
    * @param _currencyCode The fiat currency code
    * @param _conversionRate The current fiat conversion rate
    **/
   function initiateWithdrawal(uint256 _amount,
   string calldata _currencyCode,
   string calldata _conversionRate,  
   string memory _paymentMethod) public amountGreaterThanZero(_amount) whenNotPaused {

        Transaction storage _txn = initTxn(
          TransactionType.WITHDRAW, 
          _amount, 
          _currencyCode, 
          _conversionRate, 
          _paymentMethod
        );
        
        emit TransactionInitiated(_txn.id, msg.sender);
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
      whenNotPaused
      payable {
        
        Transaction storage _txn = transactions[_txnId];
        _txn.agentAccount = msg.sender;
        _txn.status = Status.PAIRED;
        _txn.agentPhoneNumber = _phoneNumber;
        
        require(
          ERC20(cusdTokenAddress).transferFrom(
            msg.sender,
            address(this), 
            _txn.totalAmount
          ),
          "You don't have enough amount to accept this request."
        );
        
        emit RequestAccepted(_txn);
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
      whenNotPaused
      payable {
         
        Transaction storage _txn = transactions[_txnId];
        _txn.agentAccount = msg.sender;
        _txn.status = Status.PAIRED;
        _txn.agentPhoneNumber = _phoneNumber;

        require(
        ERC20(cusdTokenAddress).transferFrom(
            msg.sender,
            address(this), 
            _txn.totalAmount
        ),
        "You don't have enough amount to accept this request."
        );
        
        emit RequestAccepted(_txn);
    }

    /**
     * @dev Client confirms payment sent to the agent
     * @param _txnId The transaction id
     */
    function clientConfirmPayment(uint256 _txnId) public
     awaitConfirmation(_txnId)
     clientOnly(_txnId) 
     whenNotPaused {
        
        Transaction storage _txn = transactions[_txnId];
        
        require(!_txn.clientApproved, "Client already confirmed payment");
        _txn.clientApproved = true;
        
        emit ClientConfirmed(_txn);
        
        if (_txn.agentApproved) {
            _txn.status = Status.CONFIRMED;
            emit ConfirmationCompleted(_txn);
            completeTransaction(_txnId);
        }
    }

    /**
     * @dev Agent comnfirms payment has been received
     * @param _txnId The transaction id
     */
    function agentConfirmPayment(uint256 _txnId) public 
        awaitConfirmation(_txnId)
        agentOnly(_txnId) 
        whenNotPaused {
        
        Transaction storage _txn = transactions[_txnId];
        
        require(!_txn.agentApproved, "Agent already confirmed payment");
        _txn.agentApproved = true;
        
        emit AgentConfirmed(_txn);
        
        if (_txn.clientApproved) {
            _txn.status = Status.CONFIRMED;
            emit ConfirmationCompleted(_txn);
            completeTransaction(_txnId);
        }
    }

    /**
     * @dev Complete the transaction
     * Transfer value to respective addresses
     * @param _txnId The transaction id
     **/ 
    function completeTransaction(uint256 _txnId) public whenNotPaused {
        Transaction storage _txn = transactions[_txnId];
        require(_txn.clientAccount == msg.sender || _txn.agentAccount == msg.sender,
            "Only involved accounts can complete the transaction");
        require(_txn.status == Status.CONFIRMED, "Transaction not confirmed by both parties");
        
        if (_txn.txType == TransactionType.DEPOSIT) {
            ERC20(cusdTokenAddress).transfer(
                _txn.clientAccount,
                _txn.netAmount);
        } else {
            require(ERC20(cusdTokenAddress).transfer(
               _txn.agentAccount, 
               _txn.netAmount),
              "Transaction failed.");
        }

        /* Agent's commission fee */
        require(ERC20(cusdTokenAddress).transfer(
                _txn.agentAccount,
                _txn.agentFee),
              "Agent fee transfer failed.");
        
        /* Treasury commission fee */
        require(ERC20(cusdTokenAddress).transfer(
                treasuryAddress,
                _txn.treasuryFee),
              "Transaction fee transfer failed.");


        /* Sum up agent fee earned */
        Earning storage _earning = earnings[_txn.agentAccount];
        _earning.totalEarned += _txn.agentFee;
        //_earning.timestamp = 

        completedTransactions++;
        _txn.status = Status.COMPLETED;
        
        emit TransactionCompleted(_txn);
    }

    /**
      * Get the next transaction request from transactions list.
      * @param _txnId the transaction id
      * @return Transaction
      */
    function getNextUnpairedTransaction(uint256 _txnId) 
      public view returns (Transaction memory) {
      Transaction storage _txn;
      uint256 transactionId = _txnId;
      
      /* limit transaction index */
      if (_txnId > nextTransactionId) {
         transactionId = nextTransactionId;
      }

      /* Traverse through transactions by index */
      for (int index = int(transactionId); index >= 0; index--) {
         _txn = transactions[uint(index)];

         if (_txn.clientAccount != address(0) && _txn.agentAccount == address(0)) {
               return _txn;
         }
      }

      _txn = transactions[nextTransactionId];

      return _txn;
    }






    //TODO: get transactions array list - or get by type






    /**
      * @dev Get transactions by Id
      * @param _txnId Transaction Id
      * @return Transaction.
      */
    function getTransactionByIndex(uint256 _txnId) public view returns (Transaction memory) {
        Transaction memory _txn = transactions[_txnId];
        return _txn;
    }

   /**
    * Amount must be greater than zero
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
        Transaction storage _txn = transactions[_txnId];
        require(msg.sender == _txn.agentAccount, "Only agent can execute function");
        _;
    }
    
    /**
     * Deposit transactions only.
     */
    modifier depositsOnly(uint256 _txnId) {
         Transaction storage _txn = transactions[_txnId];
        require(_txn.txType == TransactionType.DEPOSIT, 
            "Deposit only");
        _;
    }
    
    /**
     * Withdrawal transactions only.
     * @param _txnId Transaction Id.
     */
    modifier withdrawalsOnly(uint256 _txnId) {
        Transaction storage _txn = transactions[_txnId];
        require(_txn.txType == TransactionType.WITHDRAW,
        "Withdrawal only");
        _;
    }
    
    /**
     * Only allow client to execute
     * @param _txnId The transaction id
     */
    modifier clientOnly(uint256 _txnId) {
        Transaction storage _txn = transactions[_txnId];
        require(msg.sender == _txn.clientAccount, "Only client can execute function");
        _;
    }

    /**
     * Prevents execution if sender is client
     * @param _txnId The transaction id
     */
    modifier nonClientOnly(uint256 _txnId) {
        Transaction storage _txn = transactions[_txnId];
        require(msg.sender != _txn.clientAccount, "client can not execute function");
        _;
    }
    
    /**
     * Transaction must be paired to an agent.
     * @param _txnId The transaction id
     */
    modifier awaitConfirmation(uint256 _txnId) {
        Transaction storage _txn = transactions[_txnId];
        require(_txn.status == Status.PAIRED, "Transaction is not accepted by agent.");
        _;
    }
    
    /**
     * Transaction can only be paired once.
     * @param _txnId The transaction id
     */
    modifier awaitAgent(uint256 _txnId) {
        Transaction storage _txn = transactions[_txnId];
        require(_txn.status == Status.REQUEST, "Already accepted by agent");
        _;
    }
    
    /**
     * Balance must be greater than total amount
     * @param _txnId The transaction id
     */
    modifier sufficientBalance(uint256 _txnId) {
        Transaction storage _txn = transactions[_txnId];
        require(ERC20(cusdTokenAddress).balanceOf(address(msg.sender)) > _txn.totalAmount,
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
      string calldata _conversionRate, 
      string memory _paymentMethod) public payable whenNotPaused amountGreaterThanZero(_amount) {
      require(_recipient != owner());
      require(_recipient != address(0), "Cannot use zero address");
      require(ERC20(cusdTokenAddress).balanceOf(address(msg.sender)) > _amount,
            "Insufficient balance");

      Transaction storage _txn = initTxn(
         TransactionType.TRANSFER, 
         _amount, _currencyCode, 
         _conversionRate, 
         _paymentMethod
      );

      _txn.agentAccount = msg.sender;
      _txn.clientAccount = _recipient;

      require(
          ERC20(cusdTokenAddress).transferFrom(
            msg.sender,
            _recipient, 
            _amount
          ),
          "Insufficient balance"
        );

        _txn.status = Status.COMPLETED;
        
      emit Transfer(msg.sender, _recipient, _amount);
   }
}

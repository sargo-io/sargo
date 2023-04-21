// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./SargoOwnable.sol";

/**
 * @title SargoEscrow
 * @dev Buy, sell, transfer
 */
contract SargoEscrow is SargoOwnable {
    uint256 public nextTransactionId;
    uint256 public agentFee;
    uint256 public treasuryFee;
    uint256 public completedTransactions;
    address public tokenContractAddress;
    address public treasuryAddress;

    enum TransactionType {
        DEPOSIT,
        WITHDRAW,
        TRANSFER
    }

    enum Status {
        REQUEST,
        PAIRED,
        CONFIRMED,
        COMPLETED,
        CANCELLED
    }

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
        string clientName;
        string agentPhoneNumber;
        string agentName;
        string paymentMethod;
        uint256 timestamp;
    }

    struct Earning {
        uint256 totalEarned;
        uint256 timestamp;
    }

    mapping(uint256 => Transaction) private transactions;
    mapping(address => Earning) private earnings;

    event TransactionInitiated(Transaction txn);
    event RequestAccepted(Transaction txn);
    event ClientConfirmed(Transaction txn);
    event AgentConfirmed(Transaction txn);
    event TransactionConfirmed(Transaction txn);
    event TransactionCompleted(Transaction txn);
    event TransactionCancelled(Transaction txn, string reason);
    event Transfer(
        address indexed sender,
        address indexed recipient,
        uint256 amount
    );

    modifier amountGreaterThanZero(uint256 _amount) {
        require(_amount > 0, "Amount must be greater than zero");
        _;
    }

    modifier agentOnly(uint256 _txnId) {
        require(
            msg.sender == transactions[_txnId].agentAccount,
            "Only agent can execute function"
        );
        _;
    }

    modifier depositsOnly(uint256 _txnId) {
        require(
            transactions[_txnId].txType == TransactionType.DEPOSIT,
            "Deposit only"
        );
        _;
    }

    modifier withdrawalsOnly(uint256 _txnId) {
        require(
            transactions[_txnId].txType == TransactionType.WITHDRAW,
            "Withdrawal only"
        );
        _;
    }

    modifier clientOnly(uint256 _txnId) {
        require(
            msg.sender == transactions[_txnId].clientAccount,
            "Only client can execute function"
        );
        _;
    }

    modifier nonClientOnly(uint256 _txnId) {
        require(
            msg.sender != transactions[_txnId].clientAccount,
            "client can not execute function"
        );
        _;
    }

    modifier awaitConfirmation(uint256 _txnId) {
        require(
            transactions[_txnId].status == Status.PAIRED,
            "Transaction is not accepted by agent."
        );
        _;
    }

    modifier awaitAgent(uint256 _txnId) {
        require(
            transactions[_txnId].status == Status.REQUEST,
            "Already accepted by agent"
        );
        _;
    }

    modifier sufficientBalance(uint256 _txnId) {
        require(
            IERC20(tokenContractAddress).balanceOf(address(msg.sender)) >
                transactions[_txnId].totalAmount,
            "Insufficient balance"
        );
        _;
    }

    modifier onRequestOnly(uint256 _txnId) {
        require(
            transactions[_txnId].status == Status.REQUEST,
            "Transaction should be in the REQUEST status"
        );
        _;
    }

    constructor(
        address _tokenContractAddress,
        uint256 _agentFee,
        uint256 _treasuryFee,
        address _treasuryAddress
    ) {
        require(_tokenContractAddress != address(0), "Invalid token address");
        require(_treasuryAddress != address(0), "Invalid treasury address");
        require(_agentFee > 0, "Agent fee required");
        require(_treasuryFee > 0, "Treasury fee required");

        tokenContractAddress = _tokenContractAddress;
        treasuryAddress = _treasuryAddress;
        agentFee = _agentFee;
        treasuryFee = _treasuryFee;
    }

    /**
     * @dev Initialize a transaction
     * @notice _currencyCode is the fiat currency code, _conversionRate is current fiat conversion rate
     * @return Transaction
     */
    function _initTxn(
        TransactionType _txType,
        uint256 _amount,
        string memory _currencyCode,
        string memory _conversionRate,
        string memory _paymentMethod,
        string memory _name,
        string memory _phoneNumber
    ) private returns (Transaction storage) {
        uint256 txId = nextTransactionId;
        uint256 totalAmount = _amount + (treasuryFee + agentFee);
        Transaction storage _txn = transactions[txId];
        _txn.id = txId;
        //_txn.refNumber =
        _txn.txType = _txType;

        if (_txType == TransactionType.DEPOSIT) {
            _txn.clientAccount = msg.sender;
            _txn.clientName = _name;
            _txn.clientPhoneNumber = _phoneNumber;
        } else if (_txType == TransactionType.WITHDRAW) {
            _txn.agentAccount = msg.sender;
            _txn.agentName = _name;
            _txn.agentPhoneNumber = _phoneNumber;
        } else if (_txType == TransactionType.TRANSFER) {
            _txn.agentAccount = msg.sender;
            _txn.agentName = _name;
            _txn.agentPhoneNumber = _phoneNumber;
        } else {}

        _txn.status = Status.REQUEST;
        _txn.currencyCode = _currencyCode;
        _txn.conversionRate = _conversionRate;
        _txn.tokenName = "cUSD";
        _txn.totalAmount = totalAmount;
        _txn.netAmount = _amount;
        _txn.agentFee = agentFee;
        _txn.treasuryFee = treasuryFee;
        _txn.agentApproved = false;
        _txn.clientApproved = false;
        _txn.paymentMethod = _paymentMethod;
        _txn.timestamp = block.timestamp;

        nextTransactionId++;

        return _txn;
    }

    /**
     * @notice Transfer value to respective addresses
     **/
    function _completeTransaction(uint256 _txnId) private whenNotPaused {
        Transaction storage _txn = transactions[_txnId];
        require(
            _txn.clientAccount == msg.sender || _txn.agentAccount == msg.sender,
            "Only involved accounts can complete the transaction"
        );
        require(
            _txn.status == Status.CONFIRMED,
            "Transaction not confirmed by both parties"
        );

        if (_txn.txType == TransactionType.DEPOSIT) {
            IERC20(tokenContractAddress).transfer(
                _txn.clientAccount,
                _txn.netAmount
            );
        } else if (_txn.txType == TransactionType.WITHDRAW) {
            require(
                IERC20(tokenContractAddress).transfer(
                    _txn.agentAccount,
                    _txn.netAmount
                ),
                "Transaction failed."
            );
        } else {
            //TODO: assert(commision cannot be earned for other transaction types)
        }

        //TODO: Move transfer from send and transfer to centralize them here

        /* Agent's commission fee */
        require(
            IERC20(tokenContractAddress).transfer(
                _txn.agentAccount,
                _txn.agentFee
            ),
            "Agent fee transfer failed."
        );

        /* Treasury commission fee */
        require(
            IERC20(tokenContractAddress).transfer(
                treasuryAddress,
                _txn.treasuryFee
            ),
            "Transaction fee transfer failed."
        );

        /* Sum up agent fee earned */
        Earning storage _earning = earnings[_txn.agentAccount];
        _earning.totalEarned += _txn.agentFee;
        _earning.timestamp = _txn.timestamp;

        completedTransactions++;
        _txn.status = Status.COMPLETED;

        emit TransactionCompleted(_txn);
    }

    function initiateDeposit(
        uint256 _amount,
        string calldata _currencyCode,
        string calldata _conversionRate,
        string calldata _paymentMethod,
        string calldata _clientName,
        string calldata _clientPhoneNumber
    ) public amountGreaterThanZero(_amount) whenNotPaused nonReentrant {
        emit TransactionInitiated(
            _initTxn(
                TransactionType.DEPOSIT,
                _amount,
                _currencyCode,
                _conversionRate,
                _paymentMethod,
                _clientName,
                _clientPhoneNumber
            )
        );
    }

    function initiateWithdrawal(
        uint256 _amount,
        string calldata _currencyCode,
        string calldata _conversionRate,
        string calldata _paymentMethod,
        string calldata _agentName,
        string calldata _agentPhoneNumber
    ) public amountGreaterThanZero(_amount) whenNotPaused nonReentrant {
        emit TransactionInitiated(
            _initTxn(
                TransactionType.WITHDRAW,
                _amount,
                _currencyCode,
                _conversionRate,
                _paymentMethod,
                _agentName,
                _agentPhoneNumber
            )
        );
    }

    /**
     * @notice Agent accepts to fulfill a deposit request
     */
    function acceptDeposit(
        uint256 _txnId,
        string calldata _agentName,
        string calldata _agentPhoneNumber
    )
        public
        payable
        awaitAgent(_txnId)
        depositsOnly(_txnId)
        nonClientOnly(_txnId)
        sufficientBalance(_txnId)
        whenNotPaused
        nonReentrant
    {
        Transaction storage _txn = transactions[_txnId];
        _txn.agentAccount = msg.sender;
        _txn.status = Status.PAIRED;
        _txn.agentName = _agentName;
        _txn.agentPhoneNumber = _agentPhoneNumber;
        _txn.timestamp = block.timestamp;

        require(
            IERC20(tokenContractAddress).transferFrom(
                msg.sender,
                address(this),
                _txn.totalAmount
            ),
            "You don't have enough amount to accept this request."
        );

        emit RequestAccepted(_txn);
    }

    /**
     * @notice Client accepts to fulfill a withdraw request, transaction is paired to the agent
     */
    function acceptWithdrawal(
        uint256 _txnId,
        string calldata _clientName,
        string calldata _clientPhoneNumber
    )
        public
        payable
        awaitAgent(_txnId)
        withdrawalsOnly(_txnId)
        nonClientOnly(_txnId)
        sufficientBalance(_txnId)
        whenNotPaused
        nonReentrant
    {
        Transaction storage _txn = transactions[_txnId];
        _txn.clientAccount = msg.sender;
        _txn.status = Status.PAIRED;
        _txn.clientName = _clientName;
        _txn.clientPhoneNumber = _clientPhoneNumber;
        _txn.timestamp = block.timestamp;

        require(
            IERC20(tokenContractAddress).transferFrom(
                msg.sender,
                address(this),
                _txn.totalAmount
            ),
            "You don't have enough amount to accept this request."
        );

        emit RequestAccepted(_txn);
    }

    function clientConfirmPayment(
        uint256 _txnId
    )
        public
        awaitConfirmation(_txnId)
        clientOnly(_txnId)
        whenNotPaused
        nonReentrant
    {
        Transaction storage _txn = transactions[_txnId];

        require(!_txn.clientApproved, "Client already confirmed payment");
        _txn.clientApproved = true;
        _txn.timestamp = block.timestamp;

        emit ClientConfirmed(_txn);

        if (_txn.agentApproved) {
            _txn.status = Status.CONFIRMED;
            emit TransactionConfirmed(_txn);
            _completeTransaction(_txnId);
        }
    }

    function agentConfirmPayment(
        uint256 _txnId
    )
        public
        awaitConfirmation(_txnId)
        agentOnly(_txnId)
        whenNotPaused
        nonReentrant
    {
        Transaction storage _txn = transactions[_txnId];

        require(!_txn.agentApproved, "Agent already confirmed payment");
        _txn.agentApproved = true;
        _txn.timestamp = block.timestamp;

        emit AgentConfirmed(_txn);

        if (_txn.clientApproved) {
            _txn.status = Status.CONFIRMED;
            emit TransactionConfirmed(_txn);
            _completeTransaction(_txnId);
        }
    }

    function cancelTransaction(
        uint256 _txnId,
        string calldata _reason
    )
        public
        payable
        clientOnly(_txnId)
        onRequestOnly(_txnId)
        whenNotPaused
        nonReentrant
    {
        Transaction storage _txn = transactions[_txnId];
        _txn.status = Status.CANCELLED;
        _txn.timestamp = block.timestamp;

        emit TransactionCancelled(_txn, _reason);
    }

    //TODO: get all transaction at the request status

    /**
     * Get the next transaction request from transactions list.
     * @return Transaction
     */
    function getRequestById(
        uint256 _txnId
    ) public view returns (Transaction memory) {
        Transaction storage _txn;
        uint256 transactionId = _txnId > nextTransactionId
            ? nextTransactionId
            : _txnId;

        for (uint256 index = transactionId; index >= 0; index--) {
            _txn = transactions[index];
            if (
                _txn.clientAccount != address(0) &&
                _txn.agentAccount == address(0)
            ) {
                return _txn;
            }
        }

        _txn = transactions[nextTransactionId];

        return _txn;
    }

    /**
     * @dev Get all transactions
     * @return Transaction.
     */
    /* function getTransactions(
        uint256 _limit,
        uint256 _offset
    ) public view returns (Transaction[] memory) {
        Transaction[] memory _txnList = new Transaction[](_offset);

        for (uint256 index = _limit; index >= _offset; index--) {
            _txnList[index] = transactions[index];
        }

        return _txnList;
    } */

    /**
     * @dev Get transactions by Id
     * @return Transaction.
     */
    function getTransactionByIndex(
        uint256 _txnId
    ) public view returns (Transaction memory) {
        return transactions[_txnId];
    }

    /**
     * @dev Get earnings by address
     * @return Earning
     */
    function getEarnings(
        address _address
    ) public view returns (Earning memory) {
        return earnings[_address];
    }

    function send(
        address _recipient,
        uint256 _amount,
        string calldata _currencyCode,
        string calldata _conversionRate,
        string calldata _senderName,
        string calldata _senderPhoneNumber
    ) public payable whenNotPaused nonReentrant amountGreaterThanZero(_amount) {
        require(_recipient != owner());
        require(_recipient != address(0), "Cannot use zero address");
        require(
            IERC20(tokenContractAddress).balanceOf(address(msg.sender)) >
                _amount,
            "Insufficient balance"
        );

        Transaction storage _txn = _initTxn(
            TransactionType.TRANSFER,
            _amount,
            _currencyCode,
            _conversionRate,
            "TOKEN",
            _senderName,
            _senderPhoneNumber
        );

        _txn.clientAccount = _recipient;

        require(
            IERC20(tokenContractAddress).transferFrom(
                msg.sender,
                _recipient,
                _amount
            ),
            "Insufficient balance"
        );

        completedTransactions++;
        _txn.status = Status.COMPLETED;

        emit Transfer(msg.sender, _recipient, _amount);
    }

    function transfer(
        address _recipient,
        uint256 _amount,
        string calldata _currencyCode,
        string calldata _conversionRate,
        string calldata _senderName,
        string calldata _senderPhoneNumber
    )
        public
        payable
        onlyOwner
        whenNotPaused
        nonReentrant
        amountGreaterThanZero(_amount)
    {
        require(msg.sender == owner(), "Only owner can transfer from escrow");
        require(_recipient != owner());
        require(_recipient != address(0), "Cannot use zero address");
        require(_recipient != address(this));
        require(
            IERC20(tokenContractAddress).balanceOf(address(this)) > _amount,
            "Insufficient balance"
        );

        Transaction storage _txn = _initTxn(
            TransactionType.TRANSFER,
            _amount,
            _currencyCode,
            _conversionRate,
            "TOKEN",
            _senderName,
            _senderPhoneNumber
        );

        _txn.clientAccount = _recipient;

        require(
            IERC20(tokenContractAddress).transfer(_recipient, _amount),
            "Transfer failed"
        );

        completedTransactions++;
        _txn.status = Status.COMPLETED;

        emit Transfer(msg.sender, _recipient, _amount);
    }
}

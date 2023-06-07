// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./SargoOwnable.sol";

import "hardhat/console.sol";

/**
 * @title SargoEscrow
 * @dev Buy, sell, credit escrow
 */
contract SargoEscrow is SargoOwnable {
    uint256 public nextTxId;
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
    event Transfer(Transaction txn);

    modifier amountGreaterThanZero(uint256 _amount) {
        _amountGreaterThanZero(_amount);
        _;
    }

    modifier pairedOnly(uint256 _txnId) {
        _pairedOnly(_txnId);
        _;
    }

    modifier onRequestOnly(uint256 _txnId) {
        _onRequestOnly(_txnId);
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

    function _amountGreaterThanZero(uint256 _amount) private pure {
        require(_amount > 0, "Amount greater than zero");
    }

    function _pairedOnly(uint256 _txnId) private view {
        require(transactions[_txnId].status == Status.PAIRED, "Not PAIRED.");
    }

    function _onRequestOnly(uint256 _txnId) private view {
        require(transactions[_txnId].status == Status.REQUEST, "REQUEST only");
    }

    function _initializeTransaction(
        TransactionType _txType,
        uint256 _amount,
        string memory _currencyCode,
        string memory _conversionRate,
        string memory _paymentMethod,
        string memory _name,
        string memory _phoneNumber
    ) private returns (Transaction storage) {
        if (nextTxId == 0) {
            nextTxId = 1;
        }

        Transaction storage _txn = transactions[nextTxId];
        _txn.id = nextTxId;
        //_txn.refNumber = block.timestamp;
        _txn.txType = _txType;

        if (_txType == TransactionType.DEPOSIT) {
            _txn.clientAccount = msg.sender;
            _txn.clientName = _name;
            _txn.clientPhoneNumber = _phoneNumber;
        } else if (
            _txType == TransactionType.WITHDRAW ||
            _txType == TransactionType.TRANSFER
        ) {
            _txn.agentAccount = msg.sender;
            _txn.agentName = _name;
            _txn.agentPhoneNumber = _phoneNumber;
        } else {
            revert("Invalid tx type");
        }

        _txn.status = Status.REQUEST;
        _txn.currencyCode = _currencyCode;
        _txn.conversionRate = _conversionRate;
        _txn.totalAmount = _amount + (treasuryFee + agentFee);
        _txn.netAmount = _amount;
        _txn.agentFee = agentFee;
        _txn.treasuryFee = treasuryFee;
        _txn.agentApproved = false;
        _txn.clientApproved = false;
        _txn.paymentMethod = _paymentMethod;
        _txn.timestamp = block.timestamp;

        nextTxId++;

        return _txn;
    }

    /**
     * @notice Transfer value to respective addresses
     * @notice The account that fulfills the request earns a commision
     **/
    function _completeTransaction(uint256 _txnId) private whenNotPaused {
        Transaction storage _txn = transactions[_txnId];
        address _earnAccount;

        require(
            _txn.clientAccount == msg.sender || _txn.agentAccount == msg.sender,
            "Authorized accounts"
        );
        require(
            _txn.txType == TransactionType.DEPOSIT ||
                _txn.txType == TransactionType.WITHDRAW,
            "Authorized tx type"
        );
        require(_txn.status == Status.CONFIRMED, "Not CONFIRMED");

        /* fulfilled amount */
        require(
            IERC20(tokenContractAddress).transfer(
                _txn.clientAccount,
                _txn.netAmount
            ),
            "Transfer failed."
        );

        if (_txn.txType == TransactionType.DEPOSIT) {
            _earnAccount = _txn.agentAccount;
        } else if (_txn.txType == TransactionType.WITHDRAW) {
            _earnAccount = _txn.clientAccount;
        }

        /* fulfillment fee */
        require(
            IERC20(tokenContractAddress).transfer(_earnAccount, _txn.agentFee),
            "Earn failed"
        );

        /* Sum up agent fee earned */
        Earning storage _earning = earnings[_earnAccount];
        _earning.totalEarned += _txn.agentFee;
        _earning.timestamp = _txn.timestamp;

        /* Treasury fee */
        require(
            IERC20(tokenContractAddress).transfer(
                treasuryAddress,
                _txn.treasuryFee
            ),
            "Treasury fee failed."
        );

        _txn.status = Status.COMPLETED;
        completedTransactions++;

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
            _initializeTransaction(
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
            _initializeTransaction(
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
    ) public onRequestOnly(_txnId) whenNotPaused nonReentrant {
        Transaction storage _txn = transactions[_txnId];

        require(_txn.txType == TransactionType.DEPOSIT, "Deposit only");
        require(msg.sender != _txn.clientAccount, "Agent only");

        _txn.agentAccount = msg.sender;

        require(
            IERC20(tokenContractAddress).balanceOf(address(_txn.agentAccount)) >
                _txn.totalAmount,
            "Insufficient balance"
        );

        _txn.status = Status.PAIRED;
        _txn.agentName = _agentName;
        _txn.agentPhoneNumber = _agentPhoneNumber;

        require(
            IERC20(tokenContractAddress).transferFrom(
                _txn.agentAccount,
                address(this),
                _txn.totalAmount
            ),
            "Insufficient balance"
        );

        emit RequestAccepted(_txn);
    }

    function acceptWithdrawal(
        uint256 _txnId,
        string calldata _clientName,
        string calldata _clientPhoneNumber
    ) public onRequestOnly(_txnId) whenNotPaused nonReentrant {
        Transaction storage _txn = transactions[_txnId];

        require(_txn.txType == TransactionType.WITHDRAW, "Withdraw only");
        require(msg.sender != _txn.agentAccount, "Client only");

        _txn.clientAccount = msg.sender;

        require(
            IERC20(tokenContractAddress).balanceOf(address(_txn.agentAccount)) >
                _txn.totalAmount,
            "Insufficient balance"
        );

        _txn.status = Status.PAIRED;
        _txn.clientName = _clientName;
        _txn.clientPhoneNumber = _clientPhoneNumber;

        require(
            IERC20(tokenContractAddress).transferFrom(
                _txn.agentAccount,
                address(this),
                _txn.totalAmount
            ),
            "Insufficient balance"
        );

        emit RequestAccepted(_txn);
    }

    function clientConfirmPayment(
        uint256 _txnId
    ) public payable pairedOnly(_txnId) whenNotPaused nonReentrant {
        Transaction storage _txn = transactions[_txnId];

        require(msg.sender == _txn.clientAccount, "Client only");
        require(!_txn.clientApproved, "Client confirmed");
        _txn.clientApproved = true;

        emit ClientConfirmed(_txn);

        if (_txn.agentApproved) {
            _txn.status = Status.CONFIRMED;
            emit TransactionConfirmed(_txn);
            _completeTransaction(_txnId);
        }
    }

    function agentConfirmPayment(
        uint256 _txnId
    ) public payable pairedOnly(_txnId) whenNotPaused nonReentrant {
        Transaction storage _txn = transactions[_txnId];

        require(msg.sender == _txn.agentAccount, "Agent only");
        require(!_txn.agentApproved, "Agent confirmed");
        _txn.agentApproved = true;

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
    ) public onRequestOnly(_txnId) whenNotPaused nonReentrant {
        Transaction storage _txn = transactions[_txnId];

        require(_txn.status == Status.REQUEST, "Authorized account only");

        _txn.status = Status.CANCELLED;
        _txn.totalAmount = 0;
        _txn.agentFee = 0;
        _txn.treasuryFee = 0;

        emit TransactionCancelled(_txn, _reason);
    }

    /// @notice Get a transaction by id
    function getTransactionById(
        uint256 _txnId
    ) public view returns (Transaction memory) {
        return transactions[_txnId];
    }

    /// @notice Get accoummulated earnings for the provided account
    function getEarnings(
        address _address
    ) public view returns (Earning memory) {
        return earnings[_address];
    }

    /// @notice Transafer tokens from the the sender account to a recipient account
    function send(
        address _recipient,
        uint256 _amount
    ) public payable whenNotPaused nonReentrant amountGreaterThanZero(_amount) {
        require(_recipient != owner());
        require(_recipient != address(0), "Not zero address");
        require(
            IERC20(tokenContractAddress).balanceOf(address(msg.sender)) >
                _amount,
            "Insufficient balance"
        );

        Transaction storage _txn = _initializeTransaction(
            TransactionType.TRANSFER,
            _amount,
            "",
            "0",
            "TOKEN",
            "",
            ""
        );

        require(_txn.txType == TransactionType.TRANSFER, "Invalid tx type");

        _txn.clientAccount = _recipient;

        require(
            IERC20(tokenContractAddress).transferFrom(
                msg.sender,
                _recipient,
                _amount
            ),
            "Insufficient balance"
        );

        _txn.status = Status.COMPLETED;
        completedTransactions++;

        emit Transfer(_txn);
    }

    /// @notice Transafer tokens from the contract to a recipient account
    function credit(
        address _recipient,
        uint256 _amount
    )
        public
        payable
        onlyOwner
        whenNotPaused
        nonReentrant
        amountGreaterThanZero(_amount)
    {
        require(msg.sender == owner(), "Only owner");
        require(_recipient != owner());
        require(_recipient != address(0), "Not zero address");
        require(_recipient != address(this));
        require(
            IERC20(tokenContractAddress).balanceOf(address(this)) > _amount,
            "Insufficient balance"
        );

        Transaction storage _txn = _initializeTransaction(
            TransactionType.TRANSFER,
            _amount,
            "",
            "0",
            "TOKEN",
            "SARGO",
            ""
        );

        require(_txn.txType == TransactionType.TRANSFER, "Invalid tx type");

        _txn.clientAccount = _recipient;

        require(
            IERC20(tokenContractAddress).transfer(_recipient, _amount),
            "Transfer failed"
        );

        _txn.status = Status.COMPLETED;
        completedTransactions++;

        emit Transfer(_txn);
    }
}

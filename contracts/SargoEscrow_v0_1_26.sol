// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.17;

import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "./SargoBase.sol";
import "hardhat/console.sol";

/**
 * @title SargoEscrow
 * @dev Buy, sell, transfer, credit escrow
 */
contract SargoEscrow_v0_1_26 is
    SargoBase,
    Initializable,
    UUPSUpgradeable,
    OwnableUpgradeable,
    PausableUpgradeable,
    AccessControlUpgradeable,
    ReentrancyGuardUpgradeable
{
    uint256 public nextTxId;
    address public tokenAddress;
    address public treasuryAddress;
    address public feeAddress; //deprecated
    bytes32 private constant PAUSER_ROLE = keccak256("PAUSER_ROLE");

    mapping(uint256 => Transaction) private transactions;
    mapping(address => Earning) private earnings;
    mapping(Status => uint256[]) public requests; //deprecate
    mapping(address => uint256[]) public acountHistory;
    mapping(Status => uint256[]) public paired; //deprecate
    mapping(address => uint256[]) public pairing; //deprecate

    function initialize(
        address _tokenAddress,
        address _treasuryAddress,
        address _feeAddress
    ) public initializer {
        __Ownable_init();
        __UUPSUpgradeable_init();
        __AccessControl_init();
        __Pausable_init();
        __ReentrancyGuard_init();

        require(_tokenAddress != address(0), "Token address");
        require(_treasuryAddress != address(0), "Treasury address");
        require(_feeAddress != address(0), "Fee address");
        tokenAddress = _tokenAddress;
        treasuryAddress = _treasuryAddress;
        feeAddress = _feeAddress;

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(PAUSER_ROLE, msg.sender);
    }

    function _authorizeUpgrade(
        address newImplementation
    ) internal override onlyOwner {}

    function pause() public onlyOwner {
        _pause();
    }

    function unPause() public onlyOwner {
        _unpause();
    }

    event TransactionInitiated(
        uint256 indexed id,
        uint256 indexed timestamp,
        Transaction txn
    );
    event RequestAccepted(
        uint256 indexed id,
        uint256 indexed timestamp,
        Transaction txn
    );
    event ClientConfirmed(
        uint256 indexed id,
        uint256 indexed timestamp,
        Transaction txn
    );
    event AgentConfirmed(
        uint256 indexed id,
        uint256 indexed timestamp,
        Transaction txn
    );
    event TransactionCompleted(
        uint256 indexed id,
        uint256 indexed timestamp,
        Transaction txn
    );
    event TransactionCancelled(
        uint256 indexed id,
        uint256 indexed timestamp,
        Transaction txn,
        string reason
    );
    event TransactionDisputed(
        uint256 indexed id,
        uint256 indexed timestamp,
        Transaction txn,
        string reason
    );
    event TransactionClaimed(
        uint256 indexed id,
        uint256 indexed timestamp,
        Transaction txn,
        string resolution
    );
    event TransactionResolved(
        uint256 indexed id,
        uint256 indexed timestamp,
        Transaction txn,
        string resolution
    );
    event Transfer(
        uint256 indexed id,
        uint256 indexed timestamp,
        Transaction txn
    );
    event TransactionStatus(
        uint256 indexed id,
        uint256 indexed timestamp,
        Transaction txn
    );

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

    function _amountGreaterThanZero(uint256 _amount) private pure {
        require(_amount > 0, "Zero amount");
    }

    function _pairedOnly(uint256 _txnId) private view {
        require(transactions[_txnId].status == Status.PAIRED, "Not PAIRED");
    }

    function _onRequestOnly(uint256 _txnId) private view {
        require(transactions[_txnId].status == Status.REQUEST, "Not REQUEST");
    }

    /**
     * @dev Add a transaction id into address transaction history
     * @notice Alist of all txnIds for each address
     **/
    function _addToHistory(address _address, uint256 _txnId) private {
        acountHistory[_address].push(_txnId);
    }

    /**
     * @dev Initiate a new transaction, updates the transactions mapping state
     **/
    function _initializeTransaction(
        TransactionType _txType,
        uint256 _amount
    ) private returns (uint256 id) {
        if (nextTxId == 0) {
            nextTxId = 1;
        }

        //TODO: Validate refNumber uniqueness
        Transaction storage _txn = transactions[nextTxId];
        _txn.id = nextTxId;
        _txn.refNumber = setRefNumber(_txn.id);
        _txn.txType = _txType;
        _txn.status = Status.REQUEST;
        _txn.totalAmount =
            _amount +
            (getTreasuryFee(_amount) + getAgentFee(_amount));
        _txn.netAmount = _amount;
        _txn.agentFee = getAgentFee(_amount);
        _txn.treasuryFee = getTreasuryFee(_amount);
        _txn.agentApproved = false;
        _txn.clientApproved = false;
        _txn.timestamp = block.timestamp;

        nextTxId++;

        return _txn.id;
    }

    /**
     * @dev Transfer value to respective addresses
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
            "Tx type"
        );

        require(_txn.agentApproved && _txn.clientApproved, "Not CONFIRMED");
        require(_txn.status != Status.DISPUTED, "DISPUTED");
        require(_txn.status != Status.CLAIMED, "CLAIMED");
        require(_txn.status != Status.REFUNDED, "REFUNDED");
        require(_txn.status != Status.VOIDED, "VOIDED");

        /* fulfilled amount */
        require(
            IERC20Upgradeable(tokenAddress).transfer(
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
        if(_txn.agentFee > 0) {
        require(
            IERC20Upgradeable(tokenAddress).transfer(
                _earnAccount,
                _txn.agentFee
            ),
            "Earn failed"
        );

        /* Sum up agent fee earned */
        _earn(_earnAccount, _txn.agentFee);
        }

        /* Treasury fee */
        if(_txn.treasuryFee > 0) {
            require(
                IERC20Upgradeable(tokenAddress).transfer(
                    treasuryAddress,
                    _txn.treasuryFee
                ),
                "Treasury fee failed."
            );
        }

        _txn.status = Status.COMPLETED;

        emit TransactionCompleted(_txn.id, _txn.timestamp, _txn);
    }

    /**
     * @dev Log amount earned to the passed address
     * @notice The account that fulfills an order earns a commision
     **/
    function _earn(address _earnAccount, uint256 _earnedAmount) private {
        require(_earnedAmount > 0, "Earned amount");

        Earning storage _earning = earnings[_earnAccount];
        _earning.totalEarned += _earnedAmount;
        _earning.timestamp = block.timestamp;
    }

    /**
     * @dev Initializes a deposit transaction
     * @notice Deposits allows the purchase of stable coin in exchange with fiat
     */
    function initiateDeposit(
        uint256 _amount,
        string memory _currencyCode,
        uint256 _conversionRate,
        string memory _paymentMethod,
        string memory _clientName,
        string memory _clientPhoneNumber,
        string memory _clientKey,
        address _agentAccount,
        string memory _agentName,
        string memory _agentPhoneNumber,
        string memory _agentKey
    ) public amountGreaterThanZero(_amount) whenNotPaused nonReentrant {

        uint256 _txnId = _initializeTransaction(TransactionType.DEPOSIT, _amount);

        Transaction storage _txn = transactions[_txnId];
        _txn.clientAccount = msg.sender;
        _txn.account.clientName = _clientName;
        _txn.account.clientPhoneNumber = _clientPhoneNumber;
        _txn.clientKey = _clientKey;
        _txn.agentAccount = _agentAccount;
        _txn.account.agentName = _agentName;
        _txn.account.agentPhoneNumber = _agentPhoneNumber; 
        _txn.agentKey = _agentKey;
        _txn.currencyCode = _currencyCode;
        _txn.conversionRate = _conversionRate;
        _txn.paymentMethod = _paymentMethod;

        _addToHistory(_txn.clientAccount, _txn.id);
        _addToHistory(_txn.agentAccount, _txn.id);

        require(msg.sender != _txn.agentAccount, "Same account");

        emit TransactionInitiated(_txn.id, _txn.timestamp, _txn);
    }

    /**
     * @dev Initializes a withdrawal transaction,
     * @notice Withdrawal allows the sale of stable coin in exchange with fiat
     */
    function initiateWithdrawal(
        uint256 _amount,
        string memory _currencyCode,
        uint256 _conversionRate,
        string memory _paymentMethod,
        string memory _agentName,
        string memory _agentPhoneNumber,
        string memory _agentKey,
        address _clientAccount,
        string memory _clientName,
        string memory _clientPhoneNumber,
        string memory _clientKey
    ) public amountGreaterThanZero(_amount) whenNotPaused nonReentrant {

        uint256 _txnId = _initializeTransaction(TransactionType.WITHDRAW, _amount);
        Transaction storage _txn = transactions[_txnId];
        _txn.agentAccount = msg.sender;
        _txn.account.agentName = _agentName;
        _txn.account.agentPhoneNumber = _agentPhoneNumber;
        _txn.agentKey = _agentKey;
        _txn.clientAccount = _clientAccount;
        _txn.account.clientName = _clientName;
        _txn.account.clientPhoneNumber = _clientPhoneNumber; 
        _txn.clientKey = _clientKey;
        _txn.currencyCode = _currencyCode;
        _txn.conversionRate = _conversionRate;
        _txn.paymentMethod = _paymentMethod;

        _addToHistory(_txn.agentAccount, _txn.id);
        _addToHistory(_txn.clientAccount, _txn.id);

        require(msg.sender != _txn.clientAccount, "Same account");

        emit TransactionInitiated(_txn.id, _txn.timestamp, _txn);

        _acceptWithdrawal(_txn.id);
    }

    /**
     * @dev Counter-party accepts to fulfill a deposit request
     * @notice The counter-parties are paired by their addresses
     */
    function acceptDeposit(uint256 _txnId) public onRequestOnly(_txnId) whenNotPaused {
        Transaction storage _txn = transactions[_txnId];
        require(_txn.txType == TransactionType.DEPOSIT, "Deposit only");
        require(msg.sender == _txn.agentAccount, "Agent only");

        require(
            IERC20Upgradeable(tokenAddress).balanceOf(
                address(_txn.agentAccount)
            ) > _txn.totalAmount,
            "Insufficient balance"
        );

        _txn.status = Status.PAIRED;

        require(
            IERC20Upgradeable(tokenAddress).transferFrom(
                _txn.agentAccount,
                address(this),
                _txn.totalAmount
            ),
            "Insufficient balance"
        );

        //where to store and check the timer based on the listing time limit 
        //cancelTransaction(_txnId, "Auto Cancelled");

        emit RequestAccepted(_txn.id, _txn.timestamp, _txn);
    }

    /**
     * @dev Counter-party accepts to fulfill a withdrawal request
     * @notice The counter-parties are paired by their addresses
     */
    function _acceptWithdrawal(uint256 _txnId) private onRequestOnly(_txnId) whenNotPaused {
        Transaction storage _txn = transactions[_txnId];

        require(_txn.txType == TransactionType.WITHDRAW, "Withdraw only");
        require(msg.sender == _txn.agentAccount, "Agent only");

        require(
            IERC20Upgradeable(tokenAddress).balanceOf(
                address(_txn.agentAccount)
            ) > _txn.totalAmount,
            "Insufficient balance"
        );

        _txn.status = Status.PAIRED;

        require(
            IERC20Upgradeable(tokenAddress).transferFrom(
                _txn.agentAccount,
                address(this),
                _txn.totalAmount
            ),
            "Insufficient balance"
        );

        //where to store and check the timer based on the listing time limit 
        //cancelTransaction(_txnId, "Auto Cancelled");

        emit RequestAccepted(_txn.id, _txn.timestamp, _txn);
    }

    /**
     * @dev Counter-party confirms fiat payment made
     * @notice A transaction requires the buyer to confirm fait payment was made
     */
    function clientConfirmPayment(
        uint256 _txnId
    ) public payable pairedOnly(_txnId) whenNotPaused nonReentrant {
        Transaction storage _txn = transactions[_txnId];

        require(msg.sender == _txn.clientAccount, "Client only");
        require(!_txn.clientApproved, "Client confirmed");
        _txn.clientApproved = true;

        emit ClientConfirmed(_txn.id, _txn.timestamp, _txn);

        if (_txn.agentApproved) {
            _completeTransaction(_txnId);
        }
    }

    /**
     * @dev Counter-party confirms fiat payment was received
     * @notice A transaction requires the seller to confirm fait payment was received
     */
    function agentConfirmPayment(
        uint256 _txnId
    ) public payable pairedOnly(_txnId) whenNotPaused nonReentrant {
        Transaction storage _txn = transactions[_txnId];

        require(msg.sender == _txn.agentAccount, "Agent only");
        require(!_txn.agentApproved, "Agent confirmed");
        _txn.agentApproved = true;

        emit AgentConfirmed(_txn.id, _txn.timestamp, _txn);

        if (_txn.clientApproved) {
            _completeTransaction(_txnId);
        }
    }

    /**
     * @dev Flag a request as cancelled
     * @notice Void a transaction request, allowed only at the request status
     */
    function cancelTransaction(
        uint256 _txnId,
        string memory _reason
    ) public whenNotPaused nonReentrant {
        Transaction storage _txn = transactions[_txnId];

        require(_txn.status == Status.REQUEST || _txn.status == Status.PAIRED, "Not REQUEST_PAIRED");
        
        _txn.totalAmount = 0;
        _txn.agentFee = 0;
        _txn.treasuryFee = 0;
        _txn.status = Status.CANCELLED;

        if(_txn.status == Status.PAIRED && !_txn.clientApproved && !_txn.agentApproved) {
            credit(_txn.agentAccount, _txn.totalAmount, _txn.currencyCode, _txn.conversionRate);
        }

        emit TransactionCancelled(_txn.id, _txn.timestamp, _txn, _reason);
    }

    /**
     * @dev Flag a request as disputed
     * @notice Flag transaction as disputed, allowed only at the Paired status
     */
    function disputeTransaction(
        uint256 _txnId,
        string memory _reason
    ) public pairedOnly(_txnId) whenNotPaused nonReentrant {
        Transaction storage _txn = transactions[_txnId];

        require(
            _txn.clientAccount == msg.sender ||
                _txn.agentAccount == msg.sender ||
                owner() == msg.sender,
            "Authorized accounts"
        );

        _txn.status = Status.DISPUTED;
        emit TransactionDisputed(_txn.id, _txn.timestamp, _txn, _reason);
    }

    /**
     * @dev Flag a request as a claim
     * @notice Flag transaction as a claim, status only
     * allowed when a dispute is resolved and a refund is expected
     */
    function claimTransaction(
        uint256 _txnId,
        string memory _resolution
    ) public onlyOwner whenNotPaused nonReentrant {
        Transaction storage _txn = transactions[_txnId];
        require(_txn.status == Status.DISPUTED, "DISPUTED");
        _txn.status = Status.CLAIMED;
        emit TransactionClaimed(_txn.id, _txn.timestamp, _txn, _resolution);
    }

    /**
     * @dev Get a transaction by Id
     * @notice Returns the details of the transaction Id provided
     */
    function getTransactionById(
        uint256 _txnId
    ) public view returns (Transaction memory) {
        return transactions[_txnId];
    }

    /**
     * @dev Get the agent fee rate
     */
    function getAgentFeeRate() public pure returns (uint256) {
        return 0 ether;
    }

    /**
     * @dev Compute the agent fee
     */
    function getAgentFee(uint256 _amount) public pure returns (uint256) {
        return (_amount * getAgentFeeRate()) / 1 ether;
    }

    /**
     * @dev Get the treasury fee rate
     */
    function getTreasuryFeeRate() public pure returns (uint256) {
        return 0.01 ether;
    }

    /**
     * @dev Compute treasury fee
     */
    function getTreasuryFee(uint256 _amount) public pure returns (uint256) {
        return (_amount * getTreasuryFeeRate()) / 1 ether;
    }

    /**
     * @dev Get the token transfer fee rate
     */
    function getTransferFeeRate() public pure returns (uint256) {
        return 0.01 ether;
    }

    /**
     * @notice Get accoummulated earnings for the provided address
     */
    function getEarnings(
        address _address
    ) public view returns (Earning memory) {
        return earnings[_address];
    }

    /**
     * @notice Get the length of transactions by address
     */
    function getAcountHistoryLength(
        address _address
    ) public view returns (uint256) {
        return acountHistory[_address].length;
    }

    /**
     * @notice Transafer tokens from the the sender address to the provided recipient address
     */
    function send(
        address _recipient,
        uint256 _amount,
        string memory _currencyCode,
        uint256 _conversionRate
    ) public payable whenNotPaused nonReentrant amountGreaterThanZero(_amount) {
        require(_recipient != owner());
        require(_recipient != msg.sender, "Invalid recipient");
        require(_recipient != address(0), "Zero address");
        require(
            IERC20Upgradeable(tokenAddress).balanceOf(address(msg.sender)) >
                _amount,
            "Insufficient balance"
        );

        uint256 _txnId = _initializeTransaction(TransactionType.TRANSFER, _amount);

        Transaction storage _txn = transactions[_txnId];

        require(_txn.txType == TransactionType.TRANSFER, "Invalid tx type");

        require(
            IERC20Upgradeable(tokenAddress).transferFrom(
                msg.sender,
                _recipient,
                _amount
            ),
            "Transfer failed"
        );

        _txn.agentAccount = msg.sender;
        _txn.account.agentName = "";
        _txn.account.agentPhoneNumber = "";

        _txn.clientAccount = _recipient;
        _txn.account.clientName = "";
        _txn.account.clientPhoneNumber = ""; 

        _txn.currencyCode = _currencyCode;
        _txn.conversionRate = _conversionRate;
        _txn.paymentMethod = "TRANSFER";
        _txn.clientKey = "";
        _txn.agentKey = "";

        _txn.status = Status.COMPLETED;

        _addToHistory(_txn.agentAccount, _txn.id);
        _addToHistory(_txn.clientAccount, _txn.id);

        emit Transfer(_txn.id, _txn.timestamp, _txn);  
    }

    /**
     * @notice Transafer tokens from the contract to the provided recipient account
     */
    function credit(
        address _recipient,
        uint256 _amount,
        string memory _currencyCode,
        uint256 _conversionRate
    )
        public
        payable
        onlyOwner
        whenNotPaused
        nonReentrant
        amountGreaterThanZero(_amount)
    {
        require(_recipient != owner());
        require(_recipient != address(this));
        require(_recipient != address(0), "Zero address");
        require(
            IERC20Upgradeable(tokenAddress).balanceOf(address(this)) > _amount,
            "Insufficient balance"
        );

        uint256 _txnId = _initializeTransaction(TransactionType.TRANSFER, _amount);

        Transaction storage _txn = transactions[_txnId];

        require(_txn.txType == TransactionType.TRANSFER, "Invalid tx type");
        require(
            IERC20Upgradeable(tokenAddress).transfer(_recipient, _amount),
            "Transfer failed"
        );
        
        _txn.agentAccount = msg.sender;
        _txn.account.agentName = "SARGO";
        _txn.account.agentPhoneNumber = "";

        _txn.clientAccount = _recipient;
        _txn.account.clientName = "";
        _txn.account.clientPhoneNumber = ""; 

        _txn.currencyCode = _currencyCode;
        _txn.conversionRate = _conversionRate;
        _txn.paymentMethod = "TRANSFER";
        _txn.clientKey = "";
        _txn.agentKey = "";

        _txn.status = Status.COMPLETED;

        _addToHistory(_txn.agentAccount, _txn.id);
        _addToHistory(_txn.clientAccount, _txn.id);

        emit Transfer(_txn.id, _txn.timestamp, _txn);
    }

    /**
     * @dev Update transaction status
     * @notice Flag transaction to the passed status
     */
    function transactionStatus(
        uint256 _txnId,
        Status _status
    ) public onlyOwner whenNotPaused nonReentrant {
        Transaction storage _txn = transactions[_txnId];
        require(_txn.status != Status.REQUEST, "Invalid tx Status");

        _txn.status = _status;

        emit TransactionStatus(_txn.id, _txn.timestamp, _txn);
    }

    /**
     * @dev Send refund tokens to counter-parties
     * @notice Refund counter-parties when in claim, allowed only tokens need to be refunded
     */
    function refundTransaction(
        uint256 _txnId,
        uint256 _clientRefundAmount,
        uint256 _agentRefundAmount,
        string memory _resolution
    ) public payable onlyOwner whenNotPaused nonReentrant {
        Transaction storage _txn = transactions[_txnId];
        require(_txn.status == Status.CLAIMED, "CLAIMED");
        require(
            _clientRefundAmount > 0 || _agentRefundAmount > 0,
            "Zero amount"
        );
        require(
            _clientRefundAmount + _agentRefundAmount <= _txn.totalAmount,
            "Invalid amount"
        );
        require(
            IERC20Upgradeable(tokenAddress).balanceOf(address(this)) >
                _txn.totalAmount,
            "Insufficient balance"
        );

        if (_clientRefundAmount > 0) {
            require(
                IERC20Upgradeable(tokenAddress).transfer(
                    _txn.clientAccount,
                    _clientRefundAmount
                ),
                "Refund failed."
            );
        }

        if (_agentRefundAmount > 0) {
            require(
                IERC20Upgradeable(tokenAddress).transfer(
                    _txn.agentAccount,
                    _agentRefundAmount
                ),
                "Refund failed."
            );
        }

        _txn.totalAmount = 0;
        _txn.agentFee = 0;
        _txn.treasuryFee = 0;
        _txn.status = Status.REFUNDED;

        emit TransactionResolved(_txn.id, _txn.timestamp, _txn, _resolution);
    }

    /**
     * @dev Flag a claim as voided
     * @notice Void a transaction in claim, when no refund tokens need to be sent
     */
    function voidTransaction(
        uint256 _txnId,
        string memory _resolution
    ) public onlyOwner whenNotPaused nonReentrant {
        Transaction storage _txn = transactions[_txnId];
        require(_txn.status == Status.CLAIMED, "CLAIMED");

        _txn.totalAmount = 0;
        _txn.agentFee = 0;
        _txn.treasuryFee = 0;
        _txn.status = Status.VOIDED;

        emit TransactionResolved(_txn.id, _txn.timestamp, _txn, _resolution);
    }
}

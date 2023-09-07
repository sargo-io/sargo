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
import "./SargoFee.sol";

/**
 * @title SargoEscrow
 * @dev Buy, sell, transfer, credit escrow
 */
contract SargoEscrow is
    SargoBase,
    Initializable,
    UUPSUpgradeable,
    OwnableUpgradeable,
    PausableUpgradeable,
    AccessControlUpgradeable,
    ReentrancyGuardUpgradeable
{
    uint256 private nextTxId;
    address public tokenAddress;
    address public treasuryAddress;
    address public feeAddress;
    address public earnAddress;
    bytes32 private constant PAUSER_ROLE = keccak256("PAUSER_ROLE");

    mapping(uint256 => Transaction) private transactions;

    //TODO: move to separate contract
    //mapping(address => Earning) private earnings;

    /* 
    //Requests feed
    //mapping(uint256 => uint256) public requests;

    //Transactions by counter-party address
    //mapping(uint256 => CounterParty) public acountTransactions; //completedTransactions
    //mapping(address => uint256) public acountTransactions; 
    */

    function initialize(
        address _tokenAddress,
        address _treasuryAddress,
        address _feeAddress,
        address _earnAddress
    ) public initializer {
        __Ownable_init();
        __UUPSUpgradeable_init();
        __AccessControl_init();
        __Pausable_init();
        __ReentrancyGuard_init();

        require(_tokenAddress != address(0), "Token address");
        require(_treasuryAddress != address(0), "Treasury address");
        require(_feeAddress != address(0), "Fee address");
        require(_earnAddress != address(0), "Earn address");
        tokenAddress = _tokenAddress;
        treasuryAddress = _treasuryAddress;
        feeAddress = _feeAddress;
        earnAddress = _earnAddress;

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
    event Transfer(
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

    function getAgentFee() public view returns (uint256) {
        return SargoFee(feeAddress).agentFee();
    }

    function getTreasuryFee() public view returns (uint256) {
        return SargoFee(feeAddress).treasuryFee();
    }

    function _initializeTransaction(
        TransactionType _txType,
        uint256 _amount,
        string memory _currencyCode,
        uint256 _conversionRate,
        string memory _paymentMethod,
        string memory _name,
        string memory _phoneNumber
    ) private returns (uint256 id) {
        if (nextTxId == 0) {
            nextTxId = 1;
        }

        //TODO: Validate refNumber uniqueness

        Transaction storage _txn = transactions[nextTxId];
        _txn.id = nextTxId;
        _txn.refNumber = setRefNumber(_txn.id);
        _txn.txType = _txType;

        if (_txType == TransactionType.DEPOSIT) {
            _txn.account.clientAccount = msg.sender;
            _txn.account.clientName = _name;
            _txn.account.clientPhoneNumber = _phoneNumber;
        } else if (
            _txType == TransactionType.WITHDRAW ||
            _txType == TransactionType.TRANSFER
        ) {
            _txn.account.agentAccount = msg.sender;
            _txn.account.agentName = _name;
            _txn.account.agentPhoneNumber = _phoneNumber;
        } else {
            revert("Invalid tx");
        }

        _txn.status = Status.REQUEST;
        _txn.currencyCode = _currencyCode;
        _txn.conversionRate = _conversionRate;
        _txn.totalAmount = _amount + (getTreasuryFee() + getAgentFee());
        _txn.netAmount = _amount;
        _txn.fee.agentFee = getAgentFee();
        _txn.fee.treasuryFee = getTreasuryFee();
        _txn.account.agentApproved = false;
        _txn.account.clientApproved = false;
        _txn.paymentMethod = _paymentMethod;
        _txn.timestamp = block.timestamp;

        emit TransactionInitiated(_txn.id, _txn.timestamp, _txn);
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
            _txn.account.clientAccount == msg.sender ||
                _txn.account.agentAccount == msg.sender,
            "Authorized accounts"
        );
        require(
            _txn.txType == TransactionType.DEPOSIT ||
                _txn.txType == TransactionType.WITHDRAW,
            "Tx type"
        );
        require(
            _txn.account.agentApproved && _txn.account.clientApproved,
            "Not CONFIRMED"
        );
        require(_txn.status != Status.DISPUTED, "DISPUTED");

        /* fulfilled amount */
        require(
            IERC20Upgradeable(tokenAddress).transfer(
                _txn.account.clientAccount,
                _txn.netAmount
            ),
            "Transfer failed."
        );

        if (_txn.txType == TransactionType.DEPOSIT) {
            _earnAccount = _txn.account.agentAccount;
        } else if (_txn.txType == TransactionType.WITHDRAW) {
            _earnAccount = _txn.account.clientAccount;
        }

        /* fulfillment fee */
        require(
            IERC20Upgradeable(tokenAddress).transfer(
                _earnAccount,
                _txn.fee.agentFee
            ),
            "Earn failed"
        );

        /* Sum up agent fee earned */
        //TODO: call external Earnings contract to update commision
        //TODO: call external Earnings contract to get commisions for address passed

        // Earning storage _earning = earnings[_earnAccount];
        // _earning.totalEarned += _txn.fee.agentFee;
        // _earning.timestamp = _txn.timestamp;

        /* Treasury fee */
        require(
            IERC20Upgradeable(tokenAddress).transfer(
                treasuryAddress,
                _txn.fee.treasuryFee
            ),
            "Treasury fee failed."
        );

        _txn.status = Status.COMPLETED;
        //TODO: add txId to counter-party transactions mapping

        emit TransactionCompleted(_txn.id, _txn.timestamp, _txn);
    }

    /**
     * @dev Initializes a deposit transaction
     * @notice Deposits allows the purchase of stable coin in exchange with fiat
     */
    function initiateDeposit(
        uint256 _amount,
        string calldata _currencyCode,
        uint256 _conversionRate,
        string calldata _paymentMethod,
        string calldata _clientName,
        string calldata _clientPhoneNumber
    ) public amountGreaterThanZero(_amount) whenNotPaused nonReentrant {
        _initializeTransaction(
            TransactionType.DEPOSIT,
            _amount,
            _currencyCode,
            _conversionRate,
            _paymentMethod,
            _clientName,
            _clientPhoneNumber
        );
    }

    /**
     * @dev Initializes a withdrawal transaction,
     * @notice Withdrawal allows the sale of stable coin in exchange with fiat
     */
    function initiateWithdrawal(
        uint256 _amount,
        string calldata _currencyCode,
        uint256 _conversionRate,
        string calldata _paymentMethod,
        string calldata _agentName,
        string calldata _agentPhoneNumber
    ) public amountGreaterThanZero(_amount) whenNotPaused nonReentrant {
        _initializeTransaction(
            TransactionType.WITHDRAW,
            _amount,
            _currencyCode,
            _conversionRate,
            _paymentMethod,
            _agentName,
            _agentPhoneNumber
        );
    }

    /**
     * @dev Counter-party accepts to fulfill a deposit request
     * @notice The counter-parties are paired by their addresses
     */
    function acceptDeposit(
        uint256 _txnId,
        string calldata _agentName,
        string calldata _agentPhoneNumber,
        uint256 _conversionRate
    ) public onRequestOnly(_txnId) whenNotPaused nonReentrant {
        Transaction storage _txn = transactions[_txnId];

        require(_txn.txType == TransactionType.DEPOSIT, "Deposit only");
        require(msg.sender != _txn.account.clientAccount, "Agent only");

        _txn.account.agentAccount = msg.sender;

        require(
            IERC20Upgradeable(tokenAddress).balanceOf(
                address(_txn.account.agentAccount)
            ) > _txn.totalAmount,
            "Insufficient balance"
        );

        _txn.conversionRate = _conversionRate;
        _txn.status = Status.PAIRED;
        _txn.account.agentName = _agentName;
        _txn.account.agentPhoneNumber = _agentPhoneNumber;

        require(
            IERC20Upgradeable(tokenAddress).transferFrom(
                _txn.account.agentAccount,
                address(this),
                _txn.totalAmount
            ),
            "Insufficient balance"
        );

        emit RequestAccepted(_txn.id, _txn.timestamp, _txn);
    }

    /**
     * @dev Counter-party accepts to fulfill a withdrawal request
     * @notice The counter-parties are paired by their addresses
     */
    function acceptWithdrawal(
        uint256 _txnId,
        string calldata _clientName,
        string calldata _clientPhoneNumber,
        uint256 _conversionRate
    ) public onRequestOnly(_txnId) whenNotPaused nonReentrant {
        Transaction storage _txn = transactions[_txnId];

        require(_txn.txType == TransactionType.WITHDRAW, "Withdraw only");
        require(msg.sender != _txn.account.agentAccount, "Client only");

        _txn.account.clientAccount = msg.sender;

        require(
            IERC20Upgradeable(tokenAddress).balanceOf(
                address(_txn.account.agentAccount)
            ) > _txn.totalAmount,
            "Insufficient balance"
        );

        _txn.conversionRate = _conversionRate;
        _txn.status = Status.PAIRED;
        _txn.account.clientName = _clientName;
        _txn.account.clientPhoneNumber = _clientPhoneNumber;

        require(
            IERC20Upgradeable(tokenAddress).transferFrom(
                _txn.account.agentAccount,
                address(this),
                _txn.totalAmount
            ),
            "Insufficient balance"
        );

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

        require(msg.sender == _txn.account.clientAccount, "Client only");
        require(!_txn.account.clientApproved, "Client confirmed");
        _txn.account.clientApproved = true;

        emit ClientConfirmed(_txn.id, _txn.timestamp, _txn);

        if (_txn.account.agentApproved) {
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

        require(msg.sender == _txn.account.agentAccount, "Agent only");
        require(!_txn.account.agentApproved, "Agent confirmed");
        _txn.account.agentApproved = true;

        emit AgentConfirmed(_txn.id, _txn.timestamp, _txn);

        if (_txn.account.clientApproved) {
            _completeTransaction(_txnId);
        }
    }

    /**
     * @dev Flag a request as cancelled
     * @notice Void a transaction request, allowed only at the request status
     */
    function cancelTransaction(
        uint256 _txnId,
        string calldata _reason
    ) public onRequestOnly(_txnId) whenNotPaused nonReentrant {
        Transaction storage _txn = transactions[_txnId];

        _txn.status = Status.CANCELLED;
        _txn.totalAmount = 0;
        _txn.fee.agentFee = 0;
        _txn.fee.treasuryFee = 0;

        emit TransactionCancelled(_txn.id, _txn.timestamp, _txn, _reason);
    }

    /**
     * @dev Flag a request as disputed
     * @notice Flag transaction as disputed, allowed only at the Paired status
     */
    function disputeTransaction(
        uint256 _txnId,
        string calldata _reason
    ) public pairedOnly(_txnId) whenNotPaused nonReentrant {
        Transaction storage _txn = transactions[_txnId];

        _txn.status = Status.DISPUTED;

        emit TransactionDisputed(_txn.id, _txn.timestamp, _txn, _reason);
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
     * @notice Get accoummulated earnings for the provided address
     */
    // function getEarnings(
    //     address _address
    // ) public view returns (Earning memory) {
    //     return earnings[_address];
    // }

    /**
     * @notice Transafer tokens from the the sender address to the provided recipient address
     */
    function send(
        address _recipient,
        uint256 _amount,
        string calldata _currencyCode,
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

        uint256 _txnId = _initializeTransaction(
            TransactionType.TRANSFER,
            _amount,
            _currencyCode,
            _conversionRate,
            "TOKEN",
            "",
            ""
        );

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

        _txn.account.clientAccount = _recipient;
        _txn.status = Status.COMPLETED;

        //TODO: add txId to counter-party transactions mapping

        emit Transfer(_txn.id, _txn.timestamp, _txn);
    }

    /**
     * @notice Transafer tokens from the contract to the provided recipient account
     */
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
        require(_recipient != address(this));
        require(_recipient != address(0), "Zero address");
        require(
            IERC20Upgradeable(tokenAddress).balanceOf(address(this)) > _amount,
            "Insufficient balance"
        );

        uint256 _txnId = _initializeTransaction(
            TransactionType.TRANSFER,
            _amount,
            "",
            0,
            "TOKEN",
            "SARGO",
            ""
        );

        Transaction storage _txn = transactions[_txnId];

        require(_txn.txType == TransactionType.TRANSFER, "Invalid tx type");
        require(
            IERC20Upgradeable(tokenAddress).transfer(_recipient, _amount),
            "Transfer failed"
        );

        _txn.account.clientAccount = _recipient;
        _txn.status = Status.COMPLETED;

        //TODO: add txId to counter-party transactions mapping

        emit Transfer(_txn.id, _txn.timestamp, _txn);
    }
}

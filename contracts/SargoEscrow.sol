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
    uint256 public nextTxId;
    address public tokenAddress;
    address public treasuryAddress;
    address public feeAddress;
    bytes32 private constant PAUSER_ROLE = keccak256("PAUSER_ROLE");

    mapping(uint256 => Transaction) private transactions;
    mapping(address => Earning) private earnings;
    mapping(Status => uint256[]) public requests;
    mapping(address => uint256[]) public acountHistory;
    mapping(Status => uint256[]) public paired;
    mapping(address => uint256[]) public pairing;

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
     * @dev Add a transaction id into the requests list
     * @notice All txnIds on the requests list are made available on the requests feed
     **/
    function _addToRequests(
        uint256 _txnId
    ) private onRequestOnly(_txnId) returns (uint256) {
        requests[Status.REQUEST].push(_txnId);

        return requests[Status.REQUEST].length - 1;
    }

    /**
     * @dev Remove a txnId from the requests list by index when transaction is paired or cancelled
     **/
    function _removeFromRequests(uint256 _index) private {
        requests[Status.REQUEST][_index] = requests[Status.REQUEST][
            requests[Status.REQUEST].length - 1
        ];

        Transaction storage _txn = transactions[
            requests[Status.REQUEST][_index]
        ];
        _txn.requestIndex = _index;

        requests[Status.REQUEST].pop();
    }

    /**
     * @dev Add a transaction id into the paired transactions list
     * @notice All txnIds on the paired list are made available on the current orders feed
     **/
    function _addToPairing(
        address _address,
        uint256 _txnId
    ) private returns (uint256) {
        pairing[_address].push(_txnId);

        return pairing[_address].length - 1;
    }

    /**
     * @dev Remove a txnId from the paired list by index when transaction is
     * completed,
     **/
    function _removeFromPaired(uint256 _txnId) private {
        Transaction storage _txn = transactions[_txnId];

        if (_txn.status == Status.REQUEST) {
            if (_txn.txType == TransactionType.DEPOSIT) {
                pairing[_txn.clientAccount][_txn.clientPairedIndex] = pairing[
                    _txn.clientAccount
                ][pairing[_txn.clientAccount].length - 1];

                pairing[_txn.clientAccount].pop();
            } else if (_txn.txType == TransactionType.WITHDRAW) {
                pairing[_txn.agentAccount][_txn.agentPairedIndex] = pairing[
                    _txn.agentAccount
                ][pairing[_txn.agentAccount].length - 1];

                pairing[_txn.agentAccount].pop();
            }
        } else if (_txn.status == Status.PAIRED) {
            pairing[_txn.clientAccount][_txn.clientPairedIndex] = pairing[
                _txn.clientAccount
            ][pairing[_txn.clientAccount].length - 1];
            pairing[_txn.agentAccount][_txn.agentPairedIndex] = pairing[
                _txn.agentAccount
            ][pairing[_txn.agentAccount].length - 1];
            pairing[_txn.clientAccount].pop();
            pairing[_txn.agentAccount].pop();
        }
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
        uint256 _amount,
        string memory _currencyCode,
        uint256 _conversionRate,
        string memory _paymentMethod,
        string memory _name,
        string memory _phoneNumber,
        string memory _clientKey,
        string memory _agentKey
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

        if (_txType == TransactionType.DEPOSIT) {
            _txn.clientAccount = msg.sender;
            _txn.account.clientName = _name;
            _txn.account.clientPhoneNumber = _phoneNumber;
            _txn.requestIndex = _addToRequests(_txn.id);
            _txn.clientPairedIndex = _addToPairing(_txn.clientAccount, _txn.id);
        } else if (_txType == TransactionType.WITHDRAW) {
            _txn.agentAccount = msg.sender;
            _txn.account.agentName = _name;
            _txn.account.agentPhoneNumber = _phoneNumber;
            _txn.requestIndex = _addToRequests(_txn.id);
            _txn.agentPairedIndex = _addToPairing(_txn.agentAccount, _txn.id);
        } else if (_txType == TransactionType.TRANSFER) {
            _txn.agentAccount = msg.sender;
            _txn.account.agentName = _name;
            _txn.account.agentPhoneNumber = _phoneNumber;
        } else {
            revert("Invalid tx");
        }

        _txn.currencyCode = _currencyCode;
        _txn.conversionRate = _conversionRate;
        _txn.totalAmount =
            _amount +
            (getTreasuryFee(_amount) + getAgentFee(_amount));
        _txn.netAmount = _amount;
        _txn.agentFee = getAgentFee(_amount);
        _txn.treasuryFee = getTreasuryFee(_amount);
        _txn.agentApproved = false;
        _txn.clientApproved = false;
        _txn.paymentMethod = _paymentMethod;
        _txn.clientKey = _clientKey;
        _txn.agentKey = _agentKey;
        _txn.timestamp = block.timestamp;

        _addToHistory(msg.sender, _txn.id);

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
        require(
            IERC20Upgradeable(tokenAddress).transfer(
                _earnAccount,
                _txn.agentFee
            ),
            "Earn failed"
        );

        /* Sum up agent fee earned */
        _earn(_earnAccount, _txn.agentFee);

        /* Treasury fee */
        require(
            IERC20Upgradeable(tokenAddress).transfer(
                treasuryAddress,
                _txn.treasuryFee
            ),
            "Treasury fee failed."
        );
        _removeFromPaired(_txn.id);

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
        string calldata _currencyCode,
        uint256 _conversionRate,
        string calldata _paymentMethod,
        string calldata _clientName,
        string calldata _clientPhoneNumber,
        string calldata _clientKey
    ) public amountGreaterThanZero(_amount) whenNotPaused nonReentrant {
        _initializeTransaction(
            TransactionType.DEPOSIT,
            _amount,
            _currencyCode,
            _conversionRate,
            _paymentMethod,
            _clientName,
            _clientPhoneNumber,
            _clientKey,
            ""
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
        string calldata _agentPhoneNumber,
        string memory _agentKey
    ) public amountGreaterThanZero(_amount) whenNotPaused nonReentrant {
        _initializeTransaction(
            TransactionType.WITHDRAW,
            _amount,
            _currencyCode,
            _conversionRate,
            _paymentMethod,
            _agentName,
            _agentPhoneNumber,
            "",
            _agentKey
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
        uint256 _conversionRate,
        string calldata _agentKey
    ) public onRequestOnly(_txnId) whenNotPaused nonReentrant {
        Transaction storage _txn = transactions[_txnId];

        require(_txn.txType == TransactionType.DEPOSIT, "Deposit only");
        require(msg.sender != _txn.clientAccount, "Agent only");

        _txn.agentAccount = msg.sender;

        require(
            IERC20Upgradeable(tokenAddress).balanceOf(
                address(_txn.agentAccount)
            ) > _txn.totalAmount,
            "Insufficient balance"
        );

        _txn.conversionRate = _conversionRate;
        _txn.status = Status.PAIRED;
        _txn.account.agentName = _agentName;
        _txn.account.agentPhoneNumber = _agentPhoneNumber;
        _txn.agentKey = _agentKey;
        _txn.agentPairedIndex = _addToPairing(_txn.agentAccount, _txn.id);

        require(
            IERC20Upgradeable(tokenAddress).transferFrom(
                _txn.agentAccount,
                address(this),
                _txn.totalAmount
            ),
            "Insufficient balance"
        );

        _removeFromRequests(_txn.requestIndex);
        _addToHistory(msg.sender, _txn.id);

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
        uint256 _conversionRate,
        string calldata _clientKey
    ) public onRequestOnly(_txnId) whenNotPaused nonReentrant {
        Transaction storage _txn = transactions[_txnId];

        require(_txn.txType == TransactionType.WITHDRAW, "Withdraw only");
        require(msg.sender != _txn.agentAccount, "Client only");

        _txn.clientAccount = msg.sender;

        require(
            IERC20Upgradeable(tokenAddress).balanceOf(
                address(_txn.agentAccount)
            ) > _txn.totalAmount,
            "Insufficient balance"
        );

        _txn.conversionRate = _conversionRate;
        _txn.status = Status.PAIRED;
        _txn.account.clientName = _clientName;
        _txn.account.clientPhoneNumber = _clientPhoneNumber;
        _txn.clientKey = _clientKey;
        _txn.clientPairedIndex = _addToPairing(_txn.clientAccount, _txn.id);

        require(
            IERC20Upgradeable(tokenAddress).transferFrom(
                _txn.agentAccount,
                address(this),
                _txn.totalAmount
            ),
            "Insufficient balance"
        );

        _removeFromRequests(_txn.requestIndex);
        _addToHistory(msg.sender, _txn.id);

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
        string calldata _reason
    ) public onRequestOnly(_txnId) whenNotPaused nonReentrant {
        Transaction storage _txn = transactions[_txnId];

        _txn.totalAmount = 0;
        _txn.agentFee = 0;
        _txn.treasuryFee = 0;
        _removeFromRequests(_txn.requestIndex);
        _removeFromPaired(_txn.id);
        _txn.status = Status.CANCELLED;

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
        string calldata _resolution
    ) public whenNotPaused nonReentrant {
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
     * @dev Compute the agent fee
     */
    function getAgentFee(uint256 _amount) public view returns (uint256) {
        return (_amount * SargoFee(feeAddress).agentFeeRate()) / 1 ether / 100;
    }

    /**
     * @dev Compute treasury fee
     */
    function getTreasuryFee(uint256 _amount) public view returns (uint256) {
        return
            (_amount * SargoFee(feeAddress).treasuryFeeRate()) / 1 ether / 100;
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
     * @dev Get the length of transactions in request state
     * @notice returns the number of transactions on the requests feed
     **/
    function getRequestsLength() public view returns (uint256) {
        return requests[Status.REQUEST].length;
    }

    /**
     * @dev Get the length of transactions in paired state
     * @notice returns the number of transactions on the current orders feed
     **/
    function getPairedLength(address _address) public view returns (uint256) {
        return pairing[_address].length;
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
            "TRANSFER",
            "",
            "",
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

        _txn.clientAccount = _recipient;
        _txn.status = Status.COMPLETED;
        _addToHistory(_recipient, _txn.id);

        emit Transfer(_txn.id, _txn.timestamp, _txn);
    }

    /**
     * @notice Transafer tokens from the contract to the provided recipient account
     */
    function credit(
        address _recipient,
        uint256 _amount,
        string calldata _currencyCode,
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

        uint256 _txnId = _initializeTransaction(
            TransactionType.TRANSFER,
            _amount,
            _currencyCode,
            _conversionRate,
            "TRANSFER",
            "SARGO",
            "",
            "",
            ""
        );

        Transaction storage _txn = transactions[_txnId];

        require(_txn.txType == TransactionType.TRANSFER, "Invalid tx type");
        require(
            IERC20Upgradeable(tokenAddress).transfer(_recipient, _amount),
            "Transfer failed"
        );

        _txn.clientAccount = _recipient;
        _addToHistory(_recipient, _txn.id);

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

        _txn.status = _status;
        emit TransactionStatus(_txn.id, _txn.timestamp, _txn);
    }
}

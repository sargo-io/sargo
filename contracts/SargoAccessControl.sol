// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.17;

 import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title SargoAccessControl
 */
contract SargoAccessControl is AccessControl {

    bytes32 private constant ADMIN = keccak256(abi.encodePacked('ADMIN'));
    bytes32 private constant USER = keccak256(abi.encodePacked('USER'));

    mapping(bytes32 => mapping(address => bool)) private _roles;

    constructor() {
        _add(ADMIN, msg.sender);
    }

    event RoleGranted(bytes32 indexed role, address indexed account);
    event RoleRevoked(bytes32 indexed role, address indexed account);

    modifier isAuthorized(bytes32 role) {
        require(isAdmin(msg.sender), 
        'Account not authorised');
        _;
    }

    /**
     * @dev Add an account to roles
     * @param role The role
     * @param account The address to add
     */
    function grant(bytes32 role, address account) 
        external isAuthorized(ADMIN) {
        _add(role, account);
    }

    /**
     * @dev Revoke account role
     * @param role The role
     * @param account The address revoke role
     */
    function revoke(bytes32 role, address account) 
        external isAuthorized(ADMIN) {
        _remove(role, account);
    }

    /**
     * @dev Internal function to add account to role
     * @param role The role
     * @param account The address to add
     */
    function _add(bytes32 role, address account) internal {
        _roles[role][account] = true;
        emit RoleGranted(role, account);
    }

    /**
     * @dev Internal function to remove account from roles
     * @param role The role
     * @param account The address to remove
     */
    function _remove(bytes32 role, address account) internal {
        delete _roles[role][account];
        emit RoleRevoked(role, account);
    }

    /**
     * @dev Check if account passed has admin role
     * @param account The address to check
     * @return bool
     */
    function isAdmin(address account) 
        public view returns(bool) {
        return _roles[ADMIN][account];
    }

    /**
     * @dev Check if the passed address exists in role
     * @param role The role
     * @param account The address to check
     * @return bool
     */
    function exists(bytes32 role, address account) 
        public view returns(bool) {
        
        return _roles[role][account];
    }

    /**
     * @dev To bytes helper function
     * @param str String to convert
     * @return bytes32 hash 
     */
     function strRoleToBytesHash(string memory str) 
        public pure returns (bytes32) {
        return keccak256(abi.encodePacked(str));
    }

}
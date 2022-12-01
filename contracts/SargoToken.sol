// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.17;

 import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
 import "hardhat/console.sol";
 import './Ownable.sol';
 import './Pausable.sol';
 import './Math.sol';

/** 
 * @title Sargo token contract
 * @dev Sargo ERC20 token contract 
 * and value transfer 
 */
contract SargoToken is IERC20, Ownable, Pausable {
    /**
     * @dev Safe math library
     */
    using Math for uint256;

    string public name;
    string public symbol;
    uint256 public totalSupply;
    uint8 public decimals;

    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    constructor(
        uint256 initialSupply_,
        string memory name_,
        uint8 decimals_,
        string memory symbol_
    ) {
        totalSupply = initialSupply_;
        balanceOf[msg.sender] = initialSupply_;
        name = name_;
        decimals = decimals_;
        symbol = symbol_;
    }

    function transfer(address recipient, uint256 amount) public returns (bool) {
        require(recipient != address(this));
        require(recipient != address(0), "Cannot use zero address");
        require(amount > 0, "Cannot use zero value");
        require (balanceOf[msg.sender] >= amount, "Balance not enough");
        require (balanceOf[recipient] + amount >= balanceOf[recipient], "Overflow" );
        
        uint256 previousBalances = balanceOf[msg.sender] + balanceOf[recipient];          
        balanceOf[msg.sender] = Math.sub(balanceOf[msg.sender], amount);
        balanceOf[recipient] = Math.add(balanceOf[recipient], amount);
        
        emit Transfer(msg.sender, recipient, amount);
        assert(balanceOf[msg.sender] + balanceOf[recipient] == previousBalances);

        return true;
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        require (amount > 0, "Cannot use zero");
        allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        
        return true;
    }

    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool) {
        require(recipient != address(0), "Cannot use zero address");
        require(amount > 0, "Cannot use zero value");
        require( balanceOf[sender] >= amount, "Balance not enough" );
        require( balanceOf[recipient] + amount > balanceOf[recipient], "Cannot overflow" );
        require( amount <= allowance[sender][msg.sender], "Cannot over allowance");
        
        allowance[sender][msg.sender] = Math.sub(allowance[sender][msg.sender], amount);
        balanceOf[sender] = Math.sub(balanceOf[sender], amount);
        balanceOf[recipient] = Math.add(balanceOf[recipient], amount);
        emit Transfer(sender, recipient, amount);

        return true;
    }

    function transferBatch(address[] memory recipients, uint256[] memory amounts) external returns (bool) {
        require(recipients.length <= 200, "Too many recipients");

        for(uint256 i = 0; i < recipients.length; i++) {
            transfer(recipients[i], amounts[i]);
        }

        return true;
    }

    function mint(address recipient , uint256 amount) external whenActive onlyCreator canMint returns (bool){
        require(recipient != address(0), "Cannot use zero address");
        require(balanceOf[recipient] + amount > balanceOf[recipient]);
        require(totalSupply + amount > totalSupply);

        balanceOf[recipient] = Math.add(balanceOf[recipient], amount);
        totalSupply = Math.add(totalSupply, amount);
        emit Transfer(address(0), recipient, amount);

        return true;
    }

    function burn(uint256 amount) external whenActive onlyDestroyer {
        require(balanceOf[destroyer] >= amount && amount > 0);

        balanceOf[destroyer] = Math.sub(balanceOf[destroyer], amount);
        totalSupply = Math.sub(totalSupply, amount);
        emit Transfer(destroyer, address(0), amount);
    }

}
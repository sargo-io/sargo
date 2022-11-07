// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.17;

/**
 * @title Math library
 * @dev Math operations with safety checks
 */
library Math {

    /**
     * @dev Safe addition
     * @param num1 First operand
     * @param num2 Second operand
     * @return uint256
     */
    function add(uint256 num1, uint256 num2) 
        internal pure returns (uint256) {
        uint256 res = num1 + num2;
        require(res >= num1, "Math.add: addition overflow");

        return res;
    }

    /**
     * @dev Safe subtraction
     * @param num1 First operand
     * @param num2 Second operand
     * @return uint256
     */
    function sub(uint256 num1, uint256 num2) 
        internal pure returns (uint256) {
        require(num2 <= num1, "Math.sub: subtraction overflow");
        uint256 res = num1 - num2;

        return res;
    }

    /**
     * @dev Safe multiplication
     * @param num1 First operand
     * @param num2 Second operand
     * @return uint256
     */
    function mul(uint256 num1, uint256 num2) 
        internal pure returns (uint256) {
        if (num1 == 0) 
            return 0;

        uint256 res = num1 * num2;
        require(res / num1 == num2, "Math.mul: multiplication overflow");

        return res;
    }

    /**
     * @dev Safe division
     * @param num1 First operand
     * @param num2 Second operand
     * @return uint256
     */
    function div(uint256 num1, uint256 num2) 
        internal pure returns (uint256) {
        require(num2 > 0, "Math.div: division by zero");
        uint256 res = num1 / num2;

        return res;
    }

    /**
     * @dev Safe modulo operation
     * @param num1 First operand
     * @param num2 Second operand
     * @return uint256
     */
    function mod(uint256 num1, uint256 num2) 
        internal pure returns (uint256) {
        require(num2 != 0, "Math.mod: modulo by zero");
        
        return num1 % num2;
    }

    /**
     * @dev Safe exponential
     * @param num Number
     * @param exponent Exponent value
     * @return uint256
     */
    function pow(uint256 num, uint256 exponent) 
        internal pure returns (uint256) {
        if (num == 0) 
            return 0;

        if (exponent == 0) 
            return 1;

        return num ** exponent;
    }

    /**
     * @dev Convert num to ether wei
     * @param num Number to convert to wei
     * @return uint256
     */
    function toWei(uint256 num) internal pure returns (uint256) {
        if (num == 0) 
            return 0;
        
        return num * 1 ether;
    }

    /**
     * @dev Convert ether wei value to decimal value
     * @param num Number to convert
     * @return uint256
     */
    function fromWei(uint256 num) internal pure returns (uint256) {
        if (num == 0) 
            return 0;
        
        return num / 1 ether;
    }

}

/**
 * @title Math library test helper
 * @dev Test helper for the Math library functionality
 */
contract TestMathUtil {
    function add(uint256 num1, uint256 num2) 
        public pure returns (uint256) { 
        return Math.add(num1, num2); 
    }
    function sub(uint256 num1, uint256 num2) 
        public pure returns (uint256) { 
        return Math.sub(num1, num2); 
    }
    function mul(uint256 num1, uint256 num2) 
        public pure returns (uint256) { 
        return Math.mul(num1, num2); 
    }
    function div(uint256 num1, uint256 num2) 
        public pure returns (uint256) { 
        return Math.div(num1, num2); 
    }
    function mod(uint256 num1, uint256 num2) 
        public pure returns (uint256) { 
        return Math.mod(num1, num2); 
    }
    function pow(uint256 num, uint256 exponent) 
        public pure returns (uint256) { 
        return Math.pow(num, exponent); 
    }
    function toWei(uint256 num) 
        public pure returns (uint256) { 
        return Math.toWei(num); 
    }
    function fromWei(uint256 num) 
        public pure returns (uint256) { 
        return Math.fromWei(num); 
    }
    
} 
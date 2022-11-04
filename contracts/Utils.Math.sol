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
    function safeAdd(uint256 num1, uint256 num2) 
        internal pure returns (uint256) {
        uint256 res = num1 + num2;
        require(res >= num1, "Math.safeAdd: addition overflow");

        return res;
    }

    /**
     * @dev Safe subtraction
     * @param num1 First operand
     * @param num2 Second operand
     * @return uint256
     */
    function safeSub(uint256 num1, uint256 num2) 
        internal pure returns (uint256) {
        require(num2 <= num1, "Math.safeSub: subtraction overflow");
        uint256 res = num1 - num2;

        return res;
    }

    /**
     * @dev Safe multiplication
     * @param num1 First operand
     * @param num2 Second operand
     * @return uint256
     */
    function safeMul(uint256 num1, uint256 num2) 
        internal pure returns (uint256) {
        if (num1 == 0) 
            return 0;

        uint256 res = num1 * num2;
        require(res / num1 == num2, "Math.safeMul: multiplication overflow");

        return res;
    }

    /**
     * @dev Safe division
     * @param num1 First operand
     * @param num2 Second operand
     * @return uint256
     */
    function safeDiv(uint256 num1, uint256 num2) 
        internal pure returns (uint256) {
        require(num2 > 0, "Math.safeDiv: division by zero");
        uint256 res = num1 / num2;

        return res;
    }

    /**
     * @dev Safe modulo operation
     * @param num1 First operand
     * @param num2 Second operand
     * @return uint256
     */
    function safeMod(uint256 num1, uint256 num2) 
        internal pure returns (uint256) {
        require(num2 != 0, "Math.safeMod: modulo by zero");
        
        return num1 % num2;
    }

    /**
     * @dev Safe exponential
     * @param num Number
     * @param exponent Exponent value
     * @return uint256
     */
    function safePow(uint256 num, uint256 exponent) 
        internal pure returns (uint256) {
        if (num == 0) 
            return 0;

        if (exponent == 0) 
            return 1;

        return num ** exponent;
    }

    /** TODO: amount to wei/cUSD/ether... conversions */
    function safeWei(uint256 num) internal pure returns (uint256) {
        if (num == 0) 
            return 0;
        
        return num * 1 ether;
    }

    /** TODO: amount from cUSD/wei/ether... conversions */
    function weiToUsd(uint256 num) internal pure returns (uint256) {
        if (num == 0) 
            return 0;
        
        return num / 1 ether;
    }

    



}
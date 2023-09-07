// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.17;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

/**
 * @title SargoFee
 * @dev Maintain Sargo fee parameters
 */
contract SargoFee is Initializable, UUPSUpgradeable, OwnableUpgradeable {
    uint256 public agentFee;
    uint256 public treasuryFee;

    function initialize(
        uint256 _agentFee,
        uint256 _treasuryFee
    ) public initializer {
        __Ownable_init();
        __UUPSUpgradeable_init();
        require(_agentFee > 0, "Agent fee");
        require(_treasuryFee > 0, "Treasury fee");
        agentFee = _agentFee;
        treasuryFee = _treasuryFee;
    }

    function _authorizeUpgrade(
        address newImplementation
    ) internal override onlyOwner {}

    event FeeSet(string feeName, uint256 fee);

    /**
     * @dev Set Agent fee value
     * @notice The fee earned as commision
     **/
    function setAgentFee(uint256 _agentFee) external onlyOwner {
        require(_agentFee > 0, "Agent fee");
        agentFee = _agentFee;

        emit FeeSet("AgentFee", agentFee);
    }

    /**
     * @dev Set treasury fee value
     * @notice The fee retained by Sargo
     **/
    function setTreasuryFee(uint256 _treasuryFee) external onlyOwner {
        require(_treasuryFee > 0, "Treasury fee");
        treasuryFee = _treasuryFee;
        emit FeeSet("treasuryFee", treasuryFee);
    }
}

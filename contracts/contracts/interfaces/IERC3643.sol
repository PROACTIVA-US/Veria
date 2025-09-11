// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title IERC3643
 * @dev Interface for ERC-3643 compliant security tokens
 * ERC-3643 is the standard for permissioned tokens with transfer restrictions
 */
interface IERC3643 is IERC20 {
    // Events
    event IdentityRegistryAdded(address indexed _identityRegistry);
    event ComplianceAdded(address indexed _compliance);
    event UpdatedTokenInformation(string _newName, string _newSymbol);
    event Paused(address indexed _userAddress);
    event Unpaused(address indexed _userAddress);
    event TokensFrozen(address indexed _owner, uint256 _amount);
    event TokensUnfrozen(address indexed _owner, uint256 _amount);
    event RecoverySuccess(address indexed _lostWallet, address indexed _newWallet, address indexed _investorOnchainID);

    // Functions
    function identityRegistry() external view returns (address);
    function compliance() external view returns (address);
    function paused() external view returns (bool);
    function isFrozen(address _userAddress) external view returns (bool);
    function getFrozenTokens(address _userAddress) external view returns (uint256);
    
    function setIdentityRegistry(address _identityRegistry) external;
    function setCompliance(address _compliance) external;
    function setName(string calldata _name) external;
    function setSymbol(string calldata _symbol) external;
    function setOnchainID(address _onchainID) external;
    
    function pause() external;
    function unpause() external;
    function freezePartialTokens(address _userAddress, uint256 _amount) external;
    function unfreezePartialTokens(address _userAddress, uint256 _amount) external;
    function recoveryAddress(address _lostWallet, address _newWallet, address _investorOnchainID) external;
    
    function mint(address _to, uint256 _amount) external;
    function burn(address _userAddress, uint256 _amount) external;
    function forcedTransfer(address _from, address _to, uint256 _amount) external returns (bool);
    function batchTransfer(address[] calldata _toList, uint256[] calldata _amounts) external;
    function batchForcedTransfer(address[] calldata _fromList, address[] calldata _toList, uint256[] calldata _amounts) external;
}
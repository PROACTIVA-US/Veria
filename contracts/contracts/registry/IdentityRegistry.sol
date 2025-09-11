// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./IIdentityRegistry.sol";

/**
 * @title IdentityRegistry
 * @dev Implementation of identity registry for ERC-3643 compliance
 * Manages the link between wallet addresses and on-chain identities
 */
contract IdentityRegistry is IIdentityRegistry, Ownable {
    // Storage
    mapping(address => address) private _identities;
    mapping(address => uint256) private _countries;
    mapping(address => bool) private _agents;
    
    address private _identityStorage;
    address private _topicsRegistry;
    
    modifier onlyAgent() {
        require(_agents[msg.sender] || msg.sender == owner(), "Only agent or owner");
        _;
    }
    
    constructor() Ownable(msg.sender) {
        _agents[msg.sender] = true;
    }
    
    // Agent Management
    
    function addAgent(address _agent) external override onlyOwner {
        require(_agent != address(0), "Invalid agent address");
        _agents[_agent] = true;
        emit IdentityRegistryAgentAdded(_agent);
    }
    
    function removeAgent(address _agent) external override onlyOwner {
        require(_agents[_agent], "Agent does not exist");
        delete _agents[_agent];
        emit IdentityRegistryAgentRemoved(_agent);
    }
    
    function isAgent(address _agent) external view override returns (bool) {
        return _agents[_agent];
    }
    
    // Identity Management
    
    function registerIdentity(
        address _userAddress,
        address _identity,
        uint256 _country
    ) external override onlyAgent {
        require(_userAddress != address(0), "Invalid user address");
        require(_identity != address(0), "Invalid identity address");
        require(_identities[_userAddress] == address(0), "Identity already registered");
        
        _identities[_userAddress] = _identity;
        _countries[_userAddress] = _country;
        
        emit IdentityAdded(_userAddress, _identity, _country);
    }
    
    function updateIdentity(address _userAddress, address _identity) external override onlyAgent {
        require(_userAddress != address(0), "Invalid user address");
        require(_identity != address(0), "Invalid identity address");
        require(_identities[_userAddress] != address(0), "Identity not found");
        
        address oldIdentity = _identities[_userAddress];
        _identities[_userAddress] = _identity;
        
        emit IdentityRemoved(_userAddress, oldIdentity);
        emit IdentityAdded(_userAddress, _identity, _countries[_userAddress]);
        emit IdentityUpdated(_userAddress, _identity);
    }
    
    function updateCountry(address _userAddress, uint256 _country) external override onlyAgent {
        require(_userAddress != address(0), "Invalid user address");
        require(_identities[_userAddress] != address(0), "Identity not found");
        
        _countries[_userAddress] = _country;
        emit CountryUpdated(_userAddress, _country);
    }
    
    function deleteIdentity(address _userAddress) external override onlyAgent {
        require(_userAddress != address(0), "Invalid user address");
        require(_identities[_userAddress] != address(0), "Identity not found");
        
        address identityToRemove = _identities[_userAddress];
        delete _identities[_userAddress];
        delete _countries[_userAddress];
        
        emit IdentityRemoved(_userAddress, identityToRemove);
    }
    
    // View Functions
    
    function isVerified(address _userAddress) external view override returns (bool) {
        return _identities[_userAddress] != address(0);
    }
    
    function identity(address _userAddress) external view override returns (address) {
        return _identities[_userAddress];
    }
    
    function investorCountry(address _userAddress) external view override returns (uint256) {
        return _countries[_userAddress];
    }
    
    // Configuration
    
    function setIdentityRegistryStorage(address _identityRegistryStorage) external override onlyOwner {
        _identityStorage = _identityRegistryStorage;
        emit StorageSet(_identityRegistryStorage);
    }
    
    function setClaimTopicsRegistry(address _claimTopicsRegistry) external override onlyOwner {
        _topicsRegistry = _claimTopicsRegistry;
        emit TopicsRegistrySet(_claimTopicsRegistry);
    }
    
    function identityStorage() external view override returns (address) {
        return _identityStorage;
    }
    
    function topicsRegistry() external view override returns (address) {
        return _topicsRegistry;
    }
    
    // Batch Operations
    
    function batchRegisterIdentity(
        address[] calldata _userAddresses,
        address[] calldata _identitiesArr,
        uint256[] calldata _countriesArr
    ) external override onlyAgent {
        require(
            _userAddresses.length == _identitiesArr.length && 
            _identitiesArr.length == _countriesArr.length,
            "Arrays length mismatch"
        );
        
        for (uint256 i = 0; i < _userAddresses.length; i++) {
            if (_identities[_userAddresses[i]] == address(0)) {
                _identities[_userAddresses[i]] = _identitiesArr[i];
                _countries[_userAddresses[i]] = _countriesArr[i];
                emit IdentityAdded(_userAddresses[i], _identitiesArr[i], _countriesArr[i]);
            }
        }
    }
}
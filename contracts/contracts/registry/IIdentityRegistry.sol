// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IIdentityRegistry
 * @dev Interface for managing on-chain identities for ERC-3643 compliance
 */
interface IIdentityRegistry {
    // Events
    event IdentityAdded(address indexed investorAddress, address indexed identity, uint256 country);
    event IdentityRemoved(address indexed investorAddress, address indexed identity);
    event IdentityUpdated(address indexed investorAddress, address indexed identity);
    event CountryUpdated(address indexed investorAddress, uint256 country);
    event IdentityRegistryAgentAdded(address indexed agent);
    event IdentityRegistryAgentRemoved(address indexed agent);
    event TopicsRegistrySet(address indexed topicsRegistry);
    event StorageSet(address indexed identityStorage);
    
    // Functions
    function addAgent(address _agent) external;
    function removeAgent(address _agent) external;
    function isAgent(address _agent) external view returns (bool);
    
    function registerIdentity(
        address _userAddress,
        address _identity,
        uint256 _country
    ) external;
    
    function updateIdentity(address _userAddress, address _identity) external;
    function updateCountry(address _userAddress, uint256 _country) external;
    function deleteIdentity(address _userAddress) external;
    
    function isVerified(address _userAddress) external view returns (bool);
    function identity(address _userAddress) external view returns (address);
    function investorCountry(address _userAddress) external view returns (uint256);
    
    function setIdentityRegistryStorage(address _identityRegistryStorage) external;
    function setClaimTopicsRegistry(address _claimTopicsRegistry) external;
    
    function identityStorage() external view returns (address);
    function topicsRegistry() external view returns (address);
    
    // Batch operations
    function batchRegisterIdentity(
        address[] calldata _userAddresses,
        address[] calldata _identitiesArr,
        uint256[] calldata _countriesArr
    ) external;
}
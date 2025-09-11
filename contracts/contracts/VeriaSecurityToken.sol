// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./interfaces/IERC3643.sol";
import "./registry/IIdentityRegistry.sol";
import "./compliance/ICompliance.sol";

/**
 * @title VeriaSecurityToken
 * @dev ERC-3643 compliant security token for tokenized Real World Assets
 * Implements transfer restrictions, compliance checks, and identity management
 */
contract VeriaSecurityToken is IERC3643, ERC20, Ownable {
    // Token information
    string private _tokenName;
    string private _tokenSymbol;
    uint8 private constant _tokenDecimals = 18;
    address private _onchainID;
    
    // Compliance contracts
    IIdentityRegistry private _identityRegistry;
    ICompliance private _compliance;
    
    // Frozen tokens tracking
    mapping(address => uint256) private _frozenTokens;
    
    // Pausable state
    bool private _paused;
    
    // Agent roles
    mapping(address => bool) public isAgent;
    
    // Events
    event AgentAdded(address indexed _agent);
    event AgentRemoved(address indexed _agent);
    
    // Modifiers
    modifier onlyAgent() {
        require(isAgent[msg.sender] || msg.sender == owner(), "Only agent or owner");
        _;
    }
    
    modifier whenNotPaused() {
        require(!_paused, "Token transfers are paused");
        _;
    }
    
    constructor(
        string memory name_,
        string memory symbol_,
        uint256 _totalSupply,
        address _identityRegistryAddr,
        address _complianceAddr
    ) ERC20(name_, symbol_) Ownable(msg.sender) {
        _tokenName = name_;
        _tokenSymbol = symbol_;
        _identityRegistry = IIdentityRegistry(_identityRegistryAddr);
        _compliance = ICompliance(_complianceAddr);
        
        // Mint initial supply to owner
        if (_totalSupply > 0) {
            _mint(msg.sender, _totalSupply);
        }
    }
    
    // ERC-3643 Implementation
    
    function setIdentityRegistry(address _identityRegistryAddr) external override onlyOwner {
        _identityRegistry = IIdentityRegistry(_identityRegistryAddr);
        emit IdentityRegistryAdded(_identityRegistryAddr);
    }
    
    function setCompliance(address _complianceAddr) external override onlyOwner {
        _compliance = ICompliance(_complianceAddr);
        emit ComplianceAdded(_complianceAddr);
    }
    
    function setName(string calldata _name) external override onlyOwner {
        _tokenName = _name;
        emit UpdatedTokenInformation(_name, _tokenSymbol);
    }
    
    function setSymbol(string calldata _symbol) external override onlyOwner {
        _tokenSymbol = _symbol;
        emit UpdatedTokenInformation(_tokenName, _symbol);
    }
    
    function setOnchainID(address _newOnchainID) external override onlyOwner {
        _onchainID = _newOnchainID;
    }
    
    function pause() external override onlyAgent {
        _paused = true;
        emit Paused(msg.sender);
    }
    
    function unpause() external override onlyAgent {
        _paused = false;
        emit Unpaused(msg.sender);
    }
    
    function freezePartialTokens(address _userAddress, uint256 _amount) external override onlyAgent {
        require(_amount <= balanceOf(_userAddress) - _frozenTokens[_userAddress], "Insufficient free balance");
        _frozenTokens[_userAddress] += _amount;
        emit TokensFrozen(_userAddress, _amount);
    }
    
    function unfreezePartialTokens(address _userAddress, uint256 _amount) external override onlyAgent {
        require(_frozenTokens[_userAddress] >= _amount, "Insufficient frozen balance");
        _frozenTokens[_userAddress] -= _amount;
        emit TokensUnfrozen(_userAddress, _amount);
    }
    
    function isFrozen(address _userAddress) external view override returns (bool) {
        return _frozenTokens[_userAddress] > 0;
    }
    
    function getFrozenTokens(address _userAddress) external view override returns (uint256) {
        return _frozenTokens[_userAddress];
    }
    
    function mint(address _to, uint256 _amount) external override onlyAgent {
        require(_identityRegistry.isVerified(_to), "Identity not verified");
        _mint(_to, _amount);
    }
    
    function burn(address _userAddress, uint256 _amount) external override {
        require(msg.sender == _userAddress || isAgent[msg.sender] || msg.sender == owner(), 
                "Not authorized to burn");
        _burn(_userAddress, _amount);
    }
    
    function forcedTransfer(
        address _from,
        address _to,
        uint256 _amount
    ) external override onlyAgent returns (bool) {
        require(_identityRegistry.isVerified(_to), "Recipient identity not verified");
        _transfer(_from, _to, _amount);
        return true;
    }
    
    function batchTransfer(
        address[] calldata _toList,
        uint256[] calldata _amounts
    ) external override {
        require(_toList.length == _amounts.length, "Arrays length mismatch");
        
        for (uint256 i = 0; i < _toList.length; i++) {
            transfer(_toList[i], _amounts[i]);
        }
    }
    
    function batchForcedTransfer(
        address[] calldata _fromList,
        address[] calldata _toList,
        uint256[] calldata _amounts
    ) external override onlyAgent {
        require(_fromList.length == _toList.length && _toList.length == _amounts.length, 
                "Arrays length mismatch");
        
        for (uint256 i = 0; i < _fromList.length; i++) {
            require(_identityRegistry.isVerified(_toList[i]), "Recipient identity not verified");
            _transfer(_fromList[i], _toList[i], _amounts[i]);
        }
    }
    
    function recoveryAddress(
        address _lostWallet,
        address _newWallet,
        address _investorOnchainID
    ) external override onlyAgent {
        require(_identityRegistry.isVerified(_newWallet), "New wallet not verified");
        require(_identityRegistry.identity(_lostWallet) == _investorOnchainID, "Identity mismatch");
        
        uint256 balance = balanceOf(_lostWallet);
        _transfer(_lostWallet, _newWallet, balance);
        
        emit RecoverySuccess(_lostWallet, _newWallet, _investorOnchainID);
    }
    
    // Override transfer functions to add compliance checks
    
    function _update(
        address from,
        address to,
        uint256 amount
    ) internal whenNotPaused override {
        // Skip checks for minting and burning
        if (from != address(0) && to != address(0)) {
            // Check identities are verified
            require(_identityRegistry.isVerified(from), "Sender identity not verified");
            require(_identityRegistry.isVerified(to), "Recipient identity not verified");
            
            // Check frozen tokens
            require(balanceOf(from) - _frozenTokens[from] >= amount, "Insufficient unfrozen balance");
            
            // Check compliance rules
            require(_compliance.canTransfer(from, to, amount), "Transfer not compliant");
        }
        
        // Call parent implementation
        super._update(from, to, amount);
    }
    
    // Agent management
    
    function addAgent(address _agent) external onlyOwner {
        isAgent[_agent] = true;
        emit AgentAdded(_agent);
    }
    
    function removeAgent(address _agent) external onlyOwner {
        isAgent[_agent] = false;
        emit AgentRemoved(_agent);
    }
    
    // Override name and symbol to return custom values
    
    function name() public view override returns (string memory) {
        return _tokenName;
    }
    
    function symbol() public view override returns (string memory) {
        return _tokenSymbol;
    }
    
    function decimals() public pure override returns (uint8) {
        return _tokenDecimals;
    }
    
    function onchainID() public view returns (address) {
        return _onchainID;
    }
    
    function identityRegistry() external view override returns (address) {
        return address(_identityRegistry);
    }
    
    function compliance() external view override returns (address) {
        return address(_compliance);
    }
    
    function paused() external view override returns (bool) {
        return _paused;
    }
}
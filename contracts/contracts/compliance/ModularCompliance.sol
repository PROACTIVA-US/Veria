// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./ICompliance.sol";
import "../registry/IIdentityRegistry.sol";
import "../interfaces/IERC3643.sol";

/**
 * @title ModularCompliance
 * @dev Modular compliance system for ERC-3643 tokens
 * Implements various compliance rules that can be added/removed dynamically
 */
contract ModularCompliance is ICompliance, Ownable {
    // Compliance IDs
    uint256 public constant COUNTRY_RESTRICTION = 1;
    uint256 public constant INVESTOR_LIMIT = 2;
    uint256 public constant HOLDING_LIMIT = 3;
    uint256 public constant DAILY_LIMIT = 4;
    uint256 public constant WHITELIST_ONLY = 5;
    
    // Storage
    address private _tokenBound;
    mapping(uint256 => bool) private _complianceRules;
    uint256[] private _complianceIds;
    
    // Country restrictions (compliance ID 1)
    mapping(uint256 => bool) private _restrictedCountries;
    
    // Investor limits (compliance ID 2)
    uint256 private _maxInvestors = 200;
    mapping(address => bool) private _hasHoldings;
    uint256 private _currentInvestors;
    
    // Holding limits (compliance ID 3)
    uint256 private _maxHoldingPercentage = 10; // 10% max per investor
    
    // Daily transfer limits (compliance ID 4)
    mapping(address => mapping(uint256 => uint256)) private _dailyTransfers;
    uint256 private _dailyLimit = 1000000 * 10**18; // 1M tokens per day
    
    // Whitelist (compliance ID 5)
    mapping(address => bool) private _whitelist;
    bool private _whitelistEnabled;
    
    modifier onlyToken() {
        require(msg.sender == _tokenBound, "Only bound token can call");
        _;
    }
    
    constructor() Ownable(msg.sender) {
        // Add default compliance rules
        _addCompliance(COUNTRY_RESTRICTION);
        _addCompliance(INVESTOR_LIMIT);
        _addCompliance(HOLDING_LIMIT);
    }
    
    // Token binding
    
    function bindToken(address _token) external override onlyOwner {
        require(_token != address(0), "Invalid token address");
        require(_tokenBound == address(0), "Token already bound");
        _tokenBound = _token;
        emit TokenBound(_token);
    }
    
    function unbindToken(address _token) external override onlyOwner {
        require(_token == _tokenBound, "Token not bound");
        _tokenBound = address(0);
        emit TokenUnbound(_token);
    }
    
    function isTokenBound(address _token) external view override returns (bool) {
        return _token == _tokenBound;
    }
    
    // Compliance management
    
    function addCompliance(uint256 _complianceId) external override onlyOwner {
        _addCompliance(_complianceId);
    }
    
    function _addCompliance(uint256 _complianceId) private {
        require(!_complianceRules[_complianceId], "Compliance already added");
        _complianceRules[_complianceId] = true;
        _complianceIds.push(_complianceId);
        emit ComplianceAdded(_complianceId);
    }
    
    function removeCompliance(uint256 _complianceId) external override onlyOwner {
        require(_complianceRules[_complianceId], "Compliance not found");
        _complianceRules[_complianceId] = false;
        
        // Remove from array
        for (uint256 i = 0; i < _complianceIds.length; i++) {
            if (_complianceIds[i] == _complianceId) {
                _complianceIds[i] = _complianceIds[_complianceIds.length - 1];
                _complianceIds.pop();
                break;
            }
        }
        
        emit ComplianceRemoved(_complianceId);
    }
    
    function replaceCompliance(
        uint256 _oldComplianceId,
        uint256 _newComplianceId
    ) external override onlyOwner {
        require(_complianceRules[_oldComplianceId], "Old compliance not found");
        require(!_complianceRules[_newComplianceId], "New compliance already added");
        
        _complianceRules[_oldComplianceId] = false;
        _complianceRules[_newComplianceId] = true;
        
        // Replace in array
        for (uint256 i = 0; i < _complianceIds.length; i++) {
            if (_complianceIds[i] == _oldComplianceId) {
                _complianceIds[i] = _newComplianceId;
                break;
            }
        }
        
        emit ComplianceReplaced(_oldComplianceId, _newComplianceId);
    }
    
    // Transfer validation
    
    function canTransfer(
        address _from,
        address _to,
        uint256 _amount
    ) external view override returns (bool) {
        if (_tokenBound == address(0)) return false;
        
        IERC3643 token = IERC3643(_tokenBound);
        IIdentityRegistry registry = IIdentityRegistry(token.identityRegistry());
        
        // Check country restrictions
        if (_complianceRules[COUNTRY_RESTRICTION]) {
            uint256 toCountry = registry.investorCountry(_to);
            if (_restrictedCountries[toCountry]) {
                return false;
            }
        }
        
        // Check investor limit
        if (_complianceRules[INVESTOR_LIMIT]) {
            if (!_hasHoldings[_to] && _currentInvestors >= _maxInvestors) {
                return false;
            }
        }
        
        // Check holding limit
        if (_complianceRules[HOLDING_LIMIT]) {
            uint256 totalSupply = token.totalSupply();
            uint256 maxHolding = (totalSupply * _maxHoldingPercentage) / 100;
            if (token.balanceOf(_to) + _amount > maxHolding) {
                return false;
            }
        }
        
        // Check daily limit
        if (_complianceRules[DAILY_LIMIT]) {
            uint256 today = block.timestamp / 1 days;
            if (_dailyTransfers[_from][today] + _amount > _dailyLimit) {
                return false;
            }
        }
        
        // Check whitelist
        if (_complianceRules[WHITELIST_ONLY] && _whitelistEnabled) {
            if (!_whitelist[_from] || !_whitelist[_to]) {
                return false;
            }
        }
        
        return true;
    }
    
    // Transfer tracking
    
    function transferred(
        address _from,
        address _to,
        uint256 _amount
    ) external override onlyToken {
        // Update investor count
        if (_complianceRules[INVESTOR_LIMIT]) {
            IERC3643 token = IERC3643(_tokenBound);
            
            if (!_hasHoldings[_to] && token.balanceOf(_to) > 0) {
                _hasHoldings[_to] = true;
                _currentInvestors++;
            }
            
            if (_hasHoldings[_from] && token.balanceOf(_from) == 0) {
                _hasHoldings[_from] = false;
                _currentInvestors--;
            }
        }
        
        // Update daily transfers
        if (_complianceRules[DAILY_LIMIT]) {
            uint256 today = block.timestamp / 1 days;
            _dailyTransfers[_from][today] += _amount;
        }
    }
    
    function created(address _to, uint256 _amount) external override onlyToken {
        if (_complianceRules[INVESTOR_LIMIT]) {
            if (!_hasHoldings[_to] && _amount > 0) {
                _hasHoldings[_to] = true;
                _currentInvestors++;
            }
        }
    }
    
    function destroyed(address _from, uint256 _amount) external override onlyToken {
        if (_complianceRules[INVESTOR_LIMIT]) {
            IERC3643 token = IERC3643(_tokenBound);
            if (_hasHoldings[_from] && token.balanceOf(_from) == 0) {
                _hasHoldings[_from] = false;
                _currentInvestors--;
            }
        }
    }
    
    // View functions
    
    function isComplianceAdded(uint256 _complianceId) external view override returns (bool) {
        return _complianceRules[_complianceId];
    }
    
    function getComplianceIds() external view override returns (uint256[] memory) {
        return _complianceIds;
    }
    
    // Configuration functions
    
    function setRestrictedCountry(uint256 _countryCode, bool _restricted) external onlyOwner {
        _restrictedCountries[_countryCode] = _restricted;
    }
    
    function setMaxInvestors(uint256 _max) external onlyOwner {
        _maxInvestors = _max;
    }
    
    function setMaxHoldingPercentage(uint256 _percentage) external onlyOwner {
        require(_percentage <= 100, "Invalid percentage");
        _maxHoldingPercentage = _percentage;
    }
    
    function setDailyLimit(uint256 _limit) external onlyOwner {
        _dailyLimit = _limit;
    }
    
    function addToWhitelist(address _investor) external onlyOwner {
        _whitelist[_investor] = true;
    }
    
    function removeFromWhitelist(address _investor) external onlyOwner {
        _whitelist[_investor] = false;
    }
    
    function setWhitelistEnabled(bool _enabled) external onlyOwner {
        _whitelistEnabled = _enabled;
    }
}
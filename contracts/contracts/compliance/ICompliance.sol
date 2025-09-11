// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title ICompliance
 * @dev Interface for compliance rules and transfer restrictions
 */
interface ICompliance {
    // Events
    event TokenBound(address indexed token);
    event TokenUnbound(address indexed token);
    event ComplianceAdded(uint256 indexed complianceId);
    event ComplianceRemoved(uint256 indexed complianceId);
    event ComplianceReplaced(uint256 indexed oldComplianceId, uint256 indexed newComplianceId);
    
    // Functions
    function bindToken(address _token) external;
    function unbindToken(address _token) external;
    function isTokenBound(address _token) external view returns (bool);
    
    function addCompliance(uint256 _complianceId) external;
    function removeCompliance(uint256 _complianceId) external;
    function replaceCompliance(uint256 _oldComplianceId, uint256 _newComplianceId) external;
    
    function canTransfer(
        address _from,
        address _to,
        uint256 _amount
    ) external view returns (bool);
    
    function transferred(
        address _from,
        address _to,
        uint256 _amount
    ) external;
    
    function created(address _to, uint256 _amount) external;
    function destroyed(address _from, uint256 _amount) external;
    
    function isComplianceAdded(uint256 _complianceId) external view returns (bool);
    function getComplianceIds() external view returns (uint256[] memory);
}
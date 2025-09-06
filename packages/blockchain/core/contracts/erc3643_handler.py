"""
ERC-3643 Token Contract Handler for Veria Platform
Implements T-REX standard for regulated token exchanges
"""

import json
import logging
from typing import Optional, Dict, Any, List, Tuple
from dataclasses import dataclass
from enum import Enum
from decimal import Decimal

from web3 import Web3
from web3.contract import Contract
from web3.types import HexBytes, TxReceipt
from eth_typing import ChecksumAddress

from ..providers.polygon_provider import PolygonProvider


class ComplianceStatus(Enum):
    """Compliance status for investors"""
    NOT_VERIFIED = "not_verified"
    PENDING = "pending"
    VERIFIED = "verified"
    SUSPENDED = "suspended"
    REVOKED = "revoked"


@dataclass
class TokenMetadata:
    """Metadata for ERC-3643 token"""
    name: str
    symbol: str
    decimals: int
    total_supply: int
    version: str
    compliance_standard: str = "T-REX v4.0"


@dataclass
class InvestorInfo:
    """Investor compliance information"""
    address: ChecksumAddress
    country_code: str
    kyc_status: ComplianceStatus
    aml_status: ComplianceStatus
    accreditation_status: ComplianceStatus
    can_transfer: bool
    can_receive: bool
    frozen: bool


@dataclass
class TransferRequest:
    """Transfer request with compliance checks"""
    from_address: ChecksumAddress
    to_address: ChecksumAddress
    amount: int
    compliance_checked: bool = False
    gas_estimate: Optional[Dict[str, Any]] = None
    metadata: Optional[Dict[str, Any]] = None


class ERC3643Handler:
    """
    Handler for ERC-3643 compliant tokenized RWA interactions
    Implements T-REX standard with comprehensive compliance checks
    """
    
    # ERC-3643 Standard ABI (T-REX compliant)
    STANDARD_ABI = [
        # Basic ERC-20 functions
        {
            "inputs": [],
            "name": "name",
            "outputs": [{"name": "", "type": "string"}],
            "type": "function",
            "constant": True
        },
        {
            "inputs": [],
            "name": "symbol",
            "outputs": [{"name": "", "type": "string"}],
            "type": "function",
            "constant": True
        },
        {
            "inputs": [],
            "name": "decimals",
            "outputs": [{"name": "", "type": "uint8"}],
            "type": "function",
            "constant": True
        },
        {
            "inputs": [],
            "name": "totalSupply",
            "outputs": [{"name": "", "type": "uint256"}],
            "type": "function",
            "constant": True
        },
        {
            "inputs": [{"name": "account", "type": "address"}],
            "name": "balanceOf",
            "outputs": [{"name": "", "type": "uint256"}],
            "type": "function",
            "constant": True
        },
        {
            "inputs": [
                {"name": "recipient", "type": "address"},
                {"name": "amount", "type": "uint256"}
            ],
            "name": "transfer",
            "outputs": [{"name": "", "type": "bool"}],
            "type": "function"
        },
        # ERC-3643 Compliance functions
        {
            "inputs": [{"name": "_investor", "type": "address"}],
            "name": "isVerified",
            "outputs": [{"name": "", "type": "bool"}],
            "type": "function",
            "constant": True
        },
        {
            "inputs": [{"name": "_investor", "type": "address"}],
            "name": "isFrozen",
            "outputs": [{"name": "", "type": "bool"}],
            "type": "function",
            "constant": True
        },
        {
            "inputs": [
                {"name": "_from", "type": "address"},
                {"name": "_to", "type": "address"},
                {"name": "_amount", "type": "uint256"}
            ],
            "name": "canTransfer",
            "outputs": [{"name": "", "type": "bool"}],
            "type": "function",
            "constant": True
        },
        {
            "inputs": [
                {"name": "_to", "type": "address"},
                {"name": "_amount", "type": "uint256"}
            ],
            "name": "mint",
            "outputs": [],
            "type": "function"
        },
        {
            "inputs": [
                {"name": "_from", "type": "address"},
                {"name": "_amount", "type": "uint256"}
            ],
            "name": "burn",
            "outputs": [],
            "type": "function"
        },
        {
            "inputs": [{"name": "_investor", "type": "address"}],
            "name": "freezePartialTokens",
            "outputs": [],
            "type": "function"
        },
        {
            "inputs": [{"name": "_investor", "type": "address"}],
            "name": "unfreezePartialTokens",
            "outputs": [],
            "type": "function"
        },
        # Events
        {
            "name": "Transfer",
            "type": "event",
            "inputs": [
                {"indexed": True, "name": "from", "type": "address"},
                {"indexed": True, "name": "to", "type": "address"},
                {"indexed": False, "name": "value", "type": "uint256"}
            ]
        },
        {
            "name": "Verified",
            "type": "event",
            "inputs": [
                {"indexed": True, "name": "investor", "type": "address"},
                {"indexed": False, "name": "timestamp", "type": "uint256"}
            ]
        },
        {
            "name": "Frozen",
            "type": "event",
            "inputs": [
                {"indexed": True, "name": "investor", "type": "address"},
                {"indexed": False, "name": "timestamp", "type": "uint256"}
            ]
        }
    ]
    
    def __init__(
        self,
        provider: PolygonProvider,
        contract_address: str,
        abi: Optional[List[Dict]] = None
    ):
        """
        Initialize ERC-3643 handler
        
        Args:
            provider: Polygon provider instance
            contract_address: Token contract address
            abi: Optional custom ABI (uses standard if not provided)
        """
        self.provider = provider
        self.contract_address = Web3.to_checksum_address(contract_address)
        self.abi = abi or self.STANDARD_ABI
        self.contract: Optional[Contract] = None
        self.metadata: Optional[TokenMetadata] = None
        
        # Setup logging
        self.logger = logging.getLogger(f"veria.blockchain.erc3643.{contract_address[:8]}")
        
        # Cache for compliance checks
        self.compliance_cache: Dict[str, Tuple[bool, float]] = {}
        self.cache_ttl = 300  # 5 minutes
        
        self._initialize_contract()
    
    def _initialize_contract(self):
        """Initialize Web3 contract instance"""
        try:
            # Get a connection from the pool
            with self.provider.connection_pool.get_connection() as w3:
                self.contract = w3.eth.contract(
                    address=self.contract_address,
                    abi=self.abi
                )
                self.logger.info(f"Initialized ERC-3643 contract at {self.contract_address}")
                
                # Load metadata
                self._load_metadata(w3)
        except Exception as e:
            self.logger.error(f"Failed to initialize contract: {e}")
            raise
    
    def _load_metadata(self, w3: Web3):
        """Load token metadata from contract"""
        try:
            self.metadata = TokenMetadata(
                name=self.contract.functions.name().call(),
                symbol=self.contract.functions.symbol().call(),
                decimals=self.contract.functions.decimals().call(),
                total_supply=self.contract.functions.totalSupply().call(),
                version="1.0.0"  # Would be read from contract if available
            )
            self.logger.info(f"Loaded token metadata: {self.metadata.symbol}")
        except Exception as e:
            self.logger.warning(f"Could not load full metadata: {e}")
    
    def get_token_metadata(self) -> Optional[TokenMetadata]:
        """Get cached token metadata"""
        return self.metadata
    
    def get_balance(
        self,
        address: str,
        formatted: bool = True
    ) -> Dict[str, Any]:
        """
        Get token balance for an address
        
        Args:
            address: Wallet address
            formatted: Return formatted balance with decimals
        
        Returns:
            Balance information
        """
        def _get_balance():
            with self.provider.connection_pool.get_connection() as w3:
                checksum_address = w3.to_checksum_address(address)
                balance_raw = self.contract.functions.balanceOf(checksum_address).call()
                
                result = {
                    'address': checksum_address,
                    'balance_raw': balance_raw,
                    'token_symbol': self.metadata.symbol if self.metadata else 'TOKEN'
                }
                
                if formatted and self.metadata:
                    balance_decimal = Decimal(balance_raw) / Decimal(10 ** self.metadata.decimals)
                    result['balance_formatted'] = f"{balance_decimal:.6f} {self.metadata.symbol}"
                    result['balance_decimal'] = float(balance_decimal)
                
                return result
        
        return self.provider._retry_operation(_get_balance)
    
    def check_compliance(
        self,
        investor_address: str,
        use_cache: bool = True
    ) -> Dict[str, Any]:
        """
        Check investor compliance status
        
        Args:
            investor_address: Investor wallet address
            use_cache: Use cached results if available
        
        Returns:
            Compliance status information
        """
        import time
        
        # Check cache
        if use_cache and investor_address in self.compliance_cache:
            cached_result, cached_time = self.compliance_cache[investor_address]
            if time.time() - cached_time < self.cache_ttl:
                self.logger.info(f"Using cached compliance for {investor_address}")
                return {'verified': cached_result, 'cached': True}
        
        def _check_compliance():
            with self.provider.connection_pool.get_connection() as w3:
                checksum_address = w3.to_checksum_address(investor_address)
                
                # Check verification status
                is_verified = self.contract.functions.isVerified(checksum_address).call()
                
                # Check frozen status
                is_frozen = False
                try:
                    is_frozen = self.contract.functions.isFrozen(checksum_address).call()
                except:
                    # Function might not exist in all implementations
                    pass
                
                result = {
                    'address': checksum_address,
                    'verified': is_verified,
                    'frozen': is_frozen,
                    'can_transact': is_verified and not is_frozen,
                    'cached': False,
                    'timestamp': int(time.time())
                }
                
                # Update cache
                self.compliance_cache[investor_address] = (is_verified, time.time())
                
                return result
        
        return self.provider._retry_operation(_check_compliance)
    
    def can_transfer(
        self,
        from_address: str,
        to_address: str,
        amount: int
    ) -> Dict[str, Any]:
        """
        Check if transfer is allowed under compliance rules
        
        Args:
            from_address: Sender address
            to_address: Recipient address
            amount: Transfer amount (in smallest unit)
        
        Returns:
            Transfer eligibility information
        """
        def _can_transfer():
            with self.provider.connection_pool.get_connection() as w3:
                from_checksum = w3.to_checksum_address(from_address)
                to_checksum = w3.to_checksum_address(to_address)
                
                # Check if transfer is allowed
                can_transfer = self.contract.functions.canTransfer(
                    from_checksum,
                    to_checksum,
                    amount
                ).call()
                
                # Get additional compliance info
                from_compliance = self.check_compliance(from_address)
                to_compliance = self.check_compliance(to_address)
                
                # Check balances
                from_balance = self.get_balance(from_address)
                
                return {
                    'can_transfer': can_transfer,
                    'from_address': from_checksum,
                    'to_address': to_checksum,
                    'amount': amount,
                    'from_verified': from_compliance['verified'],
                    'to_verified': to_compliance['verified'],
                    'from_frozen': from_compliance.get('frozen', False),
                    'to_frozen': to_compliance.get('frozen', False),
                    'sufficient_balance': from_balance['balance_raw'] >= amount,
                    'reasons': self._get_transfer_denial_reasons(
                        can_transfer,
                        from_compliance,
                        to_compliance,
                        from_balance['balance_raw'] >= amount
                    )
                }
        
        return self.provider._retry_operation(_can_transfer)
    
    def _get_transfer_denial_reasons(
        self,
        can_transfer: bool,
        from_compliance: Dict,
        to_compliance: Dict,
        sufficient_balance: bool
    ) -> List[str]:
        """Get human-readable reasons for transfer denial"""
        if can_transfer:
            return []
        
        reasons = []
        
        if not from_compliance['verified']:
            reasons.append("Sender is not KYC verified")
        if not to_compliance['verified']:
            reasons.append("Recipient is not KYC verified")
        if from_compliance.get('frozen', False):
            reasons.append("Sender account is frozen")
        if to_compliance.get('frozen', False):
            reasons.append("Recipient account is frozen")
        if not sufficient_balance:
            reasons.append("Insufficient balance")
        
        return reasons
    
    def prepare_transfer(
        self,
        from_address: str,
        to_address: str,
        amount: int,
        private_key: str,
        priority_level: str = 'standard'
    ) -> TransferRequest:
        """
        Prepare a compliant token transfer
        
        Args:
            from_address: Sender address
            to_address: Recipient address
            amount: Transfer amount
            private_key: Sender's private key
            priority_level: Gas priority level
        
        Returns:
            Prepared transfer request
        """
        # Check if transfer is allowed
        transfer_check = self.can_transfer(from_address, to_address, amount)
        
        if not transfer_check['can_transfer']:
            raise ValueError(
                f"Transfer not allowed: {', '.join(transfer_check['reasons'])}"
            )
        
        # Prepare transaction
        with self.provider.connection_pool.get_connection() as w3:
            from_checksum = w3.to_checksum_address(from_address)
            to_checksum = w3.to_checksum_address(to_address)
            
            # Build transaction
            transaction = self.contract.functions.transfer(
                to_checksum,
                amount
            ).build_transaction({
                'from': from_checksum,
                'chainId': self.provider.chain_id
            })
            
            # Estimate gas
            gas_estimate = self.provider.estimate_gas_optimized(
                transaction,
                priority_level
            )
            
            return TransferRequest(
                from_address=from_checksum,
                to_address=to_checksum,
                amount=amount,
                compliance_checked=True,
                gas_estimate=gas_estimate,
                metadata={
                    'token_symbol': self.metadata.symbol if self.metadata else 'TOKEN',
                    'priority_level': priority_level,
                    'estimated_cost': gas_estimate['estimated_cost_formatted']
                }
            )
    
    def execute_transfer(
        self,
        transfer_request: TransferRequest,
        private_key: str,
        wait_for_receipt: bool = True
    ) -> Dict[str, Any]:
        """
        Execute a prepared compliant transfer
        
        Args:
            transfer_request: Prepared transfer request
            private_key: Sender's private key
            wait_for_receipt: Wait for transaction confirmation
        
        Returns:
            Transaction result
        """
        if not transfer_request.compliance_checked:
            raise ValueError("Transfer request must be compliance checked")
        
        # Build transaction
        with self.provider.connection_pool.get_connection() as w3:
            transaction = self.contract.functions.transfer(
                transfer_request.to_address,
                transfer_request.amount
            ).build_transaction({
                'from': transfer_request.from_address,
                'chainId': self.provider.chain_id,
                'gas': transfer_request.gas_estimate['gas_limit'],
                'maxPriorityFeePerGas': transfer_request.gas_estimate['max_priority_fee_per_gas'],
                'maxFeePerGas': transfer_request.gas_estimate['max_fee_per_gas']
            })
            
            # Send transaction
            result = self.provider.send_transaction(
                transaction,
                private_key,
                wait_for_receipt
            )
            
            # Add transfer metadata to result
            result['transfer_info'] = {
                'from': transfer_request.from_address,
                'to': transfer_request.to_address,
                'amount': transfer_request.amount,
                'token': self.metadata.symbol if self.metadata else 'TOKEN'
            }
            
            # Log successful transfer
            if result.get('status') == 'success':
                self.logger.info(
                    f"Transfer successful: {transfer_request.amount} tokens "
                    f"from {transfer_request.from_address[:8]} to {transfer_request.to_address[:8]}"
                )
            
            return result
    
    def mint_tokens(
        self,
        to_address: str,
        amount: int,
        private_key: str,
        wait_for_receipt: bool = True
    ) -> Dict[str, Any]:
        """
        Mint new tokens (requires minter role)
        
        Args:
            to_address: Recipient address
            amount: Amount to mint
            private_key: Minter's private key
            wait_for_receipt: Wait for confirmation
        
        Returns:
            Transaction result
        """
        # Check recipient compliance
        compliance = self.check_compliance(to_address)
        if not compliance['verified']:
            raise ValueError(f"Recipient {to_address} is not verified")
        
        with self.provider.connection_pool.get_connection() as w3:
            to_checksum = w3.to_checksum_address(to_address)
            
            # Build mint transaction
            transaction = self.contract.functions.mint(
                to_checksum,
                amount
            ).build_transaction({
                'chainId': self.provider.chain_id
            })
            
            # Estimate gas
            gas_estimate = self.provider.estimate_gas_optimized(transaction)
            transaction.update({
                'gas': gas_estimate['gas_limit'],
                'maxPriorityFeePerGas': gas_estimate['max_priority_fee_per_gas'],
                'maxFeePerGas': gas_estimate['max_fee_per_gas']
            })
            
            # Send transaction
            result = self.provider.send_transaction(
                transaction,
                private_key,
                wait_for_receipt
            )
            
            # Add mint info
            result['mint_info'] = {
                'to': to_checksum,
                'amount': amount,
                'token': self.metadata.symbol if self.metadata else 'TOKEN'
            }
            
            return result
    
    def burn_tokens(
        self,
        from_address: str,
        amount: int,
        private_key: str,
        wait_for_receipt: bool = True
    ) -> Dict[str, Any]:
        """
        Burn tokens (requires burner role or token owner)
        
        Args:
            from_address: Address to burn from
            amount: Amount to burn
            private_key: Burner's private key
            wait_for_receipt: Wait for confirmation
        
        Returns:
            Transaction result
        """
        with self.provider.connection_pool.get_connection() as w3:
            from_checksum = w3.to_checksum_address(from_address)
            
            # Build burn transaction
            transaction = self.contract.functions.burn(
                from_checksum,
                amount
            ).build_transaction({
                'chainId': self.provider.chain_id
            })
            
            # Estimate gas
            gas_estimate = self.provider.estimate_gas_optimized(transaction)
            transaction.update({
                'gas': gas_estimate['gas_limit'],
                'maxPriorityFeePerGas': gas_estimate['max_priority_fee_per_gas'],
                'maxFeePerGas': gas_estimate['max_fee_per_gas']
            })
            
            # Send transaction
            result = self.provider.send_transaction(
                transaction,
                private_key,
                wait_for_receipt
            )
            
            # Add burn info
            result['burn_info'] = {
                'from': from_checksum,
                'amount': amount,
                'token': self.metadata.symbol if self.metadata else 'TOKEN'
            }
            
            return result
    
    def freeze_account(
        self,
        investor_address: str,
        private_key: str,
        wait_for_receipt: bool = True
    ) -> Dict[str, Any]:
        """
        Freeze investor account (requires compliance officer role)
        
        Args:
            investor_address: Address to freeze
            private_key: Compliance officer's private key
            wait_for_receipt: Wait for confirmation
        
        Returns:
            Transaction result
        """
        with self.provider.connection_pool.get_connection() as w3:
            investor_checksum = w3.to_checksum_address(investor_address)
            
            # Build freeze transaction
            transaction = self.contract.functions.freezePartialTokens(
                investor_checksum
            ).build_transaction({
                'chainId': self.provider.chain_id
            })
            
            # Send transaction
            result = self.provider.send_transaction(
                transaction,
                private_key,
                wait_for_receipt
            )
            
            # Clear compliance cache for this address
            if investor_address in self.compliance_cache:
                del self.compliance_cache[investor_address]
            
            result['freeze_info'] = {
                'investor': investor_checksum,
                'action': 'frozen'
            }
            
            return result
    
    def unfreeze_account(
        self,
        investor_address: str,
        private_key: str,
        wait_for_receipt: bool = True
    ) -> Dict[str, Any]:
        """
        Unfreeze investor account (requires compliance officer role)
        
        Args:
            investor_address: Address to unfreeze
            private_key: Compliance officer's private key
            wait_for_receipt: Wait for confirmation
        
        Returns:
            Transaction result
        """
        with self.provider.connection_pool.get_connection() as w3:
            investor_checksum = w3.to_checksum_address(investor_address)
            
            # Build unfreeze transaction
            transaction = self.contract.functions.unfreezePartialTokens(
                investor_checksum
            ).build_transaction({
                'chainId': self.provider.chain_id
            })
            
            # Send transaction
            result = self.provider.send_transaction(
                transaction,
                private_key,
                wait_for_receipt
            )
            
            # Clear compliance cache for this address
            if investor_address in self.compliance_cache:
                del self.compliance_cache[investor_address]
            
            result['freeze_info'] = {
                'investor': investor_checksum,
                'action': 'unfrozen'
            }
            
            return result
    
    def watch_transfer_events(
        self,
        from_block: int = 'latest',
        callback=None
    ):
        """
        Watch for transfer events
        
        Args:
            from_block: Starting block number
            callback: Function to call for each event
        """
        def event_handler(event):
            self.logger.info(f"Transfer event: {event}")
            if callback:
                callback(event)
        
        # Create event filter
        event_filter = self.contract.events.Transfer.create_filter(
            fromBlock=from_block
        )
        
        # Process events
        for event in event_filter.get_new_entries():
            event_handler(event)
        
        return event_filter
    
    def get_transaction_history(
        self,
        address: str,
        from_block: int = 0,
        to_block: int = 'latest'
    ) -> List[Dict[str, Any]]:
        """
        Get transfer history for an address
        
        Args:
            address: Wallet address
            from_block: Starting block
            to_block: Ending block
        
        Returns:
            List of transfer events
        """
        with self.provider.connection_pool.get_connection() as w3:
            checksum_address = w3.to_checksum_address(address)
            
            # Get sent transfers
            sent_filter = self.contract.events.Transfer.create_filter(
                fromBlock=from_block,
                toBlock=to_block,
                argument_filters={'from': checksum_address}
            )
            
            # Get received transfers
            received_filter = self.contract.events.Transfer.create_filter(
                fromBlock=from_block,
                toBlock=to_block,
                argument_filters={'to': checksum_address}
            )
            
            transfers = []
            
            for event in sent_filter.get_all_entries():
                transfers.append({
                    'type': 'sent',
                    'from': event['args']['from'],
                    'to': event['args']['to'],
                    'amount': event['args']['value'],
                    'block_number': event['blockNumber'],
                    'transaction_hash': event['transactionHash'].hex()
                })
            
            for event in received_filter.get_all_entries():
                transfers.append({
                    'type': 'received',
                    'from': event['args']['from'],
                    'to': event['args']['to'],
                    'amount': event['args']['value'],
                    'block_number': event['blockNumber'],
                    'transaction_hash': event['transactionHash'].hex()
                })
            
            # Sort by block number
            transfers.sort(key=lambda x: x['block_number'], reverse=True)
            
            return transfers
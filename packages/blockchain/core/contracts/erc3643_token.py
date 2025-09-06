"""
ERC-3643 Security Token Contract Interface

Implements institutional-grade security token standard with:
- Identity registry integration
- Transfer compliance rules
- Investor eligibility verification
- Regulatory compliance hooks
"""

import json
from typing import Dict, Any, List, Optional, Tuple
from decimal import Decimal
from dataclasses import dataclass
from enum import Enum

from web3 import Web3
from web3.contract import Contract
from eth_typing import HexStr, ChecksumAddress


class ComplianceStatus(Enum):
    """Token transfer compliance status"""
    APPROVED = "approved"
    BLOCKED = "blocked"
    RESTRICTED = "restricted"
    PENDING_KYC = "pending_kyc"


@dataclass
class TokenHolder:
    """Represents a token holder with compliance info"""
    address: str
    balance: Decimal
    is_verified: bool
    country_code: str
    investor_type: str  # 'individual', 'institutional', 'accredited'
    kyc_expiry: int
    restrictions: List[str]


class ERC3643Token:
    """
    ERC-3643 compliant security token interface for Veria RWA platform
    Handles tokenized bonds, money market instruments, and treasury products
    """
    
    # Simplified ERC-3643 ABI (key functions)
    ABI = json.loads('''[
        {
            "name": "transfer",
            "type": "function",
            "inputs": [
                {"name": "to", "type": "address"},
                {"name": "amount", "type": "uint256"}
            ],
            "outputs": [{"name": "", "type": "bool"}]
        },
        {
            "name": "balanceOf",
            "type": "function",
            "inputs": [{"name": "account", "type": "address"}],
            "outputs": [{"name": "", "type": "uint256"}]
        },
        {
            "name": "totalSupply",
            "type": "function",
            "inputs": [],
            "outputs": [{"name": "", "type": "uint256"}]
        },
        {
            "name": "mint",
            "type": "function",
            "inputs": [
                {"name": "to", "type": "address"},
                {"name": "amount", "type": "uint256"}
            ],
            "outputs": []
        },
        {
            "name": "burn",
            "type": "function",
            "inputs": [
                {"name": "account", "type": "address"},
                {"name": "amount", "type": "uint256"}
            ],
            "outputs": []
        },
        {
            "name": "pause",
            "type": "function",
            "inputs": [],
            "outputs": []
        },
        {
            "name": "unpause",
            "type": "function",
            "inputs": [],
            "outputs": []
        },
        {
            "name": "freeze",
            "type": "function",
            "inputs": [{"name": "account", "type": "address"}],
            "outputs": []
        },
        {
            "name": "unfreeze",
            "type": "function",
            "inputs": [{"name": "account", "type": "address"}],
            "outputs": []
        },
        {
            "name": "canTransfer",
            "type": "function",
            "inputs": [
                {"name": "from", "type": "address"},
                {"name": "to", "type": "address"},
                {"name": "amount", "type": "uint256"}
            ],
            "outputs": [{"name": "", "type": "bool"}]
        },
        {
            "name": "isVerified",
            "type": "function",
            "inputs": [{"name": "account", "type": "address"}],
            "outputs": [{"name": "", "type": "bool"}]
        },
        {
            "name": "getIdentity",
            "type": "function",
            "inputs": [{"name": "account", "type": "address"}],
            "outputs": [{"name": "", "type": "address"}]
        },
        {
            "name": "name",
            "type": "function",
            "inputs": [],
            "outputs": [{"name": "", "type": "string"}]
        },
        {
            "name": "symbol",
            "type": "function",
            "inputs": [],
            "outputs": [{"name": "", "type": "string"}]
        },
        {
            "name": "decimals",
            "type": "function",
            "inputs": [],
            "outputs": [{"name": "", "type": "uint8"}]
        }
    ]''')
    
    def __init__(
        self,
        web3: Web3,
        contract_address: str,
        identity_registry_address: Optional[str] = None
    ):
        """
        Initialize ERC-3643 token contract interface
        
        Args:
            web3: Web3 instance
            contract_address: Deployed token contract address
            identity_registry_address: Identity registry contract address
        """
        self.w3 = web3
        self.address = self.w3.to_checksum_address(contract_address)
        self.identity_registry = identity_registry_address
        
        # Initialize contract
        self.contract: Contract = self.w3.eth.contract(
            address=self.address,
            abi=self.ABI
        )
        
        # Cache token metadata
        self.token_info = self._load_token_info()
        
    def _load_token_info(self) -> Dict[str, Any]:
        """Load and cache token metadata"""
        try:
            return {
                'name': self.contract.functions.name().call(),
                'symbol': self.contract.functions.symbol().call(),
                'decimals': self.contract.functions.decimals().call(),
                'total_supply': self.contract.functions.totalSupply().call(),
                'address': self.address
            }
        except Exception as e:
            return {
                'name': 'Unknown',
                'symbol': 'UNK',
                'decimals': 18,
                'total_supply': 0,
                'address': self.address,
                'error': str(e)
            }
    
    def check_compliance(
        self,
        from_address: str,
        to_address: str,
        amount: Decimal
    ) -> Tuple[bool, ComplianceStatus, str]:
        """
        Check if transfer meets compliance requirements
        
        Args:
            from_address: Sender address
            to_address: Recipient address
            amount: Transfer amount
            
        Returns:
            Tuple of (can_transfer, status, reason)
        """
        try:
            from_addr = self.w3.to_checksum_address(from_address)
            to_addr = self.w3.to_checksum_address(to_address)
            amount_wei = int(amount * 10**self.token_info['decimals'])
            
            # Check if transfer is allowed
            can_transfer = self.contract.functions.canTransfer(
                from_addr,
                to_addr,
                amount_wei
            ).call()
            
            if can_transfer:
                return (True, ComplianceStatus.APPROVED, "Transfer approved")
            
            # Determine why transfer is blocked
            from_verified = self.contract.functions.isVerified(from_addr).call()
            to_verified = self.contract.functions.isVerified(to_addr).call()
            
            if not from_verified:
                return (False, ComplianceStatus.PENDING_KYC, "Sender not KYC verified")
            elif not to_verified:
                return (False, ComplianceStatus.PENDING_KYC, "Recipient not KYC verified")
            else:
                return (False, ComplianceStatus.RESTRICTED, "Transfer restricted by compliance rules")
                
        except Exception as e:
            return (False, ComplianceStatus.BLOCKED, f"Compliance check failed: {str(e)}")
    
    def get_balance(self, address: str) -> Dict[str, Any]:
        """Get token balance for address"""
        checksum_addr = self.w3.to_checksum_address(address)
        balance_wei = self.contract.functions.balanceOf(checksum_addr).call()
        balance = Decimal(balance_wei) / Decimal(10**self.token_info['decimals'])
        
        return {
            'address': checksum_addr,
            'balance': float(balance),
            'balance_wei': balance_wei,
            'symbol': self.token_info['symbol'],
            'decimals': self.token_info['decimals']
        }
    
    def transfer(
        self,
        to_address: str,
        amount: Decimal,
        from_private_key: str,
        check_compliance: bool = True
    ) -> Dict[str, Any]:
        """
        Execute compliant token transfer
        
        Args:
            to_address: Recipient address
            amount: Amount to transfer
            from_private_key: Sender's private key
            check_compliance: Whether to check compliance before transfer
            
        Returns:
            Transaction result
        """
        from eth_account import Account
        
        # Get sender account
        account = Account.from_key(from_private_key)
        from_addr = account.address
        to_addr = self.w3.to_checksum_address(to_address)
        amount_wei = int(amount * 10**self.token_info['decimals'])
        
        # Check compliance if required
        if check_compliance:
            can_transfer, status, reason = self.check_compliance(
                from_addr,
                to_addr,
                amount
            )
            
            if not can_transfer:
                return {
                    'success': False,
                    'status': status.value,
                    'reason': reason,
                    'from': from_addr,
                    'to': to_addr,
                    'amount': float(amount)
                }
        
        # Build transaction
        transaction = self.contract.functions.transfer(
            to_addr,
            amount_wei
        ).build_transaction({
            'chainId': self.w3.eth.chain_id,
            'from': from_addr,
            'nonce': self.w3.eth.get_transaction_count(from_addr),
            'gas': 200000,  # Will be estimated
            'gasPrice': self.w3.eth.gas_price
        })
        
        # Sign and send
        signed_txn = self.w3.eth.account.sign_transaction(transaction, from_private_key)
        tx_hash = self.w3.eth.send_raw_transaction(signed_txn.rawTransaction)
        
        # Wait for receipt
        receipt = self.w3.eth.wait_for_transaction_receipt(tx_hash)
        
        return {
            'success': receipt['status'] == 1,
            'transaction_hash': tx_hash.hex(),
            'from': from_addr,
            'to': to_addr,
            'amount': float(amount),
            'gas_used': receipt['gasUsed'],
            'block_number': receipt['blockNumber']
        }
    
    def mint(
        self,
        to_address: str,
        amount: Decimal,
        minter_private_key: str
    ) -> Dict[str, Any]:
        """
        Mint new tokens (requires minter role)
        
        Args:
            to_address: Recipient address
            amount: Amount to mint
            minter_private_key: Minter's private key
            
        Returns:
            Transaction result
        """
        from eth_account import Account
        
        account = Account.from_key(minter_private_key)
        to_addr = self.w3.to_checksum_address(to_address)
        amount_wei = int(amount * 10**self.token_info['decimals'])
        
        # Build mint transaction
        transaction = self.contract.functions.mint(
            to_addr,
            amount_wei
        ).build_transaction({
            'chainId': self.w3.eth.chain_id,
            'from': account.address,
            'nonce': self.w3.eth.get_transaction_count(account.address),
            'gas': 150000,
            'gasPrice': self.w3.eth.gas_price
        })
        
        # Sign and send
        signed_txn = self.w3.eth.account.sign_transaction(transaction, minter_private_key)
        tx_hash = self.w3.eth.send_raw_transaction(signed_txn.rawTransaction)
        
        # Wait for receipt
        receipt = self.w3.eth.wait_for_transaction_receipt(tx_hash)
        
        return {
            'success': receipt['status'] == 1,
            'transaction_hash': tx_hash.hex(),
            'minter': account.address,
            'recipient': to_addr,
            'amount_minted': float(amount),
            'gas_used': receipt['gasUsed'],
            'block_number': receipt['blockNumber']
        }
    
    def burn(
        self,
        from_address: str,
        amount: Decimal,
        burner_private_key: str
    ) -> Dict[str, Any]:
        """
        Burn tokens (requires burner role or token owner)
        
        Args:
            from_address: Address to burn from
            amount: Amount to burn
            burner_private_key: Burner's private key
            
        Returns:
            Transaction result
        """
        from eth_account import Account
        
        account = Account.from_key(burner_private_key)
        from_addr = self.w3.to_checksum_address(from_address)
        amount_wei = int(amount * 10**self.token_info['decimals'])
        
        # Build burn transaction
        transaction = self.contract.functions.burn(
            from_addr,
            amount_wei
        ).build_transaction({
            'chainId': self.w3.eth.chain_id,
            'from': account.address,
            'nonce': self.w3.eth.get_transaction_count(account.address),
            'gas': 150000,
            'gasPrice': self.w3.eth.gas_price
        })
        
        # Sign and send
        signed_txn = self.w3.eth.account.sign_transaction(transaction, burner_private_key)
        tx_hash = self.w3.eth.send_raw_transaction(signed_txn.rawTransaction)
        
        # Wait for receipt
        receipt = self.w3.eth.wait_for_transaction_receipt(tx_hash)
        
        return {
            'success': receipt['status'] == 1,
            'transaction_hash': tx_hash.hex(),
            'burner': account.address,
            'from': from_addr,
            'amount_burned': float(amount),
            'gas_used': receipt['gasUsed'],
            'block_number': receipt['blockNumber']
        }
    
    def freeze_account(self, account: str, admin_private_key: str) -> Dict[str, Any]:
        """Freeze an account (admin function)"""
        from eth_account import Account
        
        admin = Account.from_key(admin_private_key)
        target = self.w3.to_checksum_address(account)
        
        transaction = self.contract.functions.freeze(target).build_transaction({
            'chainId': self.w3.eth.chain_id,
            'from': admin.address,
            'nonce': self.w3.eth.get_transaction_count(admin.address),
            'gas': 100000,
            'gasPrice': self.w3.eth.gas_price
        })
        
        signed_txn = self.w3.eth.account.sign_transaction(transaction, admin_private_key)
        tx_hash = self.w3.eth.send_raw_transaction(signed_txn.rawTransaction)
        receipt = self.w3.eth.wait_for_transaction_receipt(tx_hash)
        
        return {
            'success': receipt['status'] == 1,
            'transaction_hash': tx_hash.hex(),
            'admin': admin.address,
            'frozen_account': target,
            'action': 'freeze'
        }
    
    def get_token_metrics(self) -> Dict[str, Any]:
        """Get comprehensive token metrics"""
        total_supply = self.contract.functions.totalSupply().call()
        
        return {
            'name': self.token_info['name'],
            'symbol': self.token_info['symbol'],
            'decimals': self.token_info['decimals'],
            'total_supply': total_supply,
            'total_supply_formatted': float(
                Decimal(total_supply) / Decimal(10**self.token_info['decimals'])
            ),
            'contract_address': self.address,
            'identity_registry': self.identity_registry
        }
    
    def verify_identity(self, address: str) -> Dict[str, Any]:
        """Check identity verification status"""
        checksum_addr = self.w3.to_checksum_address(address)
        
        try:
            is_verified = self.contract.functions.isVerified(checksum_addr).call()
            identity_addr = self.contract.functions.getIdentity(checksum_addr).call()
            
            return {
                'address': checksum_addr,
                'is_verified': is_verified,
                'identity_contract': identity_addr if identity_addr != '0x0000000000000000000000000000000000000000' else None,
                'status': 'verified' if is_verified else 'unverified'
            }
        except Exception as e:
            return {
                'address': checksum_addr,
                'is_verified': False,
                'error': str(e)
            }


def deploy_erc3643_token(
    web3: Web3,
    name: str,
    symbol: str,
    decimals: int,
    deployer_private_key: str,
    initial_supply: Optional[Decimal] = None
) -> Dict[str, Any]:
    """
    Deploy a new ERC-3643 compliant token
    
    Note: This is a placeholder - actual deployment requires compiled contract bytecode
    """
    from eth_account import Account
    
    account = Account.from_key(deployer_private_key)
    
    # This would normally include the compiled bytecode
    # For now, returning mock deployment info
    return {
        'status': 'deployment_ready',
        'deployer': account.address,
        'token_name': name,
        'token_symbol': symbol,
        'decimals': decimals,
        'initial_supply': float(initial_supply) if initial_supply else 0,
        'note': 'Actual deployment requires compiled contract bytecode'
    }
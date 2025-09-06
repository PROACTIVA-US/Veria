"""
Polygon Mumbai Testnet Provider for Veria Platform
Implements institutional-grade Web3.py connection with pooling, retry logic, and gas optimization
"""

import os
import time
import logging
from typing import Optional, Dict, Any, List, Tuple
from contextlib import contextmanager
from threading import Lock, RLock
from queue import Queue, Empty
from dataclasses import dataclass
from decimal import Decimal

from web3 import Web3
from web3.middleware import geth_poa_middleware
from web3.exceptions import BlockNotFound, TransactionNotFound
from eth_account import Account
from eth_typing import HexStr, ChecksumAddress


@dataclass
class GasConfig:
    """Gas configuration for optimized transactions"""
    max_priority_fee_gwei: float = 30  # Max priority fee in Gwei
    max_fee_per_gas_gwei: float = 50   # Max total fee in Gwei
    gas_limit_buffer: float = 1.2      # Buffer for gas limit estimation
    mev_protection_buffer: float = 1.1  # MEV protection buffer


@dataclass
class RetryConfig:
    """Retry configuration for resilient operations"""
    max_retries: int = 3
    initial_delay: float = 0.5
    backoff_factor: float = 2.0
    max_delay: float = 30.0


class ConnectionPool:
    """Thread-safe Web3 connection pool for concurrent operations"""
    
    def __init__(self, rpc_urls: List[str], pool_size: int = 5):
        self.rpc_urls = rpc_urls
        self.pool_size = pool_size
        self.pool: Queue[Web3] = Queue(maxsize=pool_size)
        self.lock = RLock()
        self.logger = logging.getLogger(f"{__name__}.ConnectionPool")
        self._initialize_pool()
    
    def _initialize_pool(self):
        """Initialize the connection pool with Web3 instances"""
        for i in range(self.pool_size):
            rpc_url = self.rpc_urls[i % len(self.rpc_urls)]
            try:
                w3 = Web3(Web3.HTTPProvider(
                    rpc_url,
                    request_kwargs={'timeout': 60}
                ))
                # Add PoA middleware for Polygon
                w3.middleware_onion.inject(geth_poa_middleware, layer=0)
                
                if w3.is_connected():
                    self.pool.put(w3)
                    self.logger.info(f"Added connection {i+1}/{self.pool_size} to pool")
            except Exception as e:
                self.logger.error(f"Failed to create connection {i+1}: {e}")
    
    @contextmanager
    def get_connection(self, timeout: float = 10.0):
        """Context manager for getting a connection from the pool"""
        connection = None
        try:
            connection = self.pool.get(timeout=timeout)
            yield connection
        except Empty:
            raise ConnectionError("No available connections in pool")
        finally:
            if connection:
                self.pool.put(connection)


class PolygonProvider:
    """
    Production-ready Polygon provider with connection pooling, 
    retry logic, and gas optimization for Veria's tokenized RWA platform
    """
    
    def __init__(
        self,
        rpc_urls: Optional[List[str]] = None,
        pool_size: int = 5,
        gas_config: Optional[GasConfig] = None,
        retry_config: Optional[RetryConfig] = None
    ):
        # Configure RPC endpoints with fallbacks
        self.rpc_urls = rpc_urls or self._get_default_rpc_urls()
        
        # Initialize configurations
        self.gas_config = gas_config or GasConfig()
        self.retry_config = retry_config or RetryConfig()
        
        # Setup connection pool
        self.connection_pool = ConnectionPool(self.rpc_urls, pool_size)
        
        # Mumbai testnet configuration
        self.chain_id = 80001
        self.native_token = "MATIC"
        
        # Setup logging
        self.logger = self._setup_logging()
        
        # Transaction monitoring
        self.pending_transactions: Dict[str, Dict[str, Any]] = {}
        self.transaction_lock = Lock()
        
        self.logger.info(f"Initialized Polygon Mumbai provider with {pool_size} connections")
    
    @staticmethod
    def _get_default_rpc_urls() -> List[str]:
        """Get default RPC URLs with environment variable support"""
        urls = []
        
        # Primary from environment
        if os.getenv('POLYGON_MUMBAI_RPC'):
            urls.append(os.getenv('POLYGON_MUMBAI_RPC'))
        
        # Public fallback endpoints
        urls.extend([
            'https://rpc-mumbai.maticvigil.com',
            'https://polygon-mumbai.g.alchemy.com/v2/demo',
            'https://polygon-mumbai-bor.publicnode.com',
            'https://rpc.ankr.com/polygon_mumbai'
        ])
        
        return urls
    
    @staticmethod
    def _setup_logging() -> logging.Logger:
        """Configure structured logging for institutional compliance"""
        logger = logging.getLogger("veria.blockchain.polygon")
        logger.setLevel(logging.INFO)
        
        if not logger.handlers:
            handler = logging.StreamHandler()
            formatter = logging.Formatter(
                '%(asctime)s - %(name)s - %(levelname)s - %(message)s',
                datefmt='%Y-%m-%d %H:%M:%S'
            )
            handler.setFormatter(formatter)
            logger.addHandler(handler)
        
        return logger
    
    def _retry_operation(self, operation, *args, **kwargs) -> Any:
        """Execute operation with exponential backoff retry logic"""
        delay = self.retry_config.initial_delay
        last_exception = None
        
        for attempt in range(self.retry_config.max_retries):
            try:
                return operation(*args, **kwargs)
            except Exception as e:
                last_exception = e
                self.logger.warning(
                    f"Operation failed (attempt {attempt + 1}/{self.retry_config.max_retries}): {e}"
                )
                
                if attempt < self.retry_config.max_retries - 1:
                    time.sleep(min(delay, self.retry_config.max_delay))
                    delay *= self.retry_config.backoff_factor
        
        raise last_exception
    
    def get_connection_status(self) -> Dict[str, Any]:
        """Get comprehensive connection status"""
        try:
            with self.connection_pool.get_connection() as w3:
                block = w3.eth.get_block('latest')
                
                return {
                    'connected': True,
                    'chain_id': self.chain_id,
                    'block_number': block['number'],
                    'block_timestamp': block['timestamp'],
                    'gas_price_gwei': w3.eth.gas_price / 10**9,
                    'pool_size': self.connection_pool.pool_size,
                    'available_connections': self.connection_pool.pool.qsize()
                }
        except Exception as e:
            self.logger.error(f"Failed to get connection status: {e}")
            return {
                'connected': False,
                'error': str(e)
            }
    
    def get_balance(self, address: str, block_number: str = 'latest') -> Dict[str, Any]:
        """Get account balance with proper formatting"""
        def _get_balance():
            with self.connection_pool.get_connection() as w3:
                checksum_address = w3.to_checksum_address(address)
                balance_wei = w3.eth.get_balance(checksum_address, block_number)
                balance_ether = w3.from_wei(balance_wei, 'ether')
                
                return {
                    'address': checksum_address,
                    'balance_wei': balance_wei,
                    'balance_ether': float(balance_ether),
                    'balance_formatted': f"{balance_ether:.6f} {self.native_token}",
                    'block': block_number
                }
        
        return self._retry_operation(_get_balance)
    
    def estimate_gas_optimized(
        self,
        transaction: Dict[str, Any],
        priority_level: str = 'standard'
    ) -> Dict[str, Any]:
        """
        Estimate gas with optimization and MEV protection
        Priority levels: 'slow', 'standard', 'fast', 'instant'
        """
        def _estimate():
            with self.connection_pool.get_connection() as w3:
                # Get current gas prices
                base_fee = w3.eth.gas_price
                
                # Calculate priority fee based on level
                priority_multipliers = {
                    'slow': 0.8,
                    'standard': 1.0,
                    'fast': 1.5,
                    'instant': 2.0
                }
                
                multiplier = priority_multipliers.get(priority_level, 1.0)
                
                # EIP-1559 gas calculation
                max_priority_fee = int(
                    self.gas_config.max_priority_fee_gwei * 10**9 * multiplier
                )
                max_fee_per_gas = int(
                    base_fee * self.gas_config.mev_protection_buffer + max_priority_fee
                )
                
                # Estimate gas limit
                estimated_gas = w3.eth.estimate_gas(transaction)
                gas_limit = int(estimated_gas * self.gas_config.gas_limit_buffer)
                
                # Calculate costs
                estimated_cost_wei = gas_limit * max_fee_per_gas
                estimated_cost_ether = w3.from_wei(estimated_cost_wei, 'ether')
                
                return {
                    'gas_limit': gas_limit,
                    'max_priority_fee_per_gas': max_priority_fee,
                    'max_fee_per_gas': max_fee_per_gas,
                    'base_fee': base_fee,
                    'estimated_cost_wei': estimated_cost_wei,
                    'estimated_cost_ether': float(estimated_cost_ether),
                    'estimated_cost_formatted': f"{estimated_cost_ether:.6f} {self.native_token}",
                    'priority_level': priority_level
                }
        
        return self._retry_operation(_estimate)
    
    def send_transaction(
        self,
        transaction: Dict[str, Any],
        private_key: str,
        wait_for_receipt: bool = True,
        timeout: int = 120
    ) -> Dict[str, Any]:
        """
        Send transaction with retry logic and monitoring
        """
        def _send():
            with self.connection_pool.get_connection() as w3:
                # Get account from private key
                account = Account.from_key(private_key)
                
                # Add chain ID
                transaction['chainId'] = self.chain_id
                
                # Add nonce if not present
                if 'nonce' not in transaction:
                    transaction['nonce'] = w3.eth.get_transaction_count(account.address)
                
                # Estimate and add gas if not present
                if 'gas' not in transaction:
                    gas_estimate = self.estimate_gas_optimized(transaction)
                    transaction['gas'] = gas_estimate['gas_limit']
                    transaction['maxPriorityFeePerGas'] = gas_estimate['max_priority_fee_per_gas']
                    transaction['maxFeePerGas'] = gas_estimate['max_fee_per_gas']
                
                # Sign transaction
                signed_txn = w3.eth.account.sign_transaction(transaction, private_key)
                
                # Send transaction
                tx_hash = w3.eth.send_raw_transaction(signed_txn.rawTransaction)
                tx_hash_hex = tx_hash.hex()
                
                self.logger.info(f"Transaction sent: {tx_hash_hex}")
                
                # Store in pending transactions
                with self.transaction_lock:
                    self.pending_transactions[tx_hash_hex] = {
                        'hash': tx_hash_hex,
                        'timestamp': time.time(),
                        'status': 'pending',
                        'from': account.address,
                        'to': transaction.get('to'),
                        'value': transaction.get('value', 0)
                    }
                
                result = {
                    'transaction_hash': tx_hash_hex,
                    'from': account.address,
                    'status': 'pending'
                }
                
                # Wait for receipt if requested
                if wait_for_receipt:
                    receipt = w3.eth.wait_for_transaction_receipt(tx_hash, timeout=timeout)
                    
                    with self.transaction_lock:
                        if tx_hash_hex in self.pending_transactions:
                            self.pending_transactions[tx_hash_hex]['status'] = (
                                'success' if receipt['status'] == 1 else 'failed'
                            )
                    
                    result.update({
                        'status': 'success' if receipt['status'] == 1 else 'failed',
                        'block_number': receipt['blockNumber'],
                        'gas_used': receipt['gasUsed'],
                        'effective_gas_price': receipt.get('effectiveGasPrice', 0),
                        'receipt': dict(receipt)
                    })
                
                return result
        
        return self._retry_operation(_send)
    
    def monitor_transaction(self, tx_hash: str) -> Dict[str, Any]:
        """Monitor transaction status and return detailed information"""
        def _monitor():
            with self.connection_pool.get_connection() as w3:
                try:
                    # Get transaction details
                    tx = w3.eth.get_transaction(tx_hash)
                    
                    # Check if transaction is mined
                    receipt = w3.eth.get_transaction_receipt(tx_hash)
                    
                    if receipt:
                        # Transaction is mined
                        return {
                            'status': 'confirmed' if receipt['status'] == 1 else 'failed',
                            'transaction_hash': tx_hash,
                            'block_number': receipt['blockNumber'],
                            'confirmations': w3.eth.block_number - receipt['blockNumber'],
                            'gas_used': receipt['gasUsed'],
                            'effective_gas_price': receipt.get('effectiveGasPrice', 0),
                            'from': tx['from'],
                            'to': tx['to'],
                            'value': tx['value'],
                            'logs': receipt.get('logs', [])
                        }
                    else:
                        # Transaction is pending
                        return {
                            'status': 'pending',
                            'transaction_hash': tx_hash,
                            'from': tx['from'],
                            'to': tx['to'],
                            'value': tx['value'],
                            'gas_price': tx.get('gasPrice', tx.get('maxFeePerGas', 0))
                        }
                
                except TransactionNotFound:
                    return {
                        'status': 'not_found',
                        'transaction_hash': tx_hash,
                        'error': 'Transaction not found'
                    }
        
        return self._retry_operation(_monitor)
    
    def get_pending_transactions(self) -> List[Dict[str, Any]]:
        """Get all pending transactions being monitored"""
        with self.transaction_lock:
            return list(self.pending_transactions.values())
    
    def batch_request(self, requests: List[Tuple[str, List[Any]]]) -> List[Any]:
        """
        Execute multiple RPC requests in a single batch
        requests: List of (method_name, params) tuples
        """
        def _batch():
            with self.connection_pool.get_connection() as w3:
                results = []
                for method, params in requests:
                    try:
                        if hasattr(w3.eth, method):
                            func = getattr(w3.eth, method)
                            result = func(*params) if params else func()
                            results.append(result)
                        else:
                            results.append({'error': f'Method {method} not found'})
                    except Exception as e:
                        results.append({'error': str(e)})
                return results
        
        return self._retry_operation(_batch)
    
    def health_check(self) -> Dict[str, Any]:
        """Comprehensive health check for monitoring"""
        health = {
            'timestamp': time.time(),
            'provider': 'polygon_mumbai',
            'checks': {}
        }
        
        # Check connection
        try:
            status = self.get_connection_status()
            health['checks']['connection'] = {
                'status': 'healthy' if status['connected'] else 'unhealthy',
                'details': status
            }
        except Exception as e:
            health['checks']['connection'] = {
                'status': 'unhealthy',
                'error': str(e)
            }
        
        # Check pool status
        health['checks']['pool'] = {
            'status': 'healthy',
            'total_connections': self.connection_pool.pool_size,
            'available_connections': self.connection_pool.pool.qsize()
        }
        
        # Check pending transactions
        pending_txs = self.get_pending_transactions()
        health['checks']['transactions'] = {
            'status': 'healthy',
            'pending_count': len([tx for tx in pending_txs if tx['status'] == 'pending']),
            'total_monitored': len(pending_txs)
        }
        
        # Overall health
        all_healthy = all(
            check.get('status') == 'healthy' 
            for check in health['checks'].values()
        )
        health['status'] = 'healthy' if all_healthy else 'degraded'
        
        return health
    
    def close(self):
        """Cleanup connections and resources"""
        self.logger.info("Closing Polygon provider connections")
        while not self.connection_pool.pool.empty():
            try:
                self.connection_pool.pool.get_nowait()
            except Empty:
                break
        self.logger.info("Polygon provider closed")


# Factory function for easy instantiation
def create_polygon_provider(
    rpc_urls: Optional[List[str]] = None,
    **kwargs
) -> PolygonProvider:
    """
    Create a configured Polygon Mumbai provider instance
    
    Args:
        rpc_urls: Optional list of RPC URLs
        **kwargs: Additional configuration options
    
    Returns:
        Configured PolygonProvider instance
    """
    return PolygonProvider(rpc_urls=rpc_urls, **kwargs)


if __name__ == "__main__":
    # Example usage and testing
    provider = create_polygon_provider()
    
    # Check health
    health = provider.health_check()
    print(f"Provider Health: {health}")
    
    # Get connection status
    status = provider.get_connection_status()
    print(f"Connection Status: {status}")
    
    # Close provider
    provider.close()
"""
Comprehensive tests for Polygon Mumbai Provider
Tests connection pooling, retry logic, gas optimization, and transaction handling
"""

import os
import time
import unittest
from unittest.mock import Mock, patch, MagicMock, PropertyMock
from decimal import Decimal
from queue import Queue

from web3 import Web3
from web3.exceptions import TransactionNotFound
from eth_account import Account

from polygon_provider import (
    PolygonProvider,
    ConnectionPool,
    GasConfig,
    RetryConfig,
    create_polygon_provider
)


class TestConnectionPool(unittest.TestCase):
    """Test connection pool functionality"""
    
    @patch('polygon_provider.Web3')
    def test_pool_initialization(self, mock_web3):
        """Test that connection pool initializes correctly"""
        # Setup mock
        mock_instance = MagicMock()
        mock_instance.is_connected.return_value = True
        mock_web3.return_value = mock_instance
        
        # Create pool
        pool = ConnectionPool(['http://test.rpc'], pool_size=3)
        
        # Verify pool size
        self.assertEqual(pool.pool.qsize(), 3)
        self.assertEqual(pool.pool_size, 3)
    
    @patch('polygon_provider.Web3')
    def test_pool_connection_context_manager(self, mock_web3):
        """Test connection pool context manager"""
        # Setup mock
        mock_instance = MagicMock()
        mock_instance.is_connected.return_value = True
        mock_web3.return_value = mock_instance
        
        # Create pool
        pool = ConnectionPool(['http://test.rpc'], pool_size=2)
        
        # Test context manager
        with pool.get_connection() as conn:
            self.assertIsNotNone(conn)
            # Pool should have one less connection
            self.assertEqual(pool.pool.qsize(), 1)
        
        # Connection should be returned to pool
        self.assertEqual(pool.pool.qsize(), 2)
    
    @patch('polygon_provider.Web3')
    def test_pool_exhaustion(self, mock_web3):
        """Test behavior when pool is exhausted"""
        # Setup mock
        mock_instance = MagicMock()
        mock_instance.is_connected.return_value = True
        mock_web3.return_value = mock_instance
        
        # Create small pool
        pool = ConnectionPool(['http://test.rpc'], pool_size=1)
        
        # Take the only connection
        conn1 = pool.pool.get()
        
        # Try to get another connection (should timeout)
        with self.assertRaises(Exception):
            with pool.get_connection(timeout=0.1) as conn2:
                pass
        
        # Return connection
        pool.pool.put(conn1)


class TestPolygonProvider(unittest.TestCase):
    """Test Polygon provider functionality"""
    
    @patch('polygon_provider.ConnectionPool')
    def setUp(self, mock_pool):
        """Setup test provider"""
        self.mock_pool = mock_pool
        self.provider = PolygonProvider(
            rpc_urls=['http://test.rpc'],
            pool_size=2
        )
    
    def test_provider_initialization(self):
        """Test provider initializes with correct configuration"""
        self.assertEqual(self.provider.chain_id, 80001)
        self.assertEqual(self.provider.native_token, 'MATIC')
        self.assertIsNotNone(self.provider.gas_config)
        self.assertIsNotNone(self.provider.retry_config)
    
    @patch('polygon_provider.ConnectionPool.get_connection')
    def test_get_connection_status(self, mock_get_conn):
        """Test connection status retrieval"""
        # Setup mock
        mock_w3 = MagicMock()
        mock_w3.eth.get_block.return_value = {
            'number': 12345,
            'timestamp': int(time.time())
        }
        mock_w3.eth.gas_price = 30000000000  # 30 Gwei
        
        mock_context = MagicMock()
        mock_context.__enter__ = Mock(return_value=mock_w3)
        mock_context.__exit__ = Mock(return_value=None)
        mock_get_conn.return_value = mock_context
        
        # Get status
        status = self.provider.get_connection_status()
        
        # Verify
        self.assertTrue(status['connected'])
        self.assertEqual(status['chain_id'], 80001)
        self.assertEqual(status['block_number'], 12345)
        self.assertEqual(status['gas_price_gwei'], 30.0)
    
    @patch('polygon_provider.ConnectionPool.get_connection')
    def test_get_balance(self, mock_get_conn):
        """Test balance retrieval with formatting"""
        # Setup mock
        mock_w3 = MagicMock()
        mock_w3.to_checksum_address.return_value = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb9'
        mock_w3.eth.get_balance.return_value = 1000000000000000000  # 1 MATIC
        mock_w3.from_wei.return_value = Decimal('1')
        
        mock_context = MagicMock()
        mock_context.__enter__ = Mock(return_value=mock_w3)
        mock_context.__exit__ = Mock(return_value=None)
        mock_get_conn.return_value = mock_context
        
        # Get balance
        balance = self.provider.get_balance('0x742d35cc6634c0532925a3b844bc9e7595f0beb9')
        
        # Verify
        self.assertEqual(balance['balance_wei'], 1000000000000000000)
        self.assertEqual(balance['balance_ether'], 1.0)
        self.assertIn('MATIC', balance['balance_formatted'])
    
    @patch('polygon_provider.ConnectionPool.get_connection')
    def test_estimate_gas_optimized(self, mock_get_conn):
        """Test gas estimation with optimization"""
        # Setup mock
        mock_w3 = MagicMock()
        mock_w3.eth.gas_price = 25000000000  # 25 Gwei
        mock_w3.eth.estimate_gas.return_value = 21000
        mock_w3.from_wei.return_value = Decimal('0.001')
        
        mock_context = MagicMock()
        mock_context.__enter__ = Mock(return_value=mock_w3)
        mock_context.__exit__ = Mock(return_value=None)
        mock_get_conn.return_value = mock_context
        
        # Estimate gas
        transaction = {
            'from': '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb9',
            'to': '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb9',
            'value': 1000000000000000000
        }
        
        gas_estimate = self.provider.estimate_gas_optimized(transaction, 'fast')
        
        # Verify
        self.assertIn('gas_limit', gas_estimate)
        self.assertIn('max_priority_fee_per_gas', gas_estimate)
        self.assertIn('max_fee_per_gas', gas_estimate)
        self.assertIn('estimated_cost_ether', gas_estimate)
        self.assertEqual(gas_estimate['priority_level'], 'fast')
        # Check buffer was applied (1.2x)
        self.assertEqual(gas_estimate['gas_limit'], 25200)  # 21000 * 1.2
    
    def test_retry_operation(self):
        """Test retry logic with exponential backoff"""
        # Create mock operation that fails twice then succeeds
        mock_op = Mock(side_effect=[Exception("Fail 1"), Exception("Fail 2"), "Success"])
        
        # Execute with retry
        result = self.provider._retry_operation(mock_op)
        
        # Verify
        self.assertEqual(result, "Success")
        self.assertEqual(mock_op.call_count, 3)
    
    def test_retry_operation_max_retries(self):
        """Test retry logic when max retries exceeded"""
        # Create mock operation that always fails
        mock_op = Mock(side_effect=Exception("Always fails"))
        
        # Execute with retry (should raise)
        with self.assertRaises(Exception) as context:
            self.provider._retry_operation(mock_op)
        
        # Verify
        self.assertEqual(str(context.exception), "Always fails")
        self.assertEqual(mock_op.call_count, self.provider.retry_config.max_retries)
    
    @patch('polygon_provider.ConnectionPool.get_connection')
    @patch('polygon_provider.Account.from_key')
    def test_send_transaction(self, mock_account, mock_get_conn):
        """Test transaction sending with monitoring"""
        # Setup mock account
        mock_acc = MagicMock()
        mock_acc.address = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb9'
        mock_account.return_value = mock_acc
        
        # Setup mock Web3
        mock_w3 = MagicMock()
        mock_w3.eth.get_transaction_count.return_value = 10
        mock_w3.eth.account.sign_transaction.return_value = MagicMock(
            rawTransaction=b'signed_tx'
        )
        mock_w3.eth.send_raw_transaction.return_value = b'txhash123'
        mock_w3.eth.wait_for_transaction_receipt.return_value = {
            'status': 1,
            'blockNumber': 12345,
            'gasUsed': 21000,
            'effectiveGasPrice': 25000000000
        }
        
        mock_context = MagicMock()
        mock_context.__enter__ = Mock(return_value=mock_w3)
        mock_context.__exit__ = Mock(return_value=None)
        mock_get_conn.return_value = mock_context
        
        # Mock gas estimation
        self.provider.estimate_gas_optimized = Mock(return_value={
            'gas_limit': 25000,
            'max_priority_fee_per_gas': 30000000000,
            'max_fee_per_gas': 50000000000
        })
        
        # Send transaction
        tx = {
            'to': '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb9',
            'value': 1000000000000000000
        }
        
        result = self.provider.send_transaction(tx, 'private_key_here')
        
        # Verify
        self.assertEqual(result['status'], 'success')
        self.assertEqual(result['block_number'], 12345)
        self.assertIn('transaction_hash', result)
        
        # Check pending transactions were tracked
        self.assertIn(
            result['transaction_hash'],
            self.provider.pending_transactions
        )
    
    @patch('polygon_provider.ConnectionPool.get_connection')
    def test_monitor_transaction_confirmed(self, mock_get_conn):
        """Test monitoring confirmed transaction"""
        # Setup mock
        mock_w3 = MagicMock()
        mock_w3.eth.get_transaction.return_value = {
            'from': '0xSender',
            'to': '0xReceiver',
            'value': 1000000000000000000,
            'gasPrice': 25000000000
        }
        mock_w3.eth.get_transaction_receipt.return_value = {
            'status': 1,
            'blockNumber': 12345,
            'gasUsed': 21000,
            'effectiveGasPrice': 25000000000,
            'logs': []
        }
        mock_w3.eth.block_number = 12350
        
        mock_context = MagicMock()
        mock_context.__enter__ = Mock(return_value=mock_w3)
        mock_context.__exit__ = Mock(return_value=None)
        mock_get_conn.return_value = mock_context
        
        # Monitor transaction
        status = self.provider.monitor_transaction('0xtxhash')
        
        # Verify
        self.assertEqual(status['status'], 'confirmed')
        self.assertEqual(status['confirmations'], 5)
        self.assertEqual(status['block_number'], 12345)
    
    @patch('polygon_provider.ConnectionPool.get_connection')
    def test_monitor_transaction_pending(self, mock_get_conn):
        """Test monitoring pending transaction"""
        # Setup mock
        mock_w3 = MagicMock()
        mock_w3.eth.get_transaction.return_value = {
            'from': '0xSender',
            'to': '0xReceiver',
            'value': 1000000000000000000,
            'maxFeePerGas': 50000000000
        }
        mock_w3.eth.get_transaction_receipt.return_value = None
        
        mock_context = MagicMock()
        mock_context.__enter__ = Mock(return_value=mock_w3)
        mock_context.__exit__ = Mock(return_value=None)
        mock_get_conn.return_value = mock_context
        
        # Monitor transaction
        status = self.provider.monitor_transaction('0xtxhash')
        
        # Verify
        self.assertEqual(status['status'], 'pending')
        self.assertNotIn('confirmations', status)
    
    @patch('polygon_provider.ConnectionPool.get_connection')
    def test_batch_request(self, mock_get_conn):
        """Test batch request execution"""
        # Setup mock
        mock_w3 = MagicMock()
        mock_w3.eth.block_number = 12345
        mock_w3.eth.gas_price = 25000000000
        mock_w3.eth.get_balance.return_value = 1000000000000000000
        
        mock_context = MagicMock()
        mock_context.__enter__ = Mock(return_value=mock_w3)
        mock_context.__exit__ = Mock(return_value=None)
        mock_get_conn.return_value = mock_context
        
        # Execute batch request
        requests = [
            ('block_number', []),
            ('gas_price', []),
            ('get_balance', ['0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb9'])
        ]
        
        results = self.provider.batch_request(requests)
        
        # Verify
        self.assertEqual(len(results), 3)
        self.assertEqual(results[0], 12345)
        self.assertEqual(results[1], 25000000000)
        self.assertEqual(results[2], 1000000000000000000)
    
    def test_health_check(self):
        """Test comprehensive health check"""
        # Mock methods
        self.provider.get_connection_status = Mock(return_value={
            'connected': True,
            'block_number': 12345
        })
        self.provider.get_pending_transactions = Mock(return_value=[
            {'status': 'pending'},
            {'status': 'success'}
        ])
        self.provider.connection_pool.pool_size = 5
        self.provider.connection_pool.pool = Mock()
        self.provider.connection_pool.pool.qsize.return_value = 4
        
        # Perform health check
        health = self.provider.health_check()
        
        # Verify
        self.assertEqual(health['status'], 'healthy')
        self.assertEqual(health['provider'], 'polygon_mumbai')
        self.assertIn('connection', health['checks'])
        self.assertIn('pool', health['checks'])
        self.assertIn('transactions', health['checks'])
        self.assertEqual(health['checks']['transactions']['pending_count'], 1)


class TestGasConfiguration(unittest.TestCase):
    """Test gas configuration and optimization"""
    
    def test_gas_config_defaults(self):
        """Test default gas configuration values"""
        config = GasConfig()
        self.assertEqual(config.max_priority_fee_gwei, 30)
        self.assertEqual(config.max_fee_per_gas_gwei, 50)
        self.assertEqual(config.gas_limit_buffer, 1.2)
        self.assertEqual(config.mev_protection_buffer, 1.1)
    
    def test_custom_gas_config(self):
        """Test custom gas configuration"""
        config = GasConfig(
            max_priority_fee_gwei=50,
            max_fee_per_gas_gwei=100,
            gas_limit_buffer=1.5
        )
        self.assertEqual(config.max_priority_fee_gwei, 50)
        self.assertEqual(config.max_fee_per_gas_gwei, 100)
        self.assertEqual(config.gas_limit_buffer, 1.5)


class TestRetryConfiguration(unittest.TestCase):
    """Test retry configuration"""
    
    def test_retry_config_defaults(self):
        """Test default retry configuration values"""
        config = RetryConfig()
        self.assertEqual(config.max_retries, 3)
        self.assertEqual(config.initial_delay, 0.5)
        self.assertEqual(config.backoff_factor, 2.0)
        self.assertEqual(config.max_delay, 30.0)
    
    def test_custom_retry_config(self):
        """Test custom retry configuration"""
        config = RetryConfig(
            max_retries=5,
            initial_delay=1.0,
            backoff_factor=3.0
        )
        self.assertEqual(config.max_retries, 5)
        self.assertEqual(config.initial_delay, 1.0)
        self.assertEqual(config.backoff_factor, 3.0)


class TestFactoryFunction(unittest.TestCase):
    """Test provider factory function"""
    
    @patch('polygon_provider.PolygonProvider')
    def test_create_polygon_provider(self, mock_provider_class):
        """Test factory function creates provider correctly"""
        # Create provider
        provider = create_polygon_provider(
            rpc_urls=['http://test.rpc'],
            pool_size=10
        )
        
        # Verify
        mock_provider_class.assert_called_once_with(
            rpc_urls=['http://test.rpc'],
            pool_size=10
        )


class TestIntegration(unittest.TestCase):
    """Integration tests (requires network access)"""
    
    @unittest.skipUnless(
        os.getenv('RUN_INTEGRATION_TESTS', 'false').lower() == 'true',
        "Integration tests require RUN_INTEGRATION_TESTS=true"
    )
    def test_real_connection(self):
        """Test real connection to Polygon Mumbai"""
        provider = create_polygon_provider()
        
        # Test connection status
        status = provider.get_connection_status()
        self.assertTrue(status['connected'])
        self.assertEqual(status['chain_id'], 80001)
        
        # Test balance check (use a known address)
        balance = provider.get_balance('0x0000000000000000000000000000000000000000')
        self.assertIsNotNone(balance['balance_wei'])
        
        # Clean up
        provider.close()


if __name__ == '__main__':
    unittest.main()
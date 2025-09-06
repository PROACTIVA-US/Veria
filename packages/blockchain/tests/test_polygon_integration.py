"""
Integration tests for Polygon blockchain functionality
Tests provider connection, contract interaction, and event monitoring
"""

import pytest
import asyncio
import os
from unittest.mock import Mock, patch, MagicMock
from decimal import Decimal

from web3 import Web3
from eth_account import Account

# Import our blockchain modules
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

from core.providers.polygon_provider import PolygonProvider, create_polygon_provider
from core.contracts.erc3643_token import ERC3643Token, ComplianceStatus
from core.event_monitor import EventMonitor, EventType, create_event_monitor


class TestPolygonProvider:
    """Test suite for Polygon provider"""
    
    @pytest.fixture
    def mock_web3(self):
        """Create a mock Web3 instance"""
        mock = MagicMock(spec=Web3)
        mock.eth.block_number = 1000000
        mock.eth.chain_id = 80001
        mock.eth.gas_price = 30000000000  # 30 Gwei
        mock.is_connected.return_value = True
        mock.eth.get_balance.return_value = 1000000000000000000  # 1 MATIC
        mock.to_checksum_address = Web3.to_checksum_address
        mock.from_wei = Web3.from_wei
        mock.to_wei = Web3.to_wei
        return mock
    
    @pytest.fixture
    def provider(self):
        """Create a test provider instance"""
        with patch('core.providers.polygon_provider.Web3') as mock_web3_class:
            mock_web3_class.HTTPProvider.return_value = Mock()
            provider = PolygonProvider(
                rpc_urls=['https://rpc-mumbai.maticvigil.com'],
                pool_size=2
            )
            return provider
    
    def test_provider_initialization(self):
        """Test provider initialization"""
        provider = create_polygon_provider()
        assert provider is not None
        assert provider.chain_id == 80001  # Mumbai testnet
        assert provider.native_token == "MATIC"
        assert provider.connection_pool.pool_size == 5
    
    def test_get_connection_status(self, provider, mock_web3):
        """Test connection status retrieval"""
        with patch.object(provider.connection_pool, 'get_connection') as mock_get:
            mock_get.return_value.__enter__ = Mock(return_value=mock_web3)
            mock_get.return_value.__exit__ = Mock(return_value=None)
            
            mock_web3.eth.get_block.return_value = {
                'number': 1000000,
                'timestamp': 1234567890
            }
            
            status = provider.get_connection_status()
            
            assert status['connected'] is True
            assert status['chain_id'] == 80001
            assert status['block_number'] == 1000000
            assert 'gas_price_gwei' in status
    
    def test_get_balance(self, provider, mock_web3):
        """Test balance retrieval"""
        test_address = "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0"
        
        with patch.object(provider.connection_pool, 'get_connection') as mock_get:
            mock_get.return_value.__enter__ = Mock(return_value=mock_web3)
            mock_get.return_value.__exit__ = Mock(return_value=None)
            
            balance_info = provider.get_balance(test_address)
            
            assert balance_info['address'] == Web3.to_checksum_address(test_address)
            assert 'balance_wei' in balance_info
            assert 'balance_ether' in balance_info
            assert balance_info['balance_formatted'].endswith('MATIC')
    
    def test_gas_estimation(self, provider, mock_web3):
        """Test gas estimation with optimization"""
        transaction = {
            'to': '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0',
            'value': 1000000000000000000,  # 1 MATIC
            'data': '0x'
        }
        
        with patch.object(provider.connection_pool, 'get_connection') as mock_get:
            mock_get.return_value.__enter__ = Mock(return_value=mock_web3)
            mock_get.return_value.__exit__ = Mock(return_value=None)
            
            mock_web3.eth.estimate_gas.return_value = 21000
            
            gas_estimate = provider.estimate_gas_optimized(transaction)
            
            assert gas_estimate['gas_limit'] >= 21000  # Should include buffer
            assert 'max_priority_fee_per_gas' in gas_estimate
            assert 'max_fee_per_gas' in gas_estimate
            assert gas_estimate['priority_level'] == 'standard'
    
    def test_retry_logic(self, provider):
        """Test retry operation logic"""
        attempt_count = 0
        
        def failing_operation():
            nonlocal attempt_count
            attempt_count += 1
            if attempt_count < 3:
                raise Exception("Connection failed")
            return "Success"
        
        with patch('time.sleep'):  # Mock sleep to speed up test
            result = provider._retry_operation(failing_operation)
            
        assert result == "Success"
        assert attempt_count == 3
    
    def test_health_check(self, provider, mock_web3):
        """Test health check functionality"""
        with patch.object(provider, 'get_connection_status') as mock_status:
            mock_status.return_value = {
                'connected': True,
                'chain_id': 80001,
                'block_number': 1000000
            }
            
            health = provider.health_check()
            
            assert health['status'] in ['healthy', 'degraded']
            assert 'checks' in health
            assert 'connection' in health['checks']
            assert 'pool' in health['checks']
            assert 'transactions' in health['checks']


class TestERC3643Token:
    """Test suite for ERC-3643 token interactions"""
    
    @pytest.fixture
    def mock_web3(self):
        """Create mock Web3 instance"""
        mock = MagicMock(spec=Web3)
        mock.eth.chain_id = 80001
        mock.to_checksum_address = Web3.to_checksum_address
        mock.eth.get_transaction_count.return_value = 1
        mock.eth.gas_price = 30000000000
        return mock
    
    @pytest.fixture
    def mock_contract(self):
        """Create mock contract"""
        mock = MagicMock()
        mock.functions.name.return_value.call.return_value = "Veria USD Yield"
        mock.functions.symbol.return_value.call.return_value = "USDY"
        mock.functions.decimals.return_value.call.return_value = 18
        mock.functions.totalSupply.return_value.call.return_value = 1000000000000000000000000
        return mock
    
    @pytest.fixture
    def token(self, mock_web3, mock_contract):
        """Create test token instance"""
        with patch('core.contracts.erc3643_token.Web3') as mock_web3_class:
            token = ERC3643Token(
                mock_web3,
                "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0"
            )
            token.contract = mock_contract
            token.token_info = {
                'name': 'Veria USD Yield',
                'symbol': 'USDY',
                'decimals': 18,
                'total_supply': 1000000000000000000000000,
                'address': "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0"
            }
            return token
    
    def test_token_initialization(self, token):
        """Test token initialization"""
        assert token.token_info['name'] == "Veria USD Yield"
        assert token.token_info['symbol'] == "USDY"
        assert token.token_info['decimals'] == 18
    
    def test_compliance_check(self, token, mock_contract):
        """Test compliance checking"""
        from_addr = "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0"
        to_addr = "0x853d955aCEf822Db058eb8505911ED77F175b992"
        amount = Decimal("100")
        
        # Test approved transfer
        mock_contract.functions.canTransfer.return_value.call.return_value = True
        
        can_transfer, status, reason = token.check_compliance(
            from_addr,
            to_addr,
            amount
        )
        
        assert can_transfer is True
        assert status == ComplianceStatus.APPROVED
        
        # Test blocked transfer (not verified)
        mock_contract.functions.canTransfer.return_value.call.return_value = False
        mock_contract.functions.isVerified.return_value.call.side_effect = [False, True]
        
        can_transfer, status, reason = token.check_compliance(
            from_addr,
            to_addr,
            amount
        )
        
        assert can_transfer is False
        assert status == ComplianceStatus.PENDING_KYC
    
    def test_get_balance(self, token, mock_contract):
        """Test balance retrieval"""
        test_address = "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0"
        mock_contract.functions.balanceOf.return_value.call.return_value = 5000000000000000000000
        
        balance = token.get_balance(test_address)
        
        assert balance['address'] == Web3.to_checksum_address(test_address)
        assert balance['balance'] == 5000.0
        assert balance['symbol'] == 'USDY'
    
    def test_get_token_metrics(self, token):
        """Test token metrics retrieval"""
        metrics = token.get_token_metrics()
        
        assert metrics['name'] == 'Veria USD Yield'
        assert metrics['symbol'] == 'USDY'
        assert metrics['decimals'] == 18
        assert 'total_supply_formatted' in metrics
    
    def test_verify_identity(self, token, mock_contract):
        """Test identity verification check"""
        test_address = "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0"
        
        mock_contract.functions.isVerified.return_value.call.return_value = True
        mock_contract.functions.getIdentity.return_value.call.return_value = \
            "0x853d955aCEf822Db058eb8505911ED77F175b992"
        
        result = token.verify_identity(test_address)
        
        assert result['is_verified'] is True
        assert result['status'] == 'verified'
        assert result['identity_contract'] is not None


class TestEventMonitor:
    """Test suite for event monitoring"""
    
    @pytest.fixture
    def mock_web3(self):
        """Create mock Web3 instance"""
        mock = MagicMock(spec=Web3)
        mock.eth.block_number = 1000000
        mock.keccak = Web3.keccak
        mock.to_checksum_address = Web3.to_checksum_address
        mock.eth.get_logs.return_value = []
        return mock
    
    @pytest.fixture
    def monitor(self, mock_web3):
        """Create test event monitor"""
        return EventMonitor(mock_web3, poll_interval=0.1)
    
    def test_monitor_initialization(self, monitor):
        """Test monitor initialization"""
        assert monitor.is_running is False
        assert monitor.poll_interval == 0.1
        assert len(monitor.monitored_contracts) == 0
        assert len(monitor.event_filters) == 0
    
    def test_add_contract(self, monitor):
        """Test adding contract to monitor"""
        contract_address = "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0"
        event_types = [EventType.TRANSFER, EventType.MINT]
        
        monitor.add_contract(contract_address, event_types)
        
        assert len(monitor.monitored_contracts) == 1
        assert len(monitor.event_filters) == 2
        
        checksum_address = Web3.to_checksum_address(contract_address)
        assert checksum_address in monitor.monitored_contracts
    
    def test_remove_contract(self, monitor):
        """Test removing contract from monitor"""
        contract_address = "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0"
        
        monitor.add_contract(contract_address, [EventType.TRANSFER])
        assert len(monitor.monitored_contracts) == 1
        
        monitor.remove_contract(contract_address)
        assert len(monitor.monitored_contracts) == 0
        assert len(monitor.event_filters) == 0
    
    @pytest.mark.asyncio
    async def test_event_monitoring_lifecycle(self, monitor):
        """Test start and stop of monitoring"""
        await monitor.start()
        assert monitor.is_running is True
        
        # Let it run briefly
        await asyncio.sleep(0.2)
        
        await monitor.stop()
        assert monitor.is_running is False
    
    def test_get_stats(self, monitor):
        """Test statistics retrieval"""
        stats = monitor.get_stats()
        
        assert 'is_running' in stats
        assert 'monitored_contracts' in stats
        assert 'events_received' in stats
        assert 'events_processed' in stats
        assert stats['monitored_contracts'] == 0
        assert stats['events_received'] == 0
    
    @pytest.mark.asyncio
    async def test_historical_events(self, monitor, mock_web3):
        """Test historical event retrieval"""
        contract_address = "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0"
        
        # Mock log response
        mock_log = {
            'transactionHash': b'\x12\x34',
            'blockNumber': 1000000,
            'logIndex': 1,
            'topics': [b'\xaa\xbb', b'\xcc\xdd', b'\xee\xff'],
            'data': '0x0000000000000000000000000000000000000000000000000000000000001000'
        }
        mock_web3.eth.get_logs.return_value = [mock_log]
        
        events = await monitor.get_historical_events(
            contract_address,
            EventType.TRANSFER,
            from_block=999900,
            to_block=1000000
        )
        
        assert isinstance(events, list)
        # Events would be parsed from the mock logs


@pytest.mark.integration
class TestFullIntegration:
    """Full integration tests (requires test network connection)"""
    
    @pytest.mark.skipif(
        not os.getenv('RUN_INTEGRATION_TESTS'),
        reason="Integration tests require RUN_INTEGRATION_TESTS env var"
    )
    @pytest.mark.asyncio
    async def test_full_workflow(self):
        """Test complete workflow with actual network"""
        # Create provider
        provider = create_polygon_provider()
        
        # Check connection
        status = provider.get_connection_status()
        assert status['connected'] is True
        
        # Get test account balance
        test_address = "0x0000000000000000000000000000000000000001"
        balance = provider.get_balance(test_address)
        assert 'balance_ether' in balance
        
        # Create event monitor
        with provider.connection_pool.get_connection() as w3:
            monitor = create_event_monitor(w3)
            
            # Add a contract to monitor
            monitor.add_contract(
                "0x0000000000000000000000000000000000001010",  # MATIC token
                [EventType.TRANSFER]
            )
            
            # Start monitoring
            await monitor.start()
            
            # Get stats
            stats = monitor.get_stats()
            assert stats['is_running'] is True
            
            # Stop monitoring
            await monitor.stop()
        
        # Close provider
        provider.close()


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
"""
Event Monitoring System for Veria Platform
Real-time blockchain event monitoring with compliance alerts
"""

import asyncio
import json
import logging
import time
from typing import Optional, Dict, Any, List, Callable, Set
from dataclasses import dataclass, field
from enum import Enum
from threading import Thread, Lock
from queue import Queue, Empty
from collections import defaultdict

from web3 import Web3
from web3.types import BlockData, TxData, LogReceipt
from eth_typing import HexStr, ChecksumAddress

from ..providers.polygon_provider import PolygonProvider


class EventType(Enum):
    """Types of blockchain events to monitor"""
    TRANSFER = "transfer"
    MINT = "mint"
    BURN = "burn"
    FREEZE = "freeze"
    UNFREEZE = "unfreeze"
    COMPLIANCE_UPDATE = "compliance_update"
    ROLE_GRANTED = "role_granted"
    ROLE_REVOKED = "role_revoked"
    PAUSE = "pause"
    UNPAUSE = "unpause"


class AlertSeverity(Enum):
    """Alert severity levels"""
    INFO = "info"
    WARNING = "warning"
    CRITICAL = "critical"
    EMERGENCY = "emergency"


@dataclass
class MonitoredContract:
    """Contract to monitor"""
    address: ChecksumAddress
    abi: List[Dict]
    name: str
    event_filters: List[str] = field(default_factory=list)
    last_block_processed: int = 0


@dataclass
class EventAlert:
    """Alert generated from event"""
    event_type: EventType
    severity: AlertSeverity
    contract_address: ChecksumAddress
    transaction_hash: str
    block_number: int
    timestamp: int
    message: str
    details: Dict[str, Any]


@dataclass
class TransactionMetrics:
    """Metrics for transaction monitoring"""
    total_transactions: int = 0
    successful_transactions: int = 0
    failed_transactions: int = 0
    total_gas_used: int = 0
    total_value_transferred: int = 0
    unique_addresses: Set[str] = field(default_factory=set)
    events_by_type: Dict[str, int] = field(default_factory=lambda: defaultdict(int))


class EventMonitor:
    """
    Real-time blockchain event monitoring system with compliance alerts
    """
    
    def __init__(
        self,
        provider: PolygonProvider,
        alert_callback: Optional[Callable[[EventAlert], None]] = None,
        block_confirmations: int = 3
    ):
        """
        Initialize event monitor
        
        Args:
            provider: Polygon provider instance
            alert_callback: Function to call when alerts are generated
            block_confirmations: Number of blocks to wait for finality
        """
        self.provider = provider
        self.alert_callback = alert_callback
        self.block_confirmations = block_confirmations
        
        # Monitoring state
        self.monitored_contracts: Dict[ChecksumAddress, MonitoredContract] = {}
        self.event_queue: Queue[LogReceipt] = Queue()
        self.alert_queue: Queue[EventAlert] = Queue()
        
        # Metrics
        self.metrics = TransactionMetrics()
        self.metrics_lock = Lock()
        
        # Control flags
        self.is_running = False
        self.monitor_thread: Optional[Thread] = None
        self.processor_thread: Optional[Thread] = None
        
        # Compliance thresholds
        self.compliance_thresholds = {
            'large_transfer_amount': 1000000 * 10**18,  # 1M tokens
            'rapid_transfers_count': 10,  # Number of transfers
            'rapid_transfers_window': 300,  # 5 minutes
            'suspicious_gas_multiplier': 5  # 5x normal gas
        }
        
        # Recent activity tracking
        self.recent_transfers: List[Dict[str, Any]] = []
        self.address_activity: Dict[str, List[float]] = defaultdict(list)
        
        # Setup logging
        self.logger = logging.getLogger("veria.blockchain.event_monitor")
    
    def add_contract(
        self,
        address: str,
        abi: List[Dict],
        name: str,
        event_names: Optional[List[str]] = None
    ):
        """
        Add contract to monitor
        
        Args:
            address: Contract address
            abi: Contract ABI
            name: Contract name for identification
            event_names: Specific events to monitor (monitors all if None)
        """
        checksum_address = Web3.to_checksum_address(address)
        
        # Get current block number
        with self.provider.connection_pool.get_connection() as w3:
            current_block = w3.eth.block_number
        
        self.monitored_contracts[checksum_address] = MonitoredContract(
            address=checksum_address,
            abi=abi,
            name=name,
            event_filters=event_names or [],
            last_block_processed=current_block
        )
        
        self.logger.info(f"Added contract {name} at {checksum_address} for monitoring")
    
    def remove_contract(self, address: str):
        """Remove contract from monitoring"""
        checksum_address = Web3.to_checksum_address(address)
        if checksum_address in self.monitored_contracts:
            del self.monitored_contracts[checksum_address]
            self.logger.info(f"Removed contract {checksum_address} from monitoring")
    
    def start(self):
        """Start event monitoring"""
        if self.is_running:
            self.logger.warning("Monitor is already running")
            return
        
        self.is_running = True
        
        # Start monitoring thread
        self.monitor_thread = Thread(target=self._monitor_loop, daemon=True)
        self.monitor_thread.start()
        
        # Start event processor thread
        self.processor_thread = Thread(target=self._process_events_loop, daemon=True)
        self.processor_thread.start()
        
        # Start alert dispatcher thread
        self.alert_thread = Thread(target=self._dispatch_alerts_loop, daemon=True)
        self.alert_thread.start()
        
        self.logger.info("Event monitoring started")
    
    def stop(self):
        """Stop event monitoring"""
        self.is_running = False
        
        if self.monitor_thread:
            self.monitor_thread.join(timeout=5)
        if self.processor_thread:
            self.processor_thread.join(timeout=5)
        
        self.logger.info("Event monitoring stopped")
    
    def _monitor_loop(self):
        """Main monitoring loop"""
        while self.is_running:
            try:
                self._check_new_blocks()
                time.sleep(2)  # Poll every 2 seconds
            except Exception as e:
                self.logger.error(f"Error in monitor loop: {e}")
                time.sleep(5)
    
    def _check_new_blocks(self):
        """Check for new blocks and fetch events"""
        with self.provider.connection_pool.get_connection() as w3:
            current_block = w3.eth.block_number
            
            for contract in self.monitored_contracts.values():
                # Get events from last processed block to current
                from_block = contract.last_block_processed + 1
                to_block = min(
                    current_block - self.block_confirmations,
                    from_block + 100  # Process max 100 blocks at once
                )
                
                if to_block > from_block:
                    self._fetch_contract_events(w3, contract, from_block, to_block)
                    contract.last_block_processed = to_block
    
    def _fetch_contract_events(
        self,
        w3: Web3,
        contract: MonitoredContract,
        from_block: int,
        to_block: int
    ):
        """Fetch events for a specific contract"""
        try:
            # Create contract instance
            contract_instance = w3.eth.contract(
                address=contract.address,
                abi=contract.abi
            )
            
            # Get all events or specific ones
            if contract.event_filters:
                for event_name in contract.event_filters:
                    if hasattr(contract_instance.events, event_name):
                        event_filter = getattr(contract_instance.events, event_name)
                        events = event_filter.create_filter(
                            fromBlock=from_block,
                            toBlock=to_block
                        ).get_all_entries()
                        
                        for event in events:
                            self.event_queue.put(event)
            else:
                # Get all events
                events = w3.eth.get_logs({
                    'address': contract.address,
                    'fromBlock': from_block,
                    'toBlock': to_block
                })
                
                for event in events:
                    self.event_queue.put(event)
            
            self.logger.debug(
                f"Fetched events for {contract.name} blocks {from_block}-{to_block}"
            )
            
        except Exception as e:
            self.logger.error(f"Error fetching events for {contract.name}: {e}")
    
    def _process_events_loop(self):
        """Process events from queue"""
        while self.is_running:
            try:
                # Get event from queue (timeout to allow checking is_running)
                event = self.event_queue.get(timeout=1)
                self._process_event(event)
            except Empty:
                continue
            except Exception as e:
                self.logger.error(f"Error processing event: {e}")
    
    def _process_event(self, event: LogReceipt):
        """Process individual event"""
        try:
            # Identify event type
            event_type = self._identify_event_type(event)
            
            # Update metrics
            self._update_metrics(event, event_type)
            
            # Check compliance rules
            alerts = self._check_compliance_rules(event, event_type)
            
            # Queue alerts
            for alert in alerts:
                self.alert_queue.put(alert)
            
            # Track activity
            self._track_activity(event, event_type)
            
        except Exception as e:
            self.logger.error(f"Error processing individual event: {e}")
    
    def _identify_event_type(self, event: LogReceipt) -> Optional[EventType]:
        """Identify the type of event"""
        # Check event signature (first topic)
        if not event.get('topics'):
            return None
        
        signature = event['topics'][0].hex() if hasattr(event['topics'][0], 'hex') else event['topics'][0]
        
        # Common ERC-3643 event signatures
        signatures = {
            '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef': EventType.TRANSFER,
            '0x0f6798a560793a54c3bcfe86a93cde1e73087d944c0ea20544137d4121396885': EventType.MINT,
            '0xcc16f5dbb4873280815c1ee09dbd06736cffcc184412cf7a71a0fdb75d397ca5': EventType.BURN,
            '0x6f3517d74d0c8d1e09d0e7e6e990c24b5e13d3f4e68a87a35c5e09e6e45c8a41': EventType.FREEZE,
            '0x3be5b7f8cd88e14f4c6f1e15e0a7e9f3d0b8b9c2e1f0e8c7b4a3d1c9e5f2a8b1': EventType.UNFREEZE,
        }
        
        return signatures.get(signature)
    
    def _update_metrics(self, event: LogReceipt, event_type: Optional[EventType]):
        """Update transaction metrics"""
        with self.metrics_lock:
            self.metrics.total_transactions += 1
            
            if event_type:
                self.metrics.events_by_type[event_type.value] += 1
            
            # Track unique addresses
            if 'address' in event:
                self.metrics.unique_addresses.add(event['address'])
            
            # Track gas used
            if 'gasUsed' in event:
                self.metrics.total_gas_used += event['gasUsed']
    
    def _check_compliance_rules(
        self,
        event: LogReceipt,
        event_type: Optional[EventType]
    ) -> List[EventAlert]:
        """Check compliance rules and generate alerts"""
        alerts = []
        
        # Check large transfers
        if event_type == EventType.TRANSFER:
            alerts.extend(self._check_large_transfer(event))
        
        # Check rapid transfers
        alerts.extend(self._check_rapid_transfers(event))
        
        # Check suspicious gas usage
        alerts.extend(self._check_suspicious_gas(event))
        
        # Check freeze/unfreeze events
        if event_type in [EventType.FREEZE, EventType.UNFREEZE]:
            alerts.extend(self._create_compliance_alert(event, event_type))
        
        return alerts
    
    def _check_large_transfer(self, event: LogReceipt) -> List[EventAlert]:
        """Check for large transfer amounts"""
        alerts = []
        
        # Extract transfer amount (usually in data field)
        if len(event.get('data', '')) > 2:
            try:
                amount = int(event['data'], 16)
                
                if amount > self.compliance_thresholds['large_transfer_amount']:
                    alert = EventAlert(
                        event_type=EventType.TRANSFER,
                        severity=AlertSeverity.WARNING,
                        contract_address=event['address'],
                        transaction_hash=event['transactionHash'].hex(),
                        block_number=event['blockNumber'],
                        timestamp=int(time.time()),
                        message=f"Large transfer detected: {amount / 10**18:.2f} tokens",
                        details={
                            'amount': amount,
                            'threshold': self.compliance_thresholds['large_transfer_amount']
                        }
                    )
                    alerts.append(alert)
            except:
                pass
        
        return alerts
    
    def _check_rapid_transfers(self, event: LogReceipt) -> List[EventAlert]:
        """Check for rapid transfer patterns"""
        alerts = []
        
        # Track transfer timestamp
        current_time = time.time()
        
        # Clean old transfers
        self.recent_transfers = [
            t for t in self.recent_transfers
            if current_time - t['timestamp'] < self.compliance_thresholds['rapid_transfers_window']
        ]
        
        # Add current transfer
        self.recent_transfers.append({
            'timestamp': current_time,
            'tx_hash': event['transactionHash'].hex(),
            'address': event['address']
        })
        
        # Check if threshold exceeded
        if len(self.recent_transfers) > self.compliance_thresholds['rapid_transfers_count']:
            alert = EventAlert(
                event_type=EventType.TRANSFER,
                severity=AlertSeverity.WARNING,
                contract_address=event['address'],
                transaction_hash=event['transactionHash'].hex(),
                block_number=event['blockNumber'],
                timestamp=int(current_time),
                message=f"Rapid transfer pattern detected: {len(self.recent_transfers)} transfers in {self.compliance_thresholds['rapid_transfers_window']} seconds",
                details={
                    'transfer_count': len(self.recent_transfers),
                    'window_seconds': self.compliance_thresholds['rapid_transfers_window']
                }
            )
            alerts.append(alert)
        
        return alerts
    
    def _check_suspicious_gas(self, event: LogReceipt) -> List[EventAlert]:
        """Check for suspicious gas usage"""
        alerts = []
        
        if 'gasUsed' in event:
            # Compare with average gas for this type of transaction
            avg_gas = 100000  # Baseline average
            
            if event['gasUsed'] > avg_gas * self.compliance_thresholds['suspicious_gas_multiplier']:
                alert = EventAlert(
                    event_type=EventType.TRANSFER,
                    severity=AlertSeverity.INFO,
                    contract_address=event['address'],
                    transaction_hash=event['transactionHash'].hex(),
                    block_number=event['blockNumber'],
                    timestamp=int(time.time()),
                    message=f"High gas usage detected: {event['gasUsed']} gas",
                    details={
                        'gas_used': event['gasUsed'],
                        'average_gas': avg_gas,
                        'multiplier': event['gasUsed'] / avg_gas
                    }
                )
                alerts.append(alert)
        
        return alerts
    
    def _create_compliance_alert(
        self,
        event: LogReceipt,
        event_type: EventType
    ) -> List[EventAlert]:
        """Create compliance-related alerts"""
        alert = EventAlert(
            event_type=event_type,
            severity=AlertSeverity.CRITICAL,
            contract_address=event['address'],
            transaction_hash=event['transactionHash'].hex(),
            block_number=event['blockNumber'],
            timestamp=int(time.time()),
            message=f"Compliance action: {event_type.value}",
            details={
                'event_type': event_type.value,
                'topics': [t.hex() if hasattr(t, 'hex') else t for t in event.get('topics', [])]
            }
        )
        return [alert]
    
    def _track_activity(self, event: LogReceipt, event_type: Optional[EventType]):
        """Track address activity patterns"""
        if 'address' in event:
            current_time = time.time()
            address = event['address']
            
            # Clean old activity
            self.address_activity[address] = [
                t for t in self.address_activity[address]
                if current_time - t < 3600  # Keep last hour
            ]
            
            # Add current activity
            self.address_activity[address].append(current_time)
    
    def _dispatch_alerts_loop(self):
        """Dispatch alerts to callback"""
        while self.is_running:
            try:
                alert = self.alert_queue.get(timeout=1)
                self._dispatch_alert(alert)
            except Empty:
                continue
            except Exception as e:
                self.logger.error(f"Error dispatching alert: {e}")
    
    def _dispatch_alert(self, alert: EventAlert):
        """Dispatch individual alert"""
        # Log alert
        self.logger.info(
            f"Alert [{alert.severity.value}]: {alert.message} "
            f"(tx: {alert.transaction_hash[:10]}...)"
        )
        
        # Call callback if provided
        if self.alert_callback:
            try:
                self.alert_callback(alert)
            except Exception as e:
                self.logger.error(f"Error in alert callback: {e}")
    
    def get_metrics(self) -> Dict[str, Any]:
        """Get current monitoring metrics"""
        with self.metrics_lock:
            return {
                'total_transactions': self.metrics.total_transactions,
                'successful_transactions': self.metrics.successful_transactions,
                'failed_transactions': self.metrics.failed_transactions,
                'total_gas_used': self.metrics.total_gas_used,
                'unique_addresses': len(self.metrics.unique_addresses),
                'events_by_type': dict(self.metrics.events_by_type),
                'monitored_contracts': len(self.monitored_contracts),
                'pending_events': self.event_queue.qsize(),
                'pending_alerts': self.alert_queue.qsize()
            }
    
    def get_recent_alerts(self, limit: int = 10) -> List[EventAlert]:
        """Get recent alerts"""
        alerts = []
        temp_queue = Queue()
        
        # Move alerts to temp queue and list
        while not self.alert_queue.empty() and len(alerts) < limit:
            try:
                alert = self.alert_queue.get_nowait()
                alerts.append(alert)
                temp_queue.put(alert)
            except Empty:
                break
        
        # Restore queue
        while not temp_queue.empty():
            self.alert_queue.put(temp_queue.get_nowait())
        
        return alerts
    
    def set_compliance_threshold(self, key: str, value: Any):
        """Update compliance threshold"""
        if key in self.compliance_thresholds:
            self.compliance_thresholds[key] = value
            self.logger.info(f"Updated compliance threshold {key} to {value}")
    
    def export_metrics(self, filepath: str):
        """Export metrics to JSON file"""
        metrics = self.get_metrics()
        metrics['timestamp'] = int(time.time())
        metrics['export_time'] = time.strftime('%Y-%m-%d %H:%M:%S')
        
        with open(filepath, 'w') as f:
            json.dump(metrics, f, indent=2)
        
        self.logger.info(f"Exported metrics to {filepath}")


# Factory function
def create_event_monitor(
    provider: PolygonProvider,
    alert_callback: Optional[Callable] = None,
    **kwargs
) -> EventMonitor:
    """
    Create configured event monitor
    
    Args:
        provider: Polygon provider instance
        alert_callback: Alert callback function
        **kwargs: Additional configuration
    
    Returns:
        Configured EventMonitor instance
    """
    return EventMonitor(provider, alert_callback, **kwargs)
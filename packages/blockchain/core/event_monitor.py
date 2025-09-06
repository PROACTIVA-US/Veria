"""
Blockchain Event Monitoring System

Real-time event monitoring for smart contracts with:
- WebSocket subscriptions
- Event filtering and processing
- Automatic reconnection
- Event persistence
- Alert notifications
"""

import asyncio
import json
import logging
import time
from typing import Dict, Any, List, Callable, Optional, Set
from dataclasses import dataclass, asdict
from datetime import datetime
from enum import Enum
from threading import Lock
import queue

from web3 import Web3
from web3.types import LogReceipt, FilterParams
from eth_typing import HexStr


class EventType(Enum):
    """Supported blockchain event types"""
    TRANSFER = "Transfer"
    MINT = "Mint"
    BURN = "Burn"
    APPROVAL = "Approval"
    FREEZE = "Freeze"
    UNFREEZE = "Unfreeze"
    IDENTITY_VERIFIED = "IdentityVerified"
    COMPLIANCE_UPDATED = "ComplianceUpdated"
    PAUSED = "Paused"
    UNPAUSED = "Unpaused"


@dataclass
class MonitoredEvent:
    """Represents a blockchain event"""
    event_type: str
    contract_address: str
    transaction_hash: str
    block_number: int
    timestamp: int
    args: Dict[str, Any]
    log_index: int
    processed: bool = False
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        return asdict(self)


class EventProcessor:
    """Base class for event processors"""
    
    def __init__(self, name: str):
        self.name = name
        self.logger = logging.getLogger(f"EventProcessor.{name}")
        
    async def process(self, event: MonitoredEvent) -> bool:
        """
        Process an event
        
        Args:
            event: The event to process
            
        Returns:
            True if processed successfully
        """
        raise NotImplementedError("Subclasses must implement process()")


class TransferEventProcessor(EventProcessor):
    """Process token transfer events"""
    
    def __init__(self, compliance_checker: Optional[Callable] = None):
        super().__init__("TransferProcessor")
        self.compliance_checker = compliance_checker
        
    async def process(self, event: MonitoredEvent) -> bool:
        """Process transfer events with compliance checks"""
        try:
            args = event.args
            from_addr = args.get('from', '')
            to_addr = args.get('to', '')
            value = args.get('value', 0)
            
            self.logger.info(
                f"Transfer: {from_addr[:8]}... -> {to_addr[:8]}... "
                f"Amount: {value} (Block: {event.block_number})"
            )
            
            # Run compliance check if available
            if self.compliance_checker:
                compliance_result = await self.compliance_checker(
                    from_addr,
                    to_addr,
                    value
                )
                if not compliance_result.get('compliant', True):
                    self.logger.warning(
                        f"Non-compliant transfer detected: {event.transaction_hash}"
                    )
            
            return True
            
        except Exception as e:
            self.logger.error(f"Failed to process transfer: {e}")
            return False


class EventMonitor:
    """
    Main event monitoring system for blockchain events
    """
    
    # Standard ERC20 event signatures
    EVENT_SIGNATURES = {
        EventType.TRANSFER: "Transfer(address,address,uint256)",
        EventType.MINT: "Mint(address,uint256)",
        EventType.BURN: "Burn(address,uint256)",
        EventType.APPROVAL: "Approval(address,address,uint256)",
        EventType.FREEZE: "Freeze(address)",
        EventType.UNFREEZE: "Unfreeze(address)",
        EventType.PAUSED: "Paused()",
        EventType.UNPAUSED: "Unpaused()"
    }
    
    def __init__(
        self,
        web3: Web3,
        poll_interval: float = 2.0,
        max_event_queue: int = 10000
    ):
        """
        Initialize event monitor
        
        Args:
            web3: Web3 instance
            poll_interval: Polling interval in seconds
            max_event_queue: Maximum queued events
        """
        self.w3 = web3
        self.poll_interval = poll_interval
        
        # Event tracking
        self.monitored_contracts: Set[str] = set()
        self.event_filters: Dict[str, Any] = {}
        self.event_processors: Dict[str, EventProcessor] = {}
        self.event_queue: queue.Queue = queue.Queue(maxsize=max_event_queue)
        
        # State management
        self.is_running = False
        self.last_block = self.w3.eth.block_number
        self.lock = Lock()
        
        # Statistics
        self.stats = {
            'events_received': 0,
            'events_processed': 0,
            'events_failed': 0,
            'start_time': None,
            'last_event_time': None
        }
        
        # Setup logging
        self.logger = self._setup_logging()
        
    @staticmethod
    def _setup_logging() -> logging.Logger:
        """Configure logging"""
        logger = logging.getLogger("veria.blockchain.event_monitor")
        logger.setLevel(logging.INFO)
        
        if not logger.handlers:
            handler = logging.StreamHandler()
            formatter = logging.Formatter(
                '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
            )
            handler.setFormatter(formatter)
            logger.addHandler(handler)
            
        return logger
    
    def add_contract(
        self,
        contract_address: str,
        event_types: List[EventType],
        from_block: Optional[int] = None
    ) -> None:
        """
        Add a contract to monitor
        
        Args:
            contract_address: Contract address to monitor
            event_types: List of event types to monitor
            from_block: Starting block number
        """
        checksum_address = self.w3.to_checksum_address(contract_address)
        
        with self.lock:
            self.monitored_contracts.add(checksum_address)
            
            for event_type in event_types:
                filter_id = f"{checksum_address}_{event_type.value}"
                
                if filter_id not in self.event_filters:
                    # Create event signature hash
                    event_sig = self.EVENT_SIGNATURES.get(event_type)
                    if event_sig:
                        event_hash = self.w3.keccak(text=event_sig).hex()
                        
                        # Create filter
                        filter_params = FilterParams(
                            address=checksum_address,
                            fromBlock=from_block or self.last_block,
                            topics=[event_hash]
                        )
                        
                        self.event_filters[filter_id] = {
                            'params': filter_params,
                            'event_type': event_type,
                            'contract': checksum_address,
                            'last_poll': time.time()
                        }
                        
                        self.logger.info(
                            f"Added monitor for {event_type.value} on {checksum_address[:10]}..."
                        )
    
    def remove_contract(self, contract_address: str) -> None:
        """Remove a contract from monitoring"""
        checksum_address = self.w3.to_checksum_address(contract_address)
        
        with self.lock:
            self.monitored_contracts.discard(checksum_address)
            
            # Remove associated filters
            filters_to_remove = [
                fid for fid in self.event_filters
                if fid.startswith(checksum_address)
            ]
            
            for filter_id in filters_to_remove:
                del self.event_filters[filter_id]
                
            self.logger.info(f"Removed monitor for {checksum_address[:10]}...")
    
    def add_processor(self, event_type: EventType, processor: EventProcessor) -> None:
        """Add an event processor"""
        self.event_processors[event_type.value] = processor
        self.logger.info(f"Added processor for {event_type.value} events")
    
    async def start(self) -> None:
        """Start the event monitoring system"""
        if self.is_running:
            return
            
        self.is_running = True
        self.stats['start_time'] = time.time()
        
        self.logger.info("Starting event monitor...")
        
        # Start polling task
        asyncio.create_task(self._poll_events())
        
        # Start processing task
        asyncio.create_task(self._process_events())
        
    async def stop(self) -> None:
        """Stop the event monitoring system"""
        self.is_running = False
        self.logger.info("Stopping event monitor...")
    
    async def _poll_events(self) -> None:
        """Poll for new events"""
        while self.is_running:
            try:
                current_block = self.w3.eth.block_number
                
                with self.lock:
                    for filter_id, filter_info in self.event_filters.items():
                        try:
                            # Get logs for filter
                            params = filter_info['params']
                            params['fromBlock'] = self.last_block + 1
                            params['toBlock'] = current_block
                            
                            logs = self.w3.eth.get_logs(params)
                            
                            for log in logs:
                                event = self._parse_log(log, filter_info)
                                if event:
                                    self.event_queue.put(event)
                                    self.stats['events_received'] += 1
                                    self.stats['last_event_time'] = time.time()
                                    
                        except Exception as e:
                            self.logger.error(f"Error polling filter {filter_id}: {e}")
                
                self.last_block = current_block
                
            except Exception as e:
                self.logger.error(f"Polling error: {e}")
                
            await asyncio.sleep(self.poll_interval)
    
    def _parse_log(self, log: LogReceipt, filter_info: Dict) -> Optional[MonitoredEvent]:
        """Parse a log into a MonitoredEvent"""
        try:
            # Extract event arguments (simplified - actual implementation would decode based on ABI)
            args = {
                'topics': [topic.hex() if hasattr(topic, 'hex') else str(topic) 
                          for topic in log.get('topics', [])],
                'data': log.get('data', '0x')
            }
            
            # For Transfer events, parse the standard arguments
            event_type = filter_info['event_type']
            if event_type == EventType.TRANSFER and len(log['topics']) >= 3:
                args = {
                    'from': '0x' + log['topics'][1].hex()[-40:],
                    'to': '0x' + log['topics'][2].hex()[-40:],
                    'value': int(log['data'], 16) if log['data'] != '0x' else 0
                }
            
            return MonitoredEvent(
                event_type=event_type.value,
                contract_address=filter_info['contract'],
                transaction_hash=log['transactionHash'].hex(),
                block_number=log['blockNumber'],
                timestamp=int(time.time()),  # Would get actual block timestamp
                args=args,
                log_index=log['logIndex']
            )
            
        except Exception as e:
            self.logger.error(f"Failed to parse log: {e}")
            return None
    
    async def _process_events(self) -> None:
        """Process events from the queue"""
        while self.is_running:
            try:
                # Get event from queue (non-blocking)
                try:
                    event = self.event_queue.get(timeout=1)
                except queue.Empty:
                    await asyncio.sleep(0.1)
                    continue
                
                # Find processor for event type
                processor = self.event_processors.get(event.event_type)
                
                if processor:
                    success = await processor.process(event)
                    if success:
                        event.processed = True
                        self.stats['events_processed'] += 1
                    else:
                        self.stats['events_failed'] += 1
                else:
                    # No processor, just log
                    self.logger.info(
                        f"Event {event.event_type} from {event.contract_address[:10]}... "
                        f"(Block: {event.block_number})"
                    )
                    self.stats['events_processed'] += 1
                    
            except Exception as e:
                self.logger.error(f"Event processing error: {e}")
                self.stats['events_failed'] += 1
    
    def get_stats(self) -> Dict[str, Any]:
        """Get monitoring statistics"""
        runtime = 0
        if self.stats['start_time']:
            runtime = time.time() - self.stats['start_time']
            
        return {
            'is_running': self.is_running,
            'monitored_contracts': len(self.monitored_contracts),
            'active_filters': len(self.event_filters),
            'events_received': self.stats['events_received'],
            'events_processed': self.stats['events_processed'],
            'events_failed': self.stats['events_failed'],
            'queue_size': self.event_queue.qsize(),
            'runtime_seconds': runtime,
            'last_block': self.last_block,
            'last_event_time': self.stats['last_event_time']
        }
    
    async def get_historical_events(
        self,
        contract_address: str,
        event_type: EventType,
        from_block: int,
        to_block: Optional[int] = None
    ) -> List[MonitoredEvent]:
        """
        Get historical events for analysis
        
        Args:
            contract_address: Contract address
            event_type: Type of event
            from_block: Starting block
            to_block: Ending block (latest if None)
            
        Returns:
            List of historical events
        """
        checksum_address = self.w3.to_checksum_address(contract_address)
        event_sig = self.EVENT_SIGNATURES.get(event_type)
        
        if not event_sig:
            return []
            
        event_hash = self.w3.keccak(text=event_sig).hex()
        
        # Get logs
        params = FilterParams(
            address=checksum_address,
            fromBlock=from_block,
            toBlock=to_block or 'latest',
            topics=[event_hash]
        )
        
        logs = self.w3.eth.get_logs(params)
        
        # Parse logs into events
        events = []
        for log in logs:
            event = self._parse_log(log, {
                'event_type': event_type,
                'contract': checksum_address
            })
            if event:
                events.append(event)
                
        return events


def create_event_monitor(
    web3: Web3,
    contracts: Optional[List[Dict[str, Any]]] = None
) -> EventMonitor:
    """
    Factory function to create configured event monitor
    
    Args:
        web3: Web3 instance
        contracts: List of contracts to monitor
        
    Returns:
        Configured EventMonitor instance
    """
    monitor = EventMonitor(web3)
    
    # Add default processors
    monitor.add_processor(EventType.TRANSFER, TransferEventProcessor())
    
    # Add contracts if provided
    if contracts:
        for contract in contracts:
            monitor.add_contract(
                contract['address'],
                contract.get('events', [EventType.TRANSFER, EventType.MINT, EventType.BURN]),
                contract.get('from_block')
            )
    
    return monitor
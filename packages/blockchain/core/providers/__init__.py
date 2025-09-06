"""
Blockchain Provider Package for Veria Platform
Institutional-grade Web3 connectivity for tokenized RWA transactions
"""

from .polygon_provider import (
    PolygonProvider,
    ConnectionPool,
    GasConfig,
    RetryConfig,
    create_polygon_provider
)

__version__ = '0.1.0'

__all__ = [
    'PolygonProvider',
    'ConnectionPool',
    'GasConfig',
    'RetryConfig',
    'create_polygon_provider'
]
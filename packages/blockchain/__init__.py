"""
Veria Blockchain Integration Package

Provides multi-chain blockchain connectivity and smart contract interactions
for tokenized real-world assets with compliance integration.
"""

__version__ = "0.1.0"

from .core.providers.polygon_provider import PolygonProvider

__all__ = ["PolygonProvider"]
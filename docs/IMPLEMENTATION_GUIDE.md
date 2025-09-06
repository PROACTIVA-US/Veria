# Implementation Guide: Week 5-6 Sprint
## Blockchain Integration for Veria

### Quick Start Checklist

#### 1. Install Web3 Dependencies
```bash
# Python dependencies
poetry add web3 py-solana eth-account

# Node.js dependencies
cd packages/edge_proxy
npm install ethers @solana/web3.js viem

# Smart contract tools
npm install -g @openzeppelin/contracts
npm install -g hardhat
```

#### 2. Create Blockchain Package Structure
```bash
# Create directory structure
mkdir -p packages/blockchain/{core,contracts,bridges,utils}
mkdir -p packages/blockchain/core/{providers,contracts,wallets}
mkdir -p packages/blockchain/contracts/{erc3643,interfaces,compliance}
mkdir -p packages/blockchain/bridges/{wormhole,layerzero}
mkdir -p packages/blockchain/utils/{gas,signing}

# Create __init__.py files for Python packages
touch packages/blockchain/__init__.py
touch packages/blockchain/core/__init__.py
touch packages/blockchain/core/providers/__init__.py
```

#### 3. Initial Provider Implementation
```python
# packages/blockchain/core/providers/ethereum_provider.py
from web3 import Web3
from web3.middleware import geth_poa_middleware
from typing import Optional, Dict, Any
import os

class EthereumProvider:
    """Ethereum blockchain provider with automatic network detection"""
    
    def __init__(self, network: str = "mainnet"):
        self.network = network
        self.w3 = self._initialize_provider()
        
    def _initialize_provider(self) -> Web3:
        """Initialize Web3 provider based on network"""
        rpc_urls = {
            "mainnet": f"https://mainnet.infura.io/v3/{os.getenv('INFURA_KEY')}",
            "polygon": "https://polygon-rpc.com",
            "goerli": f"https://goerli.infura.io/v3/{os.getenv('INFURA_KEY')}",
        }
        
        w3 = Web3(Web3.HTTPProvider(rpc_urls.get(self.network)))
        
        # Add POA middleware for testnets
        if self.network in ["goerli", "polygon"]:
            w3.middleware_onion.inject(geth_poa_middleware, layer=0)
            
        return w3
    
    async def get_balance(self, address: str) -> float:
        """Get ETH balance for address"""
        balance_wei = self.w3.eth.get_balance(address)
        return self.w3.from_wei(balance_wei, 'ether')
    
    async def check_compliance(self, address: str) -> Dict[str, Any]:
        """Check on-chain compliance status"""
        # TODO: Implement ERC-3643 compliance check
        return {"compliant": True, "credentials": []}
```

#### 4. ERC-3643 Smart Contract Template
```solidity
// contracts/compliance/TokenCompliance.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";

interface ICompliance {
    function canTransfer(address from, address to, uint256 amount) external view returns (bool);
}

contract TokenCompliance is ICompliance, Ownable {
    mapping(address => bool) public isVerified;
    mapping(address => uint256) public countryCode;
    mapping(uint256 => bool) public allowedCountries;
    
    event VerificationUpdated(address indexed user, bool status);
    event CountryAllowanceUpdated(uint256 country, bool allowed);
    
    constructor() {
        // Initialize with US, EU, SG allowed
        allowedCountries[1] = true;  // US
        allowedCountries[2] = true;  // EU
        allowedCountries[3] = true;  // SG
    }
    
    function canTransfer(
        address from,
        address to,
        uint256 amount
    ) external view override returns (bool) {
        // Check both parties are verified
        if (!isVerified[from] || !isVerified[to]) {
            return false;
        }
        
        // Check both parties are in allowed countries
        if (!allowedCountries[countryCode[from]] || 
            !allowedCountries[countryCode[to]]) {
            return false;
        }
        
        // Add more compliance rules here
        // - Accredited investor check
        // - Transfer limits
        // - Time-based restrictions
        
        return true;
    }
    
    function updateVerification(
        address user, 
        bool verified, 
        uint256 country
    ) external onlyOwner {
        isVerified[user] = verified;
        countryCode[user] = country;
        emit VerificationUpdated(user, verified);
    }
}
```

#### 5. Hardhat Configuration
```javascript
// hardhat.config.js
require("@nomiclabs/hardhat-waffle");
require("@nomiclabs/hardhat-ethers");
require("dotenv").config();

module.exports = {
  solidity: "0.8.19",
  networks: {
    hardhat: {
      forking: {
        url: `https://mainnet.infura.io/v3/${process.env.INFURA_KEY}`,
      }
    },
    goerli: {
      url: `https://goerli.infura.io/v3/${process.env.INFURA_KEY}`,
      accounts: [process.env.PRIVATE_KEY]
    },
    polygon: {
      url: "https://polygon-rpc.com",
      accounts: [process.env.PRIVATE_KEY]
    }
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts"
  }
};
```

#### 6. Compliance Integration
```python
# packages/compliance/providers/chainalysis_client.py
import httpx
from typing import Dict, Any
import os

class ChainalysisClient:
    """Chainalysis KYT API integration"""
    
    def __init__(self):
        self.api_key = os.getenv("CHAINALYSIS_API_KEY")
        self.base_url = "https://api.chainalysis.com/api/kyt/v2"
        
    async def screen_address(self, address: str, network: str = "Ethereum") -> Dict[str, Any]:
        """Screen a wallet address for risk"""
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.base_url}/users",
                headers={"Token": self.api_key},
                json={
                    "address": address,
                    "network": network,
                    "type": "WALLET"
                }
            )
            
            if response.status_code == 200:
                data = response.json()
                return {
                    "risk_score": data.get("risk", 0),
                    "risk_level": self._calculate_risk_level(data.get("risk", 0)),
                    "flags": data.get("flags", []),
                    "cluster": data.get("cluster", {})
                }
            return {"error": "Screening failed"}
    
    def _calculate_risk_level(self, score: float) -> str:
        """Calculate risk level from score"""
        if score < 0.3:
            return "LOW"
        elif score < 0.7:
            return "MEDIUM"
        return "HIGH"
```

#### 7. Update Docker Compose
```yaml
# docker-compose.yml additions
services:
  # ... existing services ...
  
  blockchain-indexer:
    image: graph-node:latest
    container_name: blockchain_indexer
    environment:
      postgres_host: postgres
      postgres_user: ${DB_USER}
      postgres_pass: ${DB_PASSWORD}
      postgres_db: graph
      ipfs: 'ipfs:5001'
      ethereum: 'mainnet:${INFURA_ENDPOINT}'
    depends_on:
      - postgres
      - ipfs
    ports:
      - "8000:8000"
      - "8020:8020"
      
  ipfs:
    image: ipfs/go-ipfs:latest
    container_name: ipfs
    ports:
      - "5001:5001"
    volumes:
      - ipfs_data:/data/ipfs
      
  postgres:
    image: postgres:15
    container_name: postgres
    environment:
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: veria
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

volumes:
  ipfs_data:
  postgres_data:
```

#### 8. Environment Variables
```bash
# .env additions
# Blockchain
INFURA_KEY=your_infura_project_id
ALCHEMY_KEY=your_alchemy_key
PRIVATE_KEY=your_wallet_private_key_for_testing

# Compliance Providers
CHAINALYSIS_API_KEY=your_chainalysis_key
QUADRATA_API_KEY=your_quadrata_key
TRM_API_KEY=your_trm_labs_key

# Oracle Providers
REDSTONE_API_KEY=your_redstone_key
CHAINLINK_API_KEY=your_chainlink_key

# Database
DB_USER=veria
DB_PASSWORD=secure_password_here
DB_HOST=localhost
DB_PORT=5432
DB_NAME=veria
```

#### 9. Test Implementation
```python
# tests/test_blockchain_integration.py
import pytest
from packages.blockchain.core.providers import EthereumProvider
from packages.compliance.providers import ChainalysisClient

@pytest.mark.asyncio
async def test_ethereum_provider():
    """Test Ethereum provider initialization"""
    provider = EthereumProvider(network="goerli")
    assert provider.w3.is_connected()
    
    # Test balance check
    balance = await provider.get_balance("0x0000000000000000000000000000000000000000")
    assert isinstance(balance, float)

@pytest.mark.asyncio
async def test_compliance_screening():
    """Test Chainalysis integration"""
    client = ChainalysisClient()
    
    # Test with known safe address
    result = await client.screen_address(
        "0x0000000000000000000000000000000000000000"
    )
    
    assert "risk_score" in result
    assert result["risk_level"] in ["LOW", "MEDIUM", "HIGH"]
```

#### 10. Run Initial Tests
```bash
# Deploy contracts to testnet
npx hardhat compile
npx hardhat deploy --network goerli

# Run Python tests
poetry run pytest tests/test_blockchain_integration.py -v

# Run integration tests
make test

# Check coverage
poetry run pytest --cov=packages --cov-report=html
```

### Next Steps

1. **Deploy ERC-3643 contracts** to Goerli testnet
2. **Integrate Chainalysis API** for real compliance checks
3. **Build cross-chain bridge** using Wormhole SDK
4. **Add multi-signature support** for DAO operations
5. **Implement gas optimization** strategies

### Resources
- [ERC-3643 Standard](https://erc3643.org/)
- [Web3.py Documentation](https://web3py.readthedocs.io/)
- [Chainalysis API Docs](https://docs.chainalysis.com/)
- [Wormhole SDK](https://docs.wormhole.com/)

### Common Issues & Solutions

#### Issue: Web3 connection fails
```python
# Solution: Use fallback providers
providers = [
    f"https://mainnet.infura.io/v3/{INFURA_KEY}",
    f"https://eth-mainnet.alchemyapi.io/v2/{ALCHEMY_KEY}",
    "https://cloudflare-eth.com"
]

for provider_url in providers:
    try:
        w3 = Web3(Web3.HTTPProvider(provider_url))
        if w3.is_connected():
            break
    except:
        continue
```

#### Issue: Gas prices too high
```python
# Solution: Implement gas optimization
def get_optimal_gas_price(w3):
    """Get optimal gas price with safety margin"""
    base_fee = w3.eth.get_block('latest')['baseFeePerGas']
    priority_fee = w3.eth.max_priority_fee
    
    # Add 10% safety margin
    return int((base_fee + priority_fee) * 1.1)
```

### Sprint Checklist
- [ ] Web3 providers initialized
- [ ] ERC-3643 contracts deployed
- [ ] Chainalysis integration working
- [ ] Cross-chain bridge started
- [ ] 70% test coverage achieved
- [ ] Documentation updated
- [ ] Code review completed

---

**Sprint Duration**: 2 weeks  
**Next Milestone**: Compliance Engine (Week 7-8)  
**Support**: Use DevAssist for code generation and debugging
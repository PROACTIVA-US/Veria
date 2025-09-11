import Fastify from 'fastify';
import helmet from '@fastify/helmet';
import cors from '@fastify/cors';
import { ethers } from 'ethers';
import { z } from 'zod';
import { readFileSync } from 'fs';
import { join } from 'path';

const PORT = process.env.PORT || 3006;
const NETWORK = process.env.NETWORK || 'localhost';
const RPC_URL = process.env.RPC_URL || 'http://127.0.0.1:8545';
const PRIVATE_KEY = process.env.PRIVATE_KEY || '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';

// Load contract ABIs
const loadContractABI = (contractName: string) => {
  try {
    const artifactPath = join(process.cwd(), '../../contracts/artifacts/contracts');
    const artifact = JSON.parse(
      readFileSync(
        join(artifactPath, `${contractName}.sol/${contractName.split('/').pop()}.json`),
        'utf8'
      )
    );
    return artifact.abi;
  } catch (error) {
    console.error(`Failed to load ABI for ${contractName}:`, error);
    return null;
  }
};

// Load deployment addresses
const loadDeployment = () => {
  try {
    const deploymentPath = join(process.cwd(), '../../contracts/deployments', `${NETWORK}.json`);
    return JSON.parse(readFileSync(deploymentPath, 'utf8'));
  } catch (error) {
    console.error('Failed to load deployment:', error);
    return null;
  }
};

// Initialize blockchain connection
const provider = new ethers.JsonRpcProvider(RPC_URL);
const signer = new ethers.Wallet(PRIVATE_KEY, provider);

// Load contracts
const deployment = loadDeployment();
const contracts = deployment ? {
  token: new ethers.Contract(
    deployment.contracts.token,
    loadContractABI('VeriaSecurityToken'),
    signer
  ),
  identityRegistry: new ethers.Contract(
    deployment.contracts.identityRegistry,
    loadContractABI('registry/IdentityRegistry'),
    signer
  ),
  compliance: new ethers.Contract(
    deployment.contracts.compliance,
    loadContractABI('compliance/ModularCompliance'),
    signer
  )
} : null;

const server = Fastify({ logger: true });

server.register(helmet);
server.register(cors, {
  origin: process.env.CORS_ORIGIN?.split(',') || true
});

// Health check
server.get('/health', async () => ({
  status: 'ok',
  service: 'blockchain',
  network: NETWORK,
  contracts: deployment ? {
    token: deployment.contracts.token,
    identityRegistry: deployment.contracts.identityRegistry,
    compliance: deployment.contracts.compliance
  } : null
}));

// Token operations
const MintSchema = z.object({
  to: z.string(),
  amount: z.string()
});

server.post('/token/mint', async (request, reply) => {
  try {
    const { to, amount } = MintSchema.parse(request.body);
    
    if (!contracts) {
      return reply.status(503).send({ error: 'Contracts not initialized' });
    }
    
    const tx = await contracts.token.mint(to, ethers.parseEther(amount));
    const receipt = await tx.wait();
    
    return {
      success: true,
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber
    };
  } catch (error) {
    server.log.error(error);
    return reply.status(400).send({ error: error.message });
  }
});

const TransferSchema = z.object({
  from: z.string(),
  to: z.string(),
  amount: z.string()
});

server.post('/token/transfer', async (request, reply) => {
  try {
    const { from, to, amount } = TransferSchema.parse(request.body);
    
    if (!contracts) {
      return reply.status(503).send({ error: 'Contracts not initialized' });
    }
    
    // For forced transfer (admin operation)
    const tx = await contracts.token.forcedTransfer(from, to, ethers.parseEther(amount));
    const receipt = await tx.wait();
    
    return {
      success: true,
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber
    };
  } catch (error) {
    server.log.error(error);
    return reply.status(400).send({ error: error.message });
  }
});

server.get('/token/balance/:address', async (request, reply) => {
  try {
    const { address } = request.params as { address: string };
    
    if (!contracts) {
      return reply.status(503).send({ error: 'Contracts not initialized' });
    }
    
    const balance = await contracts.token.balanceOf(address);
    const frozen = await contracts.token.getFrozenTokens(address);
    
    return {
      address,
      balance: ethers.formatEther(balance),
      frozen: ethers.formatEther(frozen),
      available: ethers.formatEther(balance - frozen)
    };
  } catch (error) {
    server.log.error(error);
    return reply.status(400).send({ error: error.message });
  }
});

// Identity operations
const RegisterIdentitySchema = z.object({
  userAddress: z.string(),
  identityAddress: z.string(),
  country: z.number()
});

server.post('/identity/register', async (request, reply) => {
  try {
    const { userAddress, identityAddress, country } = RegisterIdentitySchema.parse(request.body);
    
    if (!contracts) {
      return reply.status(503).send({ error: 'Contracts not initialized' });
    }
    
    const tx = await contracts.identityRegistry.registerIdentity(
      userAddress,
      identityAddress,
      country
    );
    const receipt = await tx.wait();
    
    return {
      success: true,
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber
    };
  } catch (error) {
    server.log.error(error);
    return reply.status(400).send({ error: error.message });
  }
});

server.get('/identity/verify/:address', async (request, reply) => {
  try {
    const { address } = request.params as { address: string };
    
    if (!contracts) {
      return reply.status(503).send({ error: 'Contracts not initialized' });
    }
    
    const isVerified = await contracts.identityRegistry.isVerified(address);
    const identity = await contracts.identityRegistry.identity(address);
    const country = await contracts.identityRegistry.investorCountry(address);
    
    return {
      address,
      isVerified,
      identity: identity !== ethers.ZeroAddress ? identity : null,
      country: country.toString()
    };
  } catch (error) {
    server.log.error(error);
    return reply.status(400).send({ error: error.message });
  }
});

// Compliance operations
const ComplianceCheckSchema = z.object({
  from: z.string(),
  to: z.string(),
  amount: z.string()
});

server.post('/compliance/check', async (request, reply) => {
  try {
    const { from, to, amount } = ComplianceCheckSchema.parse(request.body);
    
    if (!contracts) {
      return reply.status(503).send({ error: 'Contracts not initialized' });
    }
    
    const canTransfer = await contracts.compliance.canTransfer(
      from,
      to,
      ethers.parseEther(amount)
    );
    
    return {
      from,
      to,
      amount,
      canTransfer,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    server.log.error(error);
    return reply.status(400).send({ error: error.message });
  }
});

server.get('/compliance/rules', async (request, reply) => {
  try {
    if (!contracts) {
      return reply.status(503).send({ error: 'Contracts not initialized' });
    }
    
    const ruleIds = await contracts.compliance.getComplianceIds();
    
    const ruleNames = {
      '1': 'COUNTRY_RESTRICTION',
      '2': 'INVESTOR_LIMIT',
      '3': 'HOLDING_LIMIT',
      '4': 'DAILY_LIMIT',
      '5': 'WHITELIST_ONLY'
    };
    
    const rules = ruleIds.map((id: bigint) => ({
      id: id.toString(),
      name: ruleNames[id.toString()] || 'UNKNOWN',
      active: true
    }));
    
    return { rules };
  } catch (error) {
    server.log.error(error);
    return reply.status(400).send({ error: error.message });
  }
});

// Event monitoring
server.get('/events/recent', async (request, reply) => {
  try {
    if (!contracts) {
      return reply.status(503).send({ error: 'Contracts not initialized' });
    }
    
    const currentBlock = await provider.getBlockNumber();
    const fromBlock = Math.max(0, currentBlock - 100); // Last 100 blocks
    
    // Get token transfer events
    const transferFilter = contracts.token.filters.Transfer();
    const transferEvents = await contracts.token.queryFilter(transferFilter, fromBlock, currentBlock);
    
    // Get identity events
    const identityFilter = contracts.identityRegistry.filters.IdentityAdded();
    const identityEvents = await contracts.identityRegistry.queryFilter(identityFilter, fromBlock, currentBlock);
    
    const events = [
      ...transferEvents.map(e => ({
        type: 'Transfer',
        from: e.args[0],
        to: e.args[1],
        amount: ethers.formatEther(e.args[2]),
        blockNumber: e.blockNumber,
        txHash: e.transactionHash
      })),
      ...identityEvents.map(e => ({
        type: 'IdentityAdded',
        userAddress: e.args[0],
        identity: e.args[1],
        country: e.args[2].toString(),
        blockNumber: e.blockNumber,
        txHash: e.transactionHash
      }))
    ].sort((a, b) => b.blockNumber - a.blockNumber);
    
    return { events, fromBlock, toBlock: currentBlock };
  } catch (error) {
    server.log.error(error);
    return reply.status(400).send({ error: error.message });
  }
});

// Network info
server.get('/network/info', async (request, reply) => {
  try {
    const network = await provider.getNetwork();
    const blockNumber = await provider.getBlockNumber();
    const gasPrice = await provider.getFeeData();
    
    return {
      chainId: network.chainId.toString(),
      name: network.name,
      blockNumber,
      gasPrice: {
        gasPrice: gasPrice.gasPrice ? ethers.formatUnits(gasPrice.gasPrice, 'gwei') : null,
        maxFeePerGas: gasPrice.maxFeePerGas ? ethers.formatUnits(gasPrice.maxFeePerGas, 'gwei') : null,
        maxPriorityFeePerGas: gasPrice.maxPriorityFeePerGas ? ethers.formatUnits(gasPrice.maxPriorityFeePerGas, 'gwei') : null
      }
    };
  } catch (error) {
    server.log.error(error);
    return reply.status(400).send({ error: error.message });
  }
});

const start = async () => {
  try {
    await server.listen({ port: PORT as number, host: '0.0.0.0' });
    console.log(`Blockchain service running on port ${PORT}`);
    console.log(`Connected to network: ${NETWORK}`);
    console.log(`RPC URL: ${RPC_URL}`);
    if (deployment) {
      console.log('Contracts loaded:', deployment.contracts);
    } else {
      console.log('Warning: No deployment found for network:', NETWORK);
    }
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

start();
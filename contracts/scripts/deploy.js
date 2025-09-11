const hre = require("hardhat");

async function main() {
  console.log("Starting Veria ERC-3643 deployment...");

  // Get deployer account
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);

  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", hre.ethers.formatEther(balance));

  // Deploy Identity Registry
  console.log("\n1. Deploying Identity Registry...");
  const IdentityRegistry = await hre.ethers.getContractFactory("IdentityRegistry");
  const identityRegistry = await IdentityRegistry.deploy();
  await identityRegistry.waitForDeployment();
  const identityRegistryAddress = await identityRegistry.getAddress();
  console.log("Identity Registry deployed to:", identityRegistryAddress);

  // Deploy Compliance Module
  console.log("\n2. Deploying Modular Compliance...");
  const ModularCompliance = await hre.ethers.getContractFactory("ModularCompliance");
  const compliance = await ModularCompliance.deploy();
  await compliance.waitForDeployment();
  const complianceAddress = await compliance.getAddress();
  console.log("Modular Compliance deployed to:", complianceAddress);

  // Deploy Security Token
  console.log("\n3. Deploying Veria Security Token...");
  const VeriaSecurityToken = await hre.ethers.getContractFactory("VeriaSecurityToken");
  const token = await VeriaSecurityToken.deploy(
    "Veria Real Estate Token",
    "VRET",
    hre.ethers.parseEther("1000000"), // 1M initial supply
    identityRegistryAddress,
    complianceAddress
  );
  await token.waitForDeployment();
  const tokenAddress = await token.getAddress();
  console.log("Veria Security Token deployed to:", tokenAddress);

  // Bind token to compliance
  console.log("\n4. Binding token to compliance module...");
  await compliance.bindToken(tokenAddress);
  console.log("Token bound to compliance module");

  // Add deployer as agent to Identity Registry
  console.log("\n5. Adding deployer as agent to Identity Registry...");
  await identityRegistry.addAgent(deployer.address);
  console.log("Deployer added as agent");

  // Add deployer as agent to Token
  console.log("\n6. Adding deployer as agent to Token...");
  await token.addAgent(deployer.address);
  console.log("Deployer added as token agent");

  // Register deployer identity (for testing)
  console.log("\n7. Registering deployer identity...");
  await identityRegistry.registerIdentity(
    deployer.address,
    deployer.address, // Using same address as identity for testing
    1 // Country code 1 (US)
  );
  console.log("Deployer identity registered");

  // Save deployment addresses
  const deployment = {
    network: hre.network.name,
    chainId: hre.network.config.chainId,
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    contracts: {
      identityRegistry: identityRegistryAddress,
      compliance: complianceAddress,
      token: tokenAddress
    }
  };

  const fs = require("fs");
  const deploymentPath = `./deployments/${hre.network.name}.json`;
  
  // Create deployments directory if it doesn't exist
  if (!fs.existsSync("./deployments")) {
    fs.mkdirSync("./deployments");
  }
  
  fs.writeFileSync(deploymentPath, JSON.stringify(deployment, null, 2));
  console.log(`\nDeployment info saved to ${deploymentPath}`);

  console.log("\n=== Deployment Complete ===");
  console.log("Identity Registry:", identityRegistryAddress);
  console.log("Compliance Module:", complianceAddress);
  console.log("Security Token:", tokenAddress);
  console.log("========================\n");

  // Verify contracts on Etherscan/Polygonscan if not on localhost
  if (hre.network.name !== "localhost" && hre.network.name !== "hardhat") {
    console.log("Waiting for block confirmations...");
    
    // Wait for 5 block confirmations
    await token.deploymentTransaction().wait(5);
    
    console.log("Verifying contracts on explorer...");
    
    try {
      await hre.run("verify:verify", {
        address: identityRegistryAddress,
        constructorArguments: []
      });
      console.log("Identity Registry verified");
    } catch (error) {
      console.log("Identity Registry verification failed:", error.message);
    }

    try {
      await hre.run("verify:verify", {
        address: complianceAddress,
        constructorArguments: []
      });
      console.log("Compliance Module verified");
    } catch (error) {
      console.log("Compliance Module verification failed:", error.message);
    }

    try {
      await hre.run("verify:verify", {
        address: tokenAddress,
        constructorArguments: [
          "Veria Real Estate Token",
          "VRET",
          hre.ethers.parseEther("1000000"),
          identityRegistryAddress,
          complianceAddress
        ]
      });
      console.log("Security Token verified");
    } catch (error) {
      console.log("Security Token verification failed:", error.message);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
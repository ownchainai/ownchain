// Deployment script
const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  // Deploy OwnToken contract
  const OwnToken = await hre.ethers.getContractFactory("OwnToken");
  
  // Set token allocation addresses
  const ecosystemDevelopmentAddress = deployer.address; // Ecosystem development address
  const teamAndAdvisorsAddress = deployer.address;      // Team and advisors address
  const communityIncentivesAddress = deployer.address;  // Community incentives address
  const publicSaleAddress = deployer.address;           // Public sale address
  const platformIntegrationRewardsAddress = deployer.address; // Platform integration rewards address
  const liquidityAndReservesAddress = deployer.address; // Liquidity and reserves address
  const feeCollector = deployer.address;                // Fee collector address

  const ownToken = await OwnToken.deploy(
    deployer.address,
    ecosystemDevelopmentAddress,
    teamAndAdvisorsAddress,
    communityIncentivesAddress,
    publicSaleAddress,
    platformIntegrationRewardsAddress,
    liquidityAndReservesAddress,
    feeCollector
  );

  await ownToken.waitForDeployment();
  console.log("OwnToken deployed to:", await ownToken.getAddress());

  // Deploy ContentOwnership contract
  const ContentOwnership = await hre.ethers.getContractFactory("ContentOwnership");
  const contentOwnership = await ContentOwnership.deploy(deployer.address);
  await contentOwnership.waitForDeployment();
  console.log("ContentOwnership deployed to:", await contentOwnership.getAddress());

  // Deploy ContentMonetization contract
  const ContentMonetization = await hre.ethers.getContractFactory("ContentMonetization");
  const contentMonetization = await ContentMonetization.deploy(
    deployer.address,
    await ownToken.getAddress(),
    await contentOwnership.getAddress()
  );
  await contentMonetization.waitForDeployment();
  console.log("ContentMonetization deployed to:", await contentMonetization.getAddress());

  console.log("Deployment completed!");
}

// Run deployment script
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 
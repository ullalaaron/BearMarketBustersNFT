import { ethers } from "hardhat";

async function main() {
  const BearMarketBustersContractFactory = await ethers.getContractFactory(
    "BearMarketBusters"
  );
  const contractAddress = process.env.DEPLOYED_SMART_CONTRACT_ADDRESS!;
  console.log("withdrawing from smart contract deployed at " + contractAddress);
  const contract = await BearMarketBustersContractFactory.attach(
    contractAddress
  );

  // Now you can call functions of the contract
  await contract.withdraw();
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

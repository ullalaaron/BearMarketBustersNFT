// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
import { Signer } from "ethers";
import hre, { ethers } from "hardhat";
import {
  ProdCollectionConfig,
  TestCollectionConfig,
} from "../config/CollectionConfig";

async function main() {
  // Hardhat always runs the compile task when running scripts with its command
  // line interface.
  //
  // If this script is run directly using `node` you may want to call compile
  // manually to make sure everything is compiled
  // await hre.run('compile');

  let owner: Signer;
  [owner] = await ethers.getSigners();
  const networkName = hre.network.name;

  const isProdDeploy = networkName === "mainnet";

  console.log("Deploying to", networkName);

  const contractConfig = isProdDeploy
    ? ProdCollectionConfig
    : TestCollectionConfig;

  const BearMarketBustersContractFactory = await ethers.getContractFactory(
    "BearMarketBusters"
  );

  const contract = await BearMarketBustersContractFactory.deploy(
    contractConfig.tokenName,
    contractConfig.tokenSymbol,
    contractConfig.baseURI
  );
  await contract.deployed();

  console.log("Contract deployed to:", contract.address);
  console.log("Minting first bear...");
  await contract.connect(owner).reserveFirstBear();
  console.log("Minted!");
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

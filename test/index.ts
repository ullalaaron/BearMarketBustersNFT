import { expect } from "chai";
import { Contract, ContractFactory, Signer } from "ethers";
import { ethers } from "hardhat";
import { CollectionConfig as contractConfig } from "../config/CollectionConfig";

describe("BearMarketBusters", function () {
  const onlyOwnerMessage = "Ownable: caller is not the owner";
  let bearMarketBustersFactory: ContractFactory;
  let bearMarketBustersContract: Contract;
  let owner: Signer, addr1: Signer, addr2: Signer, addr3: Signer;
  // let otherAddresses: Signer[];

  this.beforeEach(async () => {
    bearMarketBustersFactory = await ethers.getContractFactory(
      "BearMarketBusters"
    );
    bearMarketBustersContract = await bearMarketBustersFactory.deploy(
      contractConfig.tokenName,
      contractConfig.tokenSymbol
    );
    [owner, addr1, addr2, addr3] = await ethers.getSigners();

    await bearMarketBustersContract.deployed();
  });

  it("Should have right symbol and name", async function () {
    expect(await bearMarketBustersContract.name()).to.equal(
      contractConfig.tokenName
    );
    expect(await bearMarketBustersContract.symbol()).to.equal(
      contractConfig.tokenSymbol
    );
  });

  it("Sale should not be active", async function () {
    expect(await bearMarketBustersContract.isSaleActive()).to.equal(false);
  });

  it("Should not allow non-owner users to flip sale state", async function () {
    await expect(
      bearMarketBustersContract.connect(addr1).setIsSaleActive(true)
    ).to.be.revertedWith(onlyOwnerMessage);
  });

  it("Should allow owner to flip sale state", async function () {
    await bearMarketBustersContract.connect(owner).setIsSaleActive(true);
    expect(
      await bearMarketBustersContract.connect(addr2).isSaleActive()
    ).to.be.equal(true);
  });

  it("Should allow owner to change token URI", async function () {
    await bearMarketBustersContract
      .connect(owner)
      .setBaseTokenURI(contractConfig.baseURI);
    await bearMarketBustersContract
      .connect(owner)
      .mintForAddress(1, await addr3.getAddress());

    expect(await bearMarketBustersContract.tokenURI(1)).to.equal(
      `${contractConfig.baseURI}1.json`
    );

    await bearMarketBustersContract
      .connect(owner)
      .setBaseTokenURI("https://ama.com/");
    await bearMarketBustersContract
      .connect(owner)
      .mintForAddress(2, await addr1.getAddress());

    expect(await bearMarketBustersContract.tokenURI(2)).to.equal(
      "https://ama.com/2.json"
    );
  });

  it("Should now allow non-owner to reserve NFT", async function () {
    await bearMarketBustersContract.connect(owner).setIsSaleActive(true);
    await expect(
      bearMarketBustersContract.mintBearMarketBuster(0)
    ).to.be.revertedWith("Wrong itemId");
  });

  it("Should allow only owner to reserve NFT", async function () {
    await bearMarketBustersContract.connect(owner).reserveFirstBear();
    expect(await bearMarketBustersContract.ownerOf(0)).to.be.equal(
      await owner.getAddress()
    );
  });

  it("Should not allow to mint if sale is not active", async function () {
    await expect(
      bearMarketBustersContract.mintBearMarketBuster(3)
    ).to.be.revertedWith("Sale not yet active");
  });

  it("Should allow to mint if sale is active", async function () {
    await bearMarketBustersContract.connect(owner).setIsSaleActive(true);
    await bearMarketBustersContract
      .connect(addr2)
      .mintBearMarketBuster(3, { value: ethers.utils.parseEther("9") });
    expect(await bearMarketBustersContract.ownerOf(3)).to.be.equal(
      await addr2.getAddress()
    );
    expect(
      await ethers.provider.getBalance(bearMarketBustersContract.address)
    ).to.be.equal(ethers.utils.parseEther("9"));
  });

  it("Should fail to mint an already minted item", async function () {
    await bearMarketBustersContract.connect(owner).setIsSaleActive(true);
    await bearMarketBustersContract
      .connect(addr2)
      .mintBearMarketBuster(3, { value: ethers.utils.parseEther("9") });
    await expect(
      bearMarketBustersContract
        .connect(addr3)
        .mintBearMarketBuster(3, { value: ethers.utils.parseEther("9") })
    ).to.be.revertedWith("ERC721: token already minted");
  });

  it("Owner should have 90% of the sale", async function () {
    await bearMarketBustersContract.connect(owner).setIsSaleActive(true);
    await bearMarketBustersContract
      .connect(addr2)
      .mintBearMarketBuster(3, { value: ethers.utils.parseEther("9") });
    await bearMarketBustersContract
      .connect(addr3)
      .mintBearMarketBuster(4, { value: ethers.utils.parseEther("16") });

    const initialBalance = await ethers.provider.getBalance(
      await owner.getAddress()
    );
    const withdrawOperation = await bearMarketBustersContract
      .connect(owner)
      .withdraw();
    const receipt = await withdrawOperation.wait();
    const finalBalance = await ethers.provider.getBalance(
      await owner.getAddress()
    );
    const fees = receipt.gasUsed.mul(await ethers.provider.getGasPrice());
    expect(finalBalance).to.be.equal(
      initialBalance.sub(fees).add(ethers.utils.parseEther("22.5"))
    );
  });
});

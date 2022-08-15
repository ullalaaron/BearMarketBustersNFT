import { expect } from "chai";
import { Contract, ContractFactory, Signer } from "ethers";
import { ethers } from "hardhat";
import { TestCollectionConfig as contractConfig } from "../config/CollectionConfig";

describe("BearMarketBusters", function () {
  const onlyOwnerMessage = "Ownable: caller is not the owner";
  let bearMarketBustersFactory: ContractFactory;
  let bearMarketBustersContract: Contract;
  let owner: Signer, addr1: Signer, addr2: Signer, addr3: Signer;

  this.beforeEach(async () => {
    bearMarketBustersFactory = await ethers.getContractFactory(
      "BearMarketBusters"
    );
    bearMarketBustersContract = await bearMarketBustersFactory.deploy(
      contractConfig.tokenName,
      contractConfig.tokenSymbol,
      contractConfig.baseURI
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

  it("Should have the right Base URI", async function () {
    await bearMarketBustersContract
      .connect(owner)
      .mintForAddress(await addr3.getAddress(), 1);
    const token1Uri = await bearMarketBustersContract.tokenURI(1);
    console.log(token1Uri);
    expect(token1Uri).to.equal(`${contractConfig.baseURI}1.json`);
  });

  it("Sale should be active", async function () {
    expect(await bearMarketBustersContract.isSaleActive()).to.equal(true);
  });

  it("Should not allow non-owner users to flip sale state", async function () {
    await expect(
      bearMarketBustersContract.connect(addr1).setIsSaleActive(false)
    ).to.be.revertedWith(onlyOwnerMessage);
  });

  it("Should allow owner to flip sale state", async function () {
    await bearMarketBustersContract.connect(owner).setIsSaleActive(false);
    expect(
      await bearMarketBustersContract.connect(addr2).isSaleActive()
    ).to.be.equal(false);
  });

  it("Should allow owner to change token URI", async function () {
    await bearMarketBustersContract
      .connect(owner)
      .setBaseTokenURI(contractConfig.baseURI);
    await bearMarketBustersContract
      .connect(owner)
      .mintForAddress(await addr3.getAddress(), 1);

    expect(await bearMarketBustersContract.tokenURI(1)).to.equal(
      `${contractConfig.baseURI}1.json`
    );

    await bearMarketBustersContract
      .connect(owner)
      .setBaseTokenURI("https://ama.com/");
    await bearMarketBustersContract
      .connect(owner)
      .mintForAddress(await addr1.getAddress(), 2);

    expect(await bearMarketBustersContract.tokenURI(2)).to.equal(
      "https://ama.com/2.json"
    );
  });

  it("Should not allow non-owner to reserve NFT", async function () {
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
    await bearMarketBustersContract.connect(owner).setIsSaleActive(false);
    await expect(
      bearMarketBustersContract.mintBearMarketBuster(3)
    ).to.be.revertedWith("Sale not yet active");
  });

  it("Should allow to mint if sale is active", async function () {
    await bearMarketBustersContract
      .connect(addr2)
      .mintBearMarketBuster(3, { value: ethers.utils.parseEther("1") });
    expect(await bearMarketBustersContract.ownerOf(3)).to.be.equal(
      await addr2.getAddress()
    );
    expect(
      await ethers.provider.getBalance(bearMarketBustersContract.address)
    ).to.be.equal(ethers.utils.parseEther("1"));
  });

  it("Should not allow to mint if price is wrong", async function () {
    await expect(
      bearMarketBustersContract
        .connect(addr2)
        .mintBearMarketBuster(2, { value: ethers.utils.parseEther("0.99") })
    ).to.be.revertedWith("Wrong price");
    await expect(
      bearMarketBustersContract
        .connect(addr2)
        .mintBearMarketBuster(4, { value: ethers.utils.parseEther("1") })
    ).to.be.revertedWith("Wrong price");
    await expect(
      bearMarketBustersContract
        .connect(addr2)
        .mintBearMarketBuster(6, { value: ethers.utils.parseEther("1.99") })
    ).to.be.revertedWith("Wrong price");
    await expect(
      bearMarketBustersContract
        .connect(addr2)
        .mintBearMarketBuster(8, { value: ethers.utils.parseEther("2.99999") })
    ).to.be.revertedWith("Wrong price");
  });

  it("Should allow to mint if price is right", async function () {
    await bearMarketBustersContract.connect(owner).setIsSaleActive(true);
    await bearMarketBustersContract
      .connect(addr2)
      .mintBearMarketBuster(2, { value: ethers.utils.parseEther("1") });
    expect(await bearMarketBustersContract.ownerOf(2)).to.be.equal(
      await addr2.getAddress()
    );

    await bearMarketBustersContract
      .connect(addr3)
      .mintBearMarketBuster(5, { value: ethers.utils.parseEther("2") });
    expect(await bearMarketBustersContract.ownerOf(5)).to.be.equal(
      await addr3.getAddress()
    );

    await bearMarketBustersContract
      .connect(addr2)
      .mintBearMarketBuster(9, { value: ethers.utils.parseEther("3") });
    expect(await bearMarketBustersContract.ownerOf(9)).to.be.equal(
      await addr2.getAddress()
    );
  });

  it("Should fail to mint an already minted item", async function () {
    await bearMarketBustersContract
      .connect(addr2)
      .mintBearMarketBuster(3, { value: ethers.utils.parseEther("1") });
    await expect(
      bearMarketBustersContract
        .connect(addr3)
        .mintBearMarketBuster(3, { value: ethers.utils.parseEther("1") })
    ).to.be.revertedWith("ERC721: token already minted");
  });

  it("Owner should have 90% of the sale", async function () {
    await bearMarketBustersContract
      .connect(addr2)
      .mintBearMarketBuster(3, { value: ethers.utils.parseEther("1") });
    await bearMarketBustersContract
      .connect(addr3)
      .mintBearMarketBuster(4, { value: ethers.utils.parseEther("2") });

    const initialBalance = await ethers.provider.getBalance(
      await owner.getAddress()
    );

    const contractBalance = await ethers.provider.getBalance(
      bearMarketBustersContract.address
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
      initialBalance.sub(fees).add(contractBalance.mul(90).div(100))
    );
  });
});

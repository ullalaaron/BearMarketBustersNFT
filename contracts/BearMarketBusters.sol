//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "hardhat/console.sol";

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract BearMarketBusters is ERC721, Ownable, ReentrancyGuard {
    using Strings for uint256;

    uint256 maxSupply = 10;

    bool private _isSaleActive = false;
    string private _baseTokenURI = "";

    constructor(string memory _tokenName, string memory _tokenSymbol)
        ERC721(_tokenName, _tokenSymbol)
    {}

    function mintBearMarketBuster(uint256 itemId) public payable nonReentrant {
        require(_isSaleActive, "Sale not yet active");
        require(itemId >= 1 && itemId <= 9, "Wrong itemId");
        require(itemId**2 <= msg.value, "Wrong price");
        _safeMint(msg.sender, itemId);
    }

    function tokenURI(uint256 _tokenId)
        public
        view
        virtual
        override
        returns (string memory)
    {
        require(_exists(_tokenId), "Nonexistent token");

        string memory currentBaseURI = _baseURI();
        return
            bytes(currentBaseURI).length > 0
                ? string(
                    abi.encodePacked(
                        currentBaseURI,
                        _tokenId.toString(),
                        ".json"
                    )
                )
                : "";
    }

    function isSaleActive() public view returns (bool) {
        return _isSaleActive;
    }

    function _baseURI() internal view virtual override returns (string memory) {
        return _baseTokenURI;
    }

    /* Owner Functions */

    function setIsSaleActive(bool value) public onlyOwner {
        _isSaleActive = value;
    }

    /* YUP FIRST IS MINE */
    function reserveFirstBear() public onlyOwner {
        _safeMint(msg.sender, 0);
    }

    function mintForAddress(uint256 itemId, address _receiver)
        public
        onlyOwner
    {
        _safeMint(_receiver, itemId);
    }

    function setBaseTokenURI(string memory baseURI) public onlyOwner {
        _baseTokenURI = baseURI;
    }

    function withdraw() public onlyOwner nonReentrant {
        // Send 10% to gigiwincs.
        // =============================================================================
        (bool gigiwincsSuccess, ) = payable(
            0x146FB9c3b2C13BA88c6945A759EbFa95127486F4
        ).call{value: (address(this).balance * 10) / 100}("");
        require(gigiwincsSuccess, "Failed to send 10% to gigiwincs");
        // =============================================================================
        // =============================================================================

        // Gimme that ETH
        // =============================================================================
        (bool ownerSuccess, ) = payable(owner()).call{
            value: address(this).balance
        }("");
        require(ownerSuccess, "Failed to send ETH to owner");
    }
}

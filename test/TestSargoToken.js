const { expect } = require("chai");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { ethers, upgrades } = require("hardhat");
require("dotenv").config();

//TODO: test invalid cases
//TODO: test upgradeable

describe("==SARGO TOKEN TESTS ================================", () => {
  async function deployTokenFixture() {
    const [owner, recipient] = await ethers.getSigners();

    const supply = 1000;
    const initialSupply = ethers.parseUnits(supply.toString(), "ether");
    const amount = ethers.parseUnits("5", "ether");
    const SargoToken = await ethers.getContractFactory("SargoToken");
    const sargoToken = await upgrades.deployProxy(
      SargoToken,
      ["Sargo", "SGT"],
      { kind: "uups" }
    );

    await sargoToken.waitForDeployment();
    await sargoToken.mint(owner.address, initialSupply);

    return {
      owner,
      SargoToken,
      sargoToken,
      supply,
      initialSupply,
      amount,
      recipient,
    };
  }

  describe("Sargo Token Deployment", function () {
    it("Should set the right Token name", async () => {
      const { sargoToken } = await loadFixture(deployTokenFixture);
      expect(await sargoToken.name()).to.equal("Sargo");
    });

    it("Should set the right Token owner", async () => {
      const { sargoToken, owner } = await loadFixture(deployTokenFixture);
      expect(await sargoToken.owner()).to.equal(owner.address);
    });

    it("Should set the initial total supply", async () => {
      const { sargoToken, initialSupply } = await loadFixture(
        deployTokenFixture
      );
      expect(await sargoToken.totalSupply()).to.equal(initialSupply);
    });

    it("Should update the balance of the owner with the total supply value", async () => {
      const { sargoToken, initialSupply } = await loadFixture(
        deployTokenFixture
      );
      expect(await sargoToken.balanceOf(sargoToken.owner())).to.equal(
        initialSupply
      );
    });

    it("Should increase the total supply by initial supply value", async () => {
      const { sargoToken, initialSupply, supply, owner } = await loadFixture(
        deployTokenFixture
      );
      await sargoToken.mint(owner.address, initialSupply);
      const expected = ethers.parseUnits((supply + supply).toString(), "ether");
      expect(await sargoToken.totalSupply()).to.equal(expected);
    });

    it("Should decrease the total supply by initial supply value", async () => {
      const { sargoToken, initialSupply, supply } = await loadFixture(
        deployTokenFixture
      );
      sargoToken.burn(sargoToken.address, initialSupply);
      const expected = ethers.parseUnits(supply.toString(), "ether");
      expect(await sargoToken.totalSupply()).to.equal(expected);
    });

    it("Should transfer amount into the provided recipient address", async () => {
      const { sargoToken, amount, recipient } = await loadFixture(
        deployTokenFixture
      );
      await sargoToken.transfer(recipient.address, amount);
      expect(await sargoToken.balanceOf(recipient.address)).to.equal(amount);
    });

    it("Should approve amount as allowance for tranfer of value from sender", async () => {
      const { sargoToken, owner, amount } = await loadFixture(
        deployTokenFixture
      );
      await sargoToken.connect(owner).approve(owner.address, amount);
      expect(await sargoToken.allowance(owner.address, owner.address)).to.equal(
        amount
      );
    });

    it("Should transfer provided amount from one address into another", async () => {
      const { sargoToken, owner, recipient, amount } = await loadFixture(
        deployTokenFixture
      );
      await sargoToken.connect(owner).approve(owner.address, amount);
      await sargoToken.transferFrom(owner.address, recipient.address, amount);
      expect(await sargoToken.balanceOf(recipient.address)).to.equal(amount);
    });

    it("Should emit a transfer event", async function () {
      const { sargoToken, owner, recipient, amount } = await loadFixture(
        deployTokenFixture
      );
      await sargoToken.connect(owner).approve(owner.address, amount);
      await expect(
        sargoToken.transferFrom(owner.address, recipient.address, amount)
      )
        .to.emit(sargoToken, "Transfer")
        .withArgs(owner.address, recipient.address, amount);
    });
  });
});

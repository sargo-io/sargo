const { expect } = require("chai");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { ethers } = require("hardhat");

describe("SargoToken contract", () => {
  async function deployTokenUtilFixture() {
    const Token = await ethers.getContractFactory("SargoToken");
    const [owner, sender, recipient] = await ethers.getSigners();
    const initialSupply = 100;
    const transferAmount = 1;
    const token = await Token.deploy(initialSupply, "cUSD", 0, "cUSD");
    await token.deployed();

    return {
      Token,
      token,
      initialSupply,
      owner,
      sender,
      transferAmount,
      recipient,
    };
  }

  describe("Deployment", function () {
    it("Should set the right owner", async () => {
      const { token, owner } = await loadFixture(deployTokenUtilFixture);
      expect(await token.owner()).to.equal(owner.address);
    });

    it("Should ensure total supply is greater than zero", async () => {
      const { token } = await loadFixture(deployTokenUtilFixture);
      expect(await token.totalSupply()).to.greaterThan(0);
    });

    it("Should set the total supply", async () => {
      const { token, initialSupply } = await loadFixture(
        deployTokenUtilFixture
      );
      expect(await token.totalSupply()).to.equal(initialSupply);
    });

    it("Should set the right token name", async () => {
      const { token } = await loadFixture(deployTokenUtilFixture);
      expect(await token.name()).to.equal("cUSD");
    });

    it("Should set the right decimals", async () => {
      const { token } = await loadFixture(deployTokenUtilFixture);
      expect(await token.decimals()).to.equal(0);
    });

    it("Should set the right token symbol", async () => {
      const { token } = await loadFixture(deployTokenUtilFixture);
      expect(await token.symbol()).to.equal("cUSD");
    });

    it("Should set the total supply of tokens to the owner", async () => {
      const { token } = await loadFixture(deployTokenUtilFixture);
      const balance = await token.balanceOf(token.owner());
      expect(await token.totalSupply()).to.equal(balance);
    });
  });

  describe("Transactions functions", () => {
    it("Should transfer amount to recipient accounts", async () => {
      const { token, transferAmount, recipient } = await loadFixture(
        deployTokenUtilFixture
      );
      await token.transfer(recipient.address, transferAmount);
      const recipientBalance = await token.balanceOf(recipient.address);
      expect(recipientBalance).to.equal(transferAmount);
    });

    it("Should reduce token balance for sender by amount sent after transfer", async () => {
      const { token, transferAmount, recipient } = await loadFixture(
        deployTokenUtilFixture
      );
      const prevBalance = await token.balanceOf(token.owner());
      await token.transfer(recipient.address, transferAmount);
      const newBalance = await token.balanceOf(token.owner());
      expect(newBalance).to.equal(prevBalance - transferAmount);
    });

    it("Should emit transfer event when transfer is completed", async () => {
      const { token, transferAmount, recipient } = await loadFixture(
        deployTokenUtilFixture
      );
      await expect(token.transfer(recipient.address, transferAmount))
        .to.emit(token, "Transfer")
        .withArgs(await token.owner(), recipient.address, transferAmount);
    });

    it("Should approve the transfer amount to recipient accounts", async () => {
      const { token, transferAmount, recipient } = await loadFixture(
        deployTokenUtilFixture
      );
      await token.approve(recipient.address, transferAmount);
      expect(await token.allowance(token.owner(), recipient.address)).to.equal(
        transferAmount
      );
    });

    it("Should emit approve event when approve is completed", async () => {
      const { token, transferAmount, recipient } = await loadFixture(
        deployTokenUtilFixture
      );
      await expect(token.approve(recipient.address, transferAmount))
        .to.emit(token, "Approval")
        .withArgs(await token.owner(), recipient.address, transferAmount);
    });

    it("Should transfer amount from sender to recipient accounts", async () => {
      const { token, owner, transferAmount, recipient } = await loadFixture(
        deployTokenUtilFixture
      );
      await token.approve(owner.address, 2);
      await token.transferFrom(
        owner.address,
        recipient.address,
        transferAmount
      );
      const recipientBalance = await token.balanceOf(recipient.address);
      expect(recipientBalance).to.equal(transferAmount);
    });

    it("Should transfer amount from sender to recipient accounts, sender balance should be less amount", async () => {
      const { token, owner, transferAmount, recipient } = await loadFixture(
        deployTokenUtilFixture
      );
      const prevBalance = await token.balanceOf(owner.address);
      await token.approve(owner.address, 2);
      await token.transferFrom(
        owner.address,
        recipient.address,
        transferAmount
      );
      const senderBalance = await token.balanceOf(owner.address);
      expect(senderBalance).to.equal(prevBalance - transferAmount);
    });

    it("Should transfer amount to multiple recipient accounts", async () => {
      const { token, owner, sender, recipient } = await loadFixture(
        deployTokenUtilFixture
      );
      const recipients = [sender.address, recipient.address];
      const amounts = [1, 2];
      await token.transferBatch(recipients, amounts);
      const senderBalance = await token.balanceOf(sender.address);
      const recipientBalance = await token.balanceOf(recipient.address);
      expect(senderBalance).to.equal(1);
      expect(recipientBalance).to.equal(2);
    });

    it("Should mint more token and double the total supply", async () => {
      const { token, owner, initialSupply } = await loadFixture(
        deployTokenUtilFixture
      );
      await token.setCreator(owner.address);
      await token.mint(owner.address, initialSupply);
      expect(await token.totalSupply()).to.equal(initialSupply * 2);
    });

    it("Should mint more token and double the balance of the owner", async () => {
      const { token, owner, initialSupply } = await loadFixture(
        deployTokenUtilFixture
      );
      await token.setCreator(owner.address);
      await token.mint(owner.address, initialSupply);
      expect(await token.balanceOf(owner.address)).to.equal(initialSupply * 2);
    });

    it("Should burn token and reduce total supply", async () => {
      const { token, owner, initialSupply } = await loadFixture(
        deployTokenUtilFixture
      );
      await token.setDestroyer(owner.address);
      await token.burn(initialSupply - 50);
      expect(await token.totalSupply()).to.equal(initialSupply - 50);
      expect(await token.balanceOf(owner.address)).to.equal(initialSupply - 50);
    });
  });
});

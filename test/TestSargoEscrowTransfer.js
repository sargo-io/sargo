const { expect } = require("chai");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { ethers, upgrades } = require("hardhat");
const { BigNumber } = require("ethers");
require("dotenv").config();

//TODO: test pausable
//TODO: test access control
//TODO: test invalid cases

describe("==SARGO ESCROW TRANSFER TESTS ================================", () => {
  async function deployEscrowFixture() {
    const [owner, sender, recipient, client, agent, treasury] =
      await ethers.getSigners();

    const supply = 1000;
    const initialSupply = ethers.parseUnits(supply.toString(), "ether");
    const ordersFeePerc = ethers.parseUnits(
      process.env.SARGO_ORDERS_FEE_PERCENT,
      "ether"
    );
    const transferFeePerc = ethers.parseUnits(
      process.env.SARGO_TRANSFER_FEE_PERCENT,
      "ether"
    );

    const amount = ethers.parseUnits("1", "ether");
    const agentFee = ethers.parseUnits("0.005", "ether");
    const treasuryFee = ethers.parseUnits("0.005", "ether");
    const fundAmount = ethers.parseUnits("7", "ether");
    const currencyCode = "KES";
    const conversionRate = ethers.parseUnits("140", "ether");
    const acceptedConversionRate = ethers.parseUnits("145", "ether");
    const clientName = "clientName";
    const clientPhone = "254722000000";
    const agentName = "agentName";
    const agentPhone = "254723000000";
    const paymentMethod = "Mpesa";
    const clientKey = "clientkey";
    const agentKey = "agentKey";

    const agentFeeRate = ethers.parseUnits("0.5", "ether");
    const treasuryFeeRate = ethers.parseUnits("0.5", "ether");
    const transferFeeRate = ethers.parseUnits("0.01", "ether");

    //ERC20 contract
    const SargoToken = await ethers.getContractFactory("SargoToken");
    const sargoToken = await upgrades.deployProxy(
      SargoToken,
      ["Sargo", "SGT"],
      { kind: "uups" }
    );

    await sargoToken.waitForDeployment();
    await sargoToken.mint(owner.address, initialSupply);

    //Fee contract
    const SargoFee = await ethers.getContractFactory("SargoFee");
    let sargoFee = await upgrades.deployProxy(
      SargoFee,
      [ordersFeePerc, transferFeePerc],
      {
        kind: "uups",
      }
    );
    await sargoFee.waitForDeployment();

    //Escrow contract
    const SargoEscrow = await ethers.getContractFactory("SargoEscrow");
    let sargoEscrow = await upgrades.deployProxy(
      SargoEscrow,
      [
        await sargoToken.getAddress(),
        treasury.address,
        await sargoFee.getAddress(),
      ],
      { kind: "uups" }
    );

    await sargoEscrow.waitForDeployment();

    //Test upgradeable
    // const SargoFee_v0_1_0 = await ethers.getContractFactory("SargoFee_v0_1_0");
    // sargoFee = await upgrades.upgradeProxy(
    //   await sargoFee.getAddress(),
    //   SargoFee_v0_1_0
    // );

    //Test upgradeable
    // const SargoEscrow_v0_1_0 = await ethers.getContractFactory(
    //   "SargoEscrow_v0_1_0"
    // );
    // sargoEscrow = await upgrades.upgradeProxy(
    //   await sargoEscrow.getAddress(),
    //   SargoEscrow_v0_1_0
    // );

    return {
      SargoFee,
      sargoFee,
      SargoEscrow,
      sargoEscrow,
      owner,
      treasuryFee,
      agentFee,
      client,
      agent,
      SargoToken,
      sargoToken,
      initialSupply,
      treasury,
      amount,
      currencyCode,
      conversionRate,
      acceptedConversionRate,
      sender,
      recipient,
      clientName,
      clientPhone,
      agentName,
      agentPhone,
      fundAmount,
      paymentMethod,
      clientKey,
      agentKey,
      agentFeeRate,
      treasuryFeeRate,
      transferFeeRate,
    };
  }

  describe("==Sargo Escrow Deployment", function () {
    it("Should set the right Sargo escrow owner", async () => {
      const { sargoEscrow, owner } = await loadFixture(deployEscrowFixture);
      expect(await sargoEscrow.owner()).to.equal(owner.address);
    });

    it("Should set the right escrow address", async () => {
      const { sargoEscrow } = await loadFixture(deployEscrowFixture);
      expect(await sargoEscrow.getAddress()).to.equal(
        await sargoEscrow.getAddress()
      );
    });

    it("Should set the right token address", async () => {
      const { sargoEscrow, sargoToken } = await loadFixture(
        deployEscrowFixture
      );
      expect(await sargoEscrow.tokenAddress()).to.equal(
        await sargoToken.getAddress()
      );
    });

    it("Should set the right tresury address", async () => {
      const { sargoEscrow, treasury } = await loadFixture(deployEscrowFixture);
      expect(await sargoEscrow.treasuryAddress()).to.equal(treasury.address);
    });

    it("Should set the right fee address", async () => {
      const { sargoEscrow, sargoFee } = await loadFixture(deployEscrowFixture);
      expect(await sargoEscrow.feeAddress()).to.equal(
        await sargoFee.getAddress()
      );
    });

    it("Should get the right agent fee rate", async () => {
      const { sargoEscrow, agentFeeRate } = await loadFixture(
        deployEscrowFixture
      );
      expect(await sargoEscrow.getAgentFeeRate()).to.equal(agentFeeRate);
    });

    it("Should get the right treasury fee rate", async () => {
      const { sargoEscrow, treasuryFeeRate } = await loadFixture(
        deployEscrowFixture
      );
      expect(await sargoEscrow.getTreasuryFeeRate()).to.equal(treasuryFeeRate);
    });

    it("Should get the right transfer fee rate", async () => {
      const { sargoEscrow, transferFeeRate } = await loadFixture(
        deployEscrowFixture
      );
      expect(await sargoEscrow.getTransferFeeRate()).to.equal(transferFeeRate);
    });

    it("Should get the right agent fee", async () => {
      const { sargoEscrow, amount, agentFee } = await loadFixture(
        deployEscrowFixture
      );
      expect(await sargoEscrow.getAgentFee(amount)).to.equal(agentFee);
    });

    it("Should get the right treasury fee", async () => {
      const { sargoEscrow, amount, treasuryFee } = await loadFixture(
        deployEscrowFixture
      );
      expect(await sargoEscrow.getTreasuryFee(amount)).to.equal(treasuryFee);
    });
  });

  describe("Send and transfer transactions", function () {
    it("Should send value from one address to provided address", async () => {
      const {
        sargoEscrow,
        sargoToken,
        agent,
        client,
        amount,
        fundAmount,
        currencyCode,
        conversionRate,
      } = await loadFixture(deployEscrowFixture);

      await sargoToken.transfer(agent.address, fundAmount);
      await sargoToken
        .connect(agent)
        .approve(await sargoEscrow.getAddress(), fundAmount);

      const _senderBalance = await sargoToken.balanceOf(agent.address);
      const _recipientBalance = await sargoToken.balanceOf(client.address);
      const sendAmount = await sargoEscrow
        .connect(agent)
        .send(client.address, amount, currencyCode, conversionRate);

      const _sent = await sargoEscrow.getTransactionById(1);

      expect(_sent.txType).to.equal(2);
      expect(await sargoToken.balanceOf(agent.address)).to.equal(
        _senderBalance - amount
      );
      expect(await sargoToken.balanceOf(client.address)).to.equal(
        _recipientBalance + amount
      );

      expect(_sent.clientAccount).to.equal(client.address);
      expect(_sent.agentAccount).to.equal(agent.address);
      expect(_sent.netAmount).to.equal(amount);
      expect(_sent.paymentMethod).to.equal("TRANSFER");

      await expect(sendAmount).to.emit(sargoEscrow, "Transfer");
      //.withArgs(_sent.id, _sent.timestamp, _sent);
    });

    it("Should transfer value from the escrow address to provided address", async () => {
      const {
        sargoEscrow,
        sargoToken,
        owner,
        client,
        amount,
        fundAmount,
        currencyCode,
        conversionRate,
      } = await loadFixture(deployEscrowFixture);
      /* Update escrow's balance to allow transfer transaction */
      await sargoToken.transfer(await sargoEscrow.getAddress(), fundAmount);
      await sargoToken
        .connect(owner)
        .approve(await sargoEscrow.getAddress(), fundAmount);

      const _addressBalance = await sargoToken.balanceOf(
        await sargoEscrow.getAddress()
      );
      const _recipientBalance = await sargoToken.balanceOf(client.address);

      const sendAmount = await sargoEscrow
        .connect(owner)
        .credit(client.address, amount, currencyCode, conversionRate);

      const _sent = await sargoEscrow.getTransactionById(1);

      expect(_sent.txType).to.equal(2);
      expect(
        await sargoToken.balanceOf(await sargoEscrow.getAddress())
      ).to.equal(_addressBalance - amount);
      expect(await sargoToken.balanceOf(client.address)).to.equal(
        _recipientBalance + amount
      );
      expect(_sent.clientAccount).to.equal(client.address);
      expect(_sent.agentAccount).to.equal(owner.address);
      expect(_sent.netAmount).to.equal(amount);
      expect(_sent.paymentMethod).to.equal("TRANSFER");

      await expect(sendAmount).to.emit(sargoEscrow, "Transfer");
      //.withArgs(_sent.id, _sent.timestamp, _sent);
    });

    it("Should emit a transfer event when send function is called", async function () {
      const {
        sargoEscrow,
        sargoToken,
        agent,
        client,
        amount,
        fundAmount,
        currencyCode,
        conversionRate,
      } = await loadFixture(deployEscrowFixture);

      await sargoToken.transfer(agent.address, fundAmount);
      await sargoToken
        .connect(agent)
        .approve(await sargoEscrow.getAddress(), fundAmount);

      const sendAmount = await sargoEscrow
        .connect(agent)
        .send(client.address, amount, currencyCode, conversionRate);

      const _sent = await sargoEscrow.getTransactionById(1);

      await expect(sendAmount).to.emit(sargoEscrow, "Transfer");
      //.withArgs(_sent.id, _sent.timestamp, _sent);
    });

    it("Should emit a transfer event when transfer function is called", async function () {
      const {
        sargoEscrow,
        sargoToken,
        owner,
        client,
        amount,
        fundAmount,
        currencyCode,
        conversionRate,
      } = await loadFixture(deployEscrowFixture);

      await sargoToken.transfer(await sargoEscrow.getAddress(), fundAmount);
      await sargoToken
        .connect(owner)
        .approve(await sargoEscrow.getAddress(), fundAmount);

      const sendAmount = await sargoEscrow
        .connect(owner)
        .credit(client.address, amount, currencyCode, conversionRate);

      const _sent = await sargoEscrow.getTransactionById(1);

      await expect(sendAmount).to.emit(sargoEscrow, "Transfer");
      //.withArgs(_sent.id, _sent.timestamp, _sent);
    });
  });

  describe("Utility transactions", function () {
    it("Should add txnId to the address transaction history", async () => {
      const {
        sargoEscrow,
        sargoToken,
        agent,
        client,
        amount,
        fundAmount,
        currencyCode,
        conversionRate,
      } = await loadFixture(deployEscrowFixture);

      await sargoToken.transfer(agent.address, fundAmount);
      await sargoToken
        .connect(agent)
        .approve(await sargoEscrow.getAddress(), fundAmount);

      const sendAmount = await sargoEscrow
        .connect(agent)
        .send(client.address, amount, currencyCode, conversionRate);

      const _txs = await sargoEscrow.getAcountHistoryLength(agent.address);

      expect(_txs).to.equal(1);
    });

    it("Should get the estimated gas price", async () => {});

    it("Should get all transactions", async () => {
      //TODO: Implement
    });

    it("Should get all commissions", async () => {
      //TODO: Implement
    });
  });
});

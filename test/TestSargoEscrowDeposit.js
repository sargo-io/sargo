const { expect } = require("chai");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { ethers, upgrades } = require("hardhat");
const { BigNumber } = require("ethers");
require("dotenv").config();

//TODO: test pausable
//TODO: test access control
//TODO: test invalid cases

describe("==SARGO ESCROW DEPOSIT TESTS ================================", () => {
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
    const agentFee = ethers.parseUnits("0", "ether");
    const treasuryFee = ethers.parseUnits("0.01", "ether");
    const fundAmount = ethers.parseUnits("7", "ether");
    const currencyCode = "KES";
    const conversionRate = ethers.parseUnits("140", "ether");
    const acceptedConversionRate = ethers.parseUnits("140", "ether");
    const clientName = "clientName";
    const clientPhone = "254722000000";
    const agentName = "agentName";
    const agentPhone = "254723000000";
    const paymentMethod = "Mpesa";
    const clientKey = "clientkey";
    const agentKey = "agentKey";
    const agentFeeRate = ethers.parseUnits("0", "ether");
    const treasuryFeeRate = ethers.parseUnits("0.01", "ether");
    const transferFeeRate = ethers.parseUnits("0.01", "ether");

    const clientClaimAmount = ethers.parseUnits("0.5", "ether");
    const agentClaimAmount = ethers.parseUnits("0.5", "ether");

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
      clientClaimAmount,
      agentClaimAmount,
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

  describe("==Deposit Transactions", function () {
    it("Should initiate a deposit request", async () => {
      const {
        sargoEscrow,
        sargoToken,
        client,
        amount,
        currencyCode,
        conversionRate,
        acceptedConversionRate,
        agentFee,
        treasuryFee,
        fundAmount,
        paymentMethod,
        clientName,
        clientPhone,
        clientKey,
        agent,
        agentName,
        agentPhone,
        agentKey,
      } = await loadFixture(deployEscrowFixture);

      await sargoToken.transfer(agent.address, fundAmount);
      expect(await sargoToken.balanceOf(agent.address)).to.equal(fundAmount);
      await sargoToken
        .connect(agent)
        .approve(await sargoEscrow.getAddress(), fundAmount);

      const _totalAmount = amount + agentFee + treasuryFee;
      const _txFees = agentFee + treasuryFee;
      const _netAmount = _totalAmount - _txFees;

      const depositRequest = await sargoEscrow
        .connect(client)
        .initiateDeposit(
          amount,
          currencyCode,
          conversionRate,
          paymentMethod,
          clientName,
          clientPhone,
          clientKey,
          agent.address,
          agentName,
          agentPhone,
          agentKey
        );

      const _request = await sargoEscrow.getTransactionById(1);

      const acceptDeposit = await sargoEscrow
        .connect(agent)
        .acceptDeposit(_request.id);

      const _accepted = await sargoEscrow.getTransactionById(1);

      expect(_accepted.id).to.equal(1);
      expect(_accepted.clientAccount).to.equal(client.address);
      expect(_accepted.agentAccount).to.equal(agent.address);
      expect(_accepted.conversionRate).to.equal(acceptedConversionRate);
      expect(_accepted.agentFee).to.equal(agentFee);
      expect(_accepted.treasuryFee).to.equal(treasuryFee);
      expect(_accepted.totalAmount).to.equal(_totalAmount);
      expect(_accepted.netAmount).to.equal(_netAmount);
      expect(_accepted.account.agentPhoneNumber).to.equal(agentPhone);
      expect(_accepted.txType).to.equal(0);
      expect(_accepted.status).to.equal(1);
      expect(_accepted.agentApproved).to.equal(false);
      expect(_accepted.clientApproved).to.equal(false);
      expect(_accepted.clientKey).to.not.be.empty;
      expect(_accepted.agentKey).to.not.be.empty;
      expect(_accepted.requestIndex).to.equal(0);

      await expect(depositRequest).to.emit(sargoEscrow, "TransactionInitiated");
      //.withArgs(_request.id, _request.timestamp, _request);

      await expect(acceptDeposit).to.emit(sargoEscrow, "RequestAccepted");
      //.withArgs(_accepted.id, _accepted.timestamp, _accepted);
    });

    it("Should get a deposit request transaction by id", async () => {
      const {
        sargoEscrow,
        sargoToken,
        client,
        amount,
        currencyCode,
        conversionRate,
        fundAmount,
        paymentMethod,
        clientName,
        clientPhone,
        clientKey,
        agent,
        agentName,
        agentPhone,
        agentKey,
      } = await loadFixture(deployEscrowFixture);

      await sargoToken.transfer(agent.address, fundAmount);
      expect(await sargoToken.balanceOf(agent.address)).to.equal(fundAmount);
      await sargoToken
        .connect(agent)
        .approve(await sargoEscrow.getAddress(), fundAmount);

      const depositRequest = await sargoEscrow
        .connect(client)
        .initiateDeposit(
          amount,
          currencyCode,
          conversionRate,
          paymentMethod,
          clientName,
          clientPhone,
          clientKey,
          agent.address,
          agentName,
          agentPhone,
          agentKey
        );

      const _request = await sargoEscrow.getTransactionById(1);

      const acceptDeposit = await sargoEscrow
        .connect(agent)
        .acceptDeposit(_request.id);

      const _accepted = await sargoEscrow.getTransactionById(1);

      expect(_accepted.id).to.equal(1);
      expect(_accepted.clientAccount).to.equal(client.address);
      expect(_accepted.txType).to.equal(0);
      expect(_accepted.status).to.equal(1);
      expect(_accepted.agentApproved).to.equal(false);
      expect(_accepted.clientApproved).to.equal(false);
    });

    it("Should allow the client and agent to confirm fiat payment received - Deposit request", async () => {
      const {
        sargoEscrow,
        sargoToken,
        client,
        treasury,
        amount,
        currencyCode,
        conversionRate,
        agentFee,
        treasuryFee,
        fundAmount,
        paymentMethod,
        clientName,
        clientPhone,
        clientKey,
        agent,
        agentName,
        agentPhone,
        agentKey,
      } = await loadFixture(deployEscrowFixture);

      await sargoToken.transfer(agent.address, fundAmount);
      await sargoToken
        .connect(agent)
        .approve(await sargoEscrow.getAddress(), fundAmount);

      const _clientBalance = await sargoToken.balanceOf(client.address);
      const _agentBalance = await sargoToken.balanceOf(agent.address);
      const _treasuryBalance = await sargoToken.balanceOf(treasury.address);

      const depositRequest = await sargoEscrow
        .connect(client)
        .initiateDeposit(
          amount,
          currencyCode,
          conversionRate,
          paymentMethod,
          clientName,
          clientPhone,
          clientKey,
          agent.address,
          agentName,
          agentPhone,
          agentKey
        );

      const _request = await sargoEscrow.getTransactionById(1);

      const acceptDeposit = await sargoEscrow
        .connect(agent)
        .acceptDeposit(_request.id);

      const _accepted = await sargoEscrow.getTransactionById(1);

      const _escrowBalance = await sargoToken.balanceOf(
        await sargoEscrow.getAddress()
      );

      const clientConfirmed = await sargoEscrow
        .connect(client)
        .clientConfirmPayment(_accepted.id);
      const _clientConfirmed = await sargoEscrow.getTransactionById(
        _accepted.id
      );

      const agentConfirmed = await sargoEscrow
        .connect(agent)
        .agentConfirmPayment(_clientConfirmed.id);
      const _agentConfirmed = await sargoEscrow.getTransactionById(
        _clientConfirmed.id
      );

      /* Transaction should be completed when both client and agent confirm payments */

      const clientExpected = _clientBalance + amount;
      const agentExpected =
        _agentBalance - amount - agentFee - treasuryFee + agentFee;
      const treasuryExpected = _treasuryBalance + treasuryFee;
      const escrowExpected = _escrowBalance - amount - agentFee - treasuryFee;

      expect(_agentConfirmed.id).to.equal(1);
      expect(_agentConfirmed.txType).to.equal(0);
      expect(_agentConfirmed.status).to.equal(3);
      expect(_agentConfirmed.agentApproved).to.equal(true);
      expect(_agentConfirmed.clientApproved).to.equal(true);

      expect(await sargoToken.balanceOf(client.address)).to.equal(
        clientExpected
      );
      expect(await sargoToken.balanceOf(agent.address)).to.equal(agentExpected);
      expect(await sargoToken.balanceOf(treasury.address)).to.equal(
        treasuryExpected
      );

      expect(
        await sargoToken.balanceOf(await sargoEscrow.getAddress())
      ).to.equal(escrowExpected);

      const _earnings = await sargoEscrow.getEarnings(agent.address);
      expect(_earnings.totalEarned).to.equal(agentFee);
      expect(_agentConfirmed.clientPairedIndex).to.equal(0);
      expect(_agentConfirmed.agentPairedIndex).to.equal(0);

      await expect(clientConfirmed).to.emit(sargoEscrow, "ClientConfirmed");
      // .withArgs(
      //   _clientConfirmed.id,
      //   _clientConfirmed.timestamp,
      //   _clientConfirmed
      // );

      await expect(agentConfirmed).to.emit(sargoEscrow, "AgentConfirmed");
      //.withArgs(_agentConfirmed.id, _agentConfirmed.timestamp, _agentConfirmed);

      await expect(agentConfirmed).to.emit(sargoEscrow, "TransactionCompleted");
      // .withArgs(
      //   _agentConfirmed.id,
      //   _agentConfirmed.timestamp,
      //   _agentConfirmed
      // );
    });

    it("Should allow the client to cancel a deposit request", async () => {
      const {
        sargoEscrow,
        sargoToken,
        client,
        amount,
        currencyCode,
        conversionRate,
        fundAmount,
        paymentMethod,
        clientName,
        clientPhone,
        clientKey,
        agent,
        agentName,
        agentPhone,
        agentKey,
      } = await loadFixture(deployEscrowFixture);

      await sargoToken.transfer(agent.address, fundAmount);
      await sargoToken
        .connect(agent)
        .approve(await sargoEscrow.getAddress(), fundAmount);

      const depositRequest = await sargoEscrow
        .connect(client)
        .initiateDeposit(
          amount,
          currencyCode,
          conversionRate,
          paymentMethod,
          clientName,
          clientPhone,
          clientKey,
          agent.address,
          agentName,
          agentPhone,
          agentKey
        );

      const _request = await sargoEscrow.getTransactionById(1);

      const acceptDeposit = await sargoEscrow
        .connect(agent)
        .acceptDeposit(_request.id);

      const _accepted = await sargoEscrow.getTransactionById(1);

      const cancelRequest = await sargoEscrow
        .connect(client)
        .cancelTransaction(_accepted.id, "reason");
      const _cancelled = await sargoEscrow.getTransactionById(_accepted.id);

      //TODO: check for amount refunded when paired

      expect(_cancelled.id).to.equal(1);
      expect(_cancelled.clientAccount).to.equal(client.address);
      expect(_cancelled.txType).to.equal(0);
      expect(_cancelled.status).to.equal(4);
      expect(_cancelled.agentApproved).to.equal(false);
      expect(_cancelled.clientApproved).to.equal(false);

      await expect(depositRequest).to.emit(sargoEscrow, "TransactionInitiated");
      //.withArgs(_request.id, _request.timestamp, _request);

      await expect(cancelRequest).to.emit(sargoEscrow, "TransactionCancelled");
      //.withArgs(_cancelled.id, _cancelled.timestamp, _cancelled, "reason");
    });

    it("Should emit a deposit request cancelled event", async function () {
      const {
        sargoEscrow,
        sargoToken,
        client,
        amount,
        currencyCode,
        conversionRate,
        fundAmount,
        paymentMethod,
        clientName,
        clientPhone,
        clientKey,
        agent,
        agentName,
        agentPhone,
        agentKey,
      } = await loadFixture(deployEscrowFixture);

      await sargoToken.transfer(agent.address, fundAmount);
      await sargoToken
        .connect(agent)
        .approve(await sargoEscrow.getAddress(), fundAmount);

      const depositRequest = await sargoEscrow
        .connect(client)
        .initiateDeposit(
          amount,
          currencyCode,
          conversionRate,
          paymentMethod,
          clientName,
          clientPhone,
          clientKey,
          agent.address,
          agentName,
          agentPhone,
          agentKey
        );

      const _request = await sargoEscrow.getTransactionById(1);

      const acceptDeposit = await sargoEscrow
        .connect(agent)
        .acceptDeposit(_request.id);

      const _accepted = await sargoEscrow.getTransactionById(1);

      const cancelRequest = await sargoEscrow
        .connect(client)
        .cancelTransaction(_accepted.id, "reason");
      const _cancelled = await sargoEscrow.getTransactionById(_accepted.id);

      await expect(depositRequest).to.emit(sargoEscrow, "TransactionInitiated");
      //.withArgs(_request.id, _request.timestamp, _request);

      await expect(cancelRequest).to.emit(sargoEscrow, "TransactionCancelled");
      //.withArgs(_cancelled.id, _cancelled.timestamp, _cancelled, "reason");
    });

    it("Should allow for a deposit transaction to be flagged as disputed", async () => {
      const {
        sargoEscrow,
        sargoToken,
        client,
        amount,
        currencyCode,
        conversionRate,
        fundAmount,
        paymentMethod,
        clientName,
        clientPhone,
        clientKey,
        agent,
        agentName,
        agentPhone,
        agentKey,
      } = await loadFixture(deployEscrowFixture);

      await sargoToken.transfer(agent.address, fundAmount);
      await sargoToken
        .connect(agent)
        .approve(await sargoEscrow.getAddress(), fundAmount);

      const depositRequest = await sargoEscrow
        .connect(client)
        .initiateDeposit(
          amount,
          currencyCode,
          conversionRate,
          paymentMethod,
          clientName,
          clientPhone,
          clientKey,
          agent.address,
          agentName,
          agentPhone,
          agentKey
        );

      const _request = await sargoEscrow.getTransactionById(1);

      const acceptDeposit = await sargoEscrow
        .connect(agent)
        .acceptDeposit(_request.id);

      const _accepted = await sargoEscrow.getTransactionById(1);

      const disputedTx = await sargoEscrow
        .connect(client)
        .disputeTransaction(_accepted.id, "reason");
      const _disputed = await sargoEscrow.getTransactionById(_accepted.id);

      expect(_disputed.id).to.equal(1);
      expect(_disputed.clientAccount).to.equal(client.address);
      expect(_disputed.txType).to.equal(0);
      expect(_disputed.status).to.equal(2);
      expect(_disputed.agentAccount).to.equal(agent.address);
      expect(_disputed.account.agentName).to.equal(agentName);
      expect(_disputed.account.agentPhoneNumber).to.equal(agentPhone);

      await expect(depositRequest).to.emit(sargoEscrow, "TransactionInitiated");
      //.withArgs(_request.id, _request.timestamp, _request);

      await expect(disputedTx).to.emit(sargoEscrow, "TransactionDisputed");
      //.withArgs(_disputed.id, _disputed.timestamp, _disputed, "reason");
    });

    it("Should emit a disputed deposit transaction event", async function () {
      const {
        sargoEscrow,
        sargoToken,
        client,
        amount,
        currencyCode,
        conversionRate,
        fundAmount,
        paymentMethod,
        clientName,
        clientPhone,
        clientKey,
        agent,
        agentName,
        agentPhone,
        agentKey,
      } = await loadFixture(deployEscrowFixture);

      await sargoToken.transfer(agent.address, fundAmount);
      await sargoToken
        .connect(agent)
        .approve(await sargoEscrow.getAddress(), fundAmount);

      const depositRequest = await sargoEscrow
        .connect(client)
        .initiateDeposit(
          amount,
          currencyCode,
          conversionRate,
          paymentMethod,
          clientName,
          clientPhone,
          clientKey,
          agent.address,
          agentName,
          agentPhone,
          agentKey
        );

      const _request = await sargoEscrow.getTransactionById(1);

      const acceptDeposit = await sargoEscrow
        .connect(agent)
        .acceptDeposit(_request.id);

      const _accepted = await sargoEscrow.getTransactionById(1);

      const disputedTx = await sargoEscrow
        .connect(client)
        .disputeTransaction(_accepted.id, "reason");
      const _disputed = await sargoEscrow.getTransactionById(_accepted.id);

      await expect(depositRequest).to.emit(sargoEscrow, "TransactionInitiated");
      //.withArgs(_request.id, _request.timestamp, _request);

      await expect(disputedTx).to.emit(sargoEscrow, "TransactionDisputed");
      //.withArgs(_disputed.id, _disputed.timestamp, _disputed, "reason");
    });

    it("Should allow for a disputed deposit transaction to be flagged as a claim", async () => {
      const {
        sargoEscrow,
        sargoToken,
        owner,
        client,
        amount,
        currencyCode,
        conversionRate,
        fundAmount,
        paymentMethod,
        clientName,
        clientPhone,
        clientKey,
        agent,
        agentName,
        agentPhone,
        agentKey,
      } = await loadFixture(deployEscrowFixture);

      await sargoToken.transfer(agent.address, fundAmount);
      await sargoToken
        .connect(agent)
        .approve(await sargoEscrow.getAddress(), fundAmount);

      const depositRequest = await sargoEscrow
        .connect(client)
        .initiateDeposit(
          amount,
          currencyCode,
          conversionRate,
          paymentMethod,
          clientName,
          clientPhone,
          clientKey,
          agent.address,
          agentName,
          agentPhone,
          agentKey
        );

      const _request = await sargoEscrow.getTransactionById(1);

      const acceptDeposit = await sargoEscrow
        .connect(agent)
        .acceptDeposit(_request.id);

      const _accepted = await sargoEscrow.getTransactionById(1);

      const disputedTx = await sargoEscrow
        .connect(client)
        .disputeTransaction(_accepted.id, "reason");
      const _disputed = await sargoEscrow.getTransactionById(_accepted.id);

      const claimedTx = await sargoEscrow
        .connect(owner)
        .claimTransaction(_disputed.id, "resolution");

      const _claimed = await sargoEscrow.getTransactionById(_disputed.id);

      expect(_claimed.id).to.equal(1);
      expect(_claimed.clientAccount).to.equal(client.address);
      expect(_claimed.txType).to.equal(0);
      expect(_claimed.status).to.equal(5);
      expect(_claimed.agentAccount).to.equal(agent.address);
      expect(_claimed.account.agentName).to.equal(agentName);
      expect(_claimed.account.agentPhoneNumber).to.equal(agentPhone);

      await expect(disputedTx).to.emit(sargoEscrow, "TransactionDisputed");
      //.withArgs(_request.id, _request.timestamp, _request);

      await expect(claimedTx).to.emit(sargoEscrow, "TransactionClaimed");
      //.withArgs(_claimed.id, _claimed.timestamp, _claimed, "resolution");
    });

    it("Should emit a claimed deposit transaction event", async function () {
      const {
        sargoEscrow,
        owner,
        sargoToken,
        client,
        amount,
        currencyCode,
        conversionRate,
        fundAmount,
        paymentMethod,
        clientName,
        clientPhone,
        clientKey,
        agent,
        agentName,
        agentPhone,
        agentKey,
      } = await loadFixture(deployEscrowFixture);

      await sargoToken.transfer(agent.address, fundAmount);
      await sargoToken
        .connect(agent)
        .approve(await sargoEscrow.getAddress(), fundAmount);

      const depositRequest = await sargoEscrow
        .connect(client)
        .initiateDeposit(
          amount,
          currencyCode,
          conversionRate,
          paymentMethod,
          clientName,
          clientPhone,
          clientKey,
          agent.address,
          agentName,
          agentPhone,
          agentKey
        );

      const _request = await sargoEscrow.getTransactionById(1);

      const acceptDeposit = await sargoEscrow
        .connect(agent)
        .acceptDeposit(_request.id);

      const _accepted = await sargoEscrow.getTransactionById(1);

      const disputedTx = await sargoEscrow
        .connect(client)
        .disputeTransaction(_accepted.id, "reason");

      const _disputed = await sargoEscrow.getTransactionById(_accepted.id);

      const claimedTx = await sargoEscrow
        .connect(owner)
        .claimTransaction(_disputed.id, "resolution");

      const _claimed = await sargoEscrow.getTransactionById(_disputed.id);

      await expect(depositRequest).to.emit(sargoEscrow, "TransactionInitiated");
      //.withArgs(_request.id, _request.timestamp, _request);

      await expect(disputedTx).to.emit(sargoEscrow, "TransactionDisputed");
      //.withArgs(_disputed.id, _disputed.timestamp, _disputed);

      await expect(claimedTx).to.emit(sargoEscrow, "TransactionClaimed");
      //.withArgs(_claimed.id, _claimed.timestamp, _claimed, "resolution");
    });
  });

  describe("Utility transactions", function () {
    it("Should allow the owner to change deposit transaction status", async () => {
      const {
        sargoEscrow,
        owner,
        sargoToken,
        client,
        amount,
        currencyCode,
        conversionRate,
        fundAmount,
        paymentMethod,
        clientName,
        clientPhone,
        clientKey,
        agent,
        agentName,
        agentPhone,
        agentKey,
      } = await loadFixture(deployEscrowFixture);

      await sargoToken.transfer(agent.address, fundAmount);
      await sargoToken
        .connect(agent)
        .approve(await sargoEscrow.getAddress(), fundAmount);

      await sargoEscrow
        .connect(client)
        .initiateDeposit(
          amount,
          currencyCode,
          conversionRate,
          paymentMethod,
          clientName,
          clientPhone,
          clientKey,
          agent.address,
          agentName,
          agentPhone,
          agentKey
        );

      const _request = await sargoEscrow.getTransactionById(1);

      await sargoToken.transfer(agent.address, fundAmount);
      await sargoToken
        .connect(agent)
        .approve(await sargoEscrow.getAddress(), fundAmount);

      await sargoEscrow.connect(agent).acceptDeposit(_request.id);

      const _accepted = await sargoEscrow.getTransactionById(_request.id);

      await sargoEscrow.connect(owner).transactionStatus(_accepted.id, 2);

      const _statusChanged = await sargoEscrow.getTransactionById(1);

      expect(_statusChanged.status).to.equal(2);
    });

    it("Should allow the owner to refund whole amount to a counter-party in a deposit transaction in claim", async () => {
      const {
        sargoEscrow,
        owner,
        sargoToken,
        client,
        amount,
        currencyCode,
        conversionRate,
        fundAmount,
        paymentMethod,
        clientName,
        clientPhone,
        clientKey,
        agent,
        agentName,
        agentPhone,
        agentKey,
      } = await loadFixture(deployEscrowFixture);

      await sargoToken.transfer(agent.address, fundAmount);
      await sargoToken
        .connect(agent)
        .approve(await sargoEscrow.getAddress(), fundAmount);

      await sargoEscrow
        .connect(client)
        .initiateDeposit(
          amount,
          currencyCode,
          conversionRate,
          paymentMethod,
          clientName,
          clientPhone,
          clientKey,
          agent.address,
          agentName,
          agentPhone,
          agentKey
        );

      const _request = await sargoEscrow.getTransactionById(1);

      await sargoToken.transfer(agent.address, fundAmount);
      await sargoToken
        .connect(agent)
        .approve(await sargoEscrow.getAddress(), fundAmount);

      await sargoEscrow.connect(agent).acceptDeposit(_request.id);

      const _accepted = await sargoEscrow.getTransactionById(_request.id);

      await sargoEscrow
        .connect(agent)
        .disputeTransaction(_accepted.id, "reason");
      const _disputed = await sargoEscrow.getTransactionById(_accepted.id);

      await sargoEscrow
        .connect(owner)
        .claimTransaction(_disputed.id, "resolution");

      const _claimed = await sargoEscrow.getTransactionById(_disputed.id);

      await sargoToken.transfer(await sargoEscrow.getAddress(), fundAmount);
      await sargoToken
        .connect(owner)
        .approve(await sargoEscrow.getAddress(), fundAmount);

      const _escrowBalance = await sargoToken.balanceOf(
        await sargoEscrow.getAddress()
      );

      expect(_escrowBalance).to.greaterThanOrEqual(_claimed.totalAmount);

      const refundTx = await sargoEscrow
        .connect(owner)
        .refundTransaction(_claimed.id, 0, _claimed.netAmount, "resolution");
      const _refunded = await sargoEscrow.getTransactionById(1);

      expect(_refunded.status).to.equal(6);
      expect(
        await sargoToken.balanceOf(await sargoEscrow.getAddress())
      ).to.equal(_escrowBalance - _claimed.netAmount);

      await expect(refundTx).to.emit(sargoEscrow, "TransactionResolved");
      //.withArgs(_refunded.id, _refunded.timestamp, _refunded, "resolution");
    });

    it("Should allow the owner to refund split amount to counter-parties in a deposit transaction in claim", async () => {
      const {
        sargoEscrow,
        owner,
        sargoToken,
        client,
        amount,
        currencyCode,
        conversionRate,
        fundAmount,
        paymentMethod,
        clientName,
        clientPhone,
        clientKey,
        agent,
        agentName,
        agentPhone,
        agentKey,
        clientClaimAmount,
        agentClaimAmount,
      } = await loadFixture(deployEscrowFixture);

      await sargoToken.transfer(agent.address, fundAmount);
      await sargoToken
        .connect(agent)
        .approve(await sargoEscrow.getAddress(), fundAmount);

      await sargoEscrow
        .connect(client)
        .initiateDeposit(
          amount,
          currencyCode,
          conversionRate,
          paymentMethod,
          clientName,
          clientPhone,
          clientKey,
          agent.address,
          agentName,
          agentPhone,
          agentKey
        );

      const _request = await sargoEscrow.getTransactionById(1);

      await sargoToken.transfer(agent.address, fundAmount);
      await sargoToken
        .connect(agent)
        .approve(await sargoEscrow.getAddress(), fundAmount);

      await sargoEscrow.connect(agent).acceptDeposit(_request.id);

      const _accepted = await sargoEscrow.getTransactionById(_request.id);

      await sargoEscrow
        .connect(agent)
        .disputeTransaction(_accepted.id, "reason");
      const _disputed = await sargoEscrow.getTransactionById(_accepted.id);

      await sargoEscrow
        .connect(owner)
        .claimTransaction(_disputed.id, "resolution");

      const _claimed = await sargoEscrow.getTransactionById(_disputed.id);

      await sargoToken.transfer(await sargoEscrow.getAddress(), fundAmount);
      await sargoToken
        .connect(owner)
        .approve(await sargoEscrow.getAddress(), fundAmount);

      const _escrowBalance = await sargoToken.balanceOf(
        await sargoEscrow.getAddress()
      );

      expect(_escrowBalance).to.greaterThanOrEqual(_claimed.totalAmount);

      const refundTx = await sargoEscrow
        .connect(owner)
        .refundTransaction(
          _claimed.id,
          clientClaimAmount,
          agentClaimAmount,
          "resolution"
        );
      const _refunded = await sargoEscrow.getTransactionById(1);

      expect(_refunded.status).to.equal(6);
      expect(
        await sargoToken.balanceOf(await sargoEscrow.getAddress())
      ).to.equal(_escrowBalance - _claimed.netAmount);

      await expect(refundTx).to.emit(sargoEscrow, "TransactionResolved");
      //.withArgs(_refunded.id, _refunded.timestamp, _refunded, "resolution");
    });

    it("Should allow the owner to void a deposit transaction in claim", async () => {
      const {
        sargoEscrow,
        owner,
        sargoToken,
        client,
        amount,
        currencyCode,
        conversionRate,
        fundAmount,
        paymentMethod,
        clientName,
        clientPhone,
        clientKey,
        agent,
        agentName,
        agentPhone,
        agentKey,
      } = await loadFixture(deployEscrowFixture);

      await sargoToken.transfer(agent.address, fundAmount);
      await sargoToken
        .connect(agent)
        .approve(await sargoEscrow.getAddress(), fundAmount);

      await sargoEscrow
        .connect(client)
        .initiateDeposit(
          amount,
          currencyCode,
          conversionRate,
          paymentMethod,
          clientName,
          clientPhone,
          clientKey,
          agent.address,
          agentName,
          agentPhone,
          agentKey
        );

      const _request = await sargoEscrow.getTransactionById(1);

      await sargoToken.transfer(agent.address, fundAmount);
      await sargoToken
        .connect(agent)
        .approve(await sargoEscrow.getAddress(), fundAmount);

      await sargoEscrow.connect(agent).acceptDeposit(_request.id);

      const _accepted = await sargoEscrow.getTransactionById(_request.id);

      await sargoEscrow
        .connect(agent)
        .disputeTransaction(_accepted.id, "reason");
      const _disputed = await sargoEscrow.getTransactionById(_accepted.id);

      await sargoEscrow
        .connect(owner)
        .claimTransaction(_disputed.id, "resolution");

      const _claimed = await sargoEscrow.getTransactionById(_disputed.id);

      const voidTx = await sargoEscrow
        .connect(owner)
        .voidTransaction(_claimed.id, "resolution");
      const _voided = await sargoEscrow.getTransactionById(1);

      expect(_voided.status).to.equal(7);
      await expect(voidTx).to.emit(sargoEscrow, "TransactionResolved");
      //.withArgs(_voided.id, _voided.timestamp, _voided, "resolution");
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

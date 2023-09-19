const { expect } = require("chai");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { ethers, upgrades } = require("hardhat");
const { BigNumber } = require("ethers");
require("dotenv").config();

//TODO: test pausable
//TODO: test access control
//TODO: test invalid cases

describe("==SARGO ESCROW WITHDRAW TESTS ================================", () => {
  async function deployEscrowFixture() {
    const [owner, sender, recipient, client, agent, treasury] =
      await ethers.getSigners();

    const supply = 1000;
    const initialSupply = ethers.parseUnits(supply.toString(), "ether");
    const ordersFeePerc = ethers.parseUnits(
      process.env.SARGO_ORDERS_FEE_PERCENT
    );
    const transferFeePerc = ethers.parseUnits(
      process.env.SARGO_TRANSFER_FEE_PERCENT,
      "ether"
    );
    const agentRate = ethers.parseUnits(
      process.env.SARGO_AGENT_EARNING_PERCENT,
      0
    );
    const treasuryRate = ethers.parseUnits(
      process.env.SARGO_TREASURY_EARNING_PERCENT,
      0
    );

    const amount = ethers.parseUnits("5", "ether");
    const agentFee = ethers.parseUnits("0.025", "ether");
    const treasuryFee = ethers.parseUnits("0.025", "ether");
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
      [ordersFeePerc, transferFeePerc, agentRate, treasuryRate],
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

    //TODO: get fee for all tx types
    it("Should get the right agent fee", async () => {
      const { sargoEscrow, agentFee } = await loadFixture(deployEscrowFixture);
      expect(await sargoEscrow.getAgentFee()).to.equal(agentFee);
    });

    it("Should get the right treasury fee", async () => {
      const { sargoEscrow, treasuryFee } = await loadFixture(
        deployEscrowFixture
      );
      expect(await sargoEscrow.getTreasuryFee()).to.equal(treasuryFee);
    });
  });

  describe("Withdraw Transactions", function () {
    it("Should initiate a withdrawal request", async () => {
      const {
        sargoEscrow,
        sargoToken,
        client,
        agent,
        amount,
        currencyCode,
        conversionRate,
        agentFee,
        treasuryFee,
        paymentMethod,
        agentName,
        agentPhone,
        agentKey,
      } = await loadFixture(deployEscrowFixture);

      const withdrawRequest = await sargoEscrow
        .connect(agent)
        .initiateWithdrawal(
          amount,
          currencyCode,
          conversionRate,
          paymentMethod,
          agentName,
          agentPhone,
          agentKey
        );
      const _request = await sargoEscrow.getTransactionById(1);
      const _totalAmount = amount + agentFee + treasuryFee;
      const _txFees = agentFee + treasuryFee;
      const _netAmount = _totalAmount - _txFees;

      expect(_request.id).to.equal(1);
      expect(_request.refNumber).to.not.be.empty;
      expect(await sargoToken.balanceOf(_request.agentAccount)).to.equal(0);
      expect(_request.agentFee).to.equal(agentFee);
      expect(_request.treasuryFee).to.equal(treasuryFee);
      expect(_request.totalAmount).to.equal(_totalAmount);
      expect(_request.netAmount).to.equal(_netAmount);
      expect(_request.txType).to.equal(1);
      expect(_request.status).to.equal(0);
      expect(_request.agentApproved).to.equal(false);
      expect(_request.clientApproved).to.equal(false);
      expect(_request.clientKey).to.be.empty;
      expect(_request.agentKey).to.not.be.empty;
      expect(await sargoEscrow.nextTxId()).to.equal(2);

      await expect(withdrawRequest).to.emit(
        sargoEscrow,
        "TransactionInitiated"
      );
      //.withArgs(_request.id, _request.timestamp, _request);
    });

    it("Should emit withdraw request initiated event", async function () {
      const {
        sargoEscrow,
        client,
        agent,
        amount,
        currencyCode,
        conversionRate,
        paymentMethod,
        agentName,
        agentPhone,
        agentKey,
      } = await loadFixture(deployEscrowFixture);
      const withdrawRequest = await sargoEscrow
        .connect(agent)
        .initiateWithdrawal(
          amount,
          currencyCode,
          conversionRate,
          paymentMethod,
          agentName,
          agentPhone,
          agentKey
        );
      const _request = await sargoEscrow.getTransactionById(1);

      await expect(withdrawRequest).to.emit(
        sargoEscrow,
        "TransactionInitiated"
      );
      //.withArgs(_request.id, _request.timestamp, _request);
    });

    it("Should get a withdraw request transaction by id", async () => {
      const {
        sargoEscrow,
        client,
        agent,
        amount,
        currencyCode,
        conversionRate,
        paymentMethod,
        agentName,
        agentPhone,
        agentKey,
      } = await loadFixture(deployEscrowFixture);

      const withdrawRequest = await sargoEscrow
        .connect(agent)
        .initiateWithdrawal(
          amount,
          currencyCode,
          conversionRate,
          paymentMethod,
          agentName,
          agentPhone,
          agentKey
        );

      const _requested = await sargoEscrow.getTransactionById(1);

      expect(_requested.id).to.equal(1);
      expect(_requested.agentAccount).to.equal(agent.address);
      expect(_requested.txType).to.equal(1);
      expect(_requested.status).to.equal(0);
      expect(_requested.agentApproved).to.equal(false);
      expect(_requested.clientApproved).to.equal(false);
    });

    it("Should allow a client to accept withdrawal pair with the agent for a withdraw request", async () => {
      const {
        sargoEscrow,
        sargoToken,
        agent,
        client,
        amount,
        currencyCode,
        conversionRate,
        acceptedConversionRate,
        agentName,
        agentPhone,
        agentKey,
        agentFee,
        treasuryFee,
        fundAmount,
        paymentMethod,
        clientName,
        clientPhone,
        clientKey,
      } = await loadFixture(deployEscrowFixture);

      const withdrawRequest = await sargoEscrow
        .connect(agent)
        .initiateWithdrawal(
          amount,
          currencyCode,
          conversionRate,
          paymentMethod,
          agentName,
          agentPhone,
          agentKey
        );
      const _request = await sargoEscrow.getTransactionById(1);

      const _totalAmount = amount + agentFee + treasuryFee;
      const _txFees = agentFee + treasuryFee;
      const _netAmount = _totalAmount - _txFees;

      await sargoToken.transfer(agent.address, fundAmount);
      expect(await sargoToken.balanceOf(agent.address)).to.equal(fundAmount);
      await sargoToken
        .connect(agent)
        .approve(await sargoEscrow.getAddress(), fundAmount);

      const withdrawAccepted = await sargoEscrow
        .connect(client)
        .acceptWithdrawal(
          _request.id,
          clientName,
          clientPhone,
          acceptedConversionRate,
          clientKey
        );
      const _accepted = await sargoEscrow.getTransactionById(_request.id);

      expect(_accepted.id).to.equal(1);
      expect(_accepted.agentAccount).to.equal(agent.address);
      expect(_accepted.clientAccount).to.equal(client.address);
      expect(_accepted.conversionRate).to.equal(acceptedConversionRate);
      expect(_accepted.agentFee).to.equal(agentFee);
      expect(_accepted.treasuryFee).to.equal(treasuryFee);
      expect(_accepted.totalAmount).to.equal(_totalAmount);
      expect(_accepted.netAmount).to.equal(_netAmount);
      expect(_accepted.txType).to.equal(1);
      expect(_accepted.status).to.equal(1);
      expect(_accepted.agentApproved).to.equal(false);
      expect(_accepted.clientApproved).to.equal(false);
      expect(_accepted.account.agentPhoneNumber).to.equal(agentPhone);
      expect(_accepted.clientKey).to.not.be.empty;
      expect(_accepted.agentKey).to.not.be.empty;

      await expect(withdrawRequest).to.emit(
        sargoEscrow,
        "TransactionInitiated"
      );
      //.withArgs(_request.id, _request.timestamp, _request);

      await expect(withdrawAccepted).to.emit(sargoEscrow, "RequestAccepted");
      //.withArgs(_accepted.id, _accepted.timestamp, _accepted);
    });

    it("Should emit the Accept withdrwal request event", async () => {
      const {
        sargoEscrow,
        sargoToken,
        agent,
        client,
        amount,
        currencyCode,
        conversionRate,
        agentName,
        agentPhone,
        agentKey,
        fundAmount,
        paymentMethod,
        clientName,
        clientPhone,
        clientKey,
      } = await loadFixture(deployEscrowFixture);

      const withdrawRequest = await sargoEscrow
        .connect(agent)
        .initiateWithdrawal(
          amount,
          currencyCode,
          conversionRate,
          paymentMethod,
          agentName,
          agentPhone,
          agentKey
        );
      const _request = await sargoEscrow.getTransactionById(1);

      await sargoToken.transfer(agent.address, fundAmount);
      await sargoToken
        .connect(agent)
        .approve(await sargoEscrow.getAddress(), fundAmount);

      const withdrawAccepted = await sargoEscrow
        .connect(client)
        .acceptWithdrawal(
          _request.id,
          clientName,
          clientPhone,
          conversionRate,
          clientKey
        );

      const _accepted = await sargoEscrow.getTransactionById(_request.id);

      await expect(withdrawRequest).to.emit(
        sargoEscrow,
        "TransactionInitiated"
      );
      //.withArgs(_request.id, _request.timestamp, _request);

      await expect(withdrawAccepted).to.emit(sargoEscrow, "RequestAccepted");
      //.withArgs(_accepted.id, _accepted.timestamp, _accepted);
    });

    it("Should allow the client and agent confirm fiat payment received - withdraw transaction", async () => {
      const {
        sargoEscrow,
        sargoToken,
        client,
        agent,
        treasury,
        amount,
        currencyCode,
        conversionRate,
        agentName,
        agentPhone,
        agentKey,
        agentFee,
        treasuryFee,
        fundAmount,
        paymentMethod,
        clientName,
        clientPhone,
        clientKey,
      } = await loadFixture(deployEscrowFixture);

      const withdrawRequest = await sargoEscrow
        .connect(agent)
        .initiateWithdrawal(
          amount,
          currencyCode,
          conversionRate,
          paymentMethod,
          agentName,
          agentPhone,
          agentKey
        );
      const _request = await sargoEscrow.getTransactionById(1);

      await sargoToken.transfer(agent.address, fundAmount);
      await sargoToken
        .connect(agent)
        .approve(await sargoEscrow.getAddress(), fundAmount);

      const _clientBalance = await sargoToken.balanceOf(client.address);
      const _agentBalance = await sargoToken.balanceOf(agent.address);
      const _treasuryBalance = await sargoToken.balanceOf(treasury.address);

      const withdrawAccepted = await sargoEscrow
        .connect(client)
        .acceptWithdrawal(
          _request.id,
          clientName,
          clientPhone,
          conversionRate,
          clientKey
        );

      const _accepted = await sargoEscrow.getTransactionById(_request.id);
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

      const agentExpected = _agentBalance - amount - agentFee - treasuryFee;
      const clientExpected = _clientBalance + amount + agentFee;
      const treasuryExpected = _treasuryBalance + treasuryFee;
      const escrowExpected = _escrowBalance - amount - agentFee - treasuryFee;

      expect(_agentConfirmed.id).to.equal(1);
      expect(_agentConfirmed.txType).to.equal(1);
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

      //count
      const _earnings = await sargoEscrow.getEarnings(client.address);
      expect(_earnings.totalEarned).to.equal(agentFee);

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

    it("Should allow the agent to cancel a withdraw request", async () => {
      const {
        sargoEscrow,
        agent,
        client,
        amount,
        currencyCode,
        conversionRate,
        fundAmount,
        paymentMethod,
        agentName,
        agentPhone,
        agentKey,
      } = await loadFixture(deployEscrowFixture);

      const withdrawRequest = await sargoEscrow
        .connect(agent)
        .initiateWithdrawal(
          amount,
          currencyCode,
          conversionRate,
          paymentMethod,
          agentName,
          agentPhone,
          agentKey
        );
      const _request = await sargoEscrow.getTransactionById(1);

      const cancelRequest = await sargoEscrow
        .connect(agent)
        .cancelTransaction(_request.id, "reason");
      const _cancelled = await sargoEscrow.getTransactionById(_request.id);

      expect(_cancelled.id).to.equal(1);
      expect(_cancelled.agentAccount).to.equal(agent.address);
      expect(_cancelled.txType).to.equal(1);
      expect(_cancelled.status).to.equal(4);
      expect(_cancelled.agentApproved).to.equal(false);
      expect(_cancelled.clientApproved).to.equal(false);

      await expect(withdrawRequest).to.emit(
        sargoEscrow,
        "TransactionInitiated"
      );
      //.withArgs(_request.id, _request.timestamp, _request);

      await expect(cancelRequest).to.emit(sargoEscrow, "TransactionCancelled");
      //.withArgs(_cancelled.id, _cancelled.timestamp, _cancelled, "reason");
    });

    it("Should emit a withdraw request cancelled event", async function () {
      const {
        sargoEscrow,
        client,
        agent,
        amount,
        currencyCode,
        conversionRate,
        paymentMethod,
        agentName,
        agentPhone,
        agentKey,
      } = await loadFixture(deployEscrowFixture);

      const withdrawRequest = await sargoEscrow
        .connect(agent)
        .initiateWithdrawal(
          amount,
          currencyCode,
          conversionRate,
          paymentMethod,
          agentName,
          agentPhone,
          agentKey
        );
      const _request = await sargoEscrow.getTransactionById(1);

      const cancelRequest = await sargoEscrow
        .connect(agent)
        .cancelTransaction(_request.id, "reason");
      const _cancelled = await sargoEscrow.getTransactionById(_request.id);

      await expect(withdrawRequest).to.emit(
        sargoEscrow,
        "TransactionInitiated"
      );
      //.withArgs(_request.id, _request.timestamp, _request);

      await expect(cancelRequest).to.emit(sargoEscrow, "TransactionCancelled");
      //.withArgs(_cancelled.id, _cancelled.timestamp, _cancelled, "reason");
    });

    it("Should allow for a withdraw transaction to be flagged as disputed", async () => {
      const {
        sargoEscrow,
        sargoToken,
        agent,
        client,
        amount,
        currencyCode,
        conversionRate,
        fundAmount,
        paymentMethod,
        clientName,
        clientPhone,
        clientKey,
        agentName,
        agentPhone,
        agentKey,
      } = await loadFixture(deployEscrowFixture);

      const withdrawRequest = await sargoEscrow
        .connect(agent)
        .initiateWithdrawal(
          amount,
          currencyCode,
          conversionRate,
          paymentMethod,
          agentName,
          agentPhone,
          agentKey
        );
      const _request = await sargoEscrow.getTransactionById(1);

      await sargoToken.transfer(agent.address, fundAmount);
      await sargoToken
        .connect(agent)
        .approve(await sargoEscrow.getAddress(), fundAmount);
      const withdrawAccepted = await sargoEscrow
        .connect(client)
        .acceptWithdrawal(
          _request.id,
          clientName,
          clientPhone,
          conversionRate,
          clientKey
        );

      const _accepted = await sargoEscrow.getTransactionById(_request.id);
      const disputedTx = await sargoEscrow
        .connect(agent)
        .disputeTransaction(_accepted.id, "reason");
      const _cancelled = await sargoEscrow.getTransactionById(_accepted.id);

      expect(_cancelled.id).to.equal(1);
      expect(_cancelled.agentAccount).to.equal(agent.address);
      expect(_cancelled.txType).to.equal(1);
      expect(_cancelled.status).to.equal(2);
      expect(_cancelled.clientAccount).to.equal(client.address);
      expect(_cancelled.account.clientName).to.equal(clientName);
      expect(_cancelled.account.clientPhoneNumber).to.equal(clientPhone);

      await expect(withdrawRequest).to.emit(
        sargoEscrow,
        "TransactionInitiated"
      );
      //.withArgs(_request.id, _request.timestamp, _request);

      await expect(disputedTx).to.emit(sargoEscrow, "TransactionDisputed");
      //.withArgs(_cancelled.id, _cancelled.timestamp, _cancelled, "reason");
    });

    it("Should emit a disputed withdraw transaction event", async function () {
      const {
        sargoEscrow,
        sargoToken,
        client,
        agent,
        amount,
        currencyCode,
        conversionRate,
        fundAmount,
        paymentMethod,
        clientName,
        clientPhone,
        clientKey,
        agentName,
        agentPhone,
        agentKey,
      } = await loadFixture(deployEscrowFixture);

      const withdrawRequest = await sargoEscrow
        .connect(agent)
        .initiateWithdrawal(
          amount,
          currencyCode,
          conversionRate,
          paymentMethod,
          agentName,
          agentPhone,
          agentKey
        );
      const _request = await sargoEscrow.getTransactionById(1);

      await sargoToken.transfer(agent.address, fundAmount);
      await sargoToken
        .connect(agent)
        .approve(await sargoEscrow.getAddress(), fundAmount);
      const withdrawAccepted = await sargoEscrow
        .connect(client)
        .acceptWithdrawal(
          _request.id,
          clientName,
          clientPhone,
          conversionRate,
          clientKey
        );

      const _accepted = await sargoEscrow.getTransactionById(_request.id);
      const disputedTx = await sargoEscrow
        .connect(agent)
        .disputeTransaction(_accepted.id, "reason");
      const _cancelled = await sargoEscrow.getTransactionById(_accepted.id);

      await expect(withdrawRequest).to.emit(
        sargoEscrow,
        "TransactionInitiated"
      );
      //.withArgs(_request.id, _request.timestamp, _request);

      await expect(disputedTx).to.emit(sargoEscrow, "TransactionDisputed");
      //.withArgs(_cancelled.id, _cancelled.timestamp, _cancelled, "reason");
    });

    it("Should allow for a withdraw transaction to be flagged as claim", async () => {
      const {
        sargoEscrow,
        sargoToken,
        agent,
        client,
        amount,
        currencyCode,
        conversionRate,
        fundAmount,
        paymentMethod,
        clientName,
        clientPhone,
        clientKey,
        agentName,
        agentPhone,
        agentKey,
      } = await loadFixture(deployEscrowFixture);

      const withdrawRequest = await sargoEscrow
        .connect(agent)
        .initiateWithdrawal(
          amount,
          currencyCode,
          conversionRate,
          paymentMethod,
          agentName,
          agentPhone,
          agentKey
        );
      const _request = await sargoEscrow.getTransactionById(1);

      await sargoToken.transfer(agent.address, fundAmount);
      await sargoToken
        .connect(agent)
        .approve(await sargoEscrow.getAddress(), fundAmount);
      const withdrawAccepted = await sargoEscrow
        .connect(client)
        .acceptWithdrawal(
          _request.id,
          clientName,
          clientPhone,
          conversionRate,
          clientKey
        );

      const _accepted = await sargoEscrow.getTransactionById(_request.id);
      const disputedTx = await sargoEscrow
        .connect(agent)
        .disputeTransaction(_accepted.id, "reason");
      const _disputed = await sargoEscrow.getTransactionById(_accepted.id);

      const claimedTx = await sargoEscrow
        .connect(client)
        .claimTransaction(_disputed.id, "resolution");

      const _claimed = await sargoEscrow.getTransactionById(_disputed.id);

      expect(_claimed.id).to.equal(1);
      expect(_claimed.agentAccount).to.equal(agent.address);
      expect(_claimed.txType).to.equal(1);
      expect(_claimed.status).to.equal(5);
      expect(_claimed.clientAccount).to.equal(client.address);
      expect(_claimed.account.clientName).to.equal(clientName);
      expect(_claimed.account.clientPhoneNumber).to.equal(clientPhone);

      await expect(withdrawRequest).to.emit(
        sargoEscrow,
        "TransactionInitiated"
      );
      //.withArgs(_request.id, _request.timestamp, _request);

      await expect(disputedTx).to.emit(sargoEscrow, "TransactionDisputed");
      //.withArgs(_disputed.id, _disputed.timestamp, _disputed, "reason");

      await expect(claimedTx).to.emit(sargoEscrow, "TransactionClaimed");
      //.withArgs(_claimed.id, _claimed.timestamp, _claimed, "resolution");
    });

    it("Should emit a claimed withdraw transaction event", async function () {
      const {
        sargoEscrow,
        sargoToken,
        client,
        agent,
        amount,
        currencyCode,
        conversionRate,
        fundAmount,
        paymentMethod,
        clientName,
        clientPhone,
        clientKey,
        agentName,
        agentPhone,
        agentKey,
      } = await loadFixture(deployEscrowFixture);

      const withdrawRequest = await sargoEscrow
        .connect(agent)
        .initiateWithdrawal(
          amount,
          currencyCode,
          conversionRate,
          paymentMethod,
          agentName,
          agentPhone,
          agentKey
        );
      const _request = await sargoEscrow.getTransactionById(1);

      await sargoToken.transfer(agent.address, fundAmount);
      await sargoToken
        .connect(agent)
        .approve(await sargoEscrow.getAddress(), fundAmount);
      const withdrawAccepted = await sargoEscrow
        .connect(client)
        .acceptWithdrawal(
          _request.id,
          clientName,
          clientPhone,
          conversionRate,
          clientKey
        );

      const _accepted = await sargoEscrow.getTransactionById(_request.id);
      const disputedTx = await sargoEscrow
        .connect(agent)
        .disputeTransaction(_accepted.id, "reason");
      const _disputed = await sargoEscrow.getTransactionById(_accepted.id);

      const claimedTx = await sargoEscrow
        .connect(client)
        .claimTransaction(_disputed.id, "resolution");

      const _claimed = await sargoEscrow.getTransactionById(_disputed.id);

      await expect(withdrawRequest).to.emit(
        sargoEscrow,
        "TransactionInitiated"
      );
      //.withArgs(_request.id, _request.timestamp, _request);

      await expect(disputedTx).to.emit(sargoEscrow, "TransactionDisputed");
      //.withArgs(_disputed.id, _disputed.timestamp, _disputed, "reason");

      await expect(claimedTx).to.emit(sargoEscrow, "TransactionClaimed");
      //.withArgs(_claimed.id, _claimed.timestamp, _claimed, "resolution");
    });
  });

  describe("Utility transactions", function () {
    it("Should add txnId to the requests list", async () => {
      const {
        sargoEscrow,
        agent,
        amount,
        currencyCode,
        conversionRate,
        paymentMethod,
        agentName,
        agentPhone,
        agentKey,
      } = await loadFixture(deployEscrowFixture);
      const withdrawRequest = await sargoEscrow
        .connect(agent)
        .initiateWithdrawal(
          amount,
          currencyCode,
          conversionRate,
          paymentMethod,
          agentName,
          agentPhone,
          agentKey
        );
      const _requests = await sargoEscrow.getRequestsLength();

      expect(_requests).to.equal(1);
    });

    it("Should remove txnId from the requests list", async () => {
      const {
        sargoEscrow,
        sargoToken,
        client,
        agent,
        amount,
        fundAmount,
        currencyCode,
        conversionRate,
        paymentMethod,
        clientName,
        clientPhone,
        acceptedConversionRate,
        clientKey,
        agentName,
        agentPhone,
        agentKey,
      } = await loadFixture(deployEscrowFixture);

      const withdrawRequest = await sargoEscrow
        .connect(agent)
        .initiateWithdrawal(
          amount,
          currencyCode,
          conversionRate,
          paymentMethod,
          agentName,
          agentPhone,
          agentKey
        );

      const _request = await sargoEscrow.getTransactionById(1);
      const _requestsAdded = await sargoEscrow.getRequestsLength();

      await sargoToken.transfer(agent.address, fundAmount);
      await sargoToken
        .connect(agent)
        .approve(await sargoEscrow.getAddress(), fundAmount);

      const withdrawAccepted = await sargoEscrow
        .connect(client)
        .acceptWithdrawal(
          _request.id,
          clientName,
          clientPhone,
          acceptedConversionRate,
          clientKey
        );

      const _requestsRemoved = await sargoEscrow.getRequestsLength();

      expect(_request.requestIndex).to.equal(0);
      expect(_request.id).to.equal(1);
      expect(_requestsAdded).to.equal(1);
      expect(_requestsRemoved).to.equal(0);
    });

    it("Should add txnId to the address transaction history", async () => {
      const {
        sargoEscrow,
        agent,
        amount,
        currencyCode,
        conversionRate,
        paymentMethod,
        agentName,
        agentPhone,
        agentKey,
      } = await loadFixture(deployEscrowFixture);

      const withdrawRequest = await sargoEscrow
        .connect(agent)
        .initiateWithdrawal(
          amount,
          currencyCode,
          conversionRate,
          paymentMethod,
          agentName,
          agentPhone,
          agentKey
        );

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

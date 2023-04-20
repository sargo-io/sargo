const { expect } = require("chai");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { ethers } = require("hardhat");
const { BigNumber } = require("ethers");
require("dotenv").config();

describe("Sargo Token, Escrow contracts deployment and transactions", () => {
  async function deploySargoEscrowFixture() {
    const [owner, sender, recipient, client, agent, treasury] =
      await ethers.getSigners();

    const supply = 1000;
    const initialSupply = ethers.utils.parseUnits(supply.toString(), "ether");
    const agentFee = ethers.BigNumber.from(process.env.SARGO_AGENT_FEE);
    const treasuryFee = ethers.BigNumber.from(process.env.SARGO_TREASURY_FEE);
    const amount = ethers.utils.parseUnits("2", "ether");
    const fundAmount = ethers.utils.parseUnits("3", "ether");
    const currencyCode = "KES";
    const conversionRate = "140";
    const clientPhone = "254722000000";
    const agentPhone = "254723000000";
    const paymentMethod = "Mpesa";

    const SargoToken = await ethers.getContractFactory("SargoToken");
    const sargoToken = await SargoToken.deploy("Sargo", "SGT");
    await sargoToken.deployed();
    sargoToken.mint(owner.address, initialSupply);

    const SargoEscrow = await ethers.getContractFactory("SargoEscrow");
    const sargoEscrow = await SargoEscrow.deploy(
      sargoToken.address,
      agentFee,
      treasuryFee,
      treasury.address
    );
    await sargoEscrow.deployed();

    return {
      SargoEscrow,
      sargoEscrow,
      owner,
      treasuryFee,
      agentFee,
      client,
      agent,
      SargoToken,
      sargoToken,
      supply,
      initialSupply,
      treasury,
      amount,
      currencyCode,
      conversionRate,
      sender,
      recipient,
      clientPhone,
      agentPhone,
      fundAmount,
      paymentMethod,
    };
  }

  describe("Sargo Token Deployment", function () {
    it("Should set the right Token owner", async () => {
      const { sargoToken, owner } = await loadFixture(deploySargoEscrowFixture);
      expect(await sargoToken.owner()).to.equal(owner.address);
    });

    it("Should set the initial total supply", async () => {
      const { sargoToken, initialSupply } = await loadFixture(
        deploySargoEscrowFixture
      );
      expect(await sargoToken.totalSupply()).to.equal(initialSupply);
    });

    it("Should update the balance of the owner with the total supply value", async () => {
      const { sargoToken, initialSupply } = await loadFixture(
        deploySargoEscrowFixture
      );
      expect(await sargoToken.balanceOf(sargoToken.owner())).to.equal(
        initialSupply
      );
    });

    it("Should increase the total supply by initial supply value", async () => {
      const { sargoToken, initialSupply, supply } = await loadFixture(
        deploySargoEscrowFixture
      );
      sargoToken.mint(sargoToken.address, initialSupply);
      const expected = ethers.utils.parseUnits(
        (supply + supply).toString(),
        "ether"
      );
      expect(await sargoToken.totalSupply()).to.equal(expected);
    });

    it("Should decrease the total supply by initial supply value", async () => {
      const { sargoToken, initialSupply, supply } = await loadFixture(
        deploySargoEscrowFixture
      );
      sargoToken.burn(sargoToken.address, initialSupply);
      const expected = ethers.utils.parseUnits(supply.toString(), "ether");
      expect(await sargoToken.totalSupply()).to.equal(expected);
    });

    it("Should transfer amount into the provided recipient address", async () => {
      const { sargoToken, fundAmount, client } = await loadFixture(
        deploySargoEscrowFixture
      );
      await sargoToken.transfer(client.address, fundAmount);
      expect(await sargoToken.balanceOf(client.address)).to.equal(fundAmount);
    });

    it("Should approve amount as allowance for tranfer of value from sender", async () => {
      const { sargoToken, owner, fundAmount } = await loadFixture(
        deploySargoEscrowFixture
      );
      await sargoToken.connect(owner).approve(owner.address, fundAmount);
      expect(await sargoToken.allowance(owner.address, owner.address)).to.equal(
        fundAmount
      );
    });

    it("Should transfer provided amount from one address into another", async () => {
      const { sargoToken, owner, client, fundAmount } = await loadFixture(
        deploySargoEscrowFixture
      );
      await sargoToken.connect(owner).approve(owner.address, fundAmount);
      await sargoToken.transferFrom(owner.address, client.address, fundAmount);
      expect(await sargoToken.balanceOf(client.address)).to.equal(fundAmount);
    });

    it("Should emit a transfer event", async function () {
      const { sargoToken, owner, client, fundAmount } = await loadFixture(
        deploySargoEscrowFixture
      );
      await sargoToken.connect(owner).approve(owner.address, fundAmount);
      await expect(
        sargoToken.transferFrom(owner.address, client.address, fundAmount)
      )
        .to.emit(sargoToken, "Transfer")
        .withArgs(owner.address, client.address, fundAmount);
    });
  });

  describe("Sargo Escrow Deployment", function () {
    it("Should set the right Sargo escrow owner", async () => {
      const { sargoEscrow, owner } = await loadFixture(
        deploySargoEscrowFixture
      );
      expect(await sargoEscrow.owner()).to.equal(owner.address);
    });

    it("Should set the right escrow address", async () => {
      const { sargoEscrow, sargoToken } = await loadFixture(
        deploySargoEscrowFixture
      );
      expect(await sargoEscrow.tokenContractAddress()).to.equal(
        sargoToken.address
      );
    });

    it("Should set the right tresury address", async () => {
      const { sargoEscrow, treasury } = await loadFixture(
        deploySargoEscrowFixture
      );
      expect(await sargoEscrow.treasuryAddress()).to.equal(treasury.address);
    });

    it("Should set the right agent fee", async () => {
      const { sargoEscrow, agentFee } = await loadFixture(
        deploySargoEscrowFixture
      );
      expect(await sargoEscrow.agentFee()).to.equal(agentFee);
    });

    it("Should set the right treasury fee", async () => {
      const { sargoEscrow, treasuryFee } = await loadFixture(
        deploySargoEscrowFixture
      );
      expect(await sargoEscrow.treasuryFee()).to.equal(treasuryFee);
    });
  });

  describe("Deposit Transactions", function () {
    it("Should initiate a deposit request", async () => {
      const {
        sargoEscrow,
        sargoToken,
        client,
        amount,
        currencyCode,
        conversionRate,
        agentFee,
        treasuryFee,
        paymentMethod,
      } = await loadFixture(deploySargoEscrowFixture);
      const depositRequest = await sargoEscrow
        .connect(client)
        .initiateDeposit(amount, currencyCode, conversionRate, paymentMethod);
      const _request = await sargoEscrow.getTransactionByIndex(0);
      const _totalAmount = amount.add(agentFee).add(treasuryFee);
      const _txFees = agentFee.add(treasuryFee);
      const _netAmount = _totalAmount.sub(_txFees);

      expect(_request.id).to.equal(0);
      expect(await sargoToken.balanceOf(_request.agentAccount)).to.equal(0);
      expect(_request.agentFee).to.equal(agentFee);
      expect(_request.treasuryFee).to.equal(treasuryFee);
      expect(_request.totalAmount).to.equal(_totalAmount);
      expect(_request.netAmount).to.equal(_netAmount);
      expect(_request.txType).to.equal(0);
      expect(_request.status).to.equal(0);
      expect(_request.agentApproved).to.equal(false);
      expect(_request.clientApproved).to.equal(false);
    });

    it("Should emit deposit request initiated event", async function () {
      const {
        sargoEscrow,
        client,
        amount,
        currencyCode,
        conversionRate,
        paymentMethod,
      } = await loadFixture(deploySargoEscrowFixture);

      const depositRequest = await sargoEscrow
        .connect(client)
        .initiateDeposit(amount, currencyCode, conversionRate, paymentMethod);

      const _request = await sargoEscrow.getTransactionByIndex(0);

      await expect(depositRequest)
        .to.emit(sargoEscrow, "TransactionInitiated")
        .withArgs(_request);
    });

    it("Should get a deposit request transaction by id", async () => {
      const {
        sargoEscrow,
        client,
        amount,
        currencyCode,
        conversionRate,
        paymentMethod,
      } = await loadFixture(deploySargoEscrowFixture);

      const depositRequest = await sargoEscrow
        .connect(client)
        .initiateDeposit(amount, currencyCode, conversionRate, paymentMethod);
      const _requested = await sargoEscrow.getRequestById(0);

      expect(_requested.id).to.equal(0);
      expect(_requested.clientAccount).to.equal(client.address);
      expect(_requested.txType).to.equal(0);
      expect(_requested.status).to.equal(0);
      expect(_requested.agentApproved).to.equal(false);
      expect(_requested.clientApproved).to.equal(false);
    });

    it("Should allow an agent to Accept deposit pair with client for deposit request", async () => {
      const {
        sargoEscrow,
        sargoToken,
        agent,
        client,
        amount,
        currencyCode,
        conversionRate,
        agentPhone,
        agentFee,
        treasuryFee,
        fundAmount,
        paymentMethod,
      } = await loadFixture(deploySargoEscrowFixture);

      const depositRequest = await sargoEscrow
        .connect(client)
        .initiateDeposit(amount, currencyCode, conversionRate, paymentMethod);
      const _request = await sargoEscrow.getTransactionByIndex(0);

      const _totalAmount = amount.add(agentFee).add(treasuryFee);
      const _txFees = agentFee.add(treasuryFee);
      const _netAmount = _totalAmount.sub(_txFees);

      await sargoToken.transfer(agent.address, fundAmount);
      expect(await sargoToken.balanceOf(agent.address)).to.equal(fundAmount);

      await sargoToken.connect(agent).approve(sargoEscrow.address, fundAmount);
      const acceptDeposit = await sargoEscrow
        .connect(agent)
        .acceptDeposit(_request.id, agentPhone);
      const _accepted = await sargoEscrow.getTransactionByIndex(_request.id);

      expect(_accepted.id).to.equal(0);
      expect(_accepted.agentAccount).to.equal(agent.address);
      expect(_accepted.agentFee).to.equal(agentFee);
      expect(_accepted.treasuryFee).to.equal(treasuryFee);
      expect(_accepted.totalAmount).to.equal(_totalAmount);
      expect(_accepted.netAmount).to.equal(_netAmount);
      expect(_accepted.agentPhoneNumber).to.equal(agentPhone);
      expect(_accepted.txType).to.equal(0);
      expect(_accepted.status).to.equal(1);
      expect(_accepted.agentApproved).to.equal(false);
      expect(_accepted.clientApproved).to.equal(false);

      await expect(depositRequest)
        .to.emit(sargoEscrow, "TransactionInitiated")
        .withArgs(_request);

      await expect(acceptDeposit)
        .to.emit(sargoEscrow, "RequestAccepted")
        .withArgs(_accepted);
    });

    it("Should emit the Accept deposit request event", async () => {
      const {
        sargoEscrow,
        sargoToken,
        agent,
        client,
        amount,
        currencyCode,
        conversionRate,
        agentPhone,
        fundAmount,
        paymentMethod,
      } = await loadFixture(deploySargoEscrowFixture);

      const depositRequest = await sargoEscrow
        .connect(client)
        .initiateDeposit(amount, currencyCode, conversionRate, paymentMethod);
      const _request = await sargoEscrow.getTransactionByIndex(0);

      await sargoToken.transfer(agent.address, fundAmount);
      await sargoToken.connect(agent).approve(sargoEscrow.address, fundAmount);

      const acceptDeposit = await sargoEscrow
        .connect(agent)
        .acceptDeposit(_request.id, agentPhone);

      const _accepted = await sargoEscrow.getTransactionByIndex(_request.id);

      await expect(depositRequest)
        .to.emit(sargoEscrow, "TransactionInitiated")
        .withArgs(_request);

      await expect(acceptDeposit)
        .to.emit(sargoEscrow, "RequestAccepted")
        .withArgs(_accepted);
    });

    it("Should allow the client and agent to confirm fiat payment received - Deposit request", async () => {
      const {
        sargoEscrow,
        sargoToken,
        agent,
        client,
        treasury,
        amount,
        currencyCode,
        conversionRate,
        agentPhone,
        agentFee,
        treasuryFee,
        fundAmount,
        paymentMethod,
      } = await loadFixture(deploySargoEscrowFixture);

      const depositRequest = await sargoEscrow
        .connect(client)
        .initiateDeposit(amount, currencyCode, conversionRate, paymentMethod);
      const _request = await sargoEscrow.getTransactionByIndex(0);

      await sargoToken.transfer(agent.address, fundAmount);
      await sargoToken.connect(agent).approve(sargoEscrow.address, fundAmount);

      const _clientBalance = await sargoToken.balanceOf(client.address);
      const _agentBalance = await sargoToken.balanceOf(agent.address);
      const _treasuryBalance = await sargoToken.balanceOf(treasury.address);
      const acceptDeposit = await sargoEscrow
        .connect(agent)
        .acceptDeposit(_request.id, agentPhone);
      const _accepted = await sargoEscrow.getTransactionByIndex(_request.id);
      const _escrowBalance = await sargoToken.balanceOf(sargoEscrow.address);
      const clientConfirmed = await sargoEscrow
        .connect(client)
        .clientConfirmPayment(_accepted.id);
      const _clientConfirmed = await sargoEscrow.getTransactionByIndex(
        _accepted.id
      );

      const agentConfirmed = await sargoEscrow
        .connect(agent)
        .agentConfirmPayment(_clientConfirmed.id);
      const _agentConfirmed = await sargoEscrow.getTransactionByIndex(
        _clientConfirmed.id
      );

      /* Transaction should be completed when both client and agent confirm payments */

      const clientExpected = _clientBalance.add(amount);
      const agentExpected = _agentBalance
        .sub(amount)
        .sub(agentFee)
        .sub(treasuryFee)
        .add(agentFee);
      const treasuryExpected = _treasuryBalance.add(treasuryFee);

      const escrowExpected = _escrowBalance
        .sub(amount)
        .sub(agentFee)
        .sub(treasuryFee);

      expect(_agentConfirmed.id).to.equal(0);
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

      expect(await sargoToken.balanceOf(sargoEscrow.address)).to.equal(
        escrowExpected
      );

      const _earnings = await sargoEscrow.getEarnings(agent.address);
      expect(_earnings.totalEarned).to.equal(agentFee);

      await expect(depositRequest)
        .to.emit(sargoEscrow, "TransactionInitiated")
        .withArgs(_request);

      await expect(acceptDeposit)
        .to.emit(sargoEscrow, "RequestAccepted")
        .withArgs(_accepted);

      await expect(clientConfirmed)
        .to.emit(sargoEscrow, "ClientConfirmed")
        .withArgs(_clientConfirmed);

      /* await expect(agentConfirmed)
        .to.emit(sargoEscrow, "AgentConfirmed")
        .withArgs(_agentConfirmed);

      await expect(agentConfirmed)
        .to.emit(sargoEscrow, "ConfirmationCompleted")
        .withArgs(_agentConfirmed);

      await expect(agentConfirmed)
        .to.emit(sargoEscrow, "TransactionCompleted")
        .withArgs(_agentConfirmed); */
    });

    it("Should allow the client to cancel a deposit request", async () => {
      const {
        sargoEscrow,
        agent,
        client,
        amount,
        currencyCode,
        conversionRate,
        fundAmount,
        paymentMethod,
      } = await loadFixture(deploySargoEscrowFixture);

      const depositRequest = await sargoEscrow
        .connect(client)
        .initiateDeposit(amount, currencyCode, conversionRate, paymentMethod);
      const _request = await sargoEscrow.getTransactionByIndex(0);
      const cancelRequest = await sargoEscrow
        .connect(client)
        .cancelTransaction(_request.id, "reason");
      const _cancelled = await sargoEscrow.getTransactionByIndex(_request.id);

      expect(_cancelled.id).to.equal(0);
      expect(_cancelled.clientAccount).to.equal(client.address);
      expect(_cancelled.txType).to.equal(0);
      expect(_cancelled.status).to.equal(4);
      expect(_cancelled.agentApproved).to.equal(false);
      expect(_cancelled.clientApproved).to.equal(false);

      await expect(depositRequest)
        .to.emit(sargoEscrow, "TransactionInitiated")
        .withArgs(_request);

      await expect(cancelRequest)
        .to.emit(sargoEscrow, "TransactionCancelled")
        .withArgs(_cancelled, "reason");
    });

    it("Should emit a deposit request cancelled event", async function () {
      const {
        sargoEscrow,
        client,
        amount,
        currencyCode,
        conversionRate,
        paymentMethod,
      } = await loadFixture(deploySargoEscrowFixture);

      const depositRequest = await sargoEscrow
        .connect(client)
        .initiateDeposit(amount, currencyCode, conversionRate, paymentMethod);
      const _request = await sargoEscrow.getTransactionByIndex(0);

      const cancelRequest = await sargoEscrow
        .connect(client)
        .cancelTransaction(_request.id, "reason");
      const _cancelled = await sargoEscrow.getTransactionByIndex(_request.id);

      await expect(depositRequest)
        .to.emit(sargoEscrow, "TransactionInitiated")
        .withArgs(_request);

      await expect(cancelRequest)
        .to.emit(sargoEscrow, "TransactionCancelled")
        .withArgs(_cancelled, "reason");
    });
  });

  describe("Withdraw Transactions", function () {
    it("Should initiate a withdrawal request", async () => {
      const {
        sargoEscrow,
        sargoToken,
        client,
        amount,
        currencyCode,
        conversionRate,
        agentFee,
        treasuryFee,
        paymentMethod,
      } = await loadFixture(deploySargoEscrowFixture);

      const withdrawRequest = await sargoEscrow
        .connect(client)
        .initiateWithdrawal(
          amount,
          currencyCode,
          conversionRate,
          paymentMethod
        );
      const _request = await sargoEscrow.getTransactionByIndex(0);
      const _totalAmount = amount.add(agentFee).add(treasuryFee);
      const _txFees = agentFee.add(treasuryFee);
      const _netAmount = _totalAmount.sub(_txFees);

      expect(_request.id).to.equal(0);
      expect(await sargoToken.balanceOf(_request.agentAccount)).to.equal(0);
      expect(_request.agentFee).to.equal(agentFee);
      expect(_request.treasuryFee).to.equal(treasuryFee);
      expect(_request.totalAmount).to.equal(_totalAmount);
      expect(_request.netAmount).to.equal(_netAmount);
      expect(_request.txType).to.equal(1);
      expect(_request.status).to.equal(0);
      expect(_request.agentApproved).to.equal(false);
      expect(_request.clientApproved).to.equal(false);

      await expect(withdrawRequest)
        .to.emit(sargoEscrow, "TransactionInitiated")
        .withArgs(_request);
    });

    it("Should emit withdraw request initiated event", async function () {
      const {
        sargoEscrow,
        client,
        amount,
        currencyCode,
        conversionRate,
        paymentMethod,
      } = await loadFixture(deploySargoEscrowFixture);
      const withdrawRequest = await sargoEscrow
        .connect(client)
        .initiateWithdrawal(
          amount,
          currencyCode,
          conversionRate,
          paymentMethod
        );
      const _request = await sargoEscrow.getTransactionByIndex(0);

      await expect(withdrawRequest)
        .to.emit(sargoEscrow, "TransactionInitiated")
        .withArgs(_request);
    });

    it("Should get a withdraw request transaction by id", async () => {
      const {
        sargoEscrow,
        client,
        amount,
        currencyCode,
        conversionRate,
        paymentMethod,
      } = await loadFixture(deploySargoEscrowFixture);

      const withdrawRequest = await sargoEscrow
        .connect(client)
        .initiateWithdrawal(
          amount,
          currencyCode,
          conversionRate,
          paymentMethod
        );
      const _requested = await sargoEscrow.getRequestById(0);

      expect(_requested.id).to.equal(0);
      expect(_requested.clientAccount).to.equal(client.address);
      expect(_requested.txType).to.equal(1);
      expect(_requested.status).to.equal(0);
      expect(_requested.agentApproved).to.equal(false);
      expect(_requested.clientApproved).to.equal(false);
    });

    it("Should allow an agent to Accept withdrwal pair with the client for a withdraw request", async () => {
      const {
        sargoEscrow,
        sargoToken,
        agent,
        client,
        amount,
        currencyCode,
        conversionRate,
        agentPhone,
        agentFee,
        treasuryFee,
        fundAmount,
        paymentMethod,
      } = await loadFixture(deploySargoEscrowFixture);

      const withdrawRequest = await sargoEscrow
        .connect(client)
        .initiateWithdrawal(
          amount,
          currencyCode,
          conversionRate,
          paymentMethod
        );
      const _request = await sargoEscrow.getTransactionByIndex(0);

      const _totalAmount = amount.add(agentFee).add(treasuryFee);
      const _txFees = agentFee.add(treasuryFee);
      const _netAmount = _totalAmount.sub(_txFees);

      await sargoToken.transfer(agent.address, fundAmount);
      expect(await sargoToken.balanceOf(agent.address)).to.equal(fundAmount);

      await sargoToken.connect(agent).approve(sargoEscrow.address, fundAmount);

      const withdrawAccepted = await sargoEscrow
        .connect(agent)
        .acceptWithdrawal(_request.id, agentPhone);
      const _accepted = await sargoEscrow.getTransactionByIndex(_request.id);

      expect(_accepted.id).to.equal(0);
      expect(_accepted.agentAccount).to.equal(agent.address);
      expect(_accepted.agentFee).to.equal(agentFee);
      expect(_accepted.treasuryFee).to.equal(treasuryFee);
      expect(_accepted.totalAmount).to.equal(_totalAmount);
      expect(_accepted.netAmount).to.equal(_netAmount);
      expect(_accepted.txType).to.equal(1);
      expect(_accepted.status).to.equal(1);
      expect(_accepted.agentApproved).to.equal(false);
      expect(_accepted.clientApproved).to.equal(false);
      expect(_accepted.agentPhoneNumber).to.equal(agentPhone);

      await expect(withdrawRequest)
        .to.emit(sargoEscrow, "TransactionInitiated")
        .withArgs(_request);

      await expect(withdrawAccepted)
        .to.emit(sargoEscrow, "RequestAccepted")
        .withArgs(_accepted);
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
        agentPhone,
        fundAmount,
        paymentMethod,
      } = await loadFixture(deploySargoEscrowFixture);

      const withdrawRequest = await sargoEscrow
        .connect(client)
        .initiateWithdrawal(
          amount,
          currencyCode,
          conversionRate,
          paymentMethod
        );
      const _request = await sargoEscrow.getTransactionByIndex(0);

      await sargoToken.transfer(agent.address, fundAmount);
      await sargoToken.connect(agent).approve(sargoEscrow.address, fundAmount);

      const withdrawAccepted = await sargoEscrow
        .connect(agent)
        .acceptWithdrawal(_request.id, agentPhone);

      const _accepted = await sargoEscrow.getTransactionByIndex(_request.id);

      await expect(withdrawRequest)
        .to.emit(sargoEscrow, "TransactionInitiated")
        .withArgs(_request);

      await expect(withdrawAccepted)
        .to.emit(sargoEscrow, "RequestAccepted")
        .withArgs(_accepted);
    });

    it("Should allow the client and agent confirm fiat payment received - withdraw transaction", async () => {
      const {
        sargoEscrow,
        sargoToken,
        agent,
        client,
        treasury,
        amount,
        currencyCode,
        conversionRate,
        agentPhone,
        agentFee,
        treasuryFee,
        fundAmount,
        paymentMethod,
      } = await loadFixture(deploySargoEscrowFixture);

      const withdrawRequest = await sargoEscrow
        .connect(client)
        .initiateWithdrawal(
          amount,
          currencyCode,
          conversionRate,
          paymentMethod
        );
      const _request = await sargoEscrow.getTransactionByIndex(0);

      await sargoToken.transfer(agent.address, fundAmount);
      await sargoToken.connect(agent).approve(sargoEscrow.address, fundAmount);

      const _clientBalance = await sargoToken.balanceOf(client.address);
      const _agentBalance = await sargoToken.balanceOf(agent.address);
      const _treasuryBalance = await sargoToken.balanceOf(treasury.address);

      const withdrawAccepted = await sargoEscrow
        .connect(agent)
        .acceptWithdrawal(_request.id, agentPhone);

      const _accepted = await sargoEscrow.getTransactionByIndex(_request.id);
      const _escrowBalance = await sargoToken.balanceOf(sargoEscrow.address);
      const clientConfirmed = await sargoEscrow
        .connect(client)
        .clientConfirmPayment(_accepted.id);
      const _clientConfirmed = await sargoEscrow.getTransactionByIndex(
        _accepted.id
      );

      const agentConfirmed = await sargoEscrow
        .connect(agent)
        .agentConfirmPayment(_clientConfirmed.id);
      const _agentConfirmed = await sargoEscrow.getTransactionByIndex(
        _clientConfirmed.id
      );

      /* Transaction should be completed when both client and agent confirm payments */

      const clientExpected = _clientBalance.add(amount);
      const agentExpected = _agentBalance
        .sub(amount)
        .sub(agentFee)
        .sub(treasuryFee)
        .add(agentFee);

      const treasuryExpected = _treasuryBalance.add(treasuryFee);

      const escrowExpected = _escrowBalance
        .sub(amount)
        .sub(agentFee)
        .sub(treasuryFee);

      expect(_agentConfirmed.id).to.equal(0);
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

      expect(await sargoToken.balanceOf(sargoEscrow.address)).to.equal(
        escrowExpected
      );

      //count
      const _earnings = await sargoEscrow.getEarnings(agent.address);
      expect(_earnings.totalEarned).to.equal(agentFee);

      await expect(withdrawRequest)
        .to.emit(sargoEscrow, "TransactionInitiated")
        .withArgs(_request);

      await expect(withdrawAccepted)
        .to.emit(sargoEscrow, "RequestAccepted")
        .withArgs(_accepted);

      await expect(clientConfirmed)
        .to.emit(sargoEscrow, "ClientConfirmed")
        .withArgs(_clientConfirmed);

      await expect(agentConfirmed)
        .to.emit(sargoEscrow, "AgentConfirmed")
        .withArgs(_agentConfirmed);

      await expect(agentConfirmed)
        .to.emit(sargoEscrow, "ConfirmationCompleted")
        .withArgs(_agentConfirmed);

      await expect(agentConfirmed)
        .to.emit(sargoEscrow, "TransactionCompleted")
        .withArgs(_agentConfirmed);
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
      } = await loadFixture(deploySargoEscrowFixture);

      const withdrawRequest = await sargoEscrow
        .connect(client)
        .initiateWithdrawal(
          amount,
          currencyCode,
          conversionRate,
          paymentMethod
        );
      const _request = await sargoEscrow.getTransactionByIndex(0);

      const cancelRequest = await sargoEscrow
        .connect(client)
        .cancelTransaction(_request.id, "reason");
      const _cancelled = await sargoEscrow.getTransactionByIndex(_request.id);

      expect(_cancelled.id).to.equal(0);
      expect(_cancelled.clientAccount).to.equal(client.address);
      expect(_cancelled.txType).to.equal(1);
      expect(_cancelled.status).to.equal(4);
      expect(_cancelled.agentApproved).to.equal(false);
      expect(_cancelled.clientApproved).to.equal(false);

      await expect(withdrawRequest)
        .to.emit(sargoEscrow, "TransactionInitiated")
        .withArgs(_request);

      await expect(cancelRequest)
        .to.emit(sargoEscrow, "TransactionCancelled")
        .withArgs(_cancelled, "reason");
    });

    it("Should emit a withdraw request cancelled event", async function () {
      const {
        sargoEscrow,
        client,
        amount,
        currencyCode,
        conversionRate,
        paymentMethod,
      } = await loadFixture(deploySargoEscrowFixture);

      const withdrawRequest = await sargoEscrow
        .connect(client)
        .initiateWithdrawal(
          amount,
          currencyCode,
          conversionRate,
          paymentMethod
        );
      const _request = await sargoEscrow.getTransactionByIndex(0);

      const cancelRequest = await sargoEscrow
        .connect(client)
        .cancelTransaction(_request.id, "reason");
      const _cancelled = await sargoEscrow.getTransactionByIndex(_request.id);

      await expect(withdrawRequest)
        .to.emit(sargoEscrow, "TransactionInitiated")
        .withArgs(_request);

      await expect(cancelRequest)
        .to.emit(sargoEscrow, "TransactionCancelled")
        .withArgs(_cancelled, "reason");
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
        currencyCode,
        conversionRate,
        fundAmount,
      } = await loadFixture(deploySargoEscrowFixture);

      await sargoToken.transfer(agent.address, fundAmount);
      await sargoToken.connect(agent).approve(sargoEscrow.address, fundAmount);

      const _senderBalance = await sargoToken.balanceOf(agent.address);
      const _recipientBalance = await sargoToken.balanceOf(client.address);
      const sendAmount = await sargoEscrow
        .connect(agent)
        .send(client.address, amount, currencyCode, conversionRate);

      const _sent = await sargoEscrow.getTransactionByIndex(0);

      expect(_sent.txType).to.equal(2);
      expect(await sargoToken.balanceOf(agent.address)).to.equal(
        _senderBalance.sub(amount)
      );
      expect(await sargoToken.balanceOf(client.address)).to.equal(
        _recipientBalance.add(amount)
      );

      expect(_sent.clientAccount).to.equal(client.address);
      expect(_sent.agentAccount).to.equal(agent.address);
      expect(_sent.netAmount).to.equal(amount);
      expect(_sent.paymentMethod).to.equal("TOKEN");

      await expect(sendAmount)
        .to.emit(sargoEscrow, "Transfer")
        .withArgs(_sent.agentAccount, _sent.clientAccount, _sent.netAmount);
    });

    it("Should transfer value from the escrow address to provided address", async () => {
      const {
        sargoEscrow,
        sargoToken,
        owner,
        client,
        amount,
        currencyCode,
        conversionRate,
        fundAmount,
      } = await loadFixture(deploySargoEscrowFixture);
      /* Update escrow's balance to allow transfer transaction */
      await sargoToken.transfer(sargoEscrow.address, fundAmount);
      await sargoToken.connect(owner).approve(sargoEscrow.address, fundAmount);

      const _addressBalance = await sargoToken.balanceOf(sargoEscrow.address);
      const _recipientBalance = await sargoToken.balanceOf(client.address);

      const sendAmount = await sargoEscrow
        .connect(owner)
        .transfer(client.address, amount, currencyCode, conversionRate);

      const _sent = await sargoEscrow.getTransactionByIndex(0);

      expect(_sent.txType).to.equal(2);
      expect(await sargoToken.balanceOf(sargoEscrow.address)).to.equal(
        _addressBalance.sub(amount)
      );
      expect(await sargoToken.balanceOf(client.address)).to.equal(
        _recipientBalance.add(amount)
      );
      expect(_sent.clientAccount).to.equal(client.address);
      expect(_sent.agentAccount).to.equal(owner.address);
      expect(_sent.netAmount).to.equal(amount);
      expect(_sent.paymentMethod).to.equal("TOKEN");

      await expect(sendAmount)
        .to.emit(sargoEscrow, "Transfer")
        .withArgs(_sent.agentAccount, _sent.clientAccount, _sent.netAmount);
    });

    it("Should emit a transfer event when send function is called", async function () {
      const {
        sargoEscrow,
        sargoToken,
        agent,
        client,
        amount,
        currencyCode,
        conversionRate,
        fundAmount,
      } = await loadFixture(deploySargoEscrowFixture);

      await sargoToken.transfer(agent.address, fundAmount);
      await sargoToken.connect(agent).approve(sargoEscrow.address, fundAmount);

      const sendAmount = await sargoEscrow
        .connect(agent)
        .send(client.address, amount, currencyCode, conversionRate);

      const _sent = await sargoEscrow.getTransactionByIndex(0);

      await expect(sendAmount)
        .to.emit(sargoEscrow, "Transfer")
        .withArgs(_sent.agentAccount, _sent.clientAccount, _sent.netAmount);
    });

    it("Should emit a transfer event when transfer function is called", async function () {
      const {
        sargoEscrow,
        sargoToken,
        owner,
        client,
        amount,
        currencyCode,
        conversionRate,
        fundAmount,
      } = await loadFixture(deploySargoEscrowFixture);

      await sargoToken.transfer(sargoEscrow.address, fundAmount);
      await sargoToken.connect(owner).approve(sargoEscrow.address, fundAmount);

      const sendAmount = await sargoEscrow
        .connect(owner)
        .transfer(client.address, amount, currencyCode, conversionRate);

      const _sent = await sargoEscrow.getTransactionByIndex(0);

      await expect(sendAmount)
        .to.emit(sargoEscrow, "Transfer")
        .withArgs(_sent.agentAccount, _sent.clientAccount, _sent.netAmount);
    });
  });

  describe("Utility transactions", function () {
    it("Should get the estimated gas price", async () => {});

    it("Should get all transactions", async () => {
      //TODO: Implement
    });

    it("Should get all commissions", async () => {
      //TODO: Implement
    });
  });
});

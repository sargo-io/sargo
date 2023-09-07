const { expect } = require("chai");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { ethers, upgrades } = require("hardhat");
require("dotenv").config();

/* 
//TODO: get deposit requests count
//TODO: get withdraw requests count
//TODO: get transactions count by status
//TODO: get completed transactions count

//TODO: test pausable
//TODO: test access control
//TODO: test nonReentrant
//TODO: test invalid cases

//TODO: test upgradeable
//TODO: test encription
//TODO: test fees contract 
*/

describe("==SARGO ESCROW TESTS ================================", () => {
  async function deployEscrowFixture() {
    const [owner, sender, recipient, client, agent, treasury] =
      await ethers.getSigners();

    const supply = 1000;
    const initialSupply = ethers.parseUnits(supply.toString(), "ether");
    const agentFee = BigInt(process.env.SARGO_AGENT_FEE); //TODO: removed in favour of fees contract
    const treasuryFee = BigInt(process.env.SARGO_TREASURY_FEE); //TODO: removed in favour of fees contract
    const amount = ethers.parseUnits("5", "ether");
    const fundAmount = ethers.parseUnits("7", "ether");
    const currencyCode = "KES";
    const conversionRate = "140";
    const acceptedConversionRate = "145";
    const clientName = "clientName";
    const clientPhone = "254722000000";
    const agentName = "agentName";
    const agentPhone = "254723000000";
    const paymentMethod = "Mpesa";

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
    const sargoFee = await upgrades.deployProxy(
      SargoFee,
      [agentFee, treasuryFee],
      {
        kind: "uups",
      }
    );
    await sargoFee.waitForDeployment();

    //Earn contract
    const SargoEarn = await ethers.getContractFactory("SargoEarn");
    const sargoEarn = await upgrades.deployProxy(SargoEarn, {
      kind: "uups",
    });
    await sargoEarn.waitForDeployment();

    const TOKEN_ADDRESS = await sargoToken.getAddress();
    const FEE_ADDRESS = await sargoFee.getAddress();
    const EARN_ADDRESS = await sargoEarn.getAddress();

    const SargoEscrow = await ethers.getContractFactory("SargoEscrow");
    const sargoEscrow = await upgrades.deployProxy(
      SargoEscrow,
      [TOKEN_ADDRESS, treasury.address, FEE_ADDRESS, EARN_ADDRESS],
      { kind: "uups" }
    );

    await sargoEscrow.waitForDeployment();

    const ESCROW_ADDRESS = await sargoEscrow.getAddress();
    console.log("SARGO_ESCROW deployed to:", ESCROW_ADDRESS);

    return {
      TOKEN_ADDRESS,
      FEE_ADDRESS,
      EARN_ADDRESS,
      ESCROW_ADDRESS,
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
    };
  }

  describe("Sargo Escrow Deployment", function () {
    it("Should set the right Sargo escrow owner", async () => {
      const { sargoEscrow, owner } = await loadFixture(deployEscrowFixture);
      expect(await sargoEscrow.owner()).to.equal(owner.address);
    });

    it("Should set the right escrow address", async () => {
      const { sargoEscrow, ESCROW_ADDRESS } = await loadFixture(
        deployEscrowFixture
      );
      expect(await sargoEscrow.getAddress()).to.equal(ESCROW_ADDRESS);
    });

    it("Should set the right token address", async () => {
      const { sargoEscrow, TOKEN_ADDRESS } = await loadFixture(
        deployEscrowFixture
      );
      expect(await sargoEscrow.tokenAddress()).to.equal(TOKEN_ADDRESS);
    });

    it("Should set the right tresury address", async () => {
      const { sargoEscrow, treasury } = await loadFixture(deployEscrowFixture);
      expect(await sargoEscrow.treasuryAddress()).to.equal(treasury.address);
    });

    it("Should set the right fee address", async () => {
      const { sargoEscrow, FEE_ADDRESS } = await loadFixture(
        deployEscrowFixture
      );
      expect(await sargoEscrow.feeAddress()).to.equal(FEE_ADDRESS);
    });

    it("Should set the right earn address", async () => {
      const { sargoEscrow, EARN_ADDRESS } = await loadFixture(
        deployEscrowFixture
      );
      expect(await sargoEscrow.earnAddress()).to.equal(EARN_ADDRESS);
    });

    it("Should set the right agent fee", async () => {
      const { sargoEscrow, agentFee } = await loadFixture(deployEscrowFixture);
      expect(await sargoEscrow.getAgentFee()).to.equal(agentFee);
    });

    it("Should set the right treasury fee", async () => {
      const { sargoEscrow, treasuryFee } = await loadFixture(
        deployEscrowFixture
      );
      expect(await sargoEscrow.getTreasuryFee()).to.equal(treasuryFee);
    });
  });

  // describe("Deposit Transactions", function () {
  //   it("Should initiate a deposit request", async () => {
  //     const {
  //       sargoEscrow,
  //       sargoToken,
  //       client,
  //       amount,
  //       currencyCode,
  //       conversionRate,
  //       agentFee,
  //       treasuryFee,
  //       paymentMethod,
  //       clientName,
  //       clientPhone,
  //     } = await loadFixture(deployEscrowFixture);
  //     const depositRequest = await sargoEscrow
  //       .connect(client)
  //       .initiateDeposit(
  //         amount,
  //         currencyCode,
  //         conversionRate,
  //         paymentMethod,
  //         clientName,
  //         clientPhone
  //       );
  //     const _request = await sargoEscrow.getTransactionById(1);
  //     const _totalAmount = amount.add(agentFee).add(treasuryFee);
  //     const _txFees = agentFee.add(treasuryFee);
  //     const _netAmount = _totalAmount.sub(_txFees);

  //     expect(_request.id).to.equal(1);
  //     expect(_request.refNumber).to.not.be.empty;
  //     expect(await sargoToken.balanceOf(_request.agentAccount)).to.equal(0);
  //     expect(_request.agentFee).to.equal(agentFee);
  //     expect(_request.treasuryFee).to.equal(treasuryFee);
  //     expect(_request.totalAmount).to.equal(_totalAmount);
  //     expect(_request.netAmount).to.equal(_netAmount);
  //     expect(_request.txType).to.equal(0);
  //     expect(_request.status).to.equal(0);
  //     expect(_request.agentApproved).to.equal(false);
  //     expect(_request.clientApproved).to.equal(false);
  //     expect(await sargoEscrow.nextTxId()).to.equal(2);
  //   });

  //   it("Should emit deposit request initiated event", async function () {
  //     const {
  //       sargoEscrow,
  //       client,
  //       amount,
  //       currencyCode,
  //       conversionRate,
  //       paymentMethod,
  //       clientName,
  //       clientPhone,
  //     } = await loadFixture(deployEscrowFixture);

  //     const depositRequest = await sargoEscrow
  //       .connect(client)
  //       .initiateDeposit(
  //         amount,
  //         currencyCode,
  //         conversionRate,
  //         paymentMethod,
  //         clientName,
  //         clientPhone
  //       );

  //     const _request = await sargoEscrow.getTransactionById(1);

  //     await expect(depositRequest)
  //       .to.emit(sargoEscrow, "TransactionInitiated")
  //       .withArgs(_request.id, _request.timestamp, _request);
  //   });

  //   it("Should get a deposit request transaction by id", async () => {
  //     const {
  //       sargoEscrow,
  //       client,
  //       agent,
  //       amount,
  //       currencyCode,
  //       conversionRate,
  //       paymentMethod,
  //       clientName,
  //       clientPhone,
  //     } = await loadFixture(deployEscrowFixture);

  //     const depositRequest = await sargoEscrow
  //       .connect(client)
  //       .initiateDeposit(
  //         amount,
  //         currencyCode,
  //         conversionRate,
  //         paymentMethod,
  //         clientName,
  //         clientPhone
  //       );

  //     const _requested = await sargoEscrow.getTransactionById(1);

  //     expect(_requested.id).to.equal(1);
  //     expect(_requested.clientAccount).to.equal(client.address);
  //     expect(_requested.txType).to.equal(0);
  //     expect(_requested.status).to.equal(0);
  //     expect(_requested.agentApproved).to.equal(false);
  //     expect(_requested.clientApproved).to.equal(false);
  //   });

  //   it("Should allow an agent to Accept deposit pair with client for deposit request", async () => {
  //     const {
  //       sargoEscrow,
  //       sargoToken,
  //       agent,
  //       client,
  //       amount,
  //       currencyCode,
  //       conversionRate,
  //       acceptedConversionRate,
  //       agentName,
  //       agentPhone,
  //       agentFee,
  //       treasuryFee,
  //       fundAmount,
  //       paymentMethod,
  //       clientName,
  //       clientPhone,
  //     } = await loadFixture(deployEscrowFixture);

  //     const depositRequest = await sargoEscrow
  //       .connect(client)
  //       .initiateDeposit(
  //         amount,
  //         currencyCode,
  //         conversionRate,
  //         paymentMethod,
  //         clientName,
  //         clientPhone
  //       );
  //     const _request = await sargoEscrow.getTransactionById(1);

  //     const _totalAmount = amount.add(agentFee).add(treasuryFee);
  //     const _txFees = agentFee.add(treasuryFee);
  //     const _netAmount = _totalAmount.sub(_txFees);

  //     await sargoToken.transfer(agent.address, fundAmount);
  //     expect(await sargoToken.balanceOf(agent.address)).to.equal(fundAmount);

  //     await sargoToken.connect(agent).approve(sargoEscrow.address, fundAmount);
  //     const acceptDeposit = await sargoEscrow
  //       .connect(agent)
  //       .acceptDeposit(
  //         _request.id,
  //         agentName,
  //         agentPhone,
  //         acceptedConversionRate
  //       );
  //     const _accepted = await sargoEscrow.getTransactionById(_request.id);
  //     expect(_accepted.id).to.equal(1);
  //     expect(_accepted.agentAccount).to.equal(agent.address);
  //     expect(_accepted.clientAccount).to.equal(client.address);
  //     expect(_accepted.conversionRate).to.equal(acceptedConversionRate);
  //     expect(_accepted.agentFee).to.equal(agentFee);
  //     expect(_accepted.treasuryFee).to.equal(treasuryFee);
  //     expect(_accepted.totalAmount).to.equal(_totalAmount);
  //     expect(_accepted.netAmount).to.equal(_netAmount);
  //     expect(_accepted.agentPhoneNumber).to.equal(agentPhone);
  //     expect(_accepted.txType).to.equal(0);
  //     expect(_accepted.status).to.equal(1);
  //     expect(_accepted.agentApproved).to.equal(false);
  //     expect(_accepted.clientApproved).to.equal(false);

  //     await expect(depositRequest)
  //       .to.emit(sargoEscrow, "TransactionInitiated")
  //       .withArgs(_request.id, _request.timestamp, _request);

  //     await expect(acceptDeposit)
  //       .to.emit(sargoEscrow, "RequestAccepted")
  //       .withArgs(_accepted.id, _accepted.timestamp, _accepted);
  //   });

  //   it("Should emit the Accept deposit request event", async () => {
  //     const {
  //       sargoEscrow,
  //       sargoToken,
  //       agent,
  //       client,
  //       amount,
  //       currencyCode,
  //       conversionRate,
  //       agentName,
  //       agentPhone,
  //       fundAmount,
  //       paymentMethod,
  //       clientName,
  //       clientPhone,
  //     } = await loadFixture(deployEscrowFixture);

  //     const depositRequest = await sargoEscrow
  //       .connect(client)
  //       .initiateDeposit(
  //         amount,
  //         currencyCode,
  //         conversionRate,
  //         paymentMethod,
  //         clientName,
  //         clientPhone
  //       );
  //     const _request = await sargoEscrow.getTransactionById(1);

  //     await sargoToken.transfer(agent.address, fundAmount);
  //     await sargoToken.connect(agent).approve(sargoEscrow.address, fundAmount);

  //     const acceptDeposit = await sargoEscrow
  //       .connect(agent)
  //       .acceptDeposit(_request.id, agentName, agentPhone, conversionRate);

  //     const _accepted = await sargoEscrow.getTransactionById(_request.id);

  //     await expect(depositRequest)
  //       .to.emit(sargoEscrow, "TransactionInitiated")
  //       .withArgs(_request.id, _request.timestamp, _request);

  //     await expect(depositRequest)
  //       .to.emit(sargoEscrow, "TransactionInitiated")
  //       .withArgs(_request.id, _request.timestamp, _request);

  //     await expect(acceptDeposit)
  //       .to.emit(sargoEscrow, "RequestAccepted")
  //       .withArgs(_accepted.id, _accepted.timestamp, _accepted);
  //   });

  //   it("Should allow the client and agent to confirm fiat payment received - Deposit request", async () => {
  //     const {
  //       sargoEscrow,
  //       sargoToken,
  //       agent,
  //       client,
  //       treasury,
  //       amount,
  //       currencyCode,
  //       conversionRate,
  //       agentName,
  //       agentPhone,
  //       agentFee,
  //       treasuryFee,
  //       fundAmount,
  //       paymentMethod,
  //       clientName,
  //       clientPhone,
  //     } = await loadFixture(deployEscrowFixture);

  //     const depositRequest = await sargoEscrow
  //       .connect(client)
  //       .initiateDeposit(
  //         amount,
  //         currencyCode,
  //         conversionRate,
  //         paymentMethod,
  //         clientName,
  //         clientPhone
  //       );
  //     const _request = await sargoEscrow.getTransactionById(1);

  //     await sargoToken.transfer(agent.address, fundAmount);
  //     await sargoToken.connect(agent).approve(sargoEscrow.address, fundAmount);

  //     const _clientBalance = await sargoToken.balanceOf(client.address);
  //     const _agentBalance = await sargoToken.balanceOf(agent.address);
  //     const _treasuryBalance = await sargoToken.balanceOf(treasury.address);
  //     const acceptDeposit = await sargoEscrow
  //       .connect(agent)
  //       .acceptDeposit(_request.id, agentName, agentPhone, conversionRate);
  //     const _accepted = await sargoEscrow.getTransactionById(_request.id);
  //     const _escrowBalance = await sargoToken.balanceOf(sargoEscrow.address);
  //     const clientConfirmed = await sargoEscrow
  //       .connect(client)
  //       .clientConfirmPayment(_accepted.id);
  //     const _clientConfirmed = await sargoEscrow.getTransactionById(
  //       _accepted.id
  //     );

  //     const agentConfirmed = await sargoEscrow
  //       .connect(agent)
  //       .agentConfirmPayment(_clientConfirmed.id);
  //     const _agentConfirmed = await sargoEscrow.getTransactionById(
  //       _clientConfirmed.id
  //     );

  //     /* Transaction should be completed when both client and agent confirm payments */

  //     const clientExpected = _clientBalance.add(amount);
  //     const agentExpected = _agentBalance
  //       .sub(amount)
  //       .sub(agentFee)
  //       .sub(treasuryFee)
  //       .add(agentFee);
  //     const treasuryExpected = _treasuryBalance.add(treasuryFee);

  //     const escrowExpected = _escrowBalance
  //       .sub(amount)
  //       .sub(agentFee)
  //       .sub(treasuryFee);

  //     expect(_agentConfirmed.id).to.equal(1);
  //     expect(_agentConfirmed.txType).to.equal(0);
  //     expect(_agentConfirmed.status).to.equal(3);
  //     expect(_agentConfirmed.agentApproved).to.equal(true);
  //     expect(_agentConfirmed.clientApproved).to.equal(true);

  //     expect(await sargoToken.balanceOf(client.address)).to.equal(
  //       clientExpected
  //     );
  //     expect(await sargoToken.balanceOf(agent.address)).to.equal(agentExpected);
  //     expect(await sargoToken.balanceOf(treasury.address)).to.equal(
  //       treasuryExpected
  //     );

  //     expect(await sargoToken.balanceOf(sargoEscrow.address)).to.equal(
  //       escrowExpected
  //     );

  //     const _earnings = await sargoEscrow.getEarnings(agent.address);
  //     expect(_earnings.totalEarned).to.equal(agentFee);

  //     await expect(clientConfirmed)
  //       .to.emit(sargoEscrow, "ClientConfirmed")
  //       .withArgs(
  //         _clientConfirmed.id,
  //         _clientConfirmed.timestamp,
  //         _clientConfirmed
  //       );

  //     /* await expect(agentConfirmed)
  //       .to.emit(sargoEscrow, "AgentConfirmed")
  //       .withArgs(_agentConfirmed.id, _agentConfirmed.timestamp, _agentConfirmed);

  //     await expect(agentConfirmed)
  //       .to.emit(sargoEscrow, "ConfirmationCompleted")
  //       .withArgs(_agentConfirmed.id, _agentConfirmed.timestamp, _agentConfirmed); */

  //     await expect(agentConfirmed)
  //       .to.emit(sargoEscrow, "TransactionCompleted")
  //       .withArgs(
  //         _agentConfirmed.id,
  //         _agentConfirmed.timestamp,
  //         _agentConfirmed
  //       );
  //   });

  //   it("Should allow the client to cancel a deposit request", async () => {
  //     const {
  //       sargoEscrow,
  //       agent,
  //       client,
  //       amount,
  //       currencyCode,
  //       conversionRate,
  //       fundAmount,
  //       paymentMethod,
  //       clientName,
  //       clientPhone,
  //     } = await loadFixture(deployEscrowFixture);

  //     const depositRequest = await sargoEscrow
  //       .connect(client)
  //       .initiateDeposit(
  //         amount,
  //         currencyCode,
  //         conversionRate,
  //         paymentMethod,
  //         clientName,
  //         clientPhone
  //       );
  //     const _request = await sargoEscrow.getTransactionById(1);
  //     const cancelRequest = await sargoEscrow
  //       .connect(client)
  //       .cancelTransaction(_request.id, "reason");
  //     const _cancelled = await sargoEscrow.getTransactionById(_request.id);

  //     expect(_cancelled.id).to.equal(1);
  //     expect(_cancelled.clientAccount).to.equal(client.address);
  //     expect(_cancelled.txType).to.equal(0);
  //     expect(_cancelled.status).to.equal(4);
  //     expect(_cancelled.agentApproved).to.equal(false);
  //     expect(_cancelled.clientApproved).to.equal(false);

  //     await expect(depositRequest)
  //       .to.emit(sargoEscrow, "TransactionInitiated")
  //       .withArgs(_request.id, _request.timestamp, _request);

  //     await expect(cancelRequest)
  //       .to.emit(sargoEscrow, "TransactionCancelled")
  //       .withArgs(_cancelled.id, _cancelled.timestamp, _cancelled, "reason");
  //   });

  //   it("Should emit a deposit request cancelled event", async function () {
  //     const {
  //       sargoEscrow,
  //       client,
  //       amount,
  //       currencyCode,
  //       conversionRate,
  //       paymentMethod,
  //       clientName,
  //       clientPhone,
  //     } = await loadFixture(deployEscrowFixture);

  //     const depositRequest = await sargoEscrow
  //       .connect(client)
  //       .initiateDeposit(
  //         amount,
  //         currencyCode,
  //         conversionRate,
  //         paymentMethod,
  //         clientName,
  //         clientPhone
  //       );
  //     const _request = await sargoEscrow.getTransactionById(1);

  //     const cancelRequest = await sargoEscrow
  //       .connect(client)
  //       .cancelTransaction(_request.id, "reason");
  //     const _cancelled = await sargoEscrow.getTransactionById(_request.id);

  //     await expect(depositRequest)
  //       .to.emit(sargoEscrow, "TransactionInitiated")
  //       .withArgs(_request.id, _request.timestamp, _request);

  //     await expect(cancelRequest)
  //       .to.emit(sargoEscrow, "TransactionCancelled")
  //       .withArgs(_cancelled.id, _cancelled.timestamp, _cancelled, "reason");
  //   });

  //   it("Should allow for a deposit transaction to be flagged as disputed", async () => {
  //     const {
  //       sargoEscrow,
  //       sargoToken,
  //       agent,
  //       client,
  //       amount,
  //       currencyCode,
  //       conversionRate,
  //       fundAmount,
  //       paymentMethod,
  //       clientName,
  //       clientPhone,
  //       agentName,
  //       agentPhone,
  //     } = await loadFixture(deployEscrowFixture);

  //     const depositRequest = await sargoEscrow
  //       .connect(client)
  //       .initiateDeposit(
  //         amount,
  //         currencyCode,
  //         conversionRate,
  //         paymentMethod,
  //         clientName,
  //         clientPhone
  //       );
  //     const _request = await sargoEscrow.getTransactionById(1);

  //     await sargoToken.transfer(agent.address, fundAmount);
  //     await sargoToken.connect(agent).approve(sargoEscrow.address, fundAmount);
  //     const acceptDeposit = await sargoEscrow
  //       .connect(agent)
  //       .acceptDeposit(_request.id, agentName, agentPhone, conversionRate);
  //     const _accepted = await sargoEscrow.getTransactionById(_request.id);

  //     const disputedTx = await sargoEscrow
  //       .connect(client)
  //       .disputeTransaction(_accepted.id, "reason");
  //     const _cancelled = await sargoEscrow.getTransactionById(_accepted.id);

  //     expect(_cancelled.id).to.equal(1);
  //     expect(_cancelled.clientAccount).to.equal(client.address);
  //     expect(_cancelled.txType).to.equal(0);
  //     expect(_cancelled.status).to.equal(5);
  //     expect(_cancelled.agentAccount).to.equal(agent.address);
  //     expect(_cancelled.agentName).to.equal(agentName);
  //     expect(_cancelled.agentPhoneNumber).to.equal(agentPhone);

  //     await expect(depositRequest)
  //       .to.emit(sargoEscrow, "TransactionInitiated")
  //       .withArgs(_request.id, _request.timestamp, _request);

  //     await expect(disputedTx)
  //       .to.emit(sargoEscrow, "TransactionDisputed")
  //       .withArgs(_cancelled.id, _cancelled.timestamp, _cancelled, "reason");
  //   });

  //   it("Should emit a disputed deposit transaction event", async function () {
  //     const {
  //       sargoEscrow,
  //       sargoToken,
  //       agent,
  //       client,
  //       amount,
  //       currencyCode,
  //       conversionRate,
  //       fundAmount,
  //       paymentMethod,
  //       clientName,
  //       clientPhone,
  //       agentName,
  //       agentPhone,
  //     } = await loadFixture(deployEscrowFixture);

  //     const depositRequest = await sargoEscrow
  //       .connect(client)
  //       .initiateDeposit(
  //         amount,
  //         currencyCode,
  //         conversionRate,
  //         paymentMethod,
  //         clientName,
  //         clientPhone
  //       );
  //     const _request = await sargoEscrow.getTransactionById(1);

  //     await sargoToken.transfer(agent.address, fundAmount);
  //     await sargoToken.connect(agent).approve(sargoEscrow.address, fundAmount);
  //     const acceptDeposit = await sargoEscrow
  //       .connect(agent)
  //       .acceptDeposit(_request.id, agentName, agentPhone, conversionRate);
  //     const _accepted = await sargoEscrow.getTransactionById(_request.id);

  //     const disputedTx = await sargoEscrow
  //       .connect(client)
  //       .disputeTransaction(_accepted.id, "reason");
  //     const _cancelled = await sargoEscrow.getTransactionById(_accepted.id);

  //     await expect(depositRequest)
  //       .to.emit(sargoEscrow, "TransactionInitiated")
  //       .withArgs(_request.id, _request.timestamp, _request);

  //     await expect(disputedTx)
  //       .to.emit(sargoEscrow, "TransactionDisputed")
  //       .withArgs(_cancelled.id, _cancelled.timestamp, _cancelled, "reason");
  //   });
  // });

  // describe("Withdraw Transactions", function () {
  //   it("Should initiate a withdrawal request", async () => {
  //     const {
  //       sargoEscrow,
  //       sargoToken,
  //       client,
  //       agent,
  //       amount,
  //       currencyCode,
  //       conversionRate,
  //       agentFee,
  //       treasuryFee,
  //       paymentMethod,
  //       agentName,
  //       agentPhone,
  //     } = await loadFixture(deployEscrowFixture);

  //     const withdrawRequest = await sargoEscrow
  //       .connect(agent)
  //       .initiateWithdrawal(
  //         amount,
  //         currencyCode,
  //         conversionRate,
  //         paymentMethod,
  //         agentName,
  //         agentPhone
  //       );
  //     const _request = await sargoEscrow.getTransactionById(1);
  //     const _totalAmount = amount.add(agentFee).add(treasuryFee);
  //     const _txFees = agentFee.add(treasuryFee);
  //     const _netAmount = _totalAmount.sub(_txFees);

  //     expect(_request.id).to.equal(1);
  //     expect(_request.refNumber).to.not.be.empty;
  //     expect(await sargoToken.balanceOf(_request.agentAccount)).to.equal(0);
  //     expect(_request.agentFee).to.equal(agentFee);
  //     expect(_request.treasuryFee).to.equal(treasuryFee);
  //     expect(_request.totalAmount).to.equal(_totalAmount);
  //     expect(_request.netAmount).to.equal(_netAmount);
  //     expect(_request.txType).to.equal(1);
  //     expect(_request.status).to.equal(0);
  //     expect(_request.agentApproved).to.equal(false);
  //     expect(_request.clientApproved).to.equal(false);
  //     expect(await sargoEscrow.nextTxId()).to.equal(2);

  //     await expect(withdrawRequest)
  //       .to.emit(sargoEscrow, "TransactionInitiated")
  //       .withArgs(_request.id, _request.timestamp, _request);
  //   });

  //   it("Should emit withdraw request initiated event", async function () {
  //     const {
  //       sargoEscrow,
  //       client,
  //       agent,
  //       amount,
  //       currencyCode,
  //       conversionRate,
  //       paymentMethod,
  //       agentName,
  //       agentPhone,
  //     } = await loadFixture(deployEscrowFixture);
  //     const withdrawRequest = await sargoEscrow
  //       .connect(agent)
  //       .initiateWithdrawal(
  //         amount,
  //         currencyCode,
  //         conversionRate,
  //         paymentMethod,
  //         agentName,
  //         agentPhone
  //       );
  //     const _request = await sargoEscrow.getTransactionById(1);

  //     await expect(withdrawRequest)
  //       .to.emit(sargoEscrow, "TransactionInitiated")
  //       .withArgs(_request.id, _request.timestamp, _request);
  //   });

  //   it("Should get a withdraw request transaction by id", async () => {
  //     const {
  //       sargoEscrow,
  //       client,
  //       agent,
  //       amount,
  //       currencyCode,
  //       conversionRate,
  //       paymentMethod,
  //       agentName,
  //       agentPhone,
  //     } = await loadFixture(deployEscrowFixture);

  //     const withdrawRequest = await sargoEscrow
  //       .connect(agent)
  //       .initiateWithdrawal(
  //         amount,
  //         currencyCode,
  //         conversionRate,
  //         paymentMethod,
  //         agentName,
  //         agentPhone
  //       );

  //     const _requested = await sargoEscrow.getTransactionById(1);

  //     expect(_requested.id).to.equal(1);
  //     expect(_requested.agentAccount).to.equal(agent.address);
  //     expect(_requested.txType).to.equal(1);
  //     expect(_requested.status).to.equal(0);
  //     expect(_requested.agentApproved).to.equal(false);
  //     expect(_requested.clientApproved).to.equal(false);
  //   });

  //   it("Should allow a client to accept withdrwal pair with the agent for a withdraw request", async () => {
  //     const {
  //       sargoEscrow,
  //       sargoToken,
  //       agent,
  //       client,
  //       amount,
  //       currencyCode,
  //       conversionRate,
  //       acceptedConversionRate,
  //       agentName,
  //       agentPhone,
  //       agentFee,
  //       treasuryFee,
  //       fundAmount,
  //       paymentMethod,
  //       clientName,
  //       clientPhone,
  //     } = await loadFixture(deployEscrowFixture);

  //     const withdrawRequest = await sargoEscrow
  //       .connect(agent)
  //       .initiateWithdrawal(
  //         amount,
  //         currencyCode,
  //         conversionRate,
  //         paymentMethod,
  //         agentName,
  //         agentPhone
  //       );
  //     const _request = await sargoEscrow.getTransactionById(1);

  //     const _totalAmount = amount.add(agentFee).add(treasuryFee);
  //     const _txFees = agentFee.add(treasuryFee);
  //     const _netAmount = _totalAmount.sub(_txFees);

  //     await sargoToken.transfer(agent.address, fundAmount);
  //     expect(await sargoToken.balanceOf(agent.address)).to.equal(fundAmount);
  //     await sargoToken.connect(agent).approve(sargoEscrow.address, fundAmount);

  //     const withdrawAccepted = await sargoEscrow
  //       .connect(client)
  //       .acceptWithdrawal(
  //         _request.id,
  //         clientName,
  //         clientPhone,
  //         acceptedConversionRate
  //       );
  //     const _accepted = await sargoEscrow.getTransactionById(_request.id);

  //     expect(_accepted.id).to.equal(1);
  //     expect(_accepted.agentAccount).to.equal(agent.address);
  //     expect(_accepted.clientAccount).to.equal(client.address);
  //     expect(_accepted.conversionRate).to.equal(acceptedConversionRate);
  //     expect(_accepted.agentFee).to.equal(agentFee);
  //     expect(_accepted.treasuryFee).to.equal(treasuryFee);
  //     expect(_accepted.totalAmount).to.equal(_totalAmount);
  //     expect(_accepted.netAmount).to.equal(_netAmount);
  //     expect(_accepted.txType).to.equal(1);
  //     expect(_accepted.status).to.equal(1);
  //     expect(_accepted.agentApproved).to.equal(false);
  //     expect(_accepted.clientApproved).to.equal(false);
  //     expect(_accepted.agentPhoneNumber).to.equal(agentPhone);

  //     await expect(withdrawRequest)
  //       .to.emit(sargoEscrow, "TransactionInitiated")
  //       .withArgs(_request.id, _request.timestamp, _request);

  //     await expect(withdrawAccepted)
  //       .to.emit(sargoEscrow, "RequestAccepted")
  //       .withArgs(_accepted.id, _accepted.timestamp, _accepted);
  //   });

  //   it("Should emit the Accept withdrwal request event", async () => {
  //     const {
  //       sargoEscrow,
  //       sargoToken,
  //       agent,
  //       client,
  //       amount,
  //       currencyCode,
  //       conversionRate,
  //       agentName,
  //       agentPhone,
  //       fundAmount,
  //       paymentMethod,
  //       clientName,
  //       clientPhone,
  //     } = await loadFixture(deployEscrowFixture);

  //     const withdrawRequest = await sargoEscrow
  //       .connect(agent)
  //       .initiateWithdrawal(
  //         amount,
  //         currencyCode,
  //         conversionRate,
  //         paymentMethod,
  //         agentName,
  //         agentPhone
  //       );
  //     const _request = await sargoEscrow.getTransactionById(1);

  //     await sargoToken.transfer(agent.address, fundAmount);
  //     await sargoToken.connect(agent).approve(sargoEscrow.address, fundAmount);

  //     const withdrawAccepted = await sargoEscrow
  //       .connect(client)
  //       .acceptWithdrawal(_request.id, clientName, clientPhone, conversionRate);

  //     const _accepted = await sargoEscrow.getTransactionById(_request.id);

  //     await expect(withdrawRequest)
  //       .to.emit(sargoEscrow, "TransactionInitiated")
  //       .withArgs(_request.id, _request.timestamp, _request);

  //     await expect(withdrawAccepted)
  //       .to.emit(sargoEscrow, "RequestAccepted")
  //       .withArgs(_accepted.id, _accepted.timestamp, _accepted);
  //   });

  //   it("Should allow the client and agent confirm fiat payment received - withdraw transaction", async () => {
  //     const {
  //       sargoEscrow,
  //       sargoToken,
  //       client,
  //       agent,
  //       treasury,
  //       amount,
  //       currencyCode,
  //       conversionRate,
  //       agentName,
  //       agentPhone,
  //       agentFee,
  //       treasuryFee,
  //       fundAmount,
  //       paymentMethod,
  //       clientName,
  //       clientPhone,
  //     } = await loadFixture(deployEscrowFixture);

  //     const withdrawRequest = await sargoEscrow
  //       .connect(agent)
  //       .initiateWithdrawal(
  //         amount,
  //         currencyCode,
  //         conversionRate,
  //         paymentMethod,
  //         agentName,
  //         agentPhone
  //       );
  //     const _request = await sargoEscrow.getTransactionById(1);

  //     await sargoToken.transfer(agent.address, fundAmount);
  //     await sargoToken.connect(agent).approve(sargoEscrow.address, fundAmount);

  //     const _clientBalance = await sargoToken.balanceOf(client.address);
  //     const _agentBalance = await sargoToken.balanceOf(agent.address);
  //     const _treasuryBalance = await sargoToken.balanceOf(treasury.address);

  //     const withdrawAccepted = await sargoEscrow
  //       .connect(client)
  //       .acceptWithdrawal(_request.id, clientName, clientPhone, conversionRate);

  //     const _accepted = await sargoEscrow.getTransactionById(_request.id);
  //     const _escrowBalance = await sargoToken.balanceOf(sargoEscrow.address);
  //     const clientConfirmed = await sargoEscrow
  //       .connect(client)
  //       .clientConfirmPayment(_accepted.id);
  //     const _clientConfirmed = await sargoEscrow.getTransactionById(
  //       _accepted.id
  //     );

  //     const agentConfirmed = await sargoEscrow
  //       .connect(agent)
  //       .agentConfirmPayment(_clientConfirmed.id);
  //     const _agentConfirmed = await sargoEscrow.getTransactionById(
  //       _clientConfirmed.id
  //     );

  //     /* Transaction should be completed when both client and agent confirm payments */

  //     const agentExpected = _agentBalance
  //       .sub(amount)
  //       .sub(agentFee)
  //       .sub(treasuryFee);

  //     const clientExpected = _clientBalance.add(amount).add(agentFee);
  //     const treasuryExpected = _treasuryBalance.add(treasuryFee);

  //     const escrowExpected = _escrowBalance
  //       .sub(amount)
  //       .sub(agentFee)
  //       .sub(treasuryFee);

  //     expect(_agentConfirmed.id).to.equal(1);
  //     expect(_agentConfirmed.txType).to.equal(1);
  //     expect(_agentConfirmed.status).to.equal(3);
  //     expect(_agentConfirmed.agentApproved).to.equal(true);
  //     expect(_agentConfirmed.clientApproved).to.equal(true);
  //     expect(await sargoToken.balanceOf(client.address)).to.equal(
  //       clientExpected
  //     );
  //     expect(await sargoToken.balanceOf(agent.address)).to.equal(agentExpected);
  //     expect(await sargoToken.balanceOf(treasury.address)).to.equal(
  //       treasuryExpected
  //     );
  //     expect(await sargoToken.balanceOf(sargoEscrow.address)).to.equal(
  //       escrowExpected
  //     );

  //     //count
  //     const _earnings = await sargoEscrow.getEarnings(client.address);
  //     expect(_earnings.totalEarned).to.equal(agentFee);

  //     await expect(clientConfirmed)
  //       .to.emit(sargoEscrow, "ClientConfirmed")
  //       .withArgs(
  //         _clientConfirmed.id,
  //         _clientConfirmed.timestamp,
  //         _clientConfirmed
  //       );

  //     /* await expect(agentConfirmed)
  //       .to.emit(sargoEscrow, "AgentConfirmed")
  //       .withArgs(_agentConfirmed.id, _agentConfirmed.timestamp, _agentConfirmed);

  //     await expect(agentConfirmed)
  //       .to.emit(sargoEscrow, "ConfirmationCompleted")
  //       .withArgs(_agentConfirmed.id, _agentConfirmed.timestamp, _agentConfirmed); */

  //     await expect(agentConfirmed)
  //       .to.emit(sargoEscrow, "TransactionCompleted")
  //       .withArgs(
  //         _agentConfirmed.id,
  //         _agentConfirmed.timestamp,
  //         _agentConfirmed
  //       );
  //   });

  //   it("Should allow the agent to cancel a withdraw request", async () => {
  //     const {
  //       sargoEscrow,
  //       agent,
  //       client,
  //       amount,
  //       currencyCode,
  //       conversionRate,
  //       fundAmount,
  //       paymentMethod,
  //       agentName,
  //       agentPhone,
  //     } = await loadFixture(deployEscrowFixture);

  //     const withdrawRequest = await sargoEscrow
  //       .connect(agent)
  //       .initiateWithdrawal(
  //         amount,
  //         currencyCode,
  //         conversionRate,
  //         paymentMethod,
  //         agentName,
  //         agentPhone
  //       );
  //     const _request = await sargoEscrow.getTransactionById(1);

  //     const cancelRequest = await sargoEscrow
  //       .connect(agent)
  //       .cancelTransaction(_request.id, "reason");
  //     const _cancelled = await sargoEscrow.getTransactionById(_request.id);

  //     expect(_cancelled.id).to.equal(1);
  //     expect(_cancelled.agentAccount).to.equal(agent.address);
  //     expect(_cancelled.txType).to.equal(1);
  //     expect(_cancelled.status).to.equal(4);
  //     expect(_cancelled.agentApproved).to.equal(false);
  //     expect(_cancelled.clientApproved).to.equal(false);

  //     await expect(withdrawRequest)
  //       .to.emit(sargoEscrow, "TransactionInitiated")
  //       .withArgs(_request.id, _request.timestamp, _request);

  //     await expect(cancelRequest)
  //       .to.emit(sargoEscrow, "TransactionCancelled")
  //       .withArgs(_cancelled.id, _cancelled.timestamp, _cancelled, "reason");
  //   });

  //   it("Should emit a withdraw request cancelled event", async function () {
  //     const {
  //       sargoEscrow,
  //       client,
  //       agent,
  //       amount,
  //       currencyCode,
  //       conversionRate,
  //       paymentMethod,
  //       agentName,
  //       agentPhone,
  //     } = await loadFixture(deployEscrowFixture);

  //     const withdrawRequest = await sargoEscrow
  //       .connect(agent)
  //       .initiateWithdrawal(
  //         amount,
  //         currencyCode,
  //         conversionRate,
  //         paymentMethod,
  //         agentName,
  //         agentPhone
  //       );
  //     const _request = await sargoEscrow.getTransactionById(1);

  //     const cancelRequest = await sargoEscrow
  //       .connect(agent)
  //       .cancelTransaction(_request.id, "reason");
  //     const _cancelled = await sargoEscrow.getTransactionById(_request.id);

  //     await expect(withdrawRequest)
  //       .to.emit(sargoEscrow, "TransactionInitiated")
  //       .withArgs(_request.id, _request.timestamp, _request);

  //     await expect(cancelRequest)
  //       .to.emit(sargoEscrow, "TransactionCancelled")
  //       .withArgs(_cancelled.id, _cancelled.timestamp, _cancelled, "reason");
  //   });

  //   it("Should allow for a withdraw transaction to be flagged as disputed", async () => {
  //     const {
  //       sargoEscrow,
  //       sargoToken,
  //       agent,
  //       client,
  //       amount,
  //       currencyCode,
  //       conversionRate,
  //       fundAmount,
  //       paymentMethod,
  //       clientName,
  //       clientPhone,
  //       agentName,
  //       agentPhone,
  //     } = await loadFixture(deployEscrowFixture);

  //     const withdrawRequest = await sargoEscrow
  //       .connect(agent)
  //       .initiateWithdrawal(
  //         amount,
  //         currencyCode,
  //         conversionRate,
  //         paymentMethod,
  //         agentName,
  //         agentPhone
  //       );
  //     const _request = await sargoEscrow.getTransactionById(1);

  //     await sargoToken.transfer(agent.address, fundAmount);
  //     await sargoToken.connect(agent).approve(sargoEscrow.address, fundAmount);
  //     const withdrawAccepted = await sargoEscrow
  //       .connect(client)
  //       .acceptWithdrawal(_request.id, clientName, clientPhone, conversionRate);

  //     const _accepted = await sargoEscrow.getTransactionById(_request.id);
  //     const disputedTx = await sargoEscrow
  //       .connect(agent)
  //       .disputeTransaction(_accepted.id, "reason");
  //     const _cancelled = await sargoEscrow.getTransactionById(_accepted.id);

  //     expect(_cancelled.id).to.equal(1);
  //     expect(_cancelled.agentAccount).to.equal(agent.address);
  //     expect(_cancelled.txType).to.equal(1);
  //     expect(_cancelled.status).to.equal(5);
  //     expect(_cancelled.clientAccount).to.equal(client.address);
  //     expect(_cancelled.clientName).to.equal(clientName);
  //     expect(_cancelled.clientPhoneNumber).to.equal(clientPhone);

  //     await expect(withdrawRequest)
  //       .to.emit(sargoEscrow, "TransactionInitiated")
  //       .withArgs(_request.id, _request.timestamp, _request);

  //     await expect(disputedTx)
  //       .to.emit(sargoEscrow, "TransactionDisputed")
  //       .withArgs(_cancelled.id, _cancelled.timestamp, _cancelled, "reason");
  //   });

  //   it("Should emit a disputed withdraw transaction event", async function () {
  //     const {
  //       sargoEscrow,
  //       sargoToken,
  //       client,
  //       agent,
  //       amount,
  //       currencyCode,
  //       conversionRate,
  //       fundAmount,
  //       paymentMethod,
  //       clientName,
  //       clientPhone,
  //       agentName,
  //       agentPhone,
  //     } = await loadFixture(deployEscrowFixture);

  //     const withdrawRequest = await sargoEscrow
  //       .connect(agent)
  //       .initiateWithdrawal(
  //         amount,
  //         currencyCode,
  //         conversionRate,
  //         paymentMethod,
  //         agentName,
  //         agentPhone
  //       );
  //     const _request = await sargoEscrow.getTransactionById(1);

  //     await sargoToken.transfer(agent.address, fundAmount);
  //     await sargoToken.connect(agent).approve(sargoEscrow.address, fundAmount);
  //     const withdrawAccepted = await sargoEscrow
  //       .connect(client)
  //       .acceptWithdrawal(_request.id, clientName, clientPhone, conversionRate);

  //     const _accepted = await sargoEscrow.getTransactionById(_request.id);
  //     const disputedTx = await sargoEscrow
  //       .connect(agent)
  //       .disputeTransaction(_accepted.id, "reason");
  //     const _cancelled = await sargoEscrow.getTransactionById(_accepted.id);

  //     await expect(withdrawRequest)
  //       .to.emit(sargoEscrow, "TransactionInitiated")
  //       .withArgs(_request.id, _request.timestamp, _request);

  //     await expect(disputedTx)
  //       .to.emit(sargoEscrow, "TransactionDisputed")
  //       .withArgs(_cancelled.id, _cancelled.timestamp, _cancelled, "reason");
  //   });
  // });

  // describe("Send and transfer transactions", function () {
  //   it("Should send value from one address to provided address", async () => {
  //     const { sargoEscrow, sargoToken, agent, client, amount, fundAmount } =
  //       await loadFixture(deployEscrowFixture);

  //     await sargoToken.transfer(agent.address, fundAmount);
  //     await sargoToken.connect(agent).approve(sargoEscrow.address, fundAmount);

  //     const _senderBalance = await sargoToken.balanceOf(agent.address);
  //     const _recipientBalance = await sargoToken.balanceOf(client.address);
  //     const sendAmount = await sargoEscrow
  //       .connect(agent)
  //       .send(client.address, amount);

  //     const _sent = await sargoEscrow.getTransactionById(1);

  //     expect(_sent.txType).to.equal(2);
  //     expect(await sargoToken.balanceOf(agent.address)).to.equal(
  //       _senderBalance.sub(amount)
  //     );
  //     expect(await sargoToken.balanceOf(client.address)).to.equal(
  //       _recipientBalance.add(amount)
  //     );

  //     expect(_sent.clientAccount).to.equal(client.address);
  //     expect(_sent.agentAccount).to.equal(agent.address);
  //     expect(_sent.netAmount).to.equal(amount);
  //     expect(_sent.paymentMethod).to.equal("TOKEN");

  //     await expect(sendAmount)
  //       .to.emit(sargoEscrow, "Transfer")
  //       .withArgs(_sent.id, _sent.timestamp, _sent);
  //   });

  //   it("Should transfer value from the escrow address to provided address", async () => {
  //     const { sargoEscrow, sargoToken, owner, client, amount, fundAmount } =
  //       await loadFixture(deployEscrowFixture);
  //     /* Update escrow's balance to allow transfer transaction */
  //     await sargoToken.transfer(sargoEscrow.address, fundAmount);
  //     await sargoToken.connect(owner).approve(sargoEscrow.address, fundAmount);

  //     const _addressBalance = await sargoToken.balanceOf(sargoEscrow.address);
  //     const _recipientBalance = await sargoToken.balanceOf(client.address);

  //     const sendAmount = await sargoEscrow
  //       .connect(owner)
  //       .credit(client.address, amount);

  //     const _sent = await sargoEscrow.getTransactionById(1);

  //     expect(_sent.txType).to.equal(2);
  //     expect(await sargoToken.balanceOf(sargoEscrow.address)).to.equal(
  //       _addressBalance.sub(amount)
  //     );
  //     expect(await sargoToken.balanceOf(client.address)).to.equal(
  //       _recipientBalance.add(amount)
  //     );
  //     expect(_sent.clientAccount).to.equal(client.address);
  //     expect(_sent.agentAccount).to.equal(owner.address);
  //     expect(_sent.netAmount).to.equal(amount);
  //     expect(_sent.paymentMethod).to.equal("TOKEN");

  //     await expect(sendAmount)
  //       .to.emit(sargoEscrow, "Transfer")
  //       .withArgs(_sent.id, _sent.timestamp, _sent);
  //   });

  //   it("Should emit a transfer event when send function is called", async function () {
  //     const { sargoEscrow, sargoToken, agent, client, amount, fundAmount } =
  //       await loadFixture(deployEscrowFixture);

  //     await sargoToken.transfer(agent.address, fundAmount);
  //     await sargoToken.connect(agent).approve(sargoEscrow.address, fundAmount);

  //     const sendAmount = await sargoEscrow
  //       .connect(agent)
  //       .send(client.address, amount);

  //     const _sent = await sargoEscrow.getTransactionById(1);

  //     await expect(sendAmount)
  //       .to.emit(sargoEscrow, "Transfer")
  //       .withArgs(_sent.id, _sent.timestamp, _sent);
  //   });

  //   it("Should emit a transfer event when transfer function is called", async function () {
  //     const { sargoEscrow, sargoToken, owner, client, amount, fundAmount } =
  //       await loadFixture(deployEscrowFixture);

  //     await sargoToken.transfer(sargoEscrow.address, fundAmount);
  //     await sargoToken.connect(owner).approve(sargoEscrow.address, fundAmount);

  //     const sendAmount = await sargoEscrow
  //       .connect(owner)
  //       .credit(client.address, amount);

  //     const _sent = await sargoEscrow.getTransactionById(1);

  //     await expect(sendAmount)
  //       .to.emit(sargoEscrow, "Transfer")
  //       .withArgs(_sent.id, _sent.timestamp, _sent);
  //   });

  //   it("Should emit a transfer event when transfer function is called", async function () {
  //     const {
  //       sargoEscrow,
  //       sargoToken,
  //       owner,
  //       client,
  //       amount,
  //       currencyCode,
  //       conversionRate,
  //       fundAmount,
  //     } = await loadFixture(deployEscrowFixture);

  //     await sargoToken.transfer(sargoEscrow.address, fundAmount);
  //     await sargoToken.connect(owner).approve(sargoEscrow.address, fundAmount);

  //     const sendAmount = await sargoEscrow
  //       .connect(owner)
  //       .credit(client.address, amount);

  //     const _sent = await sargoEscrow.getTransactionById(1);

  //     await expect(sendAmount)
  //       .to.emit(sargoEscrow, "Transfer")
  //       .withArgs(_sent.id, _sent.timestamp, _sent);
  //   });
  // });

  // describe("Utility transactions", function () {
  //   it("Should get the estimated gas price", async () => {});

  //   it("Should get all transactions", async () => {
  //     //TODO: Implement
  //   });

  //   it("Should get all commissions", async () => {
  //     //TODO: Implement
  //   });
  // });
});

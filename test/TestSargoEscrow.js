const { expect } = require("chai");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { ethers } = require("hardhat");
const { BigNumber } = require("ethers");
require("dotenv").config();

describe("Sargo Token, Escrow contracts deployment", () => {
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
    const conversionRate = "132";
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
      await sargoEscrow
        .connect(client)
        .initiateDeposit(amount, currencyCode, conversionRate, paymentMethod);
      const txn = await sargoEscrow.getTransactionByIndex(0);
      const _totalAmount = amount.add(agentFee).add(treasuryFee);
      const _txFees = agentFee.add(treasuryFee);
      const _netAmount = _totalAmount.sub(_txFees);

      expect(txn.id).to.equal(0);
      expect(await sargoToken.balanceOf(txn.agentAccount)).to.equal(0);
      expect(txn.agentFee).to.equal(agentFee);
      expect(txn.treasuryFee).to.equal(treasuryFee);
      expect(txn.totalAmount).to.equal(_totalAmount);
      expect(txn.netAmount).to.equal(_netAmount);
      expect(txn.txType).to.equal(0);
      expect(txn.status).to.equal(0);
      expect(txn.agentApproved).to.equal(false);
      expect(txn.clientApproved).to.equal(false);
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

      /* Initiate deposit */
      const depositRequest = await sargoEscrow
        .connect(client)
        .initiateDeposit(amount, currencyCode, conversionRate, paymentMethod);
      const _request = await sargoEscrow.getTransactionByIndex(0);

      const _totalAmount = amount.add(agentFee).add(treasuryFee);
      const _txFees = agentFee.add(treasuryFee);
      const _netAmount = _totalAmount.sub(_txFees);

      /* Update agent's balance to allow agent to accept transaction */
      await sargoToken.transfer(agent.address, fundAmount);
      expect(await sargoToken.balanceOf(agent.address)).to.equal(fundAmount);

      /* Approve allowance and accept deposit */
      await sargoToken.connect(agent).approve(sargoEscrow.address, fundAmount);
      await sargoEscrow.connect(agent).acceptDeposit(_request.id, agentPhone);
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

      /* initiate deposit */
      await sargoEscrow
        .connect(client)
        .initiateDeposit(amount, currencyCode, conversionRate, paymentMethod);
      const _request = await sargoEscrow.getTransactionByIndex(0);

      /* Update agent's balance to allow agent to accept transaction */
      await sargoToken.transfer(agent.address, fundAmount);
      /* Approve allowance and accept deposit */
      await sargoToken.connect(agent).approve(sargoEscrow.address, fundAmount);

      /* Accept deposit */
      const acceptDeposit = await sargoEscrow
        .connect(agent)
        .acceptDeposit(_request.id, agentPhone);

      const _accepted = await sargoEscrow.getTransactionByIndex(_request.id);

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

      const _clientBalance = await sargoToken.balanceOf(client.address);
      const _agentBalance = await sargoToken.balanceOf(agent.address);
      const _treasuryBalance = await sargoToken.balanceOf(treasury.address);

      /* initiate deposit */
      const depositRequest = await sargoEscrow
        .connect(client)
        .initiateDeposit(amount, currencyCode, conversionRate, paymentMethod);
      const _request = await sargoEscrow.getTransactionByIndex(0);

      /* Update agent's balance to allow agent to accept transaction */
      await sargoToken.transfer(agent.address, fundAmount);
      /* Approve allowance and accept deposit */
      await sargoToken.connect(agent).approve(sargoEscrow.address, fundAmount);

      /* Accept deposit */
      const acceptDeposit = await sargoEscrow
        .connect(agent)
        .acceptDeposit(_request.id, agentPhone);
      const _accepted = await sargoEscrow.getTransactionByIndex(_request.id);

      /* Client confirms payment */
      const clientConfirmed = await sargoEscrow
        .connect(client)
        .clientConfirmPayment(_accepted.id);
      const _clientConfirmed = await sargoEscrow.getTransactionByIndex(
        _accepted.id
      );

      /* Client confirms payment */
      const agentConfirmed = await sargoEscrow
        .connect(agent)
        .agentConfirmPayment(_clientConfirmed.id);
      const _agentConfirmed = await sargoEscrow.getTransactionByIndex(
        _clientConfirmed.id
      );

      /* Transaction should be completed when both client and agent confirm payments */

      const clientExpected = _clientBalance.add(amount);
      const agentExpected = _agentBalance.sub(amount).add(agentFee);
      const treasuryExpected = _treasuryBalance.add(treasuryFee);

      expect(_agentConfirmed.id).to.equal(0);
      expect(_agentConfirmed.txType).to.equal(0);
      expect(_agentConfirmed.status).to.equal(3);
      expect(await sargoToken.balanceOf(client.address)).to.equal(
        clientExpected
      );
      expect(await sargoToken.balanceOf(agent.address)).to.equal(agentExpected);
      expect(await sargoToken.balanceOf(treasury.address)).to.equal(
        treasuryExpected
      );

      await expect(depositRequest)
        .to.emit(sargoEscrow, "TransactionInitiated")
        .withArgs(_request);

      await expect(acceptDeposit)
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

    /*
        it('Should allow the client to cancel a deposit request', async() => {
            const { sargoEscrow } = await loadFixture(deploySargoEscrowFixture);
        });
         */
  });

  describe("Withdraw Transactions", function () {
    /*  it("Should initiate a withdrawal request", async () => {
      const {
        sargoEscrow,
        sargoToken,
        client,
        amount,
        currencyCode,
        conversionRate,
        agentFee,
        treasuryFee,
        fundAmount,
      } = await loadFixture(deploySargoEscrowFixture);
      await sargoEscrow
        .connect(client)
        .initiateWithdrawal(amount, currencyCode, conversionRate);
      const txn = await sargoEscrow.getTransactionByIndex(0);
      expect(txn.id).to.equal(0);
      expect(await sargoToken.balanceOf(txn.agentAccount)).to.equal(0);
      expect(txn.agentFee).to.equal(agentFee);
      expect(txn.treasuryFee).to.equal(treasuryFee);
      expect(txn.totalAmount).to.equal(amount + agentFee + treasuryFee);
      expect(txn.netAmount).to.equal(txn.totalAmount - (agentFee + treasuryFee));
      expect(txn.txType).to.equal(1);
      expect(txn.status).to.equal(0);
      expect(txn.agentApproved).to.equal(false);
      expect(txn.clientApproved).to.equal(false);
    }); */
    /* it('Should emit withdraw request initiated event', async function() {
            const { sargoEscrow, sargoToken, client, amount, currencyCode, conversionRate, fundAmount } = await loadFixture(deploySargoEscrowFixture);
            await expect(sargoEscrow.connect(client).initiateWithdrawal(amount, currencyCode, conversionRate))
            .to.emit(sargoEscrow, "TransactionInitiated")
            .withArgs(0, client.address);
        }); */
    /* it("Should allow an agent to Accept withdrwal pair with the client for a withdraw request", async () => {
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
      } = await loadFixture(deploySargoEscrowFixture);
      await sargoEscrow
        .connect(client)
        .initiateWithdrawal(amount, currencyCode, conversionRate);
      const txn = await sargoEscrow.getTransactionByIndex(0);
      await sargoEscrow.connect(agent).acceptWithdrawal(txn.id, agentPhone);
      expect(txn.id).to.equal(0);
      expect(await sargoToken.balanceOf(txn.agentAccount)).to.equal(0);
      expect(txn.agentFee).to.equal(agentFee);
      expect(txn.treasuryFee).to.equal(treasuryFee);
      expect(txn.totalAmount).to.equal(amount + agentFee + treasuryFee);
      expect(txn.netAmount).to.equal(txn.totalAmount - (agentFee + treasuryFee));
      expect(txn.txType).to.equal(1);
      //expect(txn.status).to.equal(1);
      expect(txn.agentApproved).to.equal(false);
      expect(txn.clientApproved).to.equal(false);
      //expect(txn.agentPhoneNumber).to.equal(agentPhone);
    }); */
    /* it('Should emit the Accept withdrwal request event', async() => {
            const { sargoEscrow, sargoToken, agent, client, amount, currencyCode, conversionRate, agentPhone, fundAmount } = await loadFixture(deploySargoEscrowFixture);
            await sargoEscrow.connect(client).initiateWithdrawal(amount, currencyCode, conversionRate);
            const txn = await sargoEscrow.getTransactionByIndex(0);
            const acceptWithdraw = await sargoEscrow.connect(agent).acceptWithdrawal(txn.id, agentPhone);
            await expect(acceptWithdraw)
            .to.emit(sargoEscrow, "RequestAccepted")
            .withArgs(await sargoEscrow.getTransactionByIndex(txn.id));
        }); */
    /* it("Should allow the client and agent confirm fiat payment received - withdraw transaction", async () => {
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
      } = await loadFixture(deploySargoEscrowFixture);
      await sargoEscrow
        .connect(client)
        .initiateWithdrawal(amount, currencyCode, conversionRate);
      const txn = await sargoEscrow.getTransactionByIndex(0);
      await sargoEscrow.connect(agent).acceptWithdrawal(txn.id, agentPhone);
      await sargoEscrow.connect(client).clientConfirmPayment(txn.id);
      await sargoEscrow.connect(agent).agentConfirmPayment(txn.id);
      const txnRes = await sargoEscrow.getTransactionByIndex(txn.id);
      const clientBalance = await sargoToken.balanceOf(client.address);
      const agentBalance = await sargoToken.balanceOf(agent.address);
      const treasuryBalance = await sargoToken.balanceOf(treasury.address);
      const clientExpected = fundAmount + amount;
      const agentExpected = fundAmount - amount + agentFee;
      expect(txnRes.id).to.equal(0);
      expect(txnRes.txType).to.equal(1);
      expect(txnRes.status).to.equal(3);
      expect(clientBalance).to.equal(clientExpected);
      expect(agentBalance).to.equal(agentExpected);
      expect(treasuryBalance).to.equal(treasuryFee);

      //ClientConfirmed(txn)
      //AgentConfirmed(txn)
      //ConfirmationCompleted(txn)
    }); */
    /*
        it('Should allow the agent to cancel a withdraw request', async() => {
        const { sargoEscrow } = await loadFixture(deploySargoEscrowFixture);
        });
         */
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

      /* Update agent's balance to allow agent to send transaction */
      await sargoToken.transfer(agent.address, fundAmount);
      /* Approve allowance and accept deposit */
      await sargoToken.connect(agent).approve(sargoEscrow.address, fundAmount);

      const sendAmount = await sargoEscrow
        .connect(agent)
        .send(client.address, amount, currencyCode, conversionRate);

      const _sent = await sargoEscrow.getTransactionByIndex(0);

      expect(_sent.txType).to.equal(2);
      expect(_sent.clientAccount).to.equal(client.address);
      expect(_sent.agentAccount).to.equal(agent.address);
      expect(_sent.netAmount).to.equal(amount);
      expect(_sent.paymentMethod).to.equal("TOKEN");
    });

    it("Should transfer value from the escrow address", async () => {
      const { sargoEscrow } = await loadFixture(deploySargoEscrowFixture);
    });

    it("Should emit a transfer event", async function () {
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

      /* Update agent's balance to allow agent to send transaction */
      await sargoToken.transfer(agent.address, fundAmount);
      /* Approve allowance and accept deposit */
      await sargoToken.connect(agent).approve(sargoEscrow.address, fundAmount);

      const sendAmount = await sargoEscrow
        .connect(agent)
        .send(client.address, amount, currencyCode, conversionRate);

      const _sent = await sargoEscrow.getTransactionByIndex(0);

      await expect(sendAmount)
        .to.emit(sargoEscrow, "Transfer")
        .withArgs(_sent.agentAccount, _sent.clientAccount, _sent.netAmount);
    });
  });

  describe("Utility transactions", function () {
    it("Should get the estimated gas price", async () => {});
  });
});

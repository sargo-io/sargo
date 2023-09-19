const { expect } = require("chai");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { ethers, upgrades } = require("hardhat");
require("dotenv").config();

//TODO: test invalid cases
//TODO: test upgradeable

describe("==SARGO FEES TESTS ================================", () => {
  async function deployFeesFixture() {
    const [owner] = await ethers.getSigners();
    const ordersFeePerc = ethers.parseUnits(
      process.env.SARGO_ORDERS_FEE_PERCENT,
      "ether"
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

    const agentFee = ethers.parseUnits("0.5", "ether");
    const treasuryFee = ethers.parseUnits("0.5", "ether");
    const transferFee = ethers.parseUnits("0.01", "ether");
    const SargoFee = await ethers.getContractFactory("SargoFee");
    let sargoFee = await upgrades.deployProxy(
      SargoFee,
      [ordersFeePerc, transferFeePerc, agentRate, treasuryRate],
      {
        kind: "uups",
      }
    );

    await sargoFee.waitForDeployment();

    //Test upgradeable
    // const SargoFee_v0_1_0 = await ethers.getContractFactory("SargoFee_v0_1_0");
    // sargoFee = await upgrades.upgradeProxy(
    //   await sargoFee.getAddress(),
    //   SargoFee_v0_1_0
    // );

    return {
      owner,
      SargoFee,
      sargoFee,
      ordersFeePerc,
      transferFeePerc,
      agentFee,
      treasuryFee,
      transferFee,
    };
  }

  describe("Sargo Fee Deployment", function () {
    it("Should set the right Contract owner", async () => {
      const { sargoFee, owner } = await loadFixture(deployFeesFixture);
      expect(await sargoFee.owner()).to.equal(owner.address);
    });

    it("Should set the total order fee", async () => {
      const { sargoFee } = await loadFixture(deployFeesFixture);
      expect(await sargoFee.ordersFeePerc()).to.gt(0);
    });

    it("Should check if the total token transfer fee is set", async () => {
      const { sargoFee } = await loadFixture(deployFeesFixture);
      expect(await sargoFee.transferFeePerc()).to.gt(0);
    });

    it("Should check if the agent fee is set", async () => {
      const { sargoFee } = await loadFixture(deployFeesFixture);
      expect(await sargoFee.agentFee()).to.gt(0);
    });

    it("Should get the agent fee", async () => {
      const { sargoFee, agentFee } = await loadFixture(deployFeesFixture);
      expect(await sargoFee.agentFee()).to.equal(agentFee);
    });

    it("Should check if the treasury fee is set", async () => {
      const { sargoFee } = await loadFixture(deployFeesFixture);
      expect(await sargoFee.treasuryFee()).to.gt(0);
    });

    it("Should get the treasury fee", async () => {
      const { sargoFee, treasuryFee } = await loadFixture(deployFeesFixture);
      expect(await sargoFee.treasuryFee()).to.equal(treasuryFee);
    });

    it("Should check if the tranfer fee is set", async () => {
      const { sargoFee } = await loadFixture(deployFeesFixture);
      expect(await sargoFee.transferFee()).to.gt(0);
    });

    it("Should get the transfer fee", async () => {
      const { sargoFee, transferFee } = await loadFixture(deployFeesFixture);
      expect(await sargoFee.transferFee()).to.equal(transferFee);
    });

    it("Should ensure the the sum of all orders fees do not exceed the total transaction fee", async () => {
      const { sargoFee, ordersFeePerc } = await loadFixture(deployFeesFixture);

      const _agentFee = await sargoFee.agentFee();
      const _treasuryFee = await sargoFee.treasuryFee();

      expect(await sargoFee.ordersFeePerc()).to.equal(ordersFeePerc);
      expect(await sargoFee.ordersFeePerc()).to.equal(_agentFee + _treasuryFee);
    });

    it("Should ensure the the sum of the transfer fee do not exceed the total transfer fee", async () => {
      const { sargoFee, transferFeePerc } = await loadFixture(
        deployFeesFixture
      );

      const _transferFee = await sargoFee.transferFee();

      expect(await sargoFee.transferFeePerc()).to.equal(transferFeePerc);
      expect(await sargoFee.transferFee()).to.lte(transferFeePerc);
    });

    //TODO: Test for all transaction types

    it("Should emit a fees set event", async function () {
      const {
        owner,
        sargoFee,
        ordersFeePerc,
        transferFeePerc,
        agentFee,
        treasuryFee,
        transferFee,
      } = await loadFixture(deployFeesFixture);
      const feesSet = await sargoFee
        .connect(owner)
        .setFees(ordersFeePerc, transferFeePerc);

      await expect(feesSet)
        .to.emit(sargoFee, "FeesSet")
        .withArgs(
          ordersFeePerc,
          transferFeePerc,
          agentFee,
          treasuryFee,
          transferFee
        );
    });
  });
});

const { expect } = require("chai");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { ethers, upgrades } = require("hardhat");
require("dotenv").config();

/* 
//TODO: test invalid cases
//TODO: test upgradeable
*/

describe("==SARGO FEES TESTS ================================", () => {
  async function deployFeesFixture() {
    const [owner] = await ethers.getSigners();
    const transactionFee = ethers.parseUnits(
      process.env.SARGO_TRANSACTION_FEE_PERCENT,
      "ether"
    );
    const agentFee = ethers.parseUnits("0.5", "ether");
    const treasuryFee = ethers.parseUnits("0.5", "ether");
    const SargoFee = await ethers.getContractFactory("SargoFee");
    const sargoFee = await upgrades.deployProxy(SargoFee, [transactionFee], {
      kind: "uups",
    });

    await sargoFee.waitForDeployment();

    return {
      owner,
      transactionFee,
      SargoFee,
      sargoFee,
      agentFee,
      treasuryFee,
    };
  }

  describe("Sargo Fee Deployment", function () {
    it("Should set the right Contract owner", async () => {
      const { sargoFee, owner } = await loadFixture(deployFeesFixture);
      expect(await sargoFee.owner()).to.equal(owner.address);
    });

    it("Should set the total transaction fee", async () => {
      const { sargoFee, transactionFee } = await loadFixture(deployFeesFixture);
      expect(await sargoFee.transactionFee()).to.equal(transactionFee);
    });

    it("Should check if the total transaction fee is set", async () => {
      const { sargoFee } = await loadFixture(deployFeesFixture);
      expect(await sargoFee.transactionFee()).to.gt(0);
    });

    it("Should check if the agent fee is set", async () => {
      const { sargoFee } = await loadFixture(deployFeesFixture);
      expect(await sargoFee.agentFee()).to.gt(0);
    });

    it("Should get the agent fee", async () => {
      const { sargoFee, agentFee } = await loadFixture(deployFeesFixture);
      expect(await sargoFee.agentFee()).to.equal(agentFee);
    });

    it("Should get the treasury fee", async () => {
      const { sargoFee, treasuryFee } = await loadFixture(deployFeesFixture);
      expect(await sargoFee.treasuryFee()).to.equal(treasuryFee);
    });

    it("Should check if the treasury fee is set", async () => {
      const { sargoFee } = await loadFixture(deployFeesFixture);
      expect(await sargoFee.treasuryFee()).to.gt(0);
    });

    it("Should ensure the the sum of all fees don not exceed the total transaction fee", async () => {
      const { sargoFee, transactionFee, agentFee, treasuryFee } =
        await loadFixture(deployFeesFixture);

      const _agentFee = await sargoFee.agentFee();
      const _treasuryFee = await sargoFee.treasuryFee();

      expect(await sargoFee.transactionFee()).to.equal(transactionFee);
      expect(await sargoFee.transactionFee()).to.equal(
        _agentFee + _treasuryFee
      );
    });

    //TODO: Test for all transaction types

    it("Should emit a fees set event", async function () {
      const { owner, sargoFee, transactionFee, agentFee, treasuryFee } =
        await loadFixture(deployFeesFixture);
      const setfees = await sargoFee.connect(owner).setFees(transactionFee);

      await expect(setfees)
        .to.emit(sargoFee, "FeesSet")
        .withArgs(transactionFee, agentFee, treasuryFee);
    });
  });
});

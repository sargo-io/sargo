// const { expect } = require("chai");
// const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
// const { ethers, upgrades } = require("hardhat");
// require("dotenv").config();

// /*
// //TODO: test invalid cases
// //TODO: test upgradeable
// */

// describe("==SARGO EARN TESTS ================================", () => {
//   async function deployEarnFixture() {
//     const [owner, earner] = await ethers.getSigners();
//     const transactionFee = ethers.parseUnits(
//       process.env.SARGO_ORDERS_FEE_PERCENT,
//       "ether"
//     );
//     const agentFee = ethers.parseUnits("0.5", "ether");
//     const SargoEarn = await ethers.getContractFactory("SargoEarn");
//     const sargoEarn = await upgrades.deployProxy(SargoEarn, {
//       kind: "uups",
//     });

//     await sargoEarn.waitForDeployment();

//     return {
//       SargoEarn,
//       sargoEarn,
//       owner,
//       earner,
//       transactionFee,
//       agentFee,
//     };
//   }

//   describe("Sargo Earn Deployment", function () {
//     it("Should set the right Earn owner", async () => {
//       const { sargoEarn, owner } = await loadFixture(deployEarnFixture);
//       expect(await sargoEarn.owner()).to.equal(owner.address);
//     });

//     it("Should update the address with earnings", async () => {
//       const { sargoEarn, earner, agentFee } = await loadFixture(
//         deployEarnFixture
//       );

//       const _preEarnings = await sargoEarn.earnings();
//       await sargoEarn.earn(earner.address, agentFee);
//       const _postEarnings = await sargoEarn.earnings();

//       expect(_postEarnings[earner.address]).to.equal(
//         _preEarnings[earner.address].totalEarned + agentFee
//       );
//     });
//   });
// });

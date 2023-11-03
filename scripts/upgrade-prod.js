require("dotenv").config();
const { ethers, upgrades } = require("hardhat");

async function main() {
  /** -- Start Fee contract upgrade -- */
  // const SargoFee = await ethers.getContractFactory("SargoFee");
  // const sargoFee = await upgrades.upgradeProxy(
  //   "0x6984D58E27D043c262fa53D61d8B9bd6BA0Ccf1E",
  //   SargoFee
  // );

  //console.log("SargoFee upgraded: ", await sargoFee.getAddress());
  /** -- End Fee contract upgrade -- */

  /** -- Start Escrow contract upgrade -- */
  const SargoEscrow_v0_1_8 = await ethers.getContractFactory(
    "SargoEscrow_v0_1_8"
  );

  await upgrades.forceImport(
    "0x004b690c6379B865A39F9d637a468a764838d88E",
    SargoEscrow_v0_1_8,
    { kind: "uups" }
  );

  const SargoEscrow = await ethers.getContractFactory("SargoEscrow");
  const sargoEscrow = await upgrades.upgradeProxy(
    "0x004b690c6379B865A39F9d637a468a764838d88E",
    SargoEscrow
  );

  console.log("SargoEscrow upgraded: ", await sargoEscrow.getAddress());
  /** -- End Escrow contract upgrade -- */
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

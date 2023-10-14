require("dotenv").config();
const { ethers, upgrades } = require("hardhat");

async function main() {
  if (network.name === "hardhat") {
    console.warn(
      "You are trying to deploy a contract to the Hardhat Network, which " +
        "gets automatically created and destroyed every time. Use the Hardhat" +
        " option '--network localhost'"
    );
  }

  /** -- Start Fee contract upgrade -- */
  const SargoFee = await ethers.getContractFactory("SargoFee");
  const sargoFee = await upgrades.upgradeProxy(
    "0x6984D58E27D043c262fa53D61d8B9bd6BA0Ccf1E",
    SargoFee
  );

  //console.log("SargoFee upgraded: ", await sargoFee.getAddress());
  /** -- End Fee contract upgrade -- */

  /** -- Start Escrow contract upgrade -- */
  const SargoEscrow = await ethers.getContractFactory("SargoEscrow");
  const sargoEscrow = await upgrades.upgradeProxy(
    "0x7bDF32f21C4670ac05b32edde9857006C2bbfc3E",
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

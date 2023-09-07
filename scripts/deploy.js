require("dotenv").config();
const { ethers, upgrades } = require("hardhat");

async function main() {
  const CELO_CUSD_TOKEN_ADDRESS = process.env.CELO_CUSD_TOKEN_ADDRESS;
  const SARGO_TREASURY_ADDRESS = process.env.SARGO_TREASURY_ADDRESS;
  const SARGO_AGENT_FEE = process.env.SARGO_AGENT_FEE;
  const SARGO_TREASURY_FEE = process.env.SARGO_TREASURY_FEE;

  if (network.name === "hardhat") {
    console.warn(
      "You are trying to deploy a contract to the Hardhat Network, which " +
        "gets automatically created and destroyed every time. Use the Hardhat" +
        " option '--network localhost'"
    );
  }

  const SargoEscrow = await ethers.getContractFactory("SargoEscrow");
  const sargoEscrow = await SargoEscrow.deploy(
    CELO_CUSD_TOKEN_ADDRESS,
    SARGO_AGENT_FEE,
    SARGO_TREASURY_FEE,
    SARGO_TREASURY_ADDRESS
  );
  await sargoEscrow.deployed();

  console.log("SargoEscrow deployed to: ", sargoEscrow.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

require("dotenv").config();
const { ethers, upgrades } = require("hardhat");

async function main() {
  const CELO_CUSD_TOKEN_ADDRESS = process.env.CELO_CUSD_TOKEN_ADDRESS;
  const SARGO_TREASURY_ADDRESS = process.env.SARGO_TREASURY_ADDRESS;
  const SARGO_ORDERS_FEE_PERCENT = process.env.SARGO_ORDERS_FEE_PERCENT;
  const SARGO_TRANSFER_FEE_PERCENT = process.env.SARGO_TRANSFER_FEE_PERCENT;

  if (network.name === "hardhat") {
    console.warn(
      "You are trying to deploy a contract to the Hardhat Network, which " +
        "gets automatically created and destroyed every time. Use the Hardhat" +
        " option '--network localhost'"
    );
  }

  /// -- Start Fee contract deployment --
  const ordersFeePerc = ethers.parseUnits(SARGO_ORDERS_FEE_PERCENT, "ether");
  const transferFeePerc = ethers.parseUnits(
    SARGO_TRANSFER_FEE_PERCENT,
    "ether"
  );

  const SargoFee = await ethers.getContractFactory("SargoFee");
  const sargoFee = await upgrades.deployProxy(
    SargoFee,
    [ordersFeePerc, transferFeePerc],
    {
      kind: "uups",
    }
  );
  await sargoFee.waitForDeployment();
  const SARGO_FEE_ADDRESS = await sargoFee.getAddress();
  /// -- End Fee contract deployment --

  /// -- Start Escrow contract deployment --
  const SargoEscrow = await ethers.getContractFactory("SargoEscrow");
  const sargoEscrow = await upgrades.deployProxy(
    SargoEscrow,
    [CELO_CUSD_TOKEN_ADDRESS, SARGO_TREASURY_ADDRESS, SARGO_FEE_ADDRESS],
    { kind: "uups" }
  );
  await sargoEscrow.waitForDeployment();
  const SARGO_ESCROW_ADDRESS = await sargoEscrow.getAddress();
  /// -- End Escrow contract deployment --

  console.log("SargoFee deployed to: ", SARGO_FEE_ADDRESS);
  console.log("SargoEscrow deployed to: ", SARGO_ESCROW_ADDRESS);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

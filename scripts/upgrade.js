require("dotenv").config();
const { ethers, upgrades } = require("hardhat");

async function main() {
  const CELO_CUSD_TOKEN_ADDRESS = process.env.CELO_CUSD_TOKEN_ADDRESS;
  const SARGO_TREASURY_ADDRESS = process.env.SARGO_TREASURY_ADDRESS;
  const SARGO_ORDERS_FEE_PERCENT = process.env.SARGO_ORDERS_FEE_PERCENT;
  const SARGO_TRANSFER_FEE_PERCENT = process.env.SARGO_TRANSFER_FEE_PERCENT;
  const SARGO_AGENT_EARNING_PERCENT = process.env.SARGO_AGENT_EARNING_PERCENT;
  const SARGO_TREASURY_EARNING_PERCENT =
    process.env.SARGO_TREASURY_EARNING_PERCENT;

  if (network.name === "hardhat") {
    console.warn(
      "You are trying to deploy a contract to the Hardhat Network, which " +
        "gets automatically created and destroyed every time. Use the Hardhat" +
        " option '--network localhost'"
    );
  }

  /// -- Start Fee contract upgrade --
  const SARGO_FEE_DEPLOYED_ADDRESS =
    "0x9E4C399fbd882454e281912ffC5380883fDA8eE3";
  const ordersFeePerc = ethers.parseUnits(SARGO_ORDERS_FEE_PERCENT, "ether");
  const transferFeePerc = ethers.parseUnits(
    SARGO_TRANSFER_FEE_PERCENT,
    "ether"
  );
  const agentRate = ethers.parseUnits(SARGO_AGENT_EARNING_PERCENT, "ether");
  const treasuryRate = ethers.parseUnits(
    SARGO_TREASURY_EARNING_PERCENT,
    "ether"
  );

  const SargoFee_v0_1_0 = await ethers.getContractFactory("SargoFee_v0_1_0");
  const sargoFee_v0_1_0 = await upgrades.upgradeProxy(
    SARGO_FEE_DEPLOYED_ADDRESS,
    [ordersFeePerc, transferFeePerc, agentRate, treasuryRate],
    SargoFee_v0_1_0
  );
  /// -- End Fee contract upgrade --

  /// -- Start Escrow contract upgrade --
  const SARGO_ESCROW_DEPLOYED_ADDRESS =
    "0x696d4cCdfFE80f8Ac4fD8917a90210dd6719166a";
  const SargoEscrow_v0_1_0 = await ethers.getContractFactory(
    "SargoEscrow_v0_1_0"
  );
  const sargoEscrow_v0_1_0 = await upgrades.upgradeProxy(
    SARGO_ESCROW_DEPLOYED_ADDRESS,
    [CELO_CUSD_TOKEN_ADDRESS, SARGO_TREASURY_ADDRESS, SARGO_FEE_ADDRESS],
    SargoEscrow_v0_1_0
  );
  /// -- End Escrow contract upgrade --

  console.log("SargoFee upgraded: ", await sargoFee_v0_1_0.getAddress());
  console.log("SargoEscrow upgraded: ", await sargoEscrow_v0_1_0.getAddress());
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

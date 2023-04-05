require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();
require("solidity-coverage");

const SARGO_CELO_PRIVATE_KEY = process.env.SARGO_CELO_PRIVATE_KEY;
const CELOSCAN_API_KEY = process.env.CELOSCAN_API_KEY;

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.17",
  /* solidity: {
    version: "0.8.17",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  }, */
  networks: {
    hardhat: {
      chainId: 1337,
    },
    alfajores: {
      url: "https://alfajores-forno.celo-testnet.org",
      accounts: [SARGO_CELO_PRIVATE_KEY],
      chainId: 44787,
      gas: "auto",
      gasPrice: "auto",
    },
    celo: {
      url: "https://forno.celo.org",
      accounts: [SARGO_CELO_PRIVATE_KEY],
      chainId: 42220,
      gas: "auto",
      gasPrice: "auto",
    },
  },
  etherscan: {
    apikey: {
      alfajores: CELOSCAN_API_KEY,
      celo: CELOSCAN_API_KEY,
    },
  },
};

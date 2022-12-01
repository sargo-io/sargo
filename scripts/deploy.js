require('dotenv').config();

async function main() {

    const CELO_SARGO_ADDRESS = process.env.CELO_SARGO_ADDRESS;
    const CELO_TREASURY_ADDRESS = process.env.CELO_TREASURY_ADDRESS;

    if (network.name === "hardhat") {
        console.warn(
        "You are trying to deploy a contract to the Hardhat Network, which " +
            "gets automatically created and destroyed every time. Use the Hardhat" +
            " option '--network localhost'"
        );
    }

    /* 
        const [deployer] = await ethers.getSigners();
        console.log('Deploying contracts with the account: ', deployer.address);
        console.log('Account balance: ', (await deployer.getBalance()).toString());
        const Token = await ethers.getContractFactory('Token');
        const token = await Token.deploy();
        console.log('Token address: ', token.address); 
    */

    const Sargo = await ethers.getContractFactory("Sargo");
    const sargo = await Sargo.deploy(
        CELO_SARGO_ADDRESS, 
        0, 
        0, 
        CELO_TREASURY_ADDRESS
    );
    await sargo.deployed();

  console.log('Sargo deployed to: ', sargo.address);


}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
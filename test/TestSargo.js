const { expect } = require('chai');
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { ethers } = require('hardhat');
const { BigNumber } = require('ethers');

describe('Sargo contract', () => {
    async function deploySargoFixture() {
        const Sargo = await ethers.getContractFactory('Sargo');
        const [
                owner, 
                client, 
                agent, 
                sargoAddress, 
                treasuryAddress
            ] = await ethers.getSigners();
        const agentFee  = BigNumber.from("50000000000000000");
        const sargoFee = BigNumber.from("40000000000000000");
        const amount = 2; 
        const currencyCode = 'KES';
        const conversionRate = 122;

        const sargo = await Sargo.deploy(sargoAddress.address, 0, 0, treasuryAddress.address);
        await sargo.deployed();

        return { 
            Sargo, 
            sargo, 
            owner, 
            sargoFee, 
            agentFee, 
            client, 
            agent, 
            sargoAddress,
            treasuryAddress, 
            amount,
            currencyCode,
            conversionRate
        };
    }

    describe('Deployment', function () {
        it('Should set the right owner', async() => {
            const { sargo, owner } = await loadFixture(deploySargoFixture);
            expect(await sargo.getOwner()).to.equal(owner.address);
        });

        it('Should set the right escrow address', async() => {
            const { sargo, sargoAddress } = await loadFixture(deploySargoFixture);
            expect(await sargo.getSargoAddress()).to.equal(sargoAddress.address);
        });

        it('Should set the right tresury address', async() => {
            const { sargo, treasuryAddress } = await loadFixture(deploySargoFixture);
            expect(await sargo.getTreasuryAddress()).to.equal(treasuryAddress.address);
        });

        it('Should set the right agent fee', async() => {
            const { sargo, agentFee } = await loadFixture(deploySargoFixture);
            expect(await sargo.getAgentFee()).to.equal(agentFee);
        });

        it('Should set the right sargo fee', async() => {
            const { sargo, sargoFee } = await loadFixture(deploySargoFixture);
            expect(await sargo.getSargoFee()).to.equal(sargoFee);
        }); 
    });

    describe('Transactions', function () {
        it('Should create a deposit request', async() => {
            const { sargo, amount, currencyCode, conversionRate } = await loadFixture(deploySargoFixture);
            
            await sargo.initiateDeposit(amount, currencyCode, conversionRate);
            const txn = await sargo.getTransactionByIndex(0);

            expect(txn.id).to.equal(0);

            
        });

        //Test deposit emit
        it('Should emit deposit transaction initiated is set event', async function() {
            const { sargo, owner, amount, currencyCode, conversionRate } = await loadFixture(deploySargoFixture);
            await expect(sargo.initiateDeposit(amount, currencyCode, conversionRate))
            .to.emit(sargo, "TransactionInitiated")
            .withArgs(0, owner.address);
        });

        it('Should create a withdrawal request', async() => {
            const { sargo, amount, currencyCode, conversionRate } = await loadFixture(deploySargoFixture);

            await sargo.initiateWithdrawal(amount, currencyCode, conversionRate);
            const txn = await sargo.getTransactionByIndex(0);

            expect(txn.id).to.equal(0);
        });

        //Test withdraw emit
        it('Should emit withdraw transaction initiated is set event', async function() {
            const { sargo, owner, amount, currencyCode, conversionRate } = await loadFixture(deploySargoFixture);
            await expect(sargo.initiateWithdrawal(amount, currencyCode, conversionRate))
            .to.emit(sargo, "TransactionInitiated")
            .withArgs(0, owner.address);
        });

        /* it('Should allow agent to pair a deposit request', async() => {
            const { sargo } = await loadFixture(deploySargoFixture);
        });
        it('Should allow the client to pair for a withdraw request', async() => {
            const { sargo } = await loadFixture(deploySargoFixture);
        });
        it('Should allow the agent to confirm fiat payment received - deposit request', async() => {
            const { sargo } = await loadFixture(deploySargoFixture);
        });
        it('Should allow the client to confirm fiat payment received - withdraw request', async() => {
            const { sargo } = await loadFixture(deploySargoFixture);
        });
        it('Should allow the agent to complete the transaction - deposit', async() => {
            const { sargo } = await loadFixture(deploySargoFixture);
        });
        it('Should allow the client to complete the transaction - withdraw', async() => {
            const { sargo } = await loadFixture(deploySargoFixture);
        });
        it('Should allow the client to cancel a deposit request', async() => {
            const { sargo } = await loadFixture(deploySargoFixture);
        });
        it('Should allow the agent to cancel a withdraw request', async() => {
            const { sargo } = await loadFixture(deploySargoFixture);
        }); */
    });

    describe('Send and receive cUSD', function () {
        it('Should send value to provided address', async() => {
            const { sargo } = await loadFixture(deploySargoFixture);
        });
        it('Should receive value for provided address', async() => {
            const { sargo } = await loadFixture(deploySargoFixture);
        });
    });
 
});
const { expect } = require('chai');
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { ethers } = require('hardhat');
const { BigNumber } = require('ethers');

describe('SargoEscrow contract', () => {
    /** Token fixtures */
    async function deployTokenUtilFixture() {
        const SargoToken = await ethers.getContractFactory('SargoToken');
        const [
            owner, 
            sender, 
            recipient
        ] = await ethers.getSigners();
        const initialSupply = 100;
        const sargoToken = await SargoToken.deploy(initialSupply, 'cUSD', 0, 'cUSD');
        await sargoToken.deployed();
        
        return { SargoToken, 
                sargoToken, 
                initialSupply, 
                owner, 
                sender, 
                recipient
            };
    }

    /** Escrow fixtures */
    async function deploySargoEscrowFixture() {
        const { SargoToken, sargoToken, sender, recipient } = await loadFixture(deployTokenUtilFixture);
        const SargoEscrow = await ethers.getContractFactory('SargoEscrow');
        const [
                owner, 
                client, 
                agent, 
                treasuryAddress
            ] = await ethers.getSigners();
        const agentFee  = 2;
        const sargoFee = 1;
        const amount = 2; 
        const currencyCode = 'KES';
        const conversionRate = 122;
        const clientPhone = '+254722000000';
        const agentPhone = '+254723000000';

        const sargoEscrow = await SargoEscrow.deploy(sargoToken.address, agentFee, sargoFee, treasuryAddress.address);
        await sargoEscrow.deployed();

        return { 
            SargoEscrow, 
            sargoEscrow, 
            owner, 
            sargoFee, 
            agentFee, 
            client, 
            agent, 
            sargoToken,
            treasuryAddress, 
            amount,
            currencyCode,
            conversionRate,
            sender,
            recipient,
            clientPhone,
            agentPhone
        };
    }

    describe('Deployment', function () {
        it('Should set the right owner', async() => {
            const { sargoEscrow, owner } = await loadFixture(deploySargoEscrowFixture);
            expect(await sargoEscrow.getOwner()).to.equal(owner.address);
        });

        it('Should set the right escrow address', async() => {
            const { sargoEscrow, sargoToken } = await loadFixture(deploySargoEscrowFixture);
            expect(await sargoEscrow.getSargoTokenAddress()).to.equal(sargoToken.address);
        });

        it('Should set the right tresury address', async() => {
            const { sargoEscrow, treasuryAddress } = await loadFixture(deploySargoEscrowFixture);
            expect(await sargoEscrow.getTreasuryAddress()).to.equal(treasuryAddress.address);
        });

        it('Should set the right agent fee', async() => {
            const { sargoEscrow, agentFee } = await loadFixture(deploySargoEscrowFixture);
            expect(await sargoEscrow.getAgentFee()).to.equal(agentFee);
        });

        it('Should set the right sargo fee', async() => {
            const { sargoEscrow, sargoFee } = await loadFixture(deploySargoEscrowFixture);
            expect(await sargoEscrow.getSargoFee()).to.equal(sargoFee);
        }); 
    });

    describe('Transactions', function () {
        it('Should initiate a deposit request', async() => {
            const { sargoEscrow, sargoToken, amount, currencyCode, conversionRate, agentFee, sargoFee } = await loadFixture(deploySargoEscrowFixture);
            await sargoEscrow.initiateDeposit(amount, currencyCode, conversionRate);
            const txn = await sargoEscrow.getTransactionByIndex(0);
            expect(txn.id).to.equal(0);
            expect(await sargoToken.balanceOf(txn.agentAccount)).to.equal(0);
            expect(txn.agentFee).to.equal(agentFee);
            expect(txn.treasuryFee).to.equal(sargoFee);
            expect(txn.totalAmount).to.equal(amount + agentFee + sargoFee);
            expect(txn.netAmount).to.equal(txn.totalAmount - (agentFee + sargoFee));
            expect(txn.txType).to.equal(0);
            expect(txn.status).to.equal(0);
            expect(txn.agentApproved).to.equal(false);
            expect(txn.clientApproved).to.equal(false);
        });

        it('Should emit deposit initiated event', async function() {
            const { sargoEscrow, owner, amount, currencyCode, conversionRate } = await loadFixture(deploySargoEscrowFixture);
            await expect(sargoEscrow.initiateDeposit(amount, currencyCode, conversionRate))
            .to.emit(sargoEscrow, "TransactionInitiated")
            .withArgs(0, owner.address);
        });

        it('Should initiate a withdrawal request', async() => {
        const { sargoEscrow, sargoToken, amount, currencyCode, conversionRate, agentFee, sargoFee } = await loadFixture(deploySargoEscrowFixture);

        await sargoToken.approve(sargoEscrow.address, 10);
        await sargoEscrow.initiateWithdrawal(amount, currencyCode, conversionRate);
        const txn = await sargoEscrow.getTransactionByIndex(0);

        expect(txn.id).to.equal(0);
        expect(await sargoToken.balanceOf(txn.agentAccount)).to.equal(0);
        expect(txn.agentFee).to.equal(agentFee);
        expect(txn.treasuryFee).to.equal(sargoFee);
        expect(txn.totalAmount).to.equal(amount + agentFee + sargoFee);
        expect(txn.netAmount).to.equal(txn.totalAmount - (agentFee + sargoFee));
        expect(txn.txType).to.equal(1);
        expect(txn.status).to.equal(0);
        expect(txn.agentApproved).to.equal(false);
        expect(txn.clientApproved).to.equal(false);
    });

    it('Should emit withdraw initiated event', async function() {
        const { sargoEscrow, sargoToken, owner, amount, currencyCode, conversionRate } = await loadFixture(deploySargoEscrowFixture);
        await sargoToken.approve(sargoEscrow.address, 10);
        await expect(sargoEscrow.initiateWithdrawal(amount, currencyCode, conversionRate))
        .to.emit(sargoEscrow, "TransactionInitiated")
        .withArgs(0, owner.address);
    });

    it('Should allow agent to pair a deposit request. Accept deposit', async() => {
        const { sargoEscrow, sargoToken, client, agent, amount, currencyCode, conversionRate, agentPhone, agentFee, sargoFee } = await loadFixture(deploySargoEscrowFixture);
            await sargoEscrow.initiateDeposit(amount, currencyCode, conversionRate);
            const txn = await sargoEscrow.getTransactionByIndex(0);
            await sargoEscrow.connect(agent).acceptDeposit(txn.id, agentPhone);
            expect(txn.id).to.equal(0);
            expect(await sargoToken.balanceOf(txn.agentAccount)).to.equal(0);
            expect(txn.agentFee).to.equal(agentFee);
            expect(txn.treasuryFee).to.equal(sargoFee);
            expect(txn.totalAmount).to.equal(amount + agentFee + sargoFee);
            expect(txn.netAmount).to.equal(txn.totalAmount - (agentFee + sargoFee));
            expect(txn.txType).to.equal(0);
            expect(txn.status).to.equal(1);
            expect(txn.agentApproved).to.equal(false);
            expect(txn.clientApproved).to.equal(false);
            expect(txn.agentPhoneNumber).to.equal(agentPhone);
    });

    it('Should allow the client to pair for a withdraw request. Accept withdrwal', async() => {
        const { sargoEscrow, sargoToken, client, agent, amount, currencyCode, conversionRate, agentPhone, agentFee, sargoFee } = await loadFixture(deploySargoEscrowFixture);
        await sargoToken.approve(sargoEscrow.address, 10);
        await sargoEscrow.initiateWithdrawal(amount, currencyCode, conversionRate);
        const txn = await sargoEscrow.getTransactionByIndex(0);
        await sargoEscrow.connect(client).acceptWithdrawal(txn.id, agentPhone);
        expect(txn.id).to.equal(0);
        expect(await sargoToken.balanceOf(txn.agentAccount)).to.equal(0);
        expect(txn.agentFee).to.equal(agentFee);
        expect(txn.treasuryFee).to.equal(sargoFee);
        expect(txn.totalAmount).to.equal(amount + agentFee + sargoFee);
        expect(txn.netAmount).to.equal(txn.totalAmount - (agentFee + sargoFee));
        expect(txn.txType).to.equal(1);
        expect(txn.status).to.equal(1);
        expect(txn.agentApproved).to.equal(false);
        expect(txn.clientApproved).to.equal(false);
        expect(txn.agentPhoneNumber).to.equal(agentPhone);
    });



        /*
        it('Should allow the agent to confirm fiat payment received - deposit request', async() => {
            const { sargoEscrow } = await loadFixture(deploySargoEscrowFixture);
        });
        it('Should allow the client to confirm fiat payment received - withdraw request', async() => {
            const { sargoEscrow } = await loadFixture(deploySargoEscrowFixture);
        });
        it('Should allow the agent to complete the transaction - deposit', async() => {
            const { sargoEscrow } = await loadFixture(deploySargoEscrowFixture);
        });
        it('Should allow the client to complete the transaction - withdraw', async() => {
            const { sargoEscrow } = await loadFixture(deploySargoEscrowFixture);
        });
        it('Should allow the client to cancel a deposit request', async() => {
            const { sargoEscrow } = await loadFixture(deploySargoEscrowFixture);
        });
        it('Should allow the agent to cancel a withdraw request', async() => {
            const { sargoEscrow } = await loadFixture(deploySargoEscrowFixture);
        }); */
    });

    describe('Send and receive cUSD', function () {
        it('Should send value to provided address', async() => {
            const { sargoEscrow } = await loadFixture(deploySargoEscrowFixture);
        });
        it('Should receive value for provided address', async() => {
            const { sargoEscrow } = await loadFixture(deploySargoEscrowFixture);
        });
    });
 
});
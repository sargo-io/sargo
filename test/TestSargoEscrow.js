const { expect } = require('chai');
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { ethers } = require('hardhat');
const { BigNumber } = require('ethers');

describe('Sargo Token, Escrow contracts deployment', () => {
    async function deploySargoEscrowFixture() {
        const SargoToken = await ethers.getContractFactory('SargoToken');
        const initialSupply = 1000;
        const sargoToken = await SargoToken.deploy(initialSupply, 'cUSD', 0, 'cUSD');
        await sargoToken.deployed();

        const SargoEscrow = await ethers.getContractFactory('SargoEscrow');
        const [
                owner, 
                sender,
                recipient,
                client, 
                agent, 
                treasury
            ] = await ethers.getSigners();
        const agentFee  = 2;
        const sargoFee = 1;
        const amount = 2;
        const currencyCode = 'KES';
        const conversionRate = 122;
        const clientPhone = '254722000000';
        const agentPhone = '254723000000';
        const fundAccount = 10;

        const sargoEscrow = await SargoEscrow.deploy(sargoToken.address, agentFee, sargoFee, treasury.address);
        await sargoEscrow.deployed();

        await sargoToken.transfer(client.address, fundAccount);
        await sargoToken.transfer(agent.address, fundAccount);
        await sargoToken.connect(client).approve(sargoEscrow.address, 10);
        await sargoToken.connect(agent).approve(sargoEscrow.address, 10);

        return { 
            SargoEscrow, 
            sargoEscrow, 
            owner, 
            sargoFee, 
            agentFee, 
            client, 
            agent, 
            SargoToken,
            sargoToken,
            initialSupply,
            treasury, 
            amount,
            currencyCode,
            conversionRate,
            sender,
            recipient,
            clientPhone,
            agentPhone,
            fundAccount
        };
    }

    describe('Deployment', function () {
        it('Should set the right owner', async() => {
            const { sargoEscrow, owner } = await loadFixture(deploySargoEscrowFixture);
            expect(await sargoEscrow.getOwner()).to.equal(owner.address);
        });

        it('Should set the right escrow address', async() => {
            const { sargoEscrow, sargoToken } = await loadFixture(deploySargoEscrowFixture);
            expect(await sargoEscrow.getCusdTokenAddress()).to.equal(sargoToken.address);
        });

        it('Should set the right tresury address', async() => {
            const { sargoEscrow, treasury } = await loadFixture(deploySargoEscrowFixture);
            expect(await sargoEscrow.getTreasuryAddress()).to.equal(treasury.address);
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

    describe('Deposit Transactions', function () {
        it('Should initiate a deposit request', async() => {
            const { sargoEscrow, sargoToken, client, amount, currencyCode, conversionRate, agentFee, sargoFee } = await loadFixture(deploySargoEscrowFixture);
            await sargoEscrow.connect(client).initiateDeposit(amount, currencyCode, conversionRate);
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

        /* it('Should emit deposit request initiated event', async function() {
            const { sargoEscrow, client, amount, currencyCode, conversionRate } = await loadFixture(deploySargoEscrowFixture);
            await expect(sargoEscrow.connect(client).initiateDeposit(amount, currencyCode, conversionRate))
            .to.emit(sargoEscrow, "TransactionInitiated")
            .withArgs(0, client.address);
        }); */

        it('Should allow an agent to Accept deposit pair with client for deposit request', async() => {
            const { sargoEscrow, sargoToken, agent, client, amount, currencyCode, conversionRate, agentPhone, agentFee, sargoFee,fundAccount } = await loadFixture(deploySargoEscrowFixture);
            await sargoEscrow.connect(client).initiateDeposit(amount, currencyCode, conversionRate);
            const txn = await sargoEscrow.getTransactionByIndex(0);
            await sargoEscrow.connect(agent).acceptDeposit(txn.id, agentPhone);
            expect(txn.id).to.equal(0);
            expect(await sargoToken.balanceOf(txn.agentAccount)).to.equal(0);
            expect(txn.agentFee).to.equal(agentFee);
            expect(txn.treasuryFee).to.equal(sargoFee);
            expect(txn.totalAmount).to.equal(amount + agentFee + sargoFee);
            expect(txn.netAmount).to.equal(txn.totalAmount - (agentFee + sargoFee));
            expect(txn.txType).to.equal(0);
            //expect(txn.status).to.equal(1);
            expect(txn.agentApproved).to.equal(false);
            expect(txn.clientApproved).to.equal(false);
            //expect(txn.agentPhoneNumber).to.equal(agentPhone);
        });

        /* it('Should emit the Accept deposit request event', async() => {
            const { sargoEscrow, sargoToken, agent, client, amount, currencyCode, conversionRate, agentPhone, fundAccount } = await loadFixture(deploySargoEscrowFixture);
            await sargoEscrow.connect(client).initiateDeposit(amount, currencyCode, conversionRate);
            const txn = await sargoEscrow.getTransactionByIndex(0);
            const acceptDeposit = await sargoEscrow.connect(agent).acceptDeposit(txn.id, agentPhone);
            await expect(acceptDeposit)
            .to.emit(sargoEscrow, "RequestAccepted")
            .withArgs(await sargoEscrow.getTransactionByIndex(txn.id));
        }); */

        it('Should allow the client and agent confirm fiat payment received - Deposit request', async() => {
            const { sargoEscrow, sargoToken, agent, client, treasury, amount, currencyCode, conversionRate, agentPhone, agentFee, sargoFee, fundAccount } = await loadFixture(deploySargoEscrowFixture);
            await sargoEscrow.connect(client).initiateDeposit(amount, currencyCode, conversionRate);
            const txn = await sargoEscrow.getTransactionByIndex(0);
            await sargoEscrow.connect(agent).acceptDeposit(txn.id, agentPhone);
            await sargoEscrow.connect(client).clientConfirmPayment(txn.id);
            await sargoEscrow.connect(agent).agentConfirmPayment(txn.id);
            const txnRes = await sargoEscrow.getTransactionByIndex(txn.id);
            const clientBalance = await sargoToken.balanceOf(client.address);
            const agentBalance = await sargoToken.balanceOf(agent.address);
            const treasuryBalance = await sargoToken.balanceOf(treasury.address);  
            const clientExpected = fundAccount + amount; 
            const agentExpected = fundAccount - amount + agentFee;
            expect(txnRes.id).to.equal(0);
            expect(txnRes.txType).to.equal(0);
            expect(txnRes.status).to.equal(3);
            expect(clientBalance).to.equal(clientExpected);
            expect(agentBalance).to.equal(agentExpected);
            expect(treasuryBalance).to.equal(2);
            
            //ClientConfirmed(txn)
            //AgentConfirmed(txn)
            //ConfirmationCompleted(txn)
        });

        /*
        it('Should allow the client to cancel a deposit request', async() => {
            const { sargoEscrow } = await loadFixture(deploySargoEscrowFixture);
        });
         */
    });

    describe('Withdraw Transactions', function () {
        it('Should initiate a withdrawal request', async() => {
            const { sargoEscrow, sargoToken, client, amount, currencyCode, conversionRate, agentFee, sargoFee, fundAccount } = await loadFixture(deploySargoEscrowFixture);
            await sargoEscrow.connect(client).initiateWithdrawal(amount, currencyCode, conversionRate);
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
    
        /* it('Should emit withdraw request initiated event', async function() {
            const { sargoEscrow, sargoToken, client, amount, currencyCode, conversionRate, fundAccount } = await loadFixture(deploySargoEscrowFixture);
            await expect(sargoEscrow.connect(client).initiateWithdrawal(amount, currencyCode, conversionRate))
            .to.emit(sargoEscrow, "TransactionInitiated")
            .withArgs(0, client.address);
        }); */

        it('Should allow an agent to Accept withdrwal pair with the client for a withdraw request', async() => {
            const { sargoEscrow, sargoToken, agent, client, amount, currencyCode, conversionRate, agentPhone, agentFee, sargoFee, fundAccount } = await loadFixture(deploySargoEscrowFixture);
            await sargoEscrow.connect(client).initiateWithdrawal(amount, currencyCode, conversionRate);
            const txn = await sargoEscrow.getTransactionByIndex(0);
            await sargoEscrow.connect(agent).acceptWithdrawal(txn.id, agentPhone);
            expect(txn.id).to.equal(0);
            expect(await sargoToken.balanceOf(txn.agentAccount)).to.equal(0);
            expect(txn.agentFee).to.equal(agentFee);
            expect(txn.treasuryFee).to.equal(sargoFee);
            expect(txn.totalAmount).to.equal(amount + agentFee + sargoFee);
            expect(txn.netAmount).to.equal(txn.totalAmount - (agentFee + sargoFee));
            expect(txn.txType).to.equal(1);
            //expect(txn.status).to.equal(1);
            expect(txn.agentApproved).to.equal(false);
            expect(txn.clientApproved).to.equal(false);
            //expect(txn.agentPhoneNumber).to.equal(agentPhone);
        });

        /* it('Should emit the Accept withdrwal request event', async() => {
            const { sargoEscrow, sargoToken, agent, client, amount, currencyCode, conversionRate, agentPhone, fundAccount } = await loadFixture(deploySargoEscrowFixture);
            await sargoEscrow.connect(client).initiateWithdrawal(amount, currencyCode, conversionRate);
            const txn = await sargoEscrow.getTransactionByIndex(0);
            const acceptWithdraw = await sargoEscrow.connect(agent).acceptWithdrawal(txn.id, agentPhone);
            await expect(acceptWithdraw)
            .to.emit(sargoEscrow, "RequestAccepted")
            .withArgs(await sargoEscrow.getTransactionByIndex(txn.id));
        }); */

        it('Should allow the client and agent confirm fiat payment received - withdraw transaction', async() => {
            const { sargoEscrow, sargoToken, agent, client, treasury, amount, currencyCode, conversionRate, agentPhone, agentFee, sargoFee, fundAccount } = await loadFixture(deploySargoEscrowFixture);
            await sargoEscrow.connect(client).initiateWithdrawal(amount, currencyCode, conversionRate);
            const txn = await sargoEscrow.getTransactionByIndex(0);
            await sargoEscrow.connect(agent).acceptWithdrawal(txn.id, agentPhone);
            await sargoEscrow.connect(client).clientConfirmPayment(txn.id);
            await sargoEscrow.connect(agent).agentConfirmPayment(txn.id);
            const txnRes = await sargoEscrow.getTransactionByIndex(txn.id);
            const clientBalance = await sargoToken.balanceOf(client.address);
            const agentBalance = await sargoToken.balanceOf(agent.address);
            const treasuryBalance = await sargoToken.balanceOf(treasury.address); 
            const clientExpected = fundAccount + amount; 
            const agentExpected = fundAccount - amount + agentFee;
            expect(txnRes.id).to.equal(0);
            expect(txnRes.txType).to.equal(1);
            expect(txnRes.status).to.equal(3);
            expect(clientBalance).to.equal(clientExpected);
            expect(agentBalance).to.equal(agentExpected);
            expect(treasuryBalance).to.equal(sargoFee);

            //ClientConfirmed(txn)
            //AgentConfirmed(txn)
            //ConfirmationCompleted(txn)

        });

        /*
        it('Should allow the agent to cancel a withdraw request', async() => {
        const { sargoEscrow } = await loadFixture(deploySargoEscrowFixture);
        });
         */

    });

    describe('Send Transactions', function () {
        it('Should send value to provided address', async() => {
            const { sargoEscrow } = await loadFixture(deploySargoEscrowFixture);




        });
    });

    describe('Gas Transactions', function () {
        it('Should get the estimated gas price', async() => {

        });

    });
 
});
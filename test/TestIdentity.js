const { expect } = require('chai');
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { ethers } = require('hardhat');

describe('Identity contract', () => {

    async function deployIdentityFixture() {
        const Identity = await ethers.getContractFactory('Identity');
        const [owner, account] = await ethers.getSigners();
        const identity = await Identity.deploy();
        await identity.deployed();
        const admin = identity.strRoleToBytesHash('ADMIN');
        const user = identity.strRoleToBytesHash('USER');
        
        return { Identity, identity, owner, account, admin, user };
    }

    describe('Deployment', function () {
        it('Should check account owner is admin', async function () {
            const { identity, owner } = await loadFixture(deployIdentityFixture);
            expect(await identity.isAdmin(owner.address)).to.equal(true);
        });
    });

    describe('Identity roles functions', function () {
        it('Should add a new admin account in roles', async function () {
            const { identity, account, admin } = await loadFixture(deployIdentityFixture);
            await identity.grant(admin, account.address);
            expect(await identity.isAdmin(account.address)).to.equal(true);
        });

        it('Should remove an admin account from roles', async function () {
            const { identity, account, admin } = await loadFixture(deployIdentityFixture);
            await identity.grant(admin, account.address);
            await identity.revoke(admin, account.address);
            expect(await identity.isAdmin(account.address)).to.equal(false);
        });

        it('Should add a new user account in roles', async function () {
            const { identity, account, user } = await loadFixture(deployIdentityFixture);
            await identity.grant(user, account.address);
            expect(await identity.exists(user, account.address)).to.equal(true);
        });

        it('Should remove a user account from roles', async function () {
            const { identity, account, user } = await loadFixture(deployIdentityFixture);
            await identity.grant(user, account.address);
            await identity.revoke(user, account.address);
            expect(await identity.exists(user, account.address)).to.equal(false);
        });

        it('Should check if accounts exists in roles', async function () {
            const { identity, account, admin, user } = await loadFixture(deployIdentityFixture);
            await identity.grant(admin, account.address);
            await identity.grant(user, account.address);
            expect(await identity.exists(admin, account.address)).to.equal(true);
            expect(await identity.exists(user, account.address)).to.equal(true);
        });

    });

});
const { expect } = require('chai');
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { ethers } = require('hardhat');

describe('User contract', () => {

    async function deployUserFixture() {
        const User = await ethers.getContractFactory('User');
        const [owner] = await ethers.getSigners();
        const user = await User.deploy();
        await user.deployed();

        return { User, user, owner };
    }

    describe('Deployment', function () {
        it('Should check owner is admin', async function () {
            const { user, owner } = await loadFixture(deployPausableFixture);
            expect(await user.isAdmin(owner.address)).to.equal(true);
        });
    });


    //isAdmin
    //addAdmin
    //renounceAdmin
    //_addAdmin
    //emit event _addAdmin
    //_removeAdmin
    //emit event _removeAdmin


});
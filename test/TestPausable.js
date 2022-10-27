const { expect } = require('chai');
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { ethers } = require('hardhat');

describe('Pausable contract', () => {

    async function deployPausableFixture() {
        const Pausable = await ethers.getContractFactory('Pausable');
        const [owner] = await ethers.getSigners();
        const pausable = await Pausable.deploy();
        await pausable.deployed();

        return { Pausable, pausable, owner };
    }

    describe('Deployment', function () {
        it('Should check owner is admin', async function () {
            const { pausable, owner } = await loadFixture(deployPausableFixture);
            expect(await pausable.isAdmin(owner.address)).to.equal(true);
        });
    });

    describe('Pause and Unpause', function() {
        it('Should pause contract functions execution', async function () {
            const { pausable } = await loadFixture(deployPausableFixture);
            await pausable.pause();
            expect(await pausable.isPaused()).to.equal(true);
        });

        it('Should emit paused event', async function () {
            const { pausable, owner } = await loadFixture(deployPausableFixture);
            await expect(pausable.pause())
            .to.emit(pausable, 'Paused')
            .withArgs(owner.address);
        });

        it('Should unpause contract function execution', async function () {
            const { pausable } = await loadFixture(deployPausableFixture);
            await pausable.pause();
            await pausable.unPause();
            expect(await pausable.isPaused()).to.equal(false);
        });

        it('Should emit unpaused event', async function () {
            const { pausable, owner } = await loadFixture(deployPausableFixture);
            await pausable.pause();
            await expect(pausable.unPause())
            .to.emit(pausable, 'UnPaused')
            .withArgs(owner.address);

        });

        it('Should return true if paused is set', async function () {
            const { pausable } = await loadFixture(deployPausableFixture);
            await pausable.pause();
            expect(await pausable.isPaused()).to.equal(true);
        });
    });

});
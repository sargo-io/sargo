const { expect } = require('chai');
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { ethers } = require('hardhat');

describe('Ownable contract', () => {

    async function deployOwnableFixture() {
        const Ownable = await ethers.getContractFactory('Ownable');
        const [owner, newOwner] = await ethers.getSigners();
        const ownable = await Ownable.deploy();
        await ownable.deployed();

        return { Ownable, ownable, owner, newOwner };
    }

    describe('Deployment', function () {
        it('Should set the right owner', async function() {
            const { ownable, owner } = await loadFixture(deployOwnableFixture);
            expect(await ownable.getOwner()).to.equal(owner.address);
        });
    });

    describe('Change owner', function () {
        it('Should set a new contract owner', async function() {
            const { ownable, owner, newOwner } = await loadFixture(deployOwnableFixture);
            await ownable.setOwner(newOwner.address);
            expect(await ownable.getOwner()).to.equal(newOwner.address);
        });

        it('Should emit owner is set event', async function() {
            const { ownable, owner, newOwner } = await loadFixture(deployOwnableFixture);
            await expect(ownable.setOwner(newOwner.address))
            .to.emit(ownable, "OwnerIsSet")
            .withArgs(owner.address, newOwner.address);
        });

        it('Should return owner address', async function() {
            const { ownable, owner } = await loadFixture(deployOwnableFixture);
            const _owner = await ownable.getOwner();
            expect(_owner !== null || _owner.trim() !== "").to.equal(true);
            expect(_owner).to.equal(owner.address);
        });

        it('Should return true if caller is owner', async function() {
            const { ownable, owner } = await loadFixture(deployOwnableFixture);
            expect(await ownable.isOwner()).to.equal(true);
        });
    });
});
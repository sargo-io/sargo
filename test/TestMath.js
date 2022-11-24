const { expect } = require('chai');
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { ethers } = require('hardhat');

describe('Math library utils', () => {

    async function deployMathUtilFixture() {
        const Math = await ethers.getContractFactory('TestMathUtil');
        const math = await Math.deploy();
        await math.deployed();
        
        return { math };
    }

    describe('Math functions', function () {
        it('Should return the sum of the two numbers', async function () {
            const { math } = await loadFixture(deployMathUtilFixture);
            expect(await math.add(1, 3)).to.equal(4);
        });

        it('Should return the difference between the two numbers', async function () {
            const { math } = await loadFixture(deployMathUtilFixture);
            expect(await math.sub(10, 6)).to.equal(4);
        });

        it('Should return the product of the two numbers', async function () {
            const { math } = await loadFixture(deployMathUtilFixture);
            expect(await math.mul(2, 5)).to.equal(10);
        });

        it('Should return the quotient of the two numbers', async function () {
            const { math } = await loadFixture(deployMathUtilFixture);
            expect(await math.div(8, 2)).to.equal(4);
        });

        it('Should return the modulo of the num1', async function () {
            const { math } = await loadFixture(deployMathUtilFixture);
            expect(await math.mod(3, 2)).to.equal(1);
        });

        it('Should return the power of the num', async function () {
            const { math } = await loadFixture(deployMathUtilFixture);
            expect(await math.pow(2, 3)).to.equal(8);
        });

        it('Should return zero if num is zero', async function () {
            const { math } = await loadFixture(deployMathUtilFixture);
            expect(await math.pow(0, 3)).to.equal(0);
        });

        it('Should return one if num is zero and exponent is zero', async function () {
            const { math } = await loadFixture(deployMathUtilFixture);
            expect(await math.pow(0, 0)).to.equal(1);
        });

        it('Should return the wei equivalent of num', async function () {
            const { math } = await loadFixture(deployMathUtilFixture);
            expect(await math.toWei(1)).to.equal(1000000000000000000n);
        });

        it('Should return the decimal equivalent of wei', async function () {
            const { math } = await loadFixture(deployMathUtilFixture);
            expect(await math.fromWei(2000000000000000000n)).to.equal(2);
        });
    });
    
});
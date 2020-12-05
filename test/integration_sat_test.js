/* eslint no-unused-vars: 0 */
/* eslint eqeqeq: 0 */

const {
  BN,
  constants,
  expectEvent,
  expectRevert,
} = require('@openzeppelin/test-helpers');

const chai = require('chai');
chai.use(require('chai-as-promised'));

const { expect, assert } = chai;

const SecurityAssetToken = artifacts.require('SecurityAssetToken');
const BondToken = artifacts.require('BondToken');
const AllowList = artifacts.require('AllowList');
const DDP = artifacts.require('DDP');
const Multisig = artifacts.require('MultiSignature');
const EURxb = artifacts.require('EURxb');
const baseURI = '127.0.0.1/';

contract('IntegrationSatTest', (accounts) => {
  const zero = accounts[0];
  const deployer = zero;
  // just after deployment the deployer is also the operator
  const operator = deployer;
  const yorick = accounts[1];
  const alice = accounts[2];
  const bob = accounts[3];
  const charlie = accounts[4];
  const diana = accounts[5];
  const eva = accounts[6];
  const frank = accounts[7];
  const george = accounts[8];
  const hannah = accounts[9];

  const ETHER_100 = web3.utils.toWei('100', 'ether');
  const ETHER_0 = web3.utils.toWei('0', 'ether');
  const DATE_SHIFT = new BN('10000000');
  const TOKEN_0 = new BN('0');
  const TOKEN_1 = new BN('1');
  const ADDRESS_ZERO = '0x0000000000000000000000000000000000000000';

  beforeEach(async () => {
    this.founders = [
      zero,
      yorick,
      alice,
      bob,
      charlie,
      diana,
      eva,
      frank,
      george,
      hannah,
    ];

    this.threshold = new BN('6');
    this.multisig = await Multisig.new(
      this.founders,
      this.threshold,
      { from: deployer },
    );

    expect(
      await this.multisig.getThreshold(),
      'threshold must be 6',
    ).to.be.bignumber.equal(new BN('6'));

    this.list = await AllowList.new(this.multisig.address, { from: deployer });
    this.bond = await BondToken.new(baseURI, { from: deployer });
    this.sat = await SecurityAssetToken.new(
      baseURI,
      this.multisig.address,
      this.bond.address,
      this.list.address,
      { from: deployer },
    );

    this.ddp = await DDP.new(this.multisig.address, { from: deployer });
    this.eurxb = await EURxb.new(this.multisig.address, { from: deployer });
    await this.eurxb.configure(this.ddp.address, { from: deployer },);

    await this.bond.configure(
      this.list.address,
      this.sat.address,
      this.ddp.address,
      { from: deployer },
    );

    await this.multisig.configure(
      this.list.address,
      this.ddp.address,
      this.sat.address,
      { from: deployer },
    );

    this.ddp.configure(
      this.bond.address,
      this.eurxb.address,
      this.list.address,
      { from: operator },
    );

    await this.multisig.allowAccount(alice);
    await this.multisig.allowAccount(bob);
  });

  it('mint success', async () => {
    const n = new BN('10000');

    for (var i = 0; i < n; i++) {
      await this.multisig.mintSecurityAssetToken(
        alice,
        ETHER_100,
        DATE_SHIFT,
        { from: operator },
      );
    }

    // await this.ddp.withdraw(TOKEN_1, { from: alice });
    // await this.multisig.burnSecurityAssetToken(TOKEN_1);

    for (var i = 2; i < n; i++) {
      await this.ddp.withdraw(new BN(i), { from: alice });
      await this.multisig.burnSecurityAssetToken(new BN(i));
    }
  });
});

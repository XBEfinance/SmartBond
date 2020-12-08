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

const { increaseTime, currentTimestamp, DAY } = require('./common');

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
  const MATURITY_LONG = new BN('10000000');
  const MATURITY_SHORT = new BN('100');
  const TOKEN_1 = new BN('1');
  const TOKEN_2 = new BN('2');

  const FOUNDERS = [
    yorick,
    alice,
    bob,
    charlie,
    diana,
    eva,
    frank,
    george,
    hannah,
  ]; // 9 users

  const USERS_COUNT = new BN(FOUNDERS.length);
  const THRESHOLD = new BN('6');

  const SAT_VALUE = ETHER_100;
  const BOND_VALUE = (new BN(SAT_VALUE)).mul(new BN('3')).div(new BN('4'));

  async function burnSat(self, tokenId, user) {
    await self.ddp.withdraw(tokenId, { from: user });
    await self.multisig.burnSecurityAssetToken(tokenId, { from: operator });
  }

  async function mintSat(self, user, value, maturity) {
    await self.multisig.mintSecurityAssetToken(
      user,
      value,
      maturity,
      { from: operator },
    );
  }

  async function approveForAll(self, owner, oper) {
    await self.sat.setApprovalForAll(oper, true, { from: owner });
  }

  async function approve(self, tokenId, from, to) {
    await self.sat.approve(to, tokenId, { from: from });
  }

  async function transferToken(self, tokenId, from, to) {
    await self.sat.approve(to, tokenId, { from: from });
    await self.multisig.transferSecurityAssetToken(
      from,
      to,
      tokenId,
      { from: operator },
    );
  }

  beforeEach(async () => {
    this.multisig = await Multisig.new(
      FOUNDERS,
      THRESHOLD,
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
    await this.eurxb.configure(this.ddp.address, { from: deployer });

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
    await this.multisig.allowAccount(charlie);
    await this.multisig.allowAccount(diana);
  });

  it('mint and then burn success', async () => {
    await mintSat(this, alice, ETHER_100, MATURITY_LONG);
    await burnSat(this, TOKEN_1, alice);
  });

  it('mint to several different users', async () => {
    for (const user of FOUNDERS) {
      await this.multisig.allowAccount(user);
      await mintSat(this, user, ETHER_100, MATURITY_LONG);

      expect(
        new BN(await this.eurxb.balanceOf(user)),
        'wrong user balance',
      ).to.be.bignumber.equal(BOND_VALUE); // same value as bond
    }

    expect(
      await this.sat.totalValue(),
      'sat total is wrong',
    ).to.be.bignumber.equal((new BN(SAT_VALUE)).mul(USERS_COUNT));

    expect(
      await this.bond.totalValue(),
      'wrong bond total value',
    ).to.be.bignumber.equal((new BN(BOND_VALUE)).mul(USERS_COUNT));

    expect(
      await this.eurxb.totalSupply(),
      'wrong eurxb total value',
    ).to.be.bignumber.equal((new BN(BOND_VALUE)).mul(USERS_COUNT));
  });

  it('mint 100 tokens', async () => {
    const n = new BN('100');

    for (let i = 0; i < n; i++) {
      await mintSat(this, alice, ETHER_100, MATURITY_LONG);
    }

    for (let i = 2; i < n; i++) {
      await burnSat(this, new BN(i), alice);
    }

    await burnSat(this, TOKEN_1, alice);
  });

  it('single transfer success', async () => {
    assert(!await this.bond.hasToken(TOKEN_1), 'token 0 does not exist');
    await mintSat(this, alice, ETHER_100, MATURITY_LONG);
    expect(await this.sat.ownerOf(TOKEN_1), 'owner must be alice').equal(alice);
    await approve(this, TOKEN_1, alice, bob);
    await transferToken(this, TOKEN_1, alice, bob);
    expect(await this.sat.ownerOf(TOKEN_1), 'owner must be bob').equal(bob);
  });

  it('transfer approved for all success', async () => {
    assert(!await this.bond.hasToken(TOKEN_1), 'token 0 does not exist');
    await mintSat(this, alice, ETHER_100, MATURITY_LONG);
    expect(await this.sat.ownerOf(TOKEN_1), 'owner must be alice').equal(alice);

    assert(!await this.bond.hasToken(TOKEN_2), 'token 1 does not exist');
    await mintSat(this, alice, ETHER_100, MATURITY_LONG);
    expect(await this.sat.ownerOf(TOKEN_2), 'owner must be alice').equal(alice);

    await approveForAll(this, alice, bob);
    await transferToken(this, TOKEN_1, alice, bob);
    await transferToken(this, TOKEN_2, alice, bob);

    expect(await this.sat.ownerOf(TOKEN_1), 'owner must be bob').equal(bob);
    expect(await this.sat.ownerOf(TOKEN_2), 'owner must be bob').equal(bob);
  });

  it('withdraw before maturity ends', async () => {
    await mintSat(this, alice, ETHER_100, MATURITY_LONG);
    assert(await this.bond.hasToken(TOKEN_1), 'bond token 0 exists');
    expect(await this.sat.ownerOf(TOKEN_1), 'alice owns sat token 0').equal(alice);

    await this.ddp.withdraw(TOKEN_1, { from: alice });

    expect(await this.sat.ownerOf(TOKEN_1), 'alice still owns sat token 0').equal(alice);
    assert(!await this.bond.hasToken(TOKEN_1), 'token 0 was burned');

    await this.multisig.burnSecurityAssetToken(TOKEN_1, { from: operator });
    await expectRevert(
      this.sat.ownerOf(TOKEN_1),
      'owner query for nonexistent token',
    );
  });

  it('withdraw different user not enough eurxb failure', async () => {
    await this.multisig.setClaimPeriod(MATURITY_SHORT, { from: operator });
    await mintSat(this, alice, ETHER_100, MATURITY_SHORT);

    // bob has no eurxb

    await increaseTime(2 * DAY);

    await expectRevert(
      this.ddp.withdraw(TOKEN_1, { from: bob }),
      'not enough EURxb to withdraw',
    );
  });

  it('withdraw different user before maturity ended failure', async () => {
    await this.multisig.setClaimPeriod(MATURITY_LONG, { from: operator });
    await mintSat(this, alice, ETHER_100, MATURITY_LONG);
    await this.eurxb.transfer(bob, BOND_VALUE, { from: alice }); // give bob money

    await expectRevert(
      this.ddp.withdraw(TOKEN_1, { from: bob }),
      'claim period is not finished yet',
    );
  });

  it('withdraw different user after claim period ended', async () => {
    await this.multisig.setClaimPeriod(MATURITY_SHORT, { from: operator });
    await mintSat(this, alice, ETHER_100, MATURITY_SHORT);
    await this.eurxb.transfer(bob, BOND_VALUE, { from: alice }); // give bob money

    await increaseTime(2 * DAY);

    await this.ddp.withdraw(TOKEN_1, { from: bob });
  });

  // takes 3 hours, do not uncomment if not absolutely necessarily
  // it('mint stress test success', async () => {
  //   const n = new BN('10000');
  //
  //   for (var i = 0; i < n; i++) {
  //     await mintSat(this, alice, ETHER_100, MATURITY_LONG);
  //   }
  //
  //   for (var i = 2; i < n; i++) {
  //     await burnSat(this, new BN(i), alice);
  //   }
  // });
});

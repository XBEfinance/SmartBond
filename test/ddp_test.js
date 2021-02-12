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
const EURxb = artifacts.require('EURxbMock');
const baseURI = '127.0.0.1/';

contract('DDPTest', (accounts) => {
  const multisig = accounts[1];
  const alice = accounts[2];
  const bob = accounts[3];

  const ETHER_100 = web3.utils.toWei('100', 'ether');
  const ETHER_0 = web3.utils.toWei('0', 'ether');
  const DATE_SHIFT = new BN('10000');
  const TOKEN_1 = new BN('1');
  const TOKEN_2 = new BN('2');

  beforeEach(async () => {
    this.list = await AllowList.new(multisig);
    this.bond = await BondToken.new(baseURI);
    this.sat = await SecurityAssetToken
      .new(baseURI,
        multisig,
        this.bond.address,
        this.list.address);

    this.ddp = await DDP.new(multisig);

    await this.bond.configure(this.list.address, this.sat.address, this.ddp.address);

    this.eurxb = await EURxb.new();

    await this.ddp.configure(
      this.bond.address,
      this.eurxb.address,
      this.list.address,
    );
  });

  it('mint and deposit success', async () => {
    await this.list.allowAccount(alice, { from: multisig });

    assert(!await this.bond.hasToken(TOKEN_1),
      'bond token must not exist at this time point');

    const { tx } = await this.sat.mint(alice, ETHER_100, DATE_SHIFT, { from: multisig });
    assert(await this.bond.hasToken(TOKEN_1), 'Bond token 0 must be created');

    // check bond info
    const { value, interest } = await this.bond.getTokenInfo(TOKEN_1);

    const expectedValue = (new BN(ETHER_100)).mul(new BN('75')).div(new BN('100'));
    expect(value, 'wrong bond value')
      .to.be.bignumber.equal(expectedValue);

    const expectedInterest = value
      .mul(new BN('7')).div(new BN('365').mul(new BN('8640000')));
    expect(interest, 'wrong interest value')
      .to.be.bignumber.equal(expectedInterest);

    // check eurxb value minted
    expectEvent
      .inTransaction(
        tx,
        this.eurxb,
        'MintInvoked',
        { account: alice, value: value },
      );

    expect(
      (await this.eurxb.balanceOf(alice)),
      'wrong balance',
    ).to.be.bignumber.equal(value);
  });

  it('check non-bond deposit caller fails', async () => {
    await this.list.allowAccount(alice, { from: multisig });

    await expectRevert(
      this.ddp.deposit(
        TOKEN_1,
        ETHER_100,
        DATE_SHIFT,
        alice,
        { from: bob },
      ),
      'caller is not allowed to deposit',
    );
  });

  it('owner withdraw success', async () => {
    await this.list.allowAccount(alice, { from: multisig });

    assert(!await this.bond.hasToken(TOKEN_1),
      'bond token must not exist at this time point');

    await this.sat.mint(alice, ETHER_100, DATE_SHIFT, { from: multisig });

    assert(await this.bond.hasToken(TOKEN_1), 'bond token was not created');

    expect(await this.eurxb.balanceOf(alice), 'withdrawn account must be zero')
      .to.be.bignumber.equal(
        (new BN(ETHER_100)).mul(new BN('75')).div(new BN('100')),
      );

    await this.ddp.withdraw(TOKEN_1, { from: alice });

    expect(await this.eurxb.balanceOf(alice), 'withdrawn account must be zero')
      .to.be.bignumber.equal(new BN('0'));

    assert(!(await this.bond.hasToken(TOKEN_1)), 'bond token was not burned');
  });

  it('owner withdraw fail not enough funds', async () => {
    await this.list.allowAccount(alice, { from: multisig });

    assert(!await this.bond.hasToken(TOKEN_1),
      'bond token must not exist at this time point');

    await this.sat.mint(alice, ETHER_100, DATE_SHIFT, { from: multisig });

    const halfAmount = (new BN(ETHER_100))
      .mul(new BN('75')).div(new BN('100')).div(new BN('2'));

    await this.eurxb.burn(alice, halfAmount);
    expect(await this.eurxb.balanceOf(alice), 'wrong amount value')
      .to.be.bignumber.equal(halfAmount);

    await expectRevert(
      this.ddp.withdraw(TOKEN_1, { from: alice }),
      'not enough EURxb to withdraw',
    );
  });

  // TODO: maybe implement later
  // it('user withdraw fail maturity not completed', async () => {
  // });

  it('user withdraw fail user not allowed (KYC)', async () => {
    await this.list.allowAccount(alice, { from: multisig });

    assert(!await this.bond.hasToken(TOKEN_1),
      'bond token must not exist at this time point');

    await this.sat.mint(alice, ETHER_100, DATE_SHIFT, { from: multisig });

    await expectRevert(
      this.ddp.withdraw(TOKEN_1, { from: bob }),
      'user is not allowed',
    );
  });
});

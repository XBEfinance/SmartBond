/* eslint no-unused-vars: 0 */
/* eslint eqeqeq: 0 */

const {
  BN,
  constants,
  expectEvent,
  expectRevert,
} = require('@openzeppelin/test-helpers');
const { default: BigNumber } = require('bignumber.js');

const chai = require('chai');
chai.use(require('chai-as-promised'));
// chai.use(require('chai-bignumber')(BN));

const { expect, assert } = chai;

const SecurityAssetToken = artifacts.require('SecurityAssetToken');
const BondToken = artifacts.require('BondToken');
const AllowList = artifacts.require('AllowList');
const DDP = artifacts.require('DDPMock');
const BondBurnerHelper = artifacts.require('BondBurnerHelper');
const baseURI = '127.0.0.1/';

contract('BondTokenTest', (accounts) => {
  const miris = accounts[1];
  const alice = accounts[2];
  const bob = accounts[3];

  const ETHER_100 = web3.utils.toWei('100', 'ether');
  const ETHER_0 = web3.utils.toWei('0', 'ether');
  const DATE_SHIFT = new BN('10000');
  const TOKEN_0 = '0';
  const TOKEN_1 = '1';

  beforeEach(async () => {
    this.list = await AllowList.new(miris);
    this.bond = await BondToken.new(miris, baseURI, this.list.address);
    this.sat = await SecurityAssetToken
      .new(baseURI,
        miris,
        this.bond.address,
        this.list.address);

    this.ddp = await DDP.new(this.bond.address);
    await this.bond.configure(this.sat.address, this.ddp.address, { from: miris });
    this.burnHelper = await BondBurnerHelper.new(this.bond.address);
  });

  // just mint sat, which mints bond and check token info
  it('mint new SAT and Bond tokens', async () => {
    await this.list.allowAccount(alice, { from: miris });
    assert(!await this.bond.hasToken(TOKEN_0),
      'bond token must not exist at this time point');

    await this.sat.mint(alice, ETHER_100, DATE_SHIFT, { from: miris });
    assert(await this.bond.hasToken(TOKEN_0), 'Bond token 0 must be created');
    // check bond info
    const { value, interest } = await this.bond.getTokenInfo(TOKEN_0);
    const expectedValue = (new BN(ETHER_100)).mul(new BN('75')).div(new BN('100'));
    expect(value.toString(), 'wrong bond value')
      .equal(expectedValue.toString());

    const expectedInterest = value
      .mul(new BN('7')).div(new BN('365').mul(new BN('8640000')));
    expect(interest.toString(), 'wrong interest value')
      .equal(expectedInterest.toString());
  });

  // ensure that mint bond invokes ddp.deposit()
  it('during mint ddp.deposit() is invoked', async () => {
    await this.list.allowAccount(alice, { from: miris });
    assert(!await this.bond.hasToken(TOKEN_0),
      'bond token must not exist at this time point');

    const { tx } = await this.sat.mint(alice, ETHER_100, DATE_SHIFT, { from: miris });
    const { value, interest, maturity } = await this.bond.getTokenInfo(TOKEN_0);

    expectEvent
      .inTransaction(
        tx,
        this.ddp,
        'DepositInvoked',
        { tokenId: TOKEN_0, value: value.toString(), maturityEnds: maturity.toString() },
      );
  });

  it('id of new token increases', async () => {
    await this.list.allowAccount(alice, { from: miris });
    assert(!await this.bond.hasToken(TOKEN_0),
      'bond token must not exist at this time point');
    assert(!await this.bond.hasToken(TOKEN_1),
      'bond token must not exist at this time point');

    await this.sat.mint(alice, ETHER_100, DATE_SHIFT, { from: miris });
    assert(await this.bond.hasToken(TOKEN_0), 'Bond token 0 must be created');
    await this.sat.mint(alice, ETHER_100, DATE_SHIFT, { from: miris });
    assert(await this.bond.hasToken(TOKEN_1), 'Bond token 0 must be created');
  });

  it('Bond burn success', async () => {
    await this.list.allowAccount(alice, { from: miris });
    await this.sat.mint(alice, ETHER_100, DATE_SHIFT, { from: miris });
    assert(await this.bond.hasToken(TOKEN_0), 'Bond token 0 must be created');
    await this.ddp.burnToken(TOKEN_0);
    assert(!await this.bond.hasToken(TOKEN_0));
  });

  it('Non-burner cannot burn', async () => {
    await this.list.allowAccount(alice, { from: miris });
    await this.sat.mint(alice, ETHER_100, DATE_SHIFT, { from: miris });
    assert(await this.bond.hasToken(TOKEN_0), 'Bond token 0 must be created');
    await expectRevert(
      this.burnHelper.burnToken(TOKEN_0),
      'user is not allowed to burn tokens',
    );
  });

  it('total value increases after mint and decreases after burn', async () => {
    const value1 = (new BN(ETHER_100)).mul(new BN('75')).div(new BN('100'));
    const value2 = (new BN(ETHER_100)).mul(new BN('150')).div(new BN('100'));

    await this.list.allowAccount(alice, { from: miris });

    expect((await this.bond.totalValue()).toString(), 'wrong total value')
      .equal(ETHER_0);

    await this.sat.mint(alice, ETHER_100, DATE_SHIFT, { from: miris });
    expect((await this.bond.totalValue()).toString(), 'wrong total value')
      .equal(value1.toString());

    await this.sat.mint(alice, ETHER_100, DATE_SHIFT, { from: miris });
    expect((await this.bond.totalValue()).toString(), 'wrong total value')
      .equal(value2.toString());

    await this.ddp.burnToken(TOKEN_0);
    expect((await this.bond.totalValue()).toString(), 'wrong total value')
      .equal(value1.toString());

    await this.ddp.burnToken(TOKEN_1);
    expect((await this.bond.totalValue()).toString(), 'wrong total value')
      .equal(ETHER_0.toString());
  });

  it('transfer success', async () => {
    await this.list.allowAccount(alice, { from: miris });
    await this.list.allowAccount(bob, { from: miris });

    assert(!await this.bond.hasToken(TOKEN_0),
      'bond token must not exist at this time point');

    await this.sat.mint(alice, ETHER_100, DATE_SHIFT, { from: miris });
    assert(await this.bond.hasToken(TOKEN_0), 'Bond token 0 must be created');

    const { tx } = await this.ddp.callTransfer(alice, bob, TOKEN_0);
    expectEvent.inTransaction(
      tx,
      this.bond,
      'Transfer',
      { from: alice, to: bob, tokenId: TOKEN_0 },
    );
  });
});

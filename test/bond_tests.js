/* eslint no-unused-vars: 0 */
/* eslint eqeqeq: 0 */

const { assert } = require('chai');
const { time, BN, expectRevert } = require('openzeppelin-test-helpers');
const expectEvent = require('openzeppelin-test-helpers/src/expectEvent');

const SecurityAssetToken = artifacts.require('SecurityAssetToken');
const BondToken = artifacts.require('BondToken');
const AllowList = artifacts.require('AllowList');
const DDP = artifacts.require('DDPMock');
const baseURI = '127.0.0.1/';

contract('BondTokenTest', (accounts) => {
  const miris = accounts[1];
  const alice = accounts[2];
  const bob = accounts[3];

  const ETHER_100 = web3.utils.toWei('100', 'ether');
  const ETHER_0 = web3.utils.toWei('0', 'ether');
  const DATE_SHIFT = new BN('10000');
  const TOKEN_0 = new BN('0');
  const TOKEN_1 = new BN('1');

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
  });

  // just mint sat, which mints bond and check token info
  it('mint new SAT and Bond tokens', async () => {
    await this.list.allowAccount(alice, { from: miris });
    assert(!await this.bond.hasToken(TOKEN_0),
      'bond token must not exist at this time point');

    await this.sat.mint(alice, ETHER_100, DATE_SHIFT, { from: miris });
    assert(await this.bond.hasToken(TOKEN_0), 'Bond token 0 must be created');
    // check bond info
    const value = await this.bond.getTokenValue(TOKEN_0);
    const expectedValue = (new BN(ETHER_100)).mul(new BN('75')).div(new BN('100'));
    assert(value.toString() == expectedValue.toString(), 'bond token has wrong value');
    // TODO: find out why BN == BN doesn't work

    const ips = value
      .mul(new BN('7'))
      .div(new BN('365').mul(new BN('8640000')));
    const tokenIps = await this.bond.getTokenInterestPerSec(TOKEN_0);
    assert(ips.toString() == tokenIps.toString(), 'bond token has wrong ips');

    // cannot check maturity ends right now
    // let maturityEnds = now.add(maturity);
    // let tokenMaturityEnds = await this.bond.getTokenMaturityEnds(TOKEN_0);
    // assert(maturityEnds.toString() == tokenMaturityEnds.toString(),
    //   "bond token has wrong maturity");
  });

  // ensure that mint bond invokes ddp.deposit()
  it('during mint ddp.deposit() is invoked', async () => {
    await this.list.allowAccount(alice, { from: miris });
    assert(!await this.bond.hasToken(TOKEN_0),
      'bond token must not exist at this time point');

    const { tx } = await this.sat.mint(alice, ETHER_100, DATE_SHIFT, { from: miris });
    const value = await this.bond.getTokenValue(TOKEN_0);
    const tokenIps = await this.bond.getTokenInterestPerSec(TOKEN_0);
    const tokenMaturityEnds = await this.bond.getTokenMaturityEnd(TOKEN_0);

    expectEvent
      .inTransaction(
        tx,
        this.ddp,
        'DepositInvoked',
        { tokenId: TOKEN_0, value: value, maturityEnds: tokenMaturityEnds },
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

  // it('non-burner cannot burn', async() => {
  //   // TODO: implement
  // });

  // it('total value increases and decreases', async() => {
  //   // TODO: implement
  // });

  it('transfer success', async () => {
    await this.list.allowAccount(alice, { from: miris });
    await this.list.allowAccount(bob, { from: miris });

    assert(!await this.bond.hasToken(TOKEN_0),
      'bond token must not exist at this time point');

    await this.sat.mint(alice, ETHER_100, DATE_SHIFT, { from: miris });
    assert(await this.bond.hasToken(TOKEN_0), 'Bond token 0 must be created');
    // TODO: fix
    const { tx } = await this.ddp.callTransfer(alice, bob, TOKEN_0);
    expectEvent.inTransaction(
      tx,
      this.bond,
      'Transfer',
      { from: alice, to: bob, tokenId: TOKEN_0 },
    );
  });
});

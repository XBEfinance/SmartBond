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

const { expect, assert } = chai;

const SecurityAssetToken = artifacts.require('SecurityAssetToken');
const BondToken = artifacts.require('BondToken');
const AllowList = artifacts.require('AllowList');
const DDP = artifacts.require('DDP');
const EURxb = artifacts.require('EURxbMock');
const baseURI = '127.0.0.1/';

contract('DDPTest', (accounts) => {
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
      this.bond = await BondToken.new(miris, baseURI  , this.list.address);
      this.sat = await SecurityAssetToken
        .new(baseURI,
          miris,
          this.bond.address,
          this.list.address);
  
      this.ddp = await DDP.new(miris);

      await this.bond.configure(this.sat.address, this.ddp.address, { from: miris });

      this.eurxb = await EURxb.new();

      await this.ddp.configure(
        this.bond.address,
        this.eurxb.address,
        this.list.address,
        { from: miris });
    });

  it('check deposit success', async () => {
    await this.list.allowAccount(alice, { from: miris });

    assert(!await this.bond.hasToken(TOKEN_0),
      'bond token must not exist at this time point');

    const { tx } = await this.sat.mint(alice, ETHER_100, DATE_SHIFT, { from: miris });
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

    
    // check eurxb value minted
    expectEvent
      .inTransaction(
        tx,
        this.eurxb,
        'MintInvoked',
        { account: alice, value: value.toString() },
      );

  });

  it('check non-bond deposit caller fails', async () => {
    // expect.fail("not implemented yet");
  });

//   it('check withdraw', async () => {
//     expect.fail("not implemented yet");
//   });
});

/* eslint no-unused-vars: 0 */
const { assert } = require('chai');
const { BN, expectRevert } = require('openzeppelin-test-helpers');

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

    this.ddp = await DDP.new();
    await this.bond.configure(this.sat.address, this.ddp.address, { from: miris });
  });

  // ----------- check minting -----------

  it('mint new SAT and Bond tokens', async () => {
    await this.list.allowAccount(alice, { from: miris });
    assert(!await this.bond.hasToken(TOKEN_0),
      'bond token must not exist at this time point');

    await this.sat.mint(alice, ETHER_100, DATE_SHIFT, { from: miris });
    assert(await this.bond.hasToken(TOKEN_0),
      'Bond token `0` must has being created');
  });
});

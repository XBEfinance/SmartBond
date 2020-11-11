
const {assert} = require('chai');
const {time, BN, expectRevert, expectEvent} =
    require('openzeppelin-test-helpers');

const SecurityAssetToken = artifacts.require('SecurityAssetToken');
const BondToken = artifacts.require('NFBondTokenMock');
const util = artifacts.require('StringUtil');
const roles = artifacts.require('TokenAccessRoles');

const baseURI = "127.0.0.1/";

contract('SecurityAssetTokenTest', accounts => {
  const miris = accounts[1];
  const alice = accounts[2];
  const bob = accounts[3];

  beforeEach(async () => {
    this.bond = await BondToken.new();
    this.sat = await SecurityAssetToken.new(baseURI, miris, this.bond.address);
  });

  // ----------- check allow list management -----------

  it('check miris is allow list administrator',
     async () => { await this.sat.allowAccount(alice, {from : miris}); });

  it('check empty list', async () => {
    assert(!await this.sat.isAllowedAccount(alice),
           "alice must not be in the list in the beginning");
  });

  it('only administrator can allow account', async () => {
    assert(!await this.sat.isAllowedAccount(alice),
           "alice must not be in the list in the beginning");
    expectRevert(this.sat.allowAccount(alice, {from : bob}),
                 'only administrator can modify allow list');
  });

  it('add account', async () => {
    assert(!await this.sat.isAllowedAccount(alice),
           "alice must not be in the list in the beginning");
    await this.sat.allowAccount(alice, {from : miris});
    assert(await this.sat.isAllowedAccount(alice),
           "now the list should have alice");
  });

  it('only administrator can disallow account', async () => {
    assert(!await this.sat.isAllowedAccount(alice),
           "alice must not be in the list in the beginning");
    await this.sat.allowAccount(alice, {from : miris});
    expectRevert(this.sat.allowAccount(alice, {from : bob}),
                 'only administrator can modify allow list');
  });

  it('disallow account', async () => {
    assert(!await this.sat.isAllowedAccount(alice),
           "alice must not be in the list in the beginning");
    await this.sat.allowAccount(alice, {from : miris});
    assert(await this.sat.isAllowedAccount(alice),
           "now the list should have alice");
    await this.sat.disallowAccount(alice, {from : miris});
    assert(!await this.sat.isAllowedAccount(alice),
           "alice must have been removed");
  });

  // ----------- check minting -----------

  it('mint new SAT and Bond tokens', async () => {
    await this.sat.allowAccount(alice, {from : miris});
    assert(!await this.bond.hasToken("1"),
           'bond token must not exist at this time point');

    const {receipt} =
        await this.sat.mint(alice, "1", "100", "100", {from : miris});
    expectEvent.inTransaction(receipt.transactionHash, this.sat,
                              'SecurityAssetTokenMinted', {
                                to : alice,
                                tokenId : new BN('1'),
                                value : new BN('100'),
                                maturity : new BN('100'),
                              });
    assert(await this.bond.hasToken("1"),
           'Bond token `1` must has being created');
  });

  it('minting is not allowed for account not in allow list', async () => {
    await expectRevert(this.sat.mint(alice, "1", "100", "100", {from : miris}),
                       'user is not allowed to get tokens');
  });

  // ----------- check burning -----------

  it('burning SAT is not allowed for non-miris account', async () => {
    await this.sat.allowAccount(alice, {from : miris});
    await this.sat.mint(alice, "1", "100", "100", {from : miris});
    await this.bond.burn("1");
    // owner cannot burn his token either
    await expectRevert(this.sat.burn("1", {from : alice}),
                       'sender is not allowed to burn SAT tokens');
  });

  it('burning SAT is not allowed when corresponding Bond is still alive',
     async () => {
       await this.sat.allowAccount(alice, {from : miris});
       await this.sat.mint(alice, "1", "100", "100", {from : miris});
       assert(await this.bond.hasToken("1"), "bond token doesn't exist");
       expectRevert(this.sat.burn("1", {from : miris}),
                    'bond token is still alive');
     });

  it('burn SAT', async () => {
    await this.sat.allowAccount(alice, {from : miris});
    await this.sat.mint(alice, "1", "100", "100", {from : miris});
    await this.bond.burn("1");
    assert(!await this.bond.hasToken("1"), "bond token was not burned");
    const {receipt} = await this.sat.burn("1", {from : miris});
    expectEvent.inTransaction(receipt.transactionHash, this.sat,
                              'SecurityAssetTokenBurned', "1");
  });

  // ----------- check transfers -----------
  it('transfer token from alice to bob', async () => {
    await this.sat.allowAccount(alice, {from : miris});
    await this.sat.allowAccount(bob, {from: miris});

    await this.sat.mint(alice, "1", "100", "100", {from : miris});
    await this.sat.approve(bob, "1", {from: alice});
    await this.sat.transferFrom(alice, bob, "1", {from: miris});
  });

  // ----------- check total value -----------
  it('total value = 0 in the beginning', async () => {
    assert(await this.sat.totalValue() == '0',
           "total value is not 0 in the beginning");
    await this.sat.allowAccount(alice, {from : miris});
    await this.sat.mint(alice, "1", "100", "100", {from : miris});
  });

  it('total value increases after minting', async () => {
    assert(await this.sat.totalValue() == '0',
           "total value is not 0 in the beginning");
    await this.sat.allowAccount(alice, {from : miris});
    await this.sat.mint(alice, "1", "100", "100", {from : miris});
    assert(await this.sat.totalValue() == "100",
           "total value is wrong after minting");
  });

  it('total value decreases after burning', async () => {
    assert(await this.sat.totalValue() == '0',
           "total value is not 0 in the beginning");
    await this.sat.allowAccount(alice, {from : miris});
    await this.sat.mint(alice, "1", "100", "100", {from : miris});
    assert(await this.sat.totalValue() == "100",
           "total value is wrong after minting");
    await this.bond.burn("1");
    assert(!await this.bond.hasToken("1"), "bond token was not burned");
    const {receipt} = await this.sat.burn("1", {from : miris});
    assert(await this.sat.totalValue() == 0, "total value must be 0 again");
  });
});

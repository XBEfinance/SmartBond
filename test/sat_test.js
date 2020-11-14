const {assert} = require('chai');
const {time, BN, expectRevert } =
    require('openzeppelin-test-helpers');

const SecurityAssetToken = artifacts.require('SecurityAssetToken');
const BondToken = artifacts.require('NFBondTokenMock');

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

  it('check miris is allow list admin',
     async () => { await this.sat.allowAccount(alice, {from : miris}); });

  it('check empty list', async () => {
    assert(!await this.sat.isAllowedAccount(alice),
           "alice must not be in the list in the beginning");
  });

  it('only admin can allow account', async () => {
    assert(!await this.sat.isAllowedAccount(alice),
           "alice must not be in the list in the beginning");
    expectRevert(this.sat.allowAccount(alice, {from : bob}),
                 'sender isn\'t a admin');
  });

  it('add account', async () => {
    assert(!await this.sat.isAllowedAccount(alice),
           "alice must not be in the list in the beginning");
    await this.sat.allowAccount(alice, {from : miris});
    assert(await this.sat.isAllowedAccount(alice),
           "now the list should have alice");
  });

  it('only admin can disallow account', async () => {
    assert(!await this.sat.isAllowedAccount(alice),
           "alice must not be in the list in the beginning");
    await this.sat.allowAccount(alice, {from : miris});
    expectRevert(this.sat.allowAccount(alice, {from : bob}),
                 'sender isn\'t a admin');
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

    await this.sat.mint(alice, "1", "100", "100", {from : miris});
    assert(await this.bond.hasToken("1"),
           'Bond token `1` must has being created');
  });

  it('minting is not allowed for account not in allow list', async () => {
    await expectRevert(this.sat.mint(alice, "1", "100", "100", {from : miris}),
                       'user is not allowed to receive tokens');
  });

  // ----------- check burning -----------

  it('burning SAT is not allowed for non-miris account', async () => {
    await this.sat.allowAccount(alice, {from : miris});
    await this.sat.mint(alice, "1", "100", "100", {from : miris});
    await this.bond.burn("1");
    // owner cannot burn his token either
    await expectRevert(this.sat.burn("1", {from : alice}),
                       'sender isn\'t a burner');
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
    await this.sat.burn("1", {from : miris});
  });

  // ----------- check transfers -----------
  it('transfer token from alice to bob (single approval)', async () => {
    await this.sat.allowAccount(alice, {from : miris});
    await this.sat.allowAccount(bob, {from : miris});

    await this.sat.mint(alice, new BN('1'), new BN('100'), new BN('100'),
                        {from : miris});
    await this.sat.approve(bob, new BN('1'), {from : alice});
    await this.sat.transferFrom(alice, bob, new BN('1'), {from : miris});
  });

  it('transfer token from alice to bob (approve for all)', async () => {
    await this.sat.allowAccount(alice, {from : miris});
    await this.sat.allowAccount(bob, {from : miris});

    await this.sat.mint(alice, new BN('1'), new BN('100'), new BN('100'),
                        {from : miris});
    await this.sat.setApprovalForAll(bob, true, {from : alice});
    await this.sat.transferFrom(alice, bob, new BN('1'), {from : miris});
  });

  it('transfer token from alice to bob: no approval failure', async () => {
    await this.sat.allowAccount(alice, {from : miris});
    await this.sat.allowAccount(bob, {from : miris});

    await this.sat.mint(alice, new BN('1'), new BN('100'), new BN('100'),
                        {from : miris});
    expectRevert(this.sat.transferFrom(alice, bob, new BN('1'), {from : miris}),
                 "transfer was not approved");
  });

  it('transfer token from alice to bob: no transferer role failure ',
     async () => {
       await this.sat.allowAccount(alice, {from : miris});
       await this.sat.allowAccount(bob, {from : miris});

       await this.sat.mint(alice, new BN('1'), new BN('100'), new BN('100'),
                           {from : miris});
       await this.sat.setApprovalForAll(bob, true, {from : alice});
       expectRevert(
           this.sat.transferFrom(alice, bob, new BN('1'), {from : alice}),
           "sender isn\'t a transferer");
     });

  it('transfer token from alice to bob: not allowed account failure ',
     async () => {
       await this.sat.allowAccount(alice, {from : miris});
       await this.sat.mint(alice, new BN('1'), new BN('100'), new BN('100'),
                           {from : miris});
       await this.sat.setApprovalForAll(bob, true, {from : alice});
       expectRevert(
           this.sat.transferFrom(alice, bob, new BN('1'), {from : miris}),
           "user is not allowed to receive tokens");
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

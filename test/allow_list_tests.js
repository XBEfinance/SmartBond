const {assert} = require('chai');
const {time, BN, expectRevert} = require('openzeppelin-test-helpers');

const AllowList = artifacts.require('AllowLIst');

const baseURI = '127.0.0.1/';

contract('AllowListTest', (accounts) => {
  const miris = accounts[1];
  const alice = accounts[2];
  const bob = accounts[3];

  beforeEach(async () => {
    this.allowList = await AllowList.new(miris);
  });

  // ----------- check allow list management -----------

  it('check miris is allow list admin',
     async () => { await this.allowList.allowAccount(alice, {from : miris});
  });

  it('check empty list', async () => {
    assert(!await this.allowList.isAllowedAccount(alice), "alice must not be in the list in the beginning");
  });

  it('only admin can allow account', async () => {
    assert(!await this.allowList.isAllowedAccount(alice), "alice must not be in the list in the beginning");
    expectRevert(this.allowList.allowAccount(alice, {from : bob}), 'sender isn\'t a admin');
  });

  it('add account', async () => {
    assert(!await this.allowList.isAllowedAccount(alice), "alice must not be in the list in the beginning");
    await this.allowList.allowAccount(alice, {from : miris});
    assert(await this.allowList.isAllowedAccount(alice), "now the list should have alice");
  });

  it('only admin can disallow account', async () => {
    assert(!await this.allowList.isAllowedAccount(alice),
           "alice must not be in the list in the beginning");
    await this.allowList.allowAccount(alice, {from : miris});
    expectRevert(this.allowList.allowAccount(alice, {from : bob}),
                 'sender isn\'t a admin');
  });

  it('disallow account', async () => {
    assert(!await this.allowList.isAllowedAccount(alice),
           "alice must not be in the list in the beginning");
    await this.allowList.allowAccount(alice, {from : miris});
    assert(await this.allowList.isAllowedAccount(alice),
           "now the list should have alice");
    await this.allowList.disallowAccount(alice, {from : miris});
    assert(!await this.allowList.isAllowedAccount(alice),
           "alice must have been removed");
  });
});

const { assert } = require('chai');
const { expectRevert } = require('openzeppelin-test-helpers');

const AllowList = artifacts.require('AllowList');

contract('AllowListTest', (accounts) => {
  const miris = accounts[1];
  const alice = accounts[2];
  const bob = accounts[3];

  beforeEach(async () => {
    this.list = await AllowList.new(miris);
  });

  it('check miris is allow list admin', async () => {
    await this.list.allowAccount(alice, { from: miris });
  });

  it('check empty list', async () => {
    assert(
      !(await this.list.isAllowedAccount(alice)),
      'alice must not be in the list in the beginning',
    );
  });

  it('only admin can allow account', async () => {
    assert(
      !(await this.list.isAllowedAccount(alice)),
      'alice must not be in the list in the beginning',
    );
    expectRevert(
      this.list.allowAccount(alice, { from: bob }),
      'Ownable: caller is not the owner',
    );
  });

  it('add account', async () => {
    assert(
      !(await this.list.isAllowedAccount(alice)),
      'alice must not be in the list in the beginning',
    );
    await this.list.allowAccount(alice, { from: miris });
    assert(
      await this.list.isAllowedAccount(alice),
      'now the list should have alice',
    );
  });

  it('only admin can disallow account', async () => {
    assert(
      !(await this.list.isAllowedAccount(alice)),
      'alice must not be in the list in the beginning',
    );
    await this.list.allowAccount(alice, { from: miris });
    expectRevert(
      this.list.allowAccount(alice, { from: bob }),
      'Ownable: caller is not the owner',
    );
  });

  it('disallow account', async () => {
    assert(
      !(await this.list.isAllowedAccount(alice)),
      'alice must not be in the list in the beginning',
    );
    await this.list.allowAccount(alice, { from: miris });
    assert(
      await this.list.isAllowedAccount(alice),
      'now the list should have alice',
    );
    await this.list.disallowAccount(alice, { from: miris });
    assert(
      !(await this.list.isAllowedAccount(alice)),
      'alice must have been removed',
    );
  });
});

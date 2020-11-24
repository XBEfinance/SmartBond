const { assert } = require('chai');
const MockLinkedList = artifacts.require('MockLinkedList');

contract('MockLinkedList', (accounts) => {
  const owner = accounts[0];
  let list;
  
  beforeEach(async () => {
      list = await MockLinkedList.new({ from: owner });
  });

  it('listExists', async () => {
      assert.equal(await list.listExists(), false);
      await list.pushBack(1, 1);
      assert.equal(await list.listExists(), true);
  });
});

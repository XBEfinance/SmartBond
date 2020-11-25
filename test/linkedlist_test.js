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

  it('get head and end', async () => {
    await list.pushBack(1, 1);
    assert.equal(await list.getHead(), 1);
    assert.equal(await list.getEnd(), 1);
  });

  it('getNodeValue', async () => {
    await list.pushBack(1, 1);
    await list.pushBack(1, 2);
    await list.pushBack(1, 3);

    const head = await list.getHead();
    let result = await list.getNodeValue(head);
    let next = result.next;
    assert.equal(result.amount, 1);
    assert.equal(result.maturityEnd, 1);
    assert.equal(result.prev, 0);
    assert.equal(next, 2);

    result = await list.getNodeValue(next);
    next = result.next;
    assert.equal(result.maturityEnd, 2);
    assert.equal(result.prev, 1);
    assert.equal(next, 3);

    let end = await list.getEnd();
    result = await list.getNodeValue(end);
    next = result.next;
    assert.equal(result.maturityEnd, 3);
    assert.equal(result.prev, 2);
    assert.equal(next, 0);
  });

  it('setHead', async () => {
    await list.pushBack(1, 1);
    await list.pushBack(1, 2);
    assert.equal(await list.getHead(), 1);
    await list.setHead(2);
    assert.equal(await list.getHead(), 2);
  });

  it('pushBefore in the middle', async () => {
    await list.pushBack(1, 1);
    await list.pushBack(1, 3);

    let head = await list.getHead();
    let result = await list.getNodeValue(head);
    let next = result.next;
    assert.equal(result.maturityEnd, 1);
    assert.equal(result.prev, 0);
    assert.equal(next, 2);

    let end = await list.getEnd();
    result = await list.getNodeValue(end);
    next = result.next;
    assert.equal(result.maturityEnd, 3);
    assert.equal(result.prev, 1);
    assert.equal(next, 0);

    await list.pushBefore(2, 1, 2);

    head = await list.getHead();
    result = await list.getNodeValue(head);
    next = result.next;
    assert.equal(result.maturityEnd, 1);
    assert.equal(result.prev, 0);
    assert.equal(next, 3);

    result = await list.getNodeValue(next);
    next = result.next;
    assert.equal(result.maturityEnd, 2);
    assert.equal(result.prev, 1);
    assert.equal(next, 2);

    end = await list.getEnd();
    result = await list.getNodeValue(end);
    next = result.next;
    assert.equal(result.maturityEnd, 3);
    assert.equal(result.prev, 3);
    assert.equal(next, 0);
  });

  it('pushBefore at the beginning', async () => {
    await list.pushBack(1, 2);
    await list.pushBack(1, 3);

    let head = await list.getHead();
    let result = await list.getNodeValue(head);
    let next = result.next;
    assert.equal(result.maturityEnd, 2);
    assert.equal(result.prev, 0);
    assert.equal(next, 2);

    let end = await list.getEnd();
    result = await list.getNodeValue(end);
    next = result.next;
    assert.equal(result.maturityEnd, 3);
    assert.equal(result.prev, 1);
    assert.equal(next, 0);

    await list.pushBefore(head, 1, 1);

    head = await list.getHead();
    result = await list.getNodeValue(head);
    next = result.next;
    assert.equal(result.maturityEnd, 1);
    assert.equal(result.prev, 0);
    assert.equal(next, 1);

    result = await list.getNodeValue(next);
    next = result.next;
    assert.equal(result.maturityEnd, 2);
    assert.equal(result.prev, 3);
    assert.equal(next, 2);

    end = await list.getEnd();
    result = await list.getNodeValue(end);
    next = result.next;
    assert.equal(result.maturityEnd, 3);
    assert.equal(result.prev, 1);
    assert.equal(next, 0);
  });

  it('pushBack', async () => {
    await list.pushBack(1, 1);
    await list.pushBack(1, 2);

    let head = await list.getHead();
    let result = await list.getNodeValue(head);
    let next = result.next;
    assert.equal(result.maturityEnd, 1);
    assert.equal(result.prev, 0);
    assert.equal(next, 2);

    let end = await list.getEnd();
    result = await list.getNodeValue(end);
    next = result.next;
    assert.equal(result.maturityEnd, 2);
    assert.equal(result.prev, 1);
    assert.equal(next, 0);

    await list.pushBack(1, 3);

    head = await list.getHead();
    result = await list.getNodeValue(head);
    next = result.next;
    assert.equal(result.maturityEnd, 1);
    assert.equal(result.prev, 0);
    assert.equal(next, 2);

    result = await list.getNodeValue(next);
    next = result.next;
    assert.equal(result.maturityEnd, 2);
    assert.equal(result.prev, 1);
    assert.equal(next, 3);

    end = await list.getEnd();
    result = await list.getNodeValue(end);
    next = result.next;
    assert.equal(result.maturityEnd, 3);
    assert.equal(result.prev, 2);
    assert.equal(next, 0);
  });

  it('remove', async () => {
    await list.pushBack(1, 1);
    await list.pushBack(1, 2);
    await list.pushBack(1, 3);
    await list.pushBack(1, 4);
    await list.pushBack(1, 5);
    await list.pushBack(1, 6);

    // Remove in the middle
    await list.remove(3);
    await list.remove(4);

    let result = await list.getNodeValue(2);
    let next = result.next;
    assert.equal(result.maturityEnd, 2);
    assert.equal(result.prev, 1);
    assert.equal(next, 5);

    result = await list.getNodeValue(next);
    next = result.next;
    assert.equal(result.maturityEnd, 5);
    assert.equal(result.prev, 2);
    assert.equal(next, 6);

    // Remove at the beginning
    await list.remove(1);

    let head = await list.getHead();
    result = await list.getNodeValue(head);
    next = result.next;
    assert.equal(result.maturityEnd, 2);
    assert.equal(result.prev, 0);
    assert.equal(next, 5);

    // End removal 
    await list.remove(6);

    let end = await list.getEnd();
    result = await list.getNodeValue(end);
    next = result.next;
    assert.equal(result.maturityEnd, 5);
    assert.equal(result.prev, 2);
    assert.equal(next, 0);
  });
});
